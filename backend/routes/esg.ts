import { Router, Request, Response } from 'express';
import { requireSession } from '../middleware/auth.ts';
import { esgDataService } from '../services/esgData.ts';
import { logger } from '../utils/logger.ts';
import type { ESGWorkflowStatus } from '../models/types.ts';

export const esgRouter = Router();

// ==========================================
// 1. MASTER DATA APIs
// ==========================================

/**
 * GET /api/esg/master-data
 * Composite master data retrieval filtered by user's organizational scope.
 */
esgRouter.get('/master-data', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user!;
    const data = esgDataService.getScopedMasterData(user);
    res.status(200).json({ success: true, ...data });
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string; code?: string };
    res.status(error.status || 500).json({ error: error.code || 'ERROR', message: error.message || 'Failed to fetch master data.' });
  }
});

esgRouter.get('/reporting-periods', requireSession, (req: Request, res: Response): void => {
  const data = esgDataService.getScopedMasterData(req.user!);
  res.status(200).json(data.reportingPeriods);
});

esgRouter.get('/companies', requireSession, (req: Request, res: Response): void => {
  const data = esgDataService.getScopedMasterData(req.user!);
  res.status(200).json(data.organizations);
});

esgRouter.get('/business-units', requireSession, (req: Request, res: Response): void => {
  const data = esgDataService.getScopedMasterData(req.user!);
  res.status(200).json(data.businessUnits);
});

esgRouter.get('/projects', requireSession, (req: Request, res: Response): void => {
  const data = esgDataService.getScopedMasterData(req.user!);
  res.status(200).json(data.projects);
});

esgRouter.get('/facilities', requireSession, (req: Request, res: Response): void => {
  const data = esgDataService.getScopedMasterData(req.user!);
  res.status(200).json(data.facilities);
});

esgRouter.get('/emission-sources', requireSession, (req: Request, res: Response): void => {
  const data = esgDataService.getScopedMasterData(req.user!);
  res.status(200).json(data.emissionSources);
});

esgRouter.get('/activity-types', requireSession, (req: Request, res: Response): void => {
  const data = esgDataService.getScopedMasterData(req.user!);
  res.status(200).json(data.activityTypes);
});

esgRouter.get('/units', requireSession, (req: Request, res: Response): void => {
  const data = esgDataService.getScopedMasterData(req.user!);
  res.status(200).json(data.units);
});

esgRouter.get('/scope3-categories', requireSession, (req: Request, res: Response): void => {
  const data = esgDataService.getScopedMasterData(req.user!);
  res.status(200).json(data.scope3Categories);
});

esgRouter.get('/value-chain-partners', requireSession, (req: Request, res: Response): void => {
  const data = esgDataService.getScopedMasterData(req.user!);
  res.status(200).json(data.valueChainPartners);
});

esgRouter.get('/substances', requireSession, (req: Request, res: Response): void => {
  const data = esgDataService.getScopedMasterData(req.user!);
  res.status(200).json(data.substances);
});

// ==========================================
// 2. ACTIVITY RECORD OPERATIONS
// ==========================================

/**
 * GET /api/esg/records
 * Lists activity records with authorization filters and pagination.
 */
esgRouter.get('/records', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user!;
    const filters = {
      reportingPeriodId: req.query.reportingPeriodId as string | undefined,
      companyId: req.query.companyId as string | undefined,
      businessUnitId: req.query.businessUnitId as string | undefined,
      projectId: req.query.projectId as string | undefined,
      facilityId: req.query.facilityId as string | undefined,
      scopeNo: req.query.scopeNo ? Number(req.query.scopeNo) : undefined,
      scope3CategoryNo: req.query.scope3CategoryNo ? Number(req.query.scope3CategoryNo) : undefined,
      activityTypeId: req.query.activityTypeId as string | undefined,
      workflowStatus: req.query.workflowStatus as string | undefined,
      enteredBy: req.query.enteredBy as string | undefined,
      estimatedFlag: req.query.estimatedFlag !== undefined ? req.query.estimatedFlag === 'true' : undefined,
      search: req.query.search as string | undefined,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 50,
    };

    const result = esgDataService.listRecords(user, filters);
    res.status(200).json({
      success: true,
      ...result,
      userScope: {
        userId: user.userId,
        role: user.role,
        organizationId: user.organizationId,
        businessUnitId: user.businessUnitId,
        projectId: user.projectId,
      },
    });
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string; code?: string };
    logger.error('Failed to list ESG records', { error });
    res.status(error.status || 500).json({ error: error.code || 'ERROR', message: error.message || 'Error fetching ESG records.' });
  }
});

/**
 * GET /api/esg/records/:activityId
 * Retrieves record details, scope details, linked evidence, version history, and audit trail.
 */
esgRouter.get('/records/:activityId', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user!;
    const { activityId } = req.params;
    const details = esgDataService.getRecordById(user, activityId);
    res.status(200).json({ success: true, ...details });
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string; code?: string };
    res.status(error.status || 500).json({ error: error.code || 'ERROR', message: error.message || 'Error fetching record.' });
  }
});

/**
 * POST /api/esg/records
 * Creates a new ESG activity record (default status DRAFT).
 */
esgRouter.post('/records', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user!;
    const record = esgDataService.createActivityRecord(user, req.body);
    res.status(201).json({
      success: true,
      message: `ESG Activity record ${record.activityId} created (${record.workflowStatus}).`,
      record,
    });
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string; code?: string; details?: unknown };
    res.status(error.status || 500).json({
      error: error.code || 'CREATE_FAILED',
      message: error.message || 'Failed to create ESG activity record.',
      details: error.details,
    });
  }
});

/**
 * POST /api/esg/records/:activityId/save-draft
 * Saves draft revisions without enforcing mandatory submission rules.
 */
esgRouter.post('/records/:activityId/save-draft', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user!;
    const { activityId } = req.params;
    const updated = esgDataService.saveDraft(user, activityId, req.body);
    res.status(200).json({
      success: true,
      message: `Activity record draft ${activityId} updated.`,
      record: updated,
    });
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string; code?: string };
    res.status(error.status || 500).json({
      error: error.code || 'SAVE_DRAFT_FAILED',
      message: error.message || 'Failed to save draft.',
    });
  }
});

/**
 * PATCH /api/esg/records/:activityId
 * Updates an editable record.
 */
esgRouter.patch('/records/:activityId', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user!;
    const { activityId } = req.params;
    const updated = esgDataService.saveDraft(user, activityId, req.body);
    res.status(200).json({
      success: true,
      message: `Activity record ${activityId} updated.`,
      record: updated,
    });
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string; code?: string };
    res.status(error.status || 500).json({
      error: error.code || 'UPDATE_FAILED',
      message: error.message || 'Failed to update record.',
    });
  }
});

/**
 * POST /api/esg/records/:activityId/submit
 * Validates and submits a DRAFT record into the formal audit/review pipeline.
 */
esgRouter.post('/records/:activityId/submit', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user!;
    const { activityId } = req.params;
    const submitted = esgDataService.submitRecord(user, activityId);
    res.status(200).json({
      success: true,
      message: `Record ${activityId} successfully submitted into the verification pipeline.`,
      record: submitted,
    });
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string; code?: string };
    res.status(error.status || 500).json({
      error: error.code || 'SUBMISSION_FAILED',
      message: error.message || 'Failed to submit record.',
    });
  }
});

/**
 * POST /api/esg/records/:activityId/transition
 * Controlled workflow status transition according to RBAC and governance state machine.
 */
esgRouter.post('/records/:activityId/transition', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user!;
    const { activityId } = req.params;
    const { targetStatus, remarks } = req.body as { targetStatus: ESGWorkflowStatus; remarks?: string };

    if (!targetStatus) {
      res.status(400).json({ error: 'TARGET_STATUS_REQUIRED', message: 'targetStatus is required.' });
      return;
    }

    const updated = esgDataService.transitionWorkflowStatus(user, activityId, targetStatus, remarks);
    res.status(200).json({
      success: true,
      message: `Record ${activityId} transitioned to ${targetStatus}.`,
      record: updated,
    });
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string; code?: string };
    res.status(error.status || 500).json({
      error: error.code || 'TRANSITION_FAILED',
      message: error.message || 'Failed to transition record status.',
    });
  }
});

/**
 * POST /api/esg/records/:activityId/reject
 * Rejects an activity record with mandatory justification.
 */
esgRouter.post('/records/:activityId/reject', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user!;
    const { activityId } = req.params;
    const { reason } = req.body;

    const rejected = esgDataService.rejectRecord(user, activityId, reason);
    res.status(200).json({
      success: true,
      message: `Record ${activityId} rejected.`,
      record: rejected,
    });
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string; code?: string };
    res.status(error.status || 500).json({
      error: error.code || 'REJECT_FAILED',
      message: error.message || 'Failed to reject record.',
    });
  }
});

/**
 * POST /api/esg/records/:activityId/return-for-correction
 * Returns record for correction, snapshotting current version and incrementing version number.
 */
esgRouter.post('/records/:activityId/return-for-correction', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user!;
    const { activityId } = req.params;
    const { reason } = req.body;

    const returned = esgDataService.returnForCorrection(user, activityId, reason);
    res.status(200).json({
      success: true,
      message: `Record ${activityId} returned for correction. Revision V${returned.currentVersion} created.`,
      record: returned,
    });
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string; code?: string };
    res.status(error.status || 500).json({
      error: error.code || 'RETURN_FAILED',
      message: error.message || 'Failed to return record for correction.',
    });
  }
});

/**
 * POST /api/esg/records/:activityId/bu-review
 * Updates BU checklist, verification notes, or discrepancy flags.
 */
esgRouter.post('/records/:activityId/bu-review', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user!;
    const { activityId } = req.params;
    const { checklist, notes, hasBlockingDiscrepancy, blockingDiscrepancyReason } = req.body;

    const updated = esgDataService.buReviewRecord(user, activityId, {
      checklist,
      notes,
      hasBlockingDiscrepancy,
      blockingDiscrepancyReason,
    });
    res.status(200).json({
      success: true,
      message: `BU Review saved for record ${activityId}.`,
      record: updated,
    });
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string; code?: string };
    res.status(error.status || 500).json({
      error: error.code || 'BU_REVIEW_FAILED',
      message: error.message || 'Failed to save BU review.',
    });
  }
});

/**
 * POST /api/esg/records/:activityId/bu-verify
 * Verifies and forwards facility submission to Company / Legal Entity review.
 */
esgRouter.post('/records/:activityId/bu-verify', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user!;
    const { activityId } = req.params;
    const { notes } = req.body || {};

    const verified = esgDataService.buVerifyAndForward(user, activityId, notes);
    res.status(200).json({
      success: true,
      message: `Record ${activityId} verified by Business Unit and forwarded to Legal Entity Review.`,
      record: verified,
    });
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string; code?: string };
    res.status(error.status || 500).json({
      error: error.code || 'BU_VERIFY_FAILED',
      message: error.message || 'Failed to verify and forward record.',
    });
  }
});

/**
 * POST /api/esg/records/:activityId/bu-return
 * Flags discrepancy and returns submission to facility with version bump.
 */
esgRouter.post('/records/:activityId/bu-return', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user!;
    const { activityId } = req.params;
    const { reason } = req.body;

    const returned = esgDataService.buReturnSubmission(user, activityId, reason);
    res.status(200).json({
      success: true,
      message: `Record ${activityId} returned to facility with discrepancy flag. New version V${returned.currentVersion} created.`,
      record: returned,
    });
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string; code?: string };
    res.status(error.status || 500).json({
      error: error.code || 'BU_RETURN_FAILED',
      message: error.message || 'Failed to return record.',
    });
  }
});

/**
 * POST /api/esg/records/:activityId/link-evidence
 * Links a Phase 2 evidence document to an activity record.
 */
esgRouter.post('/records/:activityId/link-evidence', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user!;
    const { activityId } = req.params;
    const { documentId } = req.body;

    if (!documentId) {
      res.status(400).json({ error: 'DOCUMENT_ID_REQUIRED', message: 'documentId is required.' });
      return;
    }

    const linked = esgDataService.linkEvidence(user, activityId, documentId);
    res.status(200).json({
      success: true,
      message: `Evidence document ${documentId} linked to activity record ${activityId}.`,
      record: linked,
    });
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string; code?: string };
    res.status(error.status || 500).json({
      error: error.code || 'LINK_FAILED',
      message: error.message || 'Failed to link evidence.',
    });
  }
});

/**
 * GET /api/esg/records/:activityId/versions
 * Retrieves revision history for an activity record.
 */
esgRouter.get('/records/:activityId/versions', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user!;
    const { activityId } = req.params;
    const details = esgDataService.getRecordById(user, activityId);
    res.status(200).json({
      success: true,
      activityId,
      currentVersion: details.record.currentVersion,
      versions: details.versionHistory,
    });
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string; code?: string };
    res.status(error.status || 500).json({
      error: error.code || 'VERSION_FETCH_FAILED',
      message: error.message || 'Failed to fetch version history.',
    });
  }
});

/**
 * GET /api/esg/records/:activityId/audit-trail
 * Retrieves immutable audit logs for an activity record.
 */
esgRouter.get('/records/:activityId/audit-trail', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user!;
    const { activityId } = req.params;
    const details = esgDataService.getRecordById(user, activityId);
    res.status(200).json({
      success: true,
      activityId,
      auditTrail: details.auditTrail,
    });
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string; code?: string };
    res.status(error.status || 500).json({
      error: error.code || 'AUDIT_FETCH_FAILED',
      message: error.message || 'Failed to fetch audit trail.',
    });
  }
});
