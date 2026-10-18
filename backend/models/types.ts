export type UserRole =
  | 'PROJECT_USER'
  | 'BUSINESS_UNIT_USER'
  | 'COMPANY_USER'
  | 'GROUP_ADMIN'
  | 'AUDITOR'
  | 'MANAGEMENT';

export type Permission =
  // Project User
  | 'VIEW_DASHBOARD'
  | 'VIEW_ESG_DATA'
  | 'CREATE_ESG_DATA'
  | 'EDIT_OWN_ESG_DATA'
  | 'UPLOAD_EVIDENCE'
  | 'VIEW_OWN_EVIDENCE'
  | 'VIEW_OWN_CALCULATIONS'
  | 'VIEW_AUDIT_STATUS'
  | 'RESPOND_TO_CLARIFICATION'
  // BU User
  | 'VIEW_BU_DATA'
  | 'REVIEW_PROJECT_DATA'
  | 'VIEW_EVIDENCE'
  | 'VIEW_CALCULATIONS'
  | 'RESPOND_TO_AUDIT'
  | 'VIEW_RECONCILIATION'
  // Company User
  | 'VIEW_COMPANY_DATA'
  | 'REVIEW_BU_DATA'
  | 'CONSOLIDATE_DATA'
  | 'VIEW_AUDIT'
  | 'VIEW_REPORTS'
  // Group Admin
  | 'GROUP_VIEW'
  | 'VIEW_ALL_DATA'
  | 'MANAGE_USERS'
  | 'MANAGE_ROLES'
  | 'MANAGE_ORGANIZATION'
  | 'APPROVE_REPORT'
  | 'GENERATE_REPORT'
  | 'VIEW_ANALYTICS'
  // Auditor
  | 'VIEW_AUDIT_QUEUE'
  | 'VIEW_ESG_DATA_FOR_ASSIGNED_SCOPE'
  | 'VERIFY_DATA'
  | 'ADD_FINDING'
  | 'REQUEST_CLARIFICATION'
  | 'MARK_CORRECTION_REQUIRED'
  | 'CREATE_ASSURANCE_RESULT'
  // Management
  | 'VIEW_APPROVED_DASHBOARD'
  | 'VIEW_APPROVED_REPORTS'
  | 'VIEW_APPROVED_ANALYTICS';

export interface User {
  userId: string;
  employeeId: string;
  name: string;
  email: string;
  role: UserRole;
  organizationId: string;
  businessUnitId?: string;
  projectId?: string;
  assignedAssuranceScope?: string;
  active: boolean;
  permissions: Permission[];
  designation?: string;
  avatarUrl?: string;
}

export interface RoleDefinition {
  roleId: UserRole;
  roleName: string;
  tierDescription: string;
  scopeType: 'PROJECT' | 'BUSINESS_UNIT' | 'COMPANY' | 'GROUP' | 'ASSURANCE' | 'READ_ONLY_GROUP';
  defaultDashboardRoute: string;
  permissions: Permission[];
}

export interface Organization {
  organizationId: string;
  name: string;
  cin?: string;
  type: 'GROUP' | 'COMPANY' | 'LEGAL_ENTITY';
  parentId?: string | null;
  active: boolean;
}

export interface BusinessUnit {
  businessUnitId: string;
  name: string;
  code: string;
  organizationId: string;
  headName: string;
  active: boolean;
}

export interface Project {
  projectId: string;
  name: string;
  code: string;
  businessUnitId: string;
  organizationId: string;
  leadName: string;
  location: string;
  facilityCode: string;
  active: boolean;
}

export interface Facility {
  facilityId: string;
  name: string;
  code: string;
  projectId: string;
  businessUnitId: string;
  organizationId: string;
  type: string;
  installedCapacity?: string;
  active: boolean;
}

export interface Session {
  sessionId: string;
  userId: string;
  createdAt: number;
  lastActivity: number;
  expiresAt: number;
}

export interface AuthSessionResponse {
  sessionId: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
}

export type EvidenceType =
  | 'Utility Bill'
  | 'Electricity Bill'
  | 'Fuel Invoice'
  | 'Meter Reading'
  | 'Purchase Invoice'
  | 'Travel Record'
  | 'Refrigerant Record'
  | 'Waste Record'
  | 'Water Record'
  | 'Transport Record'
  | 'Production Record'
  | 'Calculation Sheet'
  | 'ERP Export'
  | 'Internal Record'
  | 'Supplier Document'
  | 'Other';

export type EvidenceVerificationStatus =
  | 'UPLOADED'
  | 'PENDING_REVIEW'
  | 'VERIFIED'
  | 'REQUIRES_CLARIFICATION'
  | 'REJECTED'
  | 'SUPERSEDED'
  | 'ARCHIVED';

export interface EvidenceDocument {
  documentId: string;
  originalFileName: string;
  storagePath: string;
  downloadUrl?: string;
  mimeType: string;
  fileSize: number;
  fileExtension: string;

  organizationId: string;
  companyId?: string;
  businessUnitId?: string;
  projectId?: string;
  facilityId?: string;
  reportingPeriodId: string;

  evidenceType: EvidenceType | string;
  description?: string;

  uploadedBy: string;
  uploadedByName?: string;
  uploadedByRole: UserRole;
  uploadedAt: number;

  verificationStatus: EvidenceVerificationStatus;
  verifiedBy?: string;
  verifiedByName?: string;
  verifiedAt?: number;
  verificationNotes?: string;

  version: number;
  evidenceGroupId: string;
  parentDocumentId?: string;
  isCurrent: boolean;

  linkedRecordId?: string;
  checksum?: string;
  isActive: boolean;
  localFilePath?: string;
}

export interface EvidenceLink {
  linkId: string;
  documentId: string;
  recordId: string;
  linkedAt: number;
  linkedBy: string;
}

export interface AuditLogEntry {
  logId: string;
  actor: string;
  actorName?: string;
  role: string;
  action:
    | 'EVIDENCE_UPLOADED'
    | 'EVIDENCE_METADATA_UPDATED'
    | 'EVIDENCE_REPLACED'
    | 'EVIDENCE_VIEWED'
    | 'EVIDENCE_DOWNLOADED'
    | 'EVIDENCE_VERIFIED'
    | 'EVIDENCE_REJECTED'
    | 'EVIDENCE_CLARIFICATION_REQUESTED'
    | 'EVIDENCE_ARCHIVED'
    | 'ESG_RECORD_CREATED'
    | 'ESG_RECORD_UPDATED'
    | 'ESG_RECORD_SUBMITTED'
    | 'ESG_RECORD_REJECTED'
    | 'ESG_RECORD_RETURNED_FOR_CORRECTION'
    | 'ESG_RECORD_REVIEWED'
    | 'ESG_RECORD_APPROVED'
    | 'ESG_RECORD_LOCKED'
    | 'ESG_RECORD_VERSION_CREATED'
    | 'AUDIT_REVIEW_STARTED'
    | 'AUDIT_FINDING_RECORDED'
    | 'AUDIT_CLARIFICATION_REQUESTED'
    | 'AUDIT_CLARIFICATION_RESPONDED'
    | 'AUDIT_ASSESSMENT_UPDATED'
    | 'AUDIT_VERIFIED'
    | 'AUDIT_REJECTED'
    | 'AUDIT_CORRECTION_REQUESTED'
    | 'AUDITOR_ASSIGNED'
    | 'BU_REVIEW_OPENED'
    | 'BU_REVIEW_CHECKLIST_UPDATED'
    | 'BU_SUBMISSION_APPROVED'
    | 'BU_SUBMISSION_RETURNED'
    | 'BU_DISCREPANCY_FLAGGED'
    | 'RECONCILIATION_CASE_CREATED'
    | 'CORRECTION_REQUESTED'
    | 'CORRECTION_SUBMITTED'
    | 'DATA_RECALCULATED'
    | 'CORRECTION_APPROVED'
    | 'CORRECTION_REJECTED'
    | 'RECONCILIATION_RESOLVED'
    | 'RECONCILIATION_CLOSED';
  documentId?: string;
  activityId?: string;
  timestamp: number;
  oldStatus?: string;
  newStatus?: string;
  scope?: string;
  comments?: string;
}

export interface ReportingPeriod {
  periodId: string;
  fiscalYear: string;
  quarter: string;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'UPCOMING';
}

// ==========================================
// Phase 3: ESG Data Entry & Activity Ledger
// ==========================================

export type ScopeNumber = 1 | 2 | 3;

export type RecordNature = 'ACTIVITY' | 'CAPTURE' | 'ADJUSTMENT';

export type ESGDataMethod =
  | 'MEASURED'
  | 'METER'
  | 'INVOICE_QUANTITY'
  | 'SUPPLIER_DATA'
  | 'ENGINEERING_ESTIMATE'
  | 'SPEND_BASED'
  | 'SURVEY'
  | 'MODELLED'
  | 'OTHER_ESTIMATE';

export type ESGWorkflowStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'SITE_REVIEWED'
  | 'ESG_REVIEWED'
  | 'FINANCE_RECONCILED'
  | 'APPROVED'
  | 'ASSURANCE_REVIEWED'
  | 'LOCKED'
  | 'REJECTED';

export type Scope1Category =
  | 'Stationary Combustion'
  | 'Mobile Combustion'
  | 'Process Emissions'
  | 'Fugitive Emissions'
  | 'Carbon Capture';

export interface Scope1Details {
  category: Scope1Category;
  combustionType?: string;
  fuelSubstanceId?: string;
  equipmentType?: string;
  vehicleOrAssetRef?: string;
  netCalorificValue?: number;
  density?: number;
  processType?: string;
  inputMaterialId?: string;
  productionQuantity?: number;
  productionUnitId?: string;
  processMethod?: string;
  labTestReference?: string;
  fugitiveType?: string;
  substanceId?: string;
  gasId?: string;
  openingChargeQty?: number;
  addedQty?: number;
  recoveredQty?: number;
  closingChargeQty?: number;
  estimatedLeakageQty?: number;
  capturedGasId?: string;
  capturedQuantity?: number;
  captureMethod?: string;
  storageOrUse?: string;
  permanentStorageFlag?: boolean;
  measurementMethod?: string;
  calculationMethod?: string;
  notes?: string;
}

export type Scope2EnergyType =
  | 'Electricity'
  | 'Steam'
  | 'Heat'
  | 'Cooling'
  | 'Refrigeration'
  | 'Other';

export interface Scope2Details {
  energyType: Scope2EnergyType;
  supplierPartnerId?: string;
  meterIdentifier?: string;
  connectionNumber?: string;
  gridRegion?: string;
  procurementType?: string;
  accountingMethod?: 'LOCATION_BASED' | 'MARKET_BASED';
  renewableFlag: boolean;
  renewablePercentage?: number;
  certificateType?: string;
  certificateReference?: string;
  notes?: string;
}

export interface Scope3Details {
  scope3CategoryNo: number;
  categoryName: string;
  calculationMethod?: string;
  dataSourceType?: string;
  supplierSpecificFlag?: boolean;
  allocationRequiredFlag?: boolean;
  allocationMethod?: string;
  activityBoundary?: string;
  lifeCycleStage?: string;
  primaryDataPercentage?: number;
  secondaryDataPercentage?: number;
  notes?: string;
}

export interface ActivityRecord {
  activityId: string;
  organizationId: string;
  companyId: string;
  businessUnitId?: string;
  projectId?: string;
  facilityId?: string;
  reportingPeriodId: string;
  emissionSourceId?: string;
  scopeNo: ScopeNumber;
  scope3CategoryNo?: number | null;
  activityTypeId: string;
  parentActivityId?: string;
  recordNature: RecordNature;
  activityDate?: string;
  periodStart: string;
  periodEnd: string;
  description?: string;
  quantity?: number;
  unitId?: string;
  spendAmount?: number;
  currencyCode: string;
  dataMethod: ESGDataMethod;
  sourceReference?: string;
  invoiceOrMeterRef?: string;
  estimatedFlag: boolean;
  estimationReason?: string;
  workflowStatus: ESGWorkflowStatus;
  enteredBy: string;
  enteredByName?: string;
  enteredAt: number;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: number;
  remarks?: string;
  currentVersion: number;
  isActive: boolean;
  scope1Details?: Scope1Details;
  scope2Details?: Scope2Details;
  scope3Details?: Scope3Details;
  linkedEvidenceIds?: string[];
  evidenceDocumentIds?: string[];
  co2e?: number;
  spend?: number;
  title?: string;
  locationOrFacility?: string;
  submittedBy?: string;
  submittedByName?: string;
  submittedAt?: number;
  updatedAt?: number;
  hasBlockingDiscrepancy?: boolean;
  blockingDiscrepancyReason?: string;
  buReviewNotes?: string;
  buReviewedBy?: string;
  buReviewedByName?: string;
  buReviewedAt?: number;
  buChecklist?: Record<string, boolean>;
}

export interface ActivityVersion {
  versionId: string;
  activityId: string;
  version: number;
  previousVersion: number;
  changedBy: string;
  changedByName?: string;
  changedAt: number;
  changeReason: string;
  snapshot: Partial<ActivityRecord>;
  status: ESGWorkflowStatus;
}

export interface ActivityEvidenceLink {
  linkId: string;
  activityId: string;
  documentId: string;
  linkedAt: number;
  linkedBy: string;
}

// Master Data Types
export interface EmissionSource {
  sourceId: string;
  name: string;
  scopeNo: ScopeNumber;
  category: string;
  facilityId?: string;
  projectId?: string;
  description?: string;
}

export interface ActivityType {
  typeId: string;
  name: string;
  scopeNo: ScopeNumber;
  scope3CategoryNo?: number;
  defaultUnitId?: string;
  description?: string;
}

export interface Unit {
  unitId: string;
  symbol: string;
  name: string;
  type: 'MASS' | 'VOLUME' | 'ENERGY' | 'DISTANCE' | 'TIME' | 'CURRENCY' | 'OTHER';
}

export interface Scope3CategoryDef {
  categoryNo: number;
  name: string;
  boundary: 'UPSTREAM' | 'DOWNSTREAM';
  description: string;
}

export interface ValueChainPartner {
  partnerId: string;
  name: string;
  type: 'SUPPLIER' | 'CUSTOMER' | 'TRANSPORTER' | 'UTILITY' | 'OTHER';
  gstinOrId?: string;
  organizationId: string;
}

export interface Substance {
  substanceId: string;
  name: string;
  type: 'FUEL' | 'REFRIGERANT' | 'CHEMICAL' | 'WASTE' | 'RAW_MATERIAL';
  physicalState: 'SOLID' | 'LIQUID' | 'GAS';
  unitDefault: string;
}

// ==========================================
// Phase 5: Audit & Assurance Models
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
  scopeNo: ScopeNumber;
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
  scopeNo: ScopeNumber;
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

// ==========================================
// PHASE 7: BRSR / ESG REPORT GENERATION TYPES
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

export type ValidationSeverity = 'ERROR' | 'WARNING' | 'INFO';

export type ValidationIssueCode =
  | 'MISSING_MANDATORY_DISCLOSURE'
  | 'MISSING_REPORTING_PERIOD'
  | 'NO_APPROVED_CALCULATION_RUN'
  | 'UNRESOLVED_AUDIT_FINDING'
  | 'OPEN_RECONCILIATION_CASE'
  | 'MISSING_FINANCIAL_DENOMINATOR'
  | 'MISSING_UNIT'
  | 'INCONSISTENT_REPORTING_BOUNDARY'
  | 'UNSUPPORTED_DISCLOSURE'
  | 'MISSING_SOURCE_REFERENCE'
  | 'INVALID_REPORT_VERSION'
  | 'EXPORT_NOT_AVAILABLE';

export interface ValidationIssue {
  issueId: string;
  severity: ValidationSeverity;
  disclosureId?: string;
  relatedRecordReferences?: string[];
  issueCode: ValidationIssueCode;
  message: string;
  blockingFlag: boolean;
  recommendedAction: string;
}

export interface ReportDisclosureDefinition {
  disclosureId: string;
  disclosureCode: string;
  disclosureName: string;
  reportType: ReportType;
  reportSection: string;
  description: string;
  requiredFlag: boolean;
  applicableConditions?: string;
  dataSource: string;
  calculationSource?: string;
  unit?: string;
  formattingRules?: string;
  validationRules?: string;
  templateVersion: string;
  activeFlag: boolean;
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

export interface ReportGasBreakdownItem {
  scope: number;
  gas: string;
  emissionsTons: number;
  unit: string;
}

export interface ReportScope3CategoryItem {
  categoryNo: number;
  categoryName: string;
  emissionsTons: number;
  unit: string;
  dataStatus: string;
}

export interface ReportIntensityMetrics {
  revenueInrCrores?: number | null;
  turnoverBasis?: string;
  physicalMetricName?: string;
  physicalOutputQty?: number | null;
  physicalUnit?: string;
  scope12IntensityRevenue?: number | null;
  scope12IntensityPhysical?: number | null;
  hasIntensityCalculations: boolean;
  missingIntensityReason?: string;
}

export interface ReportSnapshot {
  scopeTotals: {
    scope1Tons: number | null;
    scope2Tons: number | null;
    scope3Tons: number | null;
    scope12Combined: number | null;
    totalTons: number | null;
  };
  gasBreakdown: ReportGasBreakdownItem[];
  scope3CategoryTotals: ReportScope3CategoryItem[];
  intensityMetrics: ReportIntensityMetrics;
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

export interface ReportExportArtifacts {
  pdfStoragePath?: string;
  pdfDownloadUrl?: string;
  pdfGeneratedAt?: number;
  pdfChecksum?: string;
  pdfFileSizeBytes?: number;
}

export interface ReportHistoryEntry {
  version: number;
  action: string;
  performedBy: string;
  performedByName: string;
  performedByRole: string;
  timestamp: number;
  notes: string;
  oldStatus?: ReportStatus;
  newStatus?: ReportStatus;
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
  exportArtifacts?: ReportExportArtifacts;
  history: ReportHistoryEntry[];
}

export interface ReportTemplate {
  templateId: string;
  templateCode: string;
  templateName: string;
  reportType: ReportType;
  version: string;
  regulatoryFramework: string;
  description: string;
  supportedSections: string[];
  unsupportedSections: string[];
  disclosures: ReportDisclosureDefinition[];
  activeFlag: boolean;
}
