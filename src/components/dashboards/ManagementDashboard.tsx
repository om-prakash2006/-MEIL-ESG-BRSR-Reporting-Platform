import React from 'react';
import {
  ShieldCheck,
  TrendingDown,
  FileText,
  Lock,
  Download,
  ExternalLink,
  Award,
  CheckCircle2,
} from 'lucide-react';

interface ManagementDashboardProps {
  data: any;
  onNavigate: (tab: string) => void;
}

export const ManagementDashboard: React.FC<ManagementDashboardProps> = ({ data, onNavigate }) => {
  const metrics = data?.metrics || {};
  const env = metrics?.environmental || {};
  const soc = metrics?.social || {};
  const gov = metrics?.governance || {};
  const reports = metrics?.finalReports || [];

  return (
    <div className="space-y-5">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0f172a] tracking-tight">
            Executive ESG Performance &amp; Governance
          </h1>
          <p className="text-xs text-[#64748b] mt-0.5">
            Executive read-only oversight of consolidated, auditor-assured ESG indicators, statutory BRSR Core compliance readiness, and sustainability performance benchmarks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => alert('Downloading Executive Summary PDF')}
            className="px-3.5 py-1.5 bg-white border border-[#cbd5e1] hover:bg-[#f8fafc] text-xs font-semibold text-[#334155] rounded shadow-2xs transition-colors"
          >
            Executive Summary PDF
          </button>
          <button
            onClick={() => onNavigate('reports')}
            className="px-3.5 py-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-semibold rounded shadow-2xs transition-colors"
          >
            View Final Statutory Dossier
          </button>
        </div>
      </div>

      {/* Top KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Gross GHG */}
        <div className="bg-white border border-[#e2e8f0] rounded-md p-3.5 space-y-1">
          <div className="text-[10px] font-bold text-[#64748b] uppercase">GROSS GHG EMISSIONS</div>
          <div className="text-2xl font-bold text-[#0f172a] tabular-nums">
            {metrics.totalGHG || '1,428,500'} <span className="text-xs font-normal text-[#64748b]">tCO2e</span>
          </div>
          <div className="text-[10px] text-[#059669] font-semibold flex items-center gap-1">
            <TrendingDown className="w-3 h-3" />
            <span>-3.2% vs FY24 Baseline</span>
          </div>
        </div>

        {/* Scope Proportions */}
        <div className="bg-white border border-[#e2e8f0] rounded-md p-3.5 space-y-1">
          <div className="text-[10px] font-bold text-[#64748b] uppercase">SCOPE PROPORTIONS</div>
          <div className="text-xs font-mono font-bold text-[#0f172a] space-y-0.5 pt-0.5">
            <div>S1: 58.9% (842.1k t)</div>
            <div>S2: 21.9% (312.4k t)</div>
            <div>S3: 19.2% (274.0k t)</div>
          </div>
        </div>

        {/* BRSR Maturity Index */}
        <div className="bg-white border border-[#e2e8f0] rounded-md p-3.5 space-y-1">
          <div className="text-[10px] font-bold text-[#64748b] uppercase">BRSR MATURITY INDEX</div>
          <div className="text-2xl font-bold text-[#1d4ed8] tabular-nums">
            78.4 <span className="text-xs text-[#64748b]">/ 100</span>
          </div>
          <div className="text-[10px] font-semibold text-[#1d4ed8]">Tier-1 High Governance</div>
          <div className="text-[9px] text-[#64748b]">Top Decile Listed Peer</div>
        </div>

        {/* Renewable Power Share */}
        <div className="bg-white border border-[#e2e8f0] rounded-md p-3.5 space-y-1">
          <div className="text-[10px] font-bold text-[#64748b] uppercase">RENEWABLE POWER SHARE</div>
          <div className="text-2xl font-bold text-[#059669] tabular-nums">
            18.4%
          </div>
          <div className="text-[10px] font-semibold text-[#059669]">+2.8% YoY Growth</div>
          <div className="text-[9px] text-[#64748b]">Captive Hydel + Solar PPAs</div>
        </div>

        {/* Independent Audit */}
        <div className="bg-white border border-[#e2e8f0] rounded-md p-3.5 space-y-1">
          <div className="text-[10px] font-bold text-[#64748b] uppercase">INDEPENDENT AUDIT</div>
          <div className="text-xl font-bold text-[#059669]">
            CERTIFIED
          </div>
          <div className="text-[10px] font-semibold text-[#059669]">ISAE 3000 (Revised)</div>
          <div className="text-[9px] text-[#64748b]">0 Disqualifications by EY</div>
        </div>
      </div>

      {/* ESG Pillar Performance & Statutory Benchmarks */}
      <div className="bg-white border border-[#e2e8f0] rounded-md p-4 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#f1f5f9]">
          <h3 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider">
            ESG PILLAR PERFORMANCE &amp; STATUTORY BENCHMARKS
          </h3>
          <span className="text-[11px] font-mono text-[#64748b]">Q3 YTD Aggregates</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Environmental */}
          <div className="p-3 border border-[#e2e8f0] rounded bg-[#f8fafc] space-y-2">
            <div className="flex items-center justify-between font-bold text-[#0f172a]">
              <span>Environmental (E)</span>
              <span className="text-[10px] bg-[#ecfdf5] text-[#059669] px-2 py-0.5 rounded font-semibold">VERIFIED</span>
            </div>
            <div className="space-y-1 text-[#475569]">
              <div className="flex justify-between"><span>Total Energy Consumption:</span> <strong className="text-[#0f172a]">{env.totalEnergyConsumption || '2.41 Million GJ'}</strong></div>
              <div className="flex justify-between"><span>Water Recycled &amp; Reused:</span> <strong className="text-[#0f172a]">{env.waterRecycledPct || '68.4%'}</strong></div>
              <div className="flex justify-between"><span>Waste Diverted from Landfill:</span> <strong className="text-[#0f172a]">{env.wasteDivertedFromLandfill || '84.2%'}</strong></div>
              <div className="flex justify-between"><span>Emission Intensity:</span> <strong className="text-[#0f172a]">{env.emissionIntensity || '18.2 t/Cr (-5.1%)'}</strong></div>
            </div>
          </div>

          {/* Social */}
          <div className="p-3 border border-[#e2e8f0] rounded bg-[#f8fafc] space-y-2">
            <div className="flex items-center justify-between font-bold text-[#0f172a]">
              <span>Social (S)</span>
              <span className="text-[10px] bg-[#ecfdf5] text-[#059669] px-2 py-0.5 rounded font-semibold">VERIFIED</span>
            </div>
            <div className="space-y-1 text-[#475569]">
              <div className="flex justify-between"><span>Monitored Workforce:</span> <strong className="text-[#0f172a]">{soc.monitoredWorkforce || '42,850 Total'}</strong></div>
              <div className="flex justify-between"><span>LTIFR:</span> <strong className="text-[#0f172a]">{soc.ltifr || '0.12 (Zero Fatal)'}</strong></div>
              <div className="flex justify-between"><span>Skill &amp; Safety Training:</span> <strong className="text-[#0f172a]">{soc.trainingHours || '28.4 hrs/emp'}</strong></div>
              <div className="flex justify-between"><span>Local CSR Spend (YTD):</span> <strong className="text-[#0f172a]">{soc.csrSpendYtd || '₹48.20 Cr (102%)'}</strong></div>
            </div>
          </div>

          {/* Governance */}
          <div className="p-3 border border-[#e2e8f0] rounded bg-[#f8fafc] space-y-2">
            <div className="flex items-center justify-between font-bold text-[#0f172a]">
              <span>Governance (G)</span>
              <span className="text-[10px] bg-[#ecfdf5] text-[#059669] px-2 py-0.5 rounded font-semibold">VERIFIED</span>
            </div>
            <div className="space-y-1 text-[#475569]">
              <div className="flex justify-between"><span>Board Independence:</span> <strong className="text-[#0f172a]">{gov.boardIndependence || '54.0%'}</strong></div>
              <div className="flex justify-between"><span>Anti-Corruption Training:</span> <strong className="text-[#0f172a]">{gov.antiCorruptionTraining || '100%'}</strong></div>
              <div className="flex justify-between"><span>Grievances Resolved:</span> <strong className="text-[#0f172a]">{gov.stakeholderGrievancesResolved || '98.4%'}</strong></div>
              <div className="flex justify-between"><span>Core Indicators:</span> <strong className="text-[#0f172a]">{gov.coreIndicatorsLocked || '100% Locked'}</strong></div>
            </div>
          </div>
        </div>
      </div>

      {/* Published Statutory Reports & Assurance Dossiers */}
      <div className="bg-white border border-[#e2e8f0] rounded-md p-4 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#f1f5f9]">
          <h3 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider">
            PUBLISHED STATUTORY REPORTS &amp; ASSURANCE DOSSIERS
          </h3>
          <span className="text-[10px] text-[#64748b]">Read-Only Certified Registry</span>
        </div>

        <div className="space-y-2 text-xs">
          {reports.map((rep: any, i: number) => (
            <div key={i} className="p-3 border border-[#e2e8f0] rounded bg-[#f8fafc] flex items-center justify-between">
              <div>
                <div className="font-bold text-[#0f172a]">{rep.title}</div>
                <div className="text-[11px] text-[#64748b]">Ref: {rep.ref} · {rep.date}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-semibold text-[#059669] bg-[#ecfdf5] px-2 py-0.5 rounded border border-[#a7f3d0]">
                  {rep.status}
                </span>
                <button
                  onClick={() => alert(`Opening ${rep.title}`)}
                  className="px-2.5 py-1 bg-white border border-[#cbd5e1] hover:bg-[#f8fafc] rounded font-semibold text-xs text-[#1d4ed8]"
                >
                  View Dossier
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
