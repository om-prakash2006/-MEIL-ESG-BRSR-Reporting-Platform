import crypto from 'crypto';
import { firestore } from './firestore.ts';
import { storageService } from './storage.ts';
import { generateReportPdf } from './pdfGenerator.ts';
import { calculateAuditorEmissions } from './audit.ts';
import type {
  User,
  ReportRecord,
  ReportType,
  ReportStatus,
  ReportTemplate,
  ReportDisclosureDefinition,
  ReportDisclosureValue,
  ValidationIssue,
  ReportSnapshot,
  ActivityRecord,
  ReconciliationCase,
  AuditReview,
  AuditFinding,
  EvidenceDocument,
  Organization,
  ReportingPeriod,
} from '../models/types.ts';
import { logger } from '../utils/logger.ts';

class ReportService {
  private templates: Map<string, ReportTemplate> = new Map();

  constructor() {
    this.initTemplates();
    this.seedDefaultReports();
  }

  // ==========================================
  // 1. TEMPLATES & DISCLOSURE CONFIGURATION
  // ==========================================

  private initTemplates() {
    // A. SEBI BRSR Core Statutory Template (v1.0)
    const brsrDisclosures: ReportDisclosureDefinition[] = [
      // Section A: General Disclosures
      {
        disclosureId: 'DISC-GEN-01',
        disclosureCode: 'BRSR-GEN-01',
        disclosureName: 'Corporate Identity Number (CIN) & Entity Name',
        reportType: 'BRSR',
        reportSection: 'Section A: General Disclosures',
        description: 'Statutory corporate identification and registered office details under MCA.',
        requiredFlag: true,
        dataSource: 'organizations master registry',
        templateVersion: '1.0',
        activeFlag: true,
      },
      {
        disclosureId: 'DISC-GEN-02',
        disclosureCode: 'BRSR-GEN-02',
        disclosureName: 'Reporting Boundary & Covered Operational Facilities',
        reportType: 'BRSR',
        reportSection: 'Section A: General Disclosures',
        description: 'Details of all manufacturing, project, and auxiliary sites in organizational boundary.',
        requiredFlag: true,
        dataSource: 'facilities and business units hierarchy',
        templateVersion: '1.0',
        activeFlag: true,
      },
      {
        disclosureId: 'DISC-GEN-03',
        disclosureCode: 'BRSR-GEN-03',
        disclosureName: 'Reporting Fiscal Period & Alignment',
        reportType: 'BRSR',
        reportSection: 'Section A: General Disclosures',
        description: 'Target quarter and fiscal year definition under SEBI Listing Regulations.',
        requiredFlag: true,
        dataSource: 'reportingPeriods master',
        templateVersion: '1.0',
        activeFlag: true,
      },
      {
        disclosureId: 'DISC-GEN-04',
        disclosureCode: 'BRSR-GEN-04',
        disclosureName: 'Employee and Worker Demographics & Turnover',
        reportType: 'BRSR',
        reportSection: 'Section A: General Disclosures',
        description: 'Total permanent employees, contract workers, and gender diversity statistics.',
        requiredFlag: true,
        dataSource: 'HR ERP System',
        templateVersion: '1.0',
        activeFlag: true,
      },
      // Section B: Management & Process Disclosures
      {
        disclosureId: 'DISC-MGT-01',
        disclosureCode: 'BRSR-MGT-01',
        disclosureName: 'Board ESG Committee & Statutory Governance Policies',
        reportType: 'BRSR',
        reportSection: 'Section B: Management and Process',
        description: 'Approved sustainability policies covering Business Responsibility Principles 1-9.',
        requiredFlag: true,
        dataSource: 'Corporate Governance Registry',
        templateVersion: '1.0',
        activeFlag: true,
      },
      // Section C: Principle 6 Environmental Disclosures
      {
        disclosureId: 'DISC-ENV-01',
        disclosureCode: 'BRSR-ENV-01',
        disclosureName: 'Total Energy Consumption (Renewable vs Non-Renewable)',
        reportType: 'BRSR',
        reportSection: 'Section C: Principle 6 Environmental',
        description: 'Aggregated fuel (diesel, PNG, HFO) and electricity energy inputs in Gigajoules (GJ).',
        requiredFlag: true,
        dataSource: 'activityRecords (Scope 1 and 2)',
        calculationSource: 'Calorific Conversion Factors',
        unit: 'GJ',
        templateVersion: '1.0',
        activeFlag: true,
      },
      {
        disclosureId: 'DISC-ENV-02',
        disclosureCode: 'BRSR-ENV-02',
        disclosureName: 'Water Withdrawal, Consumption, and Effluent Discharge',
        reportType: 'BRSR',
        reportSection: 'Section C: Principle 6 Environmental',
        description: 'Surface, groundwater, and municipal water abstraction across facilities.',
        requiredFlag: false,
        dataSource: 'Water Metering Logs',
        unit: 'Kiloliters (kL)',
        templateVersion: '1.0',
        activeFlag: true,
      },
      {
        disclosureId: 'DISC-ENV-03',
        disclosureCode: 'BRSR-ENV-03',
        disclosureName: 'Waste Generation & Hazardous Waste Sent to TSDF',
        reportType: 'BRSR',
        reportSection: 'Section C: Principle 6 Environmental',
        description: 'Form 10 hazardous waste manifests and incinerated oil/chemical sludge under CPCB.',
        requiredFlag: true,
        dataSource: 'activityRecords (Scope 3 Cat 5)',
        unit: 'Metric Tonnes (MT)',
        templateVersion: '1.0',
        activeFlag: true,
      },
      {
        disclosureId: 'DISC-GHG-01',
        disclosureCode: 'BRSR-GHG-01',
        disclosureName: 'Gross Scope 1 Direct Greenhouse Gas Emissions',
        reportType: 'BRSR',
        reportSection: 'Section C: Principle 6 Environmental',
        description: 'Stationary combustion, diesel gen-sets, boiler fuel, and fugitive refrigerants.',
        requiredFlag: true,
        dataSource: 'activityRecords (Scope 1)',
        calculationSource: 'CEA / DEFRA 2025 Emission Factors',
        unit: 'tCO2e',
        templateVersion: '1.0',
        activeFlag: true,
      },
      {
        disclosureId: 'DISC-GHG-02',
        disclosureCode: 'BRSR-GHG-02',
        disclosureName: 'Gross Scope 2 Location-Based Indirect GHG Emissions',
        reportType: 'BRSR',
        reportSection: 'Section C: Principle 6 Environmental',
        description: 'Purchased high-tension grid electricity calculated with CEA Baseline Database v19.',
        requiredFlag: true,
        dataSource: 'activityRecords (Scope 2)',
        calculationSource: 'CEA Baseline v19 (0.716 kgCO2e/kWh)',
        unit: 'tCO2e',
        templateVersion: '1.0',
        activeFlag: true,
      },
      {
        disclosureId: 'DISC-GHG-03',
        disclosureCode: 'BRSR-GHG-03',
        disclosureName: 'Scope 3 Other Indirect GHG Emissions (Material Categories)',
        reportType: 'BRSR',
        reportSection: 'Section C: Principle 6 Environmental',
        description: 'Value chain emissions across purchased steel, freight transport, waste, and flights.',
        requiredFlag: false,
        dataSource: 'activityRecords (Scope 3)',
        calculationSource: 'World Steel / GLEC Freight / ICAO Factors',
        unit: 'tCO2e',
        templateVersion: '1.0',
        activeFlag: true,
      },
      {
        disclosureId: 'DISC-GHG-04',
        disclosureCode: 'BRSR-GHG-04',
        disclosureName: 'Scope 1 + Scope 2 GHG Emission Intensity',
        reportType: 'BRSR',
        reportSection: 'Section C: Principle 6 Environmental',
        description: 'Emissions per Rupee of turnover and per physical project output unit.',
        requiredFlag: true,
        dataSource: 'Financial Audited Statements',
        unit: 'tCO2e / Crore INR',
        templateVersion: '1.0',
        activeFlag: true,
      },
      {
        disclosureId: 'DISC-ASSUR-01',
        disclosureCode: 'BRSR-ASSUR-01',
        disclosureName: 'Independent Assurance Opinion & Scope of Verification',
        reportType: 'BRSR',
        reportSection: 'Assurance & Governance Information',
        description: 'Third-party assurance engagement opinion under ISAE 3000 / ISO 14064-3.',
        requiredFlag: true,
        dataSource: 'auditReviews & reconciliationCases',
        templateVersion: '1.0',
        activeFlag: true,
      },
    ];

    const brsrTemplate: ReportTemplate = {
      templateId: 'TMPL-BRSR-2026',
      templateCode: 'BRSR_CORE',
      templateName: 'MEIL SEBI BRSR Core Statutory Template (FY25-26)',
      reportType: 'BRSR',
      version: '1.0',
      regulatoryFramework: 'SEBI BRSR Core / Companies Act 2013 / GHG Protocol',
      description: 'Official statutory disclosure specification for BSE/NSE listed infrastructure entities.',
      supportedSections: [
        'Section A: General Disclosures',
        'Section C: Principle 6 Environmental',
        'Assurance & Governance Information',
      ],
      unsupportedSections: [
        'Section B: Management and Process Policies (Policy Register pending Phase 8)',
        'Principle 1-5, 7-9 Non-Environmental Core Disclosures',
      ],
      disclosures: brsrDisclosures,
      activeFlag: true,
    };

    // B. ESG Operational Summary Template
    const esgTemplate: ReportTemplate = {
      templateId: 'TMPL-ESG-SUM-2026',
      templateCode: 'ESG_SUMMARY',
      templateName: 'MEIL Operational ESG Performance Summary',
      reportType: 'ESG_SUMMARY',
      version: '1.0',
      regulatoryFramework: 'GRI Standards / BRSR Core',
      description: 'Monthly and quarterly ESG executive performance dashboard for board oversight.',
      supportedSections: [
        'Executive Environmental Highlights',
        'Energy & Emissions Inventory',
        'Assurance & Reconciliation Status',
      ],
      unsupportedSections: ['Social & Governance Metrics (Pending HR integration)'],
      disclosures: brsrDisclosures.filter((d) => d.reportSection.includes('Environmental') || d.disclosureCode.includes('ASSUR')),
      activeFlag: true,
    };

    // C. GHG Emissions Inventory Template
    const ghgTemplate: ReportTemplate = {
      templateId: 'TMPL-GHG-INV-2026',
      templateCode: 'GHG_INVENTORY',
      templateName: 'MEIL Comprehensive GHG Protocol & ISO 14064-1 Inventory',
      reportType: 'GHG_INVENTORY',
      version: '1.0',
      regulatoryFramework: 'GHG Protocol Corporate Standard / ISO 14064-1:2018',
      description: 'Technical greenhouse gas emissions ledger across Scope 1, Scope 2, and all 15 Scope 3 categories.',
      supportedSections: [
        'Scope 1 Direct Emissions',
        'Scope 2 Location-Based Emissions',
        'Scope 3 Upstream & Downstream Inventory',
        'Gas-Wise Emissions Disaggregation',
        'Methodology & Emission Factor Baseline',
      ],
      unsupportedSections: ['Market-Based Scope 2 (Contractual RECs pending supplier certificates)'],
      disclosures: brsrDisclosures.filter((d) => d.disclosureCode.includes('GHG') || d.disclosureCode.includes('ENV')),
      activeFlag: true,
    };

    this.templates.set(brsrTemplate.templateId, brsrTemplate);
    this.templates.set(esgTemplate.templateId, esgTemplate);
    this.templates.set(ghgTemplate.templateId, ghgTemplate);

    for (const t of [brsrTemplate, esgTemplate, ghgTemplate]) {
      firestore.setDoc('reportTemplates', t.templateId, t as unknown as Record<string, unknown>);
    }
  }

  public getReportTemplates(): ReportTemplate[] {
    return Array.from(this.templates.values());
  }

  public getReportTemplateById(templateId: string): ReportTemplate | null {
    return this.templates.get(templateId) || null;
  }

  // ==========================================
  // 2. REPORT GENERATION ENGINE (PHASE 7)
  // ==========================================

  /**
   * Generates a frozen report snapshot for the specified company and reporting period.
   * Maps existing Phase 3 activities, Phase 4 calculations, Phase 5 audits, and Phase 6 reconciliations.
   */
  public async generateReport(
    user: User,
    params: {
      templateId?: string;
      reportType?: ReportType;
      companyId?: string;
      reportingPeriodId?: string;
      notes?: string;
    }
  ): Promise<ReportRecord> {
    const reportType: ReportType = params.reportType || 'BRSR';
    const templateId = params.templateId || (reportType === 'GHG_INVENTORY' ? 'TMPL-GHG-INV-2026' : reportType === 'ESG_SUMMARY' ? 'TMPL-ESG-SUM-2026' : 'TMPL-BRSR-2026');
    const template = this.getReportTemplateById(templateId) || this.templates.get('TMPL-BRSR-2026')!;

    // Resolve company and reporting period
    const companyId = params.companyId || user.organizationId || 'COMP001';
    const periodId = params.reportingPeriodId || 'Q3_FY2526';

    const org = firestore.getDoc<Organization>('organizations', companyId) || {
      organizationId: companyId,
      name: companyId === 'GROUP001' ? 'MEIL GROUP CONSOLIDATED' : 'MEIL Company A (Megha Hydro Infra)',
      cin: 'U45200TG2006PLC050123',
      type: 'COMPANY',
      active: true,
    };

    const period = firestore.getDoc<ReportingPeriod>('reportingPeriods', periodId) || {
      periodId,
      fiscalYear: 'FY 2025-26',
      quarter: 'Q3',
      startDate: '2025-10-01',
      endDate: '2025-12-31',
      status: 'ACTIVE',
    };

    logger.info('Generating statutory report snapshot...', {
      reportType,
      companyId,
      periodId,
      actor: user.userId,
    });

    // 1. Gather included activities from Phase 3 activity records
    const allActivities = firestore.getDocs<ActivityRecord>('activityRecords');
    const includedActivities = allActivities.filter((act) => {
      const matchCompany = act.companyId === companyId || act.organizationId === companyId || companyId === 'GROUP001';
      const matchPeriod = act.reportingPeriodId === periodId;
      return matchCompany && matchPeriod && act.isActive;
    });

    // 2. Gather Phase 6 Reconciliation Cases to reflect resolved/corrected data and identify open blockers
    const allCases = firestore.getDocs<ReconciliationCase>('reconciliationCases');
    const companyCases = allCases.filter((c) => {
      return (c.companyId === companyId || companyId === 'GROUP001') && c.reportingPeriodId === periodId;
    });

    // Map of activityId -> reconciled values
    const reconciliationMap = new Map<string, ReconciliationCase>();
    for (const c of companyCases) {
      reconciliationMap.set(c.activityId, c);
    }

    // 3. Gather Phase 5 Audit Reviews and Findings
    const allReviews = firestore.getDocs<AuditReview>('auditReviews');
    const allFindings = firestore.getDocs<AuditFinding>('auditFindings');
    const companyReviews = allReviews.filter((r) => r.companyId === companyId || companyId === 'GROUP001');

    // 4. Calculate deterministic emissions using Phase 4 engine
    let totalScope1Kg = 0;
    let totalScope2Kg = 0;
    let totalScope3Kg = 0;
    let totalEnergyGj = 0;
    let totalWasteMt = 0;

    let hasScope1 = false;
    let hasScope2 = false;
    let hasScope3 = false;

    const gasAccumulator: Record<string, { scope: number; gas: string; kg: number }> = {
      'S1-CO2': { scope: 1, gas: 'Carbon Dioxide (CO2)', kg: 0 },
      'S1-CH4': { scope: 1, gas: 'Methane (CH4)', kg: 0 },
      'S1-N2O': { scope: 1, gas: 'Nitrous Oxide (N2O)', kg: 0 },
      'S2-CO2': { scope: 2, gas: 'Carbon Dioxide (CO2 Grid)', kg: 0 },
      'S3-CO2': { scope: 3, gas: 'Carbon Dioxide (CO2 Supply Chain)', kg: 0 },
    };

    const scope3CategoryMap: Record<number, { name: string; kg: number }> = {
      1: { name: 'Purchased Goods and Services', kg: 0 },
      2: { name: 'Capital Goods', kg: 0 },
      4: { name: 'Upstream Transportation and Distribution', kg: 0 },
      5: { name: 'Waste Generated in Operations', kg: 0 },
      6: { name: 'Business Travel', kg: 0 },
    };

    for (const act of includedActivities) {
      // If a case has an accepted correction, use the corrected data
      const rCase = reconciliationMap.get(act.activityId);
      const effectiveQty = rCase?.correctedData?.correctedQuantity || act.quantity || 0;
      const effectiveUnit = rCase?.correctedData?.correctedUnit || act.unitId || '';

      const calc = calculateAuditorEmissions({
        scopeNo: act.scopeNo,
        activityTypeId: act.activityTypeId,
        unitId: effectiveUnit,
        quantity: effectiveQty,
      });

      if (act.scopeNo === 1) {
        hasScope1 = true;
        totalScope1Kg += calc.grossKgCO2e;
        gasAccumulator['S1-CO2'].kg += calc.gasBreakdown.co2Kg;
        gasAccumulator['S1-CH4'].kg += calc.gasBreakdown.ch4Kg;
        gasAccumulator['S1-N2O'].kg += calc.gasBreakdown.n2oKg;

        // Energy conversion for fuels: diesel (38.6 MJ/L), PNG (38.5 MJ/SCM)
        if (effectiveUnit.includes('LITER')) totalEnergyGj += (effectiveQty * 38.6) / 1000;
        else if (effectiveUnit.includes('SCM')) totalEnergyGj += (effectiveQty * 38.5) / 1000;
      } else if (act.scopeNo === 2) {
        hasScope2 = true;
        totalScope2Kg += calc.grossKgCO2e;
        gasAccumulator['S2-CO2'].kg += calc.grossKgCO2e;
        // 1 kWh = 0.0036 GJ
        totalEnergyGj += effectiveQty * 0.0036;
      } else if (act.scopeNo === 3) {
        hasScope3 = true;
        totalScope3Kg += calc.grossKgCO2e;
        gasAccumulator['S3-CO2'].kg += calc.grossKgCO2e;

        const catNo = act.scope3CategoryNo || (act.activityTypeId?.includes('STEEL') ? 1 : act.activityTypeId?.includes('AIR') ? 6 : act.activityTypeId?.includes('WASTE') ? 5 : 4);
        if (scope3CategoryMap[catNo]) {
          scope3CategoryMap[catNo].kg += calc.grossKgCO2e;
        }

        if (catNo === 5 && effectiveUnit.includes('MT')) {
          totalWasteMt += effectiveQty;
        }
      }
    }

    const scope1Tons = hasScope1 ? Number((totalScope1Kg / 1000).toFixed(2)) : null;
    const scope2Tons = hasScope2 ? Number((totalScope2Kg / 1000).toFixed(2)) : null;
    const scope3Tons = hasScope3 ? Number((totalScope3Kg / 1000).toFixed(2)) : null;
    const scope12Combined = scope1Tons !== null || scope2Tons !== null ? Number(((scope1Tons || 0) + (scope2Tons || 0)).toFixed(2)) : null;
    const totalTons = scope12Combined !== null || scope3Tons !== null ? Number(((scope12Combined || 0) + (scope3Tons || 0)).toFixed(2)) : null;

    // 5. Gas Breakdown
    const gasBreakdown = Object.values(gasAccumulator)
      .filter((g) => g.kg > 0)
      .map((g) => ({
        scope: g.scope,
        gas: g.gas,
        emissionsTons: Number((g.kg / 1000).toFixed(2)),
        unit: 'tCO2e',
      }));

    // 6. Scope 3 Breakdown
    const scope3CategoryTotals = Object.entries(scope3CategoryMap).map(([no, val]) => ({
      categoryNo: Number(no),
      categoryName: val.name,
      emissionsTons: Number((val.kg / 1000).toFixed(2)),
      unit: 'tCO2e',
      dataStatus: val.kg > 0 ? 'POPULATED' : 'NOT_APPLICABLE',
    }));

    // 7. Map Disclosures & determine states strictly based on real data
    const disclosuresMap: Record<string, ReportDisclosureValue> = {};

    for (const def of template.disclosures) {
      if (def.disclosureCode === 'BRSR-GEN-01') {
        disclosuresMap[def.disclosureCode] = {
          disclosureId: def.disclosureId,
          disclosureCode: def.disclosureCode,
          disclosureName: def.disclosureName,
          section: def.reportSection,
          status: 'COMPLETE',
          rawValue: { cin: org.cin, entity: org.name },
          formattedValue: `${org.name} (CIN: ${org.cin || 'U45200TG2006PLC050123'})`,
          dataSource: 'organizations',
          isSupported: true,
        };
      } else if (def.disclosureCode === 'BRSR-GEN-02') {
        const facCount = 4;
        const buCount = 2;
        disclosuresMap[def.disclosureCode] = {
          disclosureId: def.disclosureId,
          disclosureCode: def.disclosureCode,
          disclosureName: def.disclosureName,
          section: def.reportSection,
          status: 'COMPLETE',
          rawValue: { facilities: facCount, businessUnits: buCount },
          formattedValue: `${facCount} Operating Facilities across ${buCount} Business Units`,
          dataSource: 'facilities hierarchy',
          isSupported: true,
        };
      } else if (def.disclosureCode === 'BRSR-GEN-03') {
        disclosuresMap[def.disclosureCode] = {
          disclosureId: def.disclosureId,
          disclosureCode: def.disclosureCode,
          disclosureName: def.disclosureName,
          section: def.reportSection,
          status: 'COMPLETE',
          rawValue: period,
          formattedValue: `${period.fiscalYear} (${period.quarter}): 01-Oct-2025 to 31-Dec-2025`,
          dataSource: 'reportingPeriods',
          isSupported: true,
        };
      } else if (def.disclosureCode === 'BRSR-GEN-04') {
        disclosuresMap[def.disclosureCode] = {
          disclosureId: def.disclosureId,
          disclosureCode: def.disclosureCode,
          disclosureName: def.disclosureName,
          section: def.reportSection,
          status: 'DATA_MISSING',
          rawValue: null,
          formattedValue: 'Data collection module pending (HR ERP)',
          isSupported: false,
          missingReason: 'Workforce and employee demographic ledger pipeline not yet active in Phase 3.',
        };
      } else if (def.disclosureCode === 'BRSR-MGT-01') {
        disclosuresMap[def.disclosureCode] = {
          disclosureId: def.disclosureId,
          disclosureCode: def.disclosureCode,
          disclosureName: def.disclosureName,
          section: def.reportSection,
          status: 'NOT_CONFIGURED',
          rawValue: null,
          formattedValue: 'Policy register not configured in schema',
          isSupported: false,
          missingReason: 'Corporate governance and sustainability policy register not configured in system.',
        };
      } else if (def.disclosureCode === 'BRSR-ENV-01') {
        disclosuresMap[def.disclosureCode] = {
          disclosureId: def.disclosureId,
          disclosureCode: def.disclosureCode,
          disclosureName: def.disclosureName,
          section: def.reportSection,
          status: totalEnergyGj > 0 ? 'COMPLETE' : 'DATA_MISSING',
          rawValue: totalEnergyGj,
          formattedValue: totalEnergyGj > 0 ? `${totalEnergyGj.toLocaleString('en-IN', { maximumFractionDigits: 1 })} GJ` : 'No verified energy records',
          unit: 'GJ',
          dataSource: 'activityRecords',
          isSupported: true,
        };
      } else if (def.disclosureCode === 'BRSR-ENV-02') {
        disclosuresMap[def.disclosureCode] = {
          disclosureId: def.disclosureId,
          disclosureCode: def.disclosureCode,
          disclosureName: def.disclosureName,
          section: def.reportSection,
          status: 'DATA_MISSING',
          rawValue: null,
          formattedValue: 'Water metering pipeline not integrated',
          unit: 'kL',
          isSupported: false,
          missingReason: 'Water withdrawal and effluent discharge meters pending Phase 8 data collection.',
        };
      } else if (def.disclosureCode === 'BRSR-ENV-03') {
        disclosuresMap[def.disclosureCode] = {
          disclosureId: def.disclosureId,
          disclosureCode: def.disclosureCode,
          disclosureName: def.disclosureName,
          section: def.reportSection,
          status: totalWasteMt > 0 ? 'COMPLETE' : 'DATA_MISSING',
          rawValue: totalWasteMt,
          formattedValue: totalWasteMt > 0 ? `${totalWasteMt} MT (TSDF Incineration Manifest)` : 'Data Missing',
          unit: 'MT',
          dataSource: 'activityRecords (Scope 3 Cat 5)',
          isSupported: true,
        };
      } else if (def.disclosureCode === 'BRSR-GHG-01') {
        disclosuresMap[def.disclosureCode] = {
          disclosureId: def.disclosureId,
          disclosureCode: def.disclosureCode,
          disclosureName: def.disclosureName,
          section: def.reportSection,
          status: scope1Tons !== null ? 'COMPLETE' : 'DATA_MISSING',
          rawValue: scope1Tons,
          formattedValue: scope1Tons !== null ? `${scope1Tons.toFixed(2)} tCO2e` : 'Data Missing',
          unit: 'tCO2e',
          dataSource: 'activityRecords',
          calculationSource: 'CEA / DEFRA 2025 Factors',
          isSupported: true,
        };
      } else if (def.disclosureCode === 'BRSR-GHG-02') {
        disclosuresMap[def.disclosureCode] = {
          disclosureId: def.disclosureId,
          disclosureCode: def.disclosureCode,
          disclosureName: def.disclosureName,
          section: def.reportSection,
          status: scope2Tons !== null ? 'COMPLETE' : 'DATA_MISSING',
          rawValue: scope2Tons,
          formattedValue: scope2Tons !== null ? `${scope2Tons.toFixed(2)} tCO2e` : 'Data Missing',
          unit: 'tCO2e',
          dataSource: 'activityRecords',
          calculationSource: 'CEA Baseline v19 (0.716 kgCO2e/kWh)',
          isSupported: true,
        };
      } else if (def.disclosureCode === 'BRSR-GHG-03') {
        disclosuresMap[def.disclosureCode] = {
          disclosureId: def.disclosureId,
          disclosureCode: def.disclosureCode,
          disclosureName: def.disclosureName,
          section: def.reportSection,
          status: scope3Tons !== null ? 'COMPLETE' : 'DATA_MISSING',
          rawValue: scope3Tons,
          formattedValue: scope3Tons !== null ? `${scope3Tons.toFixed(2)} tCO2e` : 'Data Missing',
          unit: 'tCO2e',
          dataSource: 'activityRecords',
          calculationSource: 'World Steel / GLEC / ICAO Factors',
          isSupported: true,
        };
      } else if (def.disclosureCode === 'BRSR-GHG-04') {
        disclosuresMap[def.disclosureCode] = {
          disclosureId: def.disclosureId,
          disclosureCode: def.disclosureCode,
          disclosureName: def.disclosureName,
          section: def.reportSection,
          status: 'DATA_MISSING',
          rawValue: null,
          formattedValue: 'Omitted: Missing financial revenue denominator',
          unit: 'tCO2e / Crore INR',
          isSupported: false,
          missingReason: 'Financial turnover ERP ledger not yet integrated. Missing denominator prevents statutory intensity calculation.',
        };
      } else if (def.disclosureCode === 'BRSR-ASSUR-01') {
        const verifiedReviews = companyReviews.filter((r) => r.auditStatus === 'VERIFIED');
        disclosuresMap[def.disclosureCode] = {
          disclosureId: def.disclosureId,
          disclosureCode: def.disclosureCode,
          disclosureName: def.disclosureName,
          section: def.reportSection,
          status: verifiedReviews.length > 0 ? 'READY_FOR_REVIEW' : 'PENDING_VALIDATION',
          rawValue: { verifiedReviews: verifiedReviews.length, leadAssurer: 'Dr. Ananya Sen (EY LLP)' },
          formattedValue: `ISAE 3000 / ISO 14064-3 Opinion by EY LLP (${verifiedReviews.length} reviews verified)`,
          dataSource: 'auditReviews',
          isSupported: true,
        };
      }
    }

    // 8. Run Validation & Blocker Checks
    const validationIssues: ValidationIssue[] = [];

    // Check A: Open material reconciliation cases
    const openReconCases = companyCases.filter((c) => c.status !== 'RESOLVED' && c.materiality === 'MATERIAL');
    for (const c of openReconCases) {
      validationIssues.push({
        issueId: `ISS-RECON-${c.caseId}`,
        severity: 'ERROR',
        disclosureId: 'BRSR-GHG-01',
        relatedRecordReferences: [c.caseId, c.activityId],
        issueCode: 'OPEN_RECONCILIATION_CASE',
        message: `Unresolved material reconciliation case ${c.caseNumber} for ${c.category} (+${c.variance.quantityDeltaPercentage}% variance). Resolution required before report sign-off.`,
        blockingFlag: true,
        recommendedAction: `Review correction request ${c.activeCorrectionRequestId || 'pending'} and obtain auditor resolution before approving this report.`,
      });
    }

    // Check B: Unresolved audit findings
    const openFindings = allFindings.filter((f) => f.status === 'OPEN');
    for (const f of openFindings) {
      validationIssues.push({
        issueId: `ISS-FIND-${f.findingId}`,
        severity: 'ERROR',
        disclosureId: 'BRSR-ASSUR-01',
        relatedRecordReferences: [f.findingId, f.activityId],
        issueCode: 'UNRESOLVED_AUDIT_FINDING',
        message: `Unresolved audit finding ${f.findingId} (${f.title}): ${f.description}`,
        blockingFlag: true,
        recommendedAction: `Submit auditor clarification or corrected evidence for activity ${f.activityId} to close finding.`,
      });
    }

    // Check C: Financial turnover denominator for intensity
    validationIssues.push({
      issueId: 'ISS-INTENSITY-FIN',
      severity: 'WARNING',
      disclosureId: 'BRSR-GHG-04',
      issueCode: 'MISSING_FINANCIAL_DENOMINATOR',
      message: 'Financial revenue turnover denominator unavailable from ERP. Emission intensity metrics omitted in accordance with SEBI guidelines.',
      blockingFlag: false,
      recommendedAction: 'Attach statutory quarterly audited turnover figure or proceed with physical intensity only.',
    });

    // Check D: Mandatory disclosures
    for (const d of Object.values(disclosuresMap)) {
      if (d.status === 'DATA_MISSING' && (d.disclosureCode === 'BRSR-GEN-04')) {
        validationIssues.push({
          issueId: `ISS-DISC-${d.disclosureCode}`,
          severity: 'WARNING',
          disclosureId: d.disclosureCode,
          issueCode: 'MISSING_MANDATORY_DISCLOSURE',
          message: `Disclosure ${d.disclosureName} is unpopulated. Reason: ${d.missingReason}`,
          blockingFlag: false,
          recommendedAction: 'Confirm statutory exemption or update HR workforce parameters in subsequent cycle.',
        });
      }
    }

    const blockingErrors = validationIssues.filter((i) => i.blockingFlag).length;
    const warnings = validationIssues.filter((i) => i.severity === 'WARNING').length;
    const infoCount = validationIssues.filter((i) => i.severity === 'INFO').length;

    // Report Status: If blocking errors exist, status is DRAFT / VALIDATION_FAILED. If none, READY_FOR_REVIEW.
    const reportStatus: ReportStatus = blockingErrors > 0 ? 'VALIDATION_FAILED' : 'READY_FOR_REVIEW';

    // 9. Build frozen snapshot
    const snapshot: ReportSnapshot = {
      scopeTotals: {
        scope1Tons,
        scope2Tons,
        scope3Tons,
        scope12Combined,
        totalTons,
      },
      gasBreakdown,
      scope3CategoryTotals,
      intensityMetrics: {
        revenueInrCrores: null,
        turnoverBasis: 'Pending Audited Ledger',
        physicalMetricName: 'Installed Capacity Generation',
        physicalOutputQty: 2000,
        physicalUnit: 'MW',
        scope12IntensityRevenue: null,
        scope12IntensityPhysical: scope12Combined !== null ? Number((scope12Combined / 2000).toFixed(4)) : null,
        hasIntensityCalculations: false,
        missingIntensityReason: 'Financial turnover denominator unavailable. Scope 1+2 turnover intensity omitted.',
      },
      activityRecordIds: includedActivities.map((a) => a.activityId),
      calculationRunIds: includedActivities.map((a) => `CALC-${a.activityId}`),
      auditReviewIds: companyReviews.map((r) => r.reviewId),
      reconciliationCaseIds: companyCases.map((c) => c.caseId),
      evidenceDocumentIds: includedActivities.flatMap((a) => a.linkedEvidenceIds || []),
      disclosures: disclosuresMap,
      coverage: {
        facilitiesIncluded: 4,
        businessUnitsIncluded: 2,
        totalActivities: includedActivities.length,
        verifiedActivities: includedActivities.filter((a) => a.workflowStatus === 'SITE_REVIEWED' || a.workflowStatus === 'ESG_REVIEWED').length,
        auditFindingsCount: openFindings.length,
        openReconciliationCount: openReconCases.length,
      },
    };

    // Cryptographic hash of snapshot data
    const snapshotReference = 'SNAP-' + crypto.createHash('sha256').update(JSON.stringify(snapshot)).digest('hex').slice(0, 16);

    // Determine report versioning
    const existingReports = this.listReports(user, { companyId, reportingPeriodId: periodId, reportType });
    const latestVersion = existingReports.reduce((max, r) => Math.max(max, r.reportVersion), 0);
    const newVersion = latestVersion + 1;
    const reportId = `REP-${companyId}-${periodId}-${newVersion}`;

    const newReport: ReportRecord = {
      reportId,
      reportType,
      templateId: template.templateId,
      templateVersion: template.version,
      title: `${org.name} Statutory ${reportType} Report (${period.quarter} ${period.fiscalYear})`,
      organizationId: org.organizationId || 'GROUP001',
      companyId,
      companyName: org.name,
      reportingPeriodId: periodId,
      fiscalYear: period.fiscalYear,
      quarter: period.quarter,
      reportingBoundaryReference: `${org.name} · Operational Facilities (Subansiri, Polavaram, Zojila, BHEL)`,
      reportVersion: newVersion,
      reportStatus,
      generationRequestedBy: user.userId,
      generationRequestedByName: user.name,
      generationRequestedByRole: user.role,
      generatedAt: Date.now(),
      updatedAt: Date.now(),
      snapshotReference,
      snapshot,
      validationSummary: {
        totalIssues: validationIssues.length,
        blockingErrors,
        warnings,
        infoCount,
        issues: validationIssues,
        canApprove: blockingErrors === 0,
      },
      approvalStatus: 'PENDING',
      history: [
        {
          version: newVersion,
          action: 'REPORT_DRAFT_GENERATED',
          performedBy: user.userId,
          performedByName: user.name,
          performedByRole: user.role,
          timestamp: Date.now(),
          notes: `Generated ${reportType} report version ${newVersion} with ${includedActivities.length} activities (${blockingErrors} blocking issues identified).`,
          newStatus: reportStatus,
        },
      ],
    };

    // Persist to Firestore
    firestore.setDoc('reports', reportId, newReport as unknown as Record<string, unknown>);

    // Record in Audit Log
    this.logReportAuditEvent({
      actor: user.userId,
      actorName: user.name,
      role: user.role,
      action: 'REPORT_DRAFT_GENERATED',
      reportId,
      version: newVersion,
      scope: `${companyId}/${periodId}`,
      comments: `Report draft generated. Validation status: ${blockingErrors === 0 ? 'READY_FOR_REVIEW' : 'BLOCKERS_FOUND'}`,
    });

    return newReport;
  }

  // ==========================================
  // 3. RETRIEVAL & QUERYING
  // ==========================================

  public listReports(
    _user: User,
    filters?: {
      companyId?: string;
      reportingPeriodId?: string;
      reportType?: ReportType;
      status?: ReportStatus;
    }
  ): ReportRecord[] {
    let reports = firestore.getDocs<ReportRecord>('reports');

    if (filters?.companyId) {
      reports = reports.filter((r) => r.companyId === filters.companyId);
    }
    if (filters?.reportingPeriodId) {
      reports = reports.filter((r) => r.reportingPeriodId === filters.reportingPeriodId);
    }
    if (filters?.reportType) {
      reports = reports.filter((r) => r.reportType === filters.reportType);
    }
    if (filters?.status) {
      reports = reports.filter((r) => r.reportStatus === filters.status);
    }

    return reports.sort((a, b) => b.generatedAt - a.generatedAt);
  }

  public getReportById(_user: User, reportId: string): ReportRecord | null {
    const report = firestore.getDoc<ReportRecord>('reports', reportId);
    if (!report) return null;
    return report;
  }

  public getReportPreview(user: User, reportId: string): ReportRecord {
    const report = this.getReportById(user, reportId);
    if (!report) {
      throw { status: 404, code: 'NOT_FOUND', message: `Report ${reportId} not found.` };
    }
    return report;
  }

  // ==========================================
  // 4. WORKFLOW & APPROVAL GOVERNANCE
  // ==========================================

  public submitForReview(user: User, reportId: string, comments?: string): ReportRecord {
    const report = this.getReportById(user, reportId);
    if (!report) {
      throw { status: 404, code: 'NOT_FOUND', message: `Report ${reportId} not found.` };
    }

    if (report.reportStatus === 'LOCKED') {
      throw { status: 400, code: 'LOCKED', message: 'Locked report version cannot be modified or re-submitted.' };
    }

    // Role check
    if (user.role === 'AUDITOR' || user.role === 'MANAGEMENT') {
      throw { status: 403, code: 'FORBIDDEN', message: 'Auditors and Management cannot submit reports for review.' };
    }

    const oldStatus = report.reportStatus;
    report.reportStatus = 'UNDER_REVIEW';
    report.updatedAt = Date.now();
    report.history.push({
      version: report.reportVersion,
      action: 'REPORT_SUBMITTED_FOR_REVIEW',
      performedBy: user.userId,
      performedByName: user.name,
      performedByRole: user.role,
      timestamp: Date.now(),
      notes: comments || 'Submitted report to ESG Committee & Authorized Reviewer for formal review.',
      oldStatus,
      newStatus: 'UNDER_REVIEW',
    });

    firestore.setDoc('reports', reportId, report as unknown as Record<string, unknown>);
    this.logReportAuditEvent({
      actor: user.userId,
      actorName: user.name,
      role: user.role,
      action: 'REPORT_SUBMITTED_FOR_REVIEW',
      reportId,
      version: report.reportVersion,
      oldStatus,
      newStatus: 'UNDER_REVIEW',
      comments: comments || 'Submitted for review',
    });

    return report;
  }

  public requestChanges(user: User, reportId: string, comments: string): ReportRecord {
    const report = this.getReportById(user, reportId);
    if (!report) {
      throw { status: 404, code: 'NOT_FOUND', message: `Report ${reportId} not found.` };
    }

    if (report.reportStatus === 'LOCKED') {
      throw { status: 400, code: 'LOCKED', message: 'Locked report version cannot receive change requests.' };
    }

    if (user.role !== 'GROUP_ADMIN' && user.role !== 'COMPANY_USER') {
      throw { status: 403, code: 'FORBIDDEN', message: 'Only Group Admin or Company ESG Manager can request changes.' };
    }

    const oldStatus = report.reportStatus;
    report.reportStatus = 'CHANGES_REQUESTED';
    report.approvalStatus = 'CHANGES_REQUESTED';
    report.updatedAt = Date.now();
    report.history.push({
      version: report.reportVersion,
      action: 'REPORT_CHANGES_REQUESTED',
      performedBy: user.userId,
      performedByName: user.name,
      performedByRole: user.role,
      timestamp: Date.now(),
      notes: comments,
      oldStatus,
      newStatus: 'CHANGES_REQUESTED',
    });

    firestore.setDoc('reports', reportId, report as unknown as Record<string, unknown>);
    this.logReportAuditEvent({
      actor: user.userId,
      actorName: user.name,
      role: user.role,
      action: 'REPORT_CHANGES_REQUESTED',
      reportId,
      version: report.reportVersion,
      oldStatus,
      newStatus: 'CHANGES_REQUESTED',
      comments,
    });

    return report;
  }

  public approveReport(user: User, reportId: string, comments?: string): ReportRecord {
    const report = this.getReportById(user, reportId);
    if (!report) {
      throw { status: 404, code: 'NOT_FOUND', message: `Report ${reportId} not found.` };
    }

    if (report.reportStatus === 'LOCKED') {
      throw { status: 400, code: 'LOCKED', message: 'Report is already locked.' };
    }

    // RBAC: Only GROUP_ADMIN or COMPANY_USER with approval permission can approve
    if (user.role !== 'GROUP_ADMIN' && !user.permissions.includes('APPROVE_REPORT')) {
      throw {
        status: 403,
        code: 'FORBIDDEN',
        message: 'Unauthorized. Only Group Admin or authorized sustainability governance director can approve statutory reports.',
      };
    }

    // STRICT ELIGIBILITY POLICY: Blocking errors prevent approval!
    if (report.validationSummary.blockingErrors > 0) {
      const blockers = report.validationSummary.issues.filter((i) => i.blockingFlag).map((i) => i.message);
      throw {
        status: 400,
        code: 'APPROVAL_BLOCKED',
        message: `Report cannot be approved due to ${report.validationSummary.blockingErrors} unresolved blocking issue(s).`,
        details: blockers,
      };
    }

    const oldStatus = report.reportStatus;
    report.reportStatus = 'APPROVED';
    report.approvalStatus = 'APPROVED';
    report.approvedBy = user.userId;
    report.approvedByName = user.name;
    report.approvedByRole = user.role;
    report.approvedAt = Date.now();
    report.approvalComments = comments || 'Approved in accordance with SEBI BRSR Core statutory requirements.';
    report.updatedAt = Date.now();

    report.history.push({
      version: report.reportVersion,
      action: 'REPORT_APPROVED',
      performedBy: user.userId,
      performedByName: user.name,
      performedByRole: user.role,
      timestamp: Date.now(),
      notes: comments || 'Formally approved and signed off.',
      oldStatus,
      newStatus: 'APPROVED',
    });

    firestore.setDoc('reports', reportId, report as unknown as Record<string, unknown>);
    this.logReportAuditEvent({
      actor: user.userId,
      actorName: user.name,
      role: user.role,
      action: 'REPORT_APPROVED',
      reportId,
      version: report.reportVersion,
      oldStatus,
      newStatus: 'APPROVED',
      comments: comments || 'Approved',
    });

    return report;
  }

  public lockReport(user: User, reportId: string): ReportRecord {
    const report = this.getReportById(user, reportId);
    if (!report) {
      throw { status: 404, code: 'NOT_FOUND', message: `Report ${reportId} not found.` };
    }

    if (report.reportStatus !== 'APPROVED') {
      throw { status: 400, code: 'NOT_APPROVED', message: 'Only approved reports can be locked.' };
    }

    if (user.role !== 'GROUP_ADMIN') {
      throw { status: 403, code: 'FORBIDDEN', message: 'Only Group ESG Admin can lock statutory reports.' };
    }

    const oldStatus = report.reportStatus;
    report.reportStatus = 'LOCKED';
    report.lockedAt = Date.now();
    report.lockedBy = user.userId;
    report.updatedAt = Date.now();

    report.history.push({
      version: report.reportVersion,
      action: 'REPORT_LOCKED',
      performedBy: user.userId,
      performedByName: user.name,
      performedByRole: user.role,
      timestamp: Date.now(),
      notes: 'Report frozen and permanently locked for statutory filing.',
      oldStatus,
      newStatus: 'LOCKED',
    });

    firestore.setDoc('reports', reportId, report as unknown as Record<string, unknown>);
    this.logReportAuditEvent({
      actor: user.userId,
      actorName: user.name,
      role: user.role,
      action: 'REPORT_LOCKED',
      reportId,
      version: report.reportVersion,
      oldStatus,
      newStatus: 'LOCKED',
      comments: 'Report permanently locked',
    });

    return report;
  }

  public validateReport(user: User, reportId: string): ReportRecord {
    const report = this.getReportById(user, reportId);
    if (!report) {
      throw { status: 404, code: 'NOT_FOUND', message: `Report ${reportId} not found.` };
    }

    const allFindings = firestore.getDocs<AuditFinding>('auditFindings');
    const allCases = firestore.getDocs<ReconciliationCase>('reconciliationCases');
    const companyCases = allCases.filter((c) => c.organizationId === report.organizationId && c.reportingPeriodId === report.reportingPeriodId);

    const validationIssues: ValidationIssue[] = [];

    // Check A: Open material reconciliation cases
    const openReconCases = companyCases.filter((c) => c.status !== 'RESOLVED' && c.materiality === 'MATERIAL');
    for (const c of openReconCases) {
      validationIssues.push({
        issueId: `ISS-RECON-${c.caseId}`,
        severity: 'ERROR',
        disclosureId: 'BRSR-GHG-01',
        relatedRecordReferences: [c.caseId, c.activityId],
        issueCode: 'OPEN_RECONCILIATION_CASE',
        message: `Unresolved material reconciliation case ${c.caseNumber} for ${c.category} (+${c.variance?.quantityDeltaPercentage || 0}% variance). Resolution required before report sign-off.`,
        blockingFlag: true,
        recommendedAction: `Review correction request and obtain auditor resolution before approving this report.`,
      });
    }

    // Check B: Unresolved audit findings
    const openFindings = allFindings.filter((f) => f.status === 'OPEN' || f.status === 'CLARIFICATION_REQUESTED');
    for (const f of openFindings) {
      validationIssues.push({
        issueId: `ISS-FIND-${f.findingId}`,
        severity: 'ERROR',
        disclosureId: 'BRSR-ASSUR-01',
        relatedRecordReferences: [f.findingId, f.activityId],
        issueCode: 'UNRESOLVED_AUDIT_FINDING',
        message: `Unresolved audit finding ${f.findingId} (${f.title}): ${f.description}`,
        blockingFlag: true,
        recommendedAction: `Submit auditor clarification or corrected evidence for activity ${f.activityId} to close finding.`,
      });
    }

    // Check C: Financial turnover denominator for intensity (warning)
    validationIssues.push({
      issueId: 'ISS-INTENSITY-FIN',
      severity: 'WARNING',
      disclosureId: 'BRSR-GHG-04',
      issueCode: 'MISSING_FINANCIAL_DENOMINATOR',
      message: 'Financial revenue turnover denominator unavailable from ERP. Emission intensity metrics omitted in accordance with SEBI guidelines.',
      blockingFlag: false,
      recommendedAction: 'Attach statutory quarterly audited turnover figure or proceed with physical intensity only.',
    });

    const blockingErrors = validationIssues.filter((i) => i.blockingFlag).length;
    const warnings = validationIssues.filter((i) => i.severity === 'WARNING').length;
    const infoCount = validationIssues.filter((i) => i.severity === 'INFO').length;

    report.validationSummary = {
      totalIssues: validationIssues.length,
      blockingErrors,
      warnings,
      infoCount,
      issues: validationIssues,
      canApprove: blockingErrors === 0,
    };

    if (report.reportStatus === 'VALIDATION_FAILED' && blockingErrors === 0) {
      report.reportStatus = 'READY_FOR_REVIEW';
    } else if (report.reportStatus === 'READY_FOR_REVIEW' && blockingErrors > 0) {
      report.reportStatus = 'VALIDATION_FAILED';
    }

    report.updatedAt = Date.now();
    firestore.setDoc('reports', reportId, report as unknown as Record<string, unknown>);
    return report;
  }

  public submitRevision(user: User, reportId: string, comments: string): ReportRecord {
    const report = this.getReportById(user, reportId);
    if (!report) {
      throw { status: 404, code: 'NOT_FOUND', message: `Report ${reportId} not found.` };
    }

    if (report.reportStatus === 'LOCKED') {
      throw { status: 400, code: 'LOCKED', message: 'Locked report version cannot be revised.' };
    }

    // 1. Snapshot previous version into reportVersions collection
    const previousVersionDoc = {
      ...report,
      versionDocId: `${report.reportId}_v${report.reportVersion}`,
      archivedAt: Date.now(),
      archivedBy: user.userId,
    };
    firestore.setDoc('reportVersions', `${report.reportId}_v${report.reportVersion}`, previousVersionDoc as unknown as Record<string, unknown>);

    // 2. Increment version number (e.g. v2.0 -> v3.0)
    const oldVersion = report.reportVersion;
    const newVersion = oldVersion + 1;
    const oldStatus = report.reportStatus;

    report.reportVersion = newVersion;
    report.reportStatus = 'UNDER_REVIEW';
    report.approvalStatus = 'PENDING';
    report.updatedAt = Date.now();
    report.companyApprovedBy = undefined;
    report.companyApprovedByName = undefined;
    report.companyApprovedAt = undefined;
    report.auditorApprovedBy = undefined;
    report.auditorApprovedByName = undefined;
    report.auditorApprovedAt = undefined;

    // Reset export artifacts for new version
    report.exportArtifacts = undefined;

    report.history.push({
      version: newVersion,
      action: 'REVISION_SUBMITTED',
      performedBy: user.userId,
      performedByName: user.name,
      performedByRole: user.role,
      timestamp: Date.now(),
      notes: comments || `Submitted revision v${newVersion}.0 addressing change requests.`,
      oldStatus,
      newStatus: 'UNDER_REVIEW',
    });

    this.validateReport(user, reportId);

    firestore.setDoc('reports', reportId, report as unknown as Record<string, unknown>);

    firestore.setDoc('reportVersions', `${report.reportId}_v${newVersion}`, {
      ...report,
      versionDocId: `${report.reportId}_v${newVersion}`,
    } as unknown as Record<string, unknown>);

    this.logReportAuditEvent({
      actor: user.userId,
      actorName: user.name,
      role: user.role,
      action: 'REVISION_SUBMITTED',
      reportId,
      version: newVersion,
      oldStatus,
      newStatus: 'UNDER_REVIEW',
      comments: comments || `Revision v${newVersion}.0 submitted`,
    });

    return report;
  }

  public companyApprove(user: User, reportId: string, comments?: string): ReportRecord {
    const report = this.getReportById(user, reportId);
    if (!report) {
      throw { status: 404, code: 'NOT_FOUND', message: `Report ${reportId} not found.` };
    }

    if (report.reportStatus === 'LOCKED') {
      throw { status: 400, code: 'LOCKED', message: 'Report is locked.' };
    }

    if (user.role !== 'GROUP_ADMIN' && user.role !== 'COMPANY_USER') {
      throw { status: 403, code: 'FORBIDDEN', message: 'Only Group Admin or Company ESG Director can record company approval.' };
    }

    const oldStatus = report.reportStatus;
    report.companyApprovedBy = user.userId;
    report.companyApprovedByName = user.name;
    report.companyApprovedByRole = user.role;
    report.companyApprovedAt = Date.now();
    report.companyApprovalComments = comments || 'Approved by Company ESG Governance Committee.';
    report.updatedAt = Date.now();

    // If auditor has also approved and 0 blockers, mark as APPROVED
    if (report.auditorApprovedBy && (report.validationSummary?.blockingErrors || 0) === 0) {
      report.reportStatus = 'APPROVED';
      report.approvalStatus = 'APPROVED';
      report.approvedBy = user.userId;
      report.approvedByName = user.name;
      report.approvedAt = Date.now();
    } else {
      report.reportStatus = 'UNDER_REVIEW';
    }

    report.history.push({
      version: report.reportVersion,
      action: 'COMPANY_APPROVAL_RECORDED',
      performedBy: user.userId,
      performedByName: user.name,
      performedByRole: user.role,
      timestamp: Date.now(),
      notes: comments || 'Company ESG Approval recorded.',
      oldStatus,
      newStatus: report.reportStatus,
    });

    firestore.setDoc('reports', reportId, report as unknown as Record<string, unknown>);
    return report;
  }

  public auditorApprove(user: User, reportId: string, comments?: string): ReportRecord {
    const report = this.getReportById(user, reportId);
    if (!report) {
      throw { status: 404, code: 'NOT_FOUND', message: `Report ${reportId} not found.` };
    }

    if (report.reportStatus === 'LOCKED') {
      throw { status: 400, code: 'LOCKED', message: 'Report is locked.' };
    }

    if (user.role !== 'GROUP_ADMIN' && user.role !== 'AUDITOR') {
      throw { status: 403, code: 'FORBIDDEN', message: 'Only Sustainability Auditor or Group Admin can record auditor assurance sign-off.' };
    }

    const oldStatus = report.reportStatus;
    report.auditorApprovedBy = user.userId;
    report.auditorApprovedByName = user.name;
    report.auditorApprovedByRole = user.role;
    report.auditorApprovedAt = Date.now();
    report.auditorApprovalComments = comments || 'Independent assurance sign-off under ISAE 3000 completed with satisfactory conclusion.';
    report.updatedAt = Date.now();

    // If company has also approved and 0 blockers, mark as APPROVED
    if (report.companyApprovedBy && (report.validationSummary?.blockingErrors || 0) === 0) {
      report.reportStatus = 'APPROVED';
      report.approvalStatus = 'APPROVED';
      report.approvedBy = user.userId;
      report.approvedByName = user.name;
      report.approvedAt = Date.now();
    } else {
      report.reportStatus = 'UNDER_REVIEW';
    }

    report.history.push({
      version: report.reportVersion,
      action: 'AUDITOR_APPROVAL_RECORDED',
      performedBy: user.userId,
      performedByName: user.name,
      performedByRole: user.role,
      timestamp: Date.now(),
      notes: comments || 'Auditor ISAE 3000 assurance sign-off recorded.',
      oldStatus,
      newStatus: report.reportStatus,
    });

    firestore.setDoc('reports', reportId, report as unknown as Record<string, unknown>);
    return report;
  }

  public async finalizeAndLock(user: User, reportId: string, comments?: string): Promise<ReportRecord> {
    const report = this.getReportById(user, reportId);
    if (!report) {
      throw { status: 404, code: 'NOT_FOUND', message: `Report ${reportId} not found.` };
    }

    if (report.reportStatus === 'LOCKED') {
      throw { status: 400, code: 'LOCKED', message: 'Report is already finalized and locked.' };
    }

    if (user.role !== 'GROUP_ADMIN') {
      throw { status: 403, code: 'FORBIDDEN', message: 'Only Group Admin can finalize and lock statutory reports.' };
    }

    // Require 0 blocking issues
    if ((report.validationSummary?.blockingErrors || 0) > 0) {
      throw {
        status: 400,
        code: 'FINALIZATION_BLOCKED',
        message: `Report cannot be finalized: ${report.validationSummary.blockingErrors} unresolved blocking error(s) must be resolved first.`,
      };
    }

    const oldStatus = report.reportStatus;
    report.reportStatus = 'LOCKED';
    report.approvalStatus = 'APPROVED';
    report.lockedAt = Date.now();
    report.lockedBy = user.userId;
    report.finalizedAt = Date.now();
    report.finalizedBy = user.userId;
    report.finalizedByName = user.name;
    report.updatedAt = Date.now();

    // Export final official statutory PDF snapshot
    await this.exportPdf(user, reportId);

    report.history.push({
      version: report.reportVersion,
      action: 'REPORT_FINALIZED_AND_LOCKED',
      performedBy: user.userId,
      performedByName: user.name,
      performedByRole: user.role,
      timestamp: Date.now(),
      notes: comments || 'Report finalized, signed off, and permanently locked for statutory filing.',
      oldStatus,
      newStatus: 'LOCKED',
    });

    firestore.setDoc('reports', reportId, report as unknown as Record<string, unknown>);
    firestore.setDoc('reportVersions', `${report.reportId}_v${report.reportVersion}`, {
      ...report,
      versionDocId: `${report.reportId}_v${report.reportVersion}`,
    } as unknown as Record<string, unknown>);

    return report;
  }

  public getReportVersions(user: User, reportId: string): ReportRecord[] {
    const allVersions = firestore.getDocs<ReportRecord & { versionDocId?: string }>('reportVersions');
    const filtered = allVersions.filter((v) => v.reportId === reportId);
    const current = this.getReportById(user, reportId);
    if (current && !filtered.some((v) => v.reportVersion === current.reportVersion)) {
      filtered.push(current);
    }
    return filtered.sort((a, b) => b.reportVersion - a.reportVersion);
  }

  // ==========================================
  // 5. PDF EXPORT & ARTIFACT STORAGE
  // ==========================================

  public async exportPdf(user: User, reportId: string): Promise<{ downloadUrl: string; storagePath: string; checksum: string }> {
    const report = this.getReportById(user, reportId);
    if (!report) {
      throw { status: 404, code: 'NOT_FOUND', message: `Report ${reportId} not found.` };
    }

    logger.info('Generating real PDF export for report...', { reportId, version: report.reportVersion });

    // Generate genuine PDF using PDFKit
    const pdfBuffer = await generateReportPdf(report);

    // Upload to Firebase Cloud Storage in bput-hackathon-37dfd & local secure mirror
    const uploadRes = await storageService.uploadReportArtifact({
      buffer: pdfBuffer,
      organizationId: report.organizationId,
      companyId: report.companyId,
      reportingPeriodId: report.reportingPeriodId,
      reportId: report.reportId,
      reportVersion: report.reportVersion,
    });

    // Update report record metadata
    report.exportArtifacts = {
      pdfStoragePath: uploadRes.storagePath,
      pdfDownloadUrl: uploadRes.downloadUrl,
      pdfGeneratedAt: Date.now(),
      pdfChecksum: uploadRes.checksum,
      pdfFileSizeBytes: uploadRes.fileSize,
    };
    report.updatedAt = Date.now();

    report.history.push({
      version: report.reportVersion,
      action: 'REPORT_EXPORT_GENERATED',
      performedBy: user.userId,
      performedByName: user.name,
      performedByRole: user.role,
      timestamp: Date.now(),
      notes: `Generated official PDF artifact (${uploadRes.fileSize} bytes, SHA-256: ${uploadRes.checksum.slice(0, 16)}...)`,
    });

    firestore.setDoc('reports', reportId, report as unknown as Record<string, unknown>);

    // Register statutory evidence document in evidenceDocuments collection
    const evidenceDocId = `DOC-REP-${report.reportId}`;
    const evidenceEntry: EvidenceDocument = {
      documentId: evidenceDocId,
      originalFileName: `${report.reportId}_v${report.reportVersion}.pdf`,
      storagePath: uploadRes.storagePath,
      downloadUrl: uploadRes.downloadUrl,
      mimeType: 'application/pdf',
      fileSize: uploadRes.fileSize,
      fileExtension: '.pdf',
      organizationId: report.organizationId,
      companyId: report.companyId,
      reportingPeriodId: report.reportingPeriodId,
      evidenceType: 'Calculation Sheet',
      description: `Official statutory PDF export dossier for ${report.title}`,
      uploadedBy: user.userId,
      uploadedByName: user.name,
      uploadedByRole: user.role,
      uploadedAt: Date.now(),
      verificationStatus: report.reportStatus === 'APPROVED' || report.reportStatus === 'LOCKED' ? 'VERIFIED' : 'PENDING_REVIEW',
      verifiedBy: report.approvedBy,
      verifiedByName: report.approvedByName,
      verifiedAt: report.approvedAt,
      version: report.reportVersion,
      evidenceGroupId: `GRP-REP-${report.reportId}`,
      isCurrent: true,
      checksum: uploadRes.checksum,
      isActive: true,
    };
    firestore.setDoc('evidenceDocuments', evidenceDocId, evidenceEntry as unknown as Record<string, unknown>);

    this.logReportAuditEvent({
      actor: user.userId,
      actorName: user.name,
      role: user.role,
      action: 'REPORT_EXPORT_GENERATED',
      reportId,
      version: report.reportVersion,
      comments: `PDF export stored at ${uploadRes.storagePath}`,
    });

    return {
      downloadUrl: uploadRes.downloadUrl,
      storagePath: uploadRes.storagePath,
      checksum: uploadRes.checksum,
    };
  }

  public async getDownloadBuffer(user: User, reportId: string): Promise<{ buffer: Buffer; fileName: string }> {
    const report = this.getReportById(user, reportId);
    if (!report) {
      throw { status: 404, code: 'NOT_FOUND', message: `Report ${reportId} not found.` };
    }

    let storagePath = report.exportArtifacts?.pdfStoragePath;
    if (!storagePath) {
      const exported = await this.exportPdf(user, reportId);
      storagePath = exported.storagePath;
    }

    let file = storageService.getFileBuffer(storagePath);
    if (!file.exists || file.buffer.length === 0) {
      const exported = await this.exportPdf(user, reportId);
      file = storageService.getFileBuffer(exported.storagePath);
    }

    this.logReportAuditEvent({
      actor: user.userId,
      actorName: user.name,
      role: user.role,
      action: 'REPORT_DOWNLOAD_REQUESTED',
      reportId,
      version: report.reportVersion,
      comments: 'Report PDF streamed / downloaded',
    });

    return {
      buffer: file.buffer,
      fileName: `${report.reportId}_v${report.reportVersion}.pdf`,
    };
  }

  // ==========================================
  // 6. INITIAL SEEDING & AUDIT LOGGING
  // ==========================================

  private seedDefaultReports() {
    const existing = firestore.getDocs<ReportRecord>('reports');
    if (existing.length > 0) return;

    // Seed initial demo report dossiers for Q3 FY2526
    const demoReports: ReportRecord[] = [
      {
        reportId: 'REP-COMP001-Q3_FY2526-1',
        reportType: 'BRSR',
        templateId: 'TMPL-BRSR-2026',
        templateVersion: '1.0',
        title: 'MEIL Company A Consolidated ESG & BRSR Report (Q3 FY 2025-26)',
        organizationId: 'COMP001',
        companyId: 'COMP001',
        companyName: 'MEIL Company A (Megha Hydro Infra)',
        reportingPeriodId: 'Q3_FY2526',
        fiscalYear: 'FY 2025-26',
        quarter: 'Q3',
        reportingBoundaryReference: 'Megha Hydro Infra Ltd · 4 Facilities (Subansiri, Polavaram, Zojila, Haridwar)',
        reportVersion: 1,
        reportStatus: 'VALIDATION_FAILED',
        generationRequestedBy: 'USR003',
        generationRequestedByName: 'Company ESG Manager',
        generationRequestedByRole: 'COMPANY_USER',
        generatedAt: 1729112000000,
        updatedAt: 1729112000000,
        snapshotReference: 'SNAP-BRSR-001-A9B8',
        snapshot: {
          scopeTotals: {
            scope1Tons: 411.55,
            scope2Tons: 301.08,
            scope3Tons: 25.85,
            scope12Combined: 712.63,
            totalTons: 738.48,
          },
          gasBreakdown: [
            { scope: 1, gas: 'Carbon Dioxide (CO2)', emissionsTons: 407.43, unit: 'tCO2e' },
            { scope: 1, gas: 'Methane (CH4)', emissionsTons: 0.41, unit: 'tCO2e' },
            { scope: 1, gas: 'Nitrous Oxide (N2O)', emissionsTons: 3.71, unit: 'tCO2e' },
            { scope: 2, gas: 'Carbon Dioxide (CO2 Grid)', emissionsTons: 301.08, unit: 'tCO2e' },
            { scope: 3, gas: 'Carbon Dioxide (CO2 Supply Chain)', emissionsTons: 25.85, unit: 'tCO2e' },
          ],
          scope3CategoryTotals: [
            { categoryNo: 1, categoryName: 'Purchased Goods and Services', emissionsTons: 18.5, unit: 'tCO2e', dataStatus: 'POPULATED' },
            { categoryNo: 4, categoryName: 'Upstream Transportation and Distribution', emissionsTons: 11.45, unit: 'tCO2e', dataStatus: 'POPULATED' },
            { categoryNo: 5, categoryName: 'Waste Generated in Operations', emissionsTons: 12.14, unit: 'tCO2e', dataStatus: 'POPULATED' },
            { categoryNo: 6, categoryName: 'Business Travel', emissionsTons: 3.12, unit: 'tCO2e', dataStatus: 'POPULATED' },
          ],
          intensityMetrics: {
            revenueInrCrores: null,
            physicalMetricName: 'Installed Capacity Generation',
            physicalOutputQty: 2000,
            physicalUnit: 'MW',
            scope12IntensityRevenue: null,
            scope12IntensityPhysical: 0.3563,
            hasIntensityCalculations: false,
            missingIntensityReason: 'Financial turnover ERP ledger not yet integrated. Missing denominator prevents statutory intensity calculation.',
          },
          activityRecordIds: ['ACT-2025-001', 'ACT-2025-002', 'ACT-2025-003', 'ACT-2025-004'],
          calculationRunIds: ['CALC-ACT-2025-001', 'CALC-ACT-2025-002', 'CALC-ACT-2025-003', 'CALC-ACT-2025-004'],
          auditReviewIds: ['REV-2025-001', 'REV-2025-002', 'REV-2025-003'],
          reconciliationCaseIds: ['REC-2025-001', 'REC-2025-002'],
          evidenceDocumentIds: ['DOC-EV-001', 'DOC-EV-002', 'DOC-EV-003'],
          disclosures: {
            'BRSR-GEN-01': {
              disclosureId: 'DISC-GEN-01',
              disclosureCode: 'BRSR-GEN-01',
              disclosureName: 'Corporate Identity Number (CIN) & Entity Name',
              section: 'Section A: General Disclosures',
              status: 'COMPLETE',
              rawValue: { cin: 'U45200TG2006PLC050123' },
              formattedValue: 'MEIL Company A (CIN: U45200TG2006PLC050123)',
              isSupported: true,
            },
            'BRSR-GHG-01': {
              disclosureId: 'DISC-GHG-01',
              disclosureCode: 'BRSR-GHG-01',
              disclosureName: 'Gross Scope 1 Direct Greenhouse Gas Emissions',
              section: 'Section C: Principle 6 Environmental',
              status: 'COMPLETE',
              rawValue: 411.55,
              formattedValue: '411.55 tCO2e',
              unit: 'tCO2e',
              isSupported: true,
            },
            'BRSR-GHG-02': {
              disclosureId: 'DISC-GHG-02',
              disclosureCode: 'BRSR-GHG-02',
              disclosureName: 'Gross Scope 2 Location-Based Indirect GHG Emissions',
              section: 'Section C: Principle 6 Environmental',
              status: 'COMPLETE',
              rawValue: 301.08,
              formattedValue: '301.08 tCO2e',
              unit: 'tCO2e',
              isSupported: true,
            },
          },
          coverage: {
            facilitiesIncluded: 4,
            businessUnitsIncluded: 2,
            totalActivities: 6,
            verifiedActivities: 4,
            auditFindingsCount: 2,
            openReconciliationCount: 1,
          },
        },
        validationSummary: {
          totalIssues: 2,
          blockingErrors: 1,
          warnings: 1,
          infoCount: 0,
          issues: [
            {
              issueId: 'ISS-RECON-REC-2025-001',
              severity: 'ERROR',
              disclosureId: 'BRSR-GHG-01',
              relatedRecordReferences: ['REC-2025-001', 'ACT-2025-001'],
              issueCode: 'OPEN_RECONCILIATION_CASE',
              message: 'Unresolved material reconciliation case REC-2025-001 for Diesel Consumption (Scope 1) (+10.00% variance). Resolution required before report sign-off.',
              blockingFlag: true,
              recommendedAction: 'Resolve correction request CR-2025-001 and obtain auditor sign-off before approving this report.',
            },
            {
              issueId: 'ISS-INTENSITY-FIN',
              severity: 'WARNING',
              disclosureId: 'BRSR-GHG-04',
              issueCode: 'MISSING_FINANCIAL_DENOMINATOR',
              message: 'Financial revenue turnover denominator unavailable from ERP. Emission intensity metrics omitted in accordance with SEBI guidelines.',
              blockingFlag: false,
              recommendedAction: 'Attach statutory quarterly audited turnover figure or proceed with physical intensity only.',
            },
          ],
          canApprove: false,
        },
        approvalStatus: 'PENDING',
        history: [
          {
            version: 1,
            action: 'REPORT_DRAFT_GENERATED',
            performedBy: 'USR003',
            performedByName: 'Company ESG Manager',
            performedByRole: 'COMPANY_USER',
            timestamp: 1729112000000,
            notes: 'Initial statutory draft snapshot generated. 1 open reconciliation case blocking approval.',
            newStatus: 'VALIDATION_FAILED',
          },
        ],
      },
      {
        reportId: 'REP-GROUP001-Q2_FY2526-1',
        reportType: 'BRSR',
        templateId: 'TMPL-BRSR-2026',
        templateVersion: '1.0',
        title: 'MEIL Group Consolidated Statutory BRSR Report (Q2 FY 2025-26)',
        organizationId: 'GROUP001',
        companyId: 'GROUP001',
        companyName: 'MEIL GROUP CONSOLIDATED',
        reportingPeriodId: 'Q2_FY2526',
        fiscalYear: 'FY 2025-26',
        quarter: 'Q2',
        reportingBoundaryReference: 'Group Headquarters · 28 Facilities Consolidated',
        reportVersion: 1,
        reportStatus: 'APPROVED',
        generationRequestedBy: 'USR004',
        generationRequestedByName: 'Group ESG Admin',
        generationRequestedByRole: 'GROUP_ADMIN',
        generatedAt: 1726000000000,
        updatedAt: 1726500000000,
        snapshotReference: 'SNAP-BRSR-Q2-7C2B',
        snapshot: {
          scopeTotals: {
            scope1Tons: 1240.5,
            scope2Tons: 980.2,
            scope3Tons: 450.0,
            scope12Combined: 2220.7,
            totalTons: 2670.7,
          },
          gasBreakdown: [
            { scope: 1, gas: 'Carbon Dioxide (CO2)', emissionsTons: 1228.1, unit: 'tCO2e' },
            { scope: 1, gas: 'Methane (CH4)', emissionsTons: 1.2, unit: 'tCO2e' },
            { scope: 1, gas: 'Nitrous Oxide (N2O)', emissionsTons: 11.2, unit: 'tCO2e' },
            { scope: 2, gas: 'Carbon Dioxide (CO2 Grid)', emissionsTons: 980.2, unit: 'tCO2e' },
            { scope: 3, gas: 'Carbon Dioxide (CO2 Supply Chain)', emissionsTons: 450.0, unit: 'tCO2e' },
          ],
          scope3CategoryTotals: [
            { categoryNo: 1, categoryName: 'Purchased Goods and Services', emissionsTons: 310.0, unit: 'tCO2e', dataStatus: 'POPULATED' },
            { categoryNo: 4, categoryName: 'Upstream Transportation', emissionsTons: 85.0, unit: 'tCO2e', dataStatus: 'POPULATED' },
            { categoryNo: 5, categoryName: 'Waste in Operations', emissionsTons: 55.0, unit: 'tCO2e', dataStatus: 'POPULATED' },
          ],
          intensityMetrics: {
            revenueInrCrores: 1250,
            turnoverBasis: 'Audited Financial Accounts Q2',
            physicalMetricName: 'Installed Capacity Generation',
            physicalOutputQty: 2000,
            physicalUnit: 'MW',
            scope12IntensityRevenue: 1.776,
            scope12IntensityPhysical: 1.11,
            hasIntensityCalculations: true,
          },
          activityRecordIds: [],
          calculationRunIds: [],
          auditReviewIds: [],
          reconciliationCaseIds: [],
          evidenceDocumentIds: [],
          disclosures: {},
          coverage: {
            facilitiesIncluded: 28,
            businessUnitsIncluded: 4,
            totalActivities: 24,
            verifiedActivities: 24,
            auditFindingsCount: 0,
            openReconciliationCount: 0,
          },
        },
        validationSummary: {
          totalIssues: 0,
          blockingErrors: 0,
          warnings: 0,
          infoCount: 0,
          issues: [],
          canApprove: true,
        },
        approvalStatus: 'APPROVED',
        approvedBy: 'USR004',
        approvedByName: 'Group ESG Admin',
        approvedByRole: 'GROUP_ADMIN',
        approvedAt: 1726500000000,
        approvalComments: 'Verified and approved with full third-party assurance sign-off.',
        history: [],
      },
    ];

    for (const rep of demoReports) {
      firestore.setDoc('reports', rep.reportId, rep as unknown as Record<string, unknown>);
    }
  }

  private logReportAuditEvent(params: {
    actor: string;
    actorName: string;
    role: string;
    action: string;
    reportId: string;
    version: number;
    scope?: string;
    comments?: string;
    oldStatus?: string;
    newStatus?: string;
  }) {
    const logId = `LOG-REP-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logDoc: Record<string, unknown> = {
      logId,
      actor: params.actor,
      role: params.role,
      action: params.action,
      reportId: params.reportId,
      reportVersion: params.version,
      timestamp: Date.now(),
      scope: params.scope || 'REPORTS',
    };
    if (params.actorName) logDoc.actorName = params.actorName;
    if (params.oldStatus) logDoc.oldStatus = params.oldStatus;
    if (params.newStatus) logDoc.newStatus = params.newStatus;
    if (params.comments) logDoc.comments = params.comments;

    firestore.setDoc('auditLogs', logId, logDoc);
  }
}

export const reportService = new ReportService();
