import { Router, Request, Response } from 'express';
import { requireSession } from '../middleware/auth.ts';
import { auditService } from '../services/audit.ts';
import type { User, AssuranceLevel, FindingSeverity, FindingCategory } from '../models/types.ts';
import { logger } from '../utils/logger.ts';

export const auditRouter = Router();

/**
 * GET /api/audit/summary
 * Retrieves overall KPI counters for Audit & Assurance.
 */
auditRouter.get('/summary', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user as User;
    const summary = auditService.getAuditSummary(user);
    res.json({
      success: true,
      summary,
    });
  } catch (error: any) {
    logger.error('Failed to get audit summary', { error: error.message });
    res.status(500).json({
      error: 'AuditSummaryError',
      message: error.message || 'Could not fetch audit summary.',
    });
  }
});

/**
 * GET /api/audit/queue
 * Retrieves audit reviews matching user scope and filters.
 */
auditRouter.get('/queue', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user as User;
    const status = req.query.status as string | undefined;
    const scopeNo = req.query.scopeNo ? Number(req.query.scopeNo) : undefined;
    const search = req.query.search as string | undefined;
    const reportingPeriodId = req.query.reportingPeriodId as string | undefined;

    const queue = auditService.getAuditQueue(user, {
      status,
      scopeNo,
      search,
      reportingPeriodId,
    });

    res.json({
      success: true,
      total: queue.length,
      queue,
    });
  } catch (error: any) {
    logger.error('Failed to get audit queue', { error: error.message });
    res.status(500).json({
      error: 'AuditQueueError',
      message: error.message || 'Could not fetch audit queue.',
    });
  }
});

/**
 * GET /api/audit/reviews/:id
 * Retrieves full audit review dossier: original data, GHG calculation, evidence, findings, clarifications.
 */
auditRouter.get('/reviews/:id', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user as User;
    const dossier = auditService.getAuditReviewDetails(req.params.id, user);
    res.json({
      success: true,
      ...dossier,
    });
  } catch (error: any) {
    logger.error('Failed to get audit review details', { id: req.params.id, error: error.message });
    const statusCode = error.message.includes('Unauthorized') ? 403 : error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      error: 'AuditReviewError',
      message: error.message || 'Could not fetch audit review details.',
    });
  }
});

/**
 * POST /api/audit/reviews/:id/start
 * Initiates review on an assigned record.
 */
auditRouter.post('/reviews/:id/start', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user as User;
    const updated = auditService.startReview(req.params.id, user);
    res.json({
      success: true,
      review: updated,
      message: 'Audit review successfully initiated.',
    });
  } catch (error: any) {
    logger.error('Failed to start review', { id: req.params.id, error: error.message });
    res.status(400).json({
      error: 'StartReviewError',
      message: error.message || 'Could not start review.',
    });
  }
});

/**
 * PUT /api/audit/reviews/:id/assessment
 * Saves independently assessed auditor quantities, emission factors, and variance.
 */
auditRouter.put('/reviews/:id/assessment', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user as User;
    const { verifiedQuantity, verifiedUnit, verifiedEmissionFactor, verifiedCO2e, observations, conclusion, assuranceLevel } = req.body;

    const updated = auditService.saveIndependentAssessment(
      req.params.id,
      {
        verifiedQuantity,
        verifiedUnit,
        verifiedEmissionFactor,
        verifiedCO2e,
        observations,
        conclusion,
        assuranceLevel: assuranceLevel as AssuranceLevel,
      },
      user
    );

    res.json({
      success: true,
      review: updated,
      message: 'Independent auditor assessment recorded successfully.',
    });
  } catch (error: any) {
    logger.error('Failed to save assessment', { id: req.params.id, error: error.message });
    res.status(400).json({
      error: 'AssessmentError',
      message: error.message || 'Could not record assessment.',
    });
  }
});

/**
 * POST /api/audit/reviews/:id/findings
 * Records a new finding/observation on an audit review.
 */
auditRouter.post('/reviews/:id/findings', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user as User;
    const { severity, category, title, description, recommendation } = req.body;

    if (!title || !description) {
      res.status(400).json({ error: 'ValidationError', message: 'Title and description are required for an audit finding.' });
      return;
    }

    const finding = auditService.recordFinding(
      req.params.id,
      {
        severity: severity as FindingSeverity,
        category: category as FindingCategory,
        title,
        description,
        recommendation: recommendation || '',
      },
      user
    );

    res.status(201).json({
      success: true,
      finding,
      message: 'Audit finding recorded in formal observation register.',
    });
  } catch (error: any) {
    logger.error('Failed to record finding', { id: req.params.id, error: error.message });
    res.status(400).json({
      error: 'FindingError',
      message: error.message || 'Could not record finding.',
    });
  }
});

/**
 * POST /api/audit/reviews/:id/clarifications
 * Auditor requests clarification or additional evidence.
 */
auditRouter.post('/reviews/:id/clarifications', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user as User;
    const { question, findingId } = req.body;

    if (!question || !question.trim()) {
      res.status(400).json({ error: 'ValidationError', message: 'Clarification question text is required.' });
      return;
    }

    const clarification = auditService.requestClarification(
      req.params.id,
      {
        question: question.trim(),
        findingId,
      },
      user
    );

    res.status(201).json({
      success: true,
      clarification,
      message: 'Clarification inquiry dispatched to facility and company ESG leads.',
    });
  } catch (error: any) {
    logger.error('Failed to request clarification', { id: req.params.id, error: error.message });
    res.status(400).json({
      error: 'ClarificationError',
      message: error.message || 'Could not request clarification.',
    });
  }
});

/**
 * POST /api/audit/clarifications/:id/respond
 * Facility/Company leads respond to an audit clarification inquiry.
 */
auditRouter.post('/clarifications/:id/respond', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user as User;
    const { response, supplementaryEvidenceIds } = req.body;

    if (!response || !response.trim()) {
      res.status(400).json({ error: 'ValidationError', message: 'Response explanation is required.' });
      return;
    }

    const updated = auditService.respondClarification(
      req.params.id,
      {
        response: response.trim(),
        supplementaryEvidenceIds,
      },
      user
    );

    res.json({
      success: true,
      clarification: updated,
      message: 'Clarification explanation submitted to Lead Assurer.',
    });
  } catch (error: any) {
    logger.error('Failed to respond to clarification', { id: req.params.id, error: error.message });
    res.status(400).json({
      error: 'ClarificationResponseError',
      message: error.message || 'Could not submit clarification response.',
    });
  }
});

/**
 * POST /api/audit/reviews/:id/conclude
 * Concludes the audit review: VERIFY, REJECT, or CORRECTION_REQUIRED.
 */
auditRouter.post('/reviews/:id/conclude', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user as User;
    const { decision, conclusionNotes, assuranceLevel } = req.body;

    if (!decision || !['VERIFY', 'REJECT', 'CORRECTION_REQUIRED'].includes(decision)) {
      res.status(400).json({ error: 'ValidationError', message: 'Decision must be VERIFY, REJECT, or CORRECTION_REQUIRED.' });
      return;
    }

    if (!conclusionNotes || !conclusionNotes.trim()) {
      res.status(400).json({ error: 'ValidationError', message: 'Conclusion commentary is required.' });
      return;
    }

    const review = auditService.concludeAudit(
      req.params.id,
      {
        decision,
        conclusionNotes: conclusionNotes.trim(),
        assuranceLevel,
      },
      user
    );

    res.json({
      success: true,
      review,
      message: `Audit successfully concluded with decision: ${decision}`,
    });
  } catch (error: any) {
    logger.error('Failed to conclude audit', { id: req.params.id, error: error.message });
    res.status(400).json({
      error: 'ConcludeAuditError',
      message: error.message || 'Could not conclude audit.',
    });
  }
});

/**
 * POST /api/audit/reviews/:id/assign
 * Group Admin assigns/reallocates auditor to an audit review.
 */
auditRouter.post('/reviews/:id/assign', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user as User;
    const { auditorId, auditorName } = req.body;

    if (!auditorId) {
      res.status(400).json({ error: 'ValidationError', message: 'auditorId is required.' });
      return;
    }

    const updated = auditService.assignAuditor(req.params.id, { auditorId, auditorName }, user);
    res.json({
      success: true,
      review: updated,
      message: 'Auditor assignment updated successfully.',
    });
  } catch (error: any) {
    logger.error('Failed to assign auditor', { id: req.params.id, error: error.message });
    res.status(400).json({
      error: 'AssignAuditorError',
      message: error.message || 'Could not assign auditor.',
    });
  }
});

/**
 * GET /api/audit/export
 * Exports complete statutory assurance dossier for all scoped records.
 */
auditRouter.get('/export', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user as User;
    const queue = auditService.getAuditQueue(user);
    const summary = auditService.getAuditSummary(user);

    const exportData = {
      title: 'MEIL Enterprise ESG Statutory Assurance Dossier',
      framework: 'ISAE 3000 / ISO 14064-3 GHG Protocol Verification',
      generatedAt: new Date().toISOString(),
      generatedBy: {
        userId: user.userId,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
      },
      summary,
      records: queue.map((r) => ({
        reviewId: r.reviewId,
        activityId: r.activityId,
        reportingPeriod: r.reportingPeriodId,
        scope: `Scope ${r.scopeNo}`,
        metric: r.activityName,
        reportedQuantity: `${r.originalQuantity} ${r.originalUnit}`,
        reportedCO2e: `${r.originalCO2e} tCO2e`,
        verifiedQuantity: r.verifiedQuantity !== undefined ? `${r.verifiedQuantity} ${r.verifiedUnit || r.originalUnit}` : 'Pending',
        verifiedCO2e: r.verifiedCO2e !== undefined ? `${r.verifiedCO2e} tCO2e` : 'Pending',
        variance: r.variancePercentage !== undefined ? `${r.variancePercentage}%` : 'N/A',
        auditStatus: r.auditStatus,
        assuranceLevel: r.assuranceLevel,
        assignedAuditor: r.assignedAuditorName,
        verifiedAt: r.verifiedAt ? new Date(r.verifiedAt).toISOString() : null,
        observations: r.observations || '',
        conclusion: r.conclusion || '',
      })),
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="MEIL_Assurance_Dossier_${Date.now()}.json"`);
    res.json(exportData);
  } catch (error: any) {
    logger.error('Failed to export assurance dossier', { error: error.message });
    res.status(500).json({
      error: 'ExportError',
      message: error.message || 'Could not export assurance dossier.',
    });
  }
});
