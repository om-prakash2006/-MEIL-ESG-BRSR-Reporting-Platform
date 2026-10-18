import React, { useState, useEffect } from 'react';
import {
  LineChart as LineChartIcon,
  Sparkles,
  AlertTriangle,
  Building2,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Send,
  CheckCircle2,
  Info,
  ChevronRight,
  Bot,
  SlidersHorizontal,
  Flame,
  Zap,
  Truck,
  Wind,
} from 'lucide-react';
import { AuthUser } from '../../types.ts';
import { api } from '../../services/api.ts';

interface AnalyticsPageProps {
  user: AuthUser;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ user }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'scope12' | 'scope3' | 'facilities' | 'anomalies' | 'ai-analyst'>('overview');

  // Filter state
  const [reportingPeriod, setReportingPeriod] = useState<string>('Q3_FY2526');
  const [selectedBu, setSelectedBu] = useState<string>('ALL');
  const [selectedFacility, setSelectedFacility] = useState<string>('ALL');

  // Backend analytics state
  const [overview, setOverview] = useState<any>(null);
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [loadingAi, setLoadingAi] = useState<boolean>(false);

  // Chat / Ask AI state
  const [userQuery, setUserQuery] = useState<string>('');
  const [queryLoading, setQueryLoading] = useState<boolean>(false);
  const [chatHistory, setChatHistory] = useState<Array<{ sender: 'user' | 'assistant'; text: string; time: string }>>([]);

  const loadAnalytics = async () => {
    try {
      setRefreshing(true);
      const data = await api.getAnalyticsOverview({
        reportingPeriodId: reportingPeriod,
        businessUnitId: selectedBu !== 'ALL' ? selectedBu : undefined,
        facilityId: selectedFacility !== 'ALL' ? selectedFacility : undefined,
      });
      setOverview(data);
    } catch (err) {
      console.error('Failed to load analytics overview:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [reportingPeriod, selectedBu, selectedFacility]);

  const handleGenerateAiBriefing = async () => {
    try {
      setLoadingAi(true);
      const insights = await api.generateAiInsights({
        reportingPeriodId: reportingPeriod,
        businessUnitId: selectedBu !== 'ALL' ? selectedBu : undefined,
        facilityId: selectedFacility !== 'ALL' ? selectedFacility : undefined,
      });
      setAiInsights(insights);
      setActiveTab('ai-analyst');
    } catch (err) {
      console.error('Failed to generate AI insights:', err);
    } finally {
      setLoadingAi(false);
    }
  };

  const handleSendQuery = async (queryText?: string) => {
    const q = (queryText || userQuery).trim();
    if (!q) return;

    const userMsg = { sender: 'user' as const, text: q, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setChatHistory((prev) => [...prev, userMsg]);
    setUserQuery('');
    setQueryLoading(true);

    try {
      const res = await api.queryAiAnalyst(q, {
        reportingPeriodId: reportingPeriod,
        businessUnitId: selectedBu !== 'ALL' ? selectedBu : undefined,
        facilityId: selectedFacility !== 'ALL' ? selectedFacility : undefined,
      });
      setChatHistory((prev) => [
        ...prev,
        {
          sender: 'assistant' as const,
          text: res.answer,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      setChatHistory((prev) => [
        ...prev,
        {
          sender: 'assistant' as const,
          text: 'Unable to process query with backend AI service. Please verify network connectivity.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setQueryLoading(false);
    }
  };

  if (loading && !overview) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-8 bg-white rounded-xl border border-slate-200">
        <div className="w-10 h-10 border-3 border-blue-700 border-t-transparent rounded-full animate-spin mb-4" />
        <h3 className="text-sm font-bold text-slate-800">Calculating Statutory ESG Analytics...</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-md">
          Executing deterministic GHG accounting across Scope 1, Scope 2, and all 15 Scope 3 value-chain categories.
        </p>
      </div>
    );
  }

  const s = overview?.scopeBreakdown || { scope1Tons: 0, scope2Tons: 0, scope3Tons: 0, totalTons: 0, scope1Percentage: 0, scope2Percentage: 0, scope3Percentage: 0 };
  const h = overview?.historicalComparison || { percentageChange: 0, absoluteDeltaTons: 0, trend: 'STABLE', comparisonPeriod: 'Q2_FY2526' };
  const r = overview?.readiness || { verifiedPercentage: 0, missingEvidenceCount: 0, totalRecords: 0 };
  const gas = overview?.gasBreakdown || { co2Tons: 0, ch4Tons: 0, n2oTons: 0, sf6Tons: 0, hfcsTons: 0 };

  return (
    <div className="space-y-6">
      {/* Top Header & Context Controls */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-50 text-blue-700 rounded-lg">
                <LineChartIcon className="w-5 h-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">ESG & GHG Analytics Intelligence</h1>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded">
                    DEMO DATASET
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> DETERMINISTIC BACKEND
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Authoritative greenhouse gas metrics, category distributions, historical period deltas, and Gemini AI Impact insights.
                </p>
              </div>
            </div>
          </div>

          {/* Filters & Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <select
                aria-label="Reporting Period"
                value={reportingPeriod}
                onChange={(e) => setReportingPeriod(e.target.value)}
                className="bg-transparent font-medium text-slate-800 focus:outline-hidden cursor-pointer"
              >
                <option value="Q3_FY2526">Q3 FY2526 (Oct - Dec 2025)</option>
                <option value="Q2_FY2526">Q2 FY2526 (Jul - Sep 2025)</option>
                <option value="Q1_FY2526">Q1 FY2526 (Apr - Jun 2025)</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <select
                aria-label="Business Unit"
                value={selectedBu}
                onChange={(e) => setSelectedBu(e.target.value)}
                className="bg-transparent font-medium text-slate-800 focus:outline-hidden cursor-pointer"
              >
                <option value="ALL">All Business Units</option>
                <option value="BU001">Hydro & Water Projects</option>
                <option value="BU002">Tunnels, Transport & Infra</option>
              </select>
            </div>

            <button
              onClick={loadAnalytics}
              disabled={refreshing}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
              title="Refresh Analytics"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            </button>

            <button
              onClick={handleGenerateAiBriefing}
              disabled={loadingAi}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Sparkles className={`w-3.5 h-3.5 ${loadingAi ? 'animate-spin' : ''}`} />
              <span>{loadingAi ? 'Analyzing Metrics...' : 'AI Impact Analyst'}</span>
            </button>
          </div>
        </div>

        {/* Global KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-5 pt-5 border-t border-slate-100">
          <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Footprint</span>
            <div className="text-xl font-bold text-slate-900 mt-1">{s.totalTons.toLocaleString()} <span className="text-xs font-normal text-slate-500">tCO2e</span></div>
            <div className="flex items-center gap-1 mt-1 text-[11px]">
              {h.trend === 'INCREASING' ? (
                <span className="text-red-700 font-semibold flex items-center"><ArrowUpRight className="w-3 h-3" />+{h.percentageChange}%</span>
              ) : (
                <span className="text-emerald-700 font-semibold flex items-center"><ArrowDownRight className="w-3 h-3" />{h.percentageChange}%</span>
              )}
              <span className="text-slate-400">vs {h.comparisonPeriod}</span>
            </div>
          </div>

          <div className="bg-amber-50/40 p-3 rounded-lg border border-amber-100">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider">Scope 1 (Direct)</span>
              <Flame className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-xl font-bold text-amber-950 mt-1">{s.scope1Tons.toLocaleString()} <span className="text-xs font-normal text-amber-700">tCO2e</span></div>
            <span className="text-[11px] font-medium text-amber-800 mt-1 block">{s.scope1Percentage}% of footprint</span>
          </div>

          <div className="bg-blue-50/40 p-3 rounded-lg border border-blue-100">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider">Scope 2 (Power)</span>
              <Zap className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="text-xl font-bold text-blue-950 mt-1">{s.scope2Tons.toLocaleString()} <span className="text-xs font-normal text-blue-700">tCO2e</span></div>
            <span className="text-[11px] font-medium text-blue-800 mt-1 block">{s.scope2Percentage}% of footprint</span>
          </div>

          <div className="bg-purple-50/40 p-3 rounded-lg border border-purple-100">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-purple-900 uppercase tracking-wider">Scope 3 (Value Chain)</span>
              <Truck className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <div className="text-xl font-bold text-purple-950 mt-1">{s.scope3Tons.toLocaleString()} <span className="text-xs font-normal text-purple-700">tCO2e</span></div>
            <span className="text-[11px] font-medium text-purple-800 mt-1 block">{s.scope3Percentage}% of footprint</span>
          </div>

          <div className="bg-emerald-50/40 p-3 rounded-lg border border-emerald-100">
            <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">Assurance Rate</span>
            <div className="text-xl font-bold text-emerald-950 mt-1">{r.verifiedPercentage}%</div>
            <span className="text-[11px] text-emerald-800 mt-1 block font-medium">{r.totalRecords} activities tracked</span>
          </div>

          <div className="bg-rose-50/40 p-3 rounded-lg border border-rose-100">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-rose-900 uppercase tracking-wider">Active Anomalies</span>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            </div>
            <div className="text-xl font-bold text-rose-950 mt-1">{overview?.anomalies?.length || 0}</div>
            <span className="text-[11px] text-rose-800 mt-1 block font-medium">{r.missingEvidenceCount} missing evidence</span>
          </div>
        </div>

        {/* Gas Breakdown Strip */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
            <Wind className="w-3.5 h-3.5 text-slate-400" /> Statutory Gas Split:
          </span>
          <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-mono text-[11px]">CO₂: {gas.co2Tons} t</span>
          <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-mono text-[11px]">CH₄: {gas.ch4Tons} t</span>
          <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-mono text-[11px]">N₂O: {gas.n2oTons} t</span>
          <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-mono text-[11px]">SF₆: {gas.sf6Tons} t</span>
          <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-mono text-[11px]">HFCs: {gas.hfcsTons} t</span>
        </div>
      </div>

      {/* Analytics Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-1 bg-white px-4 rounded-t-xl pt-2">
        {[
          { id: 'overview', label: 'Overview & Trends', icon: Layers },
          { id: 'scope12', label: 'Scope 1 & Scope 2 Diagnostics', icon: Flame },
          { id: 'scope3', label: 'Scope 3 (All 15 Categories)', icon: Truck },
          { id: 'facilities', label: 'Facility Hotspots', icon: Building2 },
          { id: 'anomalies', label: `Anomaly Alerts (${overview?.anomalies?.length || 0})`, icon: AlertTriangle },
          { id: 'ai-analyst', label: 'Gemini AI Impact Analyst', icon: Sparkles },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                isActive
                  ? 'border-blue-700 text-blue-700 bg-blue-50/30'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & TRENDS */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Scope Distribution Card */}
            <div className="bg-white rounded-xl p-5 border border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 mb-2">Statutory Scope Distribution (GHG Protocol Corporate Standard)</h3>
              <p className="text-xs text-slate-500 mb-4">
                Emissions boundary proportion across Scope 1 direct combustions, Scope 2 purchased electricity (CEA baseline 0.716 kgCO2e/kWh), and Scope 3 upstream/downstream value chain.
              </p>

              {/* Visual Distribution Bar */}
              <div className="h-6 w-full rounded-lg overflow-hidden flex shadow-inner bg-slate-100 mb-4">
                <div style={{ width: `${s.scope1Percentage}%` }} className="bg-amber-500 h-full flex items-center justify-center text-[10px] text-white font-bold" title={`Scope 1: ${s.scope1Percentage}%`}>
                  {s.scope1Percentage > 8 && `${s.scope1Percentage}%`}
                </div>
                <div style={{ width: `${s.scope2Percentage}%` }} className="bg-blue-600 h-full flex items-center justify-center text-[10px] text-white font-bold" title={`Scope 2: ${s.scope2Percentage}%`}>
                  {s.scope2Percentage > 8 && `${s.scope2Percentage}%`}
                </div>
                <div style={{ width: `${s.scope3Percentage}%` }} className="bg-purple-600 h-full flex items-center justify-center text-[10px] text-white font-bold" title={`Scope 3: ${s.scope3Percentage}%`}>
                  {s.scope3Percentage > 8 && `${s.scope3Percentage}%`}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-100">
                  <div className="flex items-center gap-1.5 font-semibold text-amber-900">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span>Scope 1 Direct</span>
                  </div>
                  <div className="text-base font-bold text-amber-950 mt-1">{s.scope1Tons} tCO2e</div>
                  <div className="text-[11px] text-amber-800 mt-0.5">{s.scope1Percentage}% of total</div>
                </div>

                <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                  <div className="flex items-center gap-1.5 font-semibold text-blue-900">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    <span>Scope 2 Purchased</span>
                  </div>
                  <div className="text-base font-bold text-blue-950 mt-1">{s.scope2Tons} tCO2e</div>
                  <div className="text-[11px] text-blue-800 mt-0.5">{s.scope2Percentage}% of total</div>
                </div>

                <div className="p-3 bg-purple-50/50 rounded-lg border border-purple-100">
                  <div className="flex items-center gap-1.5 font-semibold text-purple-900">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                    <span>Scope 3 Value Chain</span>
                  </div>
                  <div className="text-base font-bold text-purple-950 mt-1">{s.scope3Tons} tCO2e</div>
                  <div className="text-[11px] text-purple-800 mt-0.5">{s.scope3Percentage}% of total</div>
                </div>
              </div>
            </div>

            {/* Historical Period Variance Card */}
            <div className="bg-white rounded-xl p-5 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-900">Historical Reporting-Period Comparison</h3>
                <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-mono font-medium">
                  {h.currentPeriod} vs {h.comparisonPeriod}
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Mathematical comparison against preceding quarter across identical organizational reporting boundaries.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-4">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Delta Volume</span>
                  <span className="text-base font-bold text-slate-900 mt-1 block">
                    {h.absoluteDeltaTons > 0 ? `+${h.absoluteDeltaTons}` : h.absoluteDeltaTons} tCO2e
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Percentage Shift</span>
                  <span className={`text-base font-bold mt-1 block ${h.percentageChange > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {h.percentageChange > 0 ? `+${h.percentageChange}%` : `${h.percentageChange}%`}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Scope 1 Delta</span>
                  <span className="text-base font-bold text-slate-900 mt-1 block">
                    {h.scope1DeltaTons > 0 ? `+${h.scope1DeltaTons}` : h.scope1DeltaTons} t
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Scope 2 Delta</span>
                  <span className="text-base font-bold text-slate-900 mt-1 block">
                    {h.scope2DeltaTons > 0 ? `+${h.scope2DeltaTons}` : h.scope2DeltaTons} t
                  </span>
                </div>
              </div>

              <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-100 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-900 leading-relaxed">
                  <strong>Variance Diagnosis:</strong> The {Math.abs(h.percentageChange)}% {h.trend.toLowerCase()} trend reflects project milestone ramping at Northern Div Subansiri Hydro, alongside verified Scope 3 cement deliveries recorded under EPD certifications.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Readiness & Hotspot Summary */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-5 border border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 mb-1">BRSR Reporting Readiness</h3>
              <p className="text-xs text-slate-500 mb-4">Statutory SEBI BRSR Core data completeness index</p>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between text-slate-700 font-medium mb-1">
                    <span>Audit Assurance Progress</span>
                    <span>{r.verifiedPercentage}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div style={{ width: `${r.verifiedPercentage}%` }} className="bg-emerald-600 h-full rounded-full" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-700 font-medium mb-1">
                    <span>Primary Evidence Backing</span>
                    <span>{overview?.readiness?.primaryDataPercentage || 75}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div style={{ width: `${overview?.readiness?.primaryDataPercentage || 75}%` }} className="bg-blue-600 h-full rounded-full" />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-600">
                  <div className="flex justify-between">
                    <span>Approved / Locked Records:</span>
                    <span className="font-semibold text-slate-800">{r.approvedRecords + r.lockedRecords} of {r.totalRecords}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Unresolved Audit Findings:</span>
                    <span className="font-semibold text-rose-700">{overview?.assurance?.openAuditFindings || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Reconciliation Resolution:</span>
                    <span className="font-semibold text-emerald-700">{overview?.assurance?.reconciliationResolutionRate || 100}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick AI Trigger Card */}
            <div className="bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 text-white rounded-xl p-5 shadow-sm relative overflow-hidden">
              <div className="relative z-10">
                <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-500/30 text-blue-200 border border-blue-400/30 rounded inline-flex items-center gap-1 mb-2">
                  <Sparkles className="w-3 h-3" /> GEMINI 2.5 FLASH
                </span>
                <h4 className="text-sm font-bold text-white">Request AI Impact Briefing</h4>
                <p className="text-xs text-slate-300 mt-1 mb-4 leading-relaxed">
                  Synthesize audit observations, facility hotspots, and BRSR Principle 6 compliance recommendations grounded strictly in backend numbers.
                </p>
                <button
                  onClick={handleGenerateAiBriefing}
                  disabled={loadingAi}
                  className="w-full py-2 bg-white text-blue-900 hover:bg-slate-100 font-bold rounded-lg text-xs transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Bot className="w-4 h-4 text-blue-700" />
                  <span>{loadingAi ? 'Analyzing Backend Dataset...' : 'Generate Executive Briefing'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SCOPE 1 & 2 DIAGNOSTICS */}
      {activeTab === 'scope12' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Scope 1 Diagnostics */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Scope 1: Direct Operations Diagnostics</h3>
                <p className="text-xs text-slate-500 mt-0.5">Combustion, industrial process, fugitives, and carbon capture</p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded">
                Total: {s.scope1Tons} tCO2e
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800 block">Stationary Combustion</span>
                  <span className="text-[11px] text-slate-500">Diesel DG sets, Natural Gas SCM, Furnace Oil Boilers</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-900 block">{overview?.scope1Details?.stationaryCombustionTons} tCO2e</span>
                  <span className="text-[10px] text-slate-500">
                    {s.scope1Tons > 0 ? Math.round((overview?.scope1Details?.stationaryCombustionTons / s.scope1Tons) * 100) : 0}%
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800 block">Mobile Combustion</span>
                  <span className="text-[11px] text-slate-500">HCV heavy fleet, site inspection pickups, passenger vehicles</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-900 block">{overview?.scope1Details?.mobileCombustionTons} tCO2e</span>
                  <span className="text-[10px] text-slate-500">
                    {s.scope1Tons > 0 ? Math.round((overview?.scope1Details?.mobileCombustionTons / s.scope1Tons) * 100) : 0}%
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800 block">Industrial Process Emissions</span>
                  <span className="text-[11px] text-slate-500">Cement clinker calcination, steelmaking reactions, asphalt mixing</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-900 block">{overview?.scope1Details?.processEmissionsTons} tCO2e</span>
                  <span className="text-[10px] text-slate-500">
                    {s.scope1Tons > 0 ? Math.round((overview?.scope1Details?.processEmissionsTons / s.scope1Tons) * 100) : 0}%
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800 block">Fugitive Emissions</span>
                  <span className="text-[11px] text-slate-500">Refrigerants R-410A / R-134a, SF6 GIS switchgear, gas pipelines</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-900 block">{overview?.scope1Details?.fugitiveEmissionsTons} tCO2e</span>
                  <span className="text-[10px] text-slate-500">
                    {s.scope1Tons > 0 ? Math.round((overview?.scope1Details?.fugitiveEmissionsTons / s.scope1Tons) * 100) : 0}%
                  </span>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-emerald-950 block">Carbon Capture & Permanent Storage</span>
                  <span className="text-[11px] text-emerald-800">ISO 27914 verified geological permanent sequestration</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-emerald-900 block">-{overview?.scope1Details?.carbonCaptureTons} tCO2e</span>
                  <span className="text-[10px] text-emerald-700">Deduction</span>
                </div>
              </div>
            </div>
          </div>

          {/* Scope 2 Diagnostics */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Scope 2: Purchased Energy Accounting</h3>
                <p className="text-xs text-slate-500 mt-0.5">Dual reporting: Location-based vs Market-based contractual instruments</p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 bg-blue-50 text-blue-900 border border-blue-200 rounded">
                Total: {s.scope2Tons} tCO2e
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs mb-2">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Location-Based Total</span>
                <span className="text-lg font-bold text-slate-900 mt-1 block">{overview?.scope2Details?.locationBasedTons} tCO2e</span>
                <span className="text-[10px] text-slate-500">CEA National Grid (0.716 kg/kWh)</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Market-Based Total</span>
                <span className="text-lg font-bold text-slate-900 mt-1 block">{overview?.scope2Details?.marketBasedTons} tCO2e</span>
                <span className="text-[10px] text-slate-500">Contractual PPAs + Residual Mix</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800 block">Indian Grid Electricity Drawdown</span>
                  <span className="text-[11px] text-slate-500">High-Tension substation supply across northern & southern grids</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-900 block">{overview?.scope2Details?.gridElectricityTons} tCO2e</span>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-emerald-950 block">Captive Renewable Solar & Wind</span>
                  <span className="text-[11px] text-emerald-800">Onsite solar rooftop & open access zero-emission PPAs</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-emerald-900 block">0.00 tCO2e</span>
                  <span className="text-[10px] text-emerald-700 font-bold">{overview?.scope2Details?.renewablePercentage}% Renewable</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800 block">Purchased Steam & Thermal Enthalpy</span>
                  <span className="text-[11px] text-slate-500">High-pressure steam imported from industrial partners</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-900 block">{overview?.scope2Details?.steamAndThermalTons} tCO2e</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800 block">District Chilled Water / Cooling</span>
                  <span className="text-[11px] text-slate-500">Chilled water networks supplying tunnel and camp facilities</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-900 block">{overview?.scope2Details?.coolingTons} tCO2e</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SCOPE 3 (ALL 15 CATEGORIES) */}
      {activeTab === 'scope3' && (
        <div className="bg-white rounded-xl p-5 border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Complete Scope 3 Value-Chain Breakdown (Categories 1–15)</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Comprehensive accounting adhering to the GHG Protocol Corporate Value Chain (Scope 3) Standard.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-3 py-1 bg-purple-50 text-purple-900 border border-purple-200 rounded">
                Scope 3 Total: {s.scope3Tons} tCO2e ({s.scope3Percentage}% of Footprint)
              </span>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-3 w-16">Cat #</th>
                  <th className="py-2.5 px-3">Scope 3 Category Name</th>
                  <th className="py-2.5 px-3">Boundary</th>
                  <th className="py-2.5 px-3 text-right">Emissions (tCO2e)</th>
                  <th className="py-2.5 px-3 text-right">Share of Scope 3</th>
                  <th className="py-2.5 px-3 text-center">Activities</th>
                  <th className="py-2.5 px-3 text-center">Data Maturity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overview?.scope3Categories?.map((cat: any) => {
                  const isUpstream = cat.categoryNo <= 8;
                  return (
                    <tr key={cat.categoryNo} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-700">Cat {cat.categoryNo}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">{cat.name}</td>
                      <td className="py-2.5 px-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          isUpstream ? 'bg-sky-50 text-sky-800 border border-sky-200' : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                        }`}>
                          {isUpstream ? 'Upstream' : 'Downstream'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {cat.emissionsTons.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden hidden sm:block">
                            <div style={{ width: `${Math.min(cat.percentageOfScope3, 100)}%` }} className="bg-purple-600 h-full rounded-full" />
                          </div>
                          <span className="font-mono text-slate-600 w-10 text-right">{cat.percentageOfScope3}%</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-600 font-mono">{cat.recordCount}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          cat.dataQualityStatus === 'HIGH'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : cat.dataQualityStatus === 'MEDIUM'
                            ? 'bg-blue-50 text-blue-800 border border-blue-200'
                            : cat.dataQualityStatus === 'ESTIMATED'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {cat.dataQualityStatus === 'HIGH' ? 'Verified EPD' : cat.dataQualityStatus === 'MEDIUM' ? 'Physical Mass' : cat.dataQualityStatus === 'ESTIMATED' ? 'EEIO Spend' : 'No Data'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: FACILITY HOTSPOTS */}
      {activeTab === 'facilities' && (
        <div className="bg-white rounded-xl p-5 border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Facility & Project Benchmark Ranking</h3>
              <p className="text-xs text-slate-500 mt-0.5">Cross-site emissions concentration across the evaluated boundary</p>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {overview?.facilityBenchmarks?.length || 0} facilities active
            </span>
          </div>

          <div className="space-y-3">
            {overview?.facilityBenchmarks?.map((fac: any, index: number) => (
              <div key={fac.facilityId} className="p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-300 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center">
                      #{index + 1}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{fac.facilityName}</h4>
                      <span className="text-[11px] text-slate-500">ID: {fac.facilityId} | Project: {fac.projectId || 'General'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <span className="text-sm font-bold text-slate-900 block">{fac.totalTons.toLocaleString()} tCO2e</span>
                      <span className="text-[10px] text-slate-500">{fac.percentageOfTotal}% of organization</span>
                    </div>
                  </div>
                </div>

                {/* Sub-scope bar */}
                <div className="grid grid-cols-3 gap-2 text-[11px] mt-3 pt-3 border-t border-slate-200/60">
                  <div className="flex justify-between">
                    <span className="text-amber-900 font-medium">Scope 1:</span>
                    <span className="font-mono text-slate-800">{fac.scope1Tons} t</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-900 font-medium">Scope 2:</span>
                    <span className="font-mono text-slate-800">{fac.scope2Tons} t</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-900 font-medium">Scope 3:</span>
                    <span className="font-mono text-slate-800">{fac.scope3Tons} t</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: ANOMALY ALERTS */}
      {activeTab === 'anomalies' && (
        <div className="bg-white rounded-xl p-5 border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Deterministic Anomaly Detection & Risk Warnings</h3>
              <p className="text-xs text-slate-500 mt-0.5">Automated screening for reporting gaps, variance surges, and unverified data</p>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 bg-rose-50 text-rose-800 border border-rose-200 rounded">
              {overview?.anomalies?.length || 0} Alerts Active
            </span>
          </div>

          <div className="space-y-3">
            {overview?.anomalies?.map((anom: any) => (
              <div
                key={anom.alertId}
                className={`p-4 rounded-xl border flex items-start gap-3.5 ${
                  anom.severity === 'CRITICAL'
                    ? 'bg-red-50/60 border-red-200'
                    : anom.severity === 'HIGH'
                    ? 'bg-amber-50/60 border-amber-200'
                    : 'bg-blue-50/60 border-blue-200'
                }`}
              >
                <div className="p-2 rounded-lg bg-white shadow-xs shrink-0 mt-0.5">
                  <AlertTriangle className={`w-4 h-4 ${
                    anom.severity === 'CRITICAL' ? 'text-red-700' : anom.severity === 'HIGH' ? 'text-amber-700' : 'text-blue-700'
                  }`} />
                </div>
                <div className="flex-1 text-xs">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900">{anom.title}</h4>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                      anom.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' : anom.severity === 'HIGH' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {anom.severity}
                    </span>
                  </div>
                  <p className="text-slate-600 mt-1 leading-relaxed">{anom.description}</p>
                  <div className="mt-2.5 p-2 bg-white/80 rounded border border-slate-200/60 text-[11px] text-slate-800">
                    <strong>Recommended Action:</strong> {anom.recommendedAction}
                  </div>
                </div>
              </div>
            ))}

            {(!overview?.anomalies || overview.anomalies.length === 0) && (
              <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <p className="font-bold text-slate-800">Zero Active Anomalies Detected</p>
                <p className="mt-1">All recorded emissions fall within statutory statistical tolerances and have verified primary documentation.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: GEMINI AI IMPACT ANALYST */}
      {activeTab === 'ai-analyst' && (
        <div className="space-y-6">
          {/* Executive Briefing Section */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-gradient-to-tr from-blue-700 to-indigo-700 text-white rounded-lg shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">Gemini AI Impact Executive Briefing</h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded">
                      {aiInsights?.modelUsed || 'gemini-2.5-flash'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">Natural language interpretation strictly grounded in authoritative backend calculations</p>
                </div>
              </div>

              <button
                onClick={handleGenerateAiBriefing}
                disabled={loadingAi}
                className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingAi ? 'animate-spin' : ''}`} />
                <span>Re-Analyze</span>
              </button>
            </div>

            {aiInsights ? (
              <div className="space-y-4 text-xs">
                {/* Executive Summary Paragraph */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 leading-relaxed text-slate-800">
                  <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-700" /> Executive Overview
                  </h4>
                  {aiInsights.executiveSummary}
                </div>

                {/* Hotspots & Scope 3 Analysis */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-900 mb-1">Operational Hotspots & Facility Drivers</h4>
                    <p className="text-slate-700 leading-relaxed">{aiInsights.facilityHotspotsAnalysis}</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-900 mb-1">Scope 3 Value Chain Levers</h4>
                    <p className="text-slate-700 leading-relaxed">{aiInsights.scope3SupplyChainReview}</p>
                  </div>
                </div>

                {/* Prioritized Action Items */}
                <div>
                  <h4 className="font-bold text-slate-900 mb-2.5">Contextual Recommendations for Management Review</h4>
                  <div className="space-y-2">
                    {aiInsights.prioritizedActionItems?.map((action: any, i: number) => (
                      <div key={i} className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs flex items-start gap-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${
                          action.priority === 'IMMEDIATE'
                            ? 'bg-rose-100 text-rose-800'
                            : action.priority === 'HIGH'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {action.priority}
                        </span>
                        <div className="flex-1">
                          <h5 className="font-bold text-slate-900">{action.targetArea}: {action.action}</h5>
                          <p className="text-slate-600 text-[11px] mt-0.5">{action.rationale}</p>
                          <span className="text-[10px] text-emerald-700 font-semibold mt-1 block">Impact: {action.expectedImpact}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* BRSR Disclosure Readiness */}
                <div className="p-3.5 bg-blue-50/50 rounded-lg border border-blue-100 flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-blue-950">SEBI BRSR Principle 6 (Environment) Readiness</h4>
                    <p className="text-blue-900 text-[11px] mt-0.5">{aiInsights.brsrDisclosureReadiness?.observations}</p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 bg-white text-blue-800 border border-blue-200 rounded shrink-0">
                    Status: {aiInsights.brsrDisclosureReadiness?.status}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs">
                <Sparkles className="w-8 h-8 text-blue-600 mx-auto mb-2 opacity-80" />
                <h4 className="font-bold text-slate-800">No Briefing Generated Yet</h4>
                <p className="text-slate-500 mt-1 max-w-sm mx-auto">
                  Click below to request the Gemini AI Impact Analyst to synthesize this quarter's emissions data into executive takeaways.
                </p>
                <button
                  onClick={handleGenerateAiBriefing}
                  disabled={loadingAi}
                  className="mt-4 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg text-xs shadow-xs transition-colors cursor-pointer"
                >
                  Generate Initial Briefing
                </button>
              </div>
            )}
          </div>

          {/* Interactive AI Chat & Query Copilot */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Ask the ESG Intelligence Analyst</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Query emissions drivers, facility benchmarks, or methodology questions grounded in the current dataset.
              </p>
            </div>

            {/* Quick Prompt Suggestions */}
            <div className="flex flex-wrap gap-2 text-xs">
              {[
                'Why did Scope 1 emissions change this period?',
                'Which facility is our biggest emissions hotspot?',
                'What are our top 3 Scope 3 categories?',
                'Are there any unverified high-impact records?',
              ].map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendQuery(suggestion)}
                  disabled={queryLoading}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-[11px] transition-colors cursor-pointer"
                >
                  "{suggestion}"
                </button>
              ))}
            </div>

            {/* Conversation Log */}
            {chatHistory.length > 0 && (
              <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200 max-h-96 overflow-y-auto text-xs">
                {chatHistory.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-400">
                      <span>{msg.sender === 'user' ? user.name : 'Gemini AI Analyst'}</span>
                      <span>•</span>
                      <span>{msg.time}</span>
                    </div>
                    <div
                      className={`p-3 rounded-xl max-w-2xl leading-relaxed whitespace-pre-wrap ${
                        msg.sender === 'user'
                          ? 'bg-blue-700 text-white rounded-tr-none'
                          : 'bg-white text-slate-800 border border-slate-200 shadow-2xs rounded-tl-none'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {queryLoading && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span>Analyzing authoritative metrics...</span>
                  </div>
                )}
              </div>
            )}

            {/* Input Bar */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Ask about emissions sources, variances, Scope 3 supply chain, or SEBI BRSR readiness..."
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendQuery()}
                disabled={queryLoading}
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-blue-600 transition-colors"
              />
              <button
                onClick={() => handleSendQuery()}
                disabled={queryLoading || !userQuery.trim()}
                className="p-2.5 bg-blue-700 hover:bg-blue-800 disabled:bg-slate-200 text-white rounded-lg transition-colors cursor-pointer"
                title="Send query"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
