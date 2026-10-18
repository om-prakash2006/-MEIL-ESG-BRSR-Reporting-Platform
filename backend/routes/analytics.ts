import express, { Request, Response } from 'express';
import { requireSession } from '../middleware/auth.ts';
import { analyticsService, AnalyticsScopeFilter } from '../services/analytics.ts';
import { geminiService } from '../services/geminiService.ts';
import type { User } from '../models/types.ts';
import { logger } from '../utils/logger.ts';

export const analyticsRouter = express.Router();

/**
 * GET /api/analytics/overview
 * Organization-aware aggregated analytics
 */
analyticsRouter.get('/overview', requireSession, (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { organizationId, companyId, businessUnitId, projectId, facilityId, reportingPeriodId } = req.query;

    const filter: AnalyticsScopeFilter = {
      organizationId: organizationId ? String(organizationId) : undefined,
      companyId: companyId ? String(companyId) : undefined,
      businessUnitId: businessUnitId ? String(businessUnitId) : undefined,
      projectId: projectId ? String(projectId) : undefined,
      facilityId: facilityId ? String(facilityId) : undefined,
      reportingPeriodId: reportingPeriodId ? String(reportingPeriodId) : undefined,
    };

    const overview = analyticsService.getOverview(filter, user);

    res.json({
      success: true,
      overview,
    });
  } catch (err: unknown) {
    logger.error('Error generating analytics overview', { error: err });
    res.status(500).json({ error: 'Failed to generate analytics overview' });
  }
});

/**
 * GET /api/analytics/scope3-breakdown
 * Returns full Scope 3 distribution across all 15 categories
 */
analyticsRouter.get('/scope3-breakdown', requireSession, (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { companyId, businessUnitId, projectId, reportingPeriodId } = req.query;

    const filter: AnalyticsScopeFilter = {
      companyId: companyId ? String(companyId) : undefined,
      businessUnitId: businessUnitId ? String(businessUnitId) : undefined,
      projectId: projectId ? String(projectId) : undefined,
      reportingPeriodId: reportingPeriodId ? String(reportingPeriodId) : undefined,
    };

    const overview = analyticsService.getOverview(filter, user);

    res.json({
      success: true,
      reportingPeriod: overview.reportingPeriod,
      totalScope3Tons: overview.scopeBreakdown.scope3Tons,
      categories: overview.scope3Categories,
    });
  } catch (err: unknown) {
    logger.error('Error generating Scope 3 analytics', { error: err });
    res.status(500).json({ error: 'Failed to retrieve Scope 3 analytics' });
  }
});

/**
 * GET /api/analytics/anomalies
 * Lists active anomaly detection alerts and unusual change warnings
 */
analyticsRouter.get('/anomalies', requireSession, (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { reportingPeriodId } = req.query;

    const overview = analyticsService.getOverview({ reportingPeriodId: reportingPeriodId ? String(reportingPeriodId) : undefined }, user);

    res.json({
      success: true,
      anomaliesCount: overview.anomalies.length,
      anomalies: overview.anomalies,
    });
  } catch (err: unknown) {
    logger.error('Error listing analytics anomalies', { error: err });
    res.status(500).json({ error: 'Failed to retrieve anomalies' });
  }
});

/**
 * POST /api/analytics/ai-insights
 * Gemini AI Impact Analyst generates authoritative, grounded executive interpretation
 */
analyticsRouter.post('/ai-insights', requireSession, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const filter: AnalyticsScopeFilter = req.body.filter || {};

    // First obtain deterministic authoritative overview
    const overview = analyticsService.getOverview(filter, user);

    // Call Gemini with strictly bounded dataset
    const insights = await geminiService.generateInsights(overview);

    logger.info(`AI Impact Analyst briefing requested by ${user.userId} (${user.role})`);

    res.json({
      success: true,
      insights,
    });
  } catch (err: unknown) {
    logger.error('Error generating AI Impact insights', { error: err });
    res.status(500).json({ error: 'Failed to generate AI insights' });
  }
});

/**
 * POST /api/analytics/ai-query
 * Conversational questions to the AI Impact Analyst regarding actual emissions
 */
analyticsRouter.post('/ai-query', requireSession, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { query, filter } = req.body;

    if (!query || typeof query !== 'string') {
      res.status(400).json({ error: 'Query string is required' });
      return;
    }

    const overview = analyticsService.getOverview(filter || {}, user);
    const response = await geminiService.handleUserQuery(query, overview);

    res.json({
      success: true,
      query,
      answer: response.answer,
      groundedData: response.groundedData,
      modelUsed: response.modelUsed,
    });
  } catch (err: unknown) {
    logger.error('Error handling AI query', { error: err });
    res.status(500).json({ error: 'Failed to answer AI query' });
  }
});
