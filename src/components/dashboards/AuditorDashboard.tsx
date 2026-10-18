import React from 'react';
import {
  ShieldCheck,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  Lock,
  Download,
  ExternalLink,
  Edit3,
} from 'lucide-react';

interface AuditorDashboardProps {
  data: any;
  onNavigate: (tab: string) => void;
}

export const AuditorDashboard: React.FC<AuditorDashboardProps> = ({ data, onNavigate }) => {
  const metrics = data?.metrics || {};
  const auditQueue = data?.auditQueue || [];
  const findings = data?.majorFindings || [];

  return (
    <div className="space-y-5">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#0f172a] tracking-tight">
              Sustainability &amp; CO2e Audit Dashboard
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#0f766e] text-white">
              INDEPENDENT ASSURER (EY LLP)
            </span>
          </div>
          <p className="text-xs text-[#64748b] mt-0.5">
            Independent third-party assurance center (ISAE 3000 / ISO 14064-3). Review submitted activity data, verify emission factor calculations, inspect immutable evidence, and issue statutory assurance findings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => alert('Exporting Audit Assurance Log')}
            className="px-3.5 py-1.5 bg-white border border-[#cbd5e1] hover:bg-[#f8fafc] text-xs font-semibold text-[#334155] rounded shadow-2xs transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-[#64748b]" />
            <span>Export Assurance Log</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Pending Reviews */}
        <div className="bg-white border border-[#e2e8f0] rounded-md p-3.5 space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-[#64748b] uppercase">
            <span>PENDING REVIEWS</span>
            <Clock className="w-3.5 h-3.5 text-[#d97706]" />
          </div>
          <div className="text-2xl font-bold text-[#0f172a] tabular-nums">
            {metrics.pendingReviews || 32}
          </div>
          <div className="text-[10px] text-[#64748b]">Queued for verification</div>
          <div className="text-[10px] font-semibold text-[#d97706]">Queue active for allocation</div>
        </div>

        {/* In Active Review */}
        <div className="bg-white border border-[#e2e8f0] rounded-md p-3.5 space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-[#64748b] uppercase">
            <span>IN ACTIVE REVIEW</span>
            <Edit3 className="w-3.5 h-3.5 text-[#0284c7]" />
          </div>
          <div className="text-2xl font-bold text-[#0284c7] tabular-nums">
            {metrics.inReview || 14}
          </div>
          <div className="text-[10px] text-[#64748b]">Assigned to 3 analysts</div>
          <div className="text-[10px] font-semibold text-[#0284c7]">Lead assurer active</div>
        </div>

        {/* Verified & Assured */}
        <div className="bg-white border border-[#e2e8f0] rounded-md p-3.5 space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-[#64748b] uppercase">
            <span>VERIFIED / ASSURED</span>
            <ShieldCheck className="w-3.5 h-3.5 text-[#059669]" />
          </div>
          <div className="text-2xl font-bold text-[#059669] tabular-nums">
            {metrics.verified || 184}
          </div>
          <div className="text-[10px] text-[#64748b]">Signed Off (ISAE 3000)</div>
          <div className="text-[10px] font-semibold text-[#059669]">68% completed</div>
        </div>

        {/* Correction Required */}
        <div
          onClick={() => onNavigate('reconciliation')}
          className="bg-white border border-[#e2e8f0] hover:border-[#fca5a5] cursor-pointer rounded-md p-3.5 space-y-1 transition-all hover:shadow-xs"
        >
          <div className="flex items-center justify-between text-[10px] font-bold text-[#64748b] uppercase">
            <span>CORRECTION REQ.</span>
            <AlertTriangle className="w-3.5 h-3.5 text-[#e11d48]" />
          </div>
          <div className="text-2xl font-bold text-[#e11d48] tabular-nums">
            08
          </div>
          <div className="text-[10px] text-[#64748b]">Flagged Discrepancies</div>
          <div className="text-[10px] font-semibold text-[#e11d48] flex items-center justify-between">
            <span>Variance &gt;2% threshold</span>
            <span className="underline text-[9px]">Open Ledger →</span>
          </div>
        </div>

        {/* Assurance Progress */}
        <div className="bg-white border border-[#e2e8f0] rounded-md p-3.5 space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-[#64748b] uppercase">
            <span>ASSURANCE PROGRESS</span>
            <span className="text-[10px] font-mono text-[#059669]">77.3%</span>
          </div>
          <div className="text-2xl font-bold text-[#0f172a] tabular-nums">
            184 / 238
          </div>
          <div className="text-[10px] text-[#64748b]">Records assured</div>
          <div className="w-full h-1.5 bg-gray-100 rounded overflow-hidden mt-1">
            <div className="h-full bg-[#059669]" style={{ width: '77.3%' }}></div>
          </div>
        </div>
      </div>

      {/* Statutory Audit Work Queue Table */}
      <div className="bg-white border border-[#e2e8f0] rounded-md overflow-hidden">
        <div className="p-3.5 border-b border-[#e2e8f0] flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider">
              STATUTORY AUDIT WORK QUEUE (238 TOTAL)
            </h3>
            <p className="text-[11px] text-[#64748b]">
              Scope: Megha Hydro Infra Ltd &amp; Northern Power Division (FY 2025–26 Q3 Statutory Assurance)
            </p>
          </div>
          <button
            onClick={() => onNavigate('audit')}
            className="text-xs font-semibold text-[#1d4ed8] hover:underline"
          >
            Refresh Worklist
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#f1f5f9] text-[#475569] text-[10px] uppercase font-bold border-b border-[#cbd5e1]">
                <th className="py-2.5 px-3">RECORD ID</th>
                <th className="py-2.5 px-3">FACILITY / PROJECT</th>
                <th className="py-2.5 px-3">METRIC &amp; SCOPE</th>
                <th className="py-2.5 px-3 text-right">REPORTED QTY &amp; CO2e</th>
                <th className="py-2.5 px-3">EVIDENCE STATUS</th>
                <th className="py-2.5 px-3 text-center">AUDIT STATUS</th>
                <th className="py-2.5 px-3 text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {auditQueue.map((item: any, idx: number) => (
                <tr key={idx} className="hover:bg-[#f8fafc] transition-colors">
                  <td className="py-2.5 px-3 font-mono font-bold text-[#1d4ed8]">{item.id}</td>
                  <td className="py-2.5 px-3 font-semibold text-[#0f172a]">{item.facility}</td>
                  <td className="py-2.5 px-3 text-[#334155]">{item.metric}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold tabular-nums text-[#0f172a]">
                    {item.reportedQty}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-[#475569]">{item.evidenceStatus}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded ${
                        item.auditStatus === 'Verified'
                          ? 'bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0]'
                          : item.auditStatus === 'In Review'
                          ? 'bg-[#eff4ff] text-[#1d4ed8] border border-[#bfdbfe]'
                          : 'bg-[#fff1f2] text-[#e11d48] border border-[#fecdd3]'
                      }`}
                    >
                      {item.auditStatus}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      onClick={() => onNavigate('audit')}
                      className="px-2.5 py-1 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-semibold text-[11px] rounded"
                    >
                      Review &amp; Sign Off
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lower Row: Active Findings & Assurance Protocols */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Active Audit Findings */}
        <div className="bg-white border border-[#e2e8f0] rounded-md p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#f1f5f9]">
            <h3 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider">
              ACTIVE AUDIT FINDINGS &amp; CLARIFICATION LOG
            </h3>
            <span className="text-[10px] font-bold bg-[#fff1f2] text-[#e11d48] px-2 py-0.5 rounded">
              3 Critical / Open
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            {findings.map((f: any, i: number) => (
              <div key={i} className="p-3 border border-[#e2e8f0] rounded bg-[#f8fafc] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#e11d48]">Finding #{f.id}</span>
                  <span className="text-[10px] text-[#64748b]">Due: {f.actionDueDate}</span>
                </div>
                <div className="font-semibold text-[#0f172a]">{f.title}</div>
                <p className="text-[11px] text-[#64748b]">{f.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Assurance Vault & Protocols */}
        <div className="bg-white border border-[#e2e8f0] rounded-md p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-[#f1f5f9]">
            <h3 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider">
              ASSURANCE VAULT &amp; PROTOCOLS
            </h3>
            <span className="text-[10px] font-bold text-[#059669] bg-[#ecfdf5] px-2 py-0.5 rounded">
              ACTIVE &amp; VERIFIED
            </span>
          </div>

          <div className="space-y-2">
            <div>
              <span className="text-[#64748b] block text-[11px]">GOVERNING FRAMEWORK:</span>
              <span className="font-semibold text-[#0f172a]">ISAE 3000 (Revised) &amp; ISO 14064-3:2019</span>
            </div>
            <div>
              <span className="text-[#64748b] block text-[11px]">LEAD ASSURER CREDENTIAL:</span>
              <span className="font-semibold text-[#0f172a]">Dr. Ananya Sen (Certificate #88A2-3000-EY | EY LLP)</span>
            </div>
            <div>
              <span className="text-[#64748b] block text-[11px]">MATERIALITY THRESHOLD:</span>
              <span className="font-semibold text-[#d97706]">± 2.0% SEBI BRSR Core mandatory requirement</span>
            </div>
          </div>

          <div className="pt-3 border-t border-[#f1f5f9]">
            <button
              onClick={() => alert('Applying digital cryptographic seal to 184 verified records')}
              className="w-full py-2 bg-[#006a63] hover:bg-[#00504a] text-white font-semibold text-xs rounded transition-colors"
            >
              Sign &amp; Issue Limited Assurance Statement
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
