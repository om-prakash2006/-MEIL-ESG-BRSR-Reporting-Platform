import React from 'react';
import {
  FileCheck2,
  TrendingDown,
  Building,
  CheckCircle,
  Clock,
  AlertOctagon,
  ExternalLink,
  Download,
  Shield,
  Layers,
} from 'lucide-react';

interface CompanyDashboardProps {
  data: any;
  onNavigate: (tab: string) => void;
}

export const CompanyDashboard: React.FC<CompanyDashboardProps> = ({ data, onNavigate }) => {
  const metrics = data?.metrics || {};
  const workflow = data?.workflowPipeline || [];
  const buSummary = data?.businessUnitSummary || [];
  const blockers = data?.statutoryBlockers || [];

  return (
    <div className="space-y-5">
      {/* Page Heading & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#0f172a] tracking-tight">
              Company ESG Dashboard
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#1d4ed8] text-white">
              LEGAL ENTITY USER
            </span>
          </div>
          <p className="text-xs text-[#64748b] mt-0.5">
            Monitor entity-level sustainability disclosures, oversee Business Unit progress, track statutory BRSR Core workflow readiness, and resolve cross-divisional blockers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('reports')}
            className="px-3.5 py-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-semibold rounded shadow-2xs transition-colors"
          >
            Statutory Readiness Dossier
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Reporting Progress */}
        <div className="bg-white border border-[#e2e8f0] rounded-md p-3.5 space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-[#64748b] uppercase">
            <span>REPORTING PROGRESS</span>
            <FileCheck2 className="w-3.5 h-3.5 text-[#059669]" />
          </div>
          <div className="text-xl font-bold text-[#0f172a] tabular-nums flex items-baseline gap-1.5">
            <span>{metrics.reportingCompletion || '94.2%'}</span>
            <span className="text-[10px] text-[#059669] font-semibold">{metrics.reportingProgressDelta || '+3.8%'}</span>
          </div>
          <div className="text-[10px] text-[#64748b]">Across 3 Operating Divisions</div>
          <div className="w-full h-1.5 bg-gray-100 rounded overflow-hidden mt-1">
            <div className="h-full bg-[#059669]" style={{ width: '94.2%' }}></div>
          </div>
        </div>

        {/* Total GHG */}
        <div className="bg-white border border-[#e2e8f0] rounded-md p-3.5 space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-[#64748b] uppercase">
            <span>TOTAL GHG SCOPE 1–3</span>
            <span className="text-[10px] font-mono bg-gray-100 px-1 rounded">tCO2e</span>
          </div>
          <div className="text-xl font-bold text-[#0f172a] tabular-nums">
            {metrics.totalGHG || '894.3k'}
          </div>
          <div className="text-[9px] text-[#64748b] truncate">S1: 524k · S2: 218k · S3: 152k</div>
          <div className="text-[10px] font-semibold text-[#059669] flex items-center gap-1">
            <TrendingDown className="w-3 h-3" />
            <span>-4.2% YoY Decarbonization</span>
          </div>
        </div>

        {/* ESG Governance */}
        <div className="bg-white border border-[#e2e8f0] rounded-md p-3.5 space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-[#64748b] uppercase">
            <span>ESG GOVERNANCE</span>
            <Building className="w-3.5 h-3.5 text-[#1d4ed8]" />
          </div>
          <div className="text-xl font-bold text-[#0f172a] tabular-nums">
            {metrics.esgGovernance || '81.6 / 100'}
          </div>
          <div className="text-[10px] font-semibold text-[#1d4ed8]">Tier-1 SEBI Compliant</div>
          <div className="text-[9px] text-[#64748b]">Listing Regs Clause 34</div>
        </div>

        {/* Assurance Status */}
        <div className="bg-white border border-[#e2e8f0] rounded-md p-3.5 space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-[#64748b] uppercase">
            <span>ASSURANCE STATUS</span>
            <Shield className="w-3.5 h-3.5 text-[#059669]" />
          </div>
          <div className="text-xl font-bold text-[#059669] tabular-nums">
            {metrics.auditCompletion || '86.4%'} Verified
          </div>
          <div className="text-[10px] text-[#64748b]">184 / 213 Records (EY)</div>
          <div className="w-full h-1.5 bg-gray-100 rounded overflow-hidden mt-1">
            <div className="h-full bg-[#059669]" style={{ width: '86.4%' }}></div>
          </div>
        </div>

        {/* Open Discrepancies */}
        <div className="bg-white border border-[#e2e8f0] rounded-md p-3.5 space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-[#64748b] uppercase">
            <span>OPEN DISCREPANCIES</span>
            <AlertOctagon className="w-3.5 h-3.5 text-[#d97706]" />
          </div>
          <div className="text-xl font-bold text-[#d97706] tabular-nums">
            {metrics.openDiscrepancies || 4} Variances
          </div>
          <div className="text-[10px] text-[#64748b]">2 Remediation · 2 Re-check</div>
          <div className="text-[10px] font-semibold text-[#059669]">0 Fatal / Critical Flags</div>
        </div>

        {/* BRSR Readiness */}
        <div className="bg-white border border-[#e2e8f0] rounded-md p-3.5 space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-[#64748b] uppercase">
            <span>BRSR READINESS</span>
            <Layers className="w-3.5 h-3.5 text-[#1d4ed8]" />
          </div>
          <div className="text-xl font-bold text-[#1d4ed8] tabular-nums">
            {metrics.reportReadiness || '88% STAGE 5/6'}
          </div>
          <div className="text-[10px] text-[#64748b]">Draft Consolidation</div>
          <div className="text-[10px] font-semibold text-[#1d4ed8]">Board Review Ready</div>
        </div>
      </div>

      {/* Statutory BRSR Core Reporting Workflow Pipeline */}
      <div className="bg-white border border-[#e2e8f0] rounded-md p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider">
              STATUTORY BRSR CORE REPORTING WORKFLOW PIPELINE
            </h3>
            <span className="text-[10px] text-[#64748b] font-medium">Megha Hydro Infra Scope</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-[#64748b]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#059669]"></span> Complete</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#1d4ed8]"></span> In Progress</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#94a3b8]"></span> Pending Signoff</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {workflow.map((stg: any, i: number) => (
            <div
              key={i}
              className={`p-2.5 rounded border text-xs space-y-1 ${
                stg.status === 'Complete'
                  ? 'bg-[#f0fdf4] border-[#bbf7d0]'
                  : stg.status === 'In Progress'
                  ? 'bg-[#eff4ff] border-[#bfdbfe]'
                  : 'bg-[#f8fafc] border-[#e2e8f0]'
              }`}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">{stg.stage}</div>
              <div className="font-bold text-[#0f172a] text-xs">{stg.name}</div>
              <div className="text-[11px] text-[#475569]">{stg.progress}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Business Units Consolidation Registry Table */}
      <div className="bg-white border border-[#e2e8f0] rounded-md overflow-hidden">
        <div className="p-3.5 border-b border-[#e2e8f0] flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider">
              BUSINESS UNITS CONSOLIDATION REGISTRY
            </h3>
            <p className="text-[11px] text-[#64748b]">
              Entity roll-up of operational boundaries under Megha Hydro Infra Ltd statutory umbrella
            </p>
          </div>
          <button
            onClick={() => alert('Exporting Entity CSV')}
            className="px-2.5 py-1 bg-white border border-[#cbd5e1] hover:bg-[#f8fafc] text-xs font-semibold text-[#334155] rounded flex items-center gap-1"
          >
            <Download className="w-3 h-3" />
            <span>Export CSV</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#f1f5f9] text-[#475569] text-[10px] uppercase font-bold border-b border-[#cbd5e1]">
                <th className="py-2.5 px-3">BUSINESS UNIT</th>
                <th className="py-2.5 px-3">BU HEAD</th>
                <th className="py-2.5 px-3 text-center">FACILITIES</th>
                <th className="py-2.5 px-3 text-center">METRIC COMPLETION</th>
                <th className="py-2.5 px-3 text-right">TOTAL GHG (tCO2e)</th>
                <th className="py-2.5 px-3 text-center">AUDIT STATUS</th>
                <th className="py-2.5 px-3 text-center">OPEN ISSUES</th>
                <th className="py-2.5 px-3 text-center">BRSR READINESS</th>
                <th className="py-2.5 px-3 text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {buSummary.map((bu: any, idx: number) => (
                <tr key={idx} className="hover:bg-[#f8fafc] transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-[#0f172a]">{bu.name}</td>
                  <td className="py-2.5 px-3 text-[#475569]">{bu.head}</td>
                  <td className="py-2.5 px-3 text-center text-[#334155]">{bu.facilitiesCount} Facilities</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="font-semibold text-[#059669]">{bu.completion}</span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-[#0f172a]">{bu.ghg}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded bg-[#ecfdf5] text-[#059669]">
                      {bu.auditStatus}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-[#fffbeb] text-[#d97706]">
                      {bu.issuesCount} Issues
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center font-semibold text-[#1d4ed8]">
                    {bu.readiness}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      onClick={() => onNavigate('esg-data')}
                      className="text-[#1d4ed8] font-bold hover:underline flex items-center justify-center gap-0.5 mx-auto"
                    >
                      <span>View BU Details</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Statutory Blockers & Actions */}
      <div className="bg-white border border-[#e2e8f0] rounded-md p-4 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#f1f5f9]">
          <h3 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider">
            STATUTORY BLOCKERS & ACTIONS (ENTITY RESOLUTION)
          </h3>
          <span className="text-[10px] font-bold bg-[#fff1f2] text-[#e11d48] px-2 py-0.5 rounded">
            {blockers.length} Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {blockers.map((b: any, idx: number) => (
            <div key={idx} className="p-3 border border-[#e2e8f0] rounded bg-[#f8fafc] text-xs space-y-2">
              <div className="font-bold text-[#0f172a] leading-snug">{b.title}</div>
              <div className="text-[10px] font-semibold text-[#1d4ed8]">{b.division}</div>
              <p className="text-[11px] text-[#64748b] leading-relaxed">{b.description}</p>
              <button
                onClick={() => onNavigate('reconciliation')}
                className="w-full py-1 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-semibold text-xs rounded transition-colors"
              >
                {b.action}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
