import { Router, Request, Response } from 'express';
import multer from 'multer';
import { requireSession } from '../middleware/auth.ts';
import { evidenceService } from '../services/evidence.ts';
import { config } from '../config/index.ts';
import { logger } from '../utils/logger.ts';
import type { EvidenceVerificationStatus } from '../models/types.ts';

export const evidenceRouter = Router();

// Configure Multer for in-memory file uploads with limits
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.maxUploadSizeBytes,
  },
});

/**
 * Standard ESG Evidence Categories
 */
const EVIDENCE_TYPES = [
  'Utility Bill',
  'Electricity Bill',
  'Fuel Invoice',
  'Meter Reading',
  'Purchase Invoice',
  'Travel Record',
  'Refrigerant Record',
  'Waste Record',
  'Water Record',
  'Transport Record',
  'Production Record',
  'Calculation Sheet',
  'ERP Export',
  'Internal Record',
  'Supplier Document',
  'Other',
];

/**
 * GET /api/evidence/types
 * Returns the list of standard supported evidence categories.
 */
evidenceRouter.get('/types', requireSession, (_req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    types: EVIDENCE_TYPES,
  });
});

/**
 * GET /api/evidence
 * Lists all evidence documents scoped to user's organizational permissions.
 */
evidenceRouter.get('/', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user!;
    const filters = {
      reportingPeriodId: req.query.reportingPeriodId as string | undefined,
      companyId: req.query.companyId as string | undefined,
      businessUnitId: req.query.businessUnitId as string | undefined,
      projectId: req.query.projectId as string | undefined,
      facilityId: req.query.facilityId as string | undefined,
      evidenceType: req.query.evidenceType as string | undefined,
      verificationStatus: req.query.verificationStatus as string | undefined,
      linkedRecordId: req.query.linkedRecordId as string | undefined,
      includeArchived: req.query.includeArchived === 'true',
    };

    const documents = evidenceService.listEvidence(user, filters);
    res.status(200).json({
      success: true,
      count: documents.length,
      scope: {
        userId: user.userId,
        role: user.role,
        organizationId: user.organizationId,
        businessUnitId: user.businessUnitId,
        projectId: user.projectId,
      },
      documents,
    });
  } catch (err: unknown) {
    logger.error('Failed to list evidence', { error: err });
    res.status(500).json({ error: 'Internal Error', message: 'Could not fetch evidence records.' });
  }
});

/**
 * GET /api/evidence/:documentId
 * Retrieves detailed document metadata, linked activity records, audit trail, and version history.
 */
evidenceRouter.get('/:documentId', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user!;
    const { documentId } = req.params;
    const details = evidenceService.getEvidenceById(user, documentId);
    res.status(200).json({
      success: true,
      ...details,
    });
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string; code?: string };
    const status = error.status || 500;
    res.status(status).json({
      error: error.code || 'ERROR',
      message: error.message || 'Error fetching document details.',
    });
  }
});

/**
 * GET /api/evidence/:documentId/download
 * Streams the evidence document file binary with appropriate download attachment headers.
 */
evidenceRouter.get('/:documentId/download', requireSession, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { documentId } = req.params;
    const { buffer, fileName, mimeType, checksum } = await evidenceService.downloadEvidence(user, documentId);

    res.setHeader('Content-Type', mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('X-Evidence-Checksum', checksum);
    res.setHeader('Content-Length', buffer.length.toString());
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.send(buffer);
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string; code?: string };
    const status = error.status || 500;
    res.status(status).json({
      error: error.code || 'ERROR',
      message: error.message || 'Error downloading evidence document.',
    });
  }
});

/**
 * GET /api/evidence/:documentId/preview
 * Streams the evidence document file binary with inline disposition for in-browser viewing.
 */
evidenceRouter.get('/:documentId/preview', requireSession, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { documentId } = req.params;
    const { buffer, fileName, mimeType, checksum } = await evidenceService.previewEvidence(user, documentId);

    res.setHeader('Content-Type', mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('X-Evidence-Checksum', checksum);
    res.setHeader('Content-Length', buffer.length.toString());
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.send(buffer);
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string; code?: string };
    const status = error.status || 500;
    res.status(status).json({
      error: error.code || 'ERROR',
      message: error.message || 'Error previewing evidence document.',
    });
  }
});

/**
 * POST /api/evidence/upload
 * Multipart file upload: validates MIME, checks scope & roles, stores file in Storage,
 * creates metadata in Firestore, creates evidence link, logs audit trail.
 */
evidenceRouter.post('/upload', requireSession, upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const file = req.file;

    if (!file) {
      res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'No file attached in multipart form field "file".',
      });
      return;
    }

    const {
      evidenceType,
      description,
      reportingPeriodId,
      linkedRecordId,
      projectId,
      facilityId,
    } = req.body;

    const document = await evidenceService.uploadEvidence(user, file, {
      evidenceType,
      description,
      reportingPeriodId,
      linkedRecordId,
      projectId,
      facilityId,
    });

    res.status(201).json({
      success: true,
      message: 'Evidence document securely uploaded and hashed.',
      document,
    });
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string; code?: string };
    const status = error.status || 500;
    res.status(status).json({
      error: error.code || 'UPLOAD_FAILED',
      message: error.message || 'Failed to upload evidence document.',
    });
  }
});

/**
 * POST /api/evidence/:documentId/replace
 * Replaces an existing evidence document with a new version (Version N+1).
 */
evidenceRouter.post('/:documentId/replace', requireSession, upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const file = req.file;
    const { documentId } = req.params;
    const { reason } = req.body;

    if (!file) {
      res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'No replacement file attached in multipart form field "file".',
      });
      return;
    }

    const newDocument = await evidenceService.replaceEvidence(user, documentId, file, reason);

    res.status(200).json({
      success: true,
      message: `Document replaced. Created version ${newDocument.version}.`,
      document: newDocument,
    });
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string; code?: string };
    const status = error.status || 500;
    res.status(status).json({
      error: error.code || 'REPLACE_FAILED',
      message: error.message || 'Failed to replace evidence document.',
    });
  }
});

/**
 * POST /api/evidence/:documentId/verify
 * Allows auditors and reviewers to update verification status (VERIFIED, REQUIRES_CLARIFICATION, REJECTED).
 */
evidenceRouter.post('/:documentId/verify', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user!;
    const { documentId } = req.params;
    const { status, notes } = req.body as { status: EvidenceVerificationStatus; notes?: string };

    const validStatuses: EvidenceVerificationStatus[] = ['VERIFIED', 'REQUIRES_CLARIFICATION', 'REJECTED', 'PENDING_REVIEW'];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({
        error: 'INVALID_STATUS',
        message: `Status must be one of: ${validStatuses.join(', ')}`,
      });
      return;
    }

    const updatedDoc = evidenceService.verifyEvidence(user, documentId, status, notes);

    res.status(200).json({
      success: true,
      message: `Verification status updated to ${status}.`,
      document: updatedDoc,
    });
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string; code?: string };
    const status = error.status || 500;
    res.status(status).json({
      error: error.code || 'VERIFICATION_FAILED',
      message: error.message || 'Failed to verify evidence.',
    });
  }
});

/**
 * PATCH /api/evidence/:documentId
 * Updates evidence metadata (description, evidenceType, linkedRecordId) without replacing the file.
 */
evidenceRouter.patch('/:documentId', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user!;
    const { documentId } = req.params;
    const { description, evidenceType, linkedRecordId } = req.body;

    const updated = evidenceService.updateMetadata(user, documentId, {
      description,
      evidenceType,
      linkedRecordId,
    });

    res.status(200).json({
      success: true,
      message: 'Evidence metadata updated successfully.',
      document: updated,
    });
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string; code?: string };
    const status = error.status || 500;
    res.status(status).json({
      error: error.code || 'UPDATE_FAILED',
      message: error.message || 'Failed to update metadata.',
    });
  }
});

/**
 * DELETE /api/evidence/:documentId
 * Soft deletes/archives an evidence document, maintaining audit trail.
 */
evidenceRouter.delete('/:documentId', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user!;
    const { documentId } = req.params;
    const { reason } = req.body;

    const result = evidenceService.deleteEvidence(user, documentId, reason);
    res.status(200).json(result);
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string; code?: string };
    const status = error.status || 500;
    res.status(status).json({
      error: error.code || 'DELETE_FAILED',
      message: error.message || 'Failed to archive evidence.',
    });
  }
});

/**
 * GET /api/evidence/:documentId/audit-trail
 * Retrieves full audit logs for a specific document.
 */
evidenceRouter.get('/:documentId/audit-trail', requireSession, (req: Request, res: Response): void => {
  try {
    const user = req.user!;
    const { documentId } = req.params;
    const details = evidenceService.getEvidenceById(user, documentId);
    res.status(200).json({
      success: true,
      documentId,
      auditTrail: details.auditTrail,
    });
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string; code?: string };
    const status = error.status || 500;
    res.status(status).json({
      error: error.code || 'AUDIT_TRAIL_ERROR',
      message: error.message || 'Failed to fetch audit trail.',
    });
  }
});
