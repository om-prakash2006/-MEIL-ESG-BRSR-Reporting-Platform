/**
 * Client-Side Deterministic GHG Protocol & ISO 14064-1 Emission Calculation Engine
 * Mirrors backend calculationEngine.ts with comprehensive factor coverage for
 * Scope 1, Scope 2, and all 15 Scope 3 categories.
 */

export interface EmissionCalcResult {
  factor: number;
  factorSource: string;
  grossKgCO2e: number;
  tCO2e: number;
  gasBreakdown: {
    co2Kg: number;
    ch4Kg: number;
    n2oKg: number;
    sf6Kg?: number;
    hfcsKg?: number;
  };
  gwpVersion?: string;
  methodology?: string;
  isCarbonCapture?: boolean;
  isRenewableZero?: boolean;
  formula?: string;
}

export interface EmissionCalcParams {
  scopeNo: number;
  scope3CategoryNo?: number | null;
  activityTypeId?: string;
  unitId?: string;
  quantity?: number;
  spendAmount?: number;
  renewableFlag?: boolean;
  renewablePercentage?: number;
  accountingMethod?: 'LOCATION_BASED' | 'MARKET_BASED';
  fuelOrSubstance?: string;
  customFactor?: number;
  customFactorSource?: string;
}

export function calculateEmissions(params: EmissionCalcParams): EmissionCalcResult {
  const qty = Number(params.quantity) || 0;
  const spend = Number(params.spendAmount) || 0;
  const unit = (params.unitId || '').toUpperCase();
  const act = (params.activityTypeId || '').toUpperCase();
  const fuel = (params.fuelOrSubstance || '').toUpperCase();

  let factor = 1.0;
  let source = 'Statutory Baseline Standard';
  let methodology = 'Standard Activity Factor';
  let gwpVersion = 'IPCC AR5';
  let isCarbonCapture = false;
  let isRenewableZero = false;

  let effectiveQty = qty;

  if (params.scopeNo === 1) {
    if (act.includes('CAPTURE') || fuel.includes('CAPTURE')) {
      factor = -1000.0;
      source = 'ISO 27914 / Permanent Geological Storage';
      methodology = 'Direct Carbon Capture & Storage';
      isCarbonCapture = true;
    } else if (act.includes('DIESEL') || fuel.includes('DIESEL') || fuel.includes('HSD')) {
      if (unit === 'KM') {
        factor = 0.85;
        source = 'GLEC Framework v3 / ARAI Test Cycles (HCV Heavy Diesel)';
        methodology = 'Distance-based Vehicle Method';
      } else if (unit === 'HOUR' || unit === 'HR') {
        factor = 28.5;
        source = 'USEPA NONROAD / DEFRA Heavy Excavator';
        methodology = 'Machine Operational Hour Method';
      } else {
        factor = 2.68;
        source = 'CEA India / DEFRA 2024 (Diesel 100% Mineral)';
        methodology = 'Fuel Combustion Tier 2';
      }
    } else if (act.includes('PETROL') || fuel.includes('PETROL') || fuel.includes('GASOLINE')) {
      if (unit === 'KM') {
        factor = 0.165;
        source = 'DEFRA 2024 / ARAI Fleet Average';
        methodology = 'Distance-based Passenger Method';
      } else {
        factor = 2.31;
        source = 'DEFRA 2024 / IPCC Guidelines (Petrol/Gasoline)';
        methodology = 'Direct Combustion Tier 1';
      }
    } else if (act.includes('NAT') || act.includes('GAS') || act.includes('PNG') || unit === 'SCM') {
      factor = 2.02;
      source = 'IPCC 2006 / GAIL Indian Gas Composition (Natural Gas)';
      methodology = 'Stoichiometric Energy Content';
    } else if (act.includes('LPG') || fuel.includes('LPG')) {
      factor = 2.98;
      source = 'IPCC Tier 1 / DEFRA 2024 (Commercial LPG)';
      methodology = 'Direct Mass Factor';
    } else if (act.includes('COAL') || fuel.includes('COAL')) {
      factor = unit === 'MT' ? 1820.0 : 1.82;
      source = 'CEA India / MoEFCC GHG Inventory (G-11 Coal)';
      methodology = 'Thermal Calorific Tier 2';
    } else if (act.includes('HFO') || act.includes('FURNACE') || fuel.includes('HFO')) {
      factor = unit === 'MT' ? 3190.0 : 3.19;
      source = 'DEFRA 2024 / CEA Baseline (Furnace Oil Boilers)';
      methodology = 'Fuel Volume Combustion';
    } else if (act.includes('LDO') || fuel.includes('LDO')) {
      factor = 2.85;
      source = 'DEFRA 2024 / Indian Petroleum Standards (LDO)';
      methodology = 'Distillate Fuel Combustion';
    } else if (act.includes('BIOMASS') || fuel.includes('BIOMASS')) {
      factor = unit === 'MT' ? 55.0 : 0.055;
      source = 'IPCC 2006 (Agro Biomass - Fossil CH4/N2O only, CO2 biogenic)';
      methodology = 'Biogenic Carbon Accounting';
    } else if (act.includes('CLINKER') || act.includes('CEMENT-PROCESS')) {
      factor = unit === 'MT' ? 525.0 : 0.525;
      source = 'IPCC Vol 3 Mineral Industry (Clinker Calcination)';
      methodology = 'Carbonate Calcination Tier 2';
    } else if (act.includes('STEEL-PROCESS') || act.includes('BOF')) {
      factor = unit === 'MT' ? 1850.0 : 1.85;
      source = 'World Steel Association 2024 (BF-BOF Steelmaking)';
      methodology = 'Mass Balance Reduction Tier 2';
    } else if (act.includes('LIME')) {
      factor = unit === 'MT' ? 750.0 : 0.75;
      source = 'IPCC Vol 3 (Lime Calcination)';
      methodology = 'Stoichiometric Decarbonation';
    } else if (act.includes('R-410A') || act.includes('R410A') || fuel.includes('R-410A')) {
      factor = 2088.0;
      source = 'IPCC AR5 (Refrigerant R-410A GWP 2088)';
      methodology = 'Mass Balance Top-Up Tier 2';
    } else if (act.includes('HFC-134A') || act.includes('R134A') || fuel.includes('134A')) {
      factor = 1430.0;
      source = 'IPCC AR5 (Refrigerant HFC-134a GWP 1430)';
      methodology = 'Mass Balance Top-Up Tier 2';
    } else if (act.includes('SF6') || fuel.includes('SF6')) {
      factor = 23500.0;
      source = 'IPCC AR5 (Sulfur Hexafluoride SF6 GWP 23,500)';
      methodology = 'GIS Switchgear Pressure Differential';
    } else if (act.includes('FM200') || act.includes('FM-200')) {
      factor = 3220.0;
      source = 'IPCC AR5 (Fire Suppression FM-200 HFC-227ea GWP 3220)';
      methodology = 'Discharge Weight Differential';
    } else {
      factor = 2.68;
      source = 'Scope 1 Stationary Combustion Factor';
      methodology = 'Standard Fuel Combustion';
    }
  } else if (params.scopeNo === 2) {
    if (params.renewableFlag || params.renewablePercentage === 100 || act.includes('RENEW') || act.includes('SOLAR')) {
      factor = 0.0;
      source = 'GHG Protocol Scope 2 (Zero Emission Renewable / Solar PPA)';
      methodology = 'Market-Based Contractual Instrument';
      isRenewableZero = true;
    } else if (params.accountingMethod === 'MARKET_BASED') {
      factor = 0.788;
      source = 'CEA Baseline Database v19 (Residual Mix)';
      methodology = 'Market-Based Residual Grid';
    } else if (act.includes('STEAM')) {
      factor = unit === 'MT' ? 280.0 : 0.28;
      source = 'DEFRA 2024 / CEA Steam Standards';
      methodology = 'Thermal Enthalpy Fuel Allocation';
    } else if (act.includes('COOLING') || act.includes('CHILLED')) {
      factor = 0.165;
      source = 'District Cooling COP Benchmark / DEFRA';
      methodology = 'Thermal COP Derivation';
    } else {
      factor = 0.716;
      source = 'CEA CO2 Baseline Database v19 (India National Grid)';
      methodology = 'Grid Average Combined Margin Tier 2';
    }
  } else if (params.scopeNo === 3) {
    const catNo = params.scope3CategoryNo || 1;
    if (catNo === 1) {
      if (act.includes('CEMENT') && (act.includes('PPC') || act.includes('BLENDED'))) {
        factor = unit === 'MT' ? 580.0 : 0.58;
        source = 'CSI India Benchmarks / NCCBM (PPC Blended Cement)';
        methodology = 'Cradle-to-Gate LCA';
      } else if (act.includes('CEMENT') || act.includes('OPC')) {
        factor = unit === 'MT' ? 820.0 : 0.82;
        source = 'CSI Guidelines / Ecoinvent 3.9 (OPC 53 Cement)';
        methodology = 'Cradle-to-Gate LCA';
      } else if (act.includes('STEEL') || act.includes('REBAR') || (act.includes('PURCH') && unit === 'MT')) {
        factor = unit === 'MT' ? 1850.0 : 1.85;
        source = 'World Steel Association 2024 / Ecoinvent 3.9';
        methodology = 'Cradle-to-Gate Steel LCA';
      } else if (act.includes('SAND') || act.includes('AGGREGATE')) {
        factor = unit === 'MT' ? 8.4 : 0.0084;
        source = 'ICE Database v3 / Ecoinvent 3.9';
        methodology = 'Quarrying LCA';
      } else if (unit === 'INR' || (qty === 0 && spend > 0)) {
        factor = 0.00062;
        effectiveQty = spend || qty;
        source = 'USEPA USEEIO v2.0 (Indian Construction Spend)';
        methodology = 'Spend-Based EEIO';
      } else {
        factor = unit === 'MT' ? 820.0 : 0.82;
        source = 'Scope 3 Supply Chain Material Average';
      }
    } else if (catNo === 2) {
      if (unit === 'INR' || (qty === 0 && spend > 0)) {
        factor = 0.00048;
        effectiveQty = spend || qty;
        source = 'USEEIO 2.0 / DEFRA Capital Machinery';
        methodology = 'Spend-Based EEIO Model';
      } else {
        factor = unit === 'MT' ? 3800.0 : 3.8;
        source = 'Ecoinvent 3.9 (Turbines, Generators & Transformers)';
        methodology = 'Embodied Equipment LCA';
      }
    } else if (catNo === 3) {
      if (act.includes('WTT') || act.includes('DIESEL')) {
        factor = 0.612;
        source = 'DEFRA 2024 Upstream WTT Diesel Extraction';
        methodology = 'Well-to-Tank LCA';
      } else {
        factor = 0.140;
        source = 'CEA Indian Grid T&D Losses (~19.5% transmission loss)';
        methodology = 'T&D Grid Loss Allocation';
      }
    } else if (catNo === 4) {
      if (act.includes('RAIL')) {
        factor = 0.028;
        source = 'Indian Railways Electric Goods Freight';
        methodology = 'Tonne-Kilometre Rail Method';
      } else {
        factor = 0.0952;
        source = 'GLEC Framework v3 / DEFRA HCV Freight Road Transport';
        methodology = 'Tonne-Kilometre Method';
      }
    } else if (catNo === 5) {
      if (act.includes('RECYCL')) {
        factor = unit === 'MT' ? 12.0 : 0.012;
        source = 'DEFRA 2024 Closed Loop Steel Recycling';
        methodology = 'Recycled Content Method';
      } else {
        factor = unit === 'MT' ? 458.0 : 0.458;
        source = 'DEFRA 2024 / IPCC Waste Model (Landfill)';
        methodology = 'First Order Decay Model';
      }
    } else if (catNo === 6) {
      if (act.includes('HOTEL') || unit === 'ROOM_NIGHT') {
        factor = 38.2;
        source = 'Cornell Hotel Sustainability / DEFRA India Hotels';
        methodology = 'Hotel Room Night Energy Benchmark';
      } else if (act.includes('INTL')) {
        factor = 0.102;
        source = 'ICAO Aviation Calculator / DEFRA 2024';
        methodology = 'Long-Haul Aviation Model';
      } else {
        factor = 0.155;
        source = 'ICAO / DEFRA 2024 (Domestic Aviation with Radiative Forcing)';
        methodology = 'Passenger-Kilometre Model';
      }
    } else if (catNo === 7) {
      if (act.includes('BUS')) {
        factor = 0.042;
        source = 'ARAI / DEFRA Local Staff Bus Shuttle';
        methodology = 'Commuting Survey Method';
      } else {
        factor = 0.038;
        source = 'ARAI Indian Two-Wheeler Driving Cycle';
        methodology = 'Distance-based Survey Method';
      }
    } else if (catNo === 8) {
      factor = 85.0;
      source = 'BEE India Energy Star Commercial Buildings';
      methodology = 'Floor Area Intensity Method';
    } else if (catNo === 9) {
      factor = 0.0952;
      source = 'GLEC Framework v3 Outbound Highway Haulage';
      methodology = 'Tonne-Kilometre Method';
    } else if (catNo === 10) {
      factor = unit === 'MT' ? 120.0 : 0.12;
      source = 'Ecoinvent 3.9 Metal Machining & Coating';
      methodology = 'Intermediate Processing LCA';
    } else if (catNo === 11) {
      factor = 0.716;
      source = 'GHG Protocol Use Phase / CEA Grid Baseline';
      methodology = 'Lifetime Operational Simulation';
    } else if (catNo === 12) {
      factor = unit === 'MT' ? 45.0 : 0.045;
      source = 'ICE Database v3 Demolition & Scrap Recovery';
      methodology = 'End of Life Decommissioning';
    } else if (catNo === 13) {
      factor = 0.716;
      source = 'CEA Baseline Database v19 (Tenant Metering)';
      methodology = 'Tenant Metering Aggregation';
    } else if (catNo === 14) {
      factor = 65.0;
      source = 'GHG Protocol Franchise Guidance / BEE India';
      methodology = 'Franchise Floor Area Benchmark';
    } else if (catNo === 15) {
      factor = 0.00055;
      effectiveQty = spend || qty;
      source = 'PCAF Global Standard 2022 (Project Finance Attribution)';
      methodology = 'Equity / Debt Attribution Share';
    } else {
      factor = 0.55;
      source = 'Scope 3 Supply Chain Average Method';
    }
  }

  // Override with custom factor if provided
  if (params.customFactor !== undefined) {
    factor = params.customFactor;
    if (params.customFactorSource) source = params.customFactorSource;
  }

  let grossKgCO2e = effectiveQty * factor;
  if (isRenewableZero) {
    grossKgCO2e = 0;
  }

  const tCO2e = Math.round((grossKgCO2e / 1000) * 1000) / 1000;
  const roundedGrossKg = Math.round(grossKgCO2e * 100) / 100;

  const formula = `${effectiveQty} ${unit || 'UNIT'} × ${factor} = ${roundedGrossKg} kg CO2e (${tCO2e} tCO2e)`;

  return {
    factor,
    factorSource: source,
    grossKgCO2e: roundedGrossKg,
    tCO2e,
    gasBreakdown: {
      co2Kg: Math.round(grossKgCO2e * 0.99 * 100) / 100,
      ch4Kg: Math.round(grossKgCO2e * 0.001 * 1000) / 1000,
      n2oKg: Math.round(grossKgCO2e * 0.009 * 1000) / 1000,
    },
    gwpVersion,
    methodology,
    isCarbonCapture,
    isRenewableZero,
    formula,
  };
}
