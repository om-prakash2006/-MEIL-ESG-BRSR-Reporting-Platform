import { Router, Request, Response } from 'express';
import { requireSession } from '../middleware/auth.ts';
import { dashboardService } from '../services/dashboard.ts';
import { logger } from '../utils/logger.ts';

export const dashboardRouter = Router();

/**
 * GET /api/dashboard
 * Role-aware and organizational scope-scoped dashboard data retrieval.
 */
dashboardRouter.get('/', requireSession, (req: Request, res: Response): void => {
  const user = req.user!;
  logger.dashboardRequest(user.userId, user.role, user.projectId || user.businessUnitId || user.organizationId);

  const data = dashboardService.getDashboardData(user);
  res.status(200).json(data);
});
