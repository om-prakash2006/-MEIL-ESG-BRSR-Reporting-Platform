import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.ts';
import { firestore } from '../services/firestore.ts';
import type { User, Session, UserRole, Permission, Project, BusinessUnit } from '../models/types.ts';
import { logger } from '../utils/logger.ts';

// Extend Express Request to include authenticated user and session
declare global {
  namespace Express {
    interface Request {
      user?: User;
      session?: Session;
    }
  }
}

/**
 * Extracts and verifies session token from Authorization header or custom header.
 */
export function requireSession(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const customHeader = req.headers['x-session-id'] as string | undefined;

  let sessionId: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    sessionId = authHeader.substring(7).trim();
  } else if (customHeader) {
    sessionId = customHeader.trim();
  }

  // Check URL query parameters (critical for direct browser downloads, previews, and <a> links)
  if (!sessionId) {
    const queryToken = (req.query.token || req.query.sessionId || req.query.session) as string | undefined;
    if (queryToken && typeof queryToken === 'string') {
      sessionId = queryToken.trim();
    }
  }

  // Check cookie headers
  if (!sessionId && req.headers.cookie) {
    const match = req.headers.cookie.match(/(?:sessionId|auth_token|token)=([^;]+)/);
    if (match && match[1]) {
      sessionId = decodeURIComponent(match[1].trim());
    }
  }

  if (!sessionId) {
    logger.unauthorizedAccess('Missing session token in request headers', {
      path: req.path,
      method: req.method,
    });
    res.status(401).json({
      error: 'Not authenticated',
      message: 'Authentication session token required. Please sign in.',
    });
    return;
  }

  const session = authService.getSession(sessionId);
  if (!session) {
    logger.unauthorizedAccess('Invalid or expired session token', {
      sessionId,
      path: req.path,
    });
    res.status(401).json({
      error: 'Not authenticated',
      message: 'Session has expired or is invalid. Please sign in again.',
    });
    return;
  }

  const user = authService.getUserById(session.userId);
  if (!user || !user.active) {
    logger.unauthorizedAccess('User associated with session not found or deactivated', {
      userId: session.userId,
    });
    res.status(401).json({
      error: 'Not authenticated',
      message: 'User account is inactive or not found.',
    });
    return;
  }

  req.user = user;
  req.session = session;
  next();
}

/**
 * Role-based access control middleware.
 */
export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.unauthorizedAccess('Role access violation', {
        userId: req.user.userId,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        path: req.path,
      });
      res.status(403).json({
        error: 'Not authorized',
        message: `Access denied. Role ${req.user.role} does not possess required authority.`,
      });
      return;
    }

    next();
  };
}

/**
 * Granular permission check middleware.
 */
export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (!req.user.permissions.includes(permission)) {
      logger.unauthorizedAccess('Missing explicit permission', {
        userId: req.user.userId,
        role: req.user.role,
        requiredPermission: permission,
        path: req.path,
      });
      res.status(403).json({
        error: 'Not authorized',
        message: `Action requires permission: ${permission}.`,
      });
      return;
    }

    next();
  };
}

/**
 * Validates organizational scope to prevent cross-tenant/cross-unit unauthorized access.
 * Checks params or query or body: projectId, businessUnitId, organizationId.
 */
export function requireOrganizationScope(req: Request, res: Response, next: NextFunction): void {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  // Group Admin has global MEIL scope
  if (user.role === 'GROUP_ADMIN') {
    next();
    return;
  }

  // Management has global read-only scope
  if (user.role === 'MANAGEMENT') {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      logger.unauthorizedAccess('Management role attempted data mutation', {
        userId: user.userId,
        path: req.path,
      });
      res.status(403).json({
        error: 'Not authorized',
        message: 'Management role has strict read-only analytical access.',
      });
      return;
    }
    next();
    return;
  }

  // Extract requested target scope from params, body or query
  const targetProjectId = (req.params.projectId || req.body?.projectId || req.query.projectId) as string | undefined;
  const targetBuId = (req.params.buId || req.params.businessUnitId || req.body?.businessUnitId || req.query.businessUnitId) as string | undefined;
  const targetOrgId = (req.params.orgId || req.params.organizationId || req.body?.organizationId || req.query.organizationId) as string | undefined;

  // 1. PROJECT_USER Scope Validation
  if (user.role === 'PROJECT_USER') {
    if (targetProjectId && targetProjectId !== user.projectId) {
      logger.unauthorizedAccess('Project User scope violation', {
        userId: user.userId,
        assignedProject: user.projectId,
        requestedProject: targetProjectId,
      });
      res.status(403).json({
        error: 'Not authorized',
        message: `Access denied. You are only authorized to access assigned Project: ${user.projectId}.`,
      });
      return;
    }
    if (targetBuId && targetBuId !== user.businessUnitId) {
      res.status(403).json({
        error: 'Not authorized',
        message: 'Access denied outside assigned Business Unit boundary.',
      });
      return;
    }
  }

  // 2. BUSINESS_UNIT_USER Scope Validation
  if (user.role === 'BUSINESS_UNIT_USER') {
    if (targetBuId && targetBuId !== user.businessUnitId) {
      logger.unauthorizedAccess('Business Unit Manager scope violation', {
        userId: user.userId,
        assignedBU: user.businessUnitId,
        requestedBU: targetBuId,
      });
      res.status(403).json({
        error: 'Not authorized',
        message: `Access denied. You are only authorized to access Business Unit: ${user.businessUnitId}.`,
      });
      return;
    }

    if (targetProjectId) {
      const project = firestore.getDoc<Project>('projects', targetProjectId);
      if (project && project.businessUnitId !== user.businessUnitId) {
        logger.unauthorizedAccess('BU User attempted cross-BU project access', {
          userId: user.userId,
          targetProjectId,
          projectBU: project.businessUnitId,
          userBU: user.businessUnitId,
        });
        res.status(403).json({
          error: 'Not authorized',
          message: `Access denied. Project ${targetProjectId} does not belong to your Business Unit.`,
        });
        return;
      }
    }
  }

  // 3. COMPANY_USER Scope Validation
  if (user.role === 'COMPANY_USER') {
    if (targetOrgId && targetOrgId !== user.organizationId) {
      logger.unauthorizedAccess('Company User scope violation', {
        userId: user.userId,
        assignedOrg: user.organizationId,
        requestedOrg: targetOrgId,
      });
      res.status(403).json({
        error: 'Not authorized',
        message: `Access denied. You are only authorized to access Legal Entity: ${user.organizationId}.`,
      });
      return;
    }

    if (targetBuId) {
      const bu = firestore.getDoc<BusinessUnit>('businessUnits', targetBuId);
      if (bu && bu.organizationId !== user.organizationId) {
        res.status(403).json({
          error: 'Not authorized',
          message: `Access denied. Business Unit ${targetBuId} is outside your Legal Entity.`,
        });
        return;
      }
    }
  }

  // 4. AUDITOR Scope Validation
  if (user.role === 'AUDITOR') {
    const assignedScope = user.assignedAssuranceScope || user.organizationId;
    if (targetOrgId && targetOrgId !== assignedScope) {
      logger.unauthorizedAccess('Auditor scope violation', {
        userId: user.userId,
        assignedScope,
        requestedOrg: targetOrgId,
      });
      res.status(403).json({
        error: 'Not authorized',
        message: `Access denied. Auditor assurance mandate is restricted to entity: ${assignedScope}.`,
      });
      return;
    }

    // Auditor must NEVER silently overwrite original submitted data
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && req.path.includes('/data/edit')) {
      logger.unauthorizedAccess('Auditor attempted direct mutation of original submitted data', {
        userId: user.userId,
        path: req.path,
      });
      res.status(403).json({
        error: 'Not authorized',
        message: 'Auditors cannot overwrite original submitted facility data. Use audit finding/observation flow.',
      });
      return;
    }
  }

  next();
}
