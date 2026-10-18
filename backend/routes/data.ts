import { Router, Request, Response } from 'express';
import { requireSession, requireOrganizationScope, requirePermission } from '../middleware/auth.ts';
import { firestore } from '../services/firestore.ts';
import type { Project, BusinessUnit, Organization, Facility, User, RoleDefinition } from '../models/types.ts';
import { logger } from '../utils/logger.ts';

export const dataRouter = Router();

/**
 * Public/Session list of seeded directory entities for display in portal
 */
dataRouter.get('/organizations', requireSession, (_req: Request, res: Response): void => {
  const orgs = firestore.getDocs<Organization>('organizations');
  res.status(200).json(orgs);
});

dataRouter.get('/business-units', requireSession, (_req: Request, res: Response): void => {
  const bus = firestore.getDocs<BusinessUnit>('businessUnits');
  res.status(200).json(bus);
});

dataRouter.get('/projects', requireSession, (_req: Request, res: Response): void => {
  const projects = firestore.getDocs<Project>('projects');
  res.status(200).json(projects);
});

dataRouter.get('/facilities', requireSession, (_req: Request, res: Response): void => {
  const facilities = firestore.getDocs<Facility>('facilities');
  res.status(200).json(facilities);
});

dataRouter.get('/users', requireSession, (_req: Request, res: Response): void => {
  const users = firestore.getDocs<User>('users').map((u) => ({
    userId: u.userId,
    employeeId: u.employeeId,
    name: u.name,
    email: u.email,
    role: u.role,
    organizationId: u.organizationId,
    businessUnitId: u.businessUnitId,
    projectId: u.projectId,
    designation: u.designation,
    active: u.active,
    permissionsCount: u.permissions.length,
  }));
  res.status(200).json(users);
});

dataRouter.get('/roles', requireSession, (_req: Request, res: Response): void => {
  const roles = firestore.getDocs<RoleDefinition>('roles');
  res.status(200).json(roles);
});

/**
 * Project scoped record retrieval.
 * Tested against requireOrganizationScope.
 */
dataRouter.get('/project/:projectId', requireSession, requireOrganizationScope, (req: Request, res: Response): void => {
  const { projectId } = req.params;
  const project = firestore.getDoc<Project>('projects', projectId);
  if (!project) {
    res.status(404).json({ error: 'Project not found', projectId });
    return;
  }

  res.status(200).json({
    success: true,
    message: `Access granted for project ${projectId} within authorized scope`,
    project,
    userScope: {
      userId: req.user!.userId,
      role: req.user!.role,
      assignedProject: req.user!.projectId,
    },
  });
});

/**
 * Business Unit scoped record retrieval.
 * Tested against requireOrganizationScope.
 */
dataRouter.get('/business-unit/:buId', requireSession, requireOrganizationScope, (req: Request, res: Response): void => {
  const { buId } = req.params;
  const bu = firestore.getDoc<BusinessUnit>('businessUnits', buId);
  if (!bu) {
    res.status(404).json({ error: 'Business Unit not found', buId });
    return;
  }

  res.status(200).json({
    success: true,
    message: `Access granted for business unit ${buId} within authorized scope`,
    businessUnit: bu,
    userScope: {
      userId: req.user!.userId,
      role: req.user!.role,
      assignedBU: req.user!.businessUnitId,
    },
  });
});

/**
 * Company scoped record retrieval.
 * Tested against requireOrganizationScope.
 */
dataRouter.get('/company/:organizationId', requireSession, requireOrganizationScope, (req: Request, res: Response): void => {
  const { organizationId } = req.params;
  const org = firestore.getDoc<Organization>('organizations', organizationId);
  if (!org) {
    res.status(404).json({ error: 'Company not found', organizationId });
    return;
  }

  res.status(200).json({
    success: true,
    message: `Access granted for legal entity ${organizationId} within authorized scope`,
    organization: org,
    userScope: {
      userId: req.user!.userId,
      role: req.user!.role,
      assignedOrg: req.user!.organizationId,
    },
  });
});

/**
 * POST /api/data/edit
 * Mutation endpoint to test data mutation authorization.
 * Management: read-only -> 403
 * Auditor: cannot overwrite submitted data -> 403
 */
dataRouter.post('/edit', requireSession, requireOrganizationScope, (req: Request, res: Response): void => {
  const user = req.user!;

  if (user.role === 'MANAGEMENT') {
    res.status(403).json({
      error: 'Not authorized',
      message: 'Management role has read-only access and cannot modify operational records.',
    });
    return;
  }

  if (user.role === 'AUDITOR') {
    res.status(403).json({
      error: 'Not authorized',
      message: 'Auditors cannot silently edit or overwrite original facility submitted records.',
    });
    return;
  }

  // Check if role has CREATE_ESG_DATA or EDIT_OWN_ESG_DATA
  const hasEditPermission =
    user.permissions.includes('CREATE_ESG_DATA') ||
    user.permissions.includes('EDIT_OWN_ESG_DATA') ||
    user.permissions.includes('CONSOLIDATE_DATA') ||
    user.permissions.includes('MANAGE_ORGANIZATION');

  if (!hasEditPermission) {
    res.status(403).json({
      error: 'Not authorized',
      message: 'User does not possess permissions to mutate ESG datasets.',
    });
    return;
  }

  logger.info('ESG data edit authorized and processed', {
    userId: user.userId,
    role: user.role,
    body: req.body,
  });

  res.status(200).json({
    success: true,
    message: 'Data record modified successfully within valid organizational scope.',
    timestamp: Date.now(),
  });
});
