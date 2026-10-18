import React from 'react';
import {
  Download,
  Plus,
  TrendingDown,
  ShieldCheck,
  AlertTriangle,
  Clock,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  FileText,
  Building,
} from 'lucide-react';

interface GroupAdminDashboardProps {
  data: any;
  onNavigate: (tab: string) => void;
}

export const GroupAdminDashboard: React.FC<GroupAdminDashboardProps> = ({ data, onNavigate }) => {
  const metrics = data?.metrics || {};
  const pendingActions = data?.pendingActions || [];
  const recentSubmissions = data?.recentSubmissions || [];
  const thirdPartyAssurance = data?.thirdPartyAssurance || {};

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0f172a] tracking-tight">
            ESG Performance & BRSR Compliance Overview
          </h1>
          <p className="text-xs text-[#64748b] mt-0.5">
            Consolidated Group Sustainability Metrics under SEBI BRSR Core Mandate
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => alert('Exporting Consolidated MEIL Group Summary PDF')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-semibold rounded shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Summary PDF</span>
          </button>
        </div>
      </div>

      {/* Filter and Synchronization Bar */}
      <div className="bg-white border border-[#e2e8f0] rounded-md p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <span className="text-[11px] font-semibold text-[#64748b] mr-2">ENTITY:</span>
            <select className="px-2 py-1 bg-[#f8fafc] border border-[#cbd5e1] rounded font-medium text-[#0f172a] text-xs outline-none">
              <option>All MEIL Entities (5)</option>
              <option>Megha Hydro Infra Ltd (MHIL)</option>
              <option>Megha Engineering & Infrastructures Ltd</option>
            </select>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-[#64748b] mr-2">REPORTING PERIOD:</span>
            <select className="px-2 py-1 bg-[#f8fafc] border border-[#cbd5e1] rounded font-medium text-[#0f172a] text-xs outline-none">
              <option>FY 2025-26 (Q3 Active)</option>
              <option>FY 2025-26 (Q2 Archived)</option>
            </select>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-[#64748b] mr-2">SCOPE:</span>
            <select className="px-2 py-1 bg-[#f8fafc] border border-[#cbd5e1] rounded font-medium text-[#0f172a] text-xs outline-none">
              <option>All Scopes (1, 2, 3)</option>
              <option>Scope 1 Direct</option>
              <option>Scope 2 Purchased Grid</option>
              <option>Scope 3 Supply Chain</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-[#059669] font-medium bg-[#ecfdf5] px-2 py-1 rounded border border-[#a7f3d0]">
          <span className="w-2 h-2 rounded-full bg-[#059669]"></span>
          <span>Data verified against ERP batch: #SYNC-8942 (Today, 08:30 IST)</span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Emissions */}
        <div className="bg-white border border-[#e2e8f0] rounded-md p-3.5 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-[#64748b] uppercase">
            <span>TOTAL EMISSIONS</span>
            <span className="font-mono text-[9px] bg-gray-100 px-1 py-0.5 rounded">CO2</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-[#0f172a] tabular-nums">
            {metrics.totalEmissions || '1,428,500'}
          </div>
          <div className="text-[10px] text-[#64748b]">tCO2e (Gross)</div>
          <div className="flex items-center gap-1 text-[10px] font-semibold text-[#059669]">
            <TrendingDown className="w-3 h-3" />
            <span>-3.2% vs FY24 baseline</span>
          </div>
        </div>

        {/* Scope 1 */}
        <div className="bg-white border border-[#e2e8f0] rounded-md p-3.5 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-[#64748b] uppercase">
            <span>SCOPE 1 (DIRECT)</span>
            <span className="text-[10px] text-[#1d4ed8]">🏭</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-[#0f172a] tabular-nums">
            {metrics.scope1 || '842,100'}
          </div>
          <div className="text-[10px] text-[#64748b]">tCO2e ({metrics.scope1Pct || '58.9%'})</div>
          <div className="text-[10px] text-[#64748b] truncate">Diesel, Machinery,...</div>
        </div>

        {/* Scope 2 */}
        <div className="bg-white border border-[#e2e8f0] rounded-md p-3.5 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-[#64748b] uppercase">
            <span>SCOPE 2 (ELECTRICITY)</span>
            <span className="text-[10px] text-[#0284c7]">⚡</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-[#0f172a] tabular-nums">
            {metrics.scope2 || '312,400'}
          </div>
          <div className="text-[10px] text-[#64748b]">tCO2e ({metrics.scope2Pct || '21.9%'})</div>
          <div className="text-[10px] text-[#64748b] truncate">Grid Purchased Power...</div>
        </div>

        {/* Scope 3 */}
        <div className="bg-white border border-[#e2e8f0] rounded-md p-3.5 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-[#64748b] uppercase">
            <span>SCOPE 3 (VALUE CHAIN)</span>
            <span className="text-[10px] text-[#059669]">🌱</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-[#0f172a] tabular-nums">
            {metrics.scope3 || '274,000'}
          </div>
          <div className="text-[10px] text-[#64748b]">tCO2e ({metrics.scope3Pct || '19.2%'})</div>
          <div className="text-[10px] text-[#64748b] truncate">Supply chain, Cement,...</div>
        </div>

        {/* ESG Readiness */}
        <div className="bg-white border border-[#e2e8f0] rounded-md p-3.5 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-[#64748b] uppercase">
            <span>ESG READINESS</span>
            <ShieldCheck className="w-3.5 h-3.5 text-[#1d4ed8]" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-[#0f172a] tabular-nums">
            {metrics.esgReadiness || '78.4 / 100'}
          </div>
          <div className="text-[10px] text-[#64748b]">Composite Index</div>
          <div className="text-[10px] font-semibold text-[#1d4ed8]">SEBI BRSR Core Aligned</div>
        </div>

        {/* Assurance Status */}
        <div className="bg-white border border-[#e2e8f0] rounded-md p-3.5 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-[#64748b] uppercase">
            <span>ASSURANCE STATUS</span>
            <FileText className="w-3.5 h-3.5 text-[#059669]" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-[#059669] tabular-nums">
            {metrics.assuranceStatus || '68%'}
          </div>
          <div className="text-[10px] text-[#64748b]">Verified Disclosures</div>
          <div className="text-[10px] font-semibold text-[#d97706]">In Progress · 14 Days to Filing</div>
        </div>
      </div>

      {/* Main Grid: Left Distribution & Submissions | Right Pending & Assurance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Left Column (2 Cols wide) */}
        <div className="lg:col-span-2 space-y-5">
          
          {/* Emissions Distribution by Business Unit */}
          <div className="bg-white border border-[#e2e8f0] rounded-md p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider">
                  Emissions Distribution by Business Unit
                </h3>
                <p className="text-[11px] text-[#64748b]">
                  FY25-26 gross operational footprint across major verticals
                </p>
              </div>
              <span className="text-[10px] text-[#059669] bg-[#ecfdf5] border border-[#a7f3d0] px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#059669]"></span> Verified Submissions Only
              </span>
            </div>

            {/* Stacked Progress Bar */}
            <div className="w-full h-4 bg-gray-100 rounded flex overflow-hidden mb-3">
              <div className="h-full bg-[#1d4ed8] text-[9px] text-white flex items-center justify-center font-bold" style={{ width: '42%' }}>42%</div>
              <div className="h-full bg-[#0284c7] text-[9px] text-white flex items-center justify-center font-bold" style={{ width: '28%' }}>28%</div>
              <div className="h-full bg-[#0d9488] text-[9px] text-white flex items-center justify-center font-bold" style={{ width: '18%' }}>18%</div>
              <div className="h-full bg-[#94a3b8] text-[9px] text-white flex items-center justify-center font-bold" style={{ width: '12%' }}>12%</div>
            </div>

            {/* Legend Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
              <div className="p-2 border border-[#e2e8f0] rounded bg-[#f8fafc]">
                <div className="flex items-center gap-1.5 text-[11px] text-[#1d4ed8] font-semibold">
                  <span className="w-2 h-2 rounded-full bg-[#1d4ed8]"></span> Hydro Infra
                </div>
                <div className="font-bold text-[#0f172a] mt-0.5">599,970 tCO2e</div>
                <div className="text-[10px] text-[#64748b]">42.0% share</div>
              </div>

              <div className="p-2 border border-[#e2e8f0] rounded bg-[#f8fafc]">
                <div className="flex items-center gap-1.5 text-[11px] text-[#0284c7] font-semibold">
                  <span className="w-2 h-2 rounded-full bg-[#0284c7]"></span> Transport & Roads
                </div>
                <div className="font-bold text-[#0f172a] mt-0.5">399,980 tCO2e</div>
                <div className="text-[10px] text-[#64748b]">28.0% share</div>
              </div>

              <div className="p-2 border border-[#e2e8f0] rounded bg-[#f8fafc]">
                <div className="flex items-center gap-1.5 text-[11px] text-[#0d9488] font-semibold">
                  <span className="w-2 h-2 rounded-full bg-[#0d9488]"></span> Water & Irrigation
                </div>
                <div className="font-bold text-[#0f172a] mt-0.5">257,130 tCO2e</div>
                <div className="text-[10px] text-[#64748b]">18.0% share</div>
              </div>

              <div className="p-2 border border-[#e2e8f0] rounded bg-[#f8fafc]">
                <div className="flex items-center gap-1.5 text-[11px] text-[#64748b] font-semibold">
                  <span className="w-2 h-2 rounded-full bg-[#94a3b8]"></span> Manufacturing
                </div>
                <div className="font-bold text-[#0f172a] mt-0.5">171,420 tCO2e</div>
                <div className="text-[10px] text-[#64748b]">12.0% share</div>
              </div>
            </div>
          </div>

          {/* Recent Site Submissions Table */}
          <div className="bg-white border border-[#e2e8f0] rounded-md overflow-hidden">
            <div className="p-3.5 border-b border-[#e2e8f0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider">
                  Recent Site Submissions
                </h3>
                <span className="text-[10px] text-[#0284c7] bg-[#f0f9ff] px-2 py-0.5 rounded font-medium">Realtime Feed</span>
              </div>
              <button
                onClick={() => onNavigate('reports')}
                className="text-xs font-semibold text-[#1d4ed8] hover:underline flex items-center gap-1"
              >
                <span>View All Records (3,412)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#f1f5f9] text-[#475569] text-[10px] uppercase font-bold border-b border-[#cbd5e1]">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Project / Facility</th>
                    <th className="py-2.5 px-3">Business Unit</th>
                    <th className="py-2.5 px-3">Metric</th>
                    <th className="py-2.5 px-3 text-right">Value</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  {recentSubmissions.map((row: any, idx: number) => (
                    <tr key={idx} className="hover:bg-[#f8fafc] transition-colors">
                      <td className="py-2 px-3 text-[#64748b] font-mono text-[11px]">{row.date}</td>
                      <td className="py-2 px-3 font-semibold text-[#0f172a]">{row.project}</td>
                      <td className="py-2 px-3 text-[#475569]">{row.unit}</td>
                      <td className="py-2 px-3 text-[#334155]">{row.metric}</td>
                      <td className="py-2 px-3 text-right font-mono font-semibold tabular-nums text-[#0f172a]">
                        {row.value}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded ${
                            row.status === 'Verified'
                              ? 'bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0]'
                              : row.status === 'Under Review'
                              ? 'bg-[#fffbeb] text-[#d97706] border border-[#fde68a]'
                              : 'bg-[#f1f5f9] text-[#475569] border border-[#e2e8f0]'
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-2.5 bg-[#f8fafc] border-t border-[#e2e8f0] flex items-center justify-between text-[11px] text-[#64748b]">
              <span>Displaying 5 most recent records from 28 active field locations</span>
              <div className="flex gap-2">
                <button className="px-2 py-1 bg-white border border-[#cbd5e1] rounded text-[11px] font-semibold text-[#64748b]">Previous</button>
                <button className="px-2 py-1 bg-white border border-[#cbd5e1] rounded text-[11px] font-semibold text-[#1d4ed8]">Next</button>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Pending Action Items & Assurance Card */}
        <div className="space-y-5">
          
          {/* Pending Action Items */}
          <div className="bg-white border border-[#e2e8f0] rounded-md p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#f1f5f9]">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#1d4ed8]" />
                <h3 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider">
                  Pending Action Items
                </h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#eff4ff] text-[#1d4ed8]">
                {pendingActions.length} Open
              </span>
            </div>

            <div className="space-y-2.5">
              {pendingActions.map((act: any) => (
                <div
                  key={act.id}
                  className="p-3 border border-[#e2e8f0] rounded bg-[#f8fafc] hover:bg-white transition-colors text-xs space-y-1"
                >
                  <div className="font-bold text-[#0f172a]">{act.title}</div>
                  <div className="text-[11px] text-[#64748b] leading-tight">{act.subtitle}</div>
                  <div className="flex items-center justify-between pt-1 text-[10px]">
                    <span className="font-semibold text-[#d97706]">{act.deadline}</span>
                    <button
                      onClick={() => onNavigate('reconciliation')}
                      className="text-[#1d4ed8] font-bold hover:underline"
                    >
                      Resolve &rarr;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Third-Party Assurance (EY LLP) */}
          <div className="bg-white border border-[#e2e8f0] rounded-md p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#f1f5f9]">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#059669]" />
                <h3 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider">
                  Third-Party Assurance
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold text-[#64748b]">
                {thirdPartyAssurance.partner || 'EY LLP'}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-[#475569]">
                <span>Statutory Disclosures:</span>
                <span className="font-bold text-[#0f172a]">{thirdPartyAssurance.totalItems || 142} BRSR Core Items</span>
              </div>
              <div className="flex justify-between text-[#475569]">
                <span>Overall Verification Progress:</span>
                <span className="font-bold text-[#059669]">{thirdPartyAssurance.overallProgress || '67.6% (96 / 142)'}</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-gray-100 rounded overflow-hidden">
                <div className="h-full bg-[#059669]" style={{ width: '67.6%' }}></div>
              </div>

              <div className="space-y-1.5 pt-2 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[#334155]">
                    <span className="w-2 h-2 rounded-full bg-[#059669]"></span> Verified Disclosures
                  </span>
                  <span className="font-bold">{thirdPartyAssurance.verifiedCount || 96}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[#334155]">
                    <span className="w-2 h-2 rounded-full bg-[#d97706]"></span> Pending Assurance Review
                  </span>
                  <span className="font-bold">{thirdPartyAssurance.inProgressCount || 28}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[#334155]">
                    <span className="w-2 h-2 rounded-full bg-[#e11d48]"></span> Identified Discrepancies
                  </span>
                  <span className="font-bold text-[#e11d48]">{thirdPartyAssurance.discrepanciesCount || 18}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-[#f1f5f9] flex items-center justify-between text-[10px] text-[#64748b]">
                <span>Assurance Level: Limited (ISAE 3000)</span>
                <button
                  onClick={() => onNavigate('reports')}
                  className="font-bold text-[#1d4ed8] hover:underline flex items-center gap-0.5"
                >
                  <span>Reports Overview</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Compliance Guidelines Footer Note */}
      <div className="p-3 bg-[#eff4ff] border border-[#dce9ff] rounded text-xs text-[#1e40af] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[11px]">ℹ BRSR Core Indicator Principle 6 (Environment) and Principle 3 (Employee Well-being)</span>
          <span>are scheduled for final group reconciliation on November 15, 2025.</span>
        </div>
        <a
          href="#guidelines"
          onClick={(e) => {
            e.preventDefault();
            alert('Opening SEBI Circular SEBI/HO/CFD/CFD-SEC-2/P/CIR/2023/122 Regulatory Guidance');
          }}
          className="text-xs font-semibold text-[#1d4ed8] hover:underline flex items-center gap-1 shrink-0"
        >
          <span>SEBI Circular Guidelines</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};
