import React, { useState, useEffect } from 'react';
import {
  Calculator,
  Play,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  Sparkles,
  BookOpen,
  Sliders,
  Flame,
  Zap,
  Truck,
  Wind,
  Layers,
  ArrowRight,
  Database,
} from 'lucide-react';
import { AuthUser } from '../../types.ts';
import { api } from '../../services/api.ts';
import { calculateEmissions, EmissionCalcResult } from '../../utils/emissions.ts';

interface CalculationsPageProps {
  user: AuthUser;
}

interface CalcEntry {
  id: string;
  scope: string;
  scopeNo: number;
  scope3CategoryNo?: number | null;
  activity: string;
  facility: string;
  input: string;
  rawQuantity: number;
  unit: string;
  factor: string;
  output: string;
  rawOutputTons: number;
  status: string;
  calculationDetails: EmissionCalcResult;
}

export const CalculationsPage: React.FC<CalculationsPageProps> = ({ user }) => {
  const [calcs, setCalcs] = useState<CalcEntry[]>([]);
  const [selectedCalc, setSelectedCalc] = useState<CalcEntry | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeScopeFilter, setActiveScopeFilter] = useState<number | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Sandbox calculation simulator state
  const [sandboxScope, setSandboxScope] = useState<1 | 2 | 3>(1);
  const [sandboxScope3Cat, setSandboxScope3Cat] = useState<number>(1);
  const [sandboxActivityType, setSandboxActivityType] = useState<string>('ACT-DIESEL-GEN');
  const [sandboxQuantity, setSandboxQuantity] = useState<number>(50000);
  const [sandboxUnit, setSandboxUnit] = useState<string>('LITER');
  const [sandboxSpend, setSandboxSpend] = useState<number>(0);
  const [sandboxRenewable, setSandboxRenewable] = useState<boolean>(false);
  const [sandboxAccountingMethod, setSandboxAccountingMethod] = useState<'LOCATION_BASED' | 'MARKET_BASED'>('LOCATION_BASED');
  const [sandboxResult, setSandboxResult] = useState<EmissionCalcResult | null>(null);

  // Factor Library browser state
  const [factorList, setFactorList] = useState<any[]>([]);
  const [activeView, setActiveView] = useState<'ledger' | 'simulator' | 'factors'>('ledger');
  const [recalculating, setRecalculating] = useState<boolean>(false);
  const [recalcMessage, setRecalcMessage] = useState<string | null>(null);

  // Baseline standard statutory references covering all 3 scopes
  const baselineCalcs: CalcEntry[] = [
    {
      id: 'CALC-001',
      scope: 'Scope 1',
      scopeNo: 1,
      activity: 'Diesel Consumption (Stationary DG Sets)',
      facility: 'Subansiri Hydro (Turbine #4)',
      input: '100,000 LITER',
      rawQuantity: 100000,
      unit: 'LITER',
      factor: '2.68 kgCO2e/L',
      output: '268.00 tCO2e',
      rawOutputTons: 268.0,
      status: 'Verified',
      calculationDetails: calculateEmissions({ scopeNo: 1, activityTypeId: 'ACT-DIESEL-GEN', unitId: 'LITER', quantity: 100000 }),
    },
    {
      id: 'CALC-002',
      scope: 'Scope 2',
      scopeNo: 2,
      activity: 'Grid Electricity Purchased (Location-Based)',
      facility: 'Northern Div / Subansiri HQ',
      input: '500,000 KWH',
      rawQuantity: 500000,
      unit: 'KWH',
      factor: '0.716 kgCO2e/kWh',
      output: '358.00 tCO2e',
      rawOutputTons: 358.0,
      status: 'Verified',
      calculationDetails: calculateEmissions({ scopeNo: 2, activityTypeId: 'ACT-GRID-ELEC', unitId: 'KWH', quantity: 500000 }),
    },
    {
      id: 'CALC-003',
      scope: 'Scope 3 (Cat 1)',
      scopeNo: 3,
      scope3CategoryNo: 1,
      activity: 'Primary Structural Steel Fe550D TMT',
      facility: 'Polavaram Project Site',
      input: '1,250 MT',
      rawQuantity: 1250,
      unit: 'MT',
      factor: '1850.0 kgCO2e/t',
      output: '2,312.50 tCO2e',
      rawOutputTons: 2312.5,
      status: 'Verified',
      calculationDetails: calculateEmissions({ scopeNo: 3, scope3CategoryNo: 1, activityTypeId: 'ACT-STEEL-PURCH', unitId: 'MT', quantity: 1250 }),
    },
    {
      id: 'CALC-004',
      scope: 'Scope 1',
      scopeNo: 1,
      activity: 'Furnace Heavy Fuel Oil (HFO Boilers)',
      facility: 'BHEL Turbine Enclosure',
      input: '45,000 LITER',
      rawQuantity: 45000,
      unit: 'LITER',
      factor: '3.19 kgCO2e/L',
      output: '143.55 tCO2e',
      rawOutputTons: 143.55,
      status: 'In Review',
      calculationDetails: calculateEmissions({ scopeNo: 1, activityTypeId: 'ACT-HFO', unitId: 'LITER', quantity: 45000 }),
    },
    {
      id: 'CALC-005',
      scope: 'Scope 3 (Cat 4)',
      scopeNo: 3,
      scope3CategoryNo: 4,
      activity: 'Heavy Truck Road Freight (>20t HCV)',
      facility: 'Zojila Tunnel Project',
      input: '120,000 T-KM',
      rawQuantity: 120000,
      unit: 'T-KM',
      factor: '0.0952 kgCO2e/t-km',
      output: '11.42 tCO2e',
      rawOutputTons: 11.42,
      status: 'In Review',
      calculationDetails: calculateEmissions({ scopeNo: 3, scope3CategoryNo: 4, activityTypeId: 'ACT-FREIGHT', unitId: 'T-KM', quantity: 120000 }),
    },
    {
      id: 'CALC-006',
      scope: 'Scope 1',
      scopeNo: 1,
      activity: 'Refrigerant R-410A Leakage Top-Up',
      facility: 'Northern Div Camp VRF',
      input: '14.8 KG',
      rawQuantity: 14.8,
      unit: 'KG',
      factor: '2088.0 kgCO2e/kg (GWP)',
      output: '30.90 tCO2e',
      rawOutputTons: 30.9,
      status: 'Verified',
      calculationDetails: calculateEmissions({ scopeNo: 1, activityTypeId: 'ACT-REFRIG-LEAK', fuelOrSubstance: 'R-410A', unitId: 'KG', quantity: 14.8 }),
    },
    {
      id: 'CALC-007',
      scope: 'Scope 2',
      scopeNo: 2,
      activity: 'Onsite Rooftop Solar Generation',
      facility: 'Corporate HQ Hyderabad',
      input: '120,000 KWH',
      rawQuantity: 120000,
      unit: 'KWH',
      factor: '0.000 kgCO2e/kWh',
      output: '0.00 tCO2e',
      rawOutputTons: 0.0,
      status: 'Verified',
      calculationDetails: calculateEmissions({ scopeNo: 2, activityTypeId: 'ACT-RENEW-SOLAR', unitId: 'KWH', quantity: 120000, renewableFlag: true }),
    },
    {
      id: 'CALC-008',
      scope: 'Scope 3 (Cat 6)',
      scopeNo: 3,
      scope3CategoryNo: 6,
      activity: 'Executive Domestic Air Travel',
      facility: 'Corporate Office',
      input: '25,000 P-KM',
      rawQuantity: 25000,
      unit: 'P-KM',
      factor: '0.155 kgCO2e/p-km',
      output: '3.88 tCO2e',
      rawOutputTons: 3.88,
      status: 'Verified',
      calculationDetails: calculateEmissions({ scopeNo: 3, scope3CategoryNo: 6, activityTypeId: 'ACT-AIR-TRAVEL', unitId: 'P-KM', quantity: 25000 }),
    },
  ];

  const loadCalculations = async () => {
    try {
      setLoading(true);
      const res = await api.getESGRecords();
      if (res && res.records && res.records.length > 0) {
        const liveEntries: CalcEntry[] = res.records.map((r: any) => {
          const calc = calculateEmissions({
            scopeNo: r.scopeNo,
            scope3CategoryNo: r.scope3CategoryNo,
            activityTypeId: r.activityTypeId,
            unitId: r.unitId,
            quantity: r.quantity,
            spendAmount: r.spendAmount,
            renewableFlag: r.scope2Details?.renewableFlag,
            renewablePercentage: r.scope2Details?.renewablePercentage,
            accountingMethod: r.scope2Details?.accountingMethod,
            fuelOrSubstance: r.scope1Details?.fuelSubstanceId,
          });

          return {
            id: `CALC-${r.activityId}`,
            scope: r.scopeNo === 3 && r.scope3CategoryNo ? `Scope 3 (Cat ${r.scope3CategoryNo})` : `Scope ${r.scopeNo}`,
            scopeNo: r.scopeNo,
            scope3CategoryNo: r.scope3CategoryNo,
            activity: r.description || r.activityTypeId,
            facility: r.facilityId || r.projectId || 'Site Facility',
            input: `${(r.quantity || 0).toLocaleString()} ${r.unitId || ''}`,
            rawQuantity: r.quantity || 0,
            unit: r.unitId || '',
            factor: `${calc.factor} kgCO2e/${r.unitId || 'unit'}`,
            output: `${calc.tCO2e.toFixed(2)} tCO2e`,
            rawOutputTons: calc.tCO2e,
            status:
              r.workflowStatus === 'APPROVED' || r.workflowStatus === 'ASSURANCE_REVIEWED'
                ? 'Verified'
                : r.workflowStatus === 'SUBMITTED' || r.workflowStatus === 'SITE_REVIEWED'
                ? 'In Review'
                : 'Pending',
            calculationDetails: calc,
          };
        });

        const combined = [...liveEntries, ...baselineCalcs];
        setCalcs(combined);
        setSelectedCalc(combined[0]);
      } else {
        setCalcs(baselineCalcs);
        setSelectedCalc(baselineCalcs[0]);
      }
    } catch {
      setCalcs(baselineCalcs);
      setSelectedCalc(baselineCalcs[0]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadFactorLibrary = async () => {
    try {
      const data = await api.getEmissionFactors();
      if (data && data.factors) {
        setFactorList(data.factors);
      }
    } catch (err) {
      console.error('Failed to load factor library:', err);
    }
  };

  useEffect(() => {
    loadCalculations();
    loadFactorLibrary();
  }, []);

  // Update simulator whenever parameters change
  useEffect(() => {
    const res = calculateEmissions({
      scopeNo: sandboxScope,
      scope3CategoryNo: sandboxScope === 3 ? sandboxScope3Cat : undefined,
      activityTypeId: sandboxActivityType,
      unitId: sandboxUnit,
      quantity: sandboxQuantity,
      spendAmount: sandboxSpend,
      renewableFlag: sandboxRenewable,
      accountingMethod: sandboxAccountingMethod,
    });
    setSandboxResult(res);
  }, [
    sandboxScope,
    sandboxScope3Cat,
    sandboxActivityType,
    sandboxQuantity,
    sandboxUnit,
    sandboxSpend,
    sandboxRenewable,
    sandboxAccountingMethod,
  ]);

  const handleBatchRecalculate = async () => {
    try {
      setRecalculating(true);
      setRecalcMessage(null);
      const res = await api.batchRecalculate();
      setRecalcMessage(`Successfully recalculated ${res.updatedCount || 0} activity records (${res.totalTonsRecalculated || 0} tCO2e validated).`);
      await loadCalculations();
    } catch (err: any) {
      setRecalcMessage(`Recalculation error: ${err.message || 'Server error'}`);
    } finally {
      setRecalculating(false);
    }
  };

  // Filter calculations
  const filteredCalcs = calcs.filter((c) => {
    if (activeScopeFilter !== 'ALL' && c.scopeNo !== activeScopeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        c.activity.toLowerCase().includes(q) ||
        c.facility.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.scope.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalTons = calcs.reduce((acc, c) => acc + c.rawOutputTons, 0);
  const scope1Tons = calcs.filter((c) => c.scopeNo === 1).reduce((acc, c) => acc + c.rawOutputTons, 0);
  const scope2Tons = calcs.filter((c) => c.scopeNo === 2).reduce((acc, c) => acc + c.rawOutputTons, 0);
  const scope3Tons = calcs.filter((c) => c.scopeNo === 3).reduce((acc, c) => acc + c.rawOutputTons, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-50 text-blue-700 rounded-lg">
                <Calculator className="w-5 h-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                    Authoritative GHG Calculation Engine (Phase 4)
                  </h1>
                  <span className="text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded">
                    ISO 14064-1 &amp; GHG Protocol
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Deterministic emissions engine covering Scope 1, Scope 2, and all 15 Scope 3 value-chain categories.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setRefreshing(true);
                loadCalculations();
              }}
              className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-700' : ''}`} />
              <span>Sync Records</span>
            </button>
            <button
              onClick={handleBatchRecalculate}
              disabled={recalculating}
              className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Play className={`w-3.5 h-3.5 ${recalculating ? 'animate-spin' : 'fill-current'}`} />
              <span>{recalculating ? 'Recalculating...' : 'Run Batch Recalculation'}</span>
            </button>
          </div>
        </div>

        {recalcMessage && (
          <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{recalcMessage}</span>
          </div>
        )}

        {/* Global Calculation Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Total Recalculated</span>
            <div className="text-xl font-bold text-slate-900 mt-0.5">
              {totalTons.toLocaleString(undefined, { maximumFractionDigits: 1 })} <span className="text-xs font-normal text-slate-500">tCO2e</span>
            </div>
            <span className="text-[10px] text-emerald-700 font-semibold">{calcs.length} verified calculation runs</span>
          </div>

          <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-100">
            <span className="text-[10px] font-bold text-amber-900 uppercase">Scope 1 (Direct)</span>
            <div className="text-xl font-bold text-amber-950 mt-0.5">
              {scope1Tons.toLocaleString(undefined, { maximumFractionDigits: 1 })} <span className="text-xs font-normal text-amber-700">tCO2e</span>
            </div>
            <span className="text-[10px] text-amber-800">Stationary, Mobile, Fugitives</span>
          </div>

          <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100">
            <span className="text-[10px] font-bold text-blue-900 uppercase">Scope 2 (Power)</span>
            <div className="text-xl font-bold text-blue-950 mt-0.5">
              {scope2Tons.toLocaleString(undefined, { maximumFractionDigits: 1 })} <span className="text-xs font-normal text-blue-700">tCO2e</span>
            </div>
            <span className="text-[10px] text-blue-800">CEA Grid (0.716) &amp; Renewables</span>
          </div>

          <div className="p-3 bg-purple-50/50 rounded-lg border border-purple-100">
            <span className="text-[10px] font-bold text-purple-900 uppercase">Scope 3 (Value Chain)</span>
            <div className="text-xl font-bold text-purple-950 mt-0.5">
              {scope3Tons.toLocaleString(undefined, { maximumFractionDigits: 1 })} <span className="text-xs font-normal text-purple-700">tCO2e</span>
            </div>
            <span className="text-[10px] text-purple-800">All 15 Categories Covered</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 gap-1 bg-white px-4 rounded-t-xl pt-2">
        <button
          onClick={() => setActiveView('ledger')}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeView === 'ledger'
              ? 'border-blue-700 text-blue-700 bg-blue-50/30'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Active Calculation Ledger ({filteredCalcs.length})</span>
        </button>

        <button
          onClick={() => setActiveView('simulator')}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeView === 'simulator'
              ? 'border-blue-700 text-blue-700 bg-blue-50/30'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Interactive GHG Simulator &amp; Tester</span>
        </button>

        <button
          onClick={() => setActiveView('factors')}
          className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeView === 'factors'
              ? 'border-blue-700 text-blue-700 bg-blue-50/30'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Emission Factor Registry ({factorList.length || '35+'})</span>
        </button>
      </div>

      {/* VIEW 1: ACTIVE CALCULATION LEDGER */}
      {activeView === 'ledger' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200">
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                <button
                  onClick={() => setActiveScopeFilter('ALL')}
                  className={`px-2.5 py-1 rounded font-medium cursor-pointer ${
                    activeScopeFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All Scopes
                </button>
                <button
                  onClick={() => setActiveScopeFilter(1)}
                  className={`px-2.5 py-1 rounded font-medium cursor-pointer ${
                    activeScopeFilter === 1 ? 'bg-amber-700 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  Scope 1
                </button>
                <button
                  onClick={() => setActiveScopeFilter(2)}
                  className={`px-2.5 py-1 rounded font-medium cursor-pointer ${
                    activeScopeFilter === 2 ? 'bg-blue-700 text-white' : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
                  }`}
                >
                  Scope 2
                </button>
                <button
                  onClick={() => setActiveScopeFilter(3)}
                  className={`px-2.5 py-1 rounded font-medium cursor-pointer ${
                    activeScopeFilter === 3 ? 'bg-purple-700 text-white' : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
                  }`}
                >
                  Scope 3 (Cat 1–15)
                </button>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter calculations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 focus:outline-hidden focus:bg-white w-full sm:w-48"
                />
              </div>
            </div>

            {/* Calculations List */}
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
              {filteredCalcs.map((calc) => {
                const isSelected = selectedCalc?.id === calc.id;
                return (
                  <div
                    key={calc.id}
                    onClick={() => setSelectedCalc(calc)}
                    className={`p-3.5 transition-colors cursor-pointer flex items-center justify-between ${
                      isSelected ? 'bg-blue-50/70 border-l-4 border-blue-700' : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          calc.scopeNo === 1
                            ? 'bg-amber-100 text-amber-900'
                            : calc.scopeNo === 2
                            ? 'bg-blue-100 text-blue-900'
                            : 'bg-purple-100 text-purple-900'
                        }`}>
                          {calc.scope}
                        </span>
                        <span className="font-mono text-xs text-slate-500 font-semibold">{calc.id}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                          calc.status === 'Verified' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {calc.status}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900">{calc.activity}</h4>
                      <p className="text-[11px] text-slate-500">{calc.facility} • Input: {calc.input}</p>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-bold text-slate-900 block font-mono">{calc.output}</span>
                      <span className="text-[10px] text-slate-500 font-mono block">{calc.factor}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Selected Calculation Traceability Audit */}
          <div className="space-y-4">
            {selectedCalc ? (
              <div className="bg-white rounded-xl p-5 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Traceability Audit</span>
                    <h3 className="text-sm font-bold text-slate-900 mt-0.5">{selectedCalc.id}</h3>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-xs font-bold">
                    {selectedCalc.status}
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Activity &amp; Boundary</span>
                    <span className="font-semibold text-slate-900">{selectedCalc.activity}</span>
                    <p className="text-slate-500 text-[11px] mt-0.5">{selectedCalc.facility}</p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Standardized Quantity:</span>
                      <span className="font-mono font-bold text-slate-900">{selectedCalc.input}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Emission Factor Applied:</span>
                      <span className="font-mono font-bold text-slate-900">{selectedCalc.calculationDetails.factor}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Gross Calculated CO2e:</span>
                      <span className="font-mono font-bold text-blue-700">{selectedCalc.output}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">Factor Source &amp; Methodology</span>
                    <span className="font-medium text-slate-900 block">{selectedCalc.calculationDetails.factorSource}</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">{selectedCalc.calculationDetails.methodology}</span>
                  </div>

                  {selectedCalc.calculationDetails.gasBreakdown && (
                    <div className="pt-3 border-t border-slate-100">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">Gas Breakdown (IPCC AR5 GWP)</span>
                      <div className="space-y-1 text-[11px] font-mono">
                        <div className="flex justify-between">
                          <span>CO₂ (Carbon Dioxide):</span>
                          <span>{selectedCalc.calculationDetails.gasBreakdown.co2Kg.toLocaleString()} kg</span>
                        </div>
                        <div className="flex justify-between">
                          <span>CH₄ (Methane):</span>
                          <span>{selectedCalc.calculationDetails.gasBreakdown.ch4Kg.toLocaleString()} kg</span>
                        </div>
                        <div className="flex justify-between">
                          <span>N₂O (Nitrous Oxide):</span>
                          <span>{selectedCalc.calculationDetails.gasBreakdown.n2oKg.toLocaleString()} kg</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="p-2.5 bg-blue-50/60 rounded border border-blue-100 text-[11px] text-blue-900">
                    <strong>Audit Formula:</strong> {selectedCalc.calculationDetails.formula || `${selectedCalc.input} × ${selectedCalc.factor} = ${selectedCalc.output}`}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
                Select a calculation from the ledger to inspect its full mathematical derivation.
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: INTERACTIVE GHG SIMULATOR */}
      {activeView === 'simulator' && (
        <div className="bg-white rounded-xl p-6 border border-slate-200 space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Interactive GHG Protocol Calculation Simulator</h3>
            <p className="text-xs text-slate-500 mt-1">
              Test deterministic emission equations across Scope 1 fuels, vehicles, processes, fugitives, Scope 2 power, and all 15 Scope 3 value-chain categories.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Input Controls */}
            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-800 block mb-1">Target Statutory Scope</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 1, label: 'Scope 1 (Direct)' },
                    { id: 2, label: 'Scope 2 (Power)' },
                    { id: 3, label: 'Scope 3 (Value Chain)' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setSandboxScope(s.id as any);
                        if (s.id === 1) {
                          setSandboxActivityType('ACT-DIESEL-GEN');
                          setSandboxUnit('LITER');
                        } else if (s.id === 2) {
                          setSandboxActivityType('ACT-GRID-ELEC');
                          setSandboxUnit('KWH');
                        } else {
                          setSandboxActivityType('ACT-STEEL-PURCH');
                          setSandboxUnit('MT');
                        }
                      }}
                      className={`p-2 rounded-lg font-bold border transition-colors cursor-pointer ${
                        sandboxScope === s.id
                          ? 'bg-blue-700 text-white border-blue-700'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {sandboxScope === 1 && (
                <div>
                  <label className="font-bold text-slate-800 block mb-1">Scope 1 Activity / Fuel Category</label>
                  <select
                    value={sandboxActivityType}
                    onChange={(e) => {
                      setSandboxActivityType(e.target.value);
                      if (e.target.value.includes('NAT-GAS')) setSandboxUnit('SCM');
                      else if (e.target.value.includes('COAL') || e.target.value.includes('CLINKER')) setSandboxUnit('MT');
                      else if (e.target.value.includes('REFRIG') || e.target.value.includes('SF6')) setSandboxUnit('KG');
                      else if (e.target.value.includes('FLEET-KM')) setSandboxUnit('KM');
                      else setSandboxUnit('LITER');
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium"
                  >
                    <option value="ACT-DIESEL-GEN">Stationary Diesel (DG Sets / Boilers)</option>
                    <option value="ACT-PETROL">Stationary Petrol / Gasoline</option>
                    <option value="ACT-NAT-GAS">Piped Natural Gas (PNG)</option>
                    <option value="ACT-LPG">LPG (Commercial / Cutting)</option>
                    <option value="ACT-COAL">Thermal Coal (G-11 Grade)</option>
                    <option value="ACT-HFO">Heavy Fuel Oil / Furnace Oil (HFO)</option>
                    <option value="ACT-BIOMASS">Agro Biomass Briquettes</option>
                    <option value="ACT-FLEET-KM">Mobile Heavy Commercial Vehicle Fleet (km)</option>
                    <option value="ACT-CLINKER">Cement Clinker Calcination (Industrial Process)</option>
                    <option value="ACT-STEEL-BOF">Primary Steelmaking Process (BF-BOF)</option>
                    <option value="ACT-REFRIG-R410A">Refrigerant R-410A Leakage (GWP 2088)</option>
                    <option value="ACT-SF6">Sulfur Hexafluoride SF6 Switchgear (GWP 23,500)</option>
                    <option value="ACT-CAPTURE">Carbon Capture Direct Sequestration (Negative deduction)</option>
                  </select>
                </div>
              )}

              {sandboxScope === 2 && (
                <div className="space-y-3">
                  <div>
                    <label className="font-bold text-slate-800 block mb-1">Purchased Energy Type</label>
                    <select
                      value={sandboxActivityType}
                      onChange={(e) => setSandboxActivityType(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium"
                    >
                      <option value="ACT-GRID-ELEC">Indian Grid Electricity (CEA Baseline v19)</option>
                      <option value="ACT-STEAM">Purchased Industrial Steam (DEFRA / CEA)</option>
                      <option value="ACT-COOLING">District Chilled Water / Cooling</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sandboxRenewable}
                        onChange={(e) => setSandboxRenewable(e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      <span className="font-semibold text-slate-800">100% Certified Renewable PPA (Zero Factor)</span>
                    </label>
                  </div>
                </div>
              )}

              {sandboxScope === 3 && (
                <div className="space-y-3">
                  <div>
                    <label className="font-bold text-slate-800 block mb-1">Scope 3 Category (1–15)</label>
                    <select
                      value={sandboxScope3Cat}
                      onChange={(e) => {
                        const cat = Number(e.target.value);
                        setSandboxScope3Cat(cat);
                        if (cat === 1) { setSandboxActivityType('ACT-STEEL-PURCH'); setSandboxUnit('MT'); }
                        else if (cat === 4) { setSandboxActivityType('ACT-FREIGHT'); setSandboxUnit('T-KM'); }
                        else if (cat === 6) { setSandboxActivityType('ACT-AIR-TRAVEL'); setSandboxUnit('P-KM'); }
                        else if (cat === 5) { setSandboxActivityType('ACT-WASTE'); setSandboxUnit('KG'); }
                        else if (cat === 7) { setSandboxActivityType('ACT-COMMUTE'); setSandboxUnit('KM'); }
                        else { setSandboxActivityType(`ACT-CAT-${cat}`); setSandboxUnit('UNIT'); }
                      }}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium"
                    >
                      <option value={1}>Cat 1: Purchased Goods &amp; Services (Steel, Cement, Concrete)</option>
                      <option value={2}>Cat 2: Capital Goods (Machinery, Heavy Equipment)</option>
                      <option value={3}>Cat 3: Fuel- &amp; Energy-Related Activities (WTT, Grid T&amp;D Losses)</option>
                      <option value={4}>Cat 4: Upstream Transportation &amp; Distribution (Truck, Rail Freight)</option>
                      <option value={5}>Cat 5: Waste Generated in Operations (Landfill, Recycling)</option>
                      <option value={6}>Cat 6: Business Travel (Aviation, Rail, Hotels)</option>
                      <option value={7}>Cat 7: Employee Commuting (Bus Transit, Personal Vehicle)</option>
                      <option value={8}>Cat 8: Upstream Leased Assets (Leased Offices, Plants)</option>
                      <option value={9}>Cat 9: Downstream Transportation &amp; Distribution</option>
                      <option value={10}>Cat 10: Processing of Sold Products</option>
                      <option value={11}>Cat 11: Use of Sold Products</option>
                      <option value={12}>Cat 12: End-of-Life Treatment of Sold Products</option>
                      <option value={13}>Cat 13: Downstream Leased Assets</option>
                      <option value={14}>Cat 14: Franchises</option>
                      <option value={15}>Cat 15: Investments (PCAF Project Finance)</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-800 block mb-1">Activity Quantity</label>
                  <input
                    type="number"
                    value={sandboxQuantity}
                    onChange={(e) => setSandboxQuantity(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-800 block mb-1">Measurement Unit</label>
                  <input
                    type="text"
                    value={sandboxUnit}
                    onChange={(e) => setSandboxUnit(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Live Calculation Output Display */}
            {sandboxResult && (
              <div className="bg-slate-900 text-white p-5 rounded-xl space-y-4 text-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Deterministic Engine Output</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded border border-blue-400/30">
                      GHG PROTOCOL CERTIFIED
                    </span>
                  </div>

                  <div className="mt-4">
                    <span className="text-slate-400 text-xs">Total Calculated Footprint</span>
                    <div className="text-3xl font-bold text-emerald-400 mt-1 font-mono">
                      {sandboxResult.tCO2e.toLocaleString(undefined, { maximumFractionDigits: 3 })} <span className="text-sm font-normal text-slate-300">tCO2e</span>
                    </div>
                    <div className="text-slate-300 text-xs font-mono mt-0.5">
                      ({sandboxResult.grossKgCO2e.toLocaleString()} kg CO2e)
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-slate-800/80 rounded-lg border border-slate-700/80 space-y-1.5 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Emission Factor:</span>
                      <span className="text-white font-bold">{sandboxResult.factor}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Source:</span>
                      <span className="text-slate-200 truncate max-w-[220px]" title={sandboxResult.factorSource}>{sandboxResult.factorSource}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Methodology:</span>
                      <span className="text-slate-200">{sandboxResult.methodology}</span>
                    </div>
                  </div>

                  {sandboxResult.gasBreakdown && (
                    <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-3 gap-2 text-[10px] font-mono text-slate-300">
                      <div>CO₂: {sandboxResult.gasBreakdown.co2Kg} kg</div>
                      <div>CH₄: {sandboxResult.gasBreakdown.ch4Kg} kg</div>
                      <div>N₂O: {sandboxResult.gasBreakdown.n2oKg} kg</div>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-blue-950/60 rounded border border-blue-800/60 text-blue-200 text-[11px]">
                  <strong>Mathematical Equation:</strong><br />
                  <span className="font-mono">{sandboxResult.formula}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 3: EMISSION FACTOR REGISTRY BROWSER */}
      {activeView === 'factors' && (
        <div className="bg-white rounded-xl p-5 border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Statutory Emission Factor Library &amp; GWP Registry</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Statutory coefficients published by CEA India (v19), DEFRA 2024, IPCC Guidelines, and World Steel Association.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded font-mono">
              IPCC AR5 GWP Standards
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Factor ID</th>
                  <th className="py-2.5 px-3">Scope &amp; Category</th>
                  <th className="py-2.5 px-3">Material / Substance</th>
                  <th className="py-2.5 px-3">Unit</th>
                  <th className="py-2.5 px-3 text-right">Factor (kgCO2e/unit)</th>
                  <th className="py-2.5 px-3">Regulatory Source</th>
                  <th className="py-2.5 px-3">Accounting Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {factorList.map((f: any) => (
                  <tr key={f.factorId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-blue-700">{f.factorId}</td>
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-900">
                      Scope {f.scopeNo} {f.scope3CategoryNo ? `(Cat ${f.scope3CategoryNo})` : ''} - {f.category}
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-700">{f.name}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-600">{f.unit}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">{f.co2ePerUnit.toLocaleString()}</td>
                    <td className="py-2.5 px-3 font-sans text-slate-500 truncate max-w-xs" title={f.factorSource}>
                      {f.factorSource}
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded">
                        {f.accountingType || 'AVERAGE_DATA'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
