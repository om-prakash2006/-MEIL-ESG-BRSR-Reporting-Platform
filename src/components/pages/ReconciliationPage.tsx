import React, { useState, useEffect, useCallback } from 'react';
import {
  GitCompare,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Lock,
  ExternalLink,
  RefreshCw,
  Filter,
  Search,
  PlusCircle,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calculator,
  Paperclip,
  UserCheck,
  ChevronRight,
  Info,
  Building2,
  FileText,
  Send,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import {
  AuthUser,
  ReconciliationCase,
  ReconciliationSummaryMetrics,
  CorrectionRequest,
  ReconciliationHistoryEntry,
} from '../../types.ts';
import { api } from '../../services/api.ts';

interface ReconciliationPageProps {
  user: AuthUser;
}

export const ReconciliationPage: React.FC<ReconciliationPageProps> = ({ user }) => {
  // State
  const [summary, setSummary] = useState<ReconciliationSummaryMetrics | null>(null);
  const [cases, setCases] = useState<ReconciliationCase[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [activeDossier, setActiveDossier] = useState<{
    case: ReconciliationCase;
    correctionRequests: CorrectionRequest[];
    history: ReconciliationHistoryEntry[];
    activityRecord: any;
    evidenceDocuments: any[];
    permissions: {
      canRequestCorrection: boolean;
      canSubmitCorrection: boolean;
      canSignOff: boolean;
      canClose: boolean;
      isReadOnly: boolean;
    };
  } | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterMateriality, setFilterMateriality] = useState<string>('ALL');
  const [filterScope, setFilterScope] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Notifications
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal States
  const [showRequestCorrectionModal, setShowRequestCorrectionModal] = useState<boolean>(false);
  const [showSubmitCorrectionModal, setShowSubmitCorrectionModal] = useState<boolean>(false);
  const [showSignOffModal, setShowSignOffModal] = useState<boolean>(false);
  const [showCloseModal, setShowCloseModal] = useState<boolean>(false);
  const [showCreateCaseModal, setShowCreateCaseModal] = useState<boolean>(false);

  // Form inputs for modals
  const [requestCorrectionForm, setRequestCorrectionForm] = useState({
    reason: '',
    recommendedQuantity: '',
    recommendedUnit: '',
    notes: '',
    dueDateDays: '7',
  });

  const [submitCorrectionForm, setSubmitCorrectionForm] = useState({
    correctedQuantity: '',
    correctedSpend: '',
    justification: '',
    evidenceDocumentIds: '',
  });

  const [signOffForm, setSignOffForm] = useState<{
    decision: 'ACCEPTED' | 'REJECTED';
    notes: string;
  }>({
    decision: 'ACCEPTED',
    notes: '',
  });

  const [closeForm, setCloseForm] = useState<{
    resolutionSummary: string;
    status: 'RESOLVED' | 'CLOSED_NO_CHANGE';
  }>({
    resolutionSummary: '',
    status: 'RESOLVED',
  });

  const [createCaseForm, setCreateCaseForm] = useState({
    activityId: 'ACT-2025-001',
    category: 'Diesel Consumption (Scope 1)',
    originalQuantity: '100000',
    originalUnit: 'LITER',
    originalSpend: '8900000',
    originalCO2e: '268.0',
    auditedQuantity: '110000',
    auditedCO2e: '294.8',
    observations: 'Fuel delivery gate logs show unrecorded deliveries.',
    caseType: 'QUANTITY_VARIANCE',
  });

  // Auto-dismiss notifications after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Load summary and cases
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, casesRes] = await Promise.all([
        api.getReconciliationSummary(),
        api.getReconciliationCases({
          status: filterStatus !== 'ALL' ? filterStatus : undefined,
          materiality: filterMateriality !== 'ALL' ? filterMateriality : undefined,
          scopeNo: filterScope !== 0 ? filterScope : undefined,
          search: searchQuery.trim() || undefined,
        }),
      ]);

      setSummary(sumRes.summary);
      setCases(casesRes.cases);

      // Default select the first case if none selected or if selection no longer in list
      if (casesRes.cases.length > 0) {
        if (!selectedCaseId || !casesRes.cases.some((c: ReconciliationCase) => c.caseId === selectedCaseId)) {
          setSelectedCaseId(casesRes.cases[0].caseId);
        }
      } else {
        setSelectedCaseId(null);
        setActiveDossier(null);
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to load reconciliation records.',
      });
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterMateriality, filterScope, searchQuery, selectedCaseId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Load selected case details
  const fetchCaseDetails = useCallback(async (caseId: string) => {
    setDetailLoading(true);
    try {
      const data = await api.getReconciliationCaseDetails(caseId);
      setActiveDossier(data);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to load case details.',
      });
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCaseId) {
      fetchCaseDetails(selectedCaseId);
    }
  }, [selectedCaseId, fetchCaseDetails]);

  // Export Reconciliation Dossier
  const handleExport = async () => {
    try {
      const blob = await api.exportReconciliationLedger();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MEIL_SEBI_BRSR_Reconciliation_Ledger_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setNotification({
        type: 'success',
        message: 'SEBI BRSR Core Reconciliation Ledger exported successfully.',
      });
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to export reconciliation ledger.',
      });
    }
  };

  // Submit Request Correction
  const handleRequestCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseId) return;

    if (!requestCorrectionForm.reason.trim()) {
      setNotification({ type: 'error', message: 'Please provide reason for correction.' });
      return;
    }

    setActionLoading(true);
    try {
      const days = parseInt(requestCorrectionForm.dueDateDays) || 7;
      const dueDate = Date.now() + days * 24 * 60 * 60 * 1000;

      await api.requestReconciliationCorrection(selectedCaseId, {
        reason: requestCorrectionForm.reason.trim(),
        recommendedQuantity: requestCorrectionForm.recommendedQuantity
          ? parseFloat(requestCorrectionForm.recommendedQuantity)
          : undefined,
        recommendedUnit: requestCorrectionForm.recommendedUnit || undefined,
        notes: requestCorrectionForm.notes || undefined,
        dueDate,
      });

      setNotification({
        type: 'success',
        message: 'Correction request formally dispatched to facility team.',
      });
      setShowRequestCorrectionModal(false);
      setRequestCorrectionForm({
        reason: '',
        recommendedQuantity: '',
        recommendedUnit: '',
        notes: '',
        dueDateDays: '7',
      });
      await fetchData();
      if (selectedCaseId) await fetchCaseDetails(selectedCaseId);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to issue correction request.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Corrected Data (Facility user)
  const handleSubmitCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseId) return;

    const qty = parseFloat(submitCorrectionForm.correctedQuantity);
    if (isNaN(qty) || qty < 0) {
      setNotification({ type: 'error', message: 'Please enter a valid non-negative quantity.' });
      return;
    }

    if (!submitCorrectionForm.justification.trim()) {
      setNotification({ type: 'error', message: 'Correction justification explanation is required.' });
      return;
    }

    setActionLoading(true);
    try {
      const evidenceDocIds = submitCorrectionForm.evidenceDocumentIds
        ? submitCorrectionForm.evidenceDocumentIds
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

      const res = await api.submitReconciliationCorrection(selectedCaseId, {
        correctedQuantity: qty,
        correctedSpend: submitCorrectionForm.correctedSpend
          ? parseFloat(submitCorrectionForm.correctedSpend)
          : undefined,
        justification: submitCorrectionForm.justification.trim(),
        evidenceDocumentIds: evidenceDocIds,
      });

      setNotification({
        type: 'success',
        message: res.message || 'Corrected data submitted and GHG recalculated successfully.',
      });
      setShowSubmitCorrectionModal(false);
      setSubmitCorrectionForm({
        correctedQuantity: '',
        correctedSpend: '',
        justification: '',
        evidenceDocumentIds: '',
      });
      await fetchData();
      if (selectedCaseId) await fetchCaseDetails(selectedCaseId);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to submit corrected data.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Auditor Sign-off (Accept or Reject)
  const handleSignOffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseId) return;

    if (!signOffForm.notes.trim()) {
      setNotification({ type: 'error', message: 'Sign-off commentary is required.' });
      return;
    }

    setActionLoading(true);
    try {
      await api.signOffReconciliation(selectedCaseId, {
        decision: signOffForm.decision,
        notes: signOffForm.notes.trim(),
      });

      setNotification({
        type: 'success',
        message: `Auditor sign-off recorded (${signOffForm.decision}).`,
      });
      setShowSignOffModal(false);
      setSignOffForm({ decision: 'ACCEPTED', notes: '' });
      await fetchData();
      if (selectedCaseId) await fetchCaseDetails(selectedCaseId);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to sign off on reconciliation case.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Formally Close Case
  const handleCloseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseId) return;

    if (!closeForm.resolutionSummary.trim()) {
      setNotification({ type: 'error', message: 'Resolution summary is required.' });
      return;
    }

    setActionLoading(true);
    try {
      await api.closeReconciliationCase(selectedCaseId, {
        resolutionSummary: closeForm.resolutionSummary.trim(),
        status: closeForm.status,
      });

      setNotification({
        type: 'success',
        message: 'Reconciliation case closed successfully.',
      });
      setShowCloseModal(false);
      setCloseForm({ resolutionSummary: '', status: 'RESOLVED' });
      await fetchData();
      if (selectedCaseId) await fetchCaseDetails(selectedCaseId);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to close case.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Create new case
  const handleCreateCaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const origQty = parseFloat(createCaseForm.originalQuantity) || 0;
      const audQty = parseFloat(createCaseForm.auditedQuantity) || 0;
      const origCO2e = parseFloat(createCaseForm.originalCO2e) || 0;
      const audCO2e = parseFloat(createCaseForm.auditedCO2e) || 0;

      await api.createReconciliationCase({
        activityId: createCaseForm.activityId,
        category: createCaseForm.category,
        caseType: createCaseForm.caseType,
        originalSubmitted: {
          quantity: origQty,
          unit: createCaseForm.originalUnit,
          spend: createCaseForm.originalSpend ? parseFloat(createCaseForm.originalSpend) : undefined,
          co2e: origCO2e,
        },
        auditorAssessed: {
          quantity: audQty,
          unit: createCaseForm.originalUnit,
          co2e: audCO2e,
          observations: createCaseForm.observations,
        },
      });

      setNotification({
        type: 'success',
        message: 'Discrepancy registered in reconciliation ledger.',
      });
      setShowCreateCaseModal(false);
      await fetchData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to register discrepancy.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0]">
            <CheckCircle className="w-3 h-3" /> Resolved
          </span>
        );
      case 'RECALCULATED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-[#f0f9ff] text-[#0284c7] border border-[#bae6fd]">
            <Calculator className="w-3 h-3" /> Recalculated
          </span>
        );
      case 'CORRECTION_SUBMITTED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-[#fdf4ff] text-[#c026d3] border border-[#f5d0fe]">
            <Clock className="w-3 h-3" /> Correction Submitted
          </span>
        );
      case 'CORRECTION_REQUESTED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-[#fff1f2] text-[#e11d48] border border-[#fecdd3]">
            <AlertTriangle className="w-3 h-3" /> Correction Requested
          </span>
        );
      case 'IDENTIFIED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-[#fffbeb] text-[#d97706] border border-[#fde68a]">
            <AlertCircle className="w-3 h-3" /> Discrepancy Identified
          </span>
        );
      case 'CLOSED_NO_CHANGE':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-[#f1f5f9] text-[#475569] border border-[#cbd5e1]">
            <Lock className="w-3 h-3" /> Closed (No Change)
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#f1f5f9] text-[#475569]">
            {status}
          </span>
        );
    }
  };

  const activeCase = activeDossier?.case || cases.find((c) => c.caseId === selectedCaseId);

  return (
    <div className="space-y-5 pb-12">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-md shadow-lg border text-xs font-semibold transition-all ${
            notification.type === 'success'
              ? 'bg-[#ecfdf5] border-[#6ee7b7] text-[#065f46]'
              : 'bg-[#fff1f2] border-[#fca5a5] text-[#9f1239]'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#059669]" />
          ) : (
            <AlertCircle className="w-4 h-4 text-[#e11d48]" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e2e8f0] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#0f172a] tracking-tight flex items-center gap-2">
              <GitCompare className="w-6 h-6 text-[#1d4ed8]" />
              Reconciliation &amp; Correction Management
            </h1>
            <span className="text-[10px] font-bold bg-[#eff4ff] text-[#1d4ed8] px-2 py-0.5 rounded border border-[#bfdbfe]">
              SEBI BRSR Core Variance Engine · Live
            </span>
          </div>
          <p className="text-xs text-[#64748b] mt-1">
            Reconcile submitted activity data with auditor assessments, manage formal correction requests, track
            deterministic recalculations, and maintain statutory audit trails.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData()}
            disabled={loading}
            className="p-1.5 bg-white border border-[#cbd5e1] hover:bg-[#f8fafc] text-[#475569] text-xs font-semibold rounded flex items-center gap-1 transition-colors"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {(user.role === 'AUDITOR' || user.role === 'GROUP_ADMIN') && (
            <button
              onClick={() => setShowCreateCaseModal(true)}
              className="px-3 py-1.5 bg-white border border-[#1d4ed8] text-[#1d4ed8] hover:bg-[#eff4ff] text-xs font-semibold rounded flex items-center gap-1 transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Log Discrepancy</span>
            </button>
          )}

          <button
            onClick={handleExport}
            className="px-3.5 py-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-semibold rounded shadow-2xs flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Reconciliation Dossier</span>
          </button>
        </div>
      </div>

      {/* Scope and Role Indicator */}
      <div className="flex items-center justify-between text-[11px] bg-[#f8fafc] border border-[#e2e8f0] px-3.5 py-2 rounded">
        <div className="flex items-center gap-2 text-[#475569]">
          <span className="font-semibold text-[#0f172a]">Active Operator Scope:</span>
          <span className="px-1.5 py-0.5 bg-white rounded border border-[#cbd5e1] font-mono text-[10px] text-[#1e293b]">
            {user.role}
          </span>
          <span>·</span>
          <span>Org: {user.organizationId}</span>
          {user.businessUnitId && <span>· BU: {user.businessUnitId}</span>}
          {user.projectId && <span>· Proj: {user.projectId}</span>}
        </div>
        <div className="text-[#64748b] hidden sm:flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-[#059669]" />
          <span>Statutory Materiality Threshold: ±2.00% SEBI BRSR Core Limit</span>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white border border-[#e2e8f0] rounded p-3">
          <div className="text-[10px] font-bold text-[#64748b] uppercase">TOTAL EVALUATED</div>
          <div className="text-2xl font-bold text-[#0f172a] tabular-nums mt-0.5">
            {summary ? summary.totalRecords : '238'}
          </div>
          <div className="text-[10px] text-[#64748b] mt-0.5">Scopes 1, 2, 3 registry</div>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded p-3">
          <div className="text-[10px] font-bold text-[#059669] uppercase flex items-center justify-between">
            <span>MATCHED (COMPLIANT)</span>
            <span className="text-[10px] font-semibold text-[#059669]">≤ ±2%</span>
          </div>
          <div className="text-2xl font-bold text-[#059669] tabular-nums mt-0.5">
            {summary ? summary.matchedRecords : '184'}{' '}
            <span className="text-xs font-normal text-[#059669]">
              ({summary ? summary.compliancePercentage : 77.3}%)
            </span>
          </div>
          <div className="text-[10px] text-[#059669] mt-0.5">Within SEBI Core limit</div>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded p-3">
          <div className="text-[10px] font-bold text-[#e11d48] uppercase flex items-center justify-between">
            <span>MATERIAL DISCREPANCY</span>
            <span className="text-[10px] font-semibold text-[#e11d48]">&gt; ±2%</span>
          </div>
          <div className="text-2xl font-bold text-[#e11d48] tabular-nums mt-0.5">
            {summary ? summary.materialDiscrepancies : '18'}
          </div>
          <div className="text-[10px] text-[#e11d48] mt-0.5">Exceeds tolerance limit</div>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded p-3">
          <div className="text-[10px] font-bold text-[#d97706] uppercase">REQUIRES CORRECTION</div>
          <div className="text-2xl font-bold text-[#d97706] tabular-nums mt-0.5">
            {summary ? summary.requiresReview : '12'}
          </div>
          <div className="text-[10px] text-[#d97706] mt-0.5">Assigned to site teams</div>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded p-3">
          <div className="text-[10px] font-bold text-[#0284c7] uppercase">RECONCILED &amp; CLOSED</div>
          <div className="text-2xl font-bold text-[#0284c7] tabular-nums mt-0.5">
            {summary ? summary.resolved : '28'}
          </div>
          <div className="text-[10px] text-[#0284c7] mt-0.5">Re-audited &amp; signed off</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#e2e8f0] rounded-md p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        <div className="flex-1 relative">
          <Search className="w-3.5 h-3.5 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Case ID, Activity ID, Metric or Facility..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-[#cbd5e1] rounded text-xs focus:outline-none focus:border-[#1d4ed8]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 text-[#64748b]">
            <Filter className="w-3.5 h-3.5" />
            <span className="font-semibold text-[11px]">Filters:</span>
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-[#cbd5e1] rounded px-2.5 py-1.5 bg-white text-xs text-[#0f172a] focus:outline-none focus:border-[#1d4ed8]"
          >
            <option value="ALL">All Statuses</option>
            <option value="IDENTIFIED">Identified</option>
            <option value="CORRECTION_REQUESTED">Correction Requested</option>
            <option value="CORRECTION_SUBMITTED">Correction Submitted</option>
            <option value="RECALCULATED">Recalculated</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED_NO_CHANGE">Closed (No Change)</option>
          </select>

          <select
            value={filterMateriality}
            onChange={(e) => setFilterMateriality(e.target.value)}
            className="border border-[#cbd5e1] rounded px-2.5 py-1.5 bg-white text-xs text-[#0f172a] focus:outline-none focus:border-[#1d4ed8]"
          >
            <option value="ALL">All Materialities</option>
            <option value="MATERIAL">Material (&gt; 2% SEBI limit)</option>
            <option value="IMMATERIAL">Immaterial (≤ 2%)</option>
            <option value="OBSERVATION_ONLY">Observation Only</option>
          </select>

          <select
            value={filterScope}
            onChange={(e) => setFilterScope(Number(e.target.value))}
            className="border border-[#cbd5e1] rounded px-2.5 py-1.5 bg-white text-xs text-[#0f172a] focus:outline-none focus:border-[#1d4ed8]"
          >
            <option value={0}>All Scopes</option>
            <option value={1}>Scope 1 (Direct)</option>
            <option value={2}>Scope 2 (Electricity)</option>
            <option value={3}>Scope 3 (Value Chain)</option>
          </select>
        </div>
      </div>

      {/* Main Grid: Left Panel (Table) & Right Panel (Detail Dossier) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Table Panel (2 columns wide) */}
        <div className="lg:col-span-2 bg-white border border-[#e2e8f0] rounded-md overflow-hidden flex flex-col">
          <div className="p-3.5 border-b border-[#e2e8f0] flex items-center justify-between bg-[#f8fafc]">
            <h3 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider flex items-center gap-2">
              <span>VARIANCE LEDGER &amp; DISCREPANCY REGISTER</span>
              <span className="text-[10px] font-normal text-[#64748b] lowercase">
                (Click any record to inspect dossier)
              </span>
            </h3>
            <span className="text-[11px] text-[#64748b]">
              Showing {cases.length} discrepancy case{cases.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#f1f5f9] text-[#475569] text-[10px] uppercase font-bold border-b border-[#cbd5e1]">
                  <th className="py-2.5 px-3">RECORD ID</th>
                  <th className="py-2.5 px-3">METRIC &amp; SCOPE</th>
                  <th className="py-2.5 px-3">FACILITY</th>
                  <th className="py-2.5 px-3 text-right">REPORTED</th>
                  <th className="py-2.5 px-3 text-right">AUDITED</th>
                  <th className="py-2.5 px-3 text-right">VARIANCE Δ</th>
                  <th className="py-2.5 px-3 text-center">MATERIALITY</th>
                  <th className="py-2.5 px-3 text-center">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-[#64748b]">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#1d4ed8]" />
                      Loading reconciliation ledger...
                    </td>
                  </tr>
                ) : cases.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-[#64748b]">
                      <CheckCircle2 className="w-8 h-8 text-[#059669] mx-auto mb-2" />
                      No reconciliation discrepancies found matching the current filters.
                    </td>
                  </tr>
                ) : (
                  cases.map((c) => {
                    const isSelected = c.caseId === selectedCaseId;
                    const isExceeding = c.variance.isMaterial;
                    const deltaPctSign = c.variance.quantityDeltaPercentage > 0 ? '+' : '';

                    return (
                      <tr
                        key={c.caseId}
                        onClick={() => setSelectedCaseId(c.caseId)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[#eff4ff] border-l-4 border-l-[#1d4ed8]'
                            : 'hover:bg-[#f8fafc]'
                        }`}
                      >
                        <td className="py-2.5 px-3 font-mono font-bold text-[#1d4ed8]">
                          {c.caseNumber}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-[#0f172a]">{c.category}</div>
                          <div className="text-[10px] text-[#64748b]">Scope {c.scopeNo}</div>
                        </td>
                        <td className="py-2.5 px-3 text-[#475569] max-w-[150px] truncate" title={c.facilityName}>
                          {c.facilityName || 'Corporate Facility'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-[#0f172a]">
                          {c.originalSubmitted.quantity.toLocaleString()} {c.originalSubmitted.unit}
                          <div className="text-[10px] text-[#64748b]">{c.originalSubmitted.co2e} tCO2e</div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-[#0f172a]">
                          {c.auditorAssessed.quantity.toLocaleString()} {c.auditorAssessed.unit}
                          <div className="text-[10px] text-[#64748b]">{c.auditorAssessed.co2e} tCO2e</div>
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-mono font-bold ${
                            isExceeding ? 'text-[#e11d48]' : 'text-[#059669]'
                          }`}
                        >
                          {deltaPctSign}
                          {c.variance.quantityDelta.toLocaleString()} (
                          {deltaPctSign}
                          {c.variance.quantityDeltaPercentage}%)
                          <div className="text-[10px] font-normal">
                            {deltaPctSign}
                            {c.variance.co2eDelta} tCO2e
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {isExceeding ? (
                            <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#fff1f2] text-[#e11d48] border border-[#fecdd3]">
                              MATERIAL &gt;2%
                            </span>
                          ) : (
                            <span className="inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0]">
                              COMPLIANT
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {getStatusBadge(c.status)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Panel: Reconciliation Details Inspector & Action Console */}
        <div className="bg-white border border-[#e2e8f0] rounded-md p-4 space-y-4 text-xs flex flex-col">
          {detailLoading ? (
            <div className="py-20 text-center text-[#64748b]">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#1d4ed8]" />
              Loading discrepancy dossier...
            </div>
          ) : !activeCase ? (
            <div className="py-20 text-center text-[#64748b]">
              <GitCompare className="w-8 h-8 text-[#94a3b8] mx-auto mb-2" />
              Select a record from the variance ledger to inspect its full reconciliation dossier.
            </div>
          ) : (
            <>
              {/* Active Case Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#f1f5f9]">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-[#0f172a] text-sm uppercase">
                      {activeCase.caseNumber}
                    </h3>
                    {getStatusBadge(activeCase.status)}
                  </div>
                  <div className="text-[11px] text-[#64748b] mt-0.5 flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    <span>{activeCase.facilityName}</span>
                    <span>·</span>
                    <span>Act: {activeCase.activityId}</span>
                  </div>
                </div>

                <div className="text-right">
                  {activeCase.variance.isMaterial ? (
                    <span className="text-[11px] font-bold bg-[#fff1f2] text-[#e11d48] px-2.5 py-1 rounded border border-[#fecdd3] flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      +{activeCase.variance.quantityDeltaPercentage}% VARIANCE
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold bg-[#ecfdf5] text-[#059669] px-2.5 py-1 rounded border border-[#a7f3d0] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      MATCHED (0.00%)
                    </span>
                  )}
                </div>
              </div>

              {/* Card 1: Original Submitted Facility Data */}
              <div className="p-3 border border-[#cbd5e1] rounded bg-[#f8fafc] space-y-1.5">
                <div className="flex items-center justify-between text-[#64748b] font-bold text-[10px] uppercase">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-[#e11d48]" />
                    <span>1. ORIGINAL SUBMITTED FACILITY DATA</span>
                  </div>
                  <span className="font-normal lowercase text-[10px]">immutable</span>
                </div>
                <div className="text-xs text-[#0f172a]">
                  Reported:{' '}
                  <strong>
                    {activeCase.originalSubmitted.quantity.toLocaleString()}{' '}
                    {activeCase.originalSubmitted.unit}
                  </strong>{' '}
                  · <span className="font-mono font-semibold">{activeCase.originalSubmitted.co2e} tCO2e</span>
                  {activeCase.originalSubmitted.spend !== undefined && (
                    <span className="text-[#64748b]">
                      {' '}
                      (Spend: INR {activeCase.originalSubmitted.spend.toLocaleString()})
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-[#64748b]">
                  Submitted by {activeCase.originalSubmitted.submittedByName || 'Site Facility Eng.'} on{' '}
                  {new Date(activeCase.originalSubmitted.submittedAt).toLocaleDateString()}
                </div>
                {activeCase.originalSubmitted.evidenceDocumentIds &&
                  activeCase.originalSubmitted.evidenceDocumentIds.length > 0 && (
                    <div className="flex items-center gap-1 pt-1 text-[10px] text-[#1d4ed8]">
                      <Paperclip className="w-3 h-3" />
                      <span>
                        Attached Evidence:{' '}
                        {activeCase.originalSubmitted.evidenceDocumentIds.join(', ')}
                      </span>
                    </div>
                  )}
              </div>

              {/* Card 2: Auditor-Verified Assessment */}
              <div className="p-3 border border-[#bfdbfe] rounded bg-[#eff4ff] space-y-1.5">
                <div className="font-bold text-[#1d4ed8] text-[10px] uppercase flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <UserCheck className="w-3 h-3" />
                    <span>2. AUDITOR-VERIFIED DATA (LEAD ASSURER)</span>
                  </div>
                </div>
                <div className="text-xs text-[#0f172a]">
                  Audited:{' '}
                  <strong>
                    {activeCase.auditorAssessed.quantity.toLocaleString()}{' '}
                    {activeCase.auditorAssessed.unit}
                  </strong>{' '}
                  · <span className="font-mono font-semibold">{activeCase.auditorAssessed.co2e} tCO2e</span>
                </div>
                <div className="text-[11px] text-[#475569]">
                  Verified by {activeCase.auditorAssessed.assessedByName || 'Lead Sustainability Assurer'}
                </div>
                {activeCase.auditorAssessed.observations && (
                  <div className="text-[11px] text-[#1e40af] bg-white p-2 rounded border border-[#bfdbfe] mt-1 italic">
                    "{activeCase.auditorAssessed.observations}"
                  </div>
                )}
              </div>

              {/* Card 3: Variance & SEBI Materiality Check */}
              <div
                className={`p-3 border rounded space-y-1.5 ${
                  activeCase.variance.isMaterial
                    ? 'bg-[#fff1f2] border-[#fecdd3]'
                    : 'bg-[#ecfdf5] border-[#a7f3d0]'
                }`}
              >
                <div
                  className={`font-bold text-[10px] uppercase flex items-center justify-between ${
                    activeCase.variance.isMaterial ? 'text-[#e11d48]' : 'text-[#059669]'
                  }`}
                >
                  <span>3. VARIANCE &amp; SEBI MATERIALITY CHECK</span>
                  <span>SEBI Limit: ±2.00%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Quantity Delta (Δ):</span>
                  <strong>
                    {activeCase.variance.quantityDelta > 0 ? '+' : ''}
                    {activeCase.variance.quantityDelta.toLocaleString()}{' '}
                    {activeCase.originalSubmitted.unit}
                  </strong>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Emissions Delta (Δ):</span>
                  <strong>
                    {activeCase.variance.co2eDelta > 0 ? '+' : ''}
                    {activeCase.variance.co2eDelta} tCO2e
                  </strong>
                </div>
                <div className="flex justify-between text-xs">
                  <span>SEBI Core Variance %:</span>
                  <strong className={activeCase.variance.isMaterial ? 'text-[#e11d48]' : 'text-[#059669]'}>
                    {activeCase.variance.quantityDeltaPercentage > 0 ? '+' : ''}
                    {activeCase.variance.quantityDeltaPercentage}%
                  </strong>
                </div>
                <div
                  className={`text-[10px] font-bold pt-1 border-t ${
                    activeCase.variance.isMaterial
                      ? 'border-[#fecdd3] text-[#e11d48]'
                      : 'border-[#a7f3d0] text-[#059669]'
                  }`}
                >
                  {activeCase.variance.isMaterial
                    ? 'REQUIRES FORMAL CORRECTION - Exceeds 2.0% statutory materiality limit!'
                    : 'FULL CONCORDANCE - Discrepancy is within statutory acceptable boundary.'}
                </div>
              </div>

              {/* Card 4: Corrected Data & Recalculation Results (If present) */}
              {activeCase.correctedData && (
                <div className="p-3 border border-[#bae6fd] rounded bg-[#f0f9ff] space-y-1.5">
                  <div className="font-bold text-[#0284c7] text-[10px] uppercase flex items-center gap-1.5">
                    <Calculator className="w-3 h-3" />
                    <span>4. CORRECTED DATA &amp; DETERMINISTIC RECALCULATION</span>
                  </div>
                  <div className="text-xs text-[#0f172a]">
                    Corrected Quantity:{' '}
                    <strong>
                      {activeCase.correctedData.correctedQuantity.toLocaleString()}{' '}
                      {activeCase.correctedData.correctedUnit}
                    </strong>
                  </div>
                  <div className="text-xs text-[#0f172a]">
                    Recalculated Emissions:{' '}
                    <strong className="text-[#0284c7]">
                      {activeCase.correctedData.recalculatedCO2e} tCO2e
                    </strong>{' '}
                    ({activeCase.correctedData.grossKgCO2e} kg CO2e)
                  </div>
                  <div className="text-[11px] text-[#475569] italic bg-white p-2 rounded border border-[#bae6fd]">
                    "{activeCase.correctedData.justification}"
                  </div>
                  <div className="text-[10px] text-[#64748b]">
                    Submitted by {activeCase.correctedData.submittedByName} on{' '}
                    {new Date(activeCase.correctedData.submittedAt).toLocaleDateString()}
                  </div>
                </div>
              )}

              {/* Card 5: Action Console (Role-Aware) */}
              <div className="pt-2 border-t border-[#f1f5f9] space-y-2">
                <div className="text-[10px] font-bold text-[#64748b] uppercase">
                  WORKFLOW ACTION CONSOLE
                </div>

                {user.role === 'MANAGEMENT' ? (
                  <div className="bg-[#f8fafc] border border-[#cbd5e1] p-2.5 rounded text-[11px] text-[#64748b] flex items-center gap-2">
                    <Info className="w-4 h-4 text-[#1d4ed8]" />
                    <span>Management profile is in Read-Only Statutory Oversight mode.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Facility / Project user action */}
                    {['PROJECT_USER', 'BUSINESS_UNIT_USER', 'COMPANY_USER', 'GROUP_ADMIN'].includes(
                      user.role
                    ) &&
                      (activeCase.status === 'CORRECTION_REQUESTED' ||
                        activeCase.status === 'IDENTIFIED') && (
                        <button
                          onClick={() => {
                            setSubmitCorrectionForm({
                              correctedQuantity: String(activeCase.auditorAssessed.quantity),
                              correctedSpend: activeCase.originalSubmitted.spend
                                ? String(activeCase.originalSubmitted.spend)
                                : '',
                              justification: activeCase.rootCause || '',
                              evidenceDocumentIds: '',
                            });
                            setShowSubmitCorrectionModal(true);
                          }}
                          className="w-full py-2 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-semibold text-xs rounded transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Submit Corrected Data</span>
                        </button>
                      )}

                    {/* Auditor request correction */}
                    {(user.role === 'AUDITOR' || user.role === 'GROUP_ADMIN') &&
                      activeCase.status !== 'RESOLVED' &&
                      activeCase.status !== 'CLOSED_NO_CHANGE' && (
                        <button
                          onClick={() => {
                            setRequestCorrectionForm({
                              reason: `Discrepancy of ${activeCase.variance.quantityDeltaPercentage}% exceeds SEBI BRSR Core tolerance. Reconcile ledger with supporting evidence.`,
                              recommendedQuantity: String(activeCase.auditorAssessed.quantity),
                              recommendedUnit: activeCase.auditorAssessed.unit,
                              notes: activeCase.auditorAssessed.observations || '',
                              dueDateDays: '7',
                            });
                            setShowRequestCorrectionModal(true);
                          }}
                          className="w-full py-2 bg-[#fff1f2] border border-[#fecdd3] hover:bg-[#ffe4e6] text-[#e11d48] font-semibold text-xs rounded transition-colors flex items-center justify-center gap-1.5"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Request Correction</span>
                        </button>
                      )}

                    {/* Auditor Sign-off */}
                    {(user.role === 'AUDITOR' || user.role === 'GROUP_ADMIN') &&
                      (activeCase.status === 'CORRECTION_SUBMITTED' ||
                        activeCase.status === 'RECALCULATED') && (
                        <button
                          onClick={() => {
                            setSignOffForm({
                              decision: 'ACCEPTED',
                              notes: 'Corrected quantity verified against weighbridge and invoice vouchers. Discrepancy reconciled.',
                            });
                            setShowSignOffModal(true);
                          }}
                          className="w-full py-2 bg-[#059669] hover:bg-[#047857] text-white font-semibold text-xs rounded transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Auditor Sign-Off</span>
                        </button>
                      )}

                    {/* Close case */}
                    {(user.role === 'AUDITOR' || user.role === 'GROUP_ADMIN') &&
                      activeCase.status !== 'RESOLVED' && (
                        <button
                          onClick={() => {
                            setCloseForm({
                              resolutionSummary: 'Concluded with full concordance against SEBI BRSR Core statutory standards.',
                              status: 'RESOLVED',
                            });
                            setShowCloseModal(true);
                          }}
                          className="w-full py-2 bg-white border border-[#cbd5e1] hover:bg-[#f8fafc] text-[#475569] font-semibold text-xs rounded transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Close Discrepancy</span>
                        </button>
                      )}
                  </div>
                )}
              </div>

              {/* Card 6: Immutable Case History & Timeline */}
              {activeDossier?.history && activeDossier.history.length > 0 && (
                <div className="pt-2 border-t border-[#f1f5f9] space-y-2">
                  <div className="text-[10px] font-bold text-[#64748b] uppercase">
                    IMMUTABLE AUDIT TRAIL / CASE TIMELINE
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {activeDossier.history.map((h: ReconciliationHistoryEntry) => (
                      <div
                        key={h.historyId}
                        className="text-[11px] p-2 bg-[#f8fafc] border border-[#e2e8f0] rounded space-y-0.5"
                      >
                        <div className="flex items-center justify-between font-semibold text-[#0f172a]">
                          <span>{h.action.replace(/_/g, ' ')}</span>
                          <span className="text-[10px] text-[#64748b]">
                            {new Date(h.performedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#475569]">
                          By {h.performedByName} ({h.performedByRole})
                        </div>
                        <div className="text-[10px] text-[#64748b] italic">{h.deltaNotes}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* MODAL 1: Request Correction Modal */}
      {showRequestCorrectionModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-bold text-[#0f172a] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#e11d48]" />
                Request Formal ESG Correction
              </h3>
              <button
                onClick={() => setShowRequestCorrectionModal(false)}
                className="text-[#64748b] hover:text-[#0f172a]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRequestCorrectionSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                  Correction Reason / Discrepancy Rationale *
                </label>
                <textarea
                  rows={3}
                  required
                  value={requestCorrectionForm.reason}
                  onChange={(e) =>
                    setRequestCorrectionForm({ ...requestCorrectionForm, reason: e.target.value })
                  }
                  placeholder="Explain why submitted values exceed statutory thresholds..."
                  className="w-full p-2 border border-[#cbd5e1] rounded focus:outline-none focus:border-[#1d4ed8]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                    Recommended Quantity
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={requestCorrectionForm.recommendedQuantity}
                    onChange={(e) =>
                      setRequestCorrectionForm({
                        ...requestCorrectionForm,
                        recommendedQuantity: e.target.value,
                      })
                    }
                    placeholder="e.g. 110000"
                    className="w-full p-2 border border-[#cbd5e1] rounded focus:outline-none focus:border-[#1d4ed8]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                    Remediation Due (Days)
                  </label>
                  <select
                    value={requestCorrectionForm.dueDateDays}
                    onChange={(e) =>
                      setRequestCorrectionForm({
                        ...requestCorrectionForm,
                        dueDateDays: e.target.value,
                      })
                    }
                    className="w-full p-2 border border-[#cbd5e1] rounded focus:outline-none focus:border-[#1d4ed8]"
                  >
                    <option value="3">3 Days (Urgent)</option>
                    <option value="7">7 Days (Standard)</option>
                    <option value="14">14 Days</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                  Specific Auditor Instructions
                </label>
                <input
                  type="text"
                  value={requestCorrectionForm.notes}
                  onChange={(e) =>
                    setRequestCorrectionForm({ ...requestCorrectionForm, notes: e.target.value })
                  }
                  placeholder="e.g. Include IOCL fuel delivery slips and gate register."
                  className="w-full p-2 border border-[#cbd5e1] rounded focus:outline-none focus:border-[#1d4ed8]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowRequestCorrectionModal(false)}
                  className="px-3 py-1.5 border border-[#cbd5e1] rounded text-[#475569] hover:bg-[#f8fafc]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-1.5 bg-[#e11d48] hover:bg-[#be123c] text-white font-semibold rounded"
                >
                  {actionLoading ? 'Dispatching...' : 'Dispatch Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Submit Corrected Data Modal (Facility User) */}
      {showSubmitCorrectionModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-bold text-[#0f172a] flex items-center gap-2">
                <Send className="w-4 h-4 text-[#1d4ed8]" />
                Submit Corrected ESG Activity Data
              </h3>
              <button
                onClick={() => setShowSubmitCorrectionModal(false)}
                className="text-[#64748b] hover:text-[#0f172a]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitCorrectionSubmit} className="space-y-3">
              <div className="p-2.5 bg-[#eff4ff] border border-[#bfdbfe] rounded text-[11px] text-[#1e40af]">
                The deterministic calculation engine will automatically recalculate Scope CO2e upon
                submission using the approved emission factor library. Historical versions will be
                preserved in the immutable version registry.
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                    Corrected Quantity *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={submitCorrectionForm.correctedQuantity}
                    onChange={(e) =>
                      setSubmitCorrectionForm({
                        ...submitCorrectionForm,
                        correctedQuantity: e.target.value,
                      })
                    }
                    placeholder="e.g. 110000"
                    className="w-full p-2 border border-[#cbd5e1] rounded focus:outline-none focus:border-[#1d4ed8]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                    Corrected Financial Spend (INR)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={submitCorrectionForm.correctedSpend}
                    onChange={(e) =>
                      setSubmitCorrectionForm({
                        ...submitCorrectionForm,
                        correctedSpend: e.target.value,
                      })
                    }
                    placeholder="e.g. 9790000"
                    className="w-full p-2 border border-[#cbd5e1] rounded focus:outline-none focus:border-[#1d4ed8]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                  Correction Justification &amp; Technical Explanation *
                </label>
                <textarea
                  rows={3}
                  required
                  value={submitCorrectionForm.justification}
                  onChange={(e) =>
                    setSubmitCorrectionForm({
                      ...submitCorrectionForm,
                      justification: e.target.value,
                    })
                  }
                  placeholder="Explain why original quantity was adjusted, root cause, and verification source..."
                  className="w-full p-2 border border-[#cbd5e1] rounded focus:outline-none focus:border-[#1d4ed8]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                  Supplementary Evidence Document IDs (comma-separated)
                </label>
                <input
                  type="text"
                  value={submitCorrectionForm.evidenceDocumentIds}
                  onChange={(e) =>
                    setSubmitCorrectionForm({
                      ...submitCorrectionForm,
                      evidenceDocumentIds: e.target.value,
                    })
                  }
                  placeholder="e.g. DOC-001, DOC-004"
                  className="w-full p-2 border border-[#cbd5e1] rounded focus:outline-none focus:border-[#1d4ed8]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowSubmitCorrectionModal(false)}
                  className="px-3 py-1.5 border border-[#cbd5e1] rounded text-[#475569] hover:bg-[#f8fafc]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-semibold rounded"
                >
                  {actionLoading ? 'Calculating & Submitting...' : 'Submit & Recalculate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Auditor Sign-Off Modal */}
      {showSignOffModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-bold text-[#0f172a] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#059669]" />
                Lead Auditor Sign-Off &amp; Resolution
              </h3>
              <button
                onClick={() => setShowSignOffModal(false)}
                className="text-[#64748b] hover:text-[#0f172a]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSignOffSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                  Audit Sign-Off Decision *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSignOffForm({ ...signOffForm, decision: 'ACCEPTED' })}
                    className={`py-2 px-3 rounded font-semibold text-xs border text-center transition-colors ${
                      signOffForm.decision === 'ACCEPTED'
                        ? 'bg-[#ecfdf5] border-[#059669] text-[#059669]'
                        : 'bg-white border-[#cbd5e1] text-[#475569]'
                    }`}
                  >
                    ✓ ACCEPT &amp; RESOLVE
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignOffForm({ ...signOffForm, decision: 'REJECTED' })}
                    className={`py-2 px-3 rounded font-semibold text-xs border text-center transition-colors ${
                      signOffForm.decision === 'REJECTED'
                        ? 'bg-[#fff1f2] border-[#e11d48] text-[#e11d48]'
                        : 'bg-white border-[#cbd5e1] text-[#475569]'
                    }`}
                  >
                    ✗ REJECT (RETURN TO SITE)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                  Auditor Commentary &amp; Statutory Notes *
                </label>
                <textarea
                  rows={3}
                  required
                  value={signOffForm.notes}
                  onChange={(e) => setSignOffForm({ ...signOffForm, notes: e.target.value })}
                  placeholder="Document why correction was accepted or rejected..."
                  className="w-full p-2 border border-[#cbd5e1] rounded focus:outline-none focus:border-[#1d4ed8]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowSignOffModal(false)}
                  className="px-3 py-1.5 border border-[#cbd5e1] rounded text-[#475569] hover:bg-[#f8fafc]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-1.5 bg-[#059669] hover:bg-[#047857] text-white font-semibold rounded"
                >
                  {actionLoading ? 'Recording...' : 'Record Sign-Off'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Close Case Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-bold text-[#0f172a] flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#475569]" />
                Formally Close Reconciliation Discrepancy
              </h3>
              <button
                onClick={() => setShowCloseModal(false)}
                className="text-[#64748b] hover:text-[#0f172a]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCloseSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                  Closure Status
                </label>
                <select
                  value={closeForm.status}
                  onChange={(e) =>
                    setCloseForm({
                      ...closeForm,
                      status: e.target.value as 'RESOLVED' | 'CLOSED_NO_CHANGE',
                    })
                  }
                  className="w-full p-2 border border-[#cbd5e1] rounded focus:outline-none focus:border-[#1d4ed8]"
                >
                  <option value="RESOLVED">Resolved (Concurred with modifications)</option>
                  <option value="CLOSED_NO_CHANGE">
                    Closed (No Change - Immaterial / Justified)
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                  Closure Summary &amp; Statutory Dossier Notes *
                </label>
                <textarea
                  rows={3}
                  required
                  value={closeForm.resolutionSummary}
                  onChange={(e) =>
                    setCloseForm({ ...closeForm, resolutionSummary: e.target.value })
                  }
                  placeholder="State final disposition of discrepancy..."
                  className="w-full p-2 border border-[#cbd5e1] rounded focus:outline-none focus:border-[#1d4ed8]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  className="px-3 py-1.5 border border-[#cbd5e1] rounded text-[#475569] hover:bg-[#f8fafc]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-1.5 bg-[#0f172a] hover:bg-[#1e293b] text-white font-semibold rounded"
                >
                  {actionLoading ? 'Closing...' : 'Confirm Closure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Log New Discrepancy Case Modal */}
      {showCreateCaseModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-bold text-[#0f172a] flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-[#1d4ed8]" />
                Log Discrepancy Case in Reconciliation Ledger
              </h3>
              <button
                onClick={() => setShowCreateCaseModal(false)}
                className="text-[#64748b] hover:text-[#0f172a]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCaseSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                    Activity Record ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={createCaseForm.activityId}
                    onChange={(e) =>
                      setCreateCaseForm({ ...createCaseForm, activityId: e.target.value })
                    }
                    placeholder="ACT-2025-001"
                    className="w-full p-2 border border-[#cbd5e1] rounded focus:outline-none focus:border-[#1d4ed8]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                    Metric &amp; Description *
                  </label>
                  <input
                    type="text"
                    required
                    value={createCaseForm.category}
                    onChange={(e) =>
                      setCreateCaseForm({ ...createCaseForm, category: e.target.value })
                    }
                    placeholder="e.g. Diesel Consumption (Scope 1)"
                    className="w-full p-2 border border-[#cbd5e1] rounded focus:outline-none focus:border-[#1d4ed8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                    Original Submitted Quantity
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={createCaseForm.originalQuantity}
                    onChange={(e) =>
                      setCreateCaseForm({ ...createCaseForm, originalQuantity: e.target.value })
                    }
                    className="w-full p-2 border border-[#cbd5e1] rounded focus:outline-none focus:border-[#1d4ed8]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                    Auditor-Assessed Quantity
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={createCaseForm.auditedQuantity}
                    onChange={(e) =>
                      setCreateCaseForm({ ...createCaseForm, auditedQuantity: e.target.value })
                    }
                    className="w-full p-2 border border-[#cbd5e1] rounded focus:outline-none focus:border-[#1d4ed8]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#475569] mb-1">
                  Auditor Observations / Root Cause
                </label>
                <textarea
                  rows={2}
                  value={createCaseForm.observations}
                  onChange={(e) =>
                    setCreateCaseForm({ ...createCaseForm, observations: e.target.value })
                  }
                  placeholder="Describe discrepancy..."
                  className="w-full p-2 border border-[#cbd5e1] rounded focus:outline-none focus:border-[#1d4ed8]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateCaseModal(false)}
                  className="px-3 py-1.5 border border-[#cbd5e1] rounded text-[#475569] hover:bg-[#f8fafc]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-semibold rounded"
                >
                  {actionLoading ? 'Logging...' : 'Register Discrepancy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
