/**
 * Dynamic Scope-Based Activity Catalogue
 * Definitive catalogue for Scope 1, Scope 2, and all 15 Scope 3 categories
 * Compliant with GHG Protocol Corporate Standard & Scope 3 Standard
 */

export interface ActivityOption {
  activityTypeId: string;
  label: string;
  scopeNo: 1 | 2 | 3;
  scopeGroup: string; // e.g. "Stationary Combustion", "Mobile Combustion", "Process Emissions", "Fugitive Emissions", "Carbon Capture", or Scope 3 Category name
  scope3CategoryNo?: number;
  defaultUnit: string;
  supportedUnits: string[];
  description: string;
  fieldSet:
    | 'stationaryCombustion'
    | 'mobileCombustion'
    | 'processEmissions'
    | 'fugitiveEmissions'
    | 'carbonCapture'
    | 'purchasedElectricity'
    | 'purchasedThermal'
    | 'scope3Materials'
    | 'scope3Capital'
    | 'scope3Energy'
    | 'scope3Freight'
    | 'scope3Waste'
    | 'scope3Travel'
    | 'scope3Commute'
    | 'scope3Leased'
    | 'scope3Downstream'
    | 'scope3SoldUse'
    | 'scope3EndOfLife'
    | 'scope3Franchise'
    | 'scope3Investments';
  defaultDataMethod?: string;
  defaultFuelOrSubstance?: string;
  defaultCombustionType?: string;
}

export interface Scope3CategoryDefinition {
  categoryNo: number;
  title: string;
  name: string;
  boundary: 'UPSTREAM' | 'DOWNSTREAM';
  summary: string;
}

export const SCOPE_3_CATEGORIES: Scope3CategoryDefinition[] = [
  { categoryNo: 1, title: 'Category 1', name: 'Purchased Goods and Services', boundary: 'UPSTREAM', summary: 'Raw materials, manufacturing supplies, and purchased professional services' },
  { categoryNo: 2, title: 'Category 2', name: 'Capital Goods', boundary: 'UPSTREAM', summary: 'Machinery, transformers, fleet assets, and IT infrastructure' },
  { categoryNo: 3, title: 'Category 3', name: 'Fuel- & Energy-Related Activities (Not in Scope 1/2)', boundary: 'UPSTREAM', summary: 'Well-to-tank fuel extraction, refining, and grid T&D transmission losses' },
  { categoryNo: 4, title: 'Category 4', name: 'Upstream Transportation and Distribution', boundary: 'UPSTREAM', summary: 'Tier 1 inbound logistics by road, rail, ocean, and air freight' },
  { categoryNo: 5, title: 'Category 5', name: 'Waste Generated in Operations', boundary: 'UPSTREAM', summary: 'Hazardous debris, MSW landfill, effluent treatment, and recycling' },
  { categoryNo: 6, title: 'Category 6', name: 'Business Travel', boundary: 'UPSTREAM', summary: 'Commercial domestic/international flights, train travel, hotel stays, and cabs' },
  { categoryNo: 7, title: 'Category 7', name: 'Employee Commuting', boundary: 'UPSTREAM', summary: 'Rapid transit metro, staff bus shuttles, personal 2-wheelers, and cars' },
  { categoryNo: 8, title: 'Category 8', name: 'Upstream Leased Assets', boundary: 'UPSTREAM', summary: 'Leased corporate office floors, temporary silent generators, and crawler cranes' },
  { categoryNo: 9, title: 'Category 9', name: 'Downstream Transportation and Distribution', boundary: 'DOWNSTREAM', summary: 'Outbound customer delivery trucking, freight distribution, and final-mile vans' },
  { categoryNo: 10, title: 'Category 10', name: 'Processing of Sold Products', boundary: 'DOWNSTREAM', summary: 'Downstream structural fabrication, secondary welding, and coating' },
  { categoryNo: 11, title: 'Category 11', name: 'Use of Sold Products', boundary: 'DOWNSTREAM', summary: 'Expected lifetime fuel or electricity consumption of sold equipment' },
  { categoryNo: 12, title: 'Category 12', name: 'End-of-Life Treatment of Sold Products', boundary: 'DOWNSTREAM', summary: 'Demolition waste landfilling and rebar recovery at end of operational life' },
  { categoryNo: 13, title: 'Category 13', name: 'Downstream Leased Assets', boundary: 'DOWNSTREAM', summary: 'Warehouses and retail properties owned by the entity and leased to tenants' },
  { categoryNo: 14, title: 'Category 14', name: 'Franchises', boundary: 'DOWNSTREAM', summary: 'Electricity, thermal energy, and gas consumed by operated franchise stores' },
  { categoryNo: 15, title: 'Category 15', name: 'Investments', boundary: 'DOWNSTREAM', summary: 'GHG footprint financed through infrastructure project loans and equity ownership' },
];

export const ACTIVITY_CATALOGUE: ActivityOption[] = [
  // ==========================================
  // SCOPE 1: STATIONARY COMBUSTION
  // ==========================================
  {
    activityTypeId: 'ACT-DIESEL-GEN',
    label: 'Diesel Combustion (Backup DG Sets & Industrial Boilers)',
    scopeNo: 1,
    scopeGroup: 'Stationary Combustion',
    defaultUnit: 'LITER',
    supportedUnits: ['LITER', 'MT', 'KL'],
    description: 'High-speed diesel consumed in stationary generators, boilers, and heaters.',
    fieldSet: 'stationaryCombustion',
    defaultFuelOrSubstance: 'DIESEL',
    defaultCombustionType: 'INTERNAL_COMBUSTION',
    defaultDataMethod: 'FUEL_DISPENSING_LOG',
  },
  {
    activityTypeId: 'ACT-NATGAS-BOILER',
    label: 'Natural Gas Combustion (Piped PNG / Industrial Burners)',
    scopeNo: 1,
    scopeGroup: 'Stationary Combustion',
    defaultUnit: 'SCM',
    supportedUnits: ['SCM', 'MMBTU', 'MT'],
    description: 'Piped natural gas combusted in process boilers, asphalt dryers, and heating plants.',
    fieldSet: 'stationaryCombustion',
    defaultFuelOrSubstance: 'NATURAL_GAS',
    defaultCombustionType: 'BOILER_FURNACE',
    defaultDataMethod: 'UTILITY_METER',
  },
  {
    activityTypeId: 'ACT-LPG-CANTEEN',
    label: 'LPG Combustion (Commercial Cylinders / Canteens / Torches)',
    scopeNo: 1,
    scopeGroup: 'Stationary Combustion',
    defaultUnit: 'MT',
    supportedUnits: ['MT', 'KG', 'CYLINDER'],
    description: 'Liquefied petroleum gas in commercial 19kg/47.5kg cylinders and heating torches.',
    fieldSet: 'stationaryCombustion',
    defaultFuelOrSubstance: 'LPG',
    defaultCombustionType: 'DIRECT_HEATER',
    defaultDataMethod: 'INVOICE_QUANTITY',
  },
  {
    activityTypeId: 'ACT-COAL-BOILER',
    label: 'Coal Combustion (Non-Coking G-11 Industrial Boilers)',
    scopeNo: 1,
    scopeGroup: 'Stationary Combustion',
    defaultUnit: 'MT',
    supportedUnits: ['MT', 'KG'],
    description: 'Thermal coal combusted in high-pressure steam boilers and captive kilns.',
    fieldSet: 'stationaryCombustion',
    defaultFuelOrSubstance: 'COAL',
    defaultCombustionType: 'BOILER_FURNACE',
    defaultDataMethod: 'WEIGHBRIDGE_RECEIPT',
  },
  {
    activityTypeId: 'ACT-HFO-BOILER',
    label: 'Furnace Oil / Heavy Fuel Oil (HFO) Combustion',
    scopeNo: 1,
    scopeGroup: 'Stationary Combustion',
    defaultUnit: 'LITER',
    supportedUnits: ['LITER', 'MT', 'KL'],
    description: 'High-viscosity residual furnace oil for heavy asphalt drying and industrial furnaces.',
    fieldSet: 'stationaryCombustion',
    defaultFuelOrSubstance: 'FURNACE_OIL',
    defaultCombustionType: 'BOILER_FURNACE',
    defaultDataMethod: 'FLOW_METER',
  },
  {
    activityTypeId: 'ACT-LDO-FURNACE',
    label: 'Light Diesel Oil (LDO) Industrial Combustion',
    scopeNo: 1,
    scopeGroup: 'Stationary Combustion',
    defaultUnit: 'LITER',
    supportedUnits: ['LITER', 'MT'],
    description: 'Distillate fuel oil for pre-heating ladles, furnaces, and rotary dryers.',
    fieldSet: 'stationaryCombustion',
    defaultFuelOrSubstance: 'LDO',
    defaultCombustionType: 'DIRECT_HEATER',
    defaultDataMethod: 'TANK_DIP_MEASUREMENT',
  },
  {
    activityTypeId: 'ACT-BIOMASS-BOILER',
    label: 'Agro Biomass Pellets & Briquettes Co-firing',
    scopeNo: 1,
    scopeGroup: 'Stationary Combustion',
    defaultUnit: 'MT',
    supportedUnits: ['MT', 'KG'],
    description: 'Rice husk and agricultural residue briquettes (fossil CH4/N2O accounted; biogenic CO2 reported).',
    fieldSet: 'stationaryCombustion',
    defaultFuelOrSubstance: 'BIOMASS',
    defaultCombustionType: 'BOILER_FURNACE',
    defaultDataMethod: 'WEIGHBRIDGE_RECEIPT',
  },

  // ==========================================
  // SCOPE 1: MOBILE COMBUSTION
  // ==========================================
  {
    activityTypeId: 'ACT-DIESEL-FLEET',
    label: 'Company Fleet Diesel Vehicle Consumption',
    scopeNo: 1,
    scopeGroup: 'Mobile Combustion',
    defaultUnit: 'LITER',
    supportedUnits: ['LITER', 'KM'],
    description: 'Fuel volume dispensed into owned tippers, transit mixers, pickups, and diesel utility vehicles.',
    fieldSet: 'mobileCombustion',
    defaultFuelOrSubstance: 'DIESEL',
    defaultCombustionType: 'MOBILE_VEHICLE',
    defaultDataMethod: 'FLEET_FUEL_CARD',
  },
  {
    activityTypeId: 'ACT-PETROL-VEHICLE',
    label: 'Company Fleet Petrol/Gasoline Vehicle Consumption',
    scopeNo: 1,
    scopeGroup: 'Mobile Combustion',
    defaultUnit: 'LITER',
    supportedUnits: ['LITER', 'KM'],
    description: 'Petrol fuel consumption for company-owned executive sedans and light site inspection vehicles.',
    fieldSet: 'mobileCombustion',
    defaultFuelOrSubstance: 'PETROL',
    defaultCombustionType: 'MOBILE_VEHICLE',
    defaultDataMethod: 'FLEET_FUEL_CARD',
  },
  {
    activityTypeId: 'ACT-OFFROAD-EXCAVATOR',
    label: 'Off-road Earthmoving Machinery (Excavator / Dozer Hours)',
    scopeNo: 1,
    scopeGroup: 'Mobile Combustion',
    defaultUnit: 'HOUR',
    supportedUnits: ['HOUR', 'LITER'],
    description: 'Hydraulic excavators, motor graders, bulldozers, and mobile cranes tracked by engine hours.',
    fieldSet: 'mobileCombustion',
    defaultFuelOrSubstance: 'DIESEL',
    defaultCombustionType: 'OFFROAD_EQUIPMENT',
    defaultDataMethod: 'TELEMATICS_HOUR_METER',
  },
  {
    activityTypeId: 'ACT-FLEET-DIESEL-KM',
    label: 'Heavy Fleet Highway Haulage (Distance Method)',
    scopeNo: 1,
    scopeGroup: 'Mobile Combustion',
    defaultUnit: 'KM',
    supportedUnits: ['KM', 'LITER'],
    description: 'Owned multi-axle freight carriers and heavy tippers tracked by odometer log.',
    fieldSet: 'mobileCombustion',
    defaultFuelOrSubstance: 'DIESEL',
    defaultCombustionType: 'MOBILE_VEHICLE',
    defaultDataMethod: 'GPS_LOG',
  },

  // ==========================================
  // SCOPE 1: INDUSTRIAL PROCESS EMISSIONS
  // ==========================================
  {
    activityTypeId: 'ACT-CLINKER-CALCINATION',
    label: 'Cement Clinker Calcination (CaCO3 -> CaO + CO2)',
    scopeNo: 1,
    scopeGroup: 'Process Emissions',
    defaultUnit: 'MT',
    supportedUnits: ['MT'],
    description: 'Chemical carbonate breakdown during limestone decarbonation inside kiln lines.',
    fieldSet: 'processEmissions',
    defaultFuelOrSubstance: 'LIMESTONE',
    defaultDataMethod: 'MASS_BALANCE_CALCULATION',
  },
  {
    activityTypeId: 'ACT-STEEL-BOF',
    label: 'Primary Steelmaking (BF-BOF Carbon Reduction)',
    scopeNo: 1,
    scopeGroup: 'Process Emissions',
    defaultUnit: 'MT',
    supportedUnits: ['MT'],
    description: 'Process reduction emissions from iron ore and metallurgical coke in blast furnaces.',
    fieldSet: 'processEmissions',
    defaultFuelOrSubstance: 'COKE_IRON_ORE',
    defaultDataMethod: 'MASS_BALANCE_CALCULATION',
  },
  {
    activityTypeId: 'ACT-LIME-KILN',
    label: 'Quicklime Decarbonation Process Emissions',
    scopeNo: 1,
    scopeGroup: 'Process Emissions',
    defaultUnit: 'MT',
    supportedUnits: ['MT'],
    description: 'Direct calcination emissions from manufacturing high-calcium lime.',
    fieldSet: 'processEmissions',
    defaultFuelOrSubstance: 'LIMESTONE',
    defaultDataMethod: 'PRODUCTION_LOG',
  },
  {
    activityTypeId: 'ACT-ASPHALT-PLANT',
    label: 'Hot Mix Asphalt Volatiles & Processing',
    scopeNo: 1,
    scopeGroup: 'Process Emissions',
    defaultUnit: 'MT',
    supportedUnits: ['MT'],
    description: 'Process heating, aggregate coating, and bitumen binder mixing in asphalt batch plants.',
    fieldSet: 'processEmissions',
    defaultFuelOrSubstance: 'BITUMEN',
    defaultDataMethod: 'PRODUCTION_LOG',
  },

  // ==========================================
  // SCOPE 1: FUGITIVE EMISSIONS
  // ==========================================
  {
    activityTypeId: 'ACT-REFRIG-R410A',
    label: 'Refrigerant R-410A Leakage (VRF & Commercial AC Top-up)',
    scopeNo: 1,
    scopeGroup: 'Fugitive Emissions',
    defaultUnit: 'KG',
    supportedUnits: ['KG'],
    description: 'Top-up quantity of R-410A refrigerant (GWP 2,088) added during maintenance.',
    fieldSet: 'fugitiveEmissions',
    defaultFuelOrSubstance: 'R-410A',
    defaultDataMethod: 'MAINTENANCE_LOG',
  },
  {
    activityTypeId: 'ACT-REFRIG-HFC134A',
    label: 'Refrigerant HFC-134a Leakage (Centrifugal Chillers)',
    scopeNo: 1,
    scopeGroup: 'Fugitive Emissions',
    defaultUnit: 'KG',
    supportedUnits: ['KG'],
    description: 'Central water-cooled chiller refrigerant replenishment (GWP 1,430).',
    fieldSet: 'fugitiveEmissions',
    defaultFuelOrSubstance: 'HFC-134a',
    defaultDataMethod: 'MAINTENANCE_LOG',
  },
  {
    activityTypeId: 'ACT-REFRIG-R404A',
    label: 'Refrigerant R-404A Leakage (Low-Temp Cold Storage)',
    scopeNo: 1,
    scopeGroup: 'Fugitive Emissions',
    defaultUnit: 'KG',
    supportedUnits: ['KG'],
    description: 'Industrial cold refrigeration loop replenishment (GWP 3,922).',
    fieldSet: 'fugitiveEmissions',
    defaultFuelOrSubstance: 'R-404A',
    defaultDataMethod: 'MAINTENANCE_LOG',
  },
  {
    activityTypeId: 'ACT-REFRIG-R22',
    label: 'Refrigerant R-22 (HCFC-22 Legacy Packaged Units)',
    scopeNo: 1,
    scopeGroup: 'Fugitive Emissions',
    defaultUnit: 'KG',
    supportedUnits: ['KG'],
    description: 'Legacy plant HVAC top-up under Montreal Protocol phase-out inventory (GWP 1,810).',
    fieldSet: 'fugitiveEmissions',
    defaultFuelOrSubstance: 'R-22',
    defaultDataMethod: 'MAINTENANCE_LOG',
  },
  {
    activityTypeId: 'ACT-SF6-SWITCHGEAR',
    label: 'Sulfur Hexafluoride (SF6) Switchgear Leakage',
    scopeNo: 1,
    scopeGroup: 'Fugitive Emissions',
    defaultUnit: 'KG',
    supportedUnits: ['KG'],
    description: 'High-voltage GIS substation circuit breaker gas top-up (GWP 23,500).',
    fieldSet: 'fugitiveEmissions',
    defaultFuelOrSubstance: 'SF6',
    defaultDataMethod: 'PRESSURE_DIFFERENTIAL_LOG',
  },
  {
    activityTypeId: 'ACT-METHANE-FLANGE',
    label: 'Methane (CH4) Pipeline / Valve Fugitive Loss',
    scopeNo: 1,
    scopeGroup: 'Fugitive Emissions',
    defaultUnit: 'KG',
    supportedUnits: ['KG', 'SCM'],
    description: 'Direct fugitive losses detected across natural gas manifolds and piping networks (GWP 28).',
    fieldSet: 'fugitiveEmissions',
    defaultFuelOrSubstance: 'METHANE',
    defaultDataMethod: 'LDAR_MEASUREMENT',
  },
  {
    activityTypeId: 'ACT-FIRESP-FM200',
    label: 'Fire Suppression FM-200 (HFC-227ea) Accidental Release',
    scopeNo: 1,
    scopeGroup: 'Fugitive Emissions',
    defaultUnit: 'KG',
    supportedUnits: ['KG'],
    description: 'Total flooding clean-agent fire extinguisher discharge in server/control rooms (GWP 3,220).',
    fieldSet: 'fugitiveEmissions',
    defaultFuelOrSubstance: 'FM-200',
    defaultDataMethod: 'INCIDENT_DISCHARGE_REPORT',
  },

  // ==========================================
  // SCOPE 1: CARBON CAPTURE & STORAGE
  // ==========================================
  {
    activityTypeId: 'ACT-CARBON-CAPTURE',
    label: 'Direct Carbon Capture & Permanent Geological Sequestration',
    scopeNo: 1,
    scopeGroup: 'Carbon Capture',
    defaultUnit: 'MT',
    supportedUnits: ['MT'],
    description: 'Verified permanent flue gas CO2 capture and deep formation sequestration (negative tCO2e credit).',
    fieldSet: 'carbonCapture',
    defaultFuelOrSubstance: 'CO2',
    defaultDataMethod: 'METERED_INJECTION_LOG',
  },

  // ==========================================
  // SCOPE 2: PURCHASED ELECTRICITY & ENERGY
  // ==========================================
  {
    activityTypeId: 'ACT-GRID-ELEC',
    label: 'Purchased Grid Electricity (India National Grid Average)',
    scopeNo: 2,
    scopeGroup: 'Purchased Electricity',
    defaultUnit: 'KWH',
    supportedUnits: ['KWH', 'MWH'],
    description: 'Electricity drawn from the public transmission grid (CEA Baseline Combined Margin 0.716 kg/kWh).',
    fieldSet: 'purchasedElectricity',
    defaultDataMethod: 'UTILITY_METER',
  },
  {
    activityTypeId: 'ACT-GRID-REGIONAL',
    label: 'Purchased Regional Grid Electricity (State Discom Tariff)',
    scopeNo: 2,
    scopeGroup: 'Purchased Electricity',
    defaultUnit: 'KWH',
    supportedUnits: ['KWH', 'MWH'],
    description: 'State electrical distribution company power supply under standard high-tension tariff.',
    fieldSet: 'purchasedElectricity',
    defaultDataMethod: 'DISCOM_BILL',
  },
  {
    activityTypeId: 'ACT-GRID-MARKET',
    label: 'Purchased Electricity (Market-Based Residual Mix)',
    scopeNo: 2,
    scopeGroup: 'Purchased Electricity',
    defaultUnit: 'KWH',
    supportedUnits: ['KWH', 'MWH'],
    description: 'Market-based accounting reflecting contractual residual mix without green attributes.',
    fieldSet: 'purchasedElectricity',
    defaultDataMethod: 'POWER_EXCHANGE_CONTRACT',
  },
  {
    activityTypeId: 'ACT-RENEW-SOLAR-PPA',
    label: 'Purchased Renewable Solar Electricity (PPA / Wheeling)',
    scopeNo: 2,
    scopeGroup: 'Renewable Electricity',
    defaultUnit: 'KWH',
    supportedUnits: ['KWH', 'MWH'],
    description: 'Zero-emission solar open-access power purchase agreement with contractual attribute retention.',
    fieldSet: 'purchasedElectricity',
    defaultDataMethod: 'PPA_INVOICE_IREC',
  },
  {
    activityTypeId: 'ACT-RENEW-WIND-PPA',
    label: 'Purchased Renewable Wind Energy (Off-site PPA)',
    scopeNo: 2,
    scopeGroup: 'Renewable Electricity',
    defaultUnit: 'KWH',
    supportedUnits: ['KWH', 'MWH'],
    description: 'Dedicated wind power wheeling contract with registered renewable energy certificates.',
    fieldSet: 'purchasedElectricity',
    defaultDataMethod: 'PPA_INVOICE_IREC',
  },
  {
    activityTypeId: 'ACT-RENEW-GREEN-TARIFF',
    label: 'Green Energy Open Access / Utility Green Tariff',
    scopeNo: 2,
    scopeGroup: 'Renewable Electricity',
    defaultUnit: 'KWH',
    supportedUnits: ['KWH', 'MWH'],
    description: 'Certified DISCOM green power supply under statutory green tariff guidelines.',
    fieldSet: 'purchasedElectricity',
    defaultDataMethod: 'GREEN_TARIFF_SURCHARGE_BILL',
  },
  {
    activityTypeId: 'ACT-PURCH-STEAM',
    label: 'Purchased Industrial Steam (High Pressure)',
    scopeNo: 2,
    scopeGroup: 'Purchased Thermal Energy',
    defaultUnit: 'MT',
    supportedUnits: ['MT', 'GJ'],
    description: 'Steam imported from adjacent industrial co-generation or utility plants.',
    fieldSet: 'purchasedThermal',
    defaultDataMethod: 'FLOW_TOTALIZER_METER',
  },
  {
    activityTypeId: 'ACT-PURCH-HEAT',
    label: 'Purchased Hot Water / District Heating',
    scopeNo: 2,
    scopeGroup: 'Purchased Thermal Energy',
    defaultUnit: 'KWH',
    supportedUnits: ['KWH', 'GJ', 'MMBTU'],
    description: 'Thermal energy imported for process heating or site sanitary requirements.',
    fieldSet: 'purchasedThermal',
    defaultDataMethod: 'BTU_METER',
  },
  {
    activityTypeId: 'ACT-PURCH-COOLING',
    label: 'Purchased Chilled Water / District Cooling',
    scopeNo: 2,
    scopeGroup: 'Purchased Thermal Energy',
    defaultUnit: 'TON_HOUR',
    supportedUnits: ['TON_HOUR', 'KWH', 'GJ'],
    description: 'Chilled water supplied from central district cooling networks for campus HVAC.',
    fieldSet: 'purchasedThermal',
    defaultDataMethod: 'BTU_METER',
  },

  // ==========================================
  // SCOPE 3: CATEGORY 1 - PURCHASED GOODS & SERVICES
  // ==========================================
  {
    activityTypeId: 'ACT-STEEL-PURCH',
    label: 'Primary Structural Steel (Rebar / Beams / TMT)',
    scopeNo: 3,
    scopeGroup: 'Category 1: Purchased Goods and Services',
    scope3CategoryNo: 1,
    defaultUnit: 'MT',
    supportedUnits: ['MT', 'INR'],
    description: 'Embodied carbon in manufactured structural rebar, wire rod, and rolled sections.',
    fieldSet: 'scope3Materials',
    defaultDataMethod: 'PURCHASE_ORDER_RECEIPT',
  },
  {
    activityTypeId: 'ACT-CEMENT-PURCH',
    label: 'Ordinary Portland Cement (OPC 53 Grade)',
    scopeNo: 3,
    scopeGroup: 'Category 1: Purchased Goods and Services',
    scope3CategoryNo: 1,
    defaultUnit: 'MT',
    supportedUnits: ['MT', 'INR'],
    description: 'Bulk OPC cement procurement for major civil foundation concrete.',
    fieldSet: 'scope3Materials',
    defaultDataMethod: 'WEIGHBRIDGE_RECEIPT',
  },
  {
    activityTypeId: 'ACT-CEMENT-PPC',
    label: 'Portland Pozzolana Blended Cement (PPC)',
    scopeNo: 3,
    scopeGroup: 'Category 1: Purchased Goods and Services',
    scope3CategoryNo: 1,
    defaultUnit: 'MT',
    supportedUnits: ['MT', 'INR'],
    description: 'Low-carbon blended cement containing fly ash/calcined pozzolana.',
    fieldSet: 'scope3Materials',
    defaultDataMethod: 'WEIGHBRIDGE_RECEIPT',
  },
  {
    activityTypeId: 'ACT-BITUMEN-PURCH',
    label: 'Road Bitumen VG-30 / VG-40 Binder',
    scopeNo: 3,
    scopeGroup: 'Category 1: Purchased Goods and Services',
    scope3CategoryNo: 1,
    defaultUnit: 'MT',
    supportedUnits: ['MT', 'INR'],
    description: 'Refinery bitumen procurement for highway asphalt paving surfaces.',
    fieldSet: 'scope3Materials',
    defaultDataMethod: 'INVOICE_QUANTITY',
  },
  {
    activityTypeId: 'ACT-AGGREGATE-PURCH',
    label: 'Crushed Stone Aggregates / Natural River Sand',
    scopeNo: 3,
    scopeGroup: 'Category 1: Purchased Goods and Services',
    scope3CategoryNo: 1,
    defaultUnit: 'MT',
    supportedUnits: ['MT'],
    description: 'Granular crushed stone sub-base and manufactured sand quarrying.',
    fieldSet: 'scope3Materials',
    defaultDataMethod: 'WEIGHBRIDGE_RECEIPT',
  },
  {
    activityTypeId: 'ACT-ALUM-PURCH',
    label: 'Primary Aluminum Extrusions & Ingots',
    scopeNo: 3,
    scopeGroup: 'Category 1: Purchased Goods and Services',
    scope3CategoryNo: 1,
    defaultUnit: 'MT',
    supportedUnits: ['MT', 'INR'],
    description: 'Smelted aluminum facade panels, conductor rails, and structural extrusions.',
    fieldSet: 'scope3Materials',
    defaultDataMethod: 'PURCHASE_INVOICE',
  },
  {
    activityTypeId: 'ACT-POLY-PURCH',
    label: 'HDPE / PVC Polymers & Pipe Resins',
    scopeNo: 3,
    scopeGroup: 'Category 1: Purchased Goods and Services',
    scope3CategoryNo: 1,
    defaultUnit: 'MT',
    supportedUnits: ['MT', 'INR'],
    description: 'Engineered thermoplastics for underground utilities and drainage.',
    fieldSet: 'scope3Materials',
    defaultDataMethod: 'PURCHASE_INVOICE',
  },
  {
    activityTypeId: 'ACT-PURCH-GOODS-SPEND',
    label: 'General Material Spend / Services Procurement (EEIO Method)',
    scopeNo: 3,
    scopeGroup: 'Category 1: Purchased Goods and Services',
    scope3CategoryNo: 1,
    defaultUnit: 'INR',
    supportedUnits: ['INR'],
    description: 'Environmentally-extended input-output modeling for general civil supplies spend.',
    fieldSet: 'scope3Materials',
    defaultDataMethod: 'ERP_SPEND_RECORD',
  },

  // ==========================================
  // SCOPE 3: CATEGORY 2 - CAPITAL GOODS
  // ==========================================
  {
    activityTypeId: 'ACT-CAP-EXCAVATOR',
    label: 'Heavy Hydraulic Excavator / Earthmover Acquisition',
    scopeNo: 3,
    scopeGroup: 'Category 2: Capital Goods',
    scope3CategoryNo: 2,
    defaultUnit: 'UNIT',
    supportedUnits: ['UNIT', 'INR'],
    description: 'Embodied carbon in manufactured 20-35T class hydraulic crawler excavators.',
    fieldSet: 'scope3Capital',
    defaultDataMethod: 'ASSET_REGISTER',
  },
  {
    activityTypeId: 'ACT-CAP-TRANSFORMER',
    label: 'Plant Power Transformers & Substation Switchgear',
    scopeNo: 3,
    scopeGroup: 'Category 2: Capital Goods',
    scope3CategoryNo: 2,
    defaultUnit: 'UNIT',
    supportedUnits: ['UNIT', 'INR'],
    description: 'Heavy capital step-up power transformers and transmission substation bays.',
    fieldSet: 'scope3Capital',
    defaultDataMethod: 'ASSET_REGISTER',
  },
  {
    activityTypeId: 'ACT-CAP-HARDWARE',
    label: 'Data Center Servers & Enterprise IT Hardware',
    scopeNo: 3,
    scopeGroup: 'Category 2: Capital Goods',
    scope3CategoryNo: 2,
    defaultUnit: 'UNIT',
    supportedUnits: ['UNIT', 'INR'],
    description: 'Embodied lifecycle impact of enterprise compute, storage, and networking units.',
    fieldSet: 'scope3Capital',
    defaultDataMethod: 'ASSET_REGISTER',
  },
  {
    activityTypeId: 'ACT-CAPITAL-GOODS-SPEND',
    label: 'Capital Equipment Spend (EEIO Method)',
    scopeNo: 3,
    scopeGroup: 'Category 2: Capital Goods',
    scope3CategoryNo: 2,
    defaultUnit: 'INR',
    supportedUnits: ['INR'],
    description: 'Economic input-output calculation for heavy industrial machinery additions.',
    fieldSet: 'scope3Capital',
    defaultDataMethod: 'ERP_CAPEX_LEDGER',
  },

  // ==========================================
  // SCOPE 3: CATEGORY 3 - FUEL & ENERGY RELATED
  // ==========================================
  {
    activityTypeId: 'ACT-WTT-DIESEL',
    label: 'Upstream Well-to-Tank (WTT) Diesel Fuel Extraction',
    scopeNo: 3,
    scopeGroup: 'Category 3: Fuel- & Energy-Related Activities',
    scope3CategoryNo: 3,
    defaultUnit: 'LITER',
    supportedUnits: ['LITER'],
    description: 'Upstream emissions from crude exploration, offshore extraction, and refinery processing.',
    fieldSet: 'scope3Energy',
    defaultDataMethod: 'FUEL_PURCHASE_LOG',
  },
  {
    activityTypeId: 'ACT-WTT-GAS',
    label: 'Upstream WTT Natural Gas Extraction & Liquefaction',
    scopeNo: 3,
    scopeGroup: 'Category 3: Fuel- & Energy-Related Activities',
    scope3CategoryNo: 3,
    defaultUnit: 'SCM',
    supportedUnits: ['SCM'],
    description: 'Pre-combustion upstream emissions from gas field extraction, purification, and boosting.',
    fieldSet: 'scope3Energy',
    defaultDataMethod: 'UTILITY_BILL',
  },
  {
    activityTypeId: 'ACT-TD-LOSSES',
    label: 'Grid Electricity Transmission & Distribution (T&D) Losses',
    scopeNo: 3,
    scopeGroup: 'Category 3: Fuel- & Energy-Related Activities',
    scope3CategoryNo: 3,
    defaultUnit: 'KWH',
    supportedUnits: ['KWH'],
    description: 'Emissions associated with transmission line dissipation and step-down substation losses.',
    fieldSet: 'scope3Energy',
    defaultDataMethod: 'DISCOM_CONSUMPTION_LOG',
  },

  // ==========================================
  // SCOPE 3: CATEGORY 4 - UPSTREAM TRANSPORTATION
  // ==========================================
  {
    activityTypeId: 'ACT-FREIGHT-ROAD',
    label: 'Inbound Heavy Diesel Trucking Freight (tonne-km)',
    scopeNo: 3,
    scopeGroup: 'Category 4: Upstream Transportation and Distribution',
    scope3CategoryNo: 4,
    defaultUnit: 't-km',
    supportedUnits: ['t-km', 'KM', 'MT'],
    description: 'Multi-axle articulated heavy commercial vehicles transporting raw materials to sites.',
    fieldSet: 'scope3Freight',
    defaultDataMethod: 'TRANSPORTER_CONSIGNMENT_NOTE',
  },
  {
    activityTypeId: 'ACT-FREIGHT-RAIL',
    label: 'Electric & Diesel Freight Rail Haulage (tonne-km)',
    scopeNo: 3,
    scopeGroup: 'Category 4: Upstream Transportation and Distribution',
    scope3CategoryNo: 4,
    defaultUnit: 't-km',
    supportedUnits: ['t-km', 'MT'],
    description: 'Dedicated freight corridor rail rakes hauling bulk coal, clinker, and steel.',
    fieldSet: 'scope3Freight',
    defaultDataMethod: 'RAILWAY_RECEIPT',
  },
  {
    activityTypeId: 'ACT-FREIGHT-SEA',
    label: 'Ocean Container Cargo Shipping (tonne-km)',
    scopeNo: 3,
    scopeGroup: 'Category 4: Upstream Transportation and Distribution',
    scope3CategoryNo: 4,
    defaultUnit: 't-km',
    supportedUnits: ['t-km', 'TEU'],
    description: 'International container shipping and bulk dry cargo marine transport.',
    fieldSet: 'scope3Freight',
    defaultDataMethod: 'BILL_OF_LADING',
  },
  {
    activityTypeId: 'ACT-FREIGHT-AIR',
    label: 'Long-Haul Commercial Air Freight (tonne-km)',
    scopeNo: 3,
    scopeGroup: 'Category 4: Upstream Transportation and Distribution',
    scope3CategoryNo: 4,
    defaultUnit: 't-km',
    supportedUnits: ['t-km', 'KG'],
    description: 'Expedited air cargo delivery of specialized electronic instruments and urgent spares.',
    fieldSet: 'scope3Freight',
    defaultDataMethod: 'AIR_WAYBILL',
  },

  // ==========================================
  // SCOPE 3: CATEGORY 5 - WASTE GENERATED
  // ==========================================
  {
    activityTypeId: 'ACT-WASTE-LANDFILL',
    label: 'Municipal Solid Waste (Landfilled with Gas Flaring)',
    scopeNo: 3,
    scopeGroup: 'Category 5: Waste Generated in Operations',
    scope3CategoryNo: 5,
    defaultUnit: 'MT',
    supportedUnits: ['MT', 'KG'],
    description: 'Organic and mixed non-hazardous refuse transported to municipal landfill facilities.',
    fieldSet: 'scope3Waste',
    defaultDataMethod: 'WASTE_TRANSFER_MANIFEST',
  },
  {
    activityTypeId: 'ACT-WASTE-HAZ',
    label: 'Construction Debris & Fly Ash to Secure Landfill (TSDF)',
    scopeNo: 3,
    scopeGroup: 'Category 5: Waste Generated in Operations',
    scope3CategoryNo: 5,
    defaultUnit: 'MT',
    supportedUnits: ['MT'],
    description: 'Authorized hazardous solid industrial waste disposal at CPCB-registered TSDF facilities.',
    fieldSet: 'scope3Waste',
    defaultDataMethod: 'HAZARDOUS_WASTE_MANIFEST_FORM_10',
  },
  {
    activityTypeId: 'ACT-WASTE-WATER',
    label: 'Industrial Wastewater Effluent Treatment',
    scopeNo: 3,
    scopeGroup: 'Category 5: Waste Generated in Operations',
    scope3CategoryNo: 5,
    defaultUnit: 'KL',
    supportedUnits: ['KL', 'M3'],
    description: 'Off-site treatment of chemical wash-water and biological wastewater effluent.',
    fieldSet: 'scope3Waste',
    defaultDataMethod: 'EFFLUENT_FLOW_TOTALIZER',
  },
  {
    activityTypeId: 'ACT-WASTE-RECYCLE',
    label: 'Diverted Structural Steel & Metal Recycling',
    scopeNo: 3,
    scopeGroup: 'Category 5: Waste Generated in Operations',
    scope3CategoryNo: 5,
    defaultUnit: 'MT',
    supportedUnits: ['MT'],
    description: 'Scrap metal, rebar cut-ends, and copper offcuts diverted to certified electric-arc recyclers.',
    fieldSet: 'scope3Waste',
    defaultDataMethod: 'SCRAP_SALE_DISPATCH_NOTE',
  },

  // ==========================================
  // SCOPE 3: CATEGORY 6 - BUSINESS TRAVEL
  // ==========================================
  {
    activityTypeId: 'ACT-TRAVEL-AIR-DOM',
    label: 'Domestic Economy Scheduled Flights (Passenger-km)',
    scopeNo: 3,
    scopeGroup: 'Category 6: Business Travel',
    scope3CategoryNo: 6,
    defaultUnit: 'p-km',
    supportedUnits: ['p-km'],
    description: 'Domestic commercial flights taken by personnel for technical audits and site reviews.',
    fieldSet: 'scope3Travel',
    defaultDataMethod: 'TRAVEL_AGENCY_PORTAL_REPORT',
  },
  {
    activityTypeId: 'ACT-TRAVEL-AIR-INTL',
    label: 'International Business Class Flights (Passenger-km)',
    scopeNo: 3,
    scopeGroup: 'Category 6: Business Travel',
    scope3CategoryNo: 6,
    defaultUnit: 'p-km',
    supportedUnits: ['p-km'],
    description: 'Long-haul flights with cabin class weighting and radiative forcing indices.',
    fieldSet: 'scope3Travel',
    defaultDataMethod: 'TRAVEL_AGENCY_PORTAL_REPORT',
  },
  {
    activityTypeId: 'ACT-TRAVEL-RAIL',
    label: 'Intercity Express Rail Business Travel (Passenger-km)',
    scopeNo: 3,
    scopeGroup: 'Category 6: Business Travel',
    scope3CategoryNo: 6,
    defaultUnit: 'p-km',
    supportedUnits: ['p-km'],
    description: 'Indian Railways electrified express train routes for project engineers.',
    fieldSet: 'scope3Travel',
    defaultDataMethod: 'EXPENSE_VOUCHER_IRCTC',
  },
  {
    activityTypeId: 'ACT-HOTEL-STAY',
    label: 'Commercial Hotel Business Night Stays (Room Nights)',
    scopeNo: 3,
    scopeGroup: 'Category 6: Business Travel',
    scope3CategoryNo: 6,
    defaultUnit: 'NIGHT',
    supportedUnits: ['NIGHT'],
    description: 'Occupancy hotel nights for staff during off-site commissioning and statutory hearings.',
    fieldSet: 'scope3Travel',
    defaultDataMethod: 'HOTEL_FOLIO_RECEIPT',
  },
  {
    activityTypeId: 'ACT-TRAVEL-TAXI',
    label: 'Corporate Taxi / Urban Cab Travel (km)',
    scopeNo: 3,
    scopeGroup: 'Category 6: Business Travel',
    scope3CategoryNo: 6,
    defaultUnit: 'KM',
    supportedUnits: ['KM'],
    description: 'App-based taxi aggregators and hired local passenger transport.',
    fieldSet: 'scope3Travel',
    defaultDataMethod: 'MOBILITY_INVOICE',
  },

  // ==========================================
  // SCOPE 3: CATEGORY 7 - EMPLOYEE COMMUTING
  // ==========================================
  {
    activityTypeId: 'ACT-COMMUTE-METRO',
    label: 'Urban Rapid Rail / Metro Commute (Passenger-km)',
    scopeNo: 3,
    scopeGroup: 'Category 7: Employee Commuting',
    scope3CategoryNo: 7,
    defaultUnit: 'p-km',
    supportedUnits: ['p-km'],
    description: 'Low-carbon mass rapid metro transit used by regional office staff.',
    fieldSet: 'scope3Commute',
    defaultDataMethod: 'COMMUTER_SURVEY_SAMPLE',
  },
  {
    activityTypeId: 'ACT-COMMUTE-BUS',
    label: 'Corporate Staff Shuttle Bus (Passenger-km)',
    scopeNo: 3,
    scopeGroup: 'Category 7: Employee Commuting',
    scope3CategoryNo: 7,
    defaultUnit: 'p-km',
    supportedUnits: ['p-km', 'KM'],
    description: 'Dedicated shift worker shuttle buses operating between residential hubs and remote project gates.',
    fieldSet: 'scope3Commute',
    defaultDataMethod: 'BUS_LOG_SHEET',
  },
  {
    activityTypeId: 'ACT-COMMUTE-2W',
    label: 'Personal Two-Wheeler Commute (Motorcycle / Scooter km)',
    scopeNo: 3,
    scopeGroup: 'Category 7: Employee Commuting',
    scope3CategoryNo: 7,
    defaultUnit: 'KM',
    supportedUnits: ['KM'],
    description: 'Staff daily commuting on personal four-stroke petrol motorcycles and scooters.',
    fieldSet: 'scope3Commute',
    defaultDataMethod: 'COMMUTER_SURVEY_SAMPLE',
  },
  {
    activityTypeId: 'ACT-COMMUTE-CAR',
    label: 'Personal Petrol Car Single-Occupancy Commute (km)',
    scopeNo: 3,
    scopeGroup: 'Category 7: Employee Commuting',
    scope3CategoryNo: 7,
    defaultUnit: 'KM',
    supportedUnits: ['KM'],
    description: 'Daily passenger vehicle travel for employees commuting without carpool.',
    fieldSet: 'scope3Commute',
    defaultDataMethod: 'COMMUTER_SURVEY_SAMPLE',
  },

  // ==========================================
  // SCOPE 3: CATEGORY 8 - UPSTREAM LEASED ASSETS
  // ==========================================
  {
    activityTypeId: 'ACT-LEASE-OFFICE',
    label: 'Leased Commercial Corporate Office Space (m²-month)',
    scopeNo: 3,
    scopeGroup: 'Category 8: Upstream Leased Assets',
    scope3CategoryNo: 8,
    defaultUnit: 'SQM_MONTH',
    supportedUnits: ['SQM_MONTH', 'SQFT_MONTH'],
    description: 'Energy and HVAC footprint in leased multi-tenant commercial office towers.',
    fieldSet: 'scope3Leased',
    defaultDataMethod: 'LEASE_AGREEMENT_BENCHMARK',
  },
  {
    activityTypeId: 'ACT-LEASE-GENSET',
    label: 'Leased Silent Diesel Generator Operation (Engine Hours)',
    scopeNo: 3,
    scopeGroup: 'Category 8: Upstream Leased Assets',
    scope3CategoryNo: 8,
    defaultUnit: 'HOUR',
    supportedUnits: ['HOUR', 'LITER'],
    description: 'Rental generator units hired for seasonal project surges.',
    fieldSet: 'scope3Leased',
    defaultDataMethod: 'RENTAL_LOG_SHEET',
  },
  {
    activityTypeId: 'ACT-LEASE-CRANE',
    label: 'Leased Heavy Mobile Crawler Crane (Operating Hours)',
    scopeNo: 3,
    scopeGroup: 'Category 8: Upstream Leased Assets',
    scope3CategoryNo: 8,
    defaultUnit: 'HOUR',
    supportedUnits: ['HOUR'],
    description: 'Specialist 150T heavy crawler lifting machinery rented on hourly dry/wet lease.',
    fieldSet: 'scope3Leased',
    defaultDataMethod: 'EQUIPMENT_TIMESHEET',
  },

  // ==========================================
  // SCOPE 3: CATEGORY 9 - DOWNSTREAM TRANSPORTATION
  // ==========================================
  {
    activityTypeId: 'ACT-DOWNSTREAM-TRUCK',
    label: 'Outbound Customer Delivery Trucking (tonne-km)',
    scopeNo: 3,
    scopeGroup: 'Category 9: Downstream Transportation and Distribution',
    scope3CategoryNo: 9,
    defaultUnit: 't-km',
    supportedUnits: ['t-km', 'MT', 'KM'],
    description: 'Third-party transport of finished pipes, fabrication structures, and products to client premises.',
    fieldSet: 'scope3Downstream',
    defaultDataMethod: 'CUSTOMER_DISPATCH_MANIFEST',
  },
  {
    activityTypeId: 'ACT-DOWNSTREAM-VAN',
    label: 'Final Mile Delivery Light Commercial Van (km)',
    scopeNo: 3,
    scopeGroup: 'Category 9: Downstream Transportation and Distribution',
    scope3CategoryNo: 9,
    defaultUnit: 'KM',
    supportedUnits: ['KM'],
    description: 'Courier and urban light vehicle delivery of engineering spare parts and drawings.',
    fieldSet: 'scope3Downstream',
    defaultDataMethod: 'COURIER_WAYBILL',
  },

  // ==========================================
  // SCOPE 3: CATEGORY 10 - PROCESSING OF SOLD PRODUCTS
  // ==========================================
  {
    activityTypeId: 'ACT-SOLD-STEEL-FAB',
    label: 'Downstream Customer Structural Steel Fabrication (MT)',
    scopeNo: 3,
    scopeGroup: 'Category 10: Processing of Sold Products',
    scope3CategoryNo: 10,
    defaultUnit: 'MT',
    supportedUnits: ['MT'],
    description: 'Emissions occurring during secondary cutting, welding, and heat treating of sold intermediate steel.',
    fieldSet: 'scope3SoldUse',
    defaultDataMethod: 'CUSTOMER_PROCESS_ESTIMATE',
  },
  {
    activityTypeId: 'ACT-SOLD-GALV',
    label: 'Downstream Secondary Galvanizing & Wire Drawing (MT)',
    scopeNo: 3,
    scopeGroup: 'Category 10: Processing of Sold Products',
    scope3CategoryNo: 10,
    defaultUnit: 'MT',
    supportedUnits: ['MT'],
    description: 'Chemical hot-dip galvanizing and surface pickling performed on sold steel by purchasers.',
    fieldSet: 'scope3SoldUse',
    defaultDataMethod: 'CUSTOMER_PROCESS_ESTIMATE',
  },

  // ==========================================
  // SCOPE 3: CATEGORY 11 - USE OF SOLD PRODUCTS
  // ==========================================
  {
    activityTypeId: 'ACT-USE-EQUIPMENT-FUEL',
    label: 'Direct Lifetime Fuel Combustion of Sold Heavy Machinery',
    scopeNo: 3,
    scopeGroup: 'Category 11: Use of Sold Products',
    scope3CategoryNo: 11,
    defaultUnit: 'LITER',
    supportedUnits: ['LITER'],
    description: 'Estimated cumulative operational fuel consumed by manufactured engines and generators sold.',
    fieldSet: 'scope3SoldUse',
    defaultDataMethod: 'LIFETIME_DESIGN_BENCHMARK',
  },
  {
    activityTypeId: 'ACT-USE-INFRA-ELEC',
    label: 'Direct Lifetime Electricity Usage of Sold Systems (kWh)',
    scopeNo: 3,
    scopeGroup: 'Category 11: Use of Sold Products',
    scope3CategoryNo: 11,
    defaultUnit: 'KWH',
    supportedUnits: ['KWH', 'MWH'],
    description: 'Expected lifetime grid energy consumed during the operational lifespan of constructed substations.',
    fieldSet: 'scope3SoldUse',
    defaultDataMethod: 'DESIGN_ENGINEERING_ENERGY_MODEL',
  },

  // ==========================================
  // SCOPE 3: CATEGORY 12 - END-OF-LIFE TREATMENT
  // ==========================================
  {
    activityTypeId: 'ACT-EOL-DEMO-LANDFILL',
    label: 'Demolition Waste Landfilling of Decommissioned Assets (MT)',
    scopeNo: 3,
    scopeGroup: 'Category 12: End-of-Life Treatment of Sold Products',
    scope3CategoryNo: 12,
    defaultUnit: 'MT',
    supportedUnits: ['MT'],
    description: 'Disposal impacts at decommissioning of structural concrete, insulation, and non-recyclables.',
    fieldSet: 'scope3EndOfLife',
    defaultDataMethod: 'DECOMMISSIONING_PLAN_BENCHMARK',
  },
  {
    activityTypeId: 'ACT-EOL-REBAR-RECYCLE',
    label: 'Recovered Structural Rebar Recycling at End of Life (MT)',
    scopeNo: 3,
    scopeGroup: 'Category 12: End-of-Life Treatment of Sold Products',
    scope3CategoryNo: 12,
    defaultUnit: 'MT',
    supportedUnits: ['MT'],
    description: 'Material recycling credit and melting burden of salvaged metals at final demolition.',
    fieldSet: 'scope3EndOfLife',
    defaultDataMethod: 'RECOVERY_RATE_MODEL',
  },

  // ==========================================
  // SCOPE 3: CATEGORY 13 - DOWNSTREAM LEASED ASSETS
  // ==========================================
  {
    activityTypeId: 'ACT-DOWNLEASE-WAREHOUSE',
    label: 'Downstream Leased Industrial Logistics Warehouse (m²-month)',
    scopeNo: 3,
    scopeGroup: 'Category 13: Downstream Leased Assets',
    scope3CategoryNo: 13,
    defaultUnit: 'SQM_MONTH',
    supportedUnits: ['SQM_MONTH'],
    description: 'Owned warehouse property leased out to commercial 3PL logistics tenants.',
    fieldSet: 'scope3Leased',
    defaultDataMethod: 'TENANT_ENERGY_METER_AUDIT',
  },
  {
    activityTypeId: 'ACT-DOWNLEASE-RETAIL',
    label: 'Downstream Leased Commercial Space (m²-month)',
    scopeNo: 3,
    scopeGroup: 'Category 13: Downstream Leased Assets',
    scope3CategoryNo: 13,
    defaultUnit: 'SQM_MONTH',
    supportedUnits: ['SQM_MONTH'],
    description: 'Corporate commercial asset leased to external financial or retail operations.',
    fieldSet: 'scope3Leased',
    defaultDataMethod: 'TENANT_LEASE_CONTRACT',
  },

  // ==========================================
  // SCOPE 3: CATEGORY 14 - FRANCHISES
  // ==========================================
  {
    activityTypeId: 'ACT-FRANCHISE-ELEC',
    label: 'Franchise Outlet Grid Electricity Consumption (kWh)',
    scopeNo: 3,
    scopeGroup: 'Category 14: Franchises',
    scope3CategoryNo: 14,
    defaultUnit: 'KWH',
    supportedUnits: ['KWH'],
    description: 'Lighting, refrigeration, and computing power across licensed distributor outlets.',
    fieldSet: 'scope3Franchise',
    defaultDataMethod: 'FRANCHISE_REPORTED_UTILITY_BILLS',
  },
  {
    activityTypeId: 'ACT-FRANCHISE-GAS',
    label: 'Franchise Outlet Natural Gas & Kitchen LPG (SCM)',
    scopeNo: 3,
    scopeGroup: 'Category 14: Franchises',
    scope3CategoryNo: 14,
    defaultUnit: 'SCM',
    supportedUnits: ['SCM', 'KG'],
    description: 'Cooking fuel and heating energy consumed at authorized franchise dining and retail hubs.',
    fieldSet: 'scope3Franchise',
    defaultDataMethod: 'FRANCHISE_AUDIT_LOG',
  },

  // ==========================================
  // SCOPE 3: CATEGORY 15 - INVESTMENTS
  // ==========================================
  {
    activityTypeId: 'ACT-INVEST-EQUITY',
    label: 'Equity Share Financed Infrastructure Construction (tCO2e)',
    scopeNo: 3,
    scopeGroup: 'Category 15: Investments',
    scope3CategoryNo: 15,
    defaultUnit: 'MT',
    supportedUnits: ['MT', 'INR'],
    description: 'PCAF-compliant financed emissions apportioned by ownership equity share in joint ventures.',
    fieldSet: 'scope3Investments',
    defaultDataMethod: 'PCAF_ATTRIBUTED_PORTFOLIO',
  },
  {
    activityTypeId: 'ACT-INVEST-LOANS',
    label: 'Commercial Project Lending Financed Footprint (tCO2e)',
    scopeNo: 3,
    scopeGroup: 'Category 15: Investments',
    scope3CategoryNo: 15,
    defaultUnit: 'MT',
    supportedUnits: ['MT', 'INR'],
    description: 'Debt financing asset-class carbon exposure for sponsored clean-energy utilities.',
    fieldSet: 'scope3Investments',
    defaultDataMethod: 'PCAF_ATTRIBUTED_PORTFOLIO',
  },
];

/**
 * Filter activities by Scope and optionally Scope 3 category
 */
export function getActivitiesForScope(scopeNo: 1 | 2 | 3, scope3CategoryNo?: number): ActivityOption[] {
  if (scopeNo === 1 || scopeNo === 2) {
    return ACTIVITY_CATALOGUE.filter((a) => a.scopeNo === scopeNo);
  }
  if (scopeNo === 3) {
    if (scope3CategoryNo) {
      return ACTIVITY_CATALOGUE.filter((a) => a.scopeNo === 3 && a.scope3CategoryNo === scope3CategoryNo);
    }
    return ACTIVITY_CATALOGUE.filter((a) => a.scopeNo === 3);
  }
  return [];
}

/**
 * Find activity option by typeId
 */
export function findActivityOption(activityTypeId: string): ActivityOption | undefined {
  return ACTIVITY_CATALOGUE.find((a) => a.activityTypeId === activityTypeId);
}
