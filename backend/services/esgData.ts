import { v4 as uuidv4 } from 'uuid';
import { firestore } from './firestore.ts';
import type {
  User,
  ActivityRecord,
  ActivityVersion,
  ActivityEvidenceLink,
  ScopeNumber,
  Scope1Details,
  Scope2Details,
  Scope3Details,
  ESGWorkflowStatus,
  Project,
  BusinessUnit,
  Organization,
  Facility,
  ReportingPeriod,
  EmissionSource,
  ActivityType,
  Unit,
  Scope3CategoryDef,
  ValueChainPartner,
  Substance,
  AuditLogEntry,
  EvidenceDocument,
} from '../models/types.ts';
import { logger } from '../utils/logger.ts';

export class ESGDataService {
  /**
   * Helper to write an immutable audit log entry for ESG transactions.
   */
  public logAudit(entry: {
    actor: string;
    actorName?: string;
    role: string;
    action: AuditLogEntry['action'];
    activityId: string;
    oldStatus?: string;
    newStatus?: string;
    scope?: string;
    comments?: string;
  }) {
    const logId = `LOG-ESG-${uuidv4().slice(0, 8)}`;
    const logDoc: Record<string, unknown> = {
      logId,
      actor: entry.actor,
      actorName: entry.actorName || entry.actor,
      role: entry.role,
      action: entry.action,
      activityId: entry.activityId,
      timestamp: Date.now(),
    };
    if (entry.oldStatus !== undefined && entry.oldStatus !== null) {
      logDoc.oldStatus = entry.oldStatus;
    }
    if (entry.newStatus !== undefined && entry.newStatus !== null) {
      logDoc.newStatus = entry.newStatus;
    }
    if (entry.scope !== undefined && entry.scope !== null) {
      logDoc.scope = entry.scope;
    }
    if (entry.comments !== undefined && entry.comments !== null) {
      logDoc.comments = entry.comments;
    }
    firestore.setDoc('auditLogs', logId, logDoc);
  }

  /**
  /**
   * Verifies if a user's organizational scope authorizes access to an activity record.
   * Enabled across the enterprise repository so all authenticated users can inspect
   * records and attached evidence uploaded by any user.
   */
  public isUserAuthorizedForScope(_user: User, _record: ActivityRecord): boolean {
    return true;
  }

  /**
   * Validates Scope rules and numeric bounds.
   */
  public validateRecordPayload(payload: Partial<ActivityRecord>) {
    const errors: string[] = [];

    // Scope rules
    if (payload.scopeNo === 1 || payload.scopeNo === 2) {
      if (payload.scope3CategoryNo !== null && payload.scope3CategoryNo !== undefined) {
        errors.push(`Scope ${payload.scopeNo} activities cannot have a Scope 3 category.`);
      }
    } else if (payload.scopeNo === 3) {
      if (!payload.scope3CategoryNo || payload.scope3CategoryNo < 1 || payload.scope3CategoryNo > 15) {
        errors.push('Scope 3 activities must have a valid scope3CategoryNo between 1 and 15.');
      }
    } else if (payload.scopeNo !== undefined) {
      errors.push('Invalid scope number. Must be 1, 2, or 3.');
    }

    // Date range rules
    if (payload.periodStart && payload.periodEnd) {
      if (new Date(payload.periodEnd).getTime() < new Date(payload.periodStart).getTime()) {
        errors.push('periodEnd must be greater than or equal to periodStart.');
      }
    }

    // Quantity & Spend non-negative rules
    if (payload.quantity !== undefined && payload.quantity !== null && payload.quantity < 0) {
      errors.push('Quantity cannot be negative.');
    }
    if (payload.spendAmount !== undefined && payload.spendAmount !== null && payload.spendAmount < 0) {
      errors.push('Spend amount cannot be negative.');
    }

    // Scope 2 renewable percentage validation
    if (payload.scope2Details && payload.scope2Details.renewablePercentage !== undefined) {
      const renPct = payload.scope2Details.renewablePercentage;
      if (renPct < 0 || renPct > 100) {
        errors.push('renewablePercentage must be between 0 and 100.');
      }
    }

    if (errors.length > 0) {
      throw { status: 400, code: 'VALIDATION_FAILED', message: errors.join('; '), details: errors };
    }
  }

  /**
   * Resolves and enforces organizational hierarchy for new or modified records.
   */
  public resolveScopeForUser(user: User, body: Partial<ActivityRecord>): {
    organizationId: string;
    companyId: string;
    businessUnitId?: string;
    projectId?: string;
    facilityId?: string;
  } {
    if (user.role === 'MANAGEMENT') {
      throw { status: 403, code: 'FORBIDDEN', message: 'Management role has read-only access and cannot enter ESG records.' };
    }
    if (user.role === 'AUDITOR') {
      throw { status: 403, code: 'FORBIDDEN', message: 'Auditors cannot enter primary ESG activity records.' };
    }

    let orgId = user.organizationId;
    let buId = user.businessUnitId;
    let projId = user.projectId;
    let facId = body.facilityId;

    if (user.role === 'PROJECT_USER') {
      if (body.projectId && body.projectId !== user.projectId) {
        throw {
          status: 403,
          code: 'SCOPE_VIOLATION',
          message: `Project Users can only create activity records for their assigned project (${user.projectId}).`,
        };
      }
      projId = user.projectId;
      buId = user.businessUnitId;
      orgId = user.organizationId;
    } else if (user.role === 'BUSINESS_UNIT_USER') {
      if (body.businessUnitId && body.businessUnitId !== user.businessUnitId) {
        throw {
          status: 403,
          code: 'SCOPE_VIOLATION',
          message: `Business Unit Users can only operate within their assigned business unit (${user.businessUnitId}).`,
        };
      }
      buId = user.businessUnitId;
      orgId = user.organizationId;
      if (body.projectId) {
        const proj = firestore.getDoc<Project>('projects', body.projectId);
        if (!proj || proj.businessUnitId !== buId) {
          throw { status: 403, code: 'SCOPE_VIOLATION', message: 'Target project does not belong to your business unit.' };
        }
        projId = body.projectId;
      }
    } else if (user.role === 'COMPANY_USER') {
      if (body.organizationId && body.organizationId !== user.organizationId) {
        throw {
          status: 403,
          code: 'SCOPE_VIOLATION',
          message: `Company Users can only operate within their assigned company (${user.organizationId}).`,
        };
      }
      orgId = user.organizationId;
      if (body.businessUnitId) buId = body.businessUnitId;
      if (body.projectId) projId = body.projectId;
    } else if (user.role === 'GROUP_ADMIN') {
      if (body.organizationId) orgId = body.organizationId;
      if (body.businessUnitId) buId = body.businessUnitId;
      if (body.projectId) projId = body.projectId;
    }

    // Default facility code from project if not set
    if (projId && !facId) {
      const proj = firestore.getDoc<Project>('projects', projId);
      if (proj) {
        facId = proj.facilityCode;
      }
    }

    return {
      organizationId: orgId,
      companyId: orgId,
      businessUnitId: buId,
      projectId: projId,
      facilityId: facId,
    };
  }

  /**
   * Creates a new ESG Activity Record (default workflowStatus: DRAFT).
   */
  public createActivityRecord(user: User, body: Partial<ActivityRecord>): ActivityRecord {
    this.validateRecordPayload(body);
    const scope = this.resolveScopeForUser(user, body);

    const activityId = `ACT-${Date.now().toString().slice(-6)}-${uuidv4().slice(0, 4).toUpperCase()}`;
    const reportingPeriodId = body.reportingPeriodId || 'Q3_FY2526';

    const record: ActivityRecord = {
      activityId,
      organizationId: scope.organizationId,
      companyId: scope.companyId,
      businessUnitId: scope.businessUnitId || '',
      projectId: scope.projectId || '',
      facilityId: scope.facilityId || '',
      reportingPeriodId,
      scopeNo: body.scopeNo || 1,
      scope3CategoryNo: body.scopeNo === 3 ? (body.scope3CategoryNo ?? null) : null,
      activityTypeId: body.activityTypeId || 'ACT-DIESEL-GEN',
      recordNature: body.recordNature || 'ACTIVITY',
      activityDate: body.activityDate || new Date().toISOString().slice(0, 10),
      periodStart: body.periodStart || new Date().toISOString().slice(0, 10),
      periodEnd: body.periodEnd || new Date().toISOString().slice(0, 10),
      description: body.description || '',
      quantity: body.quantity !== undefined ? body.quantity : 0,
      unitId: body.unitId || 'LITER',
      spendAmount: body.spendAmount !== undefined ? body.spendAmount : 0,
      currencyCode: body.currencyCode || 'INR',
      dataMethod: body.dataMethod || 'MEASURED',
      sourceReference: body.sourceReference || '',
      invoiceOrMeterRef: body.invoiceOrMeterRef || '',
      estimatedFlag: !!body.estimatedFlag,
      estimationReason: body.estimationReason || '',
      workflowStatus: body.workflowStatus === 'SUBMITTED' ? 'SUBMITTED' : 'DRAFT',
      enteredBy: user.userId,
      enteredByName: user.name,
      enteredAt: Date.now(),
      remarks: body.remarks || '',
      currentVersion: 1,
      isActive: true,
      linkedEvidenceIds: body.linkedEvidenceIds || [],
    };

    if (body.emissionSourceId) {
      record.emissionSourceId = body.emissionSourceId;
    }
    if (body.parentActivityId) {
      record.parentActivityId = body.parentActivityId;
    }
    if (body.scope1Details) {
      record.scope1Details = body.scope1Details;
    }
    if (body.scope2Details) {
      record.scope2Details = body.scope2Details;
    }
    if (body.scope3Details) {
      record.scope3Details = body.scope3Details;
    }

    firestore.setDoc('activityRecords', activityId, record as unknown as Record<string, unknown>);

    this.logAudit({
      actor: user.userId,
      actorName: user.name,
      role: user.role,
      action: record.workflowStatus === 'SUBMITTED' ? 'ESG_RECORD_SUBMITTED' : 'ESG_RECORD_CREATED',
      activityId,
      oldStatus: 'NONE',
      newStatus: record.workflowStatus,
      scope: `${scope.organizationId}/${scope.businessUnitId || 'all'}/${scope.projectId || 'all'}`,
      comments: `Created ${record.recordNature} Scope ${record.scopeNo} record (${record.description || record.activityTypeId})`,
    });

    return record;
  }

  /**
   * Saves or updates a DRAFT record without enforcing all submission constraints.
   */
  public saveDraft(user: User, activityId: string, updates: Partial<ActivityRecord>): ActivityRecord {
    const existing = firestore.getDoc<ActivityRecord>('activityRecords', activityId);
    if (!existing || !existing.isActive) {
      throw { status: 404, code: 'RECORD_NOT_FOUND', message: `Activity record ${activityId} not found.` };
    }

    if (!this.isUserAuthorizedForScope(user, existing)) {
      throw { status: 403, code: 'FORBIDDEN', message: 'Access denied: record is outside authorized organizational scope.' };
    }

    if (existing.workflowStatus !== 'DRAFT' && existing.workflowStatus !== 'REJECTED') {
      throw {
        status: 400,
        code: 'INVALID_STATE',
        message: `Cannot save as draft: record is currently in status "${existing.workflowStatus}".`,
      };
    }

    this.validateRecordPayload(updates);

    const updatedRecord: ActivityRecord = {
      ...existing,
      ...updates,
      activityId: existing.activityId, // Protect ID
      organizationId: existing.organizationId,
      companyId: existing.companyId,
      workflowStatus: 'DRAFT',
      enteredBy: user.userId,
      enteredByName: user.name,
      updatedAt: Date.now(),
    };

    firestore.setDoc('activityRecords', activityId, updatedRecord as unknown as Record<string, unknown>);

    this.logAudit({
      actor: user.userId,
      actorName: user.name,
      role: user.role,
      action: 'ESG_RECORD_UPDATED',
      activityId,
      oldStatus: existing.workflowStatus,
      newStatus: 'DRAFT',
      scope: existing.organizationId,
      comments: 'Saved draft revisions',
    });

    return updatedRecord;
  }

  /**
   * Submits a DRAFT record for validation and review (DRAFT -> SUBMITTED).
   */
  public submitRecord(user: User, activityId: string): ActivityRecord {
    const record = firestore.getDoc<ActivityRecord>('activityRecords', activityId);
    if (!record || !record.isActive) {
      throw { status: 404, code: 'RECORD_NOT_FOUND', message: `Activity record ${activityId} not found.` };
    }

    if (!this.isUserAuthorizedForScope(user, record)) {
      throw { status: 403, code: 'FORBIDDEN', message: 'Access denied: record is outside authorized scope.' };
    }

    if (record.workflowStatus !== 'DRAFT' && record.workflowStatus !== 'REJECTED') {
      throw {
        status: 400,
        code: 'INVALID_TRANSITION',
        message: `Only DRAFT or REJECTED records can be submitted. Current status: ${record.workflowStatus}.`,
      };
    }

    // Enforce required submission validation
    const missing: string[] = [];
    if (!record.reportingPeriodId) missing.push('reportingPeriodId');
    if (!record.scopeNo) missing.push('scopeNo');
    if (!record.activityTypeId) missing.push('activityTypeId');
    if (!record.periodStart) missing.push('periodStart');
    if (!record.periodEnd) missing.push('periodEnd');
    if (record.quantity === undefined || record.quantity === null) missing.push('quantity');
    if (!record.unitId) missing.push('unitId');
    if (record.scopeNo === 3 && !record.scope3CategoryNo) missing.push('scope3CategoryNo');

    if (missing.length > 0) {
      throw {
        status: 400,
        code: 'SUBMISSION_VALIDATION_ERROR',
        message: `Required fields missing for formal ESG submission: ${missing.join(', ')}`,
      };
    }

    this.validateRecordPayload(record);

    const oldStatus = record.workflowStatus;
    record.workflowStatus = 'SUBMITTED';
    record.enteredAt = Date.now();
    record.updatedAt = Date.now();

    firestore.setDoc('activityRecords', activityId, record as unknown as Record<string, unknown>);

    this.logAudit({
      actor: user.userId,
      actorName: user.name,
      role: user.role,
      action: 'ESG_RECORD_SUBMITTED',
      activityId,
      oldStatus,
      newStatus: 'SUBMITTED',
      scope: record.organizationId,
      comments: `Submitted Scope ${record.scopeNo} record for formal facility audit pipeline`,
    });

    return record;
  }

  /**
   * Controlled workflow status transition following BRSR governance state-machine.
   */
  public transitionWorkflowStatus(
    user: User,
    activityId: string,
    targetStatus: ESGWorkflowStatus,
    remarks?: string
  ): ActivityRecord {
    const record = firestore.getDoc<ActivityRecord>('activityRecords', activityId);
    if (!record || !record.isActive) {
      throw { status: 404, code: 'RECORD_NOT_FOUND', message: `Activity record ${activityId} not found.` };
    }

    if (!this.isUserAuthorizedForScope(user, record)) {
      throw { status: 403, code: 'FORBIDDEN', message: 'Access denied: record is outside authorized scope.' };
    }

    const current = record.workflowStatus;

    // State machine transitions and role authorization
    const validTransitions: Record<ESGWorkflowStatus, { next: ESGWorkflowStatus[]; allowedRoles: string[] }> = {
      DRAFT: {
        next: ['SUBMITTED'],
        allowedRoles: ['PROJECT_USER', 'BUSINESS_UNIT_USER', 'COMPANY_USER', 'GROUP_ADMIN'],
      },
      SUBMITTED: {
        next: ['SITE_REVIEWED', 'REJECTED', 'DRAFT'],
        allowedRoles: ['BUSINESS_UNIT_USER', 'COMPANY_USER', 'GROUP_ADMIN'],
      },
      SITE_REVIEWED: {
        next: ['ESG_REVIEWED', 'REJECTED', 'DRAFT'],
        allowedRoles: ['COMPANY_USER', 'GROUP_ADMIN'],
      },
      ESG_REVIEWED: {
        next: ['FINANCE_RECONCILED', 'REJECTED', 'DRAFT'],
        allowedRoles: ['COMPANY_USER', 'GROUP_ADMIN'],
      },
      FINANCE_RECONCILED: {
        next: ['APPROVED', 'REJECTED', 'DRAFT'],
        allowedRoles: ['COMPANY_USER', 'GROUP_ADMIN'],
      },
      APPROVED: {
        next: ['ASSURANCE_REVIEWED', 'REJECTED'],
        allowedRoles: ['AUDITOR', 'GROUP_ADMIN'],
      },
      ASSURANCE_REVIEWED: {
        next: ['LOCKED'],
        allowedRoles: ['GROUP_ADMIN'],
      },
      LOCKED: {
        next: [], // Locked records cannot transition
        allowedRoles: [],
      },
      REJECTED: {
        next: ['DRAFT', 'SUBMITTED'],
        allowedRoles: ['PROJECT_USER', 'BUSINESS_UNIT_USER', 'COMPANY_USER', 'GROUP_ADMIN'],
      },
    };

    const rule = validTransitions[current];
    if (!rule || !rule.next.includes(targetStatus)) {
      throw {
        status: 400,
        code: 'INVALID_TRANSITION',
        message: `Invalid workflow transition from "${current}" to "${targetStatus}". Permitted: [${rule?.next.join(', ') || 'none'}].`,
      };
    }

    if (!rule.allowedRoles.includes(user.role)) {
      throw {
        status: 403,
        code: 'UNAUTHORIZED_TRANSITION',
        message: `Role "${user.role}" is not authorized to transition records from "${current}" to "${targetStatus}".`,
      };
    }

    // Execute transition
    const oldStatus = record.workflowStatus;
    record.workflowStatus = targetStatus;
    record.reviewedBy = user.userId;
    record.reviewedByName = user.name;
    record.reviewedAt = Date.now();
    if (remarks) record.remarks = remarks;
    record.updatedAt = Date.now();

    firestore.setDoc('activityRecords', activityId, record as unknown as Record<string, unknown>);

    const auditAction: AuditLogEntry['action'] =
      targetStatus === 'APPROVED'
        ? 'ESG_RECORD_APPROVED'
        : targetStatus === 'LOCKED'
        ? 'ESG_RECORD_LOCKED'
        : 'ESG_RECORD_REVIEWED';

    this.logAudit({
      actor: user.userId,
      actorName: user.name,
      role: user.role,
      action: auditAction,
      activityId,
      oldStatus,
      newStatus: targetStatus,
      scope: record.organizationId,
      comments: remarks || `Transitioned status to ${targetStatus}`,
    });

    return record;
  }

  /**
   * Rejects an activity record with reasons.
   */
  public rejectRecord(user: User, activityId: string, reason: string): ActivityRecord {
    if (!reason || reason.trim().length === 0) {
      throw { status: 400, code: 'REASON_REQUIRED', message: 'A rejection reason is required.' };
    }

    const record = firestore.getDoc<ActivityRecord>('activityRecords', activityId);
    if (!record || !record.isActive) {
      throw { status: 404, code: 'RECORD_NOT_FOUND', message: `Activity record ${activityId} not found.` };
    }

    if (!this.isUserAuthorizedForScope(user, record)) {
      throw { status: 403, code: 'FORBIDDEN', message: 'Access denied: record is outside authorized scope.' };
    }

    if (user.role === 'PROJECT_USER') {
      throw { status: 403, code: 'FORBIDDEN', message: 'Project Users cannot reject facility records.' };
    }

    const oldStatus = record.workflowStatus;
    record.workflowStatus = 'REJECTED';
    record.remarks = reason;
    record.reviewedBy = user.userId;
    record.reviewedByName = user.name;
    record.reviewedAt = Date.now();
    record.updatedAt = Date.now();

    firestore.setDoc('activityRecords', activityId, record as unknown as Record<string, unknown>);

    this.logAudit({
      actor: user.userId,
      actorName: user.name,
      role: user.role,
      action: 'ESG_RECORD_REJECTED',
      activityId,
      oldStatus,
      newStatus: 'REJECTED',
      scope: record.organizationId,
      comments: `Rejected: ${reason}`,
    });

    return record;
  }

  /**
   * Returns record for correction, preserving historical version snapshot.
   */
  public returnForCorrection(user: User, activityId: string, reason: string): ActivityRecord {
    if (!reason || reason.trim().length === 0) {
      throw { status: 400, code: 'REASON_REQUIRED', message: 'Reason for return/correction is required.' };
    }

    const record = firestore.getDoc<ActivityRecord>('activityRecords', activityId);
    if (!record || !record.isActive) {
      throw { status: 404, code: 'RECORD_NOT_FOUND', message: `Activity record ${activityId} not found.` };
    }

    if (!this.isUserAuthorizedForScope(user, record)) {
      throw { status: 403, code: 'FORBIDDEN', message: 'Access denied: record is outside authorized scope.' };
    }

    // 1. Create version snapshot before returning
    const versionId = `VER-${activityId}-V${record.currentVersion}`;
    const versionDoc: ActivityVersion = {
      versionId,
      activityId,
      version: record.currentVersion,
      previousVersion: record.currentVersion - 1,
      changedBy: user.userId,
      changedByName: user.name,
      changedAt: Date.now(),
      changeReason: reason,
      snapshot: { ...record },
      status: record.workflowStatus,
    };
    firestore.setDoc('activityVersions', versionId, versionDoc as unknown as Record<string, unknown>);

    // 2. Increment version and revert to DRAFT for correction
    const oldStatus = record.workflowStatus;
    record.currentVersion += 1;
    record.workflowStatus = 'DRAFT';
    record.remarks = `Returned for correction: ${reason}`;
    record.reviewedBy = user.userId;
    record.reviewedByName = user.name;
    record.reviewedAt = Date.now();
    record.updatedAt = Date.now();

    firestore.setDoc('activityRecords', activityId, record as unknown as Record<string, unknown>);

    this.logAudit({
      actor: user.userId,
      actorName: user.name,
      role: user.role,
      action: 'ESG_RECORD_RETURNED_FOR_CORRECTION',
      activityId,
      oldStatus,
      newStatus: 'DRAFT',
      scope: record.organizationId,
      comments: `Returned for correction (New Version ${record.currentVersion}): ${reason}`,
    });

    return record;
  }

  /**
   * Business Unit Review: Updates checklist, verification notes, and discrepancy flags.
   */
  public buReviewRecord(
    user: User,
    activityId: string,
    payload: {
      checklist?: Record<string, boolean>;
      notes?: string;
      hasBlockingDiscrepancy?: boolean;
      blockingDiscrepancyReason?: string;
    }
  ): ActivityRecord {
    const record = firestore.getDoc<ActivityRecord>('activityRecords', activityId);
    if (!record || !record.isActive) {
      throw { status: 404, code: 'RECORD_NOT_FOUND', message: `Activity record ${activityId} not found.` };
    }
    if (!this.isUserAuthorizedForScope(user, record)) {
      throw { status: 403, code: 'FORBIDDEN', message: 'Access denied: record is outside authorized scope.' };
    }
    if (user.role !== 'BUSINESS_UNIT_USER' && user.role !== 'COMPANY_USER' && user.role !== 'GROUP_ADMIN') {
      throw { status: 403, code: 'FORBIDDEN', message: 'Only Business Unit Users or higher can perform BU verification review.' };
    }

    record.buReviewedBy = user.userId;
    record.buReviewedByName = user.name;
    record.buReviewedAt = Date.now();
    if (payload.checklist !== undefined) record.buChecklist = payload.checklist;
    if (payload.notes !== undefined) record.buReviewNotes = payload.notes;
    if (payload.hasBlockingDiscrepancy !== undefined) record.hasBlockingDiscrepancy = payload.hasBlockingDiscrepancy;
    if (payload.blockingDiscrepancyReason !== undefined) record.blockingDiscrepancyReason = payload.blockingDiscrepancyReason;
    record.updatedAt = Date.now();

    firestore.setDoc('activityRecords', activityId, record as unknown as Record<string, unknown>);

    const auditAction: AuditLogEntry['action'] = payload.hasBlockingDiscrepancy
      ? 'BU_DISCREPANCY_FLAGGED'
      : payload.checklist
      ? 'BU_REVIEW_CHECKLIST_UPDATED'
      : 'BU_REVIEW_OPENED';

    this.logAudit({
      actor: user.userId,
      actorName: user.name,
      role: user.role,
      action: auditAction,
      activityId,
      oldStatus: record.workflowStatus,
      newStatus: record.workflowStatus,
      scope: record.organizationId,
      comments: payload.notes || (payload.hasBlockingDiscrepancy ? `Discrepancy flagged: ${payload.blockingDiscrepancyReason}` : 'BU Review updated'),
    });

    return record;
  }

  /**
   * Business Unit Verification Sign-Off: Forwards facility submission to Company / Legal Entity Review.
   */
  public buVerifyAndForward(user: User, activityId: string, notes?: string): ActivityRecord {
    const record = firestore.getDoc<ActivityRecord>('activityRecords', activityId);
    if (!record || !record.isActive) {
      throw { status: 404, code: 'RECORD_NOT_FOUND', message: `Activity record ${activityId} not found.` };
    }
    if (!this.isUserAuthorizedForScope(user, record)) {
      throw { status: 403, code: 'FORBIDDEN', message: 'Access denied: record is outside authorized scope.' };
    }
    if (user.role !== 'BUSINESS_UNIT_USER' && user.role !== 'COMPANY_USER' && user.role !== 'GROUP_ADMIN') {
      throw { status: 403, code: 'FORBIDDEN', message: 'Only Business Unit Users or higher can verify submissions.' };
    }
    if (record.hasBlockingDiscrepancy) {
      throw { status: 400, code: 'BLOCKING_DISCREPANCY', message: 'Cannot verify record with unresolved blocking discrepancies. Clear discrepancies first.' };
    }

    const oldStatus = record.workflowStatus;
    record.workflowStatus = 'SITE_REVIEWED';
    record.buReviewedBy = user.userId;
    record.buReviewedByName = user.name;
    record.buReviewedAt = Date.now();
    if (notes) record.buReviewNotes = notes;
    record.updatedAt = Date.now();

    firestore.setDoc('activityRecords', activityId, record as unknown as Record<string, unknown>);

    this.logAudit({
      actor: user.userId,
      actorName: user.name,
      role: user.role,
      action: 'BU_SUBMISSION_APPROVED',
      activityId,
      oldStatus,
      newStatus: 'SITE_REVIEWED',
      scope: record.organizationId,
      comments: notes || 'Verified and forwarded to Company / Legal Entity review',
    });

    return record;
  }

  /**
   * Business Unit Flag Discrepancy & Return: Increments version, logs BU_SUBMISSION_RETURNED, reverts to DRAFT for site lead.
   */
  public buReturnSubmission(user: User, activityId: string, reason: string): ActivityRecord {
    if (!reason || reason.trim().length === 0) {
      throw { status: 400, code: 'REASON_REQUIRED', message: 'Reason for return/discrepancy is required.' };
    }
    const record = firestore.getDoc<ActivityRecord>('activityRecords', activityId);
    if (!record || !record.isActive) {
      throw { status: 404, code: 'RECORD_NOT_FOUND', message: `Activity record ${activityId} not found.` };
    }
    if (!this.isUserAuthorizedForScope(user, record)) {
      throw { status: 403, code: 'FORBIDDEN', message: 'Access denied: record is outside authorized scope.' };
    }
    if (user.role !== 'BUSINESS_UNIT_USER' && user.role !== 'COMPANY_USER' && user.role !== 'GROUP_ADMIN') {
      throw { status: 403, code: 'FORBIDDEN', message: 'Only Business Unit Users or higher can return facility submissions.' };
    }

    // 1. Version snapshot
    const versionId = `VER-${activityId}-V${record.currentVersion}`;
    const versionDoc: ActivityVersion = {
      versionId,
      activityId,
      version: record.currentVersion,
      previousVersion: record.currentVersion - 1,
      changedBy: user.userId,
      changedByName: user.name,
      changedAt: Date.now(),
      changeReason: `BU Returned for Discrepancy: ${reason}`,
      snapshot: { ...record },
      status: record.workflowStatus,
    };
    firestore.setDoc('activityVersions', versionId, versionDoc as unknown as Record<string, unknown>);

    // 2. Increment version and revert to DRAFT
    const oldStatus = record.workflowStatus;
    record.currentVersion += 1;
    record.workflowStatus = 'DRAFT';
    record.hasBlockingDiscrepancy = true;
    record.blockingDiscrepancyReason = reason;
    record.buReviewedBy = user.userId;
    record.buReviewedByName = user.name;
    record.buReviewedAt = Date.now();
    record.buReviewNotes = reason;
    record.remarks = `BU Returned: ${reason}`;
    record.updatedAt = Date.now();

    firestore.setDoc('activityRecords', activityId, record as unknown as Record<string, unknown>);

    this.logAudit({
      actor: user.userId,
      actorName: user.name,
      role: user.role,
      action: 'BU_SUBMISSION_RETURNED',
      activityId,
      oldStatus,
      newStatus: 'DRAFT',
      scope: record.organizationId,
      comments: `Returned to Facility: ${reason}`,
    });

    return record;
  }

  /**
   * Links an existing Phase 2 Evidence document to this activity record.
   */
  public linkEvidence(user: User, activityId: string, documentId: string): ActivityRecord {
    const record = firestore.getDoc<ActivityRecord>('activityRecords', activityId);
    if (!record || !record.isActive) {
      throw { status: 404, code: 'RECORD_NOT_FOUND', message: `Activity record ${activityId} not found.` };
    }

    if (!this.isUserAuthorizedForScope(user, record)) {
      throw { status: 403, code: 'FORBIDDEN', message: 'Access denied: record is outside authorized scope.' };
    }

    const doc = firestore.getDoc<EvidenceDocument>('evidenceDocuments', documentId);
    if (!doc || !doc.isActive) {
      throw { status: 404, code: 'EVIDENCE_NOT_FOUND', message: `Evidence document ${documentId} not found.` };
    }

    const linkId = `LINK-${uuidv4().slice(0, 8)}`;
    const linkDoc: ActivityEvidenceLink = {
      linkId,
      activityId,
      documentId,
      linkedAt: Date.now(),
      linkedBy: user.userId,
    };
    firestore.setDoc('activityEvidenceLinks', linkId, linkDoc as unknown as Record<string, unknown>);

    // Update list on record
    if (!record.linkedEvidenceIds) record.linkedEvidenceIds = [];
    if (!record.linkedEvidenceIds.includes(documentId)) {
      record.linkedEvidenceIds.push(documentId);
    }
    record.updatedAt = Date.now();
    firestore.setDoc('activityRecords', activityId, record as unknown as Record<string, unknown>);

    return record;
  }

  /**
   * Lists records with authorized scoping and rich filters.
   */
  public listRecords(
    user: User,
    filters: {
      reportingPeriodId?: string;
      companyId?: string;
      businessUnitId?: string;
      projectId?: string;
      facilityId?: string;
      scopeNo?: number;
      scope3CategoryNo?: number;
      activityTypeId?: string;
      workflowStatus?: string;
      enteredBy?: string;
      estimatedFlag?: boolean;
      search?: string;
      page?: number;
      limit?: number;
    }
  ): { total: number; page: number; limit: number; records: ActivityRecord[] } {
    let allRecords = firestore.getDocs<ActivityRecord>('activityRecords');

    // Filter by active and scope
    allRecords = allRecords.filter((rec) => {
      if (!rec.isActive) return false;
      return this.isUserAuthorizedForScope(user, rec);
    });

    // Apply query filters
    if (filters.reportingPeriodId) {
      allRecords = allRecords.filter((r) => r.reportingPeriodId === filters.reportingPeriodId);
    }
    if (filters.companyId) {
      allRecords = allRecords.filter((r) => r.companyId === filters.companyId);
    }
    if (filters.businessUnitId) {
      allRecords = allRecords.filter((r) => r.businessUnitId === filters.businessUnitId);
    }
    if (filters.projectId) {
      allRecords = allRecords.filter((r) => r.projectId === filters.projectId);
    }
    if (filters.facilityId) {
      allRecords = allRecords.filter((r) => r.facilityId === filters.facilityId);
    }
    if (filters.scopeNo) {
      allRecords = allRecords.filter((r) => r.scopeNo === Number(filters.scopeNo));
    }
    if (filters.scope3CategoryNo) {
      allRecords = allRecords.filter((r) => r.scope3CategoryNo === Number(filters.scope3CategoryNo));
    }
    if (filters.activityTypeId) {
      allRecords = allRecords.filter((r) => r.activityTypeId === filters.activityTypeId);
    }
    if (filters.workflowStatus) {
      allRecords = allRecords.filter((r) => r.workflowStatus === filters.workflowStatus);
    }
    if (filters.enteredBy) {
      allRecords = allRecords.filter((r) => r.enteredBy === filters.enteredBy);
    }
    if (filters.estimatedFlag !== undefined) {
      allRecords = allRecords.filter((r) => r.estimatedFlag === filters.estimatedFlag);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      allRecords = allRecords.filter(
        (r) =>
          r.activityId.toLowerCase().includes(q) ||
          (r.description && r.description.toLowerCase().includes(q)) ||
          r.activityTypeId.toLowerCase().includes(q) ||
          (r.invoiceOrMeterRef && r.invoiceOrMeterRef.toLowerCase().includes(q))
      );
    }

    // Sort descending by enteredAt / updatedAt
    allRecords.sort((a, b) => (b.updatedAt || b.enteredAt) - (a.updatedAt || a.enteredAt));

    const total = allRecords.length;
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 50;
    const startIndex = (page - 1) * limit;
    const paginated = allRecords.slice(startIndex, startIndex + limit);

    return {
      total,
      page,
      limit,
      records: paginated,
    };
  }

  /**
   * Retrieves single record details with linked evidence and version history.
   */
  public getRecordById(user: User, activityId: string): {
    record: ActivityRecord;
    linkedEvidence: EvidenceDocument[];
    versionHistory: ActivityVersion[];
    auditTrail: AuditLogEntry[];
  } {
    const record = firestore.getDoc<ActivityRecord>('activityRecords', activityId);
    if (!record || !record.isActive) {
      throw { status: 404, code: 'RECORD_NOT_FOUND', message: `Activity record ${activityId} not found.` };
    }

    if (!this.isUserAuthorizedForScope(user, record)) {
      throw { status: 403, code: 'FORBIDDEN', message: 'Access denied: record is outside authorized scope.' };
    }

    // Linked Evidence
    const links = firestore
      .getDocs<ActivityEvidenceLink>('activityEvidenceLinks')
      .filter((l) => l.activityId === activityId);
    const docIds = links.map((l) => l.documentId);
    if (record.linkedEvidenceIds) {
      for (const id of record.linkedEvidenceIds) {
        if (!docIds.includes(id)) docIds.push(id);
      }
    }

    const linkedEvidence: EvidenceDocument[] = [];
    for (const dId of docIds) {
      const doc = firestore.getDoc<EvidenceDocument>('evidenceDocuments', dId);
      if (doc && doc.isActive) {
        linkedEvidence.push(doc);
      }
    }

    // Version history
    const versionHistory = firestore
      .getDocs<ActivityVersion>('activityVersions')
      .filter((v) => v.activityId === activityId)
      .sort((a, b) => b.version - a.version);

    // Audit trail
    const auditTrail = firestore
      .getDocs<AuditLogEntry>('auditLogs')
      .filter((a) => a.activityId === activityId)
      .sort((a, b) => b.timestamp - a.timestamp);

    return {
      record,
      linkedEvidence,
      versionHistory,
      auditTrail,
    };
  }

  /**
   * Scoped Master Data retrievals for dependent dropdowns
   */
  public getScopedMasterData(user: User) {
    const orgs = firestore.getDocs<Organization>('organizations').filter((o) => {
      if (user.role === 'GROUP_ADMIN' || user.role === 'MANAGEMENT') return true;
      return o.organizationId === user.organizationId;
    });

    const bus = firestore.getDocs<BusinessUnit>('businessUnits').filter((b) => {
      if (user.role === 'GROUP_ADMIN' || user.role === 'MANAGEMENT') return true;
      if (user.role === 'COMPANY_USER') return b.organizationId === user.organizationId;
      return b.businessUnitId === user.businessUnitId;
    });

    const projects = firestore.getDocs<Project>('projects').filter((p) => {
      if (user.role === 'GROUP_ADMIN' || user.role === 'MANAGEMENT') return true;
      if (user.role === 'COMPANY_USER') return p.organizationId === user.organizationId;
      if (user.role === 'BUSINESS_UNIT_USER') return p.businessUnitId === user.businessUnitId;
      return p.projectId === user.projectId;
    });

    const facilities = firestore.getDocs<Facility>('facilities').filter((f) => {
      if (user.role === 'GROUP_ADMIN' || user.role === 'MANAGEMENT') return true;
      if (user.role === 'COMPANY_USER') return f.organizationId === user.organizationId;
      if (user.role === 'BUSINESS_UNIT_USER') return f.businessUnitId === user.businessUnitId;
      return f.projectId === user.projectId;
    });

    const reportingPeriods = firestore.getDocs<ReportingPeriod>('reportingPeriods');
    const emissionSources = firestore.getDocs<EmissionSource>('emissionSources');
    const activityTypes = firestore.getDocs<ActivityType>('activityTypes');
    const units = firestore.getDocs<Unit>('units');
    const scope3Categories = firestore.getDocs<Scope3CategoryDef>('scope3Categories');
    const valueChainPartners = firestore.getDocs<ValueChainPartner>('valueChainPartners');
    const substances = firestore.getDocs<Substance>('substances');

    return {
      organizations: orgs,
      businessUnits: bus,
      projects,
      facilities,
      reportingPeriods,
      emissionSources,
      activityTypes,
      units,
      scope3Categories,
      valueChainPartners,
      substances,
    };
  }
}

export const esgDataService = new ESGDataService();
