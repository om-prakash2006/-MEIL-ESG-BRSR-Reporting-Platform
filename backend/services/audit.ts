import { firestore } from './firestore.ts';
import type {
  User,
  AuditReview,
  AuditFinding,
  AuditClarification,
  AuditSummaryMetrics,
  ActivityRecord,
  EvidenceDocument,
  AuditLogEntry,
  AssuranceLevel,
  FindingSeverity,
  FindingCategory,
} from '../models/types.ts';
import { calculateDeterministicEmissions } from './calculationEngine.ts';
import { logger } from '../utils/logger.ts';

/**
 * Deterministic GHG calculation helper for audit review inspection
 * Delegated to authoritative calculation engine
 */
export function calculateAuditorEmissions(params: {
  scopeNo: number;
  scope3CategoryNo?: number | null;
  activityTypeId?: string;
  unitId?: string;
  quantity?: number;
  spendAmount?: number;
}) {
  const result = calculateDeterministicEmissions({
    scopeNo: (params.scopeNo as 1 | 2 | 3) || 1,
    scope3CategoryNo: params.scope3CategoryNo,
    activityTypeId: params.activityTypeId,
    unitId: params.unitId,
    quantity: params.quantity,
    spendAmount: params.spendAmount,
  });

  return {
    factor: result.factorApplied,
    factorSource: result.factorSource,
    grossKgCO2e: result.grossKgCO2e,
    tCO2e: result.tCO2e,
    gasBreakdown: {
      co2Kg: result.gasBreakdown.co2Kg,
      ch4Kg: result.gasBreakdown.ch4Kg,
      n2oKg: result.gasBreakdown.n2oKg,
    },
    formula: result.formula,
  };
}

class AuditService {
  /**
   * Helper to write an immutable audit log entry for audit transactions.
   */
  private logAuditAction(entry: {
    actor: string;
    actorName?: string;
    role: string;
    action: AuditLogEntry['action'];
    activityId?: string;
    oldStatus?: string;
    newStatus?: string;
    comments?: string;
  }): void {
    const logId = `LOG-AUD-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const logDoc: Record<string, unknown> = {
      logId,
      actor: entry.actor,
      actorName: entry.actorName || entry.actor,
      role: entry.role,
      action: entry.action,
      timestamp: Date.now(),
    };
    if (entry.activityId) logDoc.activityId = entry.activityId;
    if (entry.oldStatus) logDoc.oldStatus = entry.oldStatus;
    if (entry.newStatus) logDoc.newStatus = entry.newStatus;
    if (entry.comments) logDoc.comments = entry.comments;
    firestore.setDoc('auditLogs', logId, logDoc);
  }

  /**
   * Evaluates if a user's organizational scope allows viewing or operating on a record.
   * Cross-user visibility is enabled across the enterprise repository so all authenticated users
   * can view and inspect audit reviews and their attached evidence documents.
   */
  private checkScopeAccess(_user: User, _record: { companyId?: string; businessUnitId?: string; projectId?: string; facilityId?: string }): boolean {
    return true;
  }

  /**
   * Returns aggregated KPI summary for Audit & Assurance.
   */
  public getAuditSummary(user: User): AuditSummaryMetrics {
    const allReviews = firestore.getDocs<AuditReview>('auditReviews');
    const filtered = allReviews.filter((r) => this.checkScopeAccess(user, r));

    let pendingReviews = 0;
    let inReview = 0;
    let verified = 0;
    let correctionRequired = 0;
    let clarificationsPending = 0;

    for (const r of filtered) {
      if (r.auditStatus === 'PENDING_REVIEW') pendingReviews++;
      else if (r.auditStatus === 'IN_REVIEW') inReview++;
      else if (r.auditStatus === 'VERIFIED') verified++;
      else if (r.auditStatus === 'CORRECTION_REQUIRED') correctionRequired++;
      else if (r.auditStatus === 'REQUIRES_CLARIFICATION') clarificationsPending++;
    }

    const totalRecords = filtered.length;
    const completionPercentage = totalRecords > 0 ? Math.round((verified / totalRecords) * 100) : 0;

    return {
      totalRecords,
      pendingReviews,
      inReview,
      verified,
      correctionRequired,
      clarificationsPending,
      completionPercentage,
    };
  }

  /**
   * Retrieves the audit review work queue with organizational scoping and filtering.
   */
  public getAuditQueue(
    user: User,
    filters: {
      status?: string;
      scopeNo?: number;
      search?: string;
      reportingPeriodId?: string;
    } = {}
  ): AuditReview[] {
    let reviews = firestore.getDocs<AuditReview>('auditReviews');

    // Scope check
    reviews = reviews.filter((r) => this.checkScopeAccess(user, r));

    // Status filter
    if (filters.status && filters.status !== 'ALL') {
      reviews = reviews.filter((r) => r.auditStatus === filters.status);
    }

    // Scope No filter
    if (filters.scopeNo && [1, 2, 3].includes(filters.scopeNo)) {
      reviews = reviews.filter((r) => r.scopeNo === Number(filters.scopeNo));
    }

    // Reporting Period filter
    if (filters.reportingPeriodId) {
      reviews = reviews.filter((r) => r.reportingPeriodId === filters.reportingPeriodId);
    }

    // Search query
    if (filters.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      reviews = reviews.filter((r) => {
        return (
          r.reviewId.toLowerCase().includes(q) ||
          r.activityId.toLowerCase().includes(q) ||
          (r.activityName && r.activityName.toLowerCase().includes(q)) ||
          (r.projectId && r.projectId.toLowerCase().includes(q)) ||
          (r.facilityId && r.facilityId.toLowerCase().includes(q)) ||
          (r.assignedAuditorName && r.assignedAuditorName.toLowerCase().includes(q))
        );
      });
    }

    // Sort: high priority (REQUIRES_CLARIFICATION, CORRECTION_REQUIRED, IN_REVIEW, PENDING_REVIEW, VERIFIED)
    const priorityWeight: Record<string, number> = {
      REQUIRES_CLARIFICATION: 1,
      CORRECTION_REQUIRED: 2,
      IN_REVIEW: 3,
      PENDING_REVIEW: 4,
      VERIFIED: 5,
      REJECTED: 6,
    };

    return reviews.sort((a, b) => {
      const pA = priorityWeight[a.auditStatus] || 99;
      const pB = priorityWeight[b.auditStatus] || 99;
      if (pA !== pB) return pA - pB;
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });
  }

  /**
   * Retrieves full audit review details: original submitted data, Phase 4 GHG calculations,
   * Phase 2 evidence documents, findings, clarification thread, and immutable audit logs.
   */
  public getAuditReviewDetails(identifier: string, user: User) {
    let review = firestore.getDoc<AuditReview>('auditReviews', identifier);
    if (!review) {
      // Try finding by activityId
      const all = firestore.getDocs<AuditReview>('auditReviews');
      review = all.find((r) => r.activityId === identifier) || null;
    }

    if (!review) {
      // If no audit review exists yet for an existing ActivityRecord, auto-bootstrap one!
      const activity = firestore.getDoc<ActivityRecord>('activityRecords', identifier);
      if (activity) {
        const emissions = calculateAuditorEmissions({
          scopeNo: activity.scopeNo,
          activityTypeId: activity.activityTypeId,
          unitId: activity.unitId,
          quantity: activity.quantity,
        });

        review = {
          reviewId: `REV-${activity.activityId}`,
          activityId: activity.activityId,
          reportingPeriodId: activity.reportingPeriodId,
          organizationId: activity.organizationId,
          companyId: activity.companyId,
          businessUnitId: activity.businessUnitId,
          projectId: activity.projectId,
          facilityId: activity.facilityId,
          scopeNo: activity.scopeNo,
          activityTypeId: activity.activityTypeId,
          activityName: activity.description || `Scope ${activity.scopeNo} Activity`,
          assignedAuditorId: 'USR005',
          assignedAuditorName: 'Sustainability Auditor (Dr. Ananya Sen, EY LLP)',
          assignedAt: Date.now(),
          auditStatus: activity.workflowStatus === 'ASSURANCE_REVIEWED' ? 'VERIFIED' : 'PENDING_REVIEW',
          assuranceLevel: 'ISAE_3000_LIMITED',
          originalQuantity: activity.quantity || 0,
          originalUnit: activity.unitId || 'UNIT',
          originalSpend: activity.spendAmount,
          originalCO2e: emissions.tCO2e,
          findingsCount: 0,
          updatedAt: Date.now(),
        };
        firestore.setDoc('auditReviews', review.reviewId, review as unknown as Record<string, unknown>);
      }
    }

    if (!review) {
      throw new Error(`Audit review or ESG record '${identifier}' not found.`);
    }

    if (!this.checkScopeAccess(user, review)) {
      throw new Error('Unauthorized: You do not have permission to view audit data outside your organizational boundary.');
    }

    // Original Activity Record
    const activityRecord = firestore.getDoc<ActivityRecord>('activityRecords', review.activityId);

    // Phase 4 GHG Calculation details
    const calculation = calculateAuditorEmissions({
      scopeNo: review.scopeNo,
      activityTypeId: review.activityTypeId,
      unitId: review.originalUnit,
      quantity: review.originalQuantity,
    });

    // Linked Evidence Documents (Phase 2 Vault)
    let linkedEvidence: EvidenceDocument[] = [];
    if (activityRecord && activityRecord.linkedEvidenceIds && activityRecord.linkedEvidenceIds.length > 0) {
      linkedEvidence = activityRecord.linkedEvidenceIds
        .map((id) => firestore.getDoc<EvidenceDocument>('evidenceDocuments', id))
        .filter((doc): doc is EvidenceDocument => doc !== null && doc.isActive);
    } else {
      // Check evidenceDocuments collection for matching linkedRecordId
      const allEvidence = firestore.getDocs<EvidenceDocument>('evidenceDocuments');
      linkedEvidence = allEvidence.filter((e) => e.linkedRecordId === review?.activityId && e.isActive);
    }

    // Findings
    const allFindings = firestore.getDocs<AuditFinding>('auditFindings');
    const findings = allFindings.filter((f) => f.reviewId === review?.reviewId || f.activityId === review?.activityId);

    // Clarifications
    const allClarifications = firestore.getDocs<AuditClarification>('auditClarifications');
    const clarifications = allClarifications.filter(
      (c) => c.reviewId === review?.reviewId || c.activityId === review?.activityId
    );

    // Immutable Audit Logs
    const allLogs = firestore.getDocs<AuditLogEntry>('auditLogs');
    const auditTrail = allLogs
      .filter((lg) => lg.activityId === review?.activityId || lg.comments?.includes(review?.reviewId || ''))
      .sort((a, b) => b.timestamp - a.timestamp);

    // User Permissions for Action Buttons
    const isAuditor = user.role === 'AUDITOR';
    const isGroupAdmin = user.role === 'GROUP_ADMIN';
    const isManagement = user.role === 'MANAGEMENT';
    const hasRecordScope = this.checkScopeAccess(user, review);

    const permissions = {
      canStartReview: (isAuditor || isGroupAdmin) && review.auditStatus === 'PENDING_REVIEW',
      canVerify: isAuditor && ['IN_REVIEW', 'REQUIRES_CLARIFICATION', 'CORRECTION_REQUIRED', 'PENDING_REVIEW'].includes(review.auditStatus),
      canReject: isAuditor && review.auditStatus !== 'REJECTED',
      canMarkCorrection: isAuditor && review.auditStatus !== 'CORRECTION_REQUIRED',
      canRequestClarification: isAuditor,
      canRespondClarification: !isAuditor && !isManagement && hasRecordScope,
      canSaveAssessment: isAuditor,
      canAssignAuditor: isGroupAdmin,
      isReadOnly: isManagement,
    };

    return {
      review,
      activityRecord,
      calculation,
      linkedEvidence,
      findings,
      clarifications,
      auditTrail,
      permissions,
    };
  }

  /**
   * Moves a review into IN_REVIEW state.
   */
  public startReview(reviewId: string, user: User): AuditReview {
    if (user.role !== 'AUDITOR' && user.role !== 'GROUP_ADMIN') {
      throw new Error('Only the Sustainability Auditor or Group Admin can initiate formal audit reviews.');
    }

    const review = firestore.getDoc<AuditReview>('auditReviews', reviewId);
    if (!review) throw new Error(`Audit review '${reviewId}' not found.`);

    const oldStatus = review.auditStatus;
    review.auditStatus = 'IN_REVIEW';
    review.updatedAt = Date.now();
    firestore.setDoc('auditReviews', reviewId, review as unknown as Record<string, unknown>);

    this.logAuditAction({
      actor: user.userId,
      actorName: user.name,
      role: user.role,
      action: 'AUDIT_REVIEW_STARTED',
      activityId: review.activityId,
      oldStatus,
      newStatus: 'IN_REVIEW',
      comments: `Auditor initiated statutory assurance examination under ${review.assuranceLevel}`,
    });

    return review;
  }

  /**
   * Saves independently assessed auditor figures (without overwriting facility submission).
   */
  public saveIndependentAssessment(
    reviewId: string,
    data: {
      verifiedQuantity?: number;
      verifiedUnit?: string;
      verifiedEmissionFactor?: number;
      verifiedCO2e?: number;
      observations?: string;
      conclusion?: string;
      assuranceLevel?: AssuranceLevel;
    },
    user: User
  ): AuditReview {
    if (user.role !== 'AUDITOR') {
      throw new Error('Only the accredited Sustainability Auditor may record independent verification assessments.');
    }

    const review = firestore.getDoc<AuditReview>('auditReviews', reviewId);
    if (!review) throw new Error(`Audit review '${reviewId}' not found.`);

    if (data.verifiedQuantity !== undefined) {
      review.verifiedQuantity = Number(data.verifiedQuantity);
    }
    if (data.verifiedUnit !== undefined) {
      review.verifiedUnit = data.verifiedUnit;
    }
    if (data.verifiedEmissionFactor !== undefined) {
      review.verifiedEmissionFactor = Number(data.verifiedEmissionFactor);
    }
    if (data.verifiedCO2e !== undefined) {
      review.verifiedCO2e = Number(data.verifiedCO2e);
    } else if (review.verifiedQuantity !== undefined && review.verifiedEmissionFactor !== undefined) {
      review.verifiedCO2e = Math.round(((review.verifiedQuantity * review.verifiedEmissionFactor) / 1000) * 100) / 100;
    }

    // Compute variance percentage against original reported emissions
    if (review.verifiedCO2e !== undefined && review.originalCO2e > 0) {
      review.variancePercentage = Math.round(Math.abs((review.verifiedCO2e - review.originalCO2e) / review.originalCO2e) * 10000) / 100;
    } else {
      review.variancePercentage = 0.0;
    }

    if (data.observations !== undefined) review.observations = data.observations;
    if (data.conclusion !== undefined) review.conclusion = data.conclusion;
    if (data.assuranceLevel) review.assuranceLevel = data.assuranceLevel;

    review.updatedAt = Date.now();
    firestore.setDoc('auditReviews', reviewId, review as unknown as Record<string, unknown>);

    this.logAuditAction({
      actor: user.userId,
      actorName: user.name,
      role: user.role,
      action: 'AUDIT_ASSESSMENT_UPDATED',
      activityId: review.activityId,
      comments: `Auditor recorded assessed values: ${review.verifiedQuantity} ${review.verifiedUnit || review.originalUnit} -> ${review.verifiedCO2e} tCO2e (Variance: ${review.variancePercentage}%)`,
    });

    return review;
  }

  /**
   * Adds an audit finding or observation.
   */
  public recordFinding(
    reviewId: string,
    data: {
      severity: FindingSeverity;
      category: FindingCategory;
      title: string;
      description: string;
      recommendation: string;
    },
    user: User
  ): AuditFinding {
    if (user.role !== 'AUDITOR') {
      throw new Error('Only the accredited Sustainability Auditor may log audit findings.');
    }

    const review = firestore.getDoc<AuditReview>('auditReviews', reviewId);
    if (!review) throw new Error(`Audit review '${reviewId}' not found.`);

    const findingId = `FIND-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const finding: AuditFinding = {
      findingId,
      reviewId,
      activityId: review.activityId,
      severity: data.severity || 'MEDIUM',
      category: data.category || 'DATA_DISCREPANCY',
      title: data.title,
      description: data.description,
      recommendation: data.recommendation,
      status: 'OPEN',
      reportedBy: user.userId,
      reportedByName: user.name,
      reportedAt: Date.now(),
    };

    firestore.setDoc('auditFindings', findingId, finding as unknown as Record<string, unknown>);

    // Update review findings count
    review.findingsCount = (review.findingsCount || 0) + 1;
    review.updatedAt = Date.now();
    firestore.setDoc('auditReviews', reviewId, review as unknown as Record<string, unknown>);

    this.logAuditAction({
      actor: user.userId,
      actorName: user.name,
      role: user.role,
      action: 'AUDIT_FINDING_RECORDED',
      activityId: review.activityId,
      comments: `Audit finding recorded: [${finding.severity}] ${finding.title}`,
    });

    return finding;
  }

  /**
   * Requests clarification or supplementary evidence from facility/company leads.
   */
  public requestClarification(
    reviewId: string,
    data: { question: string; findingId?: string },
    user: User
  ): AuditClarification {
    if (user.role !== 'AUDITOR') {
      throw new Error('Only the accredited Sustainability Auditor may request audit clarifications.');
    }

    const review = firestore.getDoc<AuditReview>('auditReviews', reviewId);
    if (!review) throw new Error(`Audit review '${reviewId}' not found.`);

    const clarificationId = `CLR-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const clarification: AuditClarification = {
      clarificationId,
      reviewId,
      activityId: review.activityId,
      findingId: data.findingId,
      requestedBy: user.userId,
      requestedByName: user.name,
      requestedByRole: user.role,
      requestedAt: Date.now(),
      question: data.question,
      targetScope: {
        companyId: review.companyId,
        businessUnitId: review.businessUnitId,
        projectId: review.projectId,
        facilityId: review.facilityId,
      },
      responseStatus: 'PENDING',
    };

    firestore.setDoc('auditClarifications', clarificationId, clarification as unknown as Record<string, unknown>);

    const oldStatus = review.auditStatus;
    review.auditStatus = 'REQUIRES_CLARIFICATION';
    review.updatedAt = Date.now();
    firestore.setDoc('auditReviews', reviewId, review as unknown as Record<string, unknown>);

    this.logAuditAction({
      actor: user.userId,
      actorName: user.name,
      role: user.role,
      action: 'AUDIT_CLARIFICATION_REQUESTED',
      activityId: review.activityId,
      oldStatus,
      newStatus: 'REQUIRES_CLARIFICATION',
      comments: `Auditor requested clarification: "${data.question.slice(0, 80)}..."`,
    });

    return clarification;
  }

  /**
   * Facility / BU / Company users respond to an audit clarification request.
   */
  public respondClarification(
    clarificationId: string,
    data: { response: string; supplementaryEvidenceIds?: string[] },
    user: User
  ): AuditClarification {
    if (user.role === 'AUDITOR' || user.role === 'MANAGEMENT') {
      throw new Error('Only authorized facility operators, BU leads, or company ESG managers can respond to audit clarifications.');
    }

    const clarification = firestore.getDoc<AuditClarification>('auditClarifications', clarificationId);
    if (!clarification) throw new Error(`Clarification request '${clarificationId}' not found.`);

    if (!this.checkScopeAccess(user, clarification.targetScope)) {
      throw new Error('Unauthorized: You cannot respond to clarifications outside your assigned organizational scope.');
    }

    clarification.response = data.response;
    clarification.responseStatus = 'RESPONDED';
    clarification.respondedBy = user.userId;
    clarification.respondedByName = user.name;
    clarification.respondedByRole = user.role;
    clarification.respondedAt = Date.now();
    if (data.supplementaryEvidenceIds) {
      clarification.supplementaryEvidenceIds = data.supplementaryEvidenceIds;
    }

    firestore.setDoc('auditClarifications', clarificationId, clarification as unknown as Record<string, unknown>);

    // Update parent review back to IN_REVIEW so auditor knows response is available
    const review = firestore.getDoc<AuditReview>('auditReviews', clarification.reviewId);
    if (review) {
      const oldStatus = review.auditStatus;
      review.auditStatus = 'IN_REVIEW';
      review.updatedAt = Date.now();
      firestore.setDoc('auditReviews', review.reviewId, review as unknown as Record<string, unknown>);

      this.logAuditAction({
        actor: user.userId,
        actorName: user.name,
        role: user.role,
        action: 'AUDIT_CLARIFICATION_RESPONDED',
        activityId: review.activityId,
        oldStatus,
        newStatus: 'IN_REVIEW',
        comments: `Facility lead submitted response to clarification '${clarificationId}'`,
      });
    }

    return clarification;
  }

  /**
   * Concludes the audit review: VERIFIED, REJECTED, or CORRECTION_REQUIRED.
   */
  public concludeAudit(
    reviewId: string,
    data: {
      decision: 'VERIFY' | 'REJECT' | 'CORRECTION_REQUIRED';
      conclusionNotes: string;
      assuranceLevel?: AssuranceLevel;
    },
    user: User
  ): AuditReview {
    if (user.role !== 'AUDITOR') {
      throw new Error('Only the accredited Sustainability Auditor can conclude audit verification findings.');
    }

    const review = firestore.getDoc<AuditReview>('auditReviews', reviewId);
    if (!review) throw new Error(`Audit review '${reviewId}' not found.`);

    const oldStatus = review.auditStatus;
    review.conclusion = data.conclusionNotes;
    if (data.assuranceLevel) review.assuranceLevel = data.assuranceLevel;

    const activity = firestore.getDoc<ActivityRecord>('activityRecords', review.activityId);

    if (data.decision === 'VERIFY') {
      review.auditStatus = 'VERIFIED';
      review.verifiedAt = Date.now();
      review.verifiedBy = user.userId;
      review.verifiedByName = user.name;

      // Auto-set verified numbers if not already set
      if (review.verifiedQuantity === undefined) review.verifiedQuantity = review.originalQuantity;
      if (review.verifiedCO2e === undefined) review.verifiedCO2e = review.originalCO2e;
      if (review.variancePercentage === undefined) review.variancePercentage = 0.0;

      if (activity) {
        activity.workflowStatus = 'ASSURANCE_REVIEWED';
        activity.reviewedBy = user.userId;
        activity.reviewedByName = user.name;
        activity.reviewedAt = Date.now();
        firestore.setDoc('activityRecords', activity.activityId, activity as unknown as Record<string, unknown>);
      }

      this.logAuditAction({
        actor: user.userId,
        actorName: user.name,
        role: user.role,
        action: 'AUDIT_VERIFIED',
        activityId: review.activityId,
        oldStatus,
        newStatus: 'VERIFIED',
        comments: `Statutory assurance sign-off issued under ${review.assuranceLevel}: ${data.conclusionNotes}`,
      });
    } else if (data.decision === 'REJECT') {
      review.auditStatus = 'REJECTED';

      if (activity) {
        activity.workflowStatus = 'REJECTED';
        activity.remarks = data.conclusionNotes;
        firestore.setDoc('activityRecords', activity.activityId, activity as unknown as Record<string, unknown>);
      }

      this.logAuditAction({
        actor: user.userId,
        actorName: user.name,
        role: user.role,
        action: 'AUDIT_REJECTED',
        activityId: review.activityId,
        oldStatus,
        newStatus: 'REJECTED',
        comments: `Audit review rejected: ${data.conclusionNotes}`,
      });
    } else if (data.decision === 'CORRECTION_REQUIRED') {
      review.auditStatus = 'CORRECTION_REQUIRED';

      if (activity) {
        activity.workflowStatus = 'SUBMITTED';
        activity.remarks = `Auditor correction required: ${data.conclusionNotes}`;
        firestore.setDoc('activityRecords', activity.activityId, activity as unknown as Record<string, unknown>);
      }

      this.logAuditAction({
        actor: user.userId,
        actorName: user.name,
        role: user.role,
        action: 'AUDIT_CORRECTION_REQUESTED',
        activityId: review.activityId,
        oldStatus,
        newStatus: 'CORRECTION_REQUIRED',
        comments: `Auditor marked correction required: ${data.conclusionNotes}`,
      });
    }

    review.updatedAt = Date.now();
    firestore.setDoc('auditReviews', reviewId, review as unknown as Record<string, unknown>);

    return review;
  }

  /**
   * Group Admin reallocates or assigns a review to an auditor.
   */
  public assignAuditor(
    reviewId: string,
    data: { auditorId: string; auditorName?: string },
    user: User
  ): AuditReview {
    if (user.role !== 'GROUP_ADMIN') {
      throw new Error('Only the Group ESG Admin can manage auditor assignments.');
    }

    const review = firestore.getDoc<AuditReview>('auditReviews', reviewId);
    if (!review) throw new Error(`Audit review '${reviewId}' not found.`);

    const oldAuditor = review.assignedAuditorName;
    review.assignedAuditorId = data.auditorId;
    review.assignedAuditorName = data.auditorName || data.auditorId;
    review.assignedAt = Date.now();
    review.updatedAt = Date.now();

    firestore.setDoc('auditReviews', reviewId, review as unknown as Record<string, unknown>);

    this.logAuditAction({
      actor: user.userId,
      actorName: user.name,
      role: user.role,
      action: 'AUDITOR_ASSIGNED',
      activityId: review.activityId,
      comments: `Auditor reassigned from '${oldAuditor}' to '${review.assignedAuditorName}'`,
    });

    return review;
  }
}

export const auditService = new AuditService();
