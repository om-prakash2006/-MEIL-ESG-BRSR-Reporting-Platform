/**
 * Comprehensive Deterministic GHG Calculation Engine (Phase 4 Enhancement)
 * Authoritative backend implementation compliant with:
 * - GHG Protocol Corporate Accounting & Reporting Standard
 * - GHG Protocol Corporate Value Chain (Scope 3) Standard
 * - ISO 14064-1:2018 Specification
 * - CEA CO2 Baseline Database for the Indian Power Sector (v19)
 * - IPCC AR5 / AR6 Assessment Report Global Warming Potentials (GWPs)
 * - UK DEFRA / BEIS 2024-2025 GHG Conversion Factors
 * - World Steel Association, GLEC Framework, and PCAF Standards
 */

export interface EmissionFactorEntry {
  factorId: string;
  scopeNo: 1 | 2 | 3;
  scope3CategoryNo?: number;
  category: string;
  subCategory?: string;
  name: string;
  fuelOrSubstance?: string;
  unit: string;
  co2ePerUnit: number; // in kg CO2e per unit
  gasSplit?: {
    co2Kg: number;
    ch4Kg: number;
    n2oKg: number;
    sf6Kg?: number;
    hfcsKg?: number;
  };
  factorSource: string;
  gwpVersion: string;
  methodology: string;
  accountingType?: 'LOCATION_BASED' | 'MARKET_BASED' | 'SUPPLIER_SPECIFIC' | 'AVERAGE_DATA' | 'SPEND_BASED';
  description: string;
}

export interface CalculationInput {
  scopeNo: 1 | 2 | 3;
  scope3CategoryNo?: number | null;
  activityTypeId?: string;
  unitId?: string;
  quantity?: number;
  spendAmount?: number;
  currencyCode?: string;
  factorId?: string;
  accountingMethod?: 'LOCATION_BASED' | 'MARKET_BASED';
  renewableFlag?: boolean;
  renewablePercentage?: number;
  customFactor?: number;
  customFactorSource?: string;
  // Specific scope attributes
  fuelOrSubstance?: string;
  processType?: string;
  gasType?: string;
  transportMode?: string;
  wasteTreatmentType?: string;
  travelType?: string;
  investmentAttributionRatio?: number;
  isCarbonCapture?: boolean;
}

export interface GasBreakdown {
  co2Kg: number;
  ch4Kg: number;
  n2oKg: number;
  sf6Kg: number;
  hfcsKg: number;
  totalKgCO2e: number;
}

export interface CalculationResult {
  calculationId: string;
  scopeNo: 1 | 2 | 3;
  scope3CategoryNo?: number | null;
  inputQuantity: number;
  inputUnit: string;
  spendAmount?: number;
  standardizedQuantity: number;
  standardizedUnit: string;
  factorApplied: number;
  factorUnit: string;
  factorSource: string;
  gwpVersion: string;
  methodology: string;
  accountingType: string;
  grossKgCO2e: number;
  netKgCO2e: number;
  tCO2e: number;
  gasBreakdown: GasBreakdown;
  isCarbonCapture: boolean;
  isRenewableZero: boolean;
  formula: string;
  calculatedAt: number;
}

// Global Warming Potentials (IPCC 5th Assessment Report - AR5 with climate-carbon feedbacks where standard)
export const IPCC_AR5_GWP = {
  CO2: 1,
  CH4: 28,
  N2O: 265,
  SF6: 23500,
  NF3: 16100,
  'R-410A': 2088,
  'HFC-134a': 1430,
  'R-404A': 3922,
  'R-22': 1810,
  'FM-200': 3220, // HFC-227ea
  'Novec-1230': 1,
} as const;

// Comprehensive Factor Library
export const FACTOR_LIBRARY: EmissionFactorEntry[] = [
  // ==========================================
  // SCOPE 1: STATIONARY COMBUSTION
  // ==========================================
  {
    factorId: 'EF-S1-DIESEL-STATIONARY',
    scopeNo: 1,
    category: 'Stationary Combustion',
    subCategory: 'Diesel Generator / Boiler',
    name: 'High Speed Diesel (HSD) - Stationary DG',
    fuelOrSubstance: 'DIESEL',
    unit: 'LITER',
    co2ePerUnit: 2.68,
    gasSplit: { co2Kg: 2.65, ch4Kg: 0.0001, n2oKg: 0.0001 },
    factorSource: 'CEA India / DEFRA 2024 (Diesel 100% Mineral)',
    gwpVersion: 'IPCC AR5',
    methodology: 'Fuel Analysis Tier 2',
    description: 'Stationary compression ignition diesel generator sets & auxiliary plants.',
  },
  {
    factorId: 'EF-S1-PETROL-STATIONARY',
    scopeNo: 1,
    category: 'Stationary Combustion',
    subCategory: 'Equipment & Pumps',
    name: 'Motor Gasoline (Petrol)',
    fuelOrSubstance: 'PETROL',
    unit: 'LITER',
    co2ePerUnit: 2.31,
    gasSplit: { co2Kg: 2.29, ch4Kg: 0.0003, n2oKg: 0.0001 },
    factorSource: 'DEFRA 2024 / IPCC Guidelines',
    gwpVersion: 'IPCC AR5',
    methodology: 'Direct Combustion Tier 1',
    description: 'Stationary small engine pumps, vibrators, and backup power equipment.',
  },
  {
    factorId: 'EF-S1-NATURAL-GAS',
    scopeNo: 1,
    category: 'Stationary Combustion',
    subCategory: 'Piped Natural Gas (PNG)',
    name: 'Natural Gas / PNG',
    fuelOrSubstance: 'NATURAL_GAS',
    unit: 'SCM',
    co2ePerUnit: 2.02,
    gasSplit: { co2Kg: 2.00, ch4Kg: 0.0005, n2oKg: 0.0001 },
    factorSource: 'IPCC 2006 / GAIL Indian Gas Composition',
    gwpVersion: 'IPCC AR5',
    methodology: 'Stoichiometric Energy Content',
    description: 'Piped natural gas for heating, preheating, and thermal generation.',
  },
  {
    factorId: 'EF-S1-LPG',
    scopeNo: 1,
    category: 'Stationary Combustion',
    subCategory: 'Liquefied Petroleum Gas',
    name: 'LPG (Commercial / Industrial)',
    fuelOrSubstance: 'LPG',
    unit: 'KG',
    co2ePerUnit: 2.98,
    gasSplit: { co2Kg: 2.95, ch4Kg: 0.0003, n2oKg: 0.0001 },
    factorSource: 'IPCC Tier 1 / DEFRA 2024 (100% Mineral LPG)',
    gwpVersion: 'IPCC AR5',
    methodology: 'Direct Mass Factor',
    description: 'Industrial LPG cylinders for cutting, camp kitchens, and pre-heating.',
  },
  {
    factorId: 'EF-S1-COAL-INDIAN',
    scopeNo: 1,
    category: 'Stationary Combustion',
    subCategory: 'Solid Fuels',
    name: 'Indian Non-Coking Thermal Coal',
    fuelOrSubstance: 'COAL',
    unit: 'MT',
    co2ePerUnit: 1820.0,
    gasSplit: { co2Kg: 1800.0, ch4Kg: 0.2, n2oKg: 0.04 },
    factorSource: 'CEA India / MoEFCC GHG Inventory (G-11 Grade Coal)',
    gwpVersion: 'IPCC AR5',
    methodology: 'Thermal Calorific Tier 2',
    description: 'Pulverized or stoker-fired non-coking coal for industrial steam/power.',
  },
  {
    factorId: 'EF-S1-FURNACE-OIL',
    scopeNo: 1,
    category: 'Stationary Combustion',
    subCategory: 'Heavy Fuel Oil (HFO)',
    name: 'Furnace Oil / HFO',
    fuelOrSubstance: 'FURNACE_OIL',
    unit: 'LITER',
    co2ePerUnit: 3.19,
    gasSplit: { co2Kg: 3.16, ch4Kg: 0.0003, n2oKg: 0.0001 },
    factorSource: 'DEFRA 2024 / CEA Baseline Boiler Factors',
    gwpVersion: 'IPCC AR5',
    methodology: 'Fuel Volume Combustion',
    description: 'High-viscosity residual fuel oil used in boilers and asphalt plants.',
  },
  {
    factorId: 'EF-S1-LDO',
    scopeNo: 1,
    category: 'Stationary Combustion',
    subCategory: 'Distillate Fuel Oil',
    name: 'Light Diesel Oil (LDO)',
    fuelOrSubstance: 'LDO',
    unit: 'LITER',
    co2ePerUnit: 2.85,
    gasSplit: { co2Kg: 2.82, ch4Kg: 0.0002, n2oKg: 0.0001 },
    factorSource: 'DEFRA 2024 / Indian Petroleum Standards',
    gwpVersion: 'IPCC AR5',
    methodology: 'Fuel Volume Combustion',
    description: 'Medium distillates for furnaces, dryers, and industrial heaters.',
  },
  {
    factorId: 'EF-S1-BIOMASS-PELLETS',
    scopeNo: 1,
    category: 'Stationary Combustion',
    subCategory: 'Biomass & Bagasse',
    name: 'Agro Biomass Pellets / Briquettes',
    fuelOrSubstance: 'BIOMASS',
    unit: 'MT',
    co2ePerUnit: 55.0, // Non-biogenic CH4 + N2O in fossil CO2e
    gasSplit: { co2Kg: 0.0, ch4Kg: 1.2, n2oKg: 0.08 },
    factorSource: 'IPCC 2006 Guidelines for National GHG Inventories (Biogenic CO2 neutral)',
    gwpVersion: 'IPCC AR5',
    methodology: 'Biogenic Carbon Accounting (CH4/N2O accounted, CO2 biogenic)',
    description: 'Agricultural residues, rice husk, and sawdust briquettes co-fired in boilers.',
  },

  // ==========================================
  // SCOPE 1: MOBILE COMBUSTION
  // ==========================================
  {
    factorId: 'EF-S1-FLEET-HCV-DIESEL',
    scopeNo: 1,
    category: 'Mobile Combustion',
    subCategory: 'Heavy Commercial Fleet',
    name: 'Heavy Commercial Vehicle (HCV Diesel)',
    fuelOrSubstance: 'DIESEL',
    unit: 'KM',
    co2ePerUnit: 0.85,
    gasSplit: { co2Kg: 0.84, ch4Kg: 0.0001, n2oKg: 0.0003 },
    factorSource: 'GLEC Framework v3 / ARAI India Test Cycles',
    gwpVersion: 'IPCC AR5',
    methodology: 'Distance-based Vehicle Method',
    description: 'MEIL-owned heavy dumpers, transit mixers, and bulk tippers.',
  },
  {
    factorId: 'EF-S1-FLEET-LCV-DIESEL',
    scopeNo: 1,
    category: 'Mobile Combustion',
    subCategory: 'Light Commercial Fleet',
    name: 'Light Commercial Vehicle (LCV Diesel)',
    fuelOrSubstance: 'DIESEL',
    unit: 'KM',
    co2ePerUnit: 0.24,
    gasSplit: { co2Kg: 0.237, ch4Kg: 0.0001, n2oKg: 0.0001 },
    factorSource: 'ARAI / DEFRA 2024 Rigid LCVs',
    gwpVersion: 'IPCC AR5',
    methodology: 'Distance-based Vehicle Method',
    description: 'Utility pickups, maintenance vans, and site inspection vehicles.',
  },
  {
    factorId: 'EF-S1-FLEET-CAR-DIESEL',
    scopeNo: 1,
    category: 'Mobile Combustion',
    subCategory: 'Company Passenger Cars',
    name: 'Company Passenger Car (Diesel)',
    fuelOrSubstance: 'DIESEL',
    unit: 'KM',
    co2ePerUnit: 0.171,
    gasSplit: { co2Kg: 0.169, ch4Kg: 0.00005, n2oKg: 0.0001 },
    factorSource: 'DEFRA 2024 / ARAI Passenger Vehicle Average',
    gwpVersion: 'IPCC AR5',
    methodology: 'Distance-based Passenger Method',
    description: 'Company-owned SUVs and sedans assigned to project and corporate leadership.',
  },
  {
    factorId: 'EF-S1-FLEET-CAR-PETROL',
    scopeNo: 1,
    category: 'Mobile Combustion',
    subCategory: 'Company Passenger Cars',
    name: 'Company Passenger Car (Petrol)',
    fuelOrSubstance: 'PETROL',
    unit: 'KM',
    co2ePerUnit: 0.165,
    gasSplit: { co2Kg: 0.163, ch4Kg: 0.00006, n2oKg: 0.00008 },
    factorSource: 'DEFRA 2024 / ARAI Fleet Average',
    gwpVersion: 'IPCC AR5',
    methodology: 'Distance-based Passenger Method',
    description: 'Company-owned petrol sedans and pool hatchbacks.',
  },
  {
    factorId: 'EF-S1-OFFROAD-EQUIPMENT-HOUR',
    scopeNo: 1,
    category: 'Mobile Combustion',
    subCategory: 'Off-Road Heavy Equipment',
    name: 'Off-road Earthmoving Machinery (Excavator / Dozer)',
    fuelOrSubstance: 'DIESEL',
    unit: 'HOUR',
    co2ePerUnit: 28.5,
    gasSplit: { co2Kg: 28.1, ch4Kg: 0.004, n2oKg: 0.008 },
    factorSource: 'USEPA NONROAD / DEFRA Construction Equipment',
    gwpVersion: 'IPCC AR5',
    methodology: 'Equipment Operational Hour Method',
    description: 'Hydraulic excavators, bulldozers, and crawler cranes measured by engine hours.',
  },

  // ==========================================
  // SCOPE 1: INDUSTRIAL PROCESS EMISSIONS
  // ==========================================
  {
    factorId: 'EF-S1-PROCESS-CLINKER',
    scopeNo: 1,
    category: 'Process Emissions',
    subCategory: 'Mineral Industry - Cement',
    name: 'Cement Clinker Calcination (CaCO3 -> CaO + CO2)',
    fuelOrSubstance: 'LIMESTONE',
    unit: 'MT',
    co2ePerUnit: 525.0, // 0.525 tCO2e per ton of clinker
    gasSplit: { co2Kg: 525.0, ch4Kg: 0.0, n2oKg: 0.0 },
    factorSource: 'IPCC 2006 Guidelines Vol 3 Mineral Industry / CSI Guidelines',
    gwpVersion: 'IPCC AR5',
    methodology: 'Stoichiometric Carbonate Calcination Tier 2',
    description: 'Direct calcination emissions released during cement clinker manufacturing.',
  },
  {
    factorId: 'EF-S1-PROCESS-STEEL-BOF',
    scopeNo: 1,
    category: 'Process Emissions',
    subCategory: 'Metal Industry - Primary Steel',
    name: 'Primary Steelmaking (BF-BOF Carbon Reduction)',
    fuelOrSubstance: 'COKE_IRON_ORE',
    unit: 'MT',
    co2ePerUnit: 1850.0, // 1.85 tCO2e per ton of crude steel
    gasSplit: { co2Kg: 1845.0, ch4Kg: 0.15, n2oKg: 0.0 },
    factorSource: 'World Steel Association 2024 / IPCC Vol 3 Metal Industry',
    gwpVersion: 'IPCC AR5',
    methodology: 'Mass Balance Reduction Tier 2',
    description: 'Integrated blast furnace and basic oxygen furnace process reduction emissions.',
  },
  {
    factorId: 'EF-S1-PROCESS-LIME',
    scopeNo: 1,
    category: 'Process Emissions',
    subCategory: 'Mineral Industry - Lime',
    name: 'Quicklime Calcination',
    fuelOrSubstance: 'LIMESTONE',
    unit: 'MT',
    co2ePerUnit: 750.0,
    gasSplit: { co2Kg: 750.0, ch4Kg: 0.0, n2oKg: 0.0 },
    factorSource: 'IPCC Guidelines Vol 3 Chapter 2',
    gwpVersion: 'IPCC AR5',
    methodology: 'Stoichiometric Carbonate Tier 1',
    description: 'Direct decarbonation of calcium carbonate in lime kilns.',
  },
  {
    factorId: 'EF-S1-PROCESS-ASPHALT',
    scopeNo: 1,
    category: 'Process Emissions',
    subCategory: 'Construction Materials',
    name: 'Hot Mix Asphalt Processing',
    fuelOrSubstance: 'BITUMEN',
    unit: 'MT',
    co2ePerUnit: 42.0,
    gasSplit: { co2Kg: 41.5, ch4Kg: 0.01, n2oKg: 0.005 },
    factorSource: 'EAPA / NAPA GHG Factors for Asphalt Mixture',
    gwpVersion: 'IPCC AR5',
    methodology: 'Process Production Factor',
    description: 'Heating, mixing, and volatile release in batch hot-mix asphalt plants.',
  },

  // ==========================================
  // SCOPE 1: FUGITIVE EMISSIONS
  // ==========================================
  {
    factorId: 'EF-S1-FUGITIVE-R410A',
    scopeNo: 1,
    category: 'Fugitive Emissions',
    subCategory: 'Refrigerants',
    name: 'Refrigerant R-410A (HVAC Leakage)',
    fuelOrSubstance: 'R-410A',
    unit: 'KG',
    co2ePerUnit: 2088.0,
    gasSplit: { co2Kg: 0.0, ch4Kg: 0.0, n2oKg: 0.0, hfcsKg: 2088.0 },
    factorSource: 'IPCC AR5 Climate Assessment Report (100-year GWP)',
    gwpVersion: 'IPCC AR5',
    methodology: 'Mass Balance Top-Up Tier 2',
    description: 'Commercial VRF and split AC refrigerant blend (50% HFC-32 / 50% HFC-125).',
  },
  {
    factorId: 'EF-S1-FUGITIVE-HFC134A',
    scopeNo: 1,
    category: 'Fugitive Emissions',
    subCategory: 'Refrigerants',
    name: 'Refrigerant HFC-134a (Centrifugal Chillers)',
    fuelOrSubstance: 'HFC-134a',
    unit: 'KG',
    co2ePerUnit: 1430.0,
    gasSplit: { co2Kg: 0.0, ch4Kg: 0.0, n2oKg: 0.0, hfcsKg: 1430.0 },
    factorSource: 'IPCC AR5 Climate Assessment Report (100-year GWP)',
    gwpVersion: 'IPCC AR5',
    methodology: 'Mass Balance Top-Up Tier 2',
    description: 'Water-cooled centrifugal chillers and heavy vehicle cabin air conditioning.',
  },
  {
    factorId: 'EF-S1-FUGITIVE-R404A',
    scopeNo: 1,
    category: 'Fugitive Emissions',
    subCategory: 'Refrigerants',
    name: 'Refrigerant R-404A (Cold Storage)',
    fuelOrSubstance: 'R-404A',
    unit: 'KG',
    co2ePerUnit: 3922.0,
    gasSplit: { co2Kg: 0.0, ch4Kg: 0.0, n2oKg: 0.0, hfcsKg: 3922.0 },
    factorSource: 'IPCC AR5 Climate Assessment Report',
    gwpVersion: 'IPCC AR5',
    methodology: 'Mass Balance Top-Up Tier 2',
    description: 'Low-temperature cold storage and industrial chilling loops.',
  },
  {
    factorId: 'EF-S1-FUGITIVE-R22',
    scopeNo: 1,
    category: 'Fugitive Emissions',
    subCategory: 'Refrigerants (HCFC)',
    name: 'Refrigerant R-22 (HCFC-22)',
    fuelOrSubstance: 'R-22',
    unit: 'KG',
    co2ePerUnit: 1810.0,
    gasSplit: { co2Kg: 0.0, ch4Kg: 0.0, n2oKg: 0.0, hfcsKg: 1810.0 },
    factorSource: 'IPCC AR5 Climate Assessment Report',
    gwpVersion: 'IPCC AR5',
    methodology: 'Legacy Plant Maintenance Tier 2',
    description: 'Legacy air conditioning and packaged units subject to phase-out schedule.',
  },
  {
    factorId: 'EF-S1-FUGITIVE-SF6',
    scopeNo: 1,
    category: 'Fugitive Emissions',
    subCategory: 'Electrical Switchgear',
    name: 'Sulfur Hexafluoride (SF6) Switchgear Leakage',
    fuelOrSubstance: 'SF6',
    unit: 'KG',
    co2ePerUnit: 23500.0,
    gasSplit: { co2Kg: 0.0, ch4Kg: 0.0, n2oKg: 0.0, sf6Kg: 23500.0 },
    factorSource: 'IPCC AR5 Assessment Report (GWP 23,500)',
    gwpVersion: 'IPCC AR5',
    methodology: 'Gas Insulated Switchgear (GIS) Pressure Drop Method',
    description: 'Extra High Voltage (EHV) substations and GIS switchgear circuit breakers.',
  },
  {
    factorId: 'EF-S1-FUGITIVE-METHANE',
    scopeNo: 1,
    category: 'Fugitive Emissions',
    subCategory: 'Gas Distribution & Pipelines',
    name: 'Methane (CH4) Pipeline / Valve Fugitive Loss',
    fuelOrSubstance: 'METHANE',
    unit: 'KG',
    co2ePerUnit: 28.0,
    gasSplit: { co2Kg: 0.0, ch4Kg: 28.0, n2oKg: 0.0 },
    factorSource: 'IPCC AR5 (GWP 28 with climate feedbacks)',
    gwpVersion: 'IPCC AR5',
    methodology: 'Direct Leak Detection & Repair (LDAR) Measurement',
    description: 'Fugitive venting and flange leaks across natural gas pipeline networks.',
  },
  {
    factorId: 'EF-S1-FUGITIVE-FM200',
    scopeNo: 1,
    category: 'Fugitive Emissions',
    subCategory: 'Fire Suppression',
    name: 'Fire Suppression FM-200 (HFC-227ea)',
    fuelOrSubstance: 'FM-200',
    unit: 'KG',
    co2ePerUnit: 3220.0,
    gasSplit: { co2Kg: 0.0, ch4Kg: 0.0, n2oKg: 0.0, hfcsKg: 3220.0 },
    factorSource: 'IPCC AR5 Assessment Report',
    gwpVersion: 'IPCC AR5',
    methodology: 'Discharge Cylinder Weight Differential',
    description: 'Server room and electrical control center total flooding fire suppression.',
  },

  // ==========================================
  // SCOPE 1: CARBON CAPTURE & STORAGE
  // ==========================================
  {
    factorId: 'EF-S1-CARBON-CAPTURE',
    scopeNo: 1,
    category: 'Carbon Capture',
    subCategory: 'Direct Sequestration',
    name: 'Direct Carbon Capture & Permanent Storage',
    fuelOrSubstance: 'CO2',
    unit: 'MT',
    co2ePerUnit: -1000.0, // Negative factor: deductions if verified
    gasSplit: { co2Kg: -1000.0, ch4Kg: 0.0, n2oKg: 0.0 },
    factorSource: 'ISO 27914 / IPCC Guidelines for CCS Accounting',
    gwpVersion: 'IPCC AR5',
    methodology: 'Permanent Geological Sequestration Verification',
    description: 'Captured flue gas CO2 permanently sequestered in verified geological formations.',
  },

  // ==========================================
  // SCOPE 2: PURCHASED ELECTRICITY & STEAM
  // ==========================================
  {
    factorId: 'EF-S2-INDIA-GRID-AVG',
    scopeNo: 2,
    category: 'Purchased Electricity',
    subCategory: 'Location-Based Grid',
    name: 'Indian National Grid (National Combined Margin)',
    unit: 'KWH',
    co2ePerUnit: 0.716,
    gasSplit: { co2Kg: 0.709, ch4Kg: 0.00003, n2oKg: 0.00002 },
    factorSource: 'CEA CO2 Baseline Database for the Indian Power Sector (v19, 2024)',
    gwpVersion: 'IPCC AR5',
    methodology: 'Grid Average Combined Margin Tier 2',
    accountingType: 'LOCATION_BASED',
    description: 'Statutory national baseline grid factor for India published by Central Electricity Authority.',
  },
  {
    factorId: 'EF-S2-GRID-NORTH',
    scopeNo: 2,
    category: 'Purchased Electricity',
    subCategory: 'Regional Grid',
    name: 'Northern Regional Grid (NR India)',
    unit: 'KWH',
    co2ePerUnit: 0.724,
    gasSplit: { co2Kg: 0.717, ch4Kg: 0.00003, n2oKg: 0.00002 },
    factorSource: 'CEA Baseline Database v19 (Northern Region Weighted)',
    gwpVersion: 'IPCC AR5',
    methodology: 'Regional Grid Mix',
    accountingType: 'LOCATION_BASED',
    description: 'Projects connected to Northern grid (Delhi, UP, Punjab, Haryana, Uttarakhand).',
  },
  {
    factorId: 'EF-S2-GRID-SOUTH',
    scopeNo: 2,
    category: 'Purchased Electricity',
    subCategory: 'Regional Grid',
    name: 'Southern Regional Grid (SR India)',
    unit: 'KWH',
    co2ePerUnit: 0.698,
    gasSplit: { co2Kg: 0.691, ch4Kg: 0.00003, n2oKg: 0.00002 },
    factorSource: 'CEA Baseline Database v19 (Southern Region Weighted)',
    gwpVersion: 'IPCC AR5',
    methodology: 'Regional Grid Mix',
    accountingType: 'LOCATION_BASED',
    description: 'Projects connected to Southern grid (Telangana, Andhra Pradesh, Karnataka, Tamil Nadu).',
  },
  {
    factorId: 'EF-S2-MARKET-GREEN-PPA',
    scopeNo: 2,
    category: 'Purchased Electricity',
    subCategory: 'Market-Based Contractual',
    name: 'Certified Green Power / Open Access Solar-Wind PPA',
    unit: 'KWH',
    co2ePerUnit: 0.0,
    gasSplit: { co2Kg: 0.0, ch4Kg: 0.0, n2oKg: 0.0 },
    factorSource: 'GHG Protocol Scope 2 Guidance (Contractual Renewable Instrument)',
    gwpVersion: 'IPCC AR5',
    methodology: 'Market-Based Zero Emission Renewable',
    accountingType: 'MARKET_BASED',
    description: 'Wheeled renewable energy with surrendered Green Attribute Certificates (EACs / RECs).',
  },
  {
    factorId: 'EF-S2-MARKET-RESIDUAL',
    scopeNo: 2,
    category: 'Purchased Electricity',
    subCategory: 'Market-Based Residual Mix',
    name: 'Indian Grid Residual Mix (Supplier Default)',
    unit: 'KWH',
    co2ePerUnit: 0.788,
    gasSplit: { co2Kg: 0.781, ch4Kg: 0.00003, n2oKg: 0.00002 },
    factorSource: 'CEA Baseline v19 Adjusted Residual Mix without green claims',
    gwpVersion: 'IPCC AR5',
    methodology: 'Market-Based Residual Grid',
    accountingType: 'MARKET_BASED',
    description: 'Market-based reporting when specific contractual instruments are not procured.',
  },
  {
    factorId: 'EF-S2-PURCHASED-STEAM',
    scopeNo: 2,
    category: 'Purchased Energy',
    subCategory: 'Thermal Steam',
    name: 'Purchased High-Pressure Industrial Steam',
    unit: 'MT',
    co2ePerUnit: 280.0, // 0.28 tCO2e per ton of steam
    gasSplit: { co2Kg: 278.0, ch4Kg: 0.01, n2oKg: 0.005 },
    factorSource: 'DEFRA 2024 / CEA Industrial Boiler Steam Standards',
    gwpVersion: 'IPCC AR5',
    methodology: 'Thermal Enthalpy Fuel Allocation',
    accountingType: 'LOCATION_BASED',
    description: 'Steam imported from adjacent industrial co-generation or municipal facilities.',
  },
  {
    factorId: 'EF-S2-PURCHASED-COOLING',
    scopeNo: 2,
    category: 'Purchased Energy',
    subCategory: 'District Cooling',
    name: 'Purchased Chilled Water / District Cooling',
    unit: 'KWH',
    co2ePerUnit: 0.165,
    gasSplit: { co2Kg: 0.163, ch4Kg: 0.00001, n2oKg: 0.00001 },
    factorSource: 'District Energy Benchmarks / DEFRA Chilled Water',
    gwpVersion: 'IPCC AR5',
    methodology: 'Thermal COP Derivation Tier 2',
    accountingType: 'LOCATION_BASED',
    description: 'District cooling network supply for corporate campus and tunnel portals.',
  },

  // ==========================================
  // SCOPE 3 — ALL 15 CATEGORIES
  // ==========================================

  // CAT 1: Purchased Goods and Services
  {
    factorId: 'EF-S3-CAT1-STEEL-REBAR',
    scopeNo: 3,
    scope3CategoryNo: 1,
    category: 'Category 1: Purchased Goods and Services',
    subCategory: 'Raw Materials - Steel',
    name: 'Structural Steel / Fe550D TMT Rebar (BF-BOF)',
    unit: 'MT',
    co2ePerUnit: 1850.0,
    gasSplit: { co2Kg: 1840.0, ch4Kg: 0.1, n2oKg: 0.02 },
    factorSource: 'World Steel Association 2024 / Ecoinvent 3.9',
    gwpVersion: 'IPCC AR5',
    methodology: 'Cradle-to-Gate Life Cycle Assessment (LCA)',
    accountingType: 'AVERAGE_DATA',
    description: 'Primary structural steel used across dam, canal, and heavy civil construction.',
  },
  {
    factorId: 'EF-S3-CAT1-CEMENT-OPC',
    scopeNo: 3,
    scope3CategoryNo: 1,
    category: 'Category 1: Purchased Goods and Services',
    subCategory: 'Raw Materials - Cement',
    name: 'Ordinary Portland Cement (OPC 53 Grade)',
    unit: 'MT',
    co2ePerUnit: 820.0,
    gasSplit: { co2Kg: 818.0, ch4Kg: 0.01, n2oKg: 0.005 },
    factorSource: 'Cement Sustainability Initiative (CSI) / Ecoinvent 3.9',
    gwpVersion: 'IPCC AR5',
    methodology: 'Cradle-to-Gate LCA',
    accountingType: 'AVERAGE_DATA',
    description: 'Standard OPC 53 cement for high-strength hydraulic concrete structures.',
  },
  {
    factorId: 'EF-S3-CAT1-CEMENT-PPC',
    scopeNo: 3,
    scope3CategoryNo: 1,
    category: 'Category 1: Purchased Goods and Services',
    subCategory: 'Raw Materials - Cement',
    name: 'Portland Pozzolana Cement (PPC - Blended)',
    unit: 'MT',
    co2ePerUnit: 580.0,
    gasSplit: { co2Kg: 578.0, ch4Kg: 0.01, n2oKg: 0.003 },
    factorSource: 'CSI India Benchmarks / NCCBM India',
    gwpVersion: 'IPCC AR5',
    methodology: 'Cradle-to-Gate LCA',
    accountingType: 'AVERAGE_DATA',
    description: 'Fly-ash blended cement delivering ~30% embodied carbon reduction.',
  },
  {
    factorId: 'EF-S3-CAT1-AGGREGATE-SAND',
    scopeNo: 3,
    scope3CategoryNo: 1,
    category: 'Category 1: Purchased Goods and Services',
    subCategory: 'Aggregates',
    name: 'Crushed Rock Aggregates & Manufactured Sand (M-Sand)',
    unit: 'MT',
    co2ePerUnit: 8.4,
    gasSplit: { co2Kg: 8.2, ch4Kg: 0.001, n2oKg: 0.0005 },
    factorSource: 'Ecoinvent 3.9 / ICE Database v3',
    gwpVersion: 'IPCC AR5',
    methodology: 'Quarrying and Crushing LCA',
    accountingType: 'AVERAGE_DATA',
    description: 'Coarse and fine aggregates for RMC and structural concrete mixes.',
  },
  {
    factorId: 'EF-S3-CAT1-SPEND-CONSTRUCTION',
    scopeNo: 3,
    scope3CategoryNo: 1,
    category: 'Category 1: Purchased Goods and Services',
    subCategory: 'Spend-Based EEIO',
    name: 'General Construction Supplies & Services (Spend-based)',
    unit: 'INR',
    co2ePerUnit: 0.00062, // 0.62 kg CO2e per 1,000 INR
    gasSplit: { co2Kg: 0.00060, ch4Kg: 0.00001, n2oKg: 0.000005 },
    factorSource: 'USEPA USEEIO v2.0 adjusted for Indian Construction Sector PPP',
    gwpVersion: 'IPCC AR5',
    methodology: 'Environmentally Extended Input-Output (EEIO)',
    accountingType: 'SPEND_BASED',
    description: 'Spend-based proxy when physical supplier quantities are unavailable.',
  },

  // CAT 2: Capital Goods
  {
    factorId: 'EF-S3-CAT2-HEAVY-EQUIPMENT-SPEND',
    scopeNo: 3,
    scope3CategoryNo: 2,
    category: 'Category 2: Capital Goods',
    subCategory: 'Construction Machinery',
    name: 'Heavy Construction Machinery (Excavators, Cranes, TBMs)',
    unit: 'INR',
    co2ePerUnit: 0.00048,
    gasSplit: { co2Kg: 0.00046, ch4Kg: 0.00001, n2oKg: 0.000005 },
    factorSource: 'USEEIO 2.0 / DEFRA Capital Equipment',
    gwpVersion: 'IPCC AR5',
    methodology: 'EEIO Spend Model',
    accountingType: 'SPEND_BASED',
    description: 'Capital procurement of heavy plant equipment, excavators, and drilling rigs.',
  },
  {
    factorId: 'EF-S3-CAT2-TURBINES-TRANSFORMERS',
    scopeNo: 3,
    scope3CategoryNo: 2,
    category: 'Category 2: Capital Goods',
    subCategory: 'Electrical Infrastructure',
    name: 'Hydro Turbines, Generators & Transformers',
    unit: 'MT',
    co2ePerUnit: 3800.0,
    gasSplit: { co2Kg: 3780.0, ch4Kg: 0.1, n2oKg: 0.05 },
    factorSource: 'Ecoinvent 3.9 / Power Generation Equipment LCA',
    gwpVersion: 'IPCC AR5',
    methodology: 'Process LCA Tier 2',
    accountingType: 'AVERAGE_DATA',
    description: 'Embodied carbon of major electromechanical plant installations.',
  },

  // CAT 3: Fuel- and Energy-Related Activities (FERA)
  {
    factorId: 'EF-S3-CAT3-WTT-DIESEL',
    scopeNo: 3,
    scope3CategoryNo: 3,
    category: 'Category 3: Fuel- & Energy-Related Activities',
    subCategory: 'Well-to-Tank (WTT) Fuels',
    name: 'Well-to-Tank (WTT) Upstream Diesel Extraction & Refining',
    unit: 'LITER',
    co2ePerUnit: 0.612,
    gasSplit: { co2Kg: 0.58, ch4Kg: 0.001, n2oKg: 0.0001 },
    factorSource: 'DEFRA 2024 Upstream WTT Fuels',
    gwpVersion: 'IPCC AR5',
    methodology: 'Upstream Refining & Transport LCA',
    accountingType: 'AVERAGE_DATA',
    description: 'Upstream extraction, refining, and pipeline transport of purchased diesel.',
  },
  {
    factorId: 'EF-S3-CAT3-GRID-TD-LOSSES',
    scopeNo: 3,
    scope3CategoryNo: 3,
    category: 'Category 3: Fuel- & Energy-Related Activities',
    subCategory: 'Transmission & Distribution Losses',
    name: 'Electricity Transmission & Distribution (T&D) Losses (India Grid)',
    unit: 'KWH',
    co2ePerUnit: 0.140, // ~19.5% average national T&D technical loss * 0.716
    gasSplit: { co2Kg: 0.138, ch4Kg: 0.00001, n2oKg: 0.000005 },
    factorSource: 'CEA Indian National T&D Loss Data (~19.5% average loss)',
    gwpVersion: 'IPCC AR5',
    methodology: 'Grid Loss Allocation Tier 2',
    accountingType: 'AVERAGE_DATA',
    description: 'Emissions associated with energy lost in the grid network prior to delivery.',
  },

  // CAT 4: Upstream Transportation & Distribution
  {
    factorId: 'EF-S3-CAT4-ROAD-FREIGHT-HCV',
    scopeNo: 3,
    scope3CategoryNo: 4,
    category: 'Category 4: Upstream Transportation & Distribution',
    subCategory: 'Road Freight',
    name: 'Heavy Commercial Truck Freight (HCV >20t)',
    unit: 'T-KM',
    co2ePerUnit: 0.0952,
    gasSplit: { co2Kg: 0.094, ch4Kg: 0.00001, n2oKg: 0.00003 },
    factorSource: 'GLEC Framework v3 / DEFRA 2024 Articulated Heavy HGV',
    gwpVersion: 'IPCC AR5',
    methodology: 'Tonne-Kilometre Method',
    accountingType: 'AVERAGE_DATA',
    description: 'Inbound haulage of steel, cement, pipes, and aggregate to remote project sites.',
  },
  {
    factorId: 'EF-S3-CAT4-RAIL-FREIGHT',
    scopeNo: 3,
    scope3CategoryNo: 4,
    category: 'Category 4: Upstream Transportation & Distribution',
    subCategory: 'Rail Freight',
    name: 'Indian Railways Electric Goods Freight',
    unit: 'T-KM',
    co2ePerUnit: 0.028,
    gasSplit: { co2Kg: 0.0275, ch4Kg: 0.000005, n2oKg: 0.000002 },
    factorSource: 'Indian Railways Carbon Accounting Guidelines / GLEC',
    gwpVersion: 'IPCC AR5',
    methodology: 'Tonne-Kilometre Rail Method',
    accountingType: 'AVERAGE_DATA',
    description: 'Bulk material transportation via Indian Railways electrified rake network.',
  },

  // CAT 5: Waste Generated in Operations
  {
    factorId: 'EF-S3-CAT5-WASTE-LANDFILL',
    scopeNo: 3,
    scope3CategoryNo: 5,
    category: 'Category 5: Waste Generated in Operations',
    subCategory: 'Disposal',
    name: 'Mixed Municipal / Construction Waste to Landfill',
    unit: 'KG',
    co2ePerUnit: 0.458,
    gasSplit: { co2Kg: 0.05, ch4Kg: 0.014, n2oKg: 0.0001 },
    factorSource: 'DEFRA 2024 / IPCC Waste Model Tier 1',
    gwpVersion: 'IPCC AR5',
    methodology: 'First Order Decay Waste Model',
    accountingType: 'AVERAGE_DATA',
    description: 'Unharvested landfill disposal of site camps and municipal solid waste.',
  },
  {
    factorId: 'EF-S3-CAT5-WASTE-RECYCLING',
    scopeNo: 3,
    scope3CategoryNo: 5,
    category: 'Category 5: Waste Generated in Operations',
    subCategory: 'Recycling',
    name: 'Construction Scrap Metal & Steel Recycling',
    unit: 'KG',
    co2ePerUnit: 0.012,
    gasSplit: { co2Kg: 0.0118, ch4Kg: 0.00001, n2oKg: 0.000005 },
    factorSource: 'DEFRA 2024 Closed Loop Recycling',
    gwpVersion: 'IPCC AR5',
    methodology: 'Recycled Content Method',
    accountingType: 'AVERAGE_DATA',
    description: 'Scrap rebar, structural off-cuts, and metal packaging diverted to recyclers.',
  },

  // CAT 6: Business Travel
  {
    factorId: 'EF-S3-CAT6-AIR-DOMESTIC-ECON',
    scopeNo: 3,
    scope3CategoryNo: 6,
    category: 'Category 6: Business Travel',
    subCategory: 'Aviation',
    name: 'Commercial Air Travel - Domestic Economy (<1000 km)',
    unit: 'P-KM',
    co2ePerUnit: 0.155,
    gasSplit: { co2Kg: 0.153, ch4Kg: 0.00001, n2oKg: 0.00005 },
    factorSource: 'ICAO / DEFRA 2024 (With Radiative Forcing)',
    gwpVersion: 'IPCC AR5',
    methodology: 'Passenger-Kilometre Aviation Model',
    accountingType: 'AVERAGE_DATA',
    description: 'Short-haul domestic executive and engineering flights across India.',
  },
  {
    factorId: 'EF-S3-CAT6-AIR-INTL-ECON',
    scopeNo: 3,
    scope3CategoryNo: 6,
    category: 'Category 6: Business Travel',
    subCategory: 'Aviation',
    name: 'Commercial Air Travel - International Economy (>1000 km)',
    unit: 'P-KM',
    co2ePerUnit: 0.102,
    gasSplit: { co2Kg: 0.100, ch4Kg: 0.00001, n2oKg: 0.00003 },
    factorSource: 'ICAO Carbon Emissions Calculator / DEFRA 2024',
    gwpVersion: 'IPCC AR5',
    methodology: 'Long-Haul Aviation Model',
    accountingType: 'AVERAGE_DATA',
    description: 'International travel for joint venture and EPC project coordination.',
  },
  {
    factorId: 'EF-S3-CAT6-HOTEL-INDIA',
    scopeNo: 3,
    scope3CategoryNo: 6,
    category: 'Category 6: Business Travel',
    subCategory: 'Accommodations',
    name: 'Hotel Room Stay (India Urban Standard)',
    unit: 'ROOM_NIGHT',
    co2ePerUnit: 38.2,
    gasSplit: { co2Kg: 37.8, ch4Kg: 0.01, n2oKg: 0.005 },
    factorSource: 'Cornell Hotel Sustainability Benchmarking / DEFRA 2024 India',
    gwpVersion: 'IPCC AR5',
    methodology: 'Hotel Energy Benchmark Tier 2',
    accountingType: 'AVERAGE_DATA',
    description: 'Corporate hotel stays during project audits and business reviews.',
  },

  // CAT 7: Employee Commuting
  {
    factorId: 'EF-S3-CAT7-BUS-COMMUTE',
    scopeNo: 3,
    scope3CategoryNo: 7,
    category: 'Category 7: Employee Commuting',
    subCategory: 'Public / Company Bus',
    name: 'Project Staff Bus Shuttle Commute',
    unit: 'P-KM',
    co2ePerUnit: 0.042,
    gasSplit: { co2Kg: 0.0415, ch4Kg: 0.00001, n2oKg: 0.00002 },
    factorSource: 'ARAI / DEFRA 2024 Local Bus Transit',
    gwpVersion: 'IPCC AR5',
    methodology: 'Commuting Survey Distance Model',
    accountingType: 'AVERAGE_DATA',
    description: 'Daily staff transportation between townships/camps and dam/tunnel work sites.',
  },
  {
    factorId: 'EF-S3-CAT7-TWOWHEELER-COMMUTE',
    scopeNo: 3,
    scope3CategoryNo: 7,
    category: 'Category 7: Employee Commuting',
    subCategory: 'Personal Vehicle',
    name: 'Employee Two-Wheeler Motorcycle Commute',
    unit: 'KM',
    co2ePerUnit: 0.038,
    gasSplit: { co2Kg: 0.0375, ch4Kg: 0.00005, n2oKg: 0.00001 },
    factorSource: 'ARAI Indian Two-Wheeler Driving Cycle',
    gwpVersion: 'IPCC AR5',
    methodology: 'Distance-based Survey Method',
    accountingType: 'AVERAGE_DATA',
    description: 'Individual employee daily travel via petrol scooters and motorcycles.',
  },

  // CAT 8: Upstream Leased Assets
  {
    factorId: 'EF-S3-CAT8-LEASED-OFFICE',
    scopeNo: 3,
    scope3CategoryNo: 8,
    category: 'Category 8: Upstream Leased Assets',
    subCategory: 'Real Estate',
    name: 'Leased Commercial Office Facility (Electricity & Cooling)',
    unit: 'SQM_YEAR',
    co2ePerUnit: 85.0,
    gasSplit: { co2Kg: 84.2, ch4Kg: 0.01, n2oKg: 0.005 },
    factorSource: 'BEE India Energy Star Commercial Buildings',
    gwpVersion: 'IPCC AR5',
    methodology: 'Floor Area Intensity Method',
    accountingType: 'AVERAGE_DATA',
    description: 'Leased corporate and regional project branch offices where energy bills are bundled.',
  },

  // CAT 9: Downstream Transportation & Distribution
  {
    factorId: 'EF-S3-CAT9-OUTBOUND-FREIGHT',
    scopeNo: 3,
    scope3CategoryNo: 9,
    category: 'Category 9: Downstream Transportation & Distribution',
    subCategory: 'Client Delivery',
    name: 'Outbound Fabricated Goods Freight to Client Site',
    unit: 'T-KM',
    co2ePerUnit: 0.0952,
    gasSplit: { co2Kg: 0.094, ch4Kg: 0.00001, n2oKg: 0.00003 },
    factorSource: 'GLEC Framework v3 Road Transport',
    gwpVersion: 'IPCC AR5',
    methodology: 'Tonne-Kilometre Outbound Method',
    accountingType: 'AVERAGE_DATA',
    description: 'Transportation of fabricated gates, penstocks, and equipment to project owners.',
  },

  // CAT 10: Processing of Sold Products
  {
    factorId: 'EF-S3-CAT10-INTERMEDIATE-PROCESSING',
    scopeNo: 3,
    scope3CategoryNo: 10,
    category: 'Category 10: Processing of Sold Products',
    subCategory: 'Third-Party Processing',
    name: 'Downstream Steel Fabrication & Machining by Client',
    unit: 'MT',
    co2ePerUnit: 120.0,
    gasSplit: { co2Kg: 118.5, ch4Kg: 0.01, n2oKg: 0.005 },
    factorSource: 'Ecoinvent 3.9 Metal Machining and Coating',
    gwpVersion: 'IPCC AR5',
    methodology: 'Product Intermediate Processing Tier 2',
    accountingType: 'AVERAGE_DATA',
    description: 'Secondary processing of MEIL intermediate products before final installation.',
  },

  // CAT 11: Use of Sold Products
  {
    factorId: 'EF-S3-CAT11-LIFETIME-USE-EQUIPMENT',
    scopeNo: 3,
    scope3CategoryNo: 11,
    category: 'Category 11: Use of Sold Products',
    subCategory: 'Direct Lifetime Use',
    name: 'Direct Fuel/Power Use of Sold Turbines & Pumping Plants',
    unit: 'KWH',
    co2ePerUnit: 0.716,
    gasSplit: { co2Kg: 0.709, ch4Kg: 0.00003, n2oKg: 0.00002 },
    factorSource: 'GHG Protocol Use Phase Guidance / CEA Grid Factor',
    gwpVersion: 'IPCC AR5',
    methodology: 'Operational Life Simulation Tier 2',
    accountingType: 'AVERAGE_DATA',
    description: 'Lifetime electricity consumed by lift irrigation pumps sold to municipal boards.',
  },

  // CAT 12: End-of-Life Treatment of Sold Products
  {
    factorId: 'EF-S3-CAT12-DEMOLITION-RECYCLING',
    scopeNo: 3,
    scope3CategoryNo: 12,
    category: 'Category 12: End-of-Life Treatment',
    subCategory: 'Decommissioning',
    name: 'Infrastructure Decommissioning & Scrap Steel Recovery',
    unit: 'MT',
    co2ePerUnit: 45.0,
    gasSplit: { co2Kg: 44.5, ch4Kg: 0.01, n2oKg: 0.002 },
    factorSource: 'ICE Database v3 / Ecoinvent 3.9 Demolition',
    gwpVersion: 'IPCC AR5',
    methodology: 'End of Life Decommissioning LCA',
    accountingType: 'AVERAGE_DATA',
    description: 'End-of-life deconstruction, sorting, and material recovery of decommissioned assets.',
  },

  // CAT 13: Downstream Leased Assets
  {
    factorId: 'EF-S3-CAT13-LEASED-COMMERCIAL-TENANT',
    scopeNo: 3,
    scope3CategoryNo: 13,
    category: 'Category 13: Downstream Leased Assets',
    subCategory: 'Tenant Electricity',
    name: 'MEIL-Owned Commercial Property Leased to Third Parties',
    unit: 'KWH',
    co2ePerUnit: 0.716,
    gasSplit: { co2Kg: 0.709, ch4Kg: 0.00003, n2oKg: 0.00002 },
    factorSource: 'CEA Baseline Database v19',
    gwpVersion: 'IPCC AR5',
    methodology: 'Tenant Metering Aggregation',
    accountingType: 'AVERAGE_DATA',
    description: 'Energy consumed by tenants operating in assets owned but leased out by MEIL.',
  },

  // CAT 14: Franchises
  {
    factorId: 'EF-S3-CAT14-FRANCHISE-OPERATIONS',
    scopeNo: 3,
    scope3CategoryNo: 14,
    category: 'Category 14: Franchises',
    subCategory: 'Franchised Outlets',
    name: 'Franchised Distribution Outlets Operations',
    unit: 'SQM_YEAR',
    co2ePerUnit: 65.0,
    gasSplit: { co2Kg: 64.3, ch4Kg: 0.01, n2oKg: 0.005 },
    factorSource: 'GHG Protocol Franchise Guidance / BEE India',
    gwpVersion: 'IPCC AR5',
    methodology: 'Franchise Floor Area Benchmark',
    accountingType: 'AVERAGE_DATA',
    description: 'Scope 1 and 2 emissions from franchised operations outside MEIL direct control.',
  },

  // CAT 15: Investments
  {
    factorId: 'EF-S3-CAT15-PROJECT-FINANCE-PCAF',
    scopeNo: 3,
    scope3CategoryNo: 15,
    category: 'Category 15: Investments',
    subCategory: 'Project Finance & JVs',
    name: 'Project Finance Joint Venture Attribution (PCAF Standard)',
    unit: 'INR',
    co2ePerUnit: 0.00055, // In proportion to outstanding balance / total equity debt
    gasSplit: { co2Kg: 0.00054, ch4Kg: 0.000005, n2oKg: 0.000002 },
    factorSource: 'Partnership for Carbon Accounting Financials (PCAF Global Standard 2022)',
    gwpVersion: 'IPCC AR5',
    methodology: 'Equity / Debt Attribution Share Tier 1',
    accountingType: 'SPEND_BASED',
    description: 'Financed emissions from non-consolidated SPVs and infrastructure joint ventures.',
  },
];

/**
 * Standardize unit names into consistent uppercase identifiers
 */
export function standardizeUnit(unit?: string): string {
  if (!unit) return 'UNIT';
  const u = unit.trim().toUpperCase();
  if (['L', 'LT', 'LITER', 'LITERS', 'LITRE', 'LITRES'].includes(u)) return 'LITER';
  if (['KG', 'KILOGRAM', 'KILOGRAMS'].includes(u)) return 'KG';
  if (['MT', 'TON', 'TONS', 'TONNE', 'TONNES'].includes(u)) return 'MT';
  if (['SCM', 'M3', 'CUBIC_METER', 'NM3'].includes(u)) return 'SCM';
  if (['KWH', 'KW-H', 'UNITS'].includes(u)) return 'KWH';
  if (['MWH', 'MEGAWATT_HOUR'].includes(u)) return 'MWH';
  if (['KM', 'KILOMETER', 'KILOMETERS'].includes(u)) return 'KM';
  if (['T-KM', 'TKM', 'TON-KM', 'TONNE_KM'].includes(u)) return 'T-KM';
  if (['P-KM', 'PKM', 'PASSENGER_KM', 'PAX_KM'].includes(u)) return 'P-KM';
  if (['HOUR', 'HOURS', 'HR', 'HRS'].includes(u)) return 'HOUR';
  if (['ROOM_NIGHT', 'ROOM_NIGHTS', 'NIGHT', 'NIGHTS'].includes(u)) return 'ROOM_NIGHT';
  if (['SQM_YEAR', 'SQM', 'M2', 'SQFT'].includes(u)) return 'SQM_YEAR';
  if (['INR', 'RS', 'RUPEE', 'RUPEES'].includes(u)) return 'INR';
  return u;
}

/**
 * Find the most suitable emission factor for an activity
 */
export function resolveEmissionFactor(input: CalculationInput): EmissionFactorEntry {
  // If specific factor ID is provided and exists
  if (input.factorId) {
    const found = FACTOR_LIBRARY.find((f) => f.factorId === input.factorId);
    if (found) return found;
  }

  const scope = input.scopeNo;
  const unit = standardizeUnit(input.unitId);
  const act = (input.activityTypeId || '').toUpperCase();
  const fuel = (input.fuelOrSubstance || '').toUpperCase();

  // Carbon Capture handling
  if (input.isCarbonCapture || act.includes('CAPTURE')) {
    const ccs = FACTOR_LIBRARY.find((f) => f.factorId === 'EF-S1-CARBON-CAPTURE');
    if (ccs) return ccs;
  }

  // SCOPE 1 RESOLUTION
  if (scope === 1) {
    if (act.includes('DIESEL') || fuel.includes('DIESEL') || fuel.includes('HSD')) {
      if (unit === 'KM') return FACTOR_LIBRARY.find((f) => f.factorId === 'EF-S1-FLEET-HCV-DIESEL')!;
      if (unit === 'HOUR') return FACTOR_LIBRARY.find((f) => f.factorId === 'EF-S1-OFFROAD-EQUIPMENT-HOUR')!;
      return FACTOR_LIBRARY.find((f) => f.factorId === 'EF-S1-DIESEL-STATIONARY')!;
    }
    if (act.includes('PETROL') || fuel.includes('PETROL') || fuel.includes('GASOLINE')) {
      if (unit === 'KM') return FACTOR_LIBRARY.find((f) => f.factorId === 'EF-S1-FLEET-CAR-PETROL')!;
      return FACTOR_LIBRARY.find((f) => f.factorId === 'EF-S1-PETROL-STATIONARY')!;
    }
    if (act.includes('NAT') || act.includes('GAS') || act.includes('PNG') || fuel.includes('NATURAL_GAS') || unit === 'SCM') {
      return FACTOR_LIBRARY.find((f) => f.factorId === 'EF-S1-NATURAL-GAS')!;
    }
    if (act.includes('LPG') || fuel.includes('LPG')) {
      return FACTOR_LIBRARY.find((f) => f.factorId === 'EF-S1-LPG')!;
    }
    if (act.includes('COAL') || fuel.includes('COAL')) {
      return FACTOR_LIBRARY.find((f) => f.factorId === 'EF-S1-COAL-INDIAN')!;
    }
    if (act.includes('HFO') || act.includes('FURNACE') || fuel.includes('HFO') || fuel.includes('FURNACE')) {
      return FACTOR_LIBRARY.find((f) => f.factorId === 'EF-S1-FURNACE-OIL')!;
    }
    if (act.includes('LDO') || fuel.includes('LDO')) {
      return FACTOR_LIBRARY.find((f) => f.factorId === 'EF-S1-LDO')!;
    }
    if (act.includes('BIOMASS') || fuel.includes('BIOMASS') || fuel.includes('BRIQUETTE')) {
      return FACTOR_LIBRARY.find((f) => f.factorId === 'EF-S1-BIOMASS-PELLETS')!;
    }
    // Process emissions
    if (act.includes('CLINKER') || act.includes('CEMENT-PROCESS')) {
      return FACTOR_LIBRARY.find((f) => f.factorId === 'EF-S1-PROCESS-CLINKER')!;
    }
    if (act.includes('STEEL-PROCESS') || act.includes('BOF')) {
      return FACTOR_LIBRARY.find((f) => f.factorId === 'EF-S1-PROCESS-STEEL-BOF')!;
    }
    if (act.includes('LIME')) {
      return FACTOR_LIBRARY.find((f) => f.factorId === 'EF-S1-PROCESS-LIME')!;
    }
    if (act.includes('ASPHALT')) {
      return FACTOR_LIBRARY.find((f) => f.factorId === 'EF-S1-PROCESS-ASPHALT')!;
    }
    // Fugitive emissions
    if (act.includes('R-410A') || act.includes('R410A') || fuel.includes('R-410A')) {
      return FACTOR_LIBRARY.find((f) => f.factorId === 'EF-S1-FUGITIVE-R410A')!;
    }
    if (act.includes('HFC-134A') || act.includes('R134A') || fuel.includes('134A')) {
      return FACTOR_LIBRARY.find((f) => f.factorId === 'EF-S1-FUGITIVE-HFC134A')!;
    }
    if (act.includes('R-404A') || act.includes('R404A')) {
      return FACTOR_LIBRARY.find((f) => f.factorId === 'EF-S1-FUGITIVE-R404A')!;
    }
    if (act.includes('SF6') || fuel.includes('SF6')) {
      return FACTOR_LIBRARY.find((f) => f.factorId === 'EF-S1-FUGITIVE-SF6')!;
    }
    if (act.includes('FM200') || act.includes('FM-200')) {
      return FACTOR_LIBRARY.find((f) => f.factorId === 'EF-S1-FUGITIVE-FM200')!;
    }
    if (act.includes('REFRIG') || act.includes('FUGITIVE')) {
      return FACTOR_LIBRARY.find((f) => f.factorId === 'EF-S1-FUGITIVE-R410A')!;
    }
    // Default Scope 1
    return FACTOR_LIBRARY.find((f) => f.factorId === 'EF-S1-DIESEL-STATIONARY')!;
  }

  // SCOPE 2 RESOLUTION
  if (scope === 2) {
    if (input.renewableFlag || input.renewablePercentage === 100 || act.includes('RENEW') || act.includes('SOLAR')) {
      return FACTOR_LIBRARY.find((f) => f.factorId === 'EF-S2-MARKET-GREEN-PPA')!;
    }
    if (input.accountingMethod === 'MARKET_BASED') {
      return FACTOR_LIBRARY.find((f) => f.factorId === 'EF-S2-MARKET-RESIDUAL')!;
    }
    if (act.includes('STEAM')) {
      return FACTOR_LIBRARY.find((f) => f.factorId === 'EF-S2-PURCHASED-STEAM')!;
    }
    if (act.includes('COOLING') || act.includes('CHILLED')) {
      return FACTOR_LIBRARY.find((f) => f.factorId === 'EF-S2-PURCHASED-COOLING')!;
    }
    // Location based grid
    return FACTOR_LIBRARY.find((f) => f.factorId === 'EF-S2-INDIA-GRID-AVG')!;
  }

  // SCOPE 3 RESOLUTION
  const catNo = input.scope3CategoryNo || 1;
  const catMatches = FACTOR_LIBRARY.filter((f) => f.scopeNo === 3 && f.scope3CategoryNo === catNo);

  if (catMatches.length > 0) {
    if (catNo === 1) {
      if (act.includes('CEMENT') && (act.includes('PPC') || act.includes('BLENDED'))) {
        return catMatches.find((f) => f.factorId === 'EF-S3-CAT1-CEMENT-PPC') || catMatches[0];
      }
      if (act.includes('CEMENT') || act.includes('OPC')) {
        return catMatches.find((f) => f.factorId === 'EF-S3-CAT1-CEMENT-OPC') || catMatches[0];
      }
      if (act.includes('STEEL') || act.includes('REBAR')) {
        return catMatches.find((f) => f.factorId === 'EF-S3-CAT1-STEEL-REBAR') || catMatches[0];
      }
      if (act.includes('SAND') || act.includes('AGGREGATE')) {
        return catMatches.find((f) => f.factorId === 'EF-S3-CAT1-AGGREGATE-SAND') || catMatches[0];
      }
      if (unit === 'INR') {
        return catMatches.find((f) => f.factorId === 'EF-S3-CAT1-SPEND-CONSTRUCTION') || catMatches[0];
      }
    }
    if (catNo === 4) {
      if (act.includes('RAIL')) return catMatches.find((f) => f.factorId === 'EF-S3-CAT4-RAIL-FREIGHT') || catMatches[0];
      return catMatches.find((f) => f.factorId === 'EF-S3-CAT4-ROAD-FREIGHT-HCV') || catMatches[0];
    }
    if (catNo === 6) {
      if (act.includes('HOTEL') || unit === 'ROOM_NIGHT') return catMatches.find((f) => f.factorId === 'EF-S3-CAT6-HOTEL-INDIA') || catMatches[0];
      if (act.includes('INTL')) return catMatches.find((f) => f.factorId === 'EF-S3-CAT6-AIR-INTL-ECON') || catMatches[0];
      return catMatches.find((f) => f.factorId === 'EF-S3-CAT6-AIR-DOMESTIC-ECON') || catMatches[0];
    }
    return catMatches[0];
  }

  // Fallback
  return FACTOR_LIBRARY.find((f) => f.factorId === 'EF-S3-CAT1-STEEL-REBAR')!;
}

/**
 * Deterministically compute GHG emissions with full traceability, gas split, and GWP application
 */
export function calculateDeterministicEmissions(input: CalculationInput): CalculationResult {
  const factorEntry = resolveEmissionFactor(input);
  const factorApplied = input.customFactor !== undefined ? input.customFactor : factorEntry.co2ePerUnit;
  const factorSource = input.customFactorSource || factorEntry.factorSource;
  const gwpVersion = factorEntry.gwpVersion || 'IPCC AR5';
  const methodology = factorEntry.methodology;
  const accountingType = input.accountingMethod || factorEntry.accountingType || 'AVERAGE_DATA';

  const rawQty = Number(input.quantity) || 0;
  const rawSpend = Number(input.spendAmount) || 0;
  const unit = standardizeUnit(input.unitId || factorEntry.unit);

  let standardizedQty = rawQty;
  let standardizedUnit = unit;

  // Convert unit if required by factor
  if (factorEntry.unit === 'KWH' && unit === 'MWH') {
    standardizedQty = rawQty * 1000;
    standardizedUnit = 'KWH';
  } else if (factorEntry.unit === 'MT' && unit === 'KG') {
    standardizedQty = rawQty / 1000;
    standardizedUnit = 'MT';
  } else if (factorEntry.unit === 'KG' && unit === 'MT') {
    standardizedQty = rawQty * 1000;
    standardizedUnit = 'KG';
  } else if (factorEntry.unit === 'INR' && rawQty === 0 && rawSpend > 0) {
    standardizedQty = rawSpend;
    standardizedUnit = 'INR';
  }

  // Renewable zero-emission check
  const isRenewableZero =
    (input.scopeNo === 2 && (input.renewableFlag || input.renewablePercentage === 100)) ||
    factorApplied === 0;

  // Carbon capture negative sign check
  const isCarbonCapture = factorEntry.category === 'Carbon Capture' || !!input.isCarbonCapture;

  let grossKgCO2e: number;
  let netKgCO2e: number;

  if (isRenewableZero) {
    grossKgCO2e = 0;
    netKgCO2e = 0;
  } else {
    grossKgCO2e = standardizedQty * factorApplied;
    if (isCarbonCapture) {
      grossKgCO2e = -Math.abs(grossKgCO2e); // Ensure negative deduction
    }
    netKgCO2e = grossKgCO2e;
  }

  // Gas Breakdown calculation
  const defaultSplit = factorEntry.gasSplit || {
    co2Kg: grossKgCO2e * 0.99,
    ch4Kg: grossKgCO2e * 0.0001,
    n2oKg: grossKgCO2e * 0.0001,
  };

  const gasBreakdown: GasBreakdown = {
    co2Kg: Math.round((defaultSplit.co2Kg ? (grossKgCO2e * defaultSplit.co2Kg) / (factorApplied || 1) : grossKgCO2e) * 100) / 100,
    ch4Kg: Math.round((defaultSplit.ch4Kg ? (standardizedQty * defaultSplit.ch4Kg) : 0) * 1000) / 1000,
    n2oKg: Math.round((defaultSplit.n2oKg ? (standardizedQty * defaultSplit.n2oKg) : 0) * 1000) / 1000,
    sf6Kg: Math.round((defaultSplit.sf6Kg ? (standardizedQty * defaultSplit.sf6Kg) : 0) * 1000) / 1000,
    hfcsKg: Math.round((defaultSplit.hfcsKg ? (standardizedQty * defaultSplit.hfcsKg) : 0) * 1000) / 1000,
    totalKgCO2e: Math.round(grossKgCO2e * 100) / 100,
  };

  const tCO2e = Math.round((netKgCO2e / 1000) * 1000) / 1000;
  const roundedGrossKg = Math.round(grossKgCO2e * 100) / 100;

  const formula = `${standardizedQty} ${standardizedUnit} × ${factorApplied} kg CO2e/${factorEntry.unit} = ${roundedGrossKg} kg CO2e (${tCO2e} tCO2e)`;

  return {
    calculationId: `CALC-RUN-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    scopeNo: input.scopeNo,
    scope3CategoryNo: input.scope3CategoryNo,
    inputQuantity: rawQty,
    inputUnit: input.unitId || factorEntry.unit,
    spendAmount: rawSpend,
    standardizedQuantity: standardizedQty,
    standardizedUnit,
    factorApplied,
    factorUnit: `kg CO2e/${factorEntry.unit}`,
    factorSource,
    gwpVersion,
    methodology,
    accountingType,
    grossKgCO2e: roundedGrossKg,
    netKgCO2e: Math.round(netKgCO2e * 100) / 100,
    tCO2e,
    gasBreakdown,
    isCarbonCapture,
    isRenewableZero,
    formula,
    calculatedAt: Date.now(),
  };
}
