import { Router, Request, Response } from 'express';
import { authService } from '../services/auth.ts';
import { requireSession } from '../middleware/auth.ts';
import { logger } from '../utils/logger.ts';
import { config } from '../config/index.ts';

export const authRouter = Router();

/**
 * POST /api/auth/demo-login
 * Demo authentication endpoint supporting Employee ID or Corporate Email.
 */
authRouter.post('/demo-login', (req: Request, res: Response): void => {
  const { employeeId, email, password } = req.body;
  const identifier = employeeId || email;

  if (!identifier || typeof identifier !== 'string') {
    res.status(400).json({
      error: 'Invalid request',
      message: 'Employee ID or Corporate Email is required.',
    });
    return;
  }

  logger.loginAttempt(identifier, req.ip);

  // 1. User lookup in Firestore
  const user = authService.findUserByEmployeeIdOrEmail(identifier);
  if (!user) {
    logger.unauthorizedAccess('User lookup failed: Employee ID not found', { identifier });
    res.status(404).json({
      error: 'User not found',
      message: `No active user found for employee ID: "${identifier}".`,
    });
    return;
  }

  if (!user.active) {
    logger.unauthorizedAccess('User account inactive', { userId: user.userId });
    res.status(403).json({
      error: 'Account inactive',
      message: 'This employee profile has been deactivated in the directory.',
    });
    return;
  }

  // 2. Password verification
  if (!password || !authService.verifyDemoPassword(password)) {
    logger.unauthorizedAccess('Password verification failed', { userId: user.userId, identifier });
    res.status(401).json({
      error: 'Not authenticated',
      message: 'Invalid password. For demo access, use "demo-password" or "meil@demo123".',
    });
    return;
  }

  // 3. Create lightweight demo session
  const session = authService.createSession(user.userId);
  const redirectPath = authService.getRedirectPath(user.role);

  logger.loginSuccess(user);

  res.cookie('sessionId', session.sessionId, {
    path: '/',
    httpOnly: false,
    sameSite: 'lax',
    maxAge: config.sessionTtlMs,
  });

  res.status(200).json({
    success: true,
    session: {
      sessionId: session.sessionId,
      userId: user.userId,
      expiresAt: session.expiresAt,
    },
    user: {
      userId: user.userId,
      employeeId: user.employeeId,
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      businessUnitId: user.businessUnitId || null,
      projectId: user.projectId || null,
      assignedAssuranceScope: user.assignedAssuranceScope || null,
      designation: user.designation,
      avatarUrl: user.avatarUrl,
    },
    redirectPath,
  });
});

/**
 * POST /api/auth/logout
 * Invalidate demo session
 */
authRouter.post('/logout', requireSession, (req: Request, res: Response): void => {
  const sessionId = req.session!.sessionId;
  const userId = req.user!.userId;
  authService.invalidateSession(sessionId);
  logger.logout(userId, sessionId);

  res.clearCookie('sessionId', { path: '/' });

  res.status(200).json({
    success: true,
    message: 'Session terminated successfully.',
  });
});

/**
 * GET /api/auth/me
 * Returns full profile, role, organizational scope, permissions, and dashboard route.
 */
authRouter.get('/me', requireSession, (req: Request, res: Response): void => {
  const user = req.user!;
  const redirectPath = authService.getRedirectPath(user.role);

  res.status(200).json({
    user: {
      userId: user.userId,
      employeeId: user.employeeId,
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      businessUnitId: user.businessUnitId || null,
      projectId: user.projectId || null,
      assignedAssuranceScope: user.assignedAssuranceScope || null,
      designation: user.designation,
      avatarUrl: user.avatarUrl,
    },
    role: user.role,
    organizationScope: {
      organizationId: user.organizationId,
      businessUnitId: user.businessUnitId || null,
      projectId: user.projectId || null,
      assignedAssuranceScope: user.assignedAssuranceScope || null,
    },
    permissions: user.permissions,
    dashboardRoute: redirectPath,
  });
});

/**
 * GET /api/auth/session
 * Session validation checkpoint
 */
authRouter.get('/session', requireSession, (req: Request, res: Response): void => {
  res.status(200).json({
    valid: true,
    sessionId: req.session!.sessionId,
    expiresAt: req.session!.expiresAt,
    user: {
      userId: req.user!.userId,
      employeeId: req.user!.employeeId,
      role: req.user!.role,
      name: req.user!.name,
    },
  });
});
