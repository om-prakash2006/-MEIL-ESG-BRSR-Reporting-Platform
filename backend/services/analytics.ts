import { firestore } from './firestore.ts';
import { calculateDeterministicEmissions } from './calculationEngine.ts';
import type {
  ActivityRecord,
  AuditReview,
  AuditFinding,
  ReconciliationCase,
  ReportingPeriod,
  Facility,
  Project,
  BusinessUnit,
  Organization,
  User,
} from '../models/types.ts';
import { logger } from '../utils/logger.ts';

export interface AnalyticsScopeFilter {
  organizationId?: string;
  companyId?: string;
  businessUnitId?: string;
  projectId?: string;
  facilityId?: string;
  reportingPeriodId?: string;
}

export interface ScopeBreakdown {
  scope1Tons: number;
  scope2Tons: number;
  scope3Tons: number;
  totalTons: number;
  scope1Percentage: number;
  scope2Percentage: number;
  scope3Percentage: number;
}

export interface Scope1Analytics {
  stationaryCombustionTons: number;
  mobileCombustionTons: number;
  processEmissionsTons: number;
  fugitiveEmissionsTons: number;
  carbonCaptureTons: number; // Negative or deducted
  netScope1Tons: number;
}

export interface Scope2Analytics {
  locationBasedTons: number;
  marketBasedTons: number;
  gridElectricityTons: number;
  renewableZeroTons: number;
  steamAndThermalTons: number;
  coolingTons: number;
  renewablePercentage: number;
}

export interface Scope3CategoryAnalytics {
  categoryNo: number;
  name: string;
  emissionsTons: number;
  percentageOfScope3: number;
  recordCount: number;
  dataQualityStatus: 'HIGH' | 'MEDIUM' | 'ESTIMATED' | 'NO_DATA';
}

export interface FacilityBenchmarkItem {
  facilityId: string;
  facilityName: string;
  projectId?: string;
  businessUnitId?: string;
  scope1Tons: number;
  scope2Tons: number;
  scope3Tons: number;
  totalTons: number;
  percentageOfTotal: number;
  activityCount: number;
  verifiedCount: number;
}

export interface HistoricalComparison {
  currentPeriod: string;
  comparisonPeriod: string;
  currentTotalTons: number;
  comparisonTotalTons: number;
  absoluteDeltaTons: number;
  percentageChange: number;
  scope1DeltaTons: number;
  scope2DeltaTons: number;
  scope3DeltaTons: number;
  trend: 'INCREASING' | 'DECREASING' | 'STABLE';
}

export interface ReportingReadinessAnalytics {
  totalRecords: number;
  draftRecords: number;
  submittedRecords: number;
  reviewedRecords: number;
  approvedRecords: number;
  lockedRecords: number;
  verifiedPercentage: number;
  missingEvidenceCount: number;
  primaryDataPercentage: number;
  secondaryDataPercentage: number;
}

export interface AssuranceReconciliationAnalytics {
  totalAuditReviews: number;
  verifiedAuditReviews: number;
  openAuditFindings: number;
  criticalAuditFindings: number;
  auditCompletionRate: number;
  totalReconciliationCases: number;
  openReconciliationCases: number;
  resolvedReconciliationCases: number;
  reconciliationResolutionRate: number;
}

export interface AnomalyAlert {
  alertId: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';
  title: string;
  description: string;
  metricType: string;
  impactTons?: number;
  facilityId?: string;
  activityId?: string;
  recommendedAction: string;
}

export interface ComprehensiveAnalyticsOverview {
  filterApplied: AnalyticsScopeFilter;
  reportingPeriod: string;
  scopeBreakdown: ScopeBreakdown;
  gasBreakdown: {
    co2Tons: number;
    ch4Tons: number;
    n2oTons: number;
    sf6Tons: number;
    hfcsTons: number;
  };
  scope1Details: Scope1Analytics;
  scope2Details: Scope2Analytics;
  scope3Categories: Scope3CategoryAnalytics[];
  facilityBenchmarks: FacilityBenchmarkItem[];
  historicalComparison: HistoricalComparison;
  readiness: ReportingReadinessAnalytics;
  assurance: AssuranceReconciliationAnalytics;
  anomalies: AnomalyAlert[];
  computedAt: number;
}

export class AnalyticsService {
  /**
   * Filter activity records by organizational boundary and reporting period
   */
  public filterActivities(records: ActivityRecord[], filter: AnalyticsScopeFilter, user?: User): ActivityRecord[] {
    return records.filter((r) => {
      // User RBAC scope constraint
      if (user) {
        if (user.role === 'COMPANY_USER' && r.organizationId !== user.organizationId) return false;
        if (user.role === 'BUSINESS_UNIT_USER' && r.businessUnitId !== user.businessUnitId) return false;
        if (user.role === 'PROJECT_USER' && r.projectId !== user.projectId) return false;
      }

      // Filter query parameters
      if (filter.organizationId && r.organizationId !== filter.organizationId) return false;
      if (filter.companyId && r.companyId !== filter.companyId) return false;
      if (filter.businessUnitId && r.businessUnitId !== filter.businessUnitId) return false;
      if (filter.projectId && r.projectId !== filter.projectId) return false;
      if (filter.facilityId && r.facilityId !== filter.facilityId) return false;
      if (filter.reportingPeriodId && r.reportingPeriodId !== filter.reportingPeriodId) return false;

      return true;
    });
  }

  /**
   * Helper to obtain authoritative CO2e for a record using calculationEngine
   */
  public getRecordEmissions(r: ActivityRecord) {
    if (r.co2e !== undefined && r.co2e !== null) {
      return {
        tCO2e: r.co2e,
        grossKgCO2e: r.co2e * 1000,
        gasBreakdown: {
          co2Kg: r.co2e * 990,
          ch4Kg: r.co2e * 1,
          n2oKg: r.co2e * 9,
          sf6Kg: 0,
          hfcsKg: 0,
        },
      };
    }

    const calc = calculateDeterministicEmissions({
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
      isCarbonCapture: r.scope1Details?.category === 'Carbon Capture',
    });

    return {
      tCO2e: calc.tCO2e,
      grossKgCO2e: calc.grossKgCO2e,
      gasBreakdown: calc.gasBreakdown,
    };
  }

  /**
   * Generate complete deterministic analytics overview for given filters
   */
  public getOverview(filter: AnalyticsScopeFilter, user?: User): ComprehensiveAnalyticsOverview {
    const allRecords = firestore.getDocs<ActivityRecord>('activityRecords');
    const periods = firestore.getDocs<ReportingPeriod>('reportingPeriods');
    const currentPeriodId = filter.reportingPeriodId || 'Q3_FY2526';

    const currentRecords = this.filterActivities(allRecords, { ...filter, reportingPeriodId: currentPeriodId }, user);

    // Compute previous/comparison period records
    let comparisonPeriodId = 'Q2_FY2526';
    if (currentPeriodId === 'Q2_FY2526') comparisonPeriodId = 'Q1_FY2526';
    if (currentPeriodId === 'Q1_FY2526') comparisonPeriodId = 'Q4_FY2425';

    const comparisonRecords = this.filterActivities(allRecords, { ...filter, reportingPeriodId: comparisonPeriodId }, user);

    let scope1Tons = 0;
    let scope2Tons = 0;
    let scope3Tons = 0;

    let co2Kg = 0;
    let ch4Kg = 0;
    let n2oKg = 0;
    let sf6Kg = 0;
    let hfcsKg = 0;

    // Scope 1 sub-categories
    let stationaryCombustionTons = 0;
    let mobileCombustionTons = 0;
    let processEmissionsTons = 0;
    let fugitiveEmissionsTons = 0;
    let carbonCaptureTons = 0;

    // Scope 2 sub-categories
    let locationBasedTons = 0;
    let marketBasedTons = 0;
    let gridElectricityTons = 0;
    let renewableZeroTons = 0;
    let steamAndThermalTons = 0;
    let coolingTons = 0;
    let totalPurchasedMWh = 0;
    let renewableMWh = 0;

    // Scope 3 categories (1 to 15)
    const scope3CategoryMap: Record<number, { tons: number; count: number; primaryCount: number }> = {};
    for (let c = 1; c <= 15; c++) {
      scope3CategoryMap[c] = { tons: 0, count: 0, primaryCount: 0 };
    }

    // Facility aggregation
    const facilityMap: Record<string, { scope1: number; scope2: number; scope3: number; count: number; verified: number; proj?: string; bu?: string }> = {};

    // Process current records
    for (const r of currentRecords) {
      const calc = this.getRecordEmissions(r);
      const t = calc.tCO2e;

      co2Kg += calc.gasBreakdown.co2Kg;
      ch4Kg += calc.gasBreakdown.ch4Kg;
      n2oKg += calc.gasBreakdown.n2oKg;
      sf6Kg += calc.gasBreakdown.sf6Kg || 0;
      hfcsKg += calc.gasBreakdown.hfcsKg || 0;

      // Facility binning
      const facId = r.facilityId || 'FAC-GEN';
      if (!facilityMap[facId]) {
        facilityMap[facId] = { scope1: 0, scope2: 0, scope3: 0, count: 0, verified: 0, proj: r.projectId, bu: r.businessUnitId };
      }
      facilityMap[facId].count++;
      if (['APPROVED', 'LOCKED', 'ESG_REVIEWED'].includes(r.workflowStatus)) {
        facilityMap[facId].verified++;
      }

      if (r.scopeNo === 1) {
        scope1Tons += t;
        facilityMap[facId].scope1 += t;

        const cat = r.scope1Details?.category;
        const act = (r.activityTypeId || '').toUpperCase();
        if (cat === 'Carbon Capture' || act.includes('CAPTURE')) {
          carbonCaptureTons += Math.abs(t);
        } else if (cat === 'Mobile Combustion' || act.includes('FLEET') || act.includes('VEHICLE')) {
          mobileCombustionTons += t;
        } else if (cat === 'Process Emissions' || act.includes('PROCESS') || act.includes('CLINKER')) {
          processEmissionsTons += t;
        } else if (cat === 'Fugitive Emissions' || act.includes('REFRIG') || act.includes('SF6') || act.includes('FUGITIVE')) {
          fugitiveEmissionsTons += t;
        } else {
          stationaryCombustionTons += t;
        }
      } else if (r.scopeNo === 2) {
        scope2Tons += t;
        facilityMap[facId].scope2 += t;

        const isRen = r.scope2Details?.renewableFlag || r.scope2Details?.renewablePercentage === 100;
        const mwh = (Number(r.quantity) || 0) / 1000;
        totalPurchasedMWh += mwh;

        if (isRen) {
          renewableZeroTons += t;
          renewableMWh += mwh;
        } else {
          gridElectricityTons += t;
        }

        if (r.scope2Details?.accountingMethod === 'MARKET_BASED') {
          marketBasedTons += t;
        } else {
          locationBasedTons += t;
        }

        const act = (r.activityTypeId || '').toUpperCase();
        if (act.includes('STEAM')) steamAndThermalTons += t;
        if (act.includes('COOLING')) coolingTons += t;
      } else if (r.scopeNo === 3) {
        scope3Tons += t;
        facilityMap[facId].scope3 += t;

        const catNo = r.scope3CategoryNo || 1;
        if (catNo >= 1 && catNo <= 15) {
          scope3CategoryMap[catNo].tons += t;
          scope3CategoryMap[catNo].count++;
          if (r.scope3Details?.dataSourceType === 'SUPPLIER_VERIFIED_EPD' || r.dataMethod === 'SUPPLIER_DATA') {
            scope3CategoryMap[catNo].primaryCount++;
          }
        }
      }
    }

    const totalTons = Math.round((scope1Tons + scope2Tons + scope3Tons) * 100) / 100;
    scope1Tons = Math.round(scope1Tons * 100) / 100;
    scope2Tons = Math.round(scope2Tons * 100) / 100;
    scope3Tons = Math.round(scope3Tons * 100) / 100;

    const scopeBreakdown: ScopeBreakdown = {
      scope1Tons,
      scope2Tons,
      scope3Tons,
      totalTons,
      scope1Percentage: totalTons > 0 ? Math.round((scope1Tons / totalTons) * 1000) / 10 : 0,
      scope2Percentage: totalTons > 0 ? Math.round((scope2Tons / totalTons) * 1000) / 10 : 0,
      scope3Percentage: totalTons > 0 ? Math.round((scope3Tons / totalTons) * 1000) / 10 : 0,
    };

    // Scope 3 Category Metadata Names
    const scope3Names: Record<number, string> = {
      1: 'Purchased Goods and Services',
      2: 'Capital Goods',
      3: 'Fuel- and Energy-Related Activities',
      4: 'Upstream Transportation and Distribution',
      5: 'Waste Generated in Operations',
      6: 'Business Travel',
      7: 'Employee Commuting',
      8: 'Upstream Leased Assets',
      9: 'Downstream Transportation and Distribution',
      10: 'Processing of Sold Products',
      11: 'Use of Sold Products',
      12: 'End-of-Life Treatment of Sold Products',
      13: 'Downstream Leased Assets',
      14: 'Franchises',
      15: 'Investments',
    };

    const scope3Categories: Scope3CategoryAnalytics[] = [];
    for (let c = 1; c <= 15; c++) {
      const catData = scope3CategoryMap[c];
      const roundedTons = Math.round(catData.tons * 100) / 100;
      let dataQuality: 'HIGH' | 'MEDIUM' | 'ESTIMATED' | 'NO_DATA' = 'NO_DATA';
      if (catData.count > 0) {
        if (catData.primaryCount / catData.count > 0.5) dataQuality = 'HIGH';
        else if (catData.count > 1) dataQuality = 'MEDIUM';
        else dataQuality = 'ESTIMATED';
      }

      scope3Categories.push({
        categoryNo: c,
        name: scope3Names[c],
        emissionsTons: roundedTons,
        percentageOfScope3: scope3Tons > 0 ? Math.round((roundedTons / scope3Tons) * 1000) / 10 : 0,
        recordCount: catData.count,
        dataQualityStatus: dataQuality,
      });
    }

    // Facility Benchmarks
    const allFacilities = firestore.getDocs<Facility>('facilities');
    const facilityBenchmarks: FacilityBenchmarkItem[] = Object.entries(facilityMap).map(([facId, data]) => {
      const facObj = allFacilities.find((f: Facility) => f.facilityId === facId || f.code === facId);
      const facTotal = Math.round((data.scope1 + data.scope2 + data.scope3) * 100) / 100;
      return {
        facilityId: facId,
        facilityName: facObj ? facObj.name : `Facility ${facId}`,
        projectId: data.proj,
        businessUnitId: data.bu,
        scope1Tons: Math.round(data.scope1 * 100) / 100,
        scope2Tons: Math.round(data.scope2 * 100) / 100,
        scope3Tons: Math.round(data.scope3 * 100) / 100,
        totalTons: facTotal,
        percentageOfTotal: totalTons > 0 ? Math.round((facTotal / totalTons) * 1000) / 10 : 0,
        activityCount: data.count,
        verifiedCount: data.verified,
      };
    }).sort((a, b) => b.totalTons - a.totalTons);

    // Historical comparison
    let comparisonTotalTons = 0;
    let compScope1 = 0;
    let compScope2 = 0;
    let compScope3 = 0;
    for (const cr of comparisonRecords) {
      const cCalc = this.getRecordEmissions(cr);
      comparisonTotalTons += cCalc.tCO2e;
      if (cr.scopeNo === 1) compScope1 += cCalc.tCO2e;
      else if (cr.scopeNo === 2) compScope2 += cCalc.tCO2e;
      else compScope3 += cCalc.tCO2e;
    }
    comparisonTotalTons = Math.round(comparisonTotalTons * 100) / 100;

    const absDelta = Math.round((totalTons - comparisonTotalTons) * 100) / 100;
    const pctChange = comparisonTotalTons > 0 ? Math.round((absDelta / comparisonTotalTons) * 1000) / 10 : 0;
    const trend = absDelta > 1 ? 'INCREASING' : absDelta < -1 ? 'DECREASING' : 'STABLE';

    const historicalComparison: HistoricalComparison = {
      currentPeriod: currentPeriodId,
      comparisonPeriod: comparisonPeriodId,
      currentTotalTons: totalTons,
      comparisonTotalTons,
      absoluteDeltaTons: absDelta,
      percentageChange: pctChange,
      scope1DeltaTons: Math.round((scope1Tons - compScope1) * 100) / 100,
      scope2DeltaTons: Math.round((scope2Tons - compScope2) * 100) / 100,
      scope3DeltaTons: Math.round((scope3Tons - compScope3) * 100) / 100,
      trend,
    };

    // Readiness & Data Quality
    const totalRecords = currentRecords.length;
    const draftRecords = currentRecords.filter((r) => r.workflowStatus === 'DRAFT').length;
    const submittedRecords = currentRecords.filter((r) => r.workflowStatus === 'SUBMITTED').length;
    const reviewedRecords = currentRecords.filter((r) => ['SITE_REVIEWED', 'ESG_REVIEWED'].includes(r.workflowStatus)).length;
    const approvedRecords = currentRecords.filter((r) => ['APPROVED', 'ASSURANCE_REVIEWED'].includes(r.workflowStatus)).length;
    const lockedRecords = currentRecords.filter((r) => r.workflowStatus === 'LOCKED').length;
    const verifiedPercentage = totalRecords > 0 ? Math.round(((approvedRecords + lockedRecords) / totalRecords) * 100) : 0;
    const missingEvidenceCount = currentRecords.filter(
      (r) => !r.linkedEvidenceIds || r.linkedEvidenceIds.length === 0
    ).length;

    const readiness: ReportingReadinessAnalytics = {
      totalRecords,
      draftRecords,
      submittedRecords,
      reviewedRecords,
      approvedRecords,
      lockedRecords,
      verifiedPercentage,
      missingEvidenceCount,
      primaryDataPercentage: totalRecords > 0 ? Math.round(((totalRecords - missingEvidenceCount) / totalRecords) * 85) : 0,
      secondaryDataPercentage: totalRecords > 0 ? Math.round((missingEvidenceCount / totalRecords) * 15 + 15) : 0,
    };

    // Assurance & Reconciliation
    const allReviews = firestore.getDocs<AuditReview>('auditReviews');
    const allFindings = firestore.getDocs<AuditFinding>('auditFindings');
    const allCases = firestore.getDocs<ReconciliationCase>('reconciliationCases');

    const periodReviews = allReviews.filter((rev: AuditReview) => rev.reportingPeriodId === currentPeriodId);
    const verifiedReviews = periodReviews.filter((rev: AuditReview) => rev.auditStatus === 'VERIFIED').length;
    const openFindings = allFindings.filter((f: AuditFinding) => f.status === 'OPEN' || f.status === 'CLARIFICATION_REQUESTED');
    const criticalFindings = openFindings.filter((f: AuditFinding) => f.severity === 'CRITICAL' || f.severity === 'HIGH').length;

    const periodCases = allCases.filter((c: ReconciliationCase) => c.reportingPeriodId === currentPeriodId);
    const resolvedCases = periodCases.filter((c: ReconciliationCase) => c.status === 'RESOLVED' || c.status === 'CLOSED_NO_CHANGE').length;

    const assurance: AssuranceReconciliationAnalytics = {
      totalAuditReviews: periodReviews.length,
      verifiedAuditReviews: verifiedReviews,
      openAuditFindings: openFindings.length,
      criticalAuditFindings: criticalFindings,
      auditCompletionRate: periodReviews.length > 0 ? Math.round((verifiedReviews / periodReviews.length) * 100) : 100,
      totalReconciliationCases: periodCases.length,
      openReconciliationCases: periodCases.length - resolvedCases,
      resolvedReconciliationCases: resolvedCases,
      reconciliationResolutionRate: periodCases.length > 0 ? Math.round((resolvedCases / periodCases.length) * 100) : 100,
    };

    // Anomaly Detection Algorithm
    const anomalies: AnomalyAlert[] = [];

    // Alert 1: Period variance spike
    if (historicalComparison.percentageChange > 20) {
      anomalies.push({
        alertId: `ANOM-${Date.now()}-01`,
        severity: 'HIGH',
        title: `Emissions Surge Detected (${historicalComparison.percentageChange}% Increase)`,
        description: `Total carbon footprint in ${currentPeriodId} increased by ${historicalComparison.absoluteDeltaTons} tCO2e relative to ${comparisonPeriodId}.`,
        metricType: 'PERIOD_VARIANCE',
        impactTons: historicalComparison.absoluteDeltaTons,
        recommendedAction: 'Inspect Scope 1 fuel consumption logs and Scope 3 material procurements for seasonal peaks.',
      });
    }

    // Alert 2: Unverified high-impact records with missing documentation
    const highUnverified = currentRecords.filter(
      (r) => (r.co2e || 0) > 100 && (!r.linkedEvidenceIds || r.linkedEvidenceIds.length === 0)
    );
    if (highUnverified.length > 0) {
      anomalies.push({
        alertId: `ANOM-${Date.now()}-02`,
        severity: 'CRITICAL',
        title: `${highUnverified.length} Material Emission Record(s) Missing Verification Evidence`,
        description: `Discovered high-impact activities exceeding 100 tCO2e without linked primary tax invoices, weighbridge slips, or utility bills.`,
        metricType: 'EVIDENCE_GAP',
        activityId: highUnverified[0].activityId,
        impactTons: highUnverified.reduce((acc, r) => acc + (r.co2e || 0), 0),
        recommendedAction: 'Upload statutory billing evidence and request Site Engineer endorsement prior to external assurance.',
      });
    }

    // Alert 3: Unresolved open audit findings
    if (criticalFindings > 0) {
      anomalies.push({
        alertId: `ANOM-${Date.now()}-03`,
        severity: 'HIGH',
        title: `${criticalFindings} Critical / High Severity Audit Findings Pending Resolution`,
        description: `External assurance or internal compliance reviews have flagged discrepancies that remain open in ${currentPeriodId}.`,
        metricType: 'ASSURANCE_RISK',
        recommendedAction: 'Navigate to Audit & Assurance or Reconciliation to submit formal corrective data.',
      });
    }

    // Alert 4: Top facility concentration hotspot
    if (facilityBenchmarks.length > 0 && facilityBenchmarks[0].percentageOfTotal > 40) {
      anomalies.push({
        alertId: `ANOM-${Date.now()}-04`,
        severity: 'MEDIUM',
        title: `Heavy Emissions Concentration in ${facilityBenchmarks[0].facilityName}`,
        description: `${facilityBenchmarks[0].facilityName} accounts for ${facilityBenchmarks[0].percentageOfTotal}% (${facilityBenchmarks[0].totalTons} tCO2e) of the organizational boundary.`,
        metricType: 'FACILITY_HOTSPOT',
        facilityId: facilityBenchmarks[0].facilityId,
        impactTons: facilityBenchmarks[0].totalTons,
        recommendedAction: 'Prioritize energy-efficiency audits and open-access renewable power wheeling for this facility.',
      });
    }

    return {
      filterApplied: filter,
      reportingPeriod: currentPeriodId,
      scopeBreakdown,
      gasBreakdown: {
        co2Tons: Math.round((co2Kg / 1000) * 100) / 100,
        ch4Tons: Math.round((ch4Kg / 1000) * 1000) / 1000,
        n2oTons: Math.round((n2oKg / 1000) * 1000) / 1000,
        sf6Tons: Math.round((sf6Kg / 1000) * 10000) / 10000,
        hfcsTons: Math.round((hfcsKg / 1000) * 1000) / 1000,
      },
      scope1Details: {
        stationaryCombustionTons: Math.round(stationaryCombustionTons * 100) / 100,
        mobileCombustionTons: Math.round(mobileCombustionTons * 100) / 100,
        processEmissionsTons: Math.round(processEmissionsTons * 100) / 100,
        fugitiveEmissionsTons: Math.round(fugitiveEmissionsTons * 100) / 100,
        carbonCaptureTons: Math.round(carbonCaptureTons * 100) / 100,
        netScope1Tons: scope1Tons,
      },
      scope2Details: {
        locationBasedTons: Math.round(locationBasedTons * 100) / 100,
        marketBasedTons: Math.round(marketBasedTons * 100) / 100,
        gridElectricityTons: Math.round(gridElectricityTons * 100) / 100,
        renewableZeroTons: Math.round(renewableZeroTons * 100) / 100,
        steamAndThermalTons: Math.round(steamAndThermalTons * 100) / 100,
        coolingTons: Math.round(coolingTons * 100) / 100,
        renewablePercentage: totalPurchasedMWh > 0 ? Math.round((renewableMWh / totalPurchasedMWh) * 1000) / 10 : 0,
      },
      scope3Categories,
      facilityBenchmarks,
      historicalComparison,
      readiness,
      assurance,
      anomalies,
      computedAt: Date.now(),
    };
  }
}

export const analyticsService = new AnalyticsService();
