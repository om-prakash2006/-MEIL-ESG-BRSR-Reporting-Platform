import React from 'react';
import {
  FileText,
  Clock,
  Paperclip,
  AlertTriangle,
  Lock,
  Plus,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';

interface ProjectDashboardProps {
  data: any;
  onNavigate: (tab: string) => void;
}

export const ProjectDashboard: React.FC<ProjectDashboardProps> = ({ data, onNavigate }) => {
  const metrics = data?.metrics || {};
  const recentSubmissions = data?.recentSubmissions || [];
  const auditIssues = data?.auditIssues || [];
  const scope = data?.organizationScope || {};

  return (
    <div className="space-y-5">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#0f172a] tracking-tight">
              Project ESG Dashboard
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#1d4ed8] text-white">
              FACILITY USER
            </span>
          </div>
          <p className="text-xs text-[#64748b] mt-0.5">
            Track assigned facility metrics, submit activity data, upload verification evidence, and resolve auditor queries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('esg-data')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-semibold rounded shadow-2xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Quick Submit Activity Data</span>
          </button>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Data Completion */}
        <div className="bg-white border border-[#e2e8f0] rounded-md p-3.5 space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-[#64748b] uppercase">
            <span>DATA COMPLETION</span>
            <FileText className="w-3.5 h-3.5 text-[#1d4ed8]" />
          </div>
          <div className="text-2xl font-bold text-[#0f172a] tabular-nums">
            {metrics.dataCompletion || '88%'}
          </div>
          <div className="text-[10px] text-[#64748b]">42 / 48 Assigned Metrics Logged</div>
          <div className="w-full h-1.5 bg-gray-100 rounded overflow-hidden mt-1">
            <div className="h-full bg-[#1d4ed8]" style={{ width: '88%' }}></div>
          </div>
        </div>

        {/* Pending Submissions */}
        <div className="bg-white border border-[#e2e8f0] rounded-md p-3.5 space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-[#64748b] uppercase">
            <span>PENDING SUBMISSIONS</span>
            <Clock className="w-3.5 h-3.5 text-[#d97706]" />
          </div>
          <div className="text-2xl font-bold text-[#d97706] tabular-nums flex items-baseline gap-1.5">
            <span>06</span>
            <span className="text-[9px] font-bold bg-[#fffbeb] text-[#d97706] px-1 rounded">Action Required</span>
          </div>
          <div className="text-[10px] text-[#64748b]">4 Environmental, 2 Social</div>
        </div>

        {/* Evidence Pending */}
        <div className="bg-white border border-[#e2e8f0] rounded-md p-3.5 space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-[#64748b] uppercase">
            <span>EVIDENCE PENDING</span>
            <Paperclip className="w-3.5 h-3.5 text-[#d97706]" />
          </div>
          <div className="text-2xl font-bold text-[#d97706] tabular-nums flex items-baseline gap-1.5">
            <span>03</span>
            <span className="text-[9px] font-bold bg-[#fffbeb] text-[#d97706] px-1 rounded">No SHA Seal</span>
          </div>
          <div className="text-[10px] text-[#64748b]">Receipts / Invoices missing</div>
        </div>

        {/* Audit Issues */}
        <div className="bg-white border border-[#e2e8f0] rounded-md p-3.5 space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-[#64748b] uppercase">
            <span>AUDIT ISSUES</span>
            <AlertTriangle className="w-3.5 h-3.5 text-[#e11d48]" />
          </div>
          <div className="text-2xl font-bold text-[#e11d48] tabular-nums flex items-baseline gap-1.5">
            <span>01</span>
            <span className="text-[9px] font-bold bg-[#fff1f2] text-[#e11d48] px-1 rounded">Correction Req.</span>
          </div>
          <div className="text-[10px] text-[#64748b]">Diesel Invoice Query (EY)</div>
        </div>

        {/* Submitted Records */}
        <div className="bg-white border border-[#e2e8f0] rounded-md p-3.5 space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-[#64748b] uppercase">
            <span>SUBMITTED RECORDS</span>
            <Lock className="w-3.5 h-3.5 text-[#059669]" />
          </div>
          <div className="text-2xl font-bold text-[#059669] tabular-nums flex items-baseline gap-1.5">
            <span>42</span>
            <span className="text-[9px] font-bold bg-[#ecfdf5] text-[#059669] px-1 rounded">Locked</span>
          </div>
          <div className="text-[10px] text-[#64748b]">Locked for BU &amp; Auditor Review</div>
        </div>
      </div>

      {/* Main Grid: Left Status & Submissions | Right Queries & Traceability */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Left Column (2 Cols wide) */}
        <div className="lg:col-span-2 space-y-5">
          
          {/* Facility ESG Reporting Status */}
          <div className="bg-white border border-[#e2e8f0] rounded-md p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#f1f5f9]">
              <div>
                <h3 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider">
                  MY ESG REPORTING STATUS — SUBANSIRI HYDRO (Q3 FY 2025–26)
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[#64748b] bg-gray-100 px-2 py-0.5 rounded">
                FACILITY CODE: MEIL-HYD-SUB-01
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between font-semibold text-[#0f172a] mb-1">
                  <span>Environmental Disclosure (Scope 1, Scope 2, Water &amp; Hazardous Sludge)</span>
                  <span className="text-[#059669]">22 / 25 Logged (88%)</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded overflow-hidden">
                  <div className="h-full bg-[#059669]" style={{ width: '88%' }}></div>
                </div>
                <div className="text-[10px] text-[#d97706] mt-0.5">3 Actions Remaining</div>
              </div>

              <div>
                <div className="flex justify-between font-semibold text-[#0f172a] mb-1">
                  <span>Social Metrics (Workforce Safety, LTIFR, Local Manpower &amp; Grievances)</span>
                  <span className="text-[#0284c7]">13 / 17 Logged (76%)</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded overflow-hidden">
                  <div className="h-full bg-[#0284c7]" style={{ width: '76%' }}></div>
                </div>
                <div className="text-[10px] text-[#d97706] mt-0.5">4 Actions Remaining</div>
              </div>

              <div>
                <div className="flex justify-between font-semibold text-[#0f172a] mb-1">
                  <span>Governance &amp; Statutory Permits (Pollution Board NOCs &amp; Forest Approvals)</span>
                  <span className="text-[#1d4ed8]">7 / 8 Logged (92%)</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded overflow-hidden">
                  <div className="h-full bg-[#1d4ed8]" style={{ width: '92%' }}></div>
                </div>
                <div className="text-[10px] text-[#64748b] mt-0.5">1 Action Remaining</div>
              </div>
            </div>
          </div>

          {/* Recent Facility Submissions Table */}
          <div className="bg-white border border-[#e2e8f0] rounded-md overflow-hidden">
            <div className="p-3.5 border-b border-[#e2e8f0] flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider">
                RECENT FACILITY SUBMISSIONS
              </h3>
              <button
                onClick={() => onNavigate('esg-data')}
                className="text-xs font-semibold text-[#1d4ed8] hover:underline"
              >
                Filter All
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#f1f5f9] text-[#475569] text-[10px] uppercase font-bold border-b border-[#cbd5e1]">
                    <th className="py-2.5 px-3">DATE</th>
                    <th className="py-2.5 px-3">METRIC &amp; SCOPE</th>
                    <th className="py-2.5 px-3">CATEGORY</th>
                    <th className="py-2.5 px-3 text-right">VALUE &amp; UNIT</th>
                    <th className="py-2.5 px-3">LINKED EVIDENCE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  {recentSubmissions.map((s: any, idx: number) => (
                    <tr key={idx} className="hover:bg-[#f8fafc] transition-colors">
                      <td className="py-2 px-3 text-[#64748b] font-mono text-[11px]">{s.date}</td>
                      <td className="py-2 px-3 font-semibold text-[#0f172a]">{s.metric}</td>
                      <td className="py-2 px-3 text-[#475569]">
                        <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded bg-[#f1f5f9] text-[#334155]">
                          Environmental
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-[#0f172a]">
                        <div>{s.value}</div>
                        <div className="text-[10px] font-normal text-[#64748b]">{s.co2e}</div>
                      </td>
                      <td className="py-2 px-3">
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#1d4ed8]">
                          <Paperclip className="w-3 h-3" />
                          <span className="truncate max-w-[140px]">{s.evidenceHash}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right Column: Auditor Queries & Traceability */}
        <div className="space-y-5">
          
          {/* Action Required & Auditor Queries */}
          <div className="bg-white border border-[#e2e8f0] rounded-md p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#f1f5f9]">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-[#e11d48]" />
                <h3 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider">
                  ACTION REQUIRED &amp; AUDITOR QUERIES
                </h3>
              </div>
              <span className="text-[10px] font-bold bg-[#fff1f2] text-[#e11d48] px-2 py-0.5 rounded">
                1 URGENT
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 border border-[#fecdd3] bg-[#fff1f2] rounded space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#e11d48]">Auditor Finding #AUD-001: Diesel Variance</span>
                  <span className="text-[9px] font-bold bg-[#e11d48] text-white px-1.5 py-0.5 rounded">CORRECTION REQ.</span>
                </div>
                <p className="text-[11px] text-[#475569]">
                  EY Assurer flagged +10,000 L drawdown in Genset 4 logbook not reflected in fuel invoice (Ref #OCT-DSL-09).
                </p>
                <div className="pt-1 flex justify-between items-center text-[10px]">
                  <span className="text-[#64748b]">Assurer: EY India (Statutory)</span>
                  <button
                    onClick={() => onNavigate('reconciliation')}
                    className="font-bold text-[#1d4ed8] hover:underline"
                  >
                    Open Correction Record &rarr;
                  </button>
                </div>
              </div>

              <div className="p-3 border border-[#e2e8f0] bg-[#f8fafc] rounded space-y-1">
                <div className="font-bold text-[#0f172a]">Missing Evidence: Unit 4 Auxiliary Transformer</div>
                <p className="text-[11px] text-[#64748b]">
                  Scope 2 sub-meter electricity drawdown slip missing for the November mid-cycle calibration ledger.
                </p>
                <button
                  onClick={() => onNavigate('evidence')}
                  className="text-xs font-semibold text-[#1d4ed8] hover:underline"
                >
                  Upload Document &rarr;
                </button>
              </div>
            </div>
          </div>

          {/* Facility Traceability Chain */}
          <div className="bg-white border border-[#e2e8f0] rounded-md p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#f1f5f9]">
              <h3 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider">
                FACILITY TRACEABILITY CHAIN
              </h3>
              <span className="text-[10px] text-[#059669] font-bold">BRSR Core Active</span>
            </div>

            <div className="space-y-1 text-xs">
              <div className="p-2 border border-[#e2e8f0] rounded bg-[#f8fafc] flex justify-between">
                <span>1. Activity Data</span>
                <span className="font-bold text-[#059669]">88% Logged</span>
              </div>
              <div className="p-2 border border-[#e2e8f0] rounded bg-[#f8fafc] flex justify-between">
                <span>2. Vault Seal</span>
                <span className="font-bold text-[#059669]">Locked &amp; Stamped</span>
              </div>
              <div className="p-2 border border-[#e2e8f0] rounded bg-[#f8fafc] flex justify-between">
                <span>3. GHG Calc</span>
                <span className="font-bold text-[#1d4ed8]">268 tCO2e</span>
              </div>
              <div className="p-2 border border-[#e2e8f0] rounded bg-[#f8fafc] flex justify-between">
                <span>4. Assurance</span>
                <span className="font-bold text-[#e11d48]">1 Discrepancy</span>
              </div>
              <div className="p-2 border border-[#e2e8f0] rounded bg-[#f8fafc] flex justify-between">
                <span>5. BRSR Rollup</span>
                <span className="font-bold text-[#d97706]">Pending Lock</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
