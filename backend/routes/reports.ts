import { Router, Request, Response } from 'express';
import { requireSession } from '../middleware/auth.ts';
import { reportService } from '../services/reports.ts';
import type { User, ReportType, ReportStatus } from '../models/types.ts';
import { logger } from '../utils/logger.ts';

export const reportsRouter = Router();

/**
 * GET /api/reports/templates
 * Retrieves available statutory report disclosure templates.
 */
reportsRouter.get('/templates', requireSession, (_req: Request, res: Response): void => {
  try {
    const templates = reportService.getReportTemplates();
    res.json({
      success: true,
      templates,
    });
  } catch (error: any) {
    logger.error('Failed to get report templates', { error: error.message });
    res.status(500).json({
      error: 'ReportTemplatesError',
      message: error.message || 'Could not fetch report templates.',
    });
  }
});

/**
 * GET /api/reports/templates/:templateId
 * Retrieves detailed definition for a specific template.
 */
reportsRouter.get('/templates/:templateId', requireSession, (req: Request, res: Response): void => {
  try {
    const template = reportService.getReportTemplateById(req.params.templateId);
    if (!template) {
      res.status(404).json({
        error: 'NOT_FOUND',
        message: `Report template ${req.params.templateId} not found.`,
      });
      return;
    }
    res.json({
      success: true,
      template,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'TemplateError',
      message: error.message,
    });
  }
});

/**
 * GET /api/reports
 * Lists reports filtered by user's organizational scope and query parameters.
 */
reportsRouter.get('/', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user as User;
    const companyId = req.query.companyId as string | undefined;
    const reportingPeriodId = req.query.reportingPeriodId as string | undefined;
    const reportType = req.query.reportType as ReportType | undefined;
    const status = req.query.status as ReportStatus | undefined;

    const reports = reportService.listReports(user, {
      companyId,
      reportingPeriodId,
      reportType,
      status,
    });

    res.json({
      success: true,
      total: reports.length,
      reports,
    });
  } catch (error: any) {
    logger.error('Failed to list reports', { error: error.message });
    res.status(error.status || 500).json({
      error: error.code || 'ReportListError',
      message: error.message || 'Could not fetch reports.',
    });
  }
});

/**
 * POST /api/reports/generate
 * Generates a new frozen statutory report draft snapshot from approved Phase 3 & 4 data.
 */
reportsRouter.post('/generate', requireSession, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as User;
    const { templateId, reportType, companyId, reportingPeriodId, notes } = req.body;

    // RBAC: Auditors & Management cannot generate report drafts
    if (user.role === 'AUDITOR' || user.role === 'MANAGEMENT') {
      res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Auditors and Management have read-only oversight and cannot generate company reports.',
      });
      return;
    }

    const report = await reportService.generateReport(user, {
      templateId,
      reportType,
      companyId,
      reportingPeriodId,
      notes,
    });

    res.status(201).json({
      success: true,
      message: `Report ${report.reportId} generated (${report.reportStatus}).`,
      report,
    });
  } catch (error: any) {
    logger.error('Failed to generate report', { error: error.message });
    res.status(error.status || 500).json({
      error: error.code || 'ReportGenerationError',
      message: error.message || 'Could not generate report.',
      details: error.details,
    });
  }
});

/**
 * GET /api/reports/:reportId
 * Retrieves report metadata, validation status, and snapshot.
 */
reportsRouter.get('/:reportId', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user as User;
    const report = reportService.getReportById(user, req.params.reportId);
    if (!report) {
      res.status(404).json({
        error: 'NOT_FOUND',
        message: `Report ${req.params.reportId} not found.`,
      });
      return;
    }

    res.json({
      success: true,
      report,
    });
  } catch (error: any) {
    res.status(error.status || 500).json({
      error: error.code || 'ReportError',
      message: error.message,
    });
  }
});

/**
 * GET /api/reports/:reportId/preview
 * Retrieves structured report preview payload.
 */
reportsRouter.get('/:reportId/preview', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user as User;
    const report = reportService.getReportPreview(user, req.params.reportId);
    res.json({
      success: true,
      report,
    });
  } catch (error: any) {
    res.status(error.status || 500).json({
      error: error.code || 'PreviewError',
      message: error.message,
    });
  }
});

/**
 * POST /api/reports/:reportId/validate
 * Re-runs validation checks against current snapshot.
 */
reportsRouter.post('/:reportId/validate', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user as User;
    const report = reportService.validateReport(user, req.params.reportId);
    res.json({
      success: true,
      report,
      validationSummary: report.validationSummary,
    });
  } catch (error: any) {
    res.status(error.status || 500).json({
      error: error.code || 'ValidationError',
      message: error.message,
    });
  }
});

/**
 * POST /api/reports/:reportId/submit-for-review
 * Transitions report status from DRAFT / VALIDATION_FAILED to UNDER_REVIEW.
 */
reportsRouter.post('/:reportId/submit-for-review', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user as User;
    const { comments } = req.body;
    const updated = reportService.submitForReview(user, req.params.reportId, comments);
    res.json({
      success: true,
      message: `Report ${updated.reportId} submitted for formal review.`,
      report: updated,
    });
  } catch (error: any) {
    res.status(error.status || 500).json({
      error: error.code || 'SubmitReviewError',
      message: error.message,
    });
  }
});

/**
 * POST /api/reports/:reportId/request-changes
 * Requests changes and transitions report status to CHANGES_REQUESTED.
 */
reportsRouter.post('/:reportId/request-changes', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user as User;
    const { comments } = req.body;
    if (!comments) {
      res.status(400).json({ error: 'BAD_REQUEST', message: 'Comments explaining requested changes are required.' });
      return;
    }

    const updated = reportService.requestChanges(user, req.params.reportId, comments);
    res.json({
      success: true,
      message: `Changes requested on report ${updated.reportId}.`,
      report: updated,
    });
  } catch (error: any) {
    res.status(error.status || 500).json({
      error: error.code || 'RequestChangesError',
      message: error.message,
    });
  }
});

/**
 * POST /api/reports/:reportId/approve
 * Approves a reviewed report (enforcing zero blocking issues).
 */
reportsRouter.post('/:reportId/approve', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user as User;
    const { comments } = req.body;
    const approved = reportService.approveReport(user, req.params.reportId, comments);
    res.json({
      success: true,
      message: `Report ${approved.reportId} has been formally approved.`,
      report: approved,
    });
  } catch (error: any) {
    res.status(error.status || 500).json({
      error: error.code || 'ApproveError',
      message: error.message,
      details: error.details,
    });
  }
});

/**
 * POST /api/reports/:reportId/lock
 * Permanently locks and freezes approved report version.
 */
reportsRouter.post('/:reportId/lock', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user as User;
    const locked = reportService.lockReport(user, req.params.reportId);
    res.json({
      success: true,
      message: `Report version ${locked.reportVersion} locked.`,
      report: locked,
    });
  } catch (error: any) {
    res.status(error.status || 500).json({
      error: error.code || 'LockError',
      message: error.message,
    });
  }
});

/**
 * POST /api/reports/:reportId/submit-revision
 * Increments version and re-submits report after change requests are addressed.
 */
reportsRouter.post('/:reportId/submit-revision', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user as User;
    const { comments } = req.body;
    const updated = reportService.submitRevision(user, req.params.reportId, comments || 'Submitted revised report for statutory review.');
    res.json({
      success: true,
      message: `Revision v${updated.reportVersion}.0 submitted for review.`,
      report: updated,
    });
  } catch (error: any) {
    res.status(error.status || 500).json({
      error: error.code || 'RevisionError',
      message: error.message,
    });
  }
});

/**
 * POST /api/reports/:reportId/company-approve
 * Records Company ESG Review and Committee approval.
 */
reportsRouter.post('/:reportId/company-approve', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user as User;
    const { comments } = req.body;
    const updated = reportService.companyApprove(user, req.params.reportId, comments);
    res.json({
      success: true,
      message: `Company ESG review & sign-off recorded for report ${updated.reportId}.`,
      report: updated,
    });
  } catch (error: any) {
    res.status(error.status || 500).json({
      error: error.code || 'CompanyApproveError',
      message: error.message,
    });
  }
});

/**
 * POST /api/reports/:reportId/auditor-approve
 * Records Independent Sustainability Auditor ISAE 3000 assurance sign-off.
 */
reportsRouter.post('/:reportId/auditor-approve', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user as User;
    const { comments } = req.body;
    const updated = reportService.auditorApprove(user, req.params.reportId, comments);
    res.json({
      success: true,
      message: `Statutory auditor ISAE 3000 assurance sign-off recorded for report ${updated.reportId}.`,
      report: updated,
    });
  } catch (error: any) {
    res.status(error.status || 500).json({
      error: error.code || 'AuditorApproveError',
      message: error.message,
    });
  }
});

/**
 * POST /api/reports/:reportId/finalize
 * Completes statutory finalization, locks version, and exports official report artifact.
 */
reportsRouter.post('/:reportId/finalize', requireSession, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as User;
    const { comments } = req.body;
    const locked = await reportService.finalizeAndLock(user, req.params.reportId, comments);
    res.json({
      success: true,
      message: `Report ${locked.reportId} officially finalized and locked for statutory filing.`,
      report: locked,
    });
  } catch (error: any) {
    res.status(error.status || 500).json({
      error: error.code || 'FinalizeError',
      message: error.message,
    });
  }
});

/**
 * GET /api/reports/:reportId/versions
 * Returns all historical versions and frozen snapshots.
 */
reportsRouter.get('/:reportId/versions', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user as User;
    const versions = reportService.getReportVersions(user, req.params.reportId);
    res.json({
      success: true,
      count: versions.length,
      versions,
    });
  } catch (error: any) {
    res.status(error.status || 500).json({
      error: error.code || 'VersionsError',
      message: error.message,
    });
  }
});

/**
 * GET /api/reports/:reportId/history
 * Retrieves version history and audit log trail for the report.
 */
reportsRouter.get('/:reportId/history', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user as User;
    const report = reportService.getReportById(user, req.params.reportId);
    if (!report) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Report not found.' });
      return;
    }

    res.json({
      success: true,
      reportId: report.reportId,
      version: report.reportVersion,
      history: report.history,
    });
  } catch (error: any) {
    res.status(error.status || 500).json({
      error: error.code || 'HistoryError',
      message: error.message,
    });
  }
});

/**
 * POST /api/reports/:reportId/export/pdf
 * Generates official server-side PDF and uploads artifact to Firebase Cloud Storage.
 */
reportsRouter.post('/:reportId/export/pdf', requireSession, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as User;
    const result = await reportService.exportPdf(user, req.params.reportId);
    res.json({
      success: true,
      message: 'Official PDF export generated successfully.',
      ...result,
    });
  } catch (error: any) {
    logger.error('Failed to export report PDF', { error: error.message });
    res.status(error.status || 500).json({
      error: error.code || 'PdfExportError',
      message: error.message || 'Failed to export report PDF.',
    });
  }
});

/**
 * GET /api/reports/:reportId/preview-pdf
 * Streams report PDF inline for in-browser viewer.
 */
reportsRouter.get('/:reportId/preview-pdf', requireSession, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as User;
    const { buffer, fileName } = await reportService.getDownloadBuffer(user, req.params.reportId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.send(buffer);
  } catch (error: any) {
    res.status(error.status || 500).json({
      error: error.code || 'PreviewError',
      message: error.message || 'Could not stream report PDF preview.',
    });
  }
});

/**
 * GET /api/reports/:reportId/download
 * Secure download streaming for report PDF.
 */
reportsRouter.get('/:reportId/download', requireSession, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as User;
    const { buffer, fileName } = await reportService.getDownloadBuffer(user, req.params.reportId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.send(buffer);
  } catch (error: any) {
    res.status(error.status || 500).json({
      error: error.code || 'DownloadError',
      message: error.message || 'Could not stream report PDF.',
    });
  }
});
