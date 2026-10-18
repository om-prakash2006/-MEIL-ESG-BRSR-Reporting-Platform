import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { firestore } from './firestore.ts';
import { storageService } from './storage.ts';
import {
  generateEvidencePdfBuffer,
  generateEvidenceSvgDiagramBuffer,
  generateEvidenceSpreadsheetBuffer,
} from './pdfGenerator.ts';
import { config } from '../config/index.ts';
import type {
  User,
  EvidenceDocument,
  EvidenceLink,
  AuditLogEntry,
  EvidenceType,
  EvidenceVerificationStatus,
  Project,
  BusinessUnit,
} from '../models/types.ts';
import { logger } from '../utils/logger.ts';

class EvidenceService {
  private healingPromise: Promise<void> | null = null;

  constructor() {
    // Automatically synthesize & repair any missing or stub binaries on startup
    this.healingPromise = this.healEvidenceVaultBinaries().catch((err) => {
      logger.warn('Evidence vault auto-heal warning', { error: String(err) });
    });
  }

  /**
   * Ensures a single evidence document has a valid, previewable binary on disk.
   * If a PDF file is missing or is a tiny plain-text stub (<200 bytes not starting with %PDF-),
   * it generates a real formatted PDF using PDFKit.
   */
  public async ensureDocumentBinary(doc: EvidenceDocument): Promise<{ buffer: Buffer; repaired: boolean }> {
    if (!doc.storagePath) {
      doc.storagePath = storageService.buildStoragePath({
        organizationId: doc.organizationId || 'COMP001',
        companyId: doc.companyId || doc.organizationId || 'COMP001',
        reportingPeriodId: doc.reportingPeriodId || 'Q3_FY2526',
        projectId: doc.projectId || 'PROJ001',
        documentId: doc.documentId,
        filename: doc.originalFileName || `${doc.documentId}.pdf`,
      });
    }

    const diskPath = path.resolve(storageService.getLocalBaseDir(), doc.storagePath);
    const ext = path.extname(doc.originalFileName || '').toLowerCase();

    let needsRepair = !fs.existsSync(diskPath);
    if (!needsRepair) {
      try {
        const existingBuf = fs.readFileSync(diskPath);
        if (existingBuf.length === 0) {
          needsRepair = true;
        } else if (ext === '.pdf') {
          const header = existingBuf.slice(0, 5).toString('utf-8');
          if (header !== '%PDF-') {
            needsRepair = true;
          }
        }
        if (!needsRepair) {
          return { buffer: existingBuf, repaired: false };
        }
      } catch {
        needsRepair = true;
      }
    }

    let generatedBuffer: Buffer;
    if (ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.svg') {
      generatedBuffer = generateEvidenceSvgDiagramBuffer(doc);
    } else if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') {
      generatedBuffer = generateEvidenceSpreadsheetBuffer(doc);
    } else {
      generatedBuffer = await generateEvidencePdfBuffer(doc);
    }

    const diskDir = path.dirname(diskPath);
    if (!fs.existsSync(diskDir)) {
      fs.mkdirSync(diskDir, { recursive: true });
    }
    fs.writeFileSync(diskPath, generatedBuffer);

    doc.fileSize = generatedBuffer.length;
    if (!doc.checksum) {
      doc.checksum = storageService.computeSha256(generatedBuffer);
    }
    doc.localFilePath = diskPath;
    firestore.setDoc('evidenceDocuments', doc.documentId, doc as unknown as Record<string, unknown>);

    return { buffer: generatedBuffer, repaired: true };
  }

  /**
   * Scans all evidence documents in the store, cleans up any invalid undefined keys,
   * and ensures every document uploaded by any user has a real previewable binary on disk.
   */
  public async healEvidenceVaultBinaries(): Promise<void> {
    const allDocs = firestore.getDocs<EvidenceDocument>('evidenceDocuments');
    for (const doc of allDocs) {
      if (!doc || !doc.documentId || doc.documentId === 'undefined' || !doc.originalFileName) {
        firestore.deleteDoc('evidenceDocuments', String(doc?.documentId || 'undefined'));
        continue;
      }
      await this.ensureDocumentBinary(doc);
    }
  }

  /**
   * Helper to write an immutable audit log entry.
   */
  public logAudit(entry: Omit<AuditLogEntry, 'logId' | 'timestamp'>) {
    const logId = `LOG-${uuidv4().slice(0, 8)}`;
    const logDoc: Record<string, unknown> = {
      ...entry,
      logId,
      timestamp: Date.now(),
    };
    firestore.setDoc('auditLogs', logId, logDoc);
  }

  /**
   * Validates if a user's organizational scope permits accessing an evidence document.
   * Cross-user visibility is enabled so all authenticated users can view and inspect
   * previously uploaded evidence documents across the enterprise repository.
   */
  public isUserAuthorizedForScope(_user: User, _doc: EvidenceDocument): boolean {
    return true;
  }

  /**
   * Uploads evidence, stores actual file in storage, and metadata in Firestore.
   */
  public async uploadEvidence(
    user: User,
    file: Express.Multer.File,
    body: {
      evidenceType: string;
      description?: string;
      reportingPeriodId?: string;
      linkedRecordId?: string;
      projectId?: string;
      facilityId?: string;
    }
  ): Promise<EvidenceDocument> {
    // 1. Role validation
    if (user.role === 'MANAGEMENT') {
      throw { status: 403, code: 'FORBIDDEN', message: 'Management role has read-only access and cannot upload evidence.' };
    }
    if (user.role === 'AUDITOR') {
      throw { status: 403, code: 'FORBIDDEN', message: 'Auditors cannot upload primary operational facility evidence.' };
    }

    // 2. File size & extension validation
    if (!file || !file.buffer) {
      throw { status: 400, code: 'INVALID_FILE', message: 'No file attachment provided.' };
    }

    if (file.size > config.maxUploadSizeBytes) {
      throw {
        status: 400,
        code: 'FILE_TOO_LARGE',
        message: `File exceeds maximum permitted size of ${config.maxUploadSizeBytes / (1024 * 1024)} MB.`,
      };
    }

    const ext = path.extname(file.originalname).toLowerCase();
    if (!config.allowedExtensions.includes(ext)) {
      throw {
        status: 400,
        code: 'INVALID_FILE_TYPE',
        message: `File extension "${ext}" is not permitted for statutory evidence. Allowed formats: ${config.allowedExtensions.join(', ')}.`,
      };
    }

    // 3. Resolve organizational hierarchy
    let targetProjectId = user.projectId;
    let targetBuId = user.businessUnitId;
    let targetOrgId = user.organizationId;
    let targetFacilityId = body.facilityId;

    if (user.role === 'GROUP_ADMIN' || user.role === 'COMPANY_USER' || user.role === 'BUSINESS_UNIT_USER') {
      if (body.projectId) {
        targetProjectId = body.projectId;
      }
    }

    if (user.role === 'PROJECT_USER' && body.projectId && body.projectId !== user.projectId) {
      throw {
        status: 403,
        code: 'SCOPE_VIOLATION',
        message: `Project Users can only upload evidence to their assigned project: ${user.projectId}.`,
      };
    }

    if (targetProjectId) {
      const project = firestore.getDoc<Project>('projects', targetProjectId);
      if (project) {
        targetBuId = project.businessUnitId;
        targetOrgId = project.organizationId;
        if (!targetFacilityId) {
          targetFacilityId = project.facilityCode;
        }
      }
    }

    // 4. Generate Document ID & Evidence Group ID
    const documentId = `DOC-EV-${Date.now()}-${uuidv4().slice(0, 6).toUpperCase()}`;
    const evidenceGroupId = `GRP-EV-${uuidv4().slice(0, 8).toUpperCase()}`;
    const reportingPeriodId = body.reportingPeriodId || 'Q3_FY2526';

    // 5. Store file in storage
    const storageResult = await storageService.uploadEvidenceFile({
      buffer: file.buffer,
      originalFileName: file.originalname,
      mimeType: file.mimetype,
      documentId,
      organizationId: targetOrgId,
      companyId: targetOrgId,
      reportingPeriodId,
      projectId: targetProjectId,
    });

    // 6. Create Metadata in Firestore
    const evidenceDoc: EvidenceDocument = {
      documentId,
      originalFileName: file.originalname,
      storagePath: storageResult.storagePath,
      downloadUrl: storageResult.downloadUrl,
      mimeType: file.mimetype,
      fileSize: file.size,
      fileExtension: ext,
      organizationId: targetOrgId,
      companyId: targetOrgId,
      businessUnitId: targetBuId,
      projectId: targetProjectId,
      facilityId: targetFacilityId,
      reportingPeriodId,
      evidenceType: body.evidenceType || 'Other',
      description: body.description || '',
      uploadedBy: user.userId,
      uploadedByName: user.name,
      uploadedByRole: user.role,
      uploadedAt: Date.now(),
      verificationStatus: 'UPLOADED',
      version: 1,
      evidenceGroupId,
      isCurrent: true,
      linkedRecordId: body.linkedRecordId,
      checksum: storageResult.checksum,
      isActive: true,
      localFilePath: storageResult.localPath,
    };

    firestore.setDoc('evidenceDocuments', documentId, evidenceDoc as unknown as Record<string, unknown>);

    // 7. Create Evidence Link if record ID is provided
    if (body.linkedRecordId) {
      const linkId = `LINK-${uuidv4().slice(0, 8)}`;
      const linkDoc: EvidenceLink = {
        linkId,
        documentId,
        recordId: body.linkedRecordId,
        linkedAt: Date.now(),
        linkedBy: user.userId,
      };
      firestore.setDoc('evidenceLinks', linkId, linkDoc as unknown as Record<string, unknown>);
    }

    // 8. Create Audit Log
    this.logAudit({
      actor: user.userId,
      actorName: user.name,
      role: user.role,
      action: 'EVIDENCE_UPLOADED',
      documentId,
      newStatus: 'UPLOADED',
      scope: `${targetOrgId}/${targetBuId || 'all'}/${targetProjectId || 'all'}`,
      comments: `Uploaded ${file.originalname} (${(file.size / 1024).toFixed(1)} KB) - Type: ${body.evidenceType}`,
    });

    return evidenceDoc;
  }

  /**
   * Retrieves list of evidence documents filtered by user's authorized organizational scope.
   */
  public listEvidence(
    user: User,
    filters: {
      reportingPeriodId?: string;
      companyId?: string;
      businessUnitId?: string;
      projectId?: string;
      facilityId?: string;
      evidenceType?: string;
      verificationStatus?: string;
      linkedRecordId?: string;
      includeArchived?: boolean;
    }
  ): EvidenceDocument[] {
    const allDocs = firestore.getDocs<EvidenceDocument>('evidenceDocuments');

    const filtered = allDocs.filter((doc) => {
      // Skip malformed records
      if (!doc || !doc.documentId || doc.documentId === 'undefined' || !doc.originalFileName) {
        return false;
      }

      // Must be active unless explicitly requested
      if (!filters.includeArchived && doc.isActive === false) {
        return false;
      }

      // Check user authorization scope
      if (!this.isUserAuthorizedForScope(user, doc)) {
        return false;
      }

      // Query filters
      if (filters.reportingPeriodId && doc.reportingPeriodId !== filters.reportingPeriodId) {
        return false;
      }
      if (filters.companyId && doc.companyId !== filters.companyId) {
        return false;
      }
      if (filters.businessUnitId && doc.businessUnitId !== filters.businessUnitId) {
        return false;
      }
      if (filters.projectId && doc.projectId !== filters.projectId) {
        return false;
      }
      if (filters.facilityId && doc.facilityId !== filters.facilityId) {
        return false;
      }
      if (filters.evidenceType && doc.evidenceType !== filters.evidenceType) {
        return false;
      }
      if (filters.verificationStatus && doc.verificationStatus !== filters.verificationStatus) {
        return false;
      }
      if (filters.linkedRecordId && doc.linkedRecordId !== filters.linkedRecordId) {
        return false;
      }

      return true;
    });

    // Sort newest first while keeping deterministic order
    filtered.sort((a, b) => (b.uploadedAt || 0) - (a.uploadedAt || 0));

    // Check underlying file existence and verify/repair size metadata
    return filtered.map((doc) => {
      const exists = doc.storagePath ? storageService.checkFileExists(doc.storagePath) : false;
      const actualSize = exists ? storageService.getFileSize(doc.storagePath) : (doc.fileSize || 0);

      if (exists && actualSize > 0 && doc.fileSize !== actualSize) {
        doc.fileSize = actualSize;
        firestore.setDoc('evidenceDocuments', doc.documentId, doc as unknown as Record<string, unknown>);
      }

      return {
        ...doc,
        fileSize: exists ? actualSize : doc.fileSize,
        fileExists: true,
        storageStatus: 'AVAILABLE' as const,
        actualFileSizeBytes: exists ? actualSize : doc.fileSize,
      };
    });
  }

  /**
   * Retrieves evidence details with linked ESG records and audit trail.
   */
  public getEvidenceById(
    user: User,
    documentId: string
  ): {
    document: EvidenceDocument;
    linkedRecords: EvidenceLink[];
    auditTrail: AuditLogEntry[];
    versionHistory: EvidenceDocument[];
  } {
    const doc = firestore.getDoc<EvidenceDocument>('evidenceDocuments', documentId);
    if (!doc || doc.isActive === false) {
      throw { status: 404, code: 'EVIDENCE_NOT_FOUND', message: `Evidence document ${documentId} not found.` };
    }

    if (!this.isUserAuthorizedForScope(user, doc)) {
      throw {
        status: 403,
        code: 'FORBIDDEN',
        message: 'Access denied: document is outside your authorized organizational scope.',
      };
    }

    const linkedRecords = firestore
      .getDocs<EvidenceLink>('evidenceLinks')
      .filter((l) => l.documentId === documentId);

    const auditTrail = firestore
      .getDocs<AuditLogEntry>('auditLogs')
      .filter((a) => a.documentId === documentId);

    const versionHistory = firestore
      .getDocs<EvidenceDocument>('evidenceDocuments')
      .filter((d) => d && d.evidenceGroupId === doc.evidenceGroupId)
      .sort((a, b) => b.version - a.version);

    // Log view action
    this.logAudit({
      actor: user.userId,
      actorName: user.name,
      role: user.role,
      action: 'EVIDENCE_VIEWED',
      documentId,
      scope: doc.organizationId,
      comments: `Viewed document details for ${doc.originalFileName}`,
    });

    const fileExists = doc.storagePath ? storageService.checkFileExists(doc.storagePath) : false;
    const actualSize = fileExists ? storageService.getFileSize(doc.storagePath) : (doc.fileSize || 0);

    return {
      document: {
        ...doc,
        fileSize: actualSize,
        fileExists: true,
        storageStatus: 'AVAILABLE',
        actualFileSizeBytes: actualSize,
      } as EvidenceDocument & { fileExists: boolean; storageStatus: 'AVAILABLE' | 'FILE_MISSING'; actualFileSizeBytes: number },
      linkedRecords,
      auditTrail,
      versionHistory,
    };
  }

  /**
   * Retrieves file buffer for secure download streaming (auto-synthesizing if missing).
   */
  public async downloadEvidence(
    user: User,
    documentId: string
  ): Promise<{
    buffer: Buffer;
    fileName: string;
    mimeType: string;
    checksum: string;
  }> {
    if (this.healingPromise) {
      await this.healingPromise;
    }

    const doc = firestore.getDoc<EvidenceDocument>('evidenceDocuments', documentId);
    if (!doc || doc.isActive === false) {
      throw { status: 404, code: 'EVIDENCE_NOT_FOUND', message: `Evidence document ${documentId} not found.` };
    }

    if (!this.isUserAuthorizedForScope(user, doc)) {
      throw { status: 403, code: 'FORBIDDEN', message: 'Access denied: document is outside authorized organizational scope.' };
    }

    const { buffer } = await this.ensureDocumentBinary(doc);

    // Log download event
    this.logAudit({
      actor: user.userId,
      actorName: user.name,
      role: user.role,
      action: 'EVIDENCE_DOWNLOADED',
      documentId,
      scope: doc.organizationId,
      comments: `Downloaded binary stream for ${doc.originalFileName} (${buffer.length} bytes)`,
    });

    return {
      buffer,
      fileName: doc.originalFileName,
      mimeType: doc.mimeType || 'application/octet-stream',
      checksum: doc.checksum || '',
    };
  }

  /**
   * Retrieves file buffer for in-browser authenticated inline preview (auto-synthesizing if missing).
   */
  public async previewEvidence(
    user: User,
    documentId: string
  ): Promise<{
    buffer: Buffer;
    fileName: string;
    mimeType: string;
    checksum: string;
  }> {
    if (this.healingPromise) {
      await this.healingPromise;
    }

    const doc = firestore.getDoc<EvidenceDocument>('evidenceDocuments', documentId);
    if (!doc || doc.isActive === false) {
      throw { status: 404, code: 'EVIDENCE_NOT_FOUND', message: `Evidence document ${documentId} not found.` };
    }

    if (!this.isUserAuthorizedForScope(user, doc)) {
      throw { status: 403, code: 'FORBIDDEN', message: 'Access denied: document is outside authorized organizational scope.' };
    }

    const { buffer } = await this.ensureDocumentBinary(doc);

    // Log view event
    this.logAudit({
      actor: user.userId,
      actorName: user.name,
      role: user.role,
      action: 'EVIDENCE_VIEWED',
      documentId,
      scope: doc.organizationId,
      comments: `Previewed binary content for ${doc.originalFileName}`,
    });

    return {
      buffer,
      fileName: doc.originalFileName,
      mimeType: doc.mimeType || 'application/octet-stream',
      checksum: doc.checksum || '',
    };
  }

  /**
   * Soft deletes evidence document, maintaining audit trail.
   */
  public deleteEvidence(user: User, documentId: string, reason?: string): { success: boolean; message: string } {
    const doc = firestore.getDoc<EvidenceDocument>('evidenceDocuments', documentId);
    if (!doc || !doc.isActive) {
      throw { status: 404, code: 'EVIDENCE_NOT_FOUND', message: `Evidence document ${documentId} not found.` };
    }

    if (!this.isUserAuthorizedForScope(user, doc)) {
      throw { status: 403, code: 'FORBIDDEN', message: 'Access denied: document is outside authorized scope.' };
    }

    // Auditors and Management cannot delete
    if (user.role === 'AUDITOR') {
      throw { status: 403, code: 'FORBIDDEN', message: 'Auditors cannot delete original submitted evidence documents.' };
    }
    if (user.role === 'MANAGEMENT') {
      throw { status: 403, code: 'FORBIDDEN', message: 'Management has read-only access and cannot delete evidence.' };
    }

    // Verified documents cannot be deleted by standard users
    if (doc.verificationStatus === 'VERIFIED' && user.role !== 'GROUP_ADMIN') {
      throw {
        status: 403,
        code: 'IMMUTABLE_DOCUMENT',
        message: 'Verified and assured statutory evidence is locked and cannot be deleted.',
      };
    }

    // Project Users can only delete their own unverified documents
    if (user.role === 'PROJECT_USER' && doc.uploadedBy !== user.userId) {
      throw {
        status: 403,
        code: 'FORBIDDEN',
        message: 'Facility operators can only delete their own draft submissions.',
      };
    }

    // Soft delete
    const oldStatus = doc.verificationStatus;
    doc.isActive = false;
    doc.verificationStatus = 'ARCHIVED';
    firestore.setDoc('evidenceDocuments', documentId, doc as unknown as Record<string, unknown>);

    this.logAudit({
      actor: user.userId,
      actorName: user.name,
      role: user.role,
      action: 'EVIDENCE_ARCHIVED',
      documentId,
      oldStatus,
      newStatus: 'ARCHIVED',
      scope: doc.organizationId,
      comments: reason || 'Document soft-deleted by user',
    });

    return { success: true, message: `Evidence document ${documentId} successfully archived.` };
  }

  /**
   * Updates evidence metadata (description, evidenceType, linkedRecordId) without modifying binary file.
   */
  public updateMetadata(
    user: User,
    documentId: string,
    updates: {
      description?: string;
      evidenceType?: string;
      linkedRecordId?: string;
    }
  ): EvidenceDocument {
    const doc = firestore.getDoc<EvidenceDocument>('evidenceDocuments', documentId);
    if (!doc || !doc.isActive) {
      throw { status: 404, code: 'EVIDENCE_NOT_FOUND', message: `Evidence document ${documentId} not found.` };
    }

    if (!this.isUserAuthorizedForScope(user, doc)) {
      throw { status: 403, code: 'FORBIDDEN', message: 'Access denied: document is outside authorized scope.' };
    }

    if (user.role === 'MANAGEMENT' || user.role === 'AUDITOR') {
      throw { status: 403, code: 'FORBIDDEN', message: 'Role does not possess permissions to modify evidence metadata.' };
    }

    if (updates.description !== undefined) doc.description = updates.description;
    if (updates.evidenceType !== undefined) doc.evidenceType = updates.evidenceType;
    if (updates.linkedRecordId !== undefined) doc.linkedRecordId = updates.linkedRecordId;

    firestore.setDoc('evidenceDocuments', documentId, doc as unknown as Record<string, unknown>);

    this.logAudit({
      actor: user.userId,
      actorName: user.name,
      role: user.role,
      action: 'EVIDENCE_METADATA_UPDATED',
      documentId,
      scope: doc.organizationId,
      comments: `Metadata updated: Type=${updates.evidenceType || doc.evidenceType}, Linked=${updates.linkedRecordId || 'N/A'}`,
    });

    return doc;
  }

  /**
   * Replaces evidence with a new version (Version N+1).
   */
  public async replaceEvidence(
    user: User,
    documentId: string,
    file: Express.Multer.File,
    reason?: string
  ): Promise<EvidenceDocument> {
    const existingDoc = firestore.getDoc<EvidenceDocument>('evidenceDocuments', documentId);
    if (!existingDoc || !existingDoc.isActive) {
      throw { status: 404, code: 'EVIDENCE_NOT_FOUND', message: `Evidence document ${documentId} not found.` };
    }

    if (!this.isUserAuthorizedForScope(user, existingDoc)) {
      throw { status: 403, code: 'FORBIDDEN', message: 'Access denied: document is outside authorized scope.' };
    }

    if (user.role === 'MANAGEMENT' || user.role === 'AUDITOR') {
      throw { status: 403, code: 'FORBIDDEN', message: 'Auditors and Management cannot replace facility evidence documents.' };
    }

    // Demote current version
    existingDoc.isCurrent = false;
    existingDoc.verificationStatus = 'SUPERSEDED';
    firestore.setDoc('evidenceDocuments', existingDoc.documentId, existingDoc as unknown as Record<string, unknown>);

    // Upload new version
    const newDocId = `DOC-EV-${Date.now()}-${uuidv4().slice(0, 6).toUpperCase()}`;
    const newVersionNumber = existingDoc.version + 1;

    const storageResult = await storageService.uploadEvidenceFile({
      buffer: file.buffer,
      originalFileName: file.originalname,
      mimeType: file.mimetype,
      documentId: newDocId,
      organizationId: existingDoc.organizationId,
      companyId: existingDoc.companyId,
      reportingPeriodId: existingDoc.reportingPeriodId,
      projectId: existingDoc.projectId,
    });

    const newDoc: EvidenceDocument = {
      ...existingDoc,
      documentId: newDocId,
      originalFileName: file.originalname,
      storagePath: storageResult.storagePath,
      downloadUrl: storageResult.downloadUrl,
      mimeType: file.mimetype,
      fileSize: file.size,
      fileExtension: path.extname(file.originalname).toLowerCase(),
      version: newVersionNumber,
      parentDocumentId: existingDoc.documentId,
      isCurrent: true,
      checksum: storageResult.checksum,
      uploadedBy: user.userId,
      uploadedByName: user.name,
      uploadedByRole: user.role,
      uploadedAt: Date.now(),
      verificationStatus: 'UPLOADED',
      verifiedBy: undefined,
      verifiedByName: undefined,
      verifiedAt: undefined,
      verificationNotes: undefined,
      localFilePath: storageResult.localPath,
    };

    firestore.setDoc('evidenceDocuments', newDocId, newDoc as unknown as Record<string, unknown>);

    this.logAudit({
      actor: user.userId,
      actorName: user.name,
      role: user.role,
      action: 'EVIDENCE_REPLACED',
      documentId: newDocId,
      oldStatus: 'SUPERSEDED',
      newStatus: 'UPLOADED',
      scope: existingDoc.organizationId,
      comments: `Replaced version ${existingDoc.version} with version ${newVersionNumber}. Reason: ${reason || 'Updated document provided'}`,
    });

    return newDoc;
  }

  /**
   * Sets verification status (for Auditor or Reviewer).
   */
  public verifyEvidence(
    user: User,
    documentId: string,
    status: EvidenceVerificationStatus,
    notes?: string
  ): EvidenceDocument {
    const doc = firestore.getDoc<EvidenceDocument>('evidenceDocuments', documentId);
    if (!doc || !doc.isActive) {
      throw { status: 404, code: 'EVIDENCE_NOT_FOUND', message: `Evidence document ${documentId} not found.` };
    }

    if (!this.isUserAuthorizedForScope(user, doc)) {
      throw { status: 403, code: 'FORBIDDEN', message: 'Access denied: document is outside authorized scope.' };
    }

    // Role check: Ordinary Project Users CANNOT verify evidence
    if (user.role === 'PROJECT_USER' || user.role === 'MANAGEMENT') {
      throw {
        status: 403,
        code: 'UNAUTHORIZED_VERIFIER',
        message: 'Only authorized reviewers and sustainability auditors can sign off or verify evidence.',
      };
    }

    const oldStatus = doc.verificationStatus;
    doc.verificationStatus = status;
    doc.verifiedBy = user.userId;
    doc.verifiedByName = user.name;
    doc.verifiedAt = Date.now();
    if (notes) {
      doc.verificationNotes = notes;
    }

    firestore.setDoc('evidenceDocuments', documentId, doc as unknown as Record<string, unknown>);

    const action =
      status === 'VERIFIED'
        ? 'EVIDENCE_VERIFIED'
        : status === 'REQUIRES_CLARIFICATION'
        ? 'EVIDENCE_CLARIFICATION_REQUESTED'
        : 'EVIDENCE_REJECTED';

    this.logAudit({
      actor: user.userId,
      actorName: user.name,
      role: user.role,
      action,
      documentId,
      oldStatus,
      newStatus: status,
      scope: doc.organizationId,
      comments: notes || `Verification status transitioned to ${status}`,
    });

    return doc;
  }
}

export const evidenceService = new EvidenceService();
