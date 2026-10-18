import { Router, Request, Response } from 'express';
import { requireSession } from '../middleware/auth.ts';
import { reconciliationService } from '../services/reconciliation.ts';
import type { User, ReconciliationCaseType, ReconciliationMateriality } from '../models/types.ts';
import { logger } from '../utils/logger.ts';

export const reconciliationRouter = Router();

/**
 * GET /api/reconciliation/summary
 * Retrieves overall KPI counters for SEBI BRSR Core Reconciliation & Variance Engine.
 */
reconciliationRouter.get('/summary', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user as User;
    const summary = reconciliationService.getSummary(user);
    res.json({
      success: true,
      summary,
    });
  } catch (error: any) {
    logger.error('Failed to get reconciliation summary', { error: error.message });
    res.status(500).json({
      error: 'ReconciliationSummaryError',
      message: error.message || 'Could not fetch reconciliation summary.',
    });
  }
});

/**
 * GET /api/reconciliation/cases
 * Retrieves reconciliation discrepancy cases matching user scope and filters.
 */
reconciliationRouter.get('/cases', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user as User;
    const status = req.query.status as string | undefined;
    const materiality = req.query.materiality as string | undefined;
    const scopeNo = req.query.scopeNo ? Number(req.query.scopeNo) : undefined;
    const search = req.query.search as string | undefined;

    const cases = reconciliationService.listCases(user, {
      status,
      materiality,
      scopeNo,
      search,
    });

    res.json({
      success: true,
      total: cases.length,
      cases,
    });
  } catch (error: any) {
    logger.error('Failed to get reconciliation cases', { error: error.message });
    res.status(500).json({
      error: 'ReconciliationCasesError',
      message: error.message || 'Could not fetch reconciliation cases.',
    });
  }
});

/**
 * GET /api/reconciliation/cases/:id
 * Retrieves full reconciliation case dossier: original data, audited data, variance, correction requests, and history.
 */
reconciliationRouter.get('/cases/:id', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user as User;
    const dossier = reconciliationService.getCaseDetails(req.params.id, user);
    res.json({
      success: true,
      ...dossier,
    });
  } catch (error: any) {
    logger.error('Failed to get reconciliation case details', { id: req.params.id, error: error.message });
    const statusCode = error.message.includes('Unauthorized') ? 403 : error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      error: 'ReconciliationCaseError',
      message: error.message || 'Could not fetch reconciliation case details.',
    });
  }
});

/**
 * POST /api/reconciliation/cases
 * Creates a new reconciliation discrepancy case.
 */
reconciliationRouter.post('/cases', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user as User;
    const {
      activityId,
      reviewId,
      category,
      caseType,
      materiality,
      originalSubmitted,
      auditorAssessed,
      rootCause,
      assignedToUserId,
      assignedToUserName,
    } = req.body;

    if (!activityId || !originalSubmitted || !auditorAssessed) {
      res.status(400).json({
        error: 'ValidationError',
        message: 'activityId, originalSubmitted, and auditorAssessed are required.',
      });
      return;
    }

    const created = reconciliationService.createCase(
      {
        activityId,
        reviewId,
        category,
        caseType: caseType as ReconciliationCaseType,
        materiality: materiality as ReconciliationMateriality,
        originalSubmitted,
        auditorAssessed,
        rootCause,
        assignedToUserId,
        assignedToUserName,
      },
      user
    );

    res.status(201).json({
      success: true,
      case: created,
      message: `Reconciliation case ${created.caseNumber} initiated.`,
    });
  } catch (error: any) {
    logger.error('Failed to create reconciliation case', { error: error.message });
    res.status(400).json({
      error: 'CreateCaseError',
      message: error.message || 'Could not create reconciliation case.',
    });
  }
});

/**
 * POST /api/reconciliation/cases/:id/request-correction
 * Auditor or Lead requests formal correction from facility engineers.
 */
reconciliationRouter.post('/cases/:id/request-correction', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user as User;
    const { reason, targetFields, recommendedQuantity, recommendedUnit, notes, dueDate } = req.body;

    if (!reason || !reason.trim()) {
      res.status(400).json({
        error: 'ValidationError',
        message: 'Correction reason and rationale are required.',
      });
      return;
    }

    const request = reconciliationService.requestCorrection(
      req.params.id,
      {
        reason: reason.trim(),
        targetFields,
        recommendedQuantity: recommendedQuantity !== undefined ? Number(recommendedQuantity) : undefined,
        recommendedUnit,
        notes,
        dueDate,
      },
      user
    );

    res.status(201).json({
      success: true,
      request,
      message: `Correction request ${request.requestId} issued to facility lead.`,
    });
  } catch (error: any) {
    logger.error('Failed to request correction', { id: req.params.id, error: error.message });
    res.status(400).json({
      error: 'RequestCorrectionError',
      message: error.message || 'Could not issue correction request.',
    });
  }
});

/**
 * POST /api/reconciliation/cases/:id/submit-correction
 * Facility engineer submits corrected activity data; engine deterministically recalculates GHG emissions.
 */
reconciliationRouter.post('/cases/:id/submit-correction', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user as User;
    const { correctedQuantity, correctedUnit, correctedSpend, justification, evidenceDocumentIds } = req.body;

    if (correctedQuantity === undefined || isNaN(Number(correctedQuantity))) {
      res.status(400).json({
        error: 'ValidationError',
        message: 'Valid correctedQuantity numeric value is required.',
      });
      return;
    }

    if (!justification || !justification.trim()) {
      res.status(400).json({
        error: 'ValidationError',
        message: 'Correction justification note is required.',
      });
      return;
    }

    const updated = reconciliationService.submitCorrection(
      req.params.id,
      {
        correctedQuantity: Number(correctedQuantity),
        correctedUnit,
        correctedSpend: correctedSpend !== undefined ? Number(correctedSpend) : undefined,
        justification: justification.trim(),
        evidenceDocumentIds,
      },
      user
    );

    res.json({
      success: true,
      case: updated,
      message: `Corrected values submitted and GHG emissions deterministically recalculated (${updated.correctedData?.recalculatedCO2e} tCO2e).`,
    });
  } catch (error: any) {
    logger.error('Failed to submit correction', { id: req.params.id, error: error.message });
    res.status(400).json({
      error: 'SubmitCorrectionError',
      message: error.message || 'Could not submit corrected values.',
    });
  }
});

/**
 * POST /api/reconciliation/cases/:id/sign-off
 * Auditor formally signs off: accepts or rejects submitted correction.
 */
reconciliationRouter.post('/cases/:id/sign-off', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user as User;
    const { decision, notes } = req.body;

    if (!decision || !['ACCEPTED', 'REJECTED'].includes(decision)) {
      res.status(400).json({
        error: 'ValidationError',
        message: 'Decision must be ACCEPTED or REJECTED.',
      });
      return;
    }

    if (!notes || !notes.trim()) {
      res.status(400).json({
        error: 'ValidationError',
        message: 'Auditor commentary is required.',
      });
      return;
    }

    const updated = reconciliationService.auditorSignOff(
      req.params.id,
      {
        decision,
        notes: notes.trim(),
      },
      user
    );

    res.json({
      success: true,
      case: updated,
      message: `Auditor sign-off recorded: ${decision}.`,
    });
  } catch (error: any) {
    logger.error('Failed to sign off on reconciliation case', { id: req.params.id, error: error.message });
    res.status(400).json({
      error: 'SignOffError',
      message: error.message || 'Could not sign off on correction.',
    });
  }
});

/**
 * POST /api/reconciliation/cases/:id/close
 * Formally closes the case (RESOLVED or CLOSED_NO_CHANGE).
 */
reconciliationRouter.post('/cases/:id/close', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user as User;
    const { resolutionSummary, status } = req.body;

    if (!resolutionSummary || !resolutionSummary.trim()) {
      res.status(400).json({
        error: 'ValidationError',
        message: 'Resolution summary is required.',
      });
      return;
    }

    const updated = reconciliationService.closeCase(
      req.params.id,
      {
        resolutionSummary: resolutionSummary.trim(),
        status,
      },
      user
    );

    res.json({
      success: true,
      case: updated,
      message: `Case ${updated.caseNumber} closed (${updated.status}).`,
    });
  } catch (error: any) {
    logger.error('Failed to close reconciliation case', { id: req.params.id, error: error.message });
    res.status(400).json({
      error: 'CloseCaseError',
      message: error.message || 'Could not close case.',
    });
  }
});

/**
 * GET /api/reconciliation/export
 * Exports complete statutory SEBI BRSR Core Reconciliation Ledger.
 */
reconciliationRouter.get('/export', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user as User;
    const ledger = reconciliationService.exportLedger(user);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="MEIL_Reconciliation_Ledger_${Date.now()}.json"`);
    res.json(ledger);
  } catch (error: any) {
    logger.error('Failed to export reconciliation ledger', { error: error.message });
    res.status(500).json({
      error: 'ExportError',
      message: error.message || 'Could not export reconciliation ledger.',
    });
  }
});
