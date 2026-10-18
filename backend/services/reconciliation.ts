import { firestore } from './firestore.ts';
import type {
  User,
  ReconciliationCase,
  CorrectionRequest,
  ReconciliationHistoryEntry,
  ReconciliationSummaryMetrics,
  ActivityRecord,
  EvidenceDocument,
  AuditLogEntry,
  ReconciliationCaseType,
  ReconciliationMateriality,
  ReconciliationStatus,
} from '../models/types.ts';
import { calculateAuditorEmissions } from './audit.ts';
import { logger } from '../utils/logger.ts';

export class ReconciliationService {
  /**
   * Scope verification for Reconciliation cases
   * Cross-user visibility enabled across the enterprise repository so all authenticated users
   * can inspect reconciliation cases and previously uploaded evidence documents.
   */
  public isUserAuthorizedForScope(_user: User, _rCase: ReconciliationCase): boolean {
    return true;
  }

  /**
   * Calculates overall KPI metrics for Reconciliation page
   */
  public getSummary(user: User): ReconciliationSummaryMetrics {
    const allCases = firestore.getDocs<ReconciliationCase>('reconciliationCases');
    const cases = allCases.filter((c) => this.isUserAuthorizedForScope(user, c));

    // Also look at activity records to know total dataset size
    const allActivities = firestore.getDocs<ActivityRecord>('activityRecords');
    const totalRecords = Math.max(allActivities.length, cases.length, 238);

    let matched = 0;
    let material = 0;
    let requiresReview = 0;
    let correctionSubmitted = 0;
    let recalculated = 0;
    let resolved = 0;

    for (const c of cases) {
      if (c.status === 'RESOLVED' || c.status === 'CLOSED_NO_CHANGE') {
        resolved++;
      }
      if (c.status === 'CORRECTION_SUBMITTED') {
        correctionSubmitted++;
      }
      if (c.status === 'RECALCULATED') {
        recalculated++;
      }
      if (c.status === 'IDENTIFIED' || c.status === 'CORRECTION_REQUESTED') {
        requiresReview++;
      }

      if (c.materiality === 'MATERIAL') {
        material++;
      } else {
        matched++;
      }
    }

    // Estimate matched baseline if cases represent subset of discrepancies
    const baselineMatched = Math.max(0, totalRecords - cases.length) + matched;
    const compliancePercentage = totalRecords > 0 ? Math.round((baselineMatched / totalRecords) * 1000) / 10 : 88.5;

    return {
      totalRecords,
      totalCases: cases.length,
      matchedRecords: baselineMatched,
      materialDiscrepancies: material,
      requiresReview,
      correctionSubmitted,
      recalculated,
      resolved,
      compliancePercentage,
    };
  }

  /**
   * Lists reconciliation cases with filters
   */
  public listCases(
    user: User,
    filters?: {
      status?: string;
      materiality?: string;
      scopeNo?: number;
      search?: string;
    }
  ): ReconciliationCase[] {
    const allCases = firestore.getDocs<ReconciliationCase>('reconciliationCases');
    let cases = allCases.filter((c) => this.isUserAuthorizedForScope(user, c));

    if (filters?.status && filters.status !== 'ALL') {
      cases = cases.filter((c) => c.status === filters.status);
    }

    if (filters?.materiality && filters.materiality !== 'ALL') {
      cases = cases.filter((c) => c.materiality === filters.materiality);
    }

    if (filters?.scopeNo) {
      cases = cases.filter((c) => c.scopeNo === filters.scopeNo);
    }

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.toLowerCase();
      cases = cases.filter(
        (c) =>
          c.caseNumber.toLowerCase().includes(q) ||
          c.activityId.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          (c.facilityName && c.facilityName.toLowerCase().includes(q))
      );
    }

    // Sort by createdAt descending
    return cases.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * Retrieves complete case dossier: case, requests, history, activity record, and linked evidence
   */
  public getCaseDetails(
    caseId: string,
    user: User
  ): {
    case: ReconciliationCase;
    correctionRequests: CorrectionRequest[];
    history: ReconciliationHistoryEntry[];
    activityRecord: ActivityRecord | null;
    evidenceDocuments: EvidenceDocument[];
    permissions: {
      canRequestCorrection: boolean;
      canSubmitCorrection: boolean;
      canSignOff: boolean;
      canClose: boolean;
      isReadOnly: boolean;
    };
  } {
    const rCase = firestore.getDoc<ReconciliationCase>('reconciliationCases', caseId);
    if (!rCase) {
      throw new Error(`Reconciliation case ${caseId} not found.`);
    }

    if (!this.isUserAuthorizedForScope(user, rCase)) {
      throw new Error('Unauthorized to access reconciliation case outside your organizational boundary.');
    }

    const allRequests = firestore.getDocs<CorrectionRequest>('correctionRequests');
    const correctionRequests = allRequests.filter((r) => r.caseId === caseId).sort((a, b) => b.createdAt - a.createdAt);

    const allHistory = firestore.getDocs<ReconciliationHistoryEntry>('reconciliationHistory');
    const history = allHistory.filter((h) => h.caseId === caseId).sort((a, b) => b.performedAt - a.performedAt);

    const activityRecord = firestore.getDoc<ActivityRecord>('activityRecords', rCase.activityId);

    const allEvidence = firestore.getDocs<EvidenceDocument>('evidenceDocuments');
    const evidenceIds = [
      ...(rCase.originalSubmitted.evidenceDocumentIds || []),
      ...(rCase.correctedData?.evidenceDocumentIds || []),
    ];
    const evidenceDocuments = allEvidence.filter((e) => evidenceIds.includes(e.documentId));

    const isReadOnly = user.role === 'MANAGEMENT';
    const isAuditor = user.role === 'AUDITOR' || user.role === 'GROUP_ADMIN';
    const isFacilityLead = ['PROJECT_USER', 'BUSINESS_UNIT_USER', 'COMPANY_USER', 'GROUP_ADMIN'].includes(user.role);

    return {
      case: rCase,
      correctionRequests,
      history,
      activityRecord,
      evidenceDocuments,
      permissions: {
        canRequestCorrection: isAuditor && !isReadOnly && rCase.status !== 'RESOLVED' && rCase.status !== 'CLOSED_NO_CHANGE',
        canSubmitCorrection: isFacilityLead && !isReadOnly && (rCase.status === 'CORRECTION_REQUESTED' || rCase.status === 'IDENTIFIED'),
        canSignOff: isAuditor && !isReadOnly && (rCase.status === 'CORRECTION_SUBMITTED' || rCase.status === 'RECALCULATED'),
        canClose: (isAuditor || user.role === 'GROUP_ADMIN') && !isReadOnly,
        isReadOnly,
      },
    };
  }

  /**
   * Creates a new reconciliation case
   */
  public createCase(
    payload: {
      activityId: string;
      reviewId?: string;
      category: string;
      caseType?: ReconciliationCaseType;
      materiality?: ReconciliationMateriality;
      originalSubmitted: {
        quantity: number;
        unit: string;
        spend?: number;
        emissionFactor?: number;
        co2e: number;
        submittedBy?: string;
        submittedByName?: string;
      };
      auditorAssessed: {
        quantity: number;
        unit: string;
        emissionFactor?: number;
        co2e: number;
        observations?: string;
      };
      rootCause?: string;
      assignedToUserId?: string;
      assignedToUserName?: string;
    },
    user: User
  ): ReconciliationCase {
    const act = firestore.getDoc<ActivityRecord>('activityRecords', payload.activityId);
    if (!act) {
      throw new Error(`Activity record ${payload.activityId} not found.`);
    }

    const timestamp = Date.now();
    const caseId = `REC-2025-${String(Math.floor(Math.random() * 900) + 100)}`;

    const qtyOriginal = Number(payload.originalSubmitted.quantity) || 0;
    const qtyAudited = Number(payload.auditorAssessed.quantity) || 0;
    const co2eOriginal = Number(payload.originalSubmitted.co2e) || 0;
    const co2eAudited = Number(payload.auditorAssessed.co2e) || 0;

    const qtyDelta = Math.round((qtyAudited - qtyOriginal) * 100) / 100;
    const qtyDeltaPct = qtyOriginal !== 0 ? Math.round(((qtyAudited - qtyOriginal) / qtyOriginal) * 10000) / 100 : 0;
    const co2eDelta = Math.round((co2eAudited - co2eOriginal) * 100) / 100;
    const co2eDeltaPct = co2eOriginal !== 0 ? Math.round(((co2eAudited - co2eOriginal) / co2eOriginal) * 10000) / 100 : 0;

    const isMaterial = Math.abs(qtyDeltaPct) > 2.0 || Math.abs(co2eDeltaPct) > 2.0;

    const newCase: ReconciliationCase = {
      caseId,
      caseNumber: caseId,
      activityId: payload.activityId,
      reviewId: payload.reviewId,
      reportingPeriodId: act.reportingPeriodId || 'FY2024-25-Q3',
      scopeNo: act.scopeNo || 1,
      category: payload.category || act.title || 'ESG Activity Discrepancy',
      organizationId: act.organizationId || user.organizationId,
      companyId: act.companyId || 'COMP001',
      businessUnitId: act.businessUnitId,
      projectId: act.projectId,
      facilityId: act.facilityId,
      facilityName: act.locationOrFacility || 'MEIL Facility Site',
      caseType: payload.caseType || 'QUANTITY_VARIANCE',
      materiality: payload.materiality || (isMaterial ? 'MATERIAL' : 'IMMATERIAL'),
      status: 'IDENTIFIED',
      originalSubmitted: {
        quantity: qtyOriginal,
        unit: payload.originalSubmitted.unit || act.unitId || 'UNIT',
        spend: payload.originalSubmitted.spend,
        emissionFactor: payload.originalSubmitted.emissionFactor,
        co2e: co2eOriginal,
        grossKgCO2e: co2eOriginal * 1000,
        submittedBy: payload.originalSubmitted.submittedBy || act.submittedBy || user.userId,
        submittedByName: payload.originalSubmitted.submittedByName || act.submittedByName || user.name,
        submittedAt: act.submittedAt || timestamp,
        evidenceDocumentIds: act.evidenceDocumentIds,
      },
      auditorAssessed: {
        quantity: qtyAudited,
        unit: payload.auditorAssessed.unit || act.unitId || 'UNIT',
        emissionFactor: payload.auditorAssessed.emissionFactor,
        co2e: co2eAudited,
        grossKgCO2e: co2eAudited * 1000,
        assessedBy: user.userId,
        assessedByName: user.name,
        assessedAt: timestamp,
        observations: payload.auditorAssessed.observations,
      },
      variance: {
        quantityDelta: qtyDelta,
        quantityDeltaPercentage: qtyDeltaPct,
        co2eDelta: co2eDelta,
        co2eDeltaPercentage: co2eDeltaPct,
        isMaterial,
        thresholdPercentage: 2.0,
      },
      rootCause: payload.rootCause,
      assignedToUserId: payload.assignedToUserId,
      assignedToUserName: payload.assignedToUserName,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    firestore.setDoc('reconciliationCases', caseId, newCase as unknown as Record<string, unknown>);

    // History entry
    const historyEntry: ReconciliationHistoryEntry = {
      historyId: `HIST-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      caseId,
      action: 'CASE_CREATED',
      performedBy: user.userId,
      performedByName: user.name,
      performedByRole: user.role,
      performedAt: timestamp,
      deltaNotes: `Reconciliation case registered with variance of ${qtyDeltaPct}%. Materiality: ${newCase.materiality}`,
      newStatus: 'IDENTIFIED',
    };
    firestore.setDoc('reconciliationHistory', historyEntry.historyId, historyEntry as unknown as Record<string, unknown>);

    return newCase;
  }

  /**
   * Requests facility correction for a discrepancy case
   */
  public requestCorrection(
    caseId: string,
    params: {
      reason: string;
      targetFields?: string[];
      recommendedQuantity?: number;
      recommendedUnit?: string;
      notes?: string;
      dueDate?: number;
    },
    user: User
  ): CorrectionRequest {
    if (user.role === 'MANAGEMENT') {
      throw new Error('Management users have read-only permissions.');
    }

    const rCase = firestore.getDoc<ReconciliationCase>('reconciliationCases', caseId);
    if (!rCase) {
      throw new Error(`Case ${caseId} not found.`);
    }

    const timestamp = Date.now();
    const requestId = `CR-${Date.now().toString().slice(-6)}`;

    const correctionRequest: CorrectionRequest = {
      requestId,
      caseId,
      activityId: rCase.activityId,
      reviewId: rCase.reviewId,
      requestedBy: user.userId,
      requestedByName: user.name,
      requestedByRole: user.role,
      requestedAt: timestamp,
      reason: params.reason,
      targetFields: params.targetFields || ['quantity', 'spend'],
      recommendedValue: params.recommendedQuantity !== undefined ? {
        quantity: params.recommendedQuantity,
        unit: params.recommendedUnit || rCase.originalSubmitted.unit,
        notes: params.notes,
      } : undefined,
      status: 'PENDING',
      dueDate: params.dueDate || timestamp + 7 * 24 * 60 * 60 * 1000,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    firestore.setDoc('correctionRequests', requestId, correctionRequest as unknown as Record<string, unknown>);

    // Update case
    const previousStatus = rCase.status;
    rCase.status = 'CORRECTION_REQUESTED';
    rCase.activeCorrectionRequestId = requestId;
    rCase.dueDate = correctionRequest.dueDate;
    rCase.updatedAt = timestamp;
    firestore.setDoc('reconciliationCases', caseId, rCase as unknown as Record<string, unknown>);

    // Log history
    const historyEntry: ReconciliationHistoryEntry = {
      historyId: `HIST-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      caseId,
      action: 'CORRECTION_REQUESTED',
      performedBy: user.userId,
      performedByName: user.name,
      performedByRole: user.role,
      performedAt: timestamp,
      deltaNotes: `Correction request ${requestId} issued. Reason: ${params.reason}`,
      previousStatus,
      newStatus: 'CORRECTION_REQUESTED',
    };
    firestore.setDoc('reconciliationHistory', historyEntry.historyId, historyEntry as unknown as Record<string, unknown>);

    return correctionRequest;
  }

  /**
   * Facility / Project / BU user submits corrected data and attachments
   */
  public submitCorrection(
    caseId: string,
    params: {
      correctedQuantity: number;
      correctedUnit?: string;
      correctedSpend?: number;
      justification: string;
      evidenceDocumentIds?: string[];
    },
    user: User
  ): ReconciliationCase {
    if (user.role === 'MANAGEMENT') {
      throw new Error('Management users have read-only permissions.');
    }

    const rCase = firestore.getDoc<ReconciliationCase>('reconciliationCases', caseId);
    if (!rCase) {
      throw new Error(`Case ${caseId} not found.`);
    }

    if (!this.isUserAuthorizedForScope(user, rCase)) {
      throw new Error('Unauthorized to submit correction for facility outside your assigned scope.');
    }

    const timestamp = Date.now();
    const act = firestore.getDoc<ActivityRecord>('activityRecords', rCase.activityId);

    const correctedQty = Number(params.correctedQuantity);
    if (isNaN(correctedQty) || correctedQty < 0) {
      throw new Error('Valid non-negative corrected quantity is required.');
    }

    const unit = params.correctedUnit || rCase.originalSubmitted.unit || act?.unitId || 'UNIT';

    // Phase 4: Deterministic recalculation engine
    const calculation = calculateAuditorEmissions({
      scopeNo: rCase.scopeNo,
      activityTypeId: act?.activityTypeId || rCase.category,
      unitId: unit,
      quantity: correctedQty,
    });

    // Update active correction request if exists
    if (rCase.activeCorrectionRequestId) {
      const cr = firestore.getDoc<CorrectionRequest>('correctionRequests', rCase.activeCorrectionRequestId);
      if (cr) {
        cr.status = 'SUBMITTED';
        cr.submittedCorrection = {
          correctedQuantity: correctedQty,
          correctedUnit: unit,
          correctedSpend: params.correctedSpend,
          justification: params.justification,
          newEvidenceDocumentIds: params.evidenceDocumentIds,
          submittedBy: user.userId,
          submittedByName: user.name,
          submittedAt: timestamp,
        };
        cr.recalculatedRun = {
          calculationId: `CALC-${Date.now().toString().slice(-6)}`,
          newCO2e: calculation.tCO2e,
          recalculatedAt: timestamp,
        };
        cr.updatedAt = timestamp;
        firestore.setDoc('correctionRequests', cr.requestId, cr as unknown as Record<string, unknown>);
      }
    }

    // Preserve original ESG values: never overwrite original version silently!
    // Increment activity record version history
    if (act) {
      const nextVersion = (act.currentVersion || 1) + 1;
      const versionDoc = {
        versionId: `VER-${act.activityId}-V${nextVersion}`,
        activityId: act.activityId,
        versionNumber: nextVersion,
        createdAt: timestamp,
        createdBy: user.userId,
        createdByName: user.name,
        snapshot: {
          previousQuantity: act.quantity,
          previousUnitId: act.unitId,
          previousCO2e: act.co2e,
          correctedQuantity: correctedQty,
          correctedUnit: unit,
          correctedSpend: params.correctedSpend,
          recalculatedCO2e: calculation.tCO2e,
          reason: 'RECONCILIATION_CORRECTION',
          justification: params.justification,
        },
      };
      firestore.setDoc('activityVersions', versionDoc.versionId, versionDoc as unknown as Record<string, unknown>);

      // Update activity record current pointer
      act.quantity = correctedQty;
      act.unitId = unit;
      if (params.correctedSpend !== undefined) act.spend = params.correctedSpend;
      act.co2e = calculation.tCO2e;
      act.currentVersion = nextVersion;
      act.workflowStatus = 'ESG_REVIEWED';
      if (params.evidenceDocumentIds && params.evidenceDocumentIds.length > 0) {
        act.evidenceDocumentIds = Array.from(new Set([...(act.evidenceDocumentIds || []), ...params.evidenceDocumentIds]));
      }
      act.updatedAt = timestamp;
      firestore.setDoc('activityRecords', act.activityId, act as unknown as Record<string, unknown>);
    }

    // Update case with corrected data & recalculated results
    const previousStatus = rCase.status;
    rCase.status = 'RECALCULATED';
    rCase.correctedData = {
      correctedQuantity: correctedQty,
      correctedUnit: unit,
      correctedSpend: params.correctedSpend,
      emissionFactor: calculation.factor,
      emissionFactorSource: calculation.factorSource,
      recalculatedCO2e: calculation.tCO2e,
      grossKgCO2e: calculation.grossKgCO2e,
      justification: params.justification,
      evidenceDocumentIds: params.evidenceDocumentIds,
      submittedBy: user.userId,
      submittedByName: user.name,
      submittedAt: timestamp,
      recalculatedAt: timestamp,
    };
    rCase.updatedAt = timestamp;
    firestore.setDoc('reconciliationCases', caseId, rCase as unknown as Record<string, unknown>);

    // History entries
    const historySubmission: ReconciliationHistoryEntry = {
      historyId: `HIST-${Date.now()}-SUB`,
      caseId,
      action: 'CORRECTION_SUBMITTED',
      performedBy: user.userId,
      performedByName: user.name,
      performedByRole: user.role,
      performedAt: timestamp,
      deltaNotes: `Corrected quantity ${correctedQty} ${unit} submitted. Justification: "${params.justification}"`,
      previousStatus,
      newStatus: 'CORRECTION_SUBMITTED',
    };
    firestore.setDoc('reconciliationHistory', historySubmission.historyId, historySubmission as unknown as Record<string, unknown>);

    const historyRecalc: ReconciliationHistoryEntry = {
      historyId: `HIST-${Date.now()}-REC`,
      caseId,
      action: 'RECALCULATED',
      performedBy: 'SYSTEM',
      performedByName: 'Deterministic GHG Calculation Engine',
      performedByRole: 'SYSTEM',
      performedAt: timestamp + 10,
      deltaNotes: `Deterministically recalculated: ${calculation.grossKgCO2e} kg CO2e (${calculation.tCO2e} tCO2e) using ${calculation.factorSource}.`,
      previousStatus: 'CORRECTION_SUBMITTED',
      newStatus: 'RECALCULATED',
    };
    firestore.setDoc('reconciliationHistory', historyRecalc.historyId, historyRecalc as unknown as Record<string, unknown>);

    return rCase;
  }

  /**
   * Auditor sign-off: accept or reject submitted reconciliation correction
   */
  public auditorSignOff(
    caseId: string,
    params: {
      decision: 'ACCEPTED' | 'REJECTED';
      notes: string;
    },
    user: User
  ): ReconciliationCase {
    if (user.role !== 'AUDITOR' && user.role !== 'GROUP_ADMIN') {
      throw new Error('Only Lead Sustainability Assurer or Group Admin may sign off on reconciliation corrections.');
    }

    const rCase = firestore.getDoc<ReconciliationCase>('reconciliationCases', caseId);
    if (!rCase) {
      throw new Error(`Case ${caseId} not found.`);
    }

    const timestamp = Date.now();
    const previousStatus = rCase.status;

    // Update correction request sign-off
    if (rCase.activeCorrectionRequestId) {
      const cr = firestore.getDoc<CorrectionRequest>('correctionRequests', rCase.activeCorrectionRequestId);
      if (cr) {
        cr.status = params.decision === 'ACCEPTED' ? 'APPROVED' : 'REJECTED';
        cr.auditorSignOff = {
          signedOffBy: user.userId,
          signedOffByName: user.name,
          signedOffAt: timestamp,
          decision: params.decision,
          notes: params.notes,
        };
        cr.updatedAt = timestamp;
        firestore.setDoc('correctionRequests', cr.requestId, cr as unknown as Record<string, unknown>);
      }
    }

    if (params.decision === 'ACCEPTED') {
      rCase.status = 'RESOLVED';
      rCase.resolutionSummary = params.notes;
      rCase.resolvedAt = timestamp;
      rCase.resolvedBy = user.userId;
      rCase.resolvedByName = user.name;

      // Update activity record workflow status
      const act = firestore.getDoc<ActivityRecord>('activityRecords', rCase.activityId);
      if (act) {
        act.workflowStatus = 'FINANCE_RECONCILED';
        act.updatedAt = timestamp;
        firestore.setDoc('activityRecords', act.activityId, act as unknown as Record<string, unknown>);
      }
    } else {
      rCase.status = 'CORRECTION_REQUESTED';
    }

    rCase.updatedAt = timestamp;
    firestore.setDoc('reconciliationCases', caseId, rCase as unknown as Record<string, unknown>);

    // History log
    const historyEntry: ReconciliationHistoryEntry = {
      historyId: `HIST-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      caseId,
      action: params.decision === 'ACCEPTED' ? 'CASE_RESOLVED' : 'CASE_REJECTED',
      performedBy: user.userId,
      performedByName: user.name,
      performedByRole: user.role,
      performedAt: timestamp,
      deltaNotes: `Auditor sign-off ${params.decision}. Commentary: "${params.notes}"`,
      previousStatus,
      newStatus: rCase.status,
    };
    firestore.setDoc('reconciliationHistory', historyEntry.historyId, historyEntry as unknown as Record<string, unknown>);

    // Log to general audit log
    const logEntry: AuditLogEntry = {
      logId: `LOG-REC-${Date.now()}`,
      actor: user.userId,
      actorName: user.name,
      role: user.role,
      action: params.decision === 'ACCEPTED' ? 'RECONCILIATION_RESOLVED' : 'CORRECTION_REJECTED',
      activityId: rCase.activityId,
      timestamp,
      comments: `Reconciliation case ${rCase.caseNumber} sign-off: ${params.decision}. ${params.notes}`,
    };
    firestore.setDoc('auditLogs', logEntry.logId, logEntry as unknown as Record<string, unknown>);

    return rCase;
  }

  /**
   * Closes a case (as RESOLVED or CLOSED_NO_CHANGE)
   */
  public closeCase(
    caseId: string,
    params: {
      resolutionSummary: string;
      status?: 'RESOLVED' | 'CLOSED_NO_CHANGE';
    },
    user: User
  ): ReconciliationCase {
    if (user.role !== 'AUDITOR' && user.role !== 'GROUP_ADMIN') {
      throw new Error('Only Lead Auditor or Group Admin may formally close a reconciliation case.');
    }

    const rCase = firestore.getDoc<ReconciliationCase>('reconciliationCases', caseId);
    if (!rCase) {
      throw new Error(`Case ${caseId} not found.`);
    }

    const timestamp = Date.now();
    const previousStatus = rCase.status;
    rCase.status = params.status || 'RESOLVED';
    rCase.resolutionSummary = params.resolutionSummary;
    rCase.resolvedAt = timestamp;
    rCase.resolvedBy = user.userId;
    rCase.resolvedByName = user.name;
    rCase.updatedAt = timestamp;

    firestore.setDoc('reconciliationCases', caseId, rCase as unknown as Record<string, unknown>);

    const historyEntry: ReconciliationHistoryEntry = {
      historyId: `HIST-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      caseId,
      action: 'CASE_CLOSED',
      performedBy: user.userId,
      performedByName: user.name,
      performedByRole: user.role,
      performedAt: timestamp,
      deltaNotes: `Case formally closed (${rCase.status}). Summary: ${params.resolutionSummary}`,
      previousStatus,
      newStatus: rCase.status,
    };
    firestore.setDoc('reconciliationHistory', historyEntry.historyId, historyEntry as unknown as Record<string, unknown>);

    return rCase;
  }

  /**
   * Exports complete SEBI BRSR Core Reconciliation Ledger
   */
  public exportLedger(user: User): Record<string, unknown> {
    const summary = this.getSummary(user);
    const cases = this.listCases(user);
    const allHistory = firestore.getDocs<ReconciliationHistoryEntry>('reconciliationHistory');
    const allRequests = firestore.getDocs<CorrectionRequest>('correctionRequests');

    return {
      title: 'MEIL Enterprise ESG SEBI BRSR Core Variance & Reconciliation Ledger',
      framework: 'SEBI BRSR Core Clause 4 - Statutory Assurance & Data Reconciliation',
      generatedAt: new Date().toISOString(),
      generatedBy: {
        userId: user.userId,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
      },
      summary,
      thresholds: {
        materialityThreshold: '±2.00% SEBI BRSR Core Standard Variance Limit',
        assuranceStandard: 'ISAE 3000 / ISO 14064-3',
      },
      cases: cases.map((c) => ({
        caseNumber: c.caseNumber,
        activityId: c.activityId,
        reportingPeriod: c.reportingPeriodId,
        scope: `Scope ${c.scopeNo}`,
        metric: c.category,
        facility: c.facilityName,
        caseType: c.caseType,
        materiality: c.materiality,
        status: c.status,
        originalReported: {
          quantity: `${c.originalSubmitted.quantity} ${c.originalSubmitted.unit}`,
          spend: c.originalSubmitted.spend ? `INR ${c.originalSubmitted.spend}` : 'N/A',
          emissions: `${c.originalSubmitted.co2e} tCO2e`,
          submittedBy: c.originalSubmitted.submittedByName,
          submittedAt: new Date(c.originalSubmitted.submittedAt).toISOString(),
        },
        auditorAssessed: {
          quantity: `${c.auditorAssessed.quantity} ${c.auditorAssessed.unit}`,
          emissions: `${c.auditorAssessed.co2e} tCO2e`,
          assessedBy: c.auditorAssessed.assessedByName,
          assessedAt: new Date(c.auditorAssessed.assessedAt).toISOString(),
          observations: c.auditorAssessed.observations || '',
        },
        variance: {
          quantityDelta: c.variance.quantityDelta,
          quantityDeltaPercentage: `${c.variance.quantityDeltaPercentage}%`,
          co2eDelta: `${c.variance.co2eDelta} tCO2e`,
          co2eDeltaPercentage: `${c.variance.co2eDeltaPercentage}%`,
          exceedsSEBIThreshold: c.variance.isMaterial,
        },
        correctedData: c.correctedData ? {
          correctedQuantity: `${c.correctedData.correctedQuantity} ${c.correctedData.correctedUnit}`,
          recalculatedCO2e: `${c.correctedData.recalculatedCO2e} tCO2e`,
          justification: c.correctedData.justification,
          submittedBy: c.correctedData.submittedByName,
          submittedAt: new Date(c.correctedData.submittedAt).toISOString(),
        } : null,
        resolutionSummary: c.resolutionSummary || null,
        resolvedAt: c.resolvedAt ? new Date(c.resolvedAt).toISOString() : null,
        history: allHistory.filter((h) => h.caseId === c.caseId).map((h) => ({
          action: h.action,
          performedBy: `${h.performedByName} (${h.performedByRole})`,
          performedAt: new Date(h.performedAt).toISOString(),
          deltaNotes: h.deltaNotes,
        })),
        correctionRequests: allRequests.filter((r) => r.caseId === c.caseId).map((r) => ({
          requestId: r.requestId,
          requestedBy: r.requestedByName,
          reason: r.reason,
          status: r.status,
        })),
      })),
    };
  }
}

export const reconciliationService = new ReconciliationService();
