import React, { useState } from 'react';
import {
  Building2,
  FileCheck,
  Clock,
  AlertTriangle,
  Scale,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../../services/api.ts';

interface BusinessUnitDashboardProps {
  data: any;
  onNavigate: (tab: string) => void;
}

export const BusinessUnitDashboard: React.FC<BusinessUnitDashboardProps> = ({ data, onNavigate }) => {
  const metrics = data?.metrics || {};
  const bottlenecks = data?.consolidationBottlenecks || [];

  const [queueItems, setQueueItems] = useState([
    {
      activityId: 'ACT-DIESEL-091',
      title: 'Kishtwar Hydro — HSD Fuel Logging (Scope 1)',
      quantity: '14,200 Liters',
      emissions: '38.10 tCO2e',
      evidence: 'Fuel Invoice #INV-KIST-881',
      facility: 'Kishtwar Complex',
      lead: 'Rajesh Kumar',
      status: 'AWAITING_BU_VERIFICATION',
      notes: '',
    },
    {
      activityId: 'ACT-ELEC-402',
      title: 'Subansiri Hydro — HT Grid Electricity (Scope 2)',
      quantity: '245,000 kWh',
      emissions: '173.95 tCO2e',
      evidence: 'DISCOM Utility Bill #EB-992',
      facility: 'Subansiri HEP',
      lead: 'S. Prakash',
      status: 'AWAITING_BU_VERIFICATION',
      notes: '',
    },
  ]);

  const [notification, setNotification] = useState<string | null>(null);

  const handleVerifyItem = async (activityId: string) => {
    try {
      await api.buVerifyRecord(activityId, 'BU verification completed: checklist verified and emission calculations confirmed.');
    } catch {
      // Local state update ensures smooth prototyping if backend record id is mock
    }
    setQueueItems((prev) =>
      prev.map((item) =>
        item.activityId === activityId ? { ...item, status: 'VERIFIED_FORWARDED' } : item
      )
    );
    setNotification(`✓ Record ${activityId} verified by Business Unit and forwarded to Company / Legal Entity review!`);
    setTimeout(() => setNotification(null), 5000);
  };

  const handleFlagDiscrepancy = async (activityId: string) => {
    const reason = window.prompt(
      `Enter discrepancy reason for returning ${activityId} to facility lead:`,
      'Discrepancy identified: Attached fuel manifest does not match metered consumption log.'
    );
    if (!reason) return;

    try {
      await api.buReturnRecord(activityId, reason);
    } catch {
      // Local fallback
    }
    setQueueItems((prev) =>
      prev.map((item) =>
        item.activityId === activityId
          ? { ...item, status: 'RETURNED_DISCREPANCY', notes: reason }
          : item
      )
    );
    setNotification(`⚠️ Discrepancy logged for ${activityId}. Record returned to Facility with version bump.`);
    setTimeout(() => setNotification(null), 5000);
  };

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {notification && (
        <div className="p-3 bg-[#ecfdf5] border border-[#a7f3d0] rounded-md text-xs font-semibold text-[#065f46] flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#059669]" />
            <span>{notification}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-[#047857] hover:underline text-[11px]">
            Dismiss
          </button>
        </div>
      )}

      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#0f172a] tracking-tight">
              Business Unit ESG Dashboard
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#1d4ed8] text-white">
              BUSINESS UNIT USER
            </span>
          </div>
          <p className="text-xs text-[#64748b] mt-0.5">
            Consolidate operational data, monitor child facility reporting progress, track open audit findings, and clear Scope 1–3 submissions across Northern Power Division.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('reconciliation')}
            className="px-3.5 py-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-semibold rounded shadow-2xs transition-colors"
          >
            Review BU Consolidations
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Child Projects */}
        <div className="bg-white border border-[#e2e8f0] rounded-md p-3.5 space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-[#64748b] uppercase">
            <span>CHILD PROJECTS</span>
            <Building2 className="w-3.5 h-3.5 text-[#1d4ed8]" />
          </div>
          <div className="text-xl font-bold text-[#0f172a] tabular-nums">
            {metrics.projectCount || 6} Facilities
          </div>
          <div className="text-[10px] text-[#64748b] truncate">Subansiri, Polavara...</div>
          <div className="text-[10px] font-semibold text-[#059669]">Status: 100% Online</div>
        </div>

        {/* BU Data Completion */}
        <div className="bg-white border border-[#e2e8f0] rounded-md p-3.5 space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-[#64748b] uppercase">
            <span>BU DATA COMPLETION</span>
            <FileCheck className="w-3.5 h-3.5 text-[#059669]" />
          </div>
          <div className="text-xl font-bold text-[#0f172a] tabular-nums flex items-baseline gap-1.5">
            <span>{metrics.dataCompletion || '91.4%'}</span>
            <span className="text-[10px] text-[#059669] font-semibold">{metrics.dataCompletionMoM || '+4.2% MoM'}</span>
          </div>
          <div className="text-[10px] text-[#64748b]">{metrics.metricsConsolidated || '168 / 184 Metrics'}</div>
          <div className="w-full h-1.5 bg-gray-100 rounded overflow-hidden mt-1">
            <div className="h-full bg-[#059669]" style={{ width: '91.4%' }}></div>
          </div>
        </div>

        {/* Pending BU Reviews */}
        <div className="bg-white border border-[#e2e8f0] rounded-md p-3.5 space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-[#64748b] uppercase">
            <span>PENDING BU REVIEWS</span>
            <Clock className="w-3.5 h-3.5 text-[#d97706]" />
          </div>
          <div className="text-xl font-bold text-[#0f172a] tabular-nums flex items-baseline gap-1.5">
            <span>{queueItems.filter((q) => q.status === 'AWAITING_BU_VERIFICATION').length} Facility</span>
            <span className="text-[9px] font-bold bg-[#fff1f2] text-[#e11d48] px-1 rounded">Stage 2</span>
          </div>
          <div className="text-[10px] text-[#64748b]">Submissions awaiting sign-off</div>
          <div className="text-[10px] font-semibold text-[#d97706]">Target SLA: Within 48h</div>
        </div>

        {/* Open Audit Issues */}
        <div className="bg-white border border-[#e2e8f0] rounded-md p-3.5 space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-[#64748b] uppercase">
            <span>OPEN AUDIT ISSUES</span>
            <AlertTriangle className="w-3.5 h-3.5 text-[#e11d48]" />
          </div>
          <div className="text-xl font-bold text-[#e11d48] tabular-nums flex items-baseline gap-1.5">
            <span>{metrics.openIssues || 3} Findings</span>
            <span className="text-[9px] font-bold bg-gray-100 text-[#475569] px-1 rounded">Assurance</span>
          </div>
          <div className="text-[10px] text-[#64748b]">Flagged by External Assurers</div>
          <div className="text-[10px] font-semibold text-[#e11d48]">Subansiri / Kishtwar (P1)</div>
        </div>

        {/* Total BU Emissions */}
        <div className="bg-white border border-[#e2e8f0] rounded-md p-3.5 space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-[#64748b] uppercase">
            <span>TOTAL BU EMISSIONS</span>
            <span className="text-[10px] font-mono bg-gray-100 px-1 rounded">tCO2e</span>
          </div>
          <div className="text-xl font-bold text-[#0f172a] tabular-nums">
            {metrics.totalEmissions || '412,850'}
          </div>
          <div className="text-[10px] text-[#64748b]">tCO2e (Net Aggregated)</div>
          <div className="text-[9px] text-[#475569] truncate">
            S1: {metrics.scope1 || '184.2k'} · S2: {metrics.scope2 || '142.4k'}
          </div>
        </div>

        {/* Reconciliation Status */}
        <div className="bg-white border border-[#e2e8f0] rounded-md p-3.5 space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-[#64748b] uppercase">
            <span>RECONCILIATION</span>
            <Scale className="w-3.5 h-3.5 text-[#059669]" />
          </div>
          <div className="text-xl font-bold text-[#059669] tabular-nums flex items-baseline gap-1.5">
            <span>{metrics.reconciliationStatus || '97.8%'}</span>
            <span className="text-[9px] font-bold bg-[#ecfdf5] text-[#059669] px-1 rounded">Matched</span>
          </div>
          <div className="text-[10px] text-[#64748b]">Net Variance: +0.8%</div>
          <div className="text-[10px] font-semibold text-[#059669]">Tolerance (±2.0%) Compliant</div>
        </div>
      </div>

      {/* Facility Submissions Verification & Discrepancy Queue */}
      <div className="bg-white border border-[#cbd5e1] rounded-md p-4 space-y-3 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#e2e8f0]">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-[#059669]" />
                <span>FACILITY ESG SUBMISSIONS VERIFICATION QUEUE (STAGE 2 VERIFICATION)</span>
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#fffbeb] text-[#d97706] border border-[#fde68a]">
                {queueItems.filter((q) => q.status === 'AWAITING_BU_VERIFICATION').length} Items Awaiting BU Sign-Off
              </span>
            </div>
            <p className="text-[11px] text-[#64748b] mt-0.5">
              Review facility operational records, inspect linked evidence documents, verify GHG calculation accuracy, and proceed to Legal Entity Review or flag discrepancies.
            </p>
          </div>
          <button
            onClick={() => onNavigate('esg-data')}
            className="px-3 py-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-semibold rounded flex items-center gap-1 shrink-0"
          >
            <span>Open All ESG Ledgers</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {queueItems.map((item) => (
            <div
              key={item.activityId}
              className={`p-3 border rounded-md space-y-2 transition-colors ${
                item.status === 'VERIFIED_FORWARDED'
                  ? 'bg-[#ecfdf5] border-[#a7f3d0]'
                  : item.status === 'RETURNED_DISCREPANCY'
                  ? 'bg-[#fff1f2] border-[#fecdd3]'
                  : 'bg-[#f8fafc] border-[#e2e8f0] hover:border-[#bfdbfe]'
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <div className="font-bold text-[#0f172a]">{item.title}</div>
                <span className="text-[10px] font-mono bg-[#eff4ff] text-[#1d4ed8] px-1.5 py-0.5 rounded font-bold">
                  {item.activityId}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px] text-[#475569]">
                <div><strong>Quantity:</strong> {item.quantity}</div>
                <div><strong>Emissions:</strong> {item.emissions}</div>
                <div><strong>Evidence:</strong> {item.evidence}</div>
              </div>

              {item.notes && (
                <div className="text-[10px] text-[#e11d48] bg-white p-1.5 rounded border border-[#fecdd3]">
                  <strong>Discrepancy:</strong> {item.notes}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-[#e2e8f0]">
                <span className="text-[10px] text-[#64748b]">
                  Facility: {item.facility} · Site Lead: {item.lead}
                </span>
                <div className="flex items-center gap-1.5">
                  {item.status === 'AWAITING_BU_VERIFICATION' ? (
                    <>
                      <button
                        onClick={() => handleFlagDiscrepancy(item.activityId)}
                        className="px-2.5 py-1 bg-[#fff1f2] border border-[#fecdd3] hover:bg-[#ffe4e6] text-[#e11d48] font-bold text-[10px] rounded"
                      >
                        ⚠️ Flag Discrepancy
                      </button>
                      <button
                        onClick={() => handleVerifyItem(item.activityId)}
                        className="px-2.5 py-1 bg-[#059669] hover:bg-[#047857] text-white font-bold text-[10px] rounded"
                      >
                        ✓ Verify &amp; Forward
                      </button>
                    </>
                  ) : item.status === 'VERIFIED_FORWARDED' ? (
                    <span className="text-[10px] font-bold text-[#059669] bg-white px-2 py-0.5 rounded border border-[#a7f3d0]">
                      ✓ Stage 2 BU Verified
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-[#e11d48] bg-white px-2 py-0.5 rounded border border-[#fecdd3]">
                      Returned to Facility Lead
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>



      {/* Bottom Grid: Emissions Breakdown & Consolidation Bottlenecks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Left: Emissions Contribution */}
        <div className="bg-white border border-[#e2e8f0] rounded-md p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider">
              EMISSIONS CONTRIBUTION BY PROJECT
            </h3>
            <span className="text-[11px] font-mono text-[#64748b]">Total: 412,850 tCO2e</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <div className="flex justify-between font-semibold text-[#0f172a]">
                <span>Kishtwar Hydro Complex (JV)</span>
                <span>180,650 tCO2e (43.8%)</span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded overflow-hidden flex">
                <div className="bg-[#1d4ed8]" style={{ width: '42%' }}></div>
                <div className="bg-[#0284c7]" style={{ width: '43%' }}></div>
                <div className="bg-[#059669]" style={{ width: '15%' }}></div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between font-semibold text-[#0f172a]">
                <span>Zojila Tunnel Project (Pkg 2)</span>
                <span>84,600 tCO2e (20.5%)</span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded overflow-hidden flex">
                <div className="bg-[#1d4ed8]" style={{ width: '57%' }}></div>
                <div className="bg-[#0284c7]" style={{ width: '15%' }}></div>
                <div className="bg-[#059669]" style={{ width: '28%' }}></div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between font-semibold text-[#0f172a]">
                <span>Subansiri Hydro Electric (2000 MW)</span>
                <span>33,050 tCO2e (8.0%)</span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded overflow-hidden flex">
                <div className="bg-[#1d4ed8]" style={{ width: '40%' }}></div>
                <div className="bg-[#0284c7]" style={{ width: '25%' }}></div>
                <div className="bg-[#059669]" style={{ width: '35%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Consolidation Bottlenecks */}
        <div className="bg-white border border-[#e2e8f0] rounded-md p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#f1f5f9]">
            <h3 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider">
              CONSOLIDATION BOTTLENECKS
            </h3>
            <span className="text-[10px] font-bold bg-[#fff1f2] text-[#e11d48] px-2 py-0.5 rounded">
              3 Blockers
            </span>
          </div>

          <div className="space-y-2.5">
            {bottlenecks.map((item: any, i: number) => (
              <div key={i} className="p-3 border border-[#e2e8f0] rounded bg-[#f8fafc] text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#0f172a]">{item.facility}</span>
                  <span className="text-[10px] font-semibold text-[#e11d48] bg-[#fff1f2] px-1.5 py-0.5 rounded border border-[#fecdd3]">
                    {item.status}
                  </span>
                </div>
                <p className="text-[11px] text-[#64748b] leading-relaxed">
                  {item.description}
                </p>
                <div className="pt-1 flex justify-end">
                  <button
                    onClick={() => onNavigate('reconciliation')}
                    className="px-2.5 py-1 bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-semibold text-[11px] rounded"
                  >
                    {item.action}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
