import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Share2,
  Printer,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  Plus,
  RefreshCw,
  Lock,
  ChevronRight,
  X,
  FileCheck,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { AuthUser, ReportRecord, ReportType, ReportStatus } from '../../types.ts';
import { api } from '../../services/api.ts';
import { PdfCanvasViewer } from '../common/PdfCanvasViewer.tsx';

interface ReportsPageProps {
  user: AuthUser;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ user }) => {
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [filterPeriod, setFilterPeriod] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'document' | 'pdfPreview' | 'disclosures' | 'validation' | 'history'>('document');
  const [showGenerateModal, setShowGenerateModal] = useState<boolean>(false);
  const [showChangesModal, setShowChangesModal] = useState<boolean>(false);
  const [changesComments, setChangesComments] = useState<string>('');
  const [showRevisionModal, setShowRevisionModal] = useState<boolean>(false);
  const [revisionComments, setRevisionComments] = useState<string>('');
  const [showApprovalModal, setShowApprovalModal] = useState<boolean>(false);
  const [approvalModalType, setApprovalModalType] = useState<'COMPANY' | 'AUDITOR' | 'FINALIZE'>('COMPANY');
  const [approvalNotes, setApprovalNotes] = useState<string>('');
  const [downloadingPdf, setDownloadingPdf] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Generate modal form state
  const [genReportType, setGenReportType] = useState<ReportType>('BRSR');
  const [genCompanyId, setGenCompanyId] = useState<string>(user.organizationId || 'COMP001');
  const [genPeriodId, setGenPeriodId] = useState<string>('Q3_FY2526');

  const fetchReports = async () => {
    try {
      setLoading(true);
      const [reps, tmpls] = await Promise.all([
        api.listReports(),
        api.getReportTemplates(),
      ]);
      setReports(reps);
      setTemplates(tmpls);

      // Auto-select first report if none selected
      if (!selectedReport && reps.length > 0) {
        setSelectedReport(reps[0]);
      } else if (selectedReport) {
        // Refresh selected report
        const refreshed = reps.find((r: ReportRecord) => r.reportId === selectedReport.reportId);
        if (refreshed) setSelectedReport(refreshed);
      }
    } catch (err: any) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleGenerateReport = async () => {
    try {
      setActionLoading(true);
      setActionMessage(null);
      const res = await api.generateReport({
        reportType: genReportType,
        companyId: genCompanyId,
        reportingPeriodId: genPeriodId,
      });

      setShowGenerateModal(false);
      setActionMessage({ text: `Report ${res.report.reportId} generated successfully!`, type: 'success' });
      await fetchReports();
      setSelectedReport(res.report);
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Failed to generate report', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (!selectedReport) return;
    try {
      setActionLoading(true);
      setActionMessage(null);
      const res = await api.submitReportForReview(selectedReport.reportId);
      setActionMessage({ text: 'Report submitted for formal review.', type: 'success' });
      setSelectedReport(res.report);
      await fetchReports();
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Failed to submit report', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!selectedReport || !changesComments.trim()) return;
    try {
      setActionLoading(true);
      setActionMessage(null);
      const res = await api.requestReportChanges(selectedReport.reportId, changesComments.trim());
      setShowChangesModal(false);
      setChangesComments('');
      setActionMessage({ text: 'Changes requested recorded on report.', type: 'success' });
      setSelectedReport(res.report);
      await fetchReports();
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Failed to request changes', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveReport = async () => {
    if (!selectedReport) return;
    try {
      setActionLoading(true);
      setActionMessage(null);
      const res = await api.approveReport(selectedReport.reportId);
      setActionMessage({ text: 'Report approved successfully!', type: 'success' });
      setSelectedReport(res.report);
      await fetchReports();
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Approval blocked by unresolved issues', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleLockReport = async () => {
    if (!selectedReport) return;
    try {
      setActionLoading(true);
      setActionMessage(null);
      const res = await api.lockReport(selectedReport.reportId);
      setActionMessage({ text: 'Report permanently locked and frozen.', type: 'success' });
      setSelectedReport(res.report);
      await fetchReports();
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Failed to lock report', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportPdf = async () => {
    if (!selectedReport) return;
    try {
      setActionLoading(true);
      setActionMessage(null);
      await api.exportReportPdf(selectedReport.reportId);
      setActionMessage({ text: 'PDF artifact generated and uploaded to Cloud Storage mirror!', type: 'success' });
      await fetchReports();
      const updated = await api.getReportById(selectedReport.reportId);
      setSelectedReport(updated);
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Failed to export PDF', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevalidate = async () => {
    if (!selectedReport) return;
    try {
      setActionLoading(true);
      setActionMessage(null);
      const res = await api.validateReport(selectedReport.reportId);
      setActionMessage({
        text: `Validation re-evaluated: ${res.validationSummary.blockingErrors} blockers, ${res.validationSummary.warnings} warnings.`,
        type: res.validationSummary.blockingErrors === 0 ? 'success' : 'error',
      });
      if (res.report) setSelectedReport(res.report);
      await fetchReports();
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Failed to re-validate report', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitRevision = async () => {
    if (!selectedReport || !revisionComments.trim()) return;
    try {
      setActionLoading(true);
      setActionMessage(null);
      const res = await api.submitReportRevision(selectedReport.reportId, revisionComments.trim());
      setShowRevisionModal(false);
      setRevisionComments('');
      setActionMessage({ text: `Revised version v${res.report.reportVersion}.0 submitted for review!`, type: 'success' });
      setSelectedReport(res.report);
      await fetchReports();
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Failed to submit revision', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompanyApprove = async () => {
    if (!selectedReport) return;
    try {
      setActionLoading(true);
      setActionMessage(null);
      const res = await api.companyApproveReport(selectedReport.reportId, approvalNotes || 'Company ESG Review & Approval recorded.');
      setShowApprovalModal(false);
      setApprovalNotes('');
      setActionMessage({ text: 'Company ESG Committee approval recorded!', type: 'success' });
      setSelectedReport(res.report);
      await fetchReports();
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Company approval failed', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAuditorApprove = async () => {
    if (!selectedReport) return;
    try {
      setActionLoading(true);
      setActionMessage(null);
      const res = await api.auditorApproveReport(selectedReport.reportId, approvalNotes || 'Statutory auditor ISAE 3000 assurance sign-off completed.');
      setShowApprovalModal(false);
      setApprovalNotes('');
      setActionMessage({ text: 'Independent auditor assurance sign-off recorded!', type: 'success' });
      setSelectedReport(res.report);
      await fetchReports();
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Auditor sign-off failed', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinalizeReport = async () => {
    if (!selectedReport) return;
    try {
      setActionLoading(true);
      setActionMessage(null);
      const res = await api.finalizeReport(selectedReport.reportId, approvalNotes || 'Report finalized and locked for statutory filing.');
      setShowApprovalModal(false);
      setApprovalNotes('');
      setActionMessage({ text: 'Report officially finalized, audited, and locked for statutory filing!', type: 'success' });
      setSelectedReport(res.report);
      await fetchReports();
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Finalization blocked', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!selectedReport) return;
    try {
      setDownloadingPdf(true);
      setActionMessage(null);
      await api.downloadReportPdf(selectedReport.reportId, `${selectedReport.reportId}_v${selectedReport.reportVersion}.pdf`);
      setActionMessage({ text: 'Official statutory PDF downloaded successfully!', type: 'success' });
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Failed to download report PDF', type: 'error' });
    } finally {
      setDownloadingPdf(false);
    }
  };

  const filteredReports = reports.filter((r) => {
    if (filterPeriod !== 'ALL' && r.reportingPeriodId !== filterPeriod) return false;
    if (filterType !== 'ALL' && r.reportType !== filterType) return false;
    return true;
  });

  const getStatusBadge = (status: ReportStatus) => {
    switch (status) {
      case 'APPROVED':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0]">APPROVED</span>;
      case 'LOCKED':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#f1f5f9] text-[#334155] border border-[#cbd5e1] flex items-center gap-1"><Lock className="w-2.5 h-2.5" /> LOCKED</span>;
      case 'READY_FOR_REVIEW':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe]">READY FOR REVIEW</span>;
      case 'UNDER_REVIEW':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#fefce8] text-[#ca8a04] border border-[#fef08a]">UNDER REVIEW</span>;
      case 'CHANGES_REQUESTED':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#fef2f2] text-[#dc2626] border border-[#fecaca]">CHANGES REQUESTED</span>;
      case 'VALIDATION_FAILED':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#fff7ed] text-[#ea580c] border border-[#ffedd5]">BLOCKERS IDENTIFIED</span>;
      case 'DRAFT':
      default:
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#f8fafc] text-[#64748b] border border-[#e2e8f0]">DRAFT</span>;
    }
  };

  const canApprove = (user.role === 'GROUP_ADMIN' || user.permissions?.includes('APPROVE_REPORT')) && (selectedReport?.validationSummary?.blockingErrors || 0) === 0;

  return (
    <div className="space-y-5">
      {/* Action Notification Alert */}
      {actionMessage && (
        <div className={`p-3 rounded-md text-xs font-semibold flex items-center justify-between ${
          actionMessage.type === 'success' ? 'bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]' : 'bg-[#fef2f2] text-[#991b1b] border border-[#fecaca]'
        }`}>
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-[#059669]" /> : <AlertTriangle className="w-4 h-4 text-[#dc2626]" />}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-gray-400 hover:text-gray-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#0f172a] tracking-tight">
              Reports &amp; Disclosures
            </h1>
            <span className="text-[10px] font-bold bg-[#eff4ff] text-[#1d4ed8] px-2 py-0.5 rounded border border-[#bfdbfe]">
              PHASE 7 ENGINE ACTIVE
            </span>
          </div>
          <p className="text-xs text-[#64748b] mt-0.5">
            Consolidate approved ESG registries into official SEBI BRSR Core, ESG Summary, and GHG Inventory statutory dossiers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchReports}
            disabled={loading}
            className="px-3 py-1.5 bg-white border border-[#cbd5e1] hover:bg-[#f8fafc] text-xs font-semibold text-[#334155] rounded shadow-2xs flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          {user.role !== 'AUDITOR' && user.role !== 'MANAGEMENT' && (
            <button
              onClick={() => setShowGenerateModal(true)}
              className="px-3.5 py-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-semibold rounded shadow-2xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Generate Report Draft</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Overview Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#e2e8f0] rounded-md p-3.5 space-y-2">
          <span className="text-[11px] font-bold text-[#64748b] uppercase">Total Reports</span>
          <div className="text-2xl font-bold text-[#0f172a]">{reports.length}</div>
          <div className="text-[11px] text-[#64748b]">Across all organizational tiers</div>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-md p-3.5 space-y-2">
          <span className="text-[11px] font-bold text-[#059669] uppercase">Approved &amp; Certified</span>
          <div className="text-2xl font-bold text-[#059669]">
            {reports.filter((r) => r.reportStatus === 'APPROVED' || r.reportStatus === 'LOCKED').length}
          </div>
          <div className="text-[11px] text-[#64748b]">Statutory sign-off complete</div>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-md p-3.5 space-y-2">
          <span className="text-[11px] font-bold text-[#ea580c] uppercase">Under Review / Draft</span>
          <div className="text-2xl font-bold text-[#ea580c]">
            {reports.filter((r) => r.reportStatus === 'UNDER_REVIEW' || r.reportStatus === 'READY_FOR_REVIEW' || r.reportStatus === 'VALIDATION_FAILED').length}
          </div>
          <div className="text-[11px] text-[#64748b]">Awaiting validation or sign-off</div>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-md p-3.5 space-y-2">
          <span className="text-[11px] font-bold text-[#1d4ed8] uppercase">Active Cloud Storage</span>
          <div className="text-xs font-semibold text-[#0f172a] truncate">bput-hackathon-37dfd</div>
          <div className="text-[11px] text-[#059669]">Firestore db connected</div>
        </div>
      </div>

      {/* Reports Registry Table & Controls */}
      <div className="bg-white border border-[#e2e8f0] rounded-md overflow-hidden">
        <div className="p-3.5 border-b border-[#e2e8f0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider">
              Statutory Disclosures &amp; Reports Registry
            </h3>
            <span className="text-[11px] text-[#64748b]">Showing {filteredReports.length} dossiers</span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-xs bg-[#f8fafc] border border-[#cbd5e1] rounded px-2.5 py-1 text-[#334155]"
            >
              <option value="ALL">All Frameworks</option>
              <option value="BRSR">SEBI BRSR Core</option>
              <option value="ESG_SUMMARY">ESG Summary</option>
              <option value="GHG_INVENTORY">GHG Inventory</option>
            </select>

            <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
              className="text-xs bg-[#f8fafc] border border-[#cbd5e1] rounded px-2.5 py-1 text-[#334155]"
            >
              <option value="ALL">All Reporting Periods</option>
              <option value="Q3_FY2526">Q3 FY25-26</option>
              <option value="Q2_FY2526">Q2 FY25-26</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#f8fafc] text-[#475569] text-[10px] uppercase font-bold border-b border-[#cbd5e1]">
                <th className="py-2.5 px-3">REPORT DOSSIER</th>
                <th className="py-2.5 px-3">ENTITY / COMPANY</th>
                <th className="py-2.5 px-3">PERIOD</th>
                <th className="py-2.5 px-3">TYPE</th>
                <th className="py-2.5 px-3 text-center">VERSION</th>
                <th className="py-2.5 px-3 text-center">STATUS</th>
                <th className="py-2.5 px-3 text-center">BLOCKERS</th>
                <th className="py-2.5 px-3 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {filteredReports.map((rep) => {
                const isSelected = selectedReport?.reportId === rep.reportId;
                const blockers = rep.validationSummary?.blockingErrors || 0;
                return (
                  <tr
                    key={rep.reportId}
                    className={`hover:bg-[#f8fafc] transition-colors cursor-pointer ${isSelected ? 'bg-[#eff6ff]/60' : ''}`}
                    onClick={() => setSelectedReport(rep)}
                  >
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-[#0f172a] flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-[#1d4ed8]" />
                        <span>{rep.title}</span>
                      </div>
                      <div className="text-[10px] font-mono text-[#64748b]">{rep.reportId}</div>
                    </td>
                    <td className="py-2.5 px-3 text-[#334155]">{rep.companyName}</td>
                    <td className="py-2.5 px-3 text-[#334155]">{rep.fiscalYear} ({rep.quarter})</td>
                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-[#1d4ed8]">{rep.reportType}</span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-semibold">
                      v{rep.reportVersion}.0
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {getStatusBadge(rep.reportStatus)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {blockers > 0 ? (
                        <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#fef2f2] text-[#dc2626]">
                          {blockers} Blocker{blockers > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#ecfdf5] text-[#059669]">
                          0 Blockers
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedReport(rep);
                        }}
                        className="text-[#1d4ed8] font-bold hover:underline"
                      >
                        Inspect Dossier
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredReports.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#64748b]">
                    No report dossiers found matching selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Dossier Inspector / Preview */}
      {selectedReport && (
        <div className="bg-white border border-[#e2e8f0] rounded-md overflow-hidden shadow-xs">
          {/* Inspector Header */}
          <div className="p-4 sm:p-5 border-b border-[#e2e8f0] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#fafbfc]">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-base sm:text-lg font-bold text-[#0f172a]">{selectedReport.title}</h2>
                {getStatusBadge(selectedReport.reportStatus)}
                <span className="text-[10px] font-mono bg-[#f1f5f9] text-[#475569] px-2 py-0.5 rounded border border-[#cbd5e1]">
                  Version {selectedReport.reportVersion}.0
                </span>
              </div>
              <p className="text-xs text-[#64748b] mt-1">
                {selectedReport.companyName} · Reporting Period: {selectedReport.fiscalYear} ({selectedReport.quarter}) · Boundary: {selectedReport.reportingBoundaryReference}
              </p>
            </div>

            {/* Governance Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Submit for review button */}
              {selectedReport.reportStatus === 'VALIDATION_FAILED' || selectedReport.reportStatus === 'READY_FOR_REVIEW' || selectedReport.reportStatus === 'DRAFT' ? (
                <button
                  onClick={handleSubmitForReview}
                  disabled={actionLoading}
                  className="px-3 py-1.5 bg-[#eff6ff] hover:bg-[#dbeafe] text-[#1d4ed8] border border-[#bfdbfe] rounded text-xs font-semibold"
                >
                  Submit For Review
                </button>
              ) : null}

              {/* Submit Revised Version button when CHANGES_REQUESTED */}
              {selectedReport.reportStatus === 'CHANGES_REQUESTED' && (user.role === 'GROUP_ADMIN' || user.role === 'COMPANY_USER') && (
                <button
                  onClick={() => setShowRevisionModal(true)}
                  disabled={actionLoading}
                  className="px-3.5 py-1.5 bg-[#eff6ff] hover:bg-[#dbeafe] text-[#1d4ed8] border border-[#bfdbfe] rounded text-xs font-semibold flex items-center gap-1 shadow-2xs"
                  title="Submit revised report addressing requested changes"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#1d4ed8]" />
                  <span>Submit Revised Version (v{selectedReport.reportVersion + 1}.0)</span>
                </button>
              )}

              {/* Request changes button */}
              {(selectedReport.reportStatus === 'UNDER_REVIEW' || selectedReport.reportStatus === 'READY_FOR_REVIEW') &&
                (user.role === 'GROUP_ADMIN' || user.role === 'COMPANY_USER' || user.role === 'AUDITOR') && (
                  <button
                    onClick={() => setShowChangesModal(true)}
                    disabled={actionLoading}
                    className="px-3 py-1.5 bg-[#fff7ed] hover:bg-[#ffedd5] text-[#c2410c] border border-[#fed7aa] rounded text-xs font-semibold"
                  >
                    Request Changes
                  </button>
                )}

              {/* Approve button */}
              {(selectedReport.reportStatus === 'UNDER_REVIEW' || selectedReport.reportStatus === 'READY_FOR_REVIEW' || selectedReport.reportStatus === 'VALIDATION_FAILED') && (
                <button
                  onClick={handleApproveReport}
                  disabled={actionLoading || !canApprove}
                  title={!canApprove ? 'Approval blocked: Unresolved reconciliation cases or audit findings exist' : 'Approve report'}
                  className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1 ${
                    canApprove
                      ? 'bg-[#059669] hover:bg-[#047857] text-white shadow-2xs'
                      : 'bg-[#f1f5f9] text-[#94a3b8] cursor-not-allowed border border-[#cbd5e1]'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Approve Report</span>
                </button>
              )}

              {/* Lock button */}
              {selectedReport.reportStatus === 'APPROVED' && user.role === 'GROUP_ADMIN' && (
                <button
                  onClick={handleLockReport}
                  disabled={actionLoading}
                  className="px-3 py-1.5 bg-[#334155] hover:bg-[#1e293b] text-white rounded text-xs font-semibold flex items-center gap-1"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Lock Version</span>
                </button>
              )}

              {/* PDF Export Button */}
              <button
                onClick={handleExportPdf}
                disabled={actionLoading}
                className="px-3 py-1.5 bg-white border border-[#cbd5e1] hover:bg-[#f8fafc] text-xs font-semibold text-[#334155] rounded flex items-center gap-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
                <span>{selectedReport.exportArtifacts?.pdfStoragePath ? 'Regenerate PDF' : 'Generate PDF'}</span>
              </button>

              {/* PDF Download Link */}
              {selectedReport.exportArtifacts?.pdfStoragePath && (
                <button
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  className="px-3.5 py-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
                  title="Download verified official statutory PDF dossier"
                >
                  <Download className={`w-3.5 h-3.5 ${downloadingPdf ? 'animate-spin' : ''}`} />
                  <span>{downloadingPdf ? 'Downloading...' : 'Download Official PDF'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Dossier Navigation Tabs */}
          <div className="flex border-b border-[#e2e8f0] px-4 bg-white text-xs">
            <button
              onClick={() => setActiveTab('document')}
              className={`py-3 px-3 font-semibold border-b-2 flex items-center gap-1.5 ${
                activeTab === 'document' ? 'border-[#1d4ed8] text-[#1d4ed8]' : 'border-transparent text-[#64748b] hover:text-[#0f172a]'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Report Document Preview</span>
            </button>
            <button
              onClick={() => setActiveTab('pdfPreview')}
              className={`py-3 px-3 font-semibold border-b-2 flex items-center gap-1.5 ${
                activeTab === 'pdfPreview' ? 'border-[#1d4ed8] text-[#1d4ed8]' : 'border-transparent text-[#64748b] hover:text-[#0f172a]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Official PDF Document Viewer</span>
            </button>
            <button
              onClick={() => setActiveTab('disclosures')}
              className={`py-3 px-3 font-semibold border-b-2 flex items-center gap-1.5 ${
                activeTab === 'disclosures' ? 'border-[#1d4ed8] text-[#1d4ed8]' : 'border-transparent text-[#64748b] hover:text-[#0f172a]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Disclosure Compliance Matrix</span>
            </button>
            <button
              onClick={() => setActiveTab('validation')}
              className={`py-3 px-3 font-semibold border-b-2 flex items-center gap-1.5 ${
                activeTab === 'validation' ? 'border-[#1d4ed8] text-[#1d4ed8]' : 'border-transparent text-[#64748b] hover:text-[#0f172a]'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-[#ea580c]" />
              <span>
                Validation &amp; Blockers ({selectedReport.validationSummary?.totalIssues || 0})
              </span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-3 px-3 font-semibold border-b-2 flex items-center gap-1.5 ${
                activeTab === 'history' ? 'border-[#1d4ed8] text-[#1d4ed8]' : 'border-transparent text-[#64748b] hover:text-[#0f172a]'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Audit History &amp; Lineage</span>
            </button>
          </div>

          {/* Tab 1: Structured Business Report Preview */}
          {activeTab === 'document' && (
            <div className="p-5 sm:p-6 space-y-6">
              {/* Highlight KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded">
                  <span className="text-[#64748b] block text-[10px] font-bold">SCOPE 1 (DIRECT)</span>
                  <span className="text-lg font-bold text-[#0f172a]">
                    {selectedReport.snapshot.scopeTotals.scope1Tons !== null
                      ? `${selectedReport.snapshot.scopeTotals.scope1Tons.toLocaleString('en-IN')} t`
                      : 'DATA MISSING'}
                  </span>
                  <span className="text-[10px] text-[#64748b] block">Diesel &amp; Natural Gas</span>
                </div>

                <div className="p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded">
                  <span className="text-[#64748b] block text-[10px] font-bold">SCOPE 2 (GRID)</span>
                  <span className="text-lg font-bold text-[#0f172a]">
                    {selectedReport.snapshot.scopeTotals.scope2Tons !== null
                      ? `${selectedReport.snapshot.scopeTotals.scope2Tons.toLocaleString('en-IN')} t`
                      : 'DATA MISSING'}
                  </span>
                  <span className="text-[10px] text-[#64748b] block">CEA Baseline v19</span>
                </div>

                <div className="p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded">
                  <span className="text-[#64748b] block text-[10px] font-bold">SCOPE 3 (VALUE CHAIN)</span>
                  <span className="text-lg font-bold text-[#0f172a]">
                    {selectedReport.snapshot.scopeTotals.scope3Tons !== null
                      ? `${selectedReport.snapshot.scopeTotals.scope3Tons.toLocaleString('en-IN')} t`
                      : 'DATA MISSING'}
                  </span>
                  <span className="text-[10px] text-[#64748b] block">Steel, Freight &amp; Waste</span>
                </div>

                <div className="p-3 bg-[#eff6ff] border border-[#bfdbfe] rounded">
                  <span className="text-[#1d4ed8] block text-[10px] font-bold">COMBINED SCOPE 1 + 2</span>
                  <span className="text-lg font-bold text-[#1e40af]">
                    {selectedReport.snapshot.scopeTotals.scope12Combined !== null
                      ? `${selectedReport.snapshot.scopeTotals.scope12Combined.toLocaleString('en-IN')} t`
                      : 'DATA MISSING'}
                  </span>
                  <span className="text-[10px] text-[#1d4ed8] block">SEBI Core Baseline</span>
                </div>

                <div className="p-3 bg-[#ecfdf5] border border-[#a7f3d0] rounded">
                  <span className="text-[#059669] block text-[10px] font-bold">GROSS CONSOLIDATED</span>
                  <span className="text-lg font-bold text-[#065f46]">
                    {selectedReport.snapshot.scopeTotals.totalTons !== null
                      ? `${selectedReport.snapshot.scopeTotals.totalTons.toLocaleString('en-IN')} t`
                      : 'DATA MISSING'}
                  </span>
                  <span className="text-[10px] text-[#059669] block">Total Carbon Footprint</span>
                </div>
              </div>

              {/* Greenhouse Gas Protocol Inventory Table */}
              <div className="border border-[#e2e8f0] rounded-md overflow-hidden">
                <div className="bg-[#f8fafc] px-4 py-2.5 border-b border-[#e2e8f0] font-bold text-xs text-[#0f172a]">
                  Greenhouse Gas Emissions Inventory (ISO 14064-1 &amp; GHG Protocol Protocol Protocol)
                </div>
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#f1f5f9] text-[#475569] text-[10px] uppercase font-bold">
                    <tr>
                      <th className="py-2 px-3">Emission Scope</th>
                      <th className="py-2 px-3">Boundary &amp; Factor Basis</th>
                      <th className="py-2 px-3 text-right">Calculated CO2e (Tonnes)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f5f9]">
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-[#0f172a]">Scope 1: Direct Combustion</td>
                      <td className="py-2.5 px-3 text-[#64748b]">Stationary diesel generators, auxiliary boilers &amp; fugitive refrigerants</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[#0f172a]">
                        {selectedReport.snapshot.scopeTotals.scope1Tons?.toFixed(2) || 'DATA MISSING'} tCO2e
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-[#0f172a]">Scope 2: Purchased Electricity</td>
                      <td className="py-2.5 px-3 text-[#64748b]">Location-based regional grid factor (CEA Baseline v19: 0.716 kgCO2e/kWh)</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[#0f172a]">
                        {selectedReport.snapshot.scopeTotals.scope2Tons?.toFixed(2) || 'DATA MISSING'} tCO2e
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-[#0f172a]">Scope 3: Upstream &amp; Downstream</td>
                      <td className="py-2.5 px-3 text-[#64748b]">Purchased goods (rebars), freight logistics (GLEC), hazardous waste manifest</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[#0f172a]">
                        {selectedReport.snapshot.scopeTotals.scope3Tons?.toFixed(2) || 'DATA MISSING'} tCO2e
                      </td>
                    </tr>
                    <tr className="bg-[#eff6ff] font-bold text-[#1e40af]">
                      <td className="py-2.5 px-3">Combined Scope 1 + 2 Statutory Total</td>
                      <td className="py-2.5 px-3 text-xs font-normal">Official mandatory threshold under SEBI Listing Regulations</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        {selectedReport.snapshot.scopeTotals.scope12Combined?.toFixed(2) || 'DATA MISSING'} tCO2e
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Gas Breakdown & Scope 3 Categories Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Gas Breakdown */}
                <div className="border border-[#e2e8f0] rounded-md overflow-hidden">
                  <div className="bg-[#f8fafc] px-3.5 py-2 border-b border-[#e2e8f0] font-bold text-xs text-[#0f172a]">
                    Disaggregated Gas Species (IPCC AR5 GWP)
                  </div>
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#f1f5f9] text-[#475569] text-[10px] uppercase font-bold">
                      <tr>
                        <th className="py-2 px-3">Scope</th>
                        <th className="py-2 px-3">Gas Species</th>
                        <th className="py-2 px-3 text-right">Tonnage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f1f5f9]">
                      {selectedReport.snapshot.gasBreakdown?.map((g, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3">Scope {g.scope}</td>
                          <td className="py-2 px-3 font-semibold">{g.gas}</td>
                          <td className="py-2 px-3 text-right font-mono">{g.emissionsTons.toFixed(2)} {g.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Scope 3 Categories */}
                <div className="border border-[#e2e8f0] rounded-md overflow-hidden">
                  <div className="bg-[#f8fafc] px-3.5 py-2 border-b border-[#e2e8f0] font-bold text-xs text-[#0f172a]">
                    Scope 3 Value Chain Categories
                  </div>
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#f1f5f9] text-[#475569] text-[10px] uppercase font-bold">
                      <tr>
                        <th className="py-2 px-3">Category</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3 text-right">Tonnage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f1f5f9]">
                      {selectedReport.snapshot.scope3CategoryTotals?.map((cat, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 font-semibold">Cat {cat.categoryNo}: {cat.categoryName}</td>
                          <td className="py-2 px-3">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#ecfdf5] text-[#059669]">
                              {cat.dataStatus}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono">{cat.emissionsTons.toFixed(2)} {cat.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Assurance & Governance Certification Box */}
              <div className="p-4 bg-[#f8fafc] border border-[#cbd5e1] rounded-md space-y-3 text-xs">
                <div className="flex items-center gap-2 text-[#0f172a] font-bold">
                  <ShieldCheck className="w-5 h-5 text-[#059669]" />
                  <span>Statutory Third-Party Assurance Opinion (ISAE 3000 / ISO 14064-3)</span>
                </div>
                <p className="text-[#475569]">
                  Assurance engagement performed by <strong>Dr. Ananya Sen, Climate &amp; Sustainability Services, EY LLP</strong>. All underlying activity ledgers have undergone deterministic cross-verification with utility feeder meters and IOCL tax delivery logs.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#e2e8f0] text-[11px] text-[#64748b]">
                  <div>Facilities In Boundary: <strong className="text-[#0f172a]">{selectedReport.snapshot.coverage?.facilitiesIncluded || 4} Sites</strong></div>
                  <div>Activities Consolidated: <strong className="text-[#0f172a]">{selectedReport.snapshot.coverage?.totalActivities || 0} Records</strong></div>
                  <div>Verified Reviews: <strong className="text-[#059669]">{selectedReport.snapshot.coverage?.verifiedActivities || 0} Verified</strong></div>
                  <div>Open Reconciliations: <strong className={selectedReport.snapshot.coverage?.openReconciliationCount === 0 ? 'text-[#059669]' : 'text-[#dc2626]'}>
                    {selectedReport.snapshot.coverage?.openReconciliationCount || 0} Open
                  </strong></div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Embedded PDF Previewer */}
          {activeTab === 'pdfPreview' && (
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between bg-[#f8fafc] border border-[#e2e8f0] p-3 rounded text-xs">
                <div>
                  <div className="font-bold text-[#0f172a]">{selectedReport.title} · Official Artifact</div>
                  <div className="text-[11px] text-[#64748b] font-mono mt-0.5">
                    Storage: {selectedReport.exportArtifacts?.pdfStoragePath || 'Generated on-demand'} · SHA-256: {selectedReport.exportArtifacts?.pdfChecksum || selectedReport.snapshotReference}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportPdf}
                    disabled={actionLoading}
                    className="px-3 py-1.5 bg-white border border-[#cbd5e1] hover:bg-[#f8fafc] text-xs font-semibold text-[#334155] rounded flex items-center gap-1 shadow-2xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
                    <span>Regenerate PDF</span>
                  </button>
                  <button
                    onClick={handleDownloadPdf}
                    disabled={downloadingPdf}
                    className="px-3.5 py-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
                  >
                    <Download className={`w-3.5 h-3.5 ${downloadingPdf ? 'animate-spin' : ''}`} />
                    <span>Download Official PDF</span>
                  </button>
                </div>
              </div>

              <PdfCanvasViewer
                url={api.getReportPreviewUrl(selectedReport.reportId)}
                title={selectedReport.title}
                heightClass="h-[75vh]"
              />
            </div>
          )}

          {/* Tab 2: Disclosure Compliance Matrix */}
          {activeTab === 'disclosures' && (
            <div className="p-5">
              <div className="border border-[#e2e8f0] rounded-md overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#f8fafc] text-[#475569] text-[10px] uppercase font-bold border-b border-[#cbd5e1]">
                    <tr>
                      <th className="py-2.5 px-3">CODE</th>
                      <th className="py-2.5 px-3">DISCLOSURE TITLE &amp; SECTION</th>
                      <th className="py-2.5 px-3 text-center">STATUS</th>
                      <th className="py-2.5 px-3 text-right">REPORTED VALUE / RESULT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f5f9]">
                    {Object.values(selectedReport.snapshot.disclosures || {}).map((d) => (
                      <tr key={d.disclosureCode} className="hover:bg-[#f8fafc]">
                        <td className="py-2.5 px-3 font-mono font-semibold text-[#1d4ed8]">
                          {d.disclosureCode}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-[#0f172a]">{d.disclosureName}</div>
                          <div className="text-[10px] text-[#64748b]">{d.section}</div>
                          {d.missingReason && (
                            <div className="text-[10px] text-[#ea580c] mt-0.5">Note: {d.missingReason}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            d.status === 'COMPLETE' ? 'bg-[#ecfdf5] text-[#059669]' :
                            d.status === 'READY_FOR_REVIEW' ? 'bg-[#eff6ff] text-[#1d4ed8]' :
                            d.status === 'DATA_MISSING' ? 'bg-[#fff7ed] text-[#ea580c]' : 'bg-[#f1f5f9] text-[#64748b]'
                          }`}>
                            {d.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-[#0f172a]">
                          {d.formattedValue || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: Validation Issues & Blockers */}
          {activeTab === 'validation' && (
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f0]">
                <h3 className="text-xs font-bold text-[#0f172a] uppercase">
                  Readiness Assessment &amp; Statutory Blockers
                </h3>
                <span className="text-xs text-[#64748b]">
                  {selectedReport.validationSummary?.blockingErrors || 0} Blocking Errors · {selectedReport.validationSummary?.warnings || 0} Warnings
                </span>
              </div>

              {selectedReport.validationSummary?.issues?.map((iss) => (
                <div
                  key={iss.issueId}
                  className={`p-3.5 rounded-md border text-xs space-y-1 ${
                    iss.blockingFlag ? 'bg-[#fef2f2] border-[#fecaca]' : 'bg-[#fffbeb] border-[#fef08a]'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <div className="flex items-center gap-1.5">
                      {iss.blockingFlag ? (
                        <XCircle className="w-4 h-4 text-[#dc2626]" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-[#d97706]" />
                      )}
                      <span className={iss.blockingFlag ? 'text-[#991b1b]' : 'text-[#92400e]'}>
                        [{iss.issueCode}] {iss.blockingFlag ? 'BLOCKING ERROR' : 'STATUTORY WARNING'}
                      </span>
                    </div>
                    {iss.disclosureId && (
                      <span className="font-mono text-[10px] text-[#64748b] bg-white px-1.5 py-0.5 rounded border border-[#e2e8f0]">
                        {iss.disclosureId}
                      </span>
                    )}
                  </div>
                  <p className="text-[#334155]">{iss.message}</p>
                  <div className="text-[11px] text-[#475569] pt-1">
                    <strong>Recommended Action:</strong> {iss.recommendedAction}
                  </div>
                </div>
              ))}

              {(!selectedReport.validationSummary?.issues || selectedReport.validationSummary.issues.length === 0) && (
                <div className="p-8 text-center bg-[#f8fafc] border border-[#e2e8f0] rounded-md text-[#059669]">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2" />
                  <div className="font-bold">Zero Blockers Identified</div>
                  <p className="text-xs text-[#64748b]">Report satisfies all eligibility constraints for formal approval.</p>
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Audit History & Lineage */}
          {activeTab === 'history' && (
            <div className="p-5 space-y-4">
              <div className="border border-[#e2e8f0] rounded-md p-4 bg-[#f8fafc] space-y-2 text-xs">
                <div className="font-bold text-[#0f172a]">Cryptographic Snapshot Reference</div>
                <div className="font-mono text-[#1d4ed8] bg-white p-2 rounded border border-[#cbd5e1] text-[11px]">
                  {selectedReport.snapshotReference}
                </div>
                <p className="text-[11px] text-[#64748b]">
                  This immutable SHA-256 fingerprint represents the frozen state of all underlying calculations, activities, and audit outcomes. Historical reports will never change when new operational records are entered.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#0f172a] uppercase">Workflow Transition History</h4>
                <div className="space-y-2">
                  {selectedReport.history?.map((h, idx) => (
                    <div key={idx} className="p-3 bg-white border border-[#e2e8f0] rounded-md text-xs flex items-start gap-3">
                      <div className="p-1.5 bg-[#eff6ff] rounded text-[#1d4ed8]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between font-bold text-[#0f172a]">
                          <span>{h.action.replace(/_/g, ' ')}</span>
                          <span className="font-normal text-[10px] text-[#64748b]">
                            {new Date(h.timestamp).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#475569]">{h.notes}</div>
                        <div className="text-[10px] text-[#64748b] mt-0.5">
                          Performed by: <strong>{h.performedByName}</strong> ({h.performedByRole})
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Generate Report Draft */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 space-y-4 border border-[#cbd5e1]">
            <div className="flex items-center justify-between pb-3 border-b border-[#e2e8f0]">
              <h3 className="text-sm font-bold text-[#0f172a]">Generate Statutory Report Dossier</h3>
              <button onClick={() => setShowGenerateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#334155] mb-1">Report Framework &amp; Type</label>
                <select
                  value={genReportType}
                  onChange={(e) => setGenReportType(e.target.value as ReportType)}
                  className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded p-2 text-[#0f172a]"
                >
                  <option value="BRSR">SEBI BRSR Core Statutory Report (Listed Mandate)</option>
                  <option value="ESG_SUMMARY">Operational ESG Performance Summary</option>
                  <option value="GHG_INVENTORY">Comprehensive GHG Protocol Inventory (Scope 1, 2, 3)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#334155] mb-1">Company / Legal Entity</label>
                <select
                  value={genCompanyId}
                  onChange={(e) => setGenCompanyId(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded p-2 text-[#0f172a]"
                >
                  <option value="COMP001">MEIL Company A (Megha Hydro Infra Ltd)</option>
                  <option value="COMP002">MEIL Company B (Transmission Grid)</option>
                  <option value="GROUP001">MEIL Group (Consolidated Headquarters)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#334155] mb-1">Reporting Period</label>
                <select
                  value={genPeriodId}
                  onChange={(e) => setGenPeriodId(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded p-2 text-[#0f172a]"
                >
                  <option value="Q3_FY2526">FY 2025-26 (Q3: Oct - Dec 2025)</option>
                  <option value="Q2_FY2526">FY 2025-26 (Q2: Jul - Sep 2025)</option>
                </select>
              </div>

              <div className="p-3 bg-[#eff6ff] rounded border border-[#bfdbfe] text-[11px] text-[#1e40af]">
                <strong>Phase 7 Eligibility Rule:</strong> The report will snapshot all approved Phase 3 activities, Phase 4 calculations, and Phase 6 reconciliations without modifying source data.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e2e8f0]">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="px-3 py-1.5 border border-[#cbd5e1] text-xs font-semibold rounded text-[#475569] hover:bg-[#f8fafc]"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateReport}
                disabled={actionLoading}
                className="px-4 py-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-semibold rounded flex items-center gap-1.5"
              >
                {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>Generate Snapshot</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Request Changes */}
      {showChangesModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 space-y-4 border border-[#cbd5e1]">
            <div className="flex items-center justify-between pb-3 border-b border-[#e2e8f0]">
              <h3 className="text-sm font-bold text-[#0f172a]">Request Changes on Report</h3>
              <button onClick={() => setShowChangesModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-[#475569]">
                Provide clear audit instructions regarding which data ledgers or variance reconciliations must be addressed before re-submitting.
              </p>
              <textarea
                value={changesComments}
                onChange={(e) => setChangesComments(e.target.value)}
                rows={4}
                placeholder="Specify required corrections (e.g. resolve open reconciliation case REC-2025-001 or attach revised utility statement)..."
                className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded p-2 text-[#0f172a]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e2e8f0]">
              <button
                onClick={() => setShowChangesModal(false)}
                className="px-3 py-1.5 border border-[#cbd5e1] text-xs font-semibold rounded text-[#475569] hover:bg-[#f8fafc]"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestChanges}
                disabled={actionLoading || !changesComments.trim()}
                className="px-4 py-1.5 bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-semibold rounded"
              >
                Submit Change Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Submit Revision */}
      {showRevisionModal && selectedReport && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 space-y-4 border border-[#cbd5e1]">
            <div className="flex items-center justify-between pb-3 border-b border-[#e2e8f0]">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-[#1d4ed8]" />
                <h3 className="text-sm font-bold text-[#0f172a]">
                  Submit Revised Version v{selectedReport.reportVersion + 1}.0
                </h3>
              </div>
              <button onClick={() => setShowRevisionModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-[#475569]">
                Document the corrections made in this cycle (e.g. reconciled activity ledgers, updated invoice receipts). A frozen archive of v{selectedReport.reportVersion}.0 will be preserved in version history.
              </p>
              <textarea
                value={revisionComments}
                onChange={(e) => setRevisionComments(e.target.value)}
                rows={4}
                placeholder="Describe changes addressed in this revision..."
                className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded p-2 text-[#0f172a]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e2e8f0]">
              <button
                onClick={() => setShowRevisionModal(false)}
                className="px-3 py-1.5 border border-[#cbd5e1] text-xs font-semibold rounded text-[#475569] hover:bg-[#f8fafc]"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitRevision}
                disabled={actionLoading || !revisionComments.trim()}
                className="px-4 py-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-semibold rounded"
              >
                Submit Revision (v{selectedReport.reportVersion + 1}.0)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Governance Approval & Sign-Off */}
      {showApprovalModal && selectedReport && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 space-y-4 border border-[#cbd5e1]">
            <div className="flex items-center justify-between pb-3 border-b border-[#e2e8f0]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#059669]" />
                <h3 className="text-sm font-bold text-[#0f172a]">
                  {approvalModalType === 'COMPANY'
                    ? 'Company ESG Committee Approval'
                    : approvalModalType === 'AUDITOR'
                    ? 'Statutory Auditor ISAE 3000 Assurance Sign-Off'
                    : 'Finalize & Lock Report'}
                </h3>
              </div>
              <button onClick={() => setShowApprovalModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-[#475569]">
                {approvalModalType === 'COMPANY'
                  ? 'Record formal verification from the Company ESG Governance Committee confirming completeness of reporting boundaries and disclosures.'
                  : approvalModalType === 'AUDITOR'
                  ? 'Record independent limited assurance opinion under ISAE 3000 / ISO 14064-3 with zero material misstatements.'
                  : 'Permanently finalize and lock report for official statutory filing with SEBI.'}
              </p>
              <textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                rows={3}
                placeholder="Enter sign-off comments or assurance certificate notes..."
                className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded p-2 text-[#0f172a]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e2e8f0]">
              <button
                onClick={() => setShowApprovalModal(false)}
                className="px-3 py-1.5 border border-[#cbd5e1] text-xs font-semibold rounded text-[#475569] hover:bg-[#f8fafc]"
              >
                Cancel
              </button>
              <button
                onClick={
                  approvalModalType === 'COMPANY'
                    ? handleCompanyApprove
                    : approvalModalType === 'AUDITOR'
                    ? handleAuditorApprove
                    : handleFinalizeReport
                }
                disabled={actionLoading}
                className="px-4 py-1.5 bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold rounded shadow-2xs"
              >
                Confirm Sign-off
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
