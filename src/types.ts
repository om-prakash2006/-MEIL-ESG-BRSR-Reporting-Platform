export type UserRole =
  | 'PROJECT_USER'
  | 'BUSINESS_UNIT_USER'
  | 'COMPANY_USER'
  | 'GROUP_ADMIN'
  | 'AUDITOR'
  | 'MANAGEMENT';

export type Permission = string;

export interface AuthUser {
  userId: string;
  employeeId: string;
  name: string;
  email: string;
  role: UserRole;
  organizationId: string;
  businessUnitId?: string | null;
  projectId?: string | null;
  assignedAssuranceScope?: string | null;
  designation?: string;
  avatarUrl?: string;
  permissions?: Permission[];
}

export interface DemoAccount {
  employeeId: string;
  name: string;
  role: UserRole;
  label: string;
  organizationName: string;
  scopeDescription: string;
  tierTag: string;
  avatar: string;
  defaultPassword?: string;
}

export interface LoginResponse {
  success: boolean;
  session: {
    sessionId: string;
    userId: string;
    expiresAt: number;
  };
  user: AuthUser;
  redirectPath: string;
}

export interface MeResponse {
  user: AuthUser;
  role: UserRole;
  organizationScope: {
    organizationId: string;
    businessUnitId?: string | null;
    projectId?: string | null;
    assignedAssuranceScope?: string | null;
  };
  permissions: Permission[];
  dashboardRoute: string;
}

// ==========================================
// Phase 5 Audit & Assurance Frontend Types
// ==========================================

export type AuditStatus =
  | 'PENDING_REVIEW'
  | 'IN_REVIEW'
  | 'VERIFIED'
  | 'REQUIRES_CLARIFICATION'
  | 'CORRECTION_REQUIRED'
  | 'REJECTED';

export type AssuranceLevel =
  | 'ISAE_3000_LIMITED'
  | 'REASONABLE_ASSURANCE'
  | 'INTERNAL_VERIFICATION';

export interface AuditReview {
  reviewId: string;
  activityId: string;
  reportingPeriodId: string;
  organizationId: string;
  companyId: string;
  businessUnitId?: string;
  projectId?: string;
  facilityId?: string;
  scopeNo: 1 | 2 | 3;
  activityTypeId: string;
  activityName?: string;
  assignedAuditorId: string;
  assignedAuditorName: string;
  assignedAt: number;
  auditStatus: AuditStatus;
  assuranceLevel: AssuranceLevel;
  originalQuantity: number;
  originalUnit: string;
  originalSpend?: number;
  originalCO2e: number;
  verifiedQuantity?: number;
  verifiedUnit?: string;
  verifiedEmissionFactor?: number;
  verifiedCO2e?: number;
  variancePercentage?: number;
  findingsCount: number;
  observations?: string;
  conclusion?: string;
  verifiedAt?: number;
  verifiedBy?: string;
  verifiedByName?: string;
  updatedAt: number;
}

export type FindingSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type FindingCategory =
  | 'DATA_DISCREPANCY'
  | 'MISSING_EVIDENCE'
  | 'FACTOR_MISMATCH'
  | 'METHODOLOGY'
  | 'BOUNDARY_ERROR'
  | 'CALCULATION_ERROR'
  | 'OTHER';

export interface AuditFinding {
  findingId: string;
  reviewId: string;
  activityId: string;
  severity: FindingSeverity;
  category: FindingCategory;
  title: string;
  description: string;
  recommendation: string;
  status: 'OPEN' | 'CLARIFICATION_REQUESTED' | 'RESOLVED' | 'ACCEPTED_WITH_OBSERVATION';
  reportedBy: string;
  reportedByName: string;
  reportedAt: number;
  resolvedAt?: number;
}

export interface AuditClarification {
  clarificationId: string;
  reviewId: string;
  activityId: string;
  findingId?: string;
  requestedBy: string;
  requestedByName: string;
  requestedByRole: string;
  requestedAt: number;
  question: string;
  targetScope: {
    companyId?: string;
    businessUnitId?: string;
    projectId?: string;
    facilityId?: string;
  };
  responseStatus: 'PENDING' | 'RESPONDED' | 'ACCEPTED';
  response?: string;
  respondedBy?: string;
  respondedByName?: string;
  respondedByRole?: string;
  respondedAt?: number;
  supplementaryEvidenceIds?: string[];
}

export interface AuditSummaryMetrics {
  totalRecords: number;
  pendingReviews: number;
  inReview: number;
  verified: number;
  correctionRequired: number;
  clarificationsPending: number;
  completionPercentage: number;
}

export interface AuditDossier {
  review: AuditReview;
  activityRecord: any;
  calculation: {
    factor: number;
    factorSource: string;
    grossKgCO2e: number;
    tCO2e: number;
    gasBreakdown: {
      co2Kg: number;
      ch4Kg: number;
      n2oKg: number;
    };
  };
  linkedEvidence: any[];
  findings: AuditFinding[];
  clarifications: AuditClarification[];
  auditTrail: any[];
  permissions: {
    canStartReview: boolean;
    canVerify: boolean;
    canReject: boolean;
    canMarkCorrection: boolean;
    canRequestClarification: boolean;
    canRespondClarification: boolean;
    canSaveAssessment: boolean;
    canAssignAuditor: boolean;
    isReadOnly: boolean;
  };
}

// ==========================================
// Phase 6: Reconciliation & Correction Models
// ==========================================

export type ReconciliationCaseType =
  | 'QUANTITY_VARIANCE'
  | 'FACTOR_MISMATCH'
  | 'EVIDENCE_DISCREPANCY'
  | 'BOUNDARY_ERROR'
  | 'METHODOLOGY_DIFFERENCE'
  | 'OTHER';

export type ReconciliationMateriality =
  | 'MATERIAL'
  | 'IMMATERIAL'
  | 'OBSERVATION_ONLY';

export type ReconciliationStatus =
  | 'IDENTIFIED'
  | 'CORRECTION_REQUESTED'
  | 'CORRECTION_SUBMITTED'
  | 'RECALCULATED'
  | 'RE_AUDITED'
  | 'RESOLVED'
  | 'CLOSED_NO_CHANGE'
  | 'REJECTED';

export type CorrectionStatus =
  | 'PENDING'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED';

export type ReconciliationAction =
  | 'CASE_CREATED'
  | 'CORRECTION_REQUESTED'
  | 'CORRECTION_SUBMITTED'
  | 'RECALCULATED'
  | 'RE_AUDITED'
  | 'CASE_RESOLVED'
  | 'CASE_CLOSED'
  | 'CASE_REJECTED';

export interface ReconciliationOriginalSubmitted {
  quantity: number;
  unit: string;
  spend?: number;
  emissionFactor?: number;
  emissionFactorSource?: string;
  co2e: number;
  grossKgCO2e?: number;
  submittedBy: string;
  submittedByName?: string;
  submittedAt: number;
  evidenceDocumentIds?: string[];
}

export interface ReconciliationAuditorAssessed {
  quantity: number;
  unit: string;
  emissionFactor?: number;
  emissionFactorSource?: string;
  co2e: number;
  grossKgCO2e?: number;
  assessedBy: string;
  assessedByName?: string;
  assessedAt: number;
  observations?: string;
  findingIds?: string[];
}

export interface ReconciliationVariance {
  quantityDelta: number;
  quantityDeltaPercentage: number;
  co2eDelta: number;
  co2eDeltaPercentage: number;
  isMaterial: boolean;
  thresholdPercentage: number;
}

export interface ReconciliationCorrectedData {
  correctedQuantity: number;
  correctedUnit: string;
  correctedSpend?: number;
  emissionFactor?: number;
  emissionFactorSource?: string;
  recalculatedCO2e: number;
  grossKgCO2e?: number;
  justification: string;
  evidenceDocumentIds?: string[];
  submittedBy: string;
  submittedByName: string;
  submittedAt: number;
  recalculatedAt?: number;
}

export interface ReconciliationCase {
  caseId: string;
  caseNumber: string;
  activityId: string;
  reviewId?: string;
  reportingPeriodId: string;
  scopeNo: 1 | 2 | 3;
  category: string;
  organizationId: string;
  companyId: string;
  businessUnitId?: string;
  projectId?: string;
  facilityId?: string;
  facilityName?: string;
  caseType: ReconciliationCaseType;
  materiality: ReconciliationMateriality;
  status: ReconciliationStatus;
  originalSubmitted: ReconciliationOriginalSubmitted;
  auditorAssessed: ReconciliationAuditorAssessed;
  variance: ReconciliationVariance;
  rootCause?: string;
  assignedToRole?: string;
  assignedToUserId?: string;
  assignedToUserName?: string;
  dueDate?: number;
  resolutionSummary?: string;
  resolvedAt?: number;
  resolvedBy?: string;
  resolvedByName?: string;
  activeCorrectionRequestId?: string;
  correctedData?: ReconciliationCorrectedData;
  createdAt: number;
  updatedAt: number;
}

export interface CorrectionRequest {
  requestId: string;
  caseId: string;
  activityId: string;
  reviewId?: string;
  requestedBy: string;
  requestedByName: string;
  requestedByRole: string;
  requestedAt: number;
  reason: string;
  targetFields: string[];
  recommendedValue?: {
    quantity?: number;
    unit?: string;
    factor?: number;
    notes?: string;
  };
  status: CorrectionStatus;
  dueDate?: number;
  submittedCorrection?: {
    correctedQuantity: number;
    correctedUnit: string;
    correctedSpend?: number;
    justification: string;
    newEvidenceDocumentIds?: string[];
    submittedBy: string;
    submittedByName: string;
    submittedAt: number;
  };
  recalculatedRun?: {
    calculationId: string;
    newCO2e: number;
    recalculatedAt: number;
  };
  auditorSignOff?: {
    signedOffBy: string;
    signedOffByName: string;
    signedOffAt: number;
    decision: 'ACCEPTED' | 'REJECTED';
    notes: string;
  };
  createdAt: number;
  updatedAt: number;
}

export interface ReconciliationHistoryEntry {
  historyId: string;
  caseId: string;
  action: ReconciliationAction;
  performedBy: string;
  performedByName: string;
  performedByRole: string;
  performedAt: number;
  deltaNotes: string;
  previousStatus?: string;
  newStatus?: string;
  snapshot?: Record<string, unknown>;
}

export interface ReconciliationSummaryMetrics {
  totalRecords: number;
  totalCases: number;
  matchedRecords: number;
  materialDiscrepancies: number;
  requiresReview: number;
  correctionSubmitted: number;
  recalculated: number;
  resolved: number;
  compliancePercentage: number;
}

export interface ReconciliationDossier {
  case: ReconciliationCase;
  correctionRequests: CorrectionRequest[];
  history: ReconciliationHistoryEntry[];
  activityRecord?: any;
  evidenceDocuments?: any[];
  permissions: {
    canRequestCorrection: boolean;
    canSubmitCorrection: boolean;
    canSignOff: boolean;
    canClose: boolean;
    isReadOnly: boolean;
  };
}

// ==========================================
// PHASE 7: BRSR / ESG REPORT TYPES
// ==========================================

export type ReportType = 'BRSR' | 'ESG_SUMMARY' | 'GHG_INVENTORY';

export type ReportStatus =
  | 'DRAFT'
  | 'GENERATING'
  | 'VALIDATION_FAILED'
  | 'READY_FOR_REVIEW'
  | 'UNDER_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'APPROVED'
  | 'LOCKED'
  | 'SUPERSEDED';

export type DisclosureStatus =
  | 'NOT_CONFIGURED'
  | 'DATA_MISSING'
  | 'NOT_APPLICABLE'
  | 'PENDING_VALIDATION'
  | 'READY_FOR_REVIEW'
  | 'COMPLETE';

export interface ValidationIssue {
  issueId: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  disclosureId?: string;
  relatedRecordReferences?: string[];
  issueCode: string;
  message: string;
  blockingFlag: boolean;
  recommendedAction: string;
}

export interface ReportDisclosureValue {
  disclosureId: string;
  disclosureCode: string;
  disclosureName: string;
  section: string;
  status: DisclosureStatus;
  rawValue: unknown;
  formattedValue: string;
  unit?: string;
  dataSource?: string;
  calculationSource?: string;
  sourceRecordIds?: string[];
  lastUpdatedAt?: number;
  comments?: string;
  isSupported: boolean;
  missingReason?: string;
}

export interface ReportSnapshot {
  scopeTotals: {
    scope1Tons: number | null;
    scope2Tons: number | null;
    scope3Tons: number | null;
    scope12Combined: number | null;
    totalTons: number | null;
  };
  gasBreakdown: Array<{
    scope: number;
    gas: string;
    emissionsTons: number;
    unit: string;
  }>;
  scope3CategoryTotals: Array<{
    categoryNo: number;
    categoryName: string;
    emissionsTons: number;
    unit: string;
    dataStatus: string;
  }>;
  intensityMetrics: {
    revenueInrCrores?: number | null;
    turnoverBasis?: string;
    physicalMetricName?: string;
    physicalOutputQty?: number | null;
    physicalUnit?: string;
    scope12IntensityRevenue?: number | null;
    scope12IntensityPhysical?: number | null;
    hasIntensityCalculations: boolean;
    missingIntensityReason?: string;
  };
  activityRecordIds: string[];
  calculationRunIds: string[];
  auditReviewIds: string[];
  reconciliationCaseIds: string[];
  evidenceDocumentIds: string[];
  disclosures: Record<string, ReportDisclosureValue>;
  coverage: {
    facilitiesIncluded: number;
    businessUnitsIncluded: number;
    totalActivities: number;
    verifiedActivities: number;
    auditFindingsCount: number;
    openReconciliationCount: number;
  };
}

export interface ReportRecord {
  reportId: string;
  reportType: ReportType;
  templateId: string;
  templateVersion: string;
  title: string;
  organizationId: string;
  companyId: string;
  companyName: string;
  reportingPeriodId: string;
  fiscalYear: string;
  quarter: string;
  reportingBoundaryReference: string;
  reportVersion: number;
  reportStatus: ReportStatus;
  generationRequestedBy: string;
  generationRequestedByName: string;
  generationRequestedByRole: string;
  generatedAt: number;
  updatedAt: number;
  snapshotReference: string;
  snapshot: ReportSnapshot;
  validationSummary: {
    totalIssues: number;
    blockingErrors: number;
    warnings: number;
    infoCount: number;
    issues: ValidationIssue[];
    canApprove: boolean;
  };
  approvalStatus: 'PENDING' | 'CHANGES_REQUESTED' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvedByName?: string;
  approvedByRole?: string;
  approvedAt?: number;
  approvalComments?: string;
  companyApprovedBy?: string;
  companyApprovedByName?: string;
  companyApprovedByRole?: string;
  companyApprovedAt?: number;
  companyApprovalComments?: string;
  auditorApprovedBy?: string;
  auditorApprovedByName?: string;
  auditorApprovedByRole?: string;
  auditorApprovedAt?: number;
  auditorApprovalComments?: string;
  finalizedAt?: number;
  finalizedBy?: string;
  finalizedByName?: string;
  lockedAt?: number;
  lockedBy?: string;
  supersededBy?: string;
  exportArtifacts?: {
    pdfStoragePath?: string;
    pdfDownloadUrl?: string;
    pdfGeneratedAt?: number;
    pdfChecksum?: string;
    pdfFileSizeBytes?: number;
  };
  history: Array<{
    version: number;
    action: string;
    performedBy: string;
    performedByName: string;
    performedByRole: string;
    timestamp: number;
    notes: string;
    oldStatus?: ReportStatus;
    newStatus?: ReportStatus;
  }>;
}
