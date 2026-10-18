import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle,
  FileText,
  Lock,
  Download,
  Filter,
  Search,
  RefreshCw,
  PlusCircle,
  MessageSquare,
  Send,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calculator,
  Paperclip,
  UserCheck,
  ChevronRight,
  Info,
} from 'lucide-react';
import { AuthUser, AuditReview, AuditSummaryMetrics, AuditFinding, AuditClarification } from '../../types.ts';
import { api } from '../../services/api.ts';
import { DocumentActions } from '../common/DocumentActions.tsx';

interface AuditAssurancePageProps {
  user: AuthUser;
}

export const AuditAssurancePage: React.FC<AuditAssurancePageProps> = ({ user }) => {
  // State
  const [summary, setSummary] = useState<AuditSummaryMetrics | null>(null);
  const [queue, setQueue] = useState<AuditReview[]>([]);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [dossier, setDossier] = useState<any | null>(null);
  const [loadingQueue, setLoadingQueue] = useState<boolean>(true);
  const [loadingDossier, setLoadingDossier] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [scopeFilter, setScopeFilter] = useState<number | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Assessment form state
  const [verifiedQty, setVerifiedQty] = useState<string>('');
  const [verifiedFactor, setVerifiedFactor] = useState<string>('');
  const [observations, setObservations] = useState<string>('');
  const [conclusion, setConclusion] = useState<string>('');
  const [assuranceLevel, setAssuranceLevel] = useState<string>('ISAE_3000_LIMITED');
  const [savingAssessment, setSavingAssessment] = useState<boolean>(false);

  // Modals state
  const [showFindingModal, setShowFindingModal] = useState<boolean>(false);
  const [findingForm, setFindingForm] = useState({
    title: '',
    severity: 'MEDIUM',
    category: 'DATA_DISCREPANCY',
    description: '',
    recommendation: '',
  });

  const [showClarificationModal, setShowClarificationModal] = useState<boolean>(false);
  const [clarificationQuestion, setClarificationQuestion] = useState<string>('');

  const [showResponseModal, setShowResponseModal] = useState<boolean>(false);
  const [activeClarificationId, setActiveClarificationId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState<string>('');

  const [showConcludeModal, setShowConcludeModal] = useState<boolean>(false);
  const [concludeDecision, setConcludeDecision] = useState<'VERIFY' | 'REJECT' | 'CORRECTION_REQUIRED'>('VERIFY');
  const [concludeNotes, setConcludeNotes] = useState<string>('');

  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Helper to show temporary status alerts
  const notify = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  // Fetch summary and queue
  const fetchData = useCallback(async () => {
    try {
      setLoadingQueue(true);
      const [sumRes, queueRes] = await Promise.all([
        api.getAuditSummary(),
        api.getAuditQueue({
          status: statusFilter,
          scopeNo: scopeFilter,
          search: searchQuery,
        }),
      ]);
      setSummary(sumRes.summary);
      setQueue(queueRes.queue);

      // Auto-select first item if none selected or current not in list
      if (queueRes.queue.length > 0) {
        if (!selectedReviewId || !queueRes.queue.find((q) => q.reviewId === selectedReviewId)) {
          setSelectedReviewId(queueRes.queue[0].reviewId);
        }
      }
    } catch (err: any) {
      notify(err.message || 'Failed to load audit data', 'error');
    } finally {
      setLoadingQueue(false);
    }
  }, [statusFilter, scopeFilter, searchQuery, selectedReviewId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch dossier details when selectedReviewId changes
  useEffect(() => {
    if (!selectedReviewId) {
      setDossier(null);
      return;
    }

    let isMounted = true;
    const fetchDossier = async () => {
      try {
        setLoadingDossier(true);
        const data = await api.getAuditReviewDetails(selectedReviewId);
        if (isMounted) {
          setDossier(data);
          // Pre-populate independent assessment inputs
          setVerifiedQty(String(data.review.verifiedQuantity ?? data.review.originalQuantity ?? ''));
          setVerifiedFactor(String(data.review.verifiedEmissionFactor ?? data.calculation.factor ?? ''));
          setObservations(data.review.observations || '');
          setConclusion(data.review.conclusion || '');
          setAssuranceLevel(data.review.assuranceLevel || 'ISAE_3000_LIMITED');
        }
      } catch (err: any) {
        if (isMounted) notify(err.message || 'Failed to load review details', 'error');
      } finally {
        if (isMounted) setLoadingDossier(false);
      }
    };

    fetchDossier();
    return () => {
      isMounted = false;
    };
  }, [selectedReviewId]);

  // Handle Save Independent Assessment
  const handleSaveAssessment = async () => {
    if (!selectedReviewId) return;
    try {
      setSavingAssessment(true);
      const vQty = parseFloat(verifiedQty) || 0;
      const vFact = parseFloat(verifiedFactor) || 0;
      const calcCO2e = Math.round(((vQty * vFact) / 1000) * 100) / 100;

      await api.saveIndependentAssessment(selectedReviewId, {
        verifiedQuantity: vQty,
        verifiedEmissionFactor: vFact,
        verifiedCO2e: calcCO2e,
        observations,
        conclusion,
        assuranceLevel,
      });

      notify('Independent assessment and variance analysis saved successfully.');
      // Refresh current dossier and queue
      const updatedDossier = await api.getAuditReviewDetails(selectedReviewId);
      setDossier(updatedDossier);
      const queueRes = await api.getAuditQueue({ status: statusFilter, scopeNo: scopeFilter, search: searchQuery });
      setQueue(queueRes.queue);
    } catch (err: any) {
      notify(err.message || 'Could not save assessment', 'error');
    } finally {
      setSavingAssessment(false);
    }
  };

  // Handle Start Review
  const handleStartReview = async () => {
    if (!selectedReviewId) return;
    try {
      setActionLoading(true);
      await api.startAuditReview(selectedReviewId);
      notify('Formal audit review initiated.');
      const updated = await api.getAuditReviewDetails(selectedReviewId);
      setDossier(updated);
      fetchData();
    } catch (err: any) {
      notify(err.message || 'Failed to start review', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Add Finding Submit
  const handleAddFinding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReviewId) return;
    try {
      setActionLoading(true);
      await api.addAuditFinding(selectedReviewId, findingForm);
      notify('Audit finding successfully recorded.');
      setShowFindingModal(false);
      setFindingForm({
        title: '',
        severity: 'MEDIUM',
        category: 'DATA_DISCREPANCY',
        description: '',
        recommendation: '',
      });
      const updated = await api.getAuditReviewDetails(selectedReviewId);
      setDossier(updated);
      fetchData();
    } catch (err: any) {
      notify(err.message || 'Failed to record finding', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Request Clarification Submit
  const handleRequestClarification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReviewId || !clarificationQuestion.trim()) return;
    try {
      setActionLoading(true);
      await api.requestAuditClarification(selectedReviewId, {
        question: clarificationQuestion.trim(),
      });
      notify('Clarification request dispatched to facility lead.');
      setShowClarificationModal(false);
      setClarificationQuestion('');
      const updated = await api.getAuditReviewDetails(selectedReviewId);
      setDossier(updated);
      fetchData();
    } catch (err: any) {
      notify(err.message || 'Failed to request clarification', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Respond Clarification Submit
  const handleRespondClarification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClarificationId || !responseText.trim()) return;
    try {
      setActionLoading(true);
      await api.respondAuditClarification(activeClarificationId, {
        response: responseText.trim(),
      });
      notify('Clarification response submitted to auditor.');
      setShowResponseModal(false);
      setActiveClarificationId(null);
      setResponseText('');
      if (selectedReviewId) {
        const updated = await api.getAuditReviewDetails(selectedReviewId);
        setDossier(updated);
      }
      fetchData();
    } catch (err: any) {
      notify(err.message || 'Failed to submit response', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Conclude Review Submit
  const handleConcludeAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReviewId || !concludeNotes.trim()) return;
    try {
      setActionLoading(true);
      await api.concludeAuditReview(selectedReviewId, {
        decision: concludeDecision,
        conclusionNotes: concludeNotes.trim(),
        assuranceLevel,
      });
      notify(`Audit conclusion completed with decision: ${concludeDecision}.`);
      setShowConcludeModal(false);
      setConcludeNotes('');
      const updated = await api.getAuditReviewDetails(selectedReviewId);
      setDossier(updated);
      fetchData();
    } catch (err: any) {
      notify(err.message || 'Failed to conclude audit', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Export Dossier
  const handleExportDossier = async () => {
    try {
      const blob = await api.exportAssuranceDossier();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MEIL_Assurance_Dossier_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      notify('Assurance dossier exported successfully.');
    } catch (err: any) {
      notify(err.message || 'Failed to export assurance dossier', 'error');
    }
  };

  // Status badge styling helper
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <span className="text-[10px] font-bold text-[#059669] bg-[#ecfdf5] border border-[#a7f3d0] px-2 py-0.5 rounded">
            VERIFIED
          </span>
        );
      case 'IN_REVIEW':
        return (
          <span className="text-[10px] font-bold text-[#1d4ed8] bg-[#eff4ff] border border-[#bfdbfe] px-2 py-0.5 rounded">
            IN REVIEW
          </span>
        );
      case 'REQUIRES_CLARIFICATION':
        return (
          <span className="text-[10px] font-bold text-[#d97706] bg-[#fffbeb] border border-[#fde68a] px-2 py-0.5 rounded">
            CLARIFICATION REQ.
          </span>
        );
      case 'CORRECTION_REQUIRED':
        return (
          <span className="text-[10px] font-bold text-[#e11d48] bg-[#fff1f2] border border-[#fecdd3] px-2 py-0.5 rounded">
            CORRECTION REQ.
          </span>
        );
      case 'REJECTED':
        return (
          <span className="text-[10px] font-bold text-[#dc2626] bg-[#fef2f2] border border-[#fca5a5] px-2 py-0.5 rounded">
            REJECTED
          </span>
        );
      case 'PENDING_REVIEW':
      default:
        return (
          <span className="text-[10px] font-bold text-[#475569] bg-[#f1f5f9] border border-[#cbd5e1] px-2 py-0.5 rounded">
            PENDING REVIEW
          </span>
        );
    }
  };

  // Severity badge helper
  const renderSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <span className="text-[9px] font-bold text-red-700 bg-red-100 px-1.5 py-0.2 rounded border border-red-300">CRITICAL</span>;
      case 'HIGH':
        return <span className="text-[9px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded border border-rose-300">HIGH</span>;
      case 'MEDIUM':
        return <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300">MEDIUM</span>;
      case 'LOW':
      default:
        return <span className="text-[9px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-300">LOW</span>;
    }
  };

  // Live calculated variance %
  const currentVerifiedQty = parseFloat(verifiedQty) || 0;
  const currentVerifiedFactor = parseFloat(verifiedFactor) || 0;
  const currentVerifiedCO2e = Math.round(((currentVerifiedQty * currentVerifiedFactor) / 1000) * 100) / 100;
  const originalCO2e = dossier?.review?.originalCO2e || 0;
  const calculatedVariancePct =
    originalCO2e > 0
      ? Math.round(Math.abs((currentVerifiedCO2e - originalCO2e) / originalCO2e) * 10000) / 100
      : 0;

  return (
    <div className="space-y-4">
      {/* Toast Notification Banner */}
      {statusMessage && (
        <div
          className={`p-3 rounded text-xs font-semibold flex items-center justify-between border ${
            statusMessage.type === 'success'
              ? 'bg-[#ecfdf5] border-[#a7f3d0] text-[#065f46]'
              : 'bg-[#fff1f2] border-[#fecdd3] text-[#9f1239]'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-[#059669]" />
            ) : (
              <AlertCircle className="w-4 h-4 text-[#e11d48]" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-gray-400 hover:text-gray-700 text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-[#0f172a] tracking-tight">
              Audit &amp; Assurance
            </h1>
            <span className="text-[10px] font-bold bg-[#eff4ff] text-[#1d4ed8] px-2 py-0.5 rounded border border-[#bfdbfe]">
              ISAE 3000 / ISO 14064-3 Verification
            </span>
            <span className="text-[10px] text-[#64748b] bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
              Role: <strong className="text-[#0f172a]">{user.role}</strong>
            </span>
          </div>
          <p className="text-xs text-[#64748b] mt-0.5">
            Examine submitted ESG activity ledgers, inspect Phase 2 evidence vaults, verify Phase 4 deterministic calculations, and issue statutory assurance findings.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchData}
            title="Refresh Audit Registry"
            className="p-1.5 bg-white border border-[#cbd5e1] hover:bg-[#f8fafc] text-[#475569] rounded shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingQueue ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleExportDossier}
            className="px-3 py-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-semibold rounded shadow-2xs flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Assurance Dossier</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
        <div className="bg-white border border-[#e2e8f0] rounded p-2.5">
          <div className="text-[9px] font-bold text-[#64748b] uppercase">TOTAL RECORDS</div>
          <div className="text-xl font-bold text-[#0f172a] tabular-nums">{summary?.totalRecords ?? '—'}</div>
          <div className="text-[9px] text-[#64748b]">In Audit Scope</div>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded p-2.5">
          <div className="text-[9px] font-bold text-[#64748b] uppercase">PENDING REVIEW</div>
          <div className="text-xl font-bold text-[#475569] tabular-nums">{summary?.pendingReviews ?? '—'}</div>
          <div className="text-[9px] text-[#64748b]">Awaiting Assurer</div>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded p-2.5">
          <div className="text-[9px] font-bold text-[#64748b] uppercase">IN REVIEW</div>
          <div className="text-xl font-bold text-[#0284c7] tabular-nums">{summary?.inReview ?? '—'}</div>
          <div className="text-[9px] text-[#0284c7]">Active Examination</div>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded p-2.5">
          <div className="text-[9px] font-bold text-[#64748b] uppercase">VERIFIED / ASSURED</div>
          <div className="text-xl font-bold text-[#059669] tabular-nums">{summary?.verified ?? '—'}</div>
          <div className="text-[9px] text-[#059669]">{summary?.completionPercentage ?? 0}% completed</div>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded p-2.5">
          <div className="text-[9px] font-bold text-[#64748b] uppercase">CLARIFICATION REQ.</div>
          <div className="text-xl font-bold text-[#d97706] tabular-nums">{summary?.clarificationsPending ?? '—'}</div>
          <div className="text-[9px] text-[#d97706]">Facility Query Open</div>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded p-2.5">
          <div className="text-[9px] font-bold text-[#64748b] uppercase">CORRECTION REQ.</div>
          <div className="text-xl font-bold text-[#e11d48] tabular-nums">{summary?.correctionRequired ?? '—'}</div>
          <div className="text-[9px] text-[#e11d48]">Ledger Discrepancy</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#e2e8f0] rounded p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-[#64748b] flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3" /> Filter:
          </span>
          {['ALL', 'PENDING_REVIEW', 'IN_REVIEW', 'VERIFIED', 'REQUIRES_CLARIFICATION', 'CORRECTION_REQUIRED'].map(
            (statusKey) => (
              <button
                key={statusKey}
                onClick={() => setStatusFilter(statusKey)}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                  statusFilter === statusKey
                    ? 'bg-[#1d4ed8] text-white'
                    : 'bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0]'
                }`}
              >
                {statusKey === 'ALL'
                  ? 'All'
                  : statusKey === 'REQUIRES_CLARIFICATION'
                  ? 'Clarification'
                  : statusKey === 'CORRECTION_REQUIRED'
                  ? 'Correction'
                  : statusKey.replace('_', ' ')}
              </button>
            )
          )}

          <div className="h-4 w-px bg-gray-200 mx-1" />

          <select
            value={scopeFilter || ''}
            onChange={(e) => setScopeFilter(e.target.value ? Number(e.target.value) : undefined)}
            className="h-6 px-1.5 text-[10px] font-semibold bg-white border border-[#cbd5e1] rounded text-[#334155]"
          >
            <option value="">All Scopes (1, 2, 3)</option>
            <option value="1">Scope 1 (Direct)</option>
            <option value="2">Scope 2 (Electricity)</option>
            <option value="3">Scope 3 (Value Chain)</option>
          </select>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2 top-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search records, facility, auditor..."
            className="w-full h-7 pl-7 pr-2 border border-[#cbd5e1] rounded text-xs focus:outline-hidden focus:border-[#1d4ed8]"
          />
        </div>
      </div>

      {/* Main Split Grid: Left Work Queue (Col 1), Right Review Dossier (Col 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Work Queue (5 cols on lg) */}
        <div className="lg:col-span-5 bg-white border border-[#e2e8f0] rounded p-3 space-y-2.5 flex flex-col h-[750px]">
          <div className="flex items-center justify-between pb-2 border-b border-[#f1f5f9]">
            <h3 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider flex items-center gap-1.5">
              <span>Audit Work Queue</span>
              <span className="text-[10px] text-[#1d4ed8] font-mono">({queue.length})</span>
            </h3>
            <span className="text-[10px] text-[#64748b]">Select item to inspect</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {loadingQueue ? (
              <div className="p-8 text-center text-xs text-[#64748b] space-y-2">
                <RefreshCw className="w-5 h-5 mx-auto animate-spin text-[#1d4ed8]" />
                <div>Loading audit work queue...</div>
              </div>
            ) : queue.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#64748b] border border-dashed rounded">
                No audit records matching selected criteria.
              </div>
            ) : (
              queue.map((item) => {
                const isSelected = item.reviewId === selectedReviewId;
                return (
                  <div
                    key={item.reviewId}
                    onClick={() => setSelectedReviewId(item.reviewId)}
                    className={`p-2.5 rounded border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#1d4ed8] bg-[#eff4ff] shadow-2xs'
                        : 'border-[#e2e8f0] bg-white hover:border-[#cbd5e1] hover:bg-[#f8fafc]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[11px] font-bold text-[#1d4ed8]">
                          {item.reviewId}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-gray-100 text-[#475569] border border-gray-200">
                          Scope {item.scopeNo}
                        </span>
                      </div>
                      {renderStatusBadge(item.auditStatus)}
                    </div>

                    <div className="text-xs font-semibold text-[#0f172a] line-clamp-1">
                      {item.activityName || item.activityTypeId}
                    </div>

                    <div className="text-[10px] text-[#64748b] mt-0.5 flex items-center justify-between">
                      <span>{item.projectId || item.companyId} · {item.facilityId || 'HQ'}</span>
                      <span className="font-mono font-semibold text-[#0f172a]">
                        {item.originalQuantity?.toLocaleString()} {item.originalUnit} ({item.originalCO2e} tCO2e)
                      </span>
                    </div>

                    {item.findingsCount > 0 && (
                      <div className="mt-1 flex items-center gap-1 text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded w-fit border border-amber-200">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        <span>{item.findingsCount} Finding(s) Logged</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Detailed Review Dossier (7 cols on lg) */}
        <div className="lg:col-span-7 bg-white border border-[#e2e8f0] rounded p-4 space-y-4 h-[750px] overflow-y-auto">
          {loadingDossier ? (
            <div className="h-full flex flex-col items-center justify-center text-xs text-[#64748b] space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-[#1d4ed8]" />
              <div>Fetching complete assurance dossier &amp; evidence links...</div>
            </div>
          ) : !dossier ? (
            <div className="h-full flex flex-col items-center justify-center text-xs text-[#64748b] space-y-2">
              <ShieldCheck className="w-10 h-10 text-gray-300" />
              <div>Select a record from the work queue to inspect findings and evidence.</div>
            </div>
          ) : (
            <>
              {/* Dossier Header */}
              <div className="pb-3 border-b border-[#e2e8f0] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#0f172a] uppercase">
                      AUDIT REVIEW: {dossier.review.reviewId}
                    </span>
                    {renderStatusBadge(dossier.review.auditStatus)}
                    <span className="text-[10px] font-mono text-[#64748b]">
                      Record: {dossier.review.activityId}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#64748b] mt-0.5">
                    Assigned: <strong className="text-[#0f172a]">{dossier.review.assignedAuditorName}</strong> · Framework: {dossier.review.assuranceLevel}
                  </div>
                </div>

                {dossier.permissions.canStartReview && (
                  <button
                    disabled={actionLoading}
                    onClick={handleStartReview}
                    className="px-3 py-1 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-semibold rounded shadow-2xs flex items-center gap-1.5 self-start sm:self-auto disabled:opacity-50"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Initiate Review</span>
                  </button>
                )}
              </div>

              {/* 1. Original Submitted Facility Data (Immutable Read) */}
              <div className="p-3 border border-[#cbd5e1] rounded bg-[#f8fafc] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#64748b] uppercase flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-[#e11d48]" />
                    <span>1. ORIGINAL SUBMITTED FACILITY LEDGER (IMMUTABLE)</span>
                  </span>
                  <span className="text-[9px] font-semibold text-[#059669] bg-[#ecfdf5] px-1.5 py-0.2 rounded border border-[#a7f3d0]">
                    Tamper-Proof
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  <div>
                    <span className="text-[10px] text-[#64748b] block">Activity Description</span>
                    <strong className="text-[#0f172a] line-clamp-1">{dossier.review.activityName}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#64748b] block">Reported Quantity</span>
                    <strong className="font-mono text-[#0f172a]">
                      {dossier.review.originalQuantity?.toLocaleString()} {dossier.review.originalUnit}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#64748b] block">Financial Spend</span>
                    <strong className="font-mono text-[#0f172a]">
                      ₹{(dossier.review.originalSpend || 0).toLocaleString()}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#64748b] block">Reporting Period</span>
                    <span className="font-mono text-[#475569]">{dossier.review.reportingPeriodId}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#64748b] block">Facility / Project</span>
                    <span className="font-mono text-[#475569]">{dossier.review.projectId || 'N/A'} · {dossier.review.facilityId || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#64748b] block">Invoice / Meter Ref</span>
                    <span className="font-mono text-[#475569]">
                      {dossier.activityRecord?.sourceReference || dossier.activityRecord?.invoiceOrMeterRef || 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="text-[9px] text-[#d97706] italic pt-1 border-t border-[#e2e8f0] flex items-center gap-1">
                  <Info className="w-3 h-3 shrink-0" />
                  <span>Statutory compliance rule: Auditors cannot alter or overwrite original submitted facility entries.</span>
                </div>
              </div>

              {/* 2. Phase 4 GHG Calculation & Factor Pipeline */}
              <div className="p-3 border border-[#cbd5e1] rounded bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#1d4ed8] uppercase flex items-center gap-1.5">
                    <Calculator className="w-3.5 h-3.5" />
                    <span>2. GHG PROTOCOL CALCULATION PIPELINE (PHASE 4 ENGINE)</span>
                  </span>
                  <span className="text-[9px] font-semibold text-[#1d4ed8] bg-[#eff4ff] px-1.5 py-0.2 rounded border border-[#bfdbfe]">
                    Deterministic
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center font-mono text-[11px]">
                  <div className="p-1.5 bg-[#f8fafc] border rounded">
                    <span className="text-[#64748b] block text-[9px] font-sans uppercase">INPUT QTY</span>
                    <span className="font-bold text-[#0f172a]">
                      {dossier.calculation.factor ? dossier.review.originalQuantity?.toLocaleString() : '0'} {dossier.review.originalUnit}
                    </span>
                  </div>
                  <div className="p-1.5 bg-[#f8fafc] border rounded">
                    <span className="text-[#64748b] block text-[9px] font-sans uppercase">EMISSION FACTOR</span>
                    <span className="font-bold text-[#1d4ed8]">{dossier.calculation.factor}</span>
                  </div>
                  <div className="p-1.5 bg-[#f8fafc] border rounded">
                    <span className="text-[#64748b] block text-[9px] font-sans uppercase">GROSS KG CO2e</span>
                    <span className="font-bold text-[#0f172a]">{dossier.calculation.grossKgCO2e?.toLocaleString()}</span>
                  </div>
                  <div className="p-1.5 bg-[#1d4ed8] text-white rounded">
                    <span className="text-white/80 block text-[9px] font-sans uppercase">REPORTED OUTPUT</span>
                    <span className="font-bold text-xs">{dossier.calculation.tCO2e} tCO2e</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-[#64748b] pt-1 border-t border-[#f1f5f9]">
                  <span>Registry Standard: <strong>{dossier.calculation.factorSource}</strong></span>
                  <span>Constituents: <strong>CO2 (99%) · CH4 (0.1%) · N2O (0.9%)</strong></span>
                </div>
              </div>

              {/* 3. Linked Phase 2 Evidence Vault Documents */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#64748b] uppercase flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-[#1d4ed8]" />
                    <span>3. LINKED EVIDENCE VAULT DOCUMENTS ({dossier.linkedEvidence?.length || 0})</span>
                  </span>
                  <span className="text-[10px] text-[#64748b]">SHA-256 Verified Integrity</span>
                </div>

                {dossier.linkedEvidence && dossier.linkedEvidence.length > 0 ? (
                  <div className="space-y-1.5">
                    {dossier.linkedEvidence.map((ev: any) => (
                      <div key={ev.documentId} className="p-2 border border-[#cbd5e1] rounded bg-[#f8fafc] flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-[#1d4ed8] shrink-0" />
                          <div>
                            <div className="font-semibold text-[#0f172a] flex items-center gap-2">
                              <span>{ev.originalFileName}</span>
                              <span className="text-[9px] px-1 rounded bg-white text-[#1d4ed8] border border-[#bfdbfe]">
                                {ev.evidenceType}
                              </span>
                            </div>
                            <div className="text-[9px] font-mono text-[#64748b]">
                              ID: {ev.documentId} · SHA-256: {(ev.checksum || '').slice(0, 24)}...
                            </div>
                          </div>
                        </div>

                        <DocumentActions document={ev} compact />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-2.5 border border-dashed border-[#cbd5e1] rounded text-[#64748b] text-[11px] text-center">
                    No primary evidence documents linked to this ledger entry yet.
                  </div>
                )}
              </div>

              {/* 4. Independent Auditor Re-Assessment & Variance Analysis */}
              <div className="p-3 border border-[#cbd5e1] rounded bg-[#f0fdf4] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#166534] uppercase flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#16a34a]" />
                    <span>4. INDEPENDENT AUDITOR ASSESSMENT &amp; VARIANCE ANALYSIS</span>
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    calculatedVariancePct === 0
                      ? 'bg-[#dcfce7] text-[#15803d] border-[#86efac]'
                      : 'bg-[#fef3c7] text-[#b45309] border-[#fde68a]'
                  }`}>
                    {calculatedVariancePct.toFixed(2)}% Discrepancy Variance
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-[#374151] block mb-0.5">
                      Verified Quantity ({dossier.review.originalUnit})
                    </label>
                    <input
                      type="number"
                      disabled={!dossier.permissions.canSaveAssessment}
                      value={verifiedQty}
                      onChange={(e) => setVerifiedQty(e.target.value)}
                      className="w-full h-7 px-2 border border-[#cbd5e1] rounded font-mono font-bold text-xs bg-white disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-[#374151] block mb-0.5">
                      Verified Factor (kgCO2e/unit)
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      disabled={!dossier.permissions.canSaveAssessment}
                      value={verifiedFactor}
                      onChange={(e) => setVerifiedFactor(e.target.value)}
                      className="w-full h-7 px-2 border border-[#cbd5e1] rounded font-mono font-bold text-xs bg-white disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-[#374151] block mb-0.5">
                      Assessed CO2e (tCO2e)
                    </label>
                    <div className="h-7 px-2 border border-[#cbd5e1] rounded font-mono font-bold text-xs bg-gray-50 flex items-center text-[#15803d]">
                      {currentVerifiedCO2e.toFixed(2)} tCO2e
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[#374151] block mb-0.5">
                    Assurance Level &amp; Mandate
                  </label>
                  <select
                    disabled={!dossier.permissions.canSaveAssessment}
                    value={assuranceLevel}
                    onChange={(e) => setAssuranceLevel(e.target.value)}
                    className="w-full h-7 px-2 border border-[#cbd5e1] rounded text-xs bg-white disabled:bg-gray-100"
                  >
                    <option value="ISAE_3000_LIMITED">ISAE 3000 Limited Assurance (Standard)</option>
                    <option value="REASONABLE_ASSURANCE">ISAE 3000 / ISO 14064-3 Reasonable Assurance</option>
                    <option value="INTERNAL_VERIFICATION">Internal MEIL 2nd-Party Verification</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[#374151] block mb-0.5">
                    Auditor Verification Observations &amp; Notes
                  </label>
                  <textarea
                    rows={2}
                    disabled={!dossier.permissions.canSaveAssessment}
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    placeholder="Enter observation notes, invoice verification checks, meter consistency..."
                    className="w-full p-2 border border-[#cbd5e1] rounded text-xs bg-white disabled:bg-gray-100 resize-none"
                  />
                </div>

                {dossier.permissions.canSaveAssessment && (
                  <div className="flex justify-end pt-1">
                    <button
                      disabled={savingAssessment}
                      onClick={handleSaveAssessment}
                      className="px-3 py-1 bg-[#16a34a] hover:bg-[#15803d] text-white font-semibold text-xs rounded shadow-2xs disabled:opacity-50"
                    >
                      {savingAssessment ? 'Saving...' : 'Save Assessment & Variance'}
                    </button>
                  </div>
                )}
              </div>

              {/* 5. Role-Aware Action Buttons Panel */}
              <div className="p-3 border border-[#cbd5e1] rounded bg-white space-y-2">
                <span className="text-[10px] font-bold text-[#0f172a] uppercase block">
                  5. ASSURANCE ACTIONS &amp; WORKFLOW
                </span>

                {/* Auditor Action Controls */}
                {user.role === 'AUDITOR' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <button
                      onClick={() => {
                        setConcludeDecision('VERIFY');
                        setConcludeNotes(observations || 'Statutory assurance sign-off confirmed without qualification.');
                        setShowConcludeModal(true);
                      }}
                      className="py-1.5 px-2 bg-[#16a34a] hover:bg-[#15803d] text-white font-semibold text-xs rounded text-center transition-colors shadow-2xs"
                    >
                      Verify &amp; Sign Off
                    </button>

                    <button
                      onClick={() => setShowClarificationModal(true)}
                      className="py-1.5 px-2 bg-white border border-[#cbd5e1] hover:bg-[#f8fafc] text-[#1d4ed8] font-semibold text-xs rounded text-center transition-colors"
                    >
                      Request Clarification
                    </button>

                    <button
                      onClick={() => {
                        setConcludeDecision('CORRECTION_REQUIRED');
                        setConcludeNotes('');
                        setShowConcludeModal(true);
                      }}
                      className="py-1.5 px-2 bg-white border border-[#fecdd3] hover:bg-[#fff1f2] text-[#e11d48] font-semibold text-xs rounded text-center transition-colors"
                    >
                      Correction Required
                    </button>

                    <button
                      onClick={() => setShowFindingModal(true)}
                      className="py-1.5 px-2 bg-white border border-[#bfdbfe] hover:bg-[#eff4ff] text-[#1d4ed8] font-semibold text-xs rounded text-center transition-colors flex items-center justify-center gap-1"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Log Finding</span>
                    </button>
                  </div>
                )}

                {/* Facility / BU / Company User Clarification Response Banner */}
                {['PROJECT_USER', 'BUSINESS_UNIT_USER', 'COMPANY_USER', 'GROUP_ADMIN'].includes(user.role) && (
                  <div className="space-y-2">
                    {dossier.review.auditStatus === 'REQUIRES_CLARIFICATION' && (
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Auditor has raised clarification queries on this facility entry.</span>
                        </div>
                        {dossier.clarifications?.find((c: any) => c.responseStatus === 'PENDING') && (
                          <button
                            onClick={() => {
                              const pending = dossier.clarifications.find((c: any) => c.responseStatus === 'PENDING');
                              if (pending) {
                                setActiveClarificationId(pending.clarificationId);
                                setShowResponseModal(true);
                              }
                            }}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded shadow-2xs shrink-0"
                          >
                            Respond Now
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Management User Read-only Notice */}
                {user.role === 'MANAGEMENT' && (
                  <div className="p-2 bg-gray-50 border border-gray-200 rounded text-xs text-[#64748b]">
                    Executive Board read-only view. Actions are reserved for accredited assurance partners.
                  </div>
                )}
              </div>

              {/* 6. Clarification Thread & Findings Register */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-[#64748b] uppercase block">
                  6. FINDINGS &amp; CLARIFICATION REGISTER
                </span>

                {/* Clarifications Thread */}
                {dossier.clarifications && dossier.clarifications.length > 0 && (
                  <div className="space-y-2">
                    {dossier.clarifications.map((clr: AuditClarification) => (
                      <div key={clr.clarificationId} className="p-2.5 border border-amber-200 rounded bg-[#fffbeb] space-y-1.5 text-xs">
                        <div className="flex items-center justify-between font-bold text-amber-900">
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3.5 h-3.5 text-amber-700" />
                            <span>Clarification Inquiry: {clr.clarificationId}</span>
                          </span>
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-amber-200 text-amber-800">
                            {clr.responseStatus}
                          </span>
                        </div>
                        <div className="text-amber-950 font-medium">{clr.question}</div>
                        <div className="text-[10px] text-amber-700">
                          Requested by {clr.requestedByName} ({clr.requestedByRole}) · {new Date(clr.requestedAt).toLocaleString()}
                        </div>

                        {clr.response ? (
                          <div className="mt-2 p-2 bg-white border border-amber-300 rounded text-xs text-slate-800">
                            <div className="font-bold text-[10px] text-[#059669] uppercase">
                              Facility Response ({clr.respondedByName} - {clr.respondedByRole})
                            </div>
                            <div className="mt-0.5">{clr.response}</div>
                            <div className="text-[9px] text-gray-500 mt-0.5">
                              Submitted {new Date(clr.respondedAt || 0).toLocaleString()}
                            </div>
                          </div>
                        ) : (
                          dossier.permissions.canRespondClarification && (
                            <div className="pt-1">
                              <button
                                onClick={() => {
                                  setActiveClarificationId(clr.clarificationId);
                                  setShowResponseModal(true);
                                }}
                                className="px-2.5 py-1 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-[10px] font-semibold rounded"
                              >
                                Submit Facility Response
                              </button>
                            </div>
                          )
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Findings Register */}
                {dossier.findings && dossier.findings.length > 0 && (
                  <div className="space-y-1.5">
                    {dossier.findings.map((f: AuditFinding) => (
                      <div key={f.findingId} className="p-2.5 border border-[#e2e8f0] rounded bg-white space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[#0f172a]">{f.findingId}</span>
                            {renderSeverityBadge(f.severity)}
                            <span className="text-[10px] text-[#64748b]">({f.category})</span>
                          </div>
                          <span className="text-[10px] font-bold text-[#d97706]">{f.status}</span>
                        </div>
                        <div className="font-semibold text-[#0f172a]">{f.title}</div>
                        <div className="text-[11px] text-[#475569]">{f.description}</div>
                        {f.recommendation && (
                          <div className="text-[11px] text-[#1d4ed8] bg-[#eff4ff] p-1.5 rounded">
                            <strong>Recommendation:</strong> {f.recommendation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 7. Immutable Audit Trail */}
              <div className="p-3 border border-[#e2e8f0] rounded bg-[#f8fafc] space-y-2">
                <span className="text-[10px] font-bold text-[#64748b] uppercase block">
                  7. IMMUTABLE ASSURANCE AUDIT LOG TRAIL
                </span>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {dossier.auditTrail && dossier.auditTrail.length > 0 ? (
                    dossier.auditTrail.map((lg: any) => (
                      <div key={lg.logId} className="p-1.5 bg-white border border-[#e2e8f0] rounded text-[10px] text-[#475569]">
                        <div className="flex items-center justify-between font-mono">
                          <strong className="text-[#1d4ed8]">{lg.action}</strong>
                          <span className="text-[#64748b]">{new Date(lg.timestamp).toLocaleString()}</span>
                        </div>
                        <div className="text-[#0f172a]">{lg.comments || 'Audit event logged'}</div>
                        <div className="text-[9px] text-[#64748b]">Actor: {lg.actorName || lg.actor} ({lg.role})</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-[11px] text-[#64748b] text-center py-2">No historical audit log events.</div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* MODAL 1: Add Finding */}
      {showFindingModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="font-bold text-sm text-[#0f172a]">Log Audit Finding / Observation</h3>
              <button onClick={() => setShowFindingModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleAddFinding} className="space-y-2.5 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-gray-700 block mb-0.5">Finding Title *</label>
                <input
                  required
                  value={findingForm.title}
                  onChange={(e) => setFindingForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Weighbridge Net vs Form 10 Consignment Variance"
                  className="w-full h-8 px-2 border rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-gray-700 block mb-0.5">Severity *</label>
                  <select
                    value={findingForm.severity}
                    onChange={(e) => setFindingForm((p) => ({ ...p, severity: e.target.value }))}
                    className="w-full h-8 px-2 border rounded"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-700 block mb-0.5">Category *</label>
                  <select
                    value={findingForm.category}
                    onChange={(e) => setFindingForm((p) => ({ ...p, category: e.target.value }))}
                    className="w-full h-8 px-2 border rounded"
                  >
                    <option value="DATA_DISCREPANCY">Data Discrepancy</option>
                    <option value="MISSING_EVIDENCE">Missing Evidence</option>
                    <option value="FACTOR_MISMATCH">Factor Mismatch</option>
                    <option value="METHODOLOGY">Methodology</option>
                    <option value="CALCULATION_ERROR">Calculation Error</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-700 block mb-0.5">Observation Description *</label>
                <textarea
                  required
                  rows={3}
                  value={findingForm.description}
                  onChange={(e) => setFindingForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Detail the technical or evidence variance observed..."
                  className="w-full p-2 border rounded"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-700 block mb-0.5">Recommendation</label>
                <textarea
                  rows={2}
                  value={findingForm.recommendation}
                  onChange={(e) => setFindingForm((p) => ({ ...p, recommendation: e.target.value }))}
                  placeholder="Prescribed corrective action for facility team..."
                  className="w-full p-2 border rounded"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowFindingModal(false)}
                  className="px-3 py-1.5 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-1.5 bg-[#1d4ed8] text-white font-semibold rounded hover:bg-[#1e40af] disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Save Finding'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Request Clarification */}
      {showClarificationModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="font-bold text-sm text-[#0f172a]">Request Clarification from Facility</h3>
              <button onClick={() => setShowClarificationModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleRequestClarification} className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                  Clarification Inquiry Question *
                </label>
                <textarea
                  required
                  rows={4}
                  value={clarificationQuestion}
                  onChange={(e) => setClarificationQuestion(e.target.value)}
                  placeholder="Specify missing document details, meter calibration discrepancies, or request auxiliary logbooks..."
                  className="w-full p-2 border rounded text-xs"
                />
              </div>

              <div className="text-[10px] text-[#64748b]">
                This question will be routed to the Facility Site Lead and Company ESG Manager.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowClarificationModal(false)}
                  className="px-3 py-1.5 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-1.5 bg-[#1d4ed8] text-white font-semibold rounded hover:bg-[#1e40af] disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send className="w-3 h-3" />
                  <span>{actionLoading ? 'Dispatching...' : 'Dispatch Request'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Respond to Clarification */}
      {showResponseModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="font-bold text-sm text-[#0f172a]">Respond to Auditor Clarification</h3>
              <button onClick={() => setShowResponseModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleRespondClarification} className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                  Facility Explanation &amp; Resolution *
                </label>
                <textarea
                  required
                  rows={4}
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Provide clarification, explanation of variance, or state supplementary document IDs attached..."
                  className="w-full p-2 border rounded text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowResponseModal(false)}
                  className="px-3 py-1.5 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-1.5 bg-[#059669] text-white font-semibold rounded hover:bg-[#047857] disabled:opacity-50"
                >
                  {actionLoading ? 'Submitting...' : 'Submit to Auditor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Conclude Audit */}
      {showConcludeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="font-bold text-sm text-[#0f172a]">
                Statutory Assurance Conclusion: {concludeDecision}
              </h3>
              <button onClick={() => setShowConcludeModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleConcludeAudit} className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-gray-700 block mb-1">Decision Outcome</label>
                <div className="p-2 rounded font-bold text-xs border" style={{
                  backgroundColor: concludeDecision === 'VERIFY' ? '#ecfdf5' : concludeDecision === 'REJECT' ? '#fef2f2' : '#fff1f2',
                  borderColor: concludeDecision === 'VERIFY' ? '#a7f3d0' : concludeDecision === 'REJECT' ? '#fca5a5' : '#fecdd3',
                  color: concludeDecision === 'VERIFY' ? '#065f46' : concludeDecision === 'REJECT' ? '#991b1b' : '#9f1239'
                }}>
                  {concludeDecision === 'VERIFY'
                    ? 'VERIFY & SIGN OFF ASSURANCE (ISAE 3000 / ISO 14064-3)'
                    : concludeDecision === 'REJECT'
                    ? 'REJECT LEDGER SUBMISSION'
                    : 'MARK CORRECTION REQUIRED (RETURN TO FACILITY)'}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                  Conclusion Statement &amp; Assurance Opinion *
                </label>
                <textarea
                  required
                  rows={4}
                  value={concludeNotes}
                  onChange={(e) => setConcludeNotes(e.target.value)}
                  placeholder="Record formal statutory verification statement or instructions for facility rectification..."
                  className="w-full p-2 border rounded text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowConcludeModal(false)}
                  className="px-3 py-1.5 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-1.5 bg-[#1d4ed8] text-white font-semibold rounded hover:bg-[#1e40af] disabled:opacity-50"
                >
                  {actionLoading ? 'Concluding...' : 'Confirm Conclusion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
