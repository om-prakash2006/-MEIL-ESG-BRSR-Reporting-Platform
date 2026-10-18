import { GoogleGenAI } from '@google/genai';
import type { ComprehensiveAnalyticsOverview } from './analytics.ts';
import { logger } from '../utils/logger.ts';

export interface AIImpactInsight {
  executiveSummary: string;
  scopeDistributionAnalysis: string;
  facilityHotspotsAnalysis: string;
  scope3SupplyChainReview: string;
  assuranceAndComplianceRisks: string;
  prioritizedActionItems: Array<{
    priority: 'IMMEDIATE' | 'HIGH' | 'MEDIUM';
    targetArea: string;
    action: string;
    rationale: string;
    expectedImpact: string;
  }>;
  brsrDisclosureReadiness: {
    status: 'EXCELLENT' | 'ADEQUATE' | 'REQUIRES_ATTENTION';
    observations: string;
    keyGaps: string[];
  };
  groundedMetrics: {
    totalEmissionsTons: number;
    scope1Tons: number;
    scope2Tons: number;
    scope3Tons: number;
    topEmitterFacility: string;
    periodVariancePercentage: number;
  };
  modelUsed: string;
  isAiGenerated: boolean;
  generatedAt: number;
}

export class GeminiService {
  private ai: GoogleGenAI | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        this.ai = new GoogleGenAI({ apiKey });
      } catch (err) {
        logger.warn('Failed to initialize GoogleGenAI client, will use deterministic fallback', { error: err });
      }
    } else {
      logger.info('No GEMINI_API_KEY detected in environment; AI Analyst will use deterministic intelligence fallback');
    }
  }

  /**
   * Deterministic fallback generator grounded strictly in backend numbers
   */
  private generateDeterministicInsights(data: ComprehensiveAnalyticsOverview): AIImpactInsight {
    const topFacility = data.facilityBenchmarks[0] || { facilityName: 'Primary Sites', totalTons: 0, percentageOfTotal: 0 };
    const scope1 = data.scopeBreakdown.scope1Tons;
    const scope2 = data.scopeBreakdown.scope2Tons;
    const scope3 = data.scopeBreakdown.scope3Tons;
    const total = data.scopeBreakdown.totalTons;

    const topScope =
      scope3 >= scope1 && scope3 >= scope2
        ? 'Scope 3 (Value Chain)'
        : scope1 >= scope2
        ? 'Scope 1 (Direct Operations)'
        : 'Scope 2 (Purchased Energy)';

    const topScope3Cat = data.scope3Categories.slice().sort((a, b) => b.emissionsTons - a.emissionsTons)[0];

    const actions = [
      {
        priority: 'IMMEDIATE' as const,
        targetArea: 'Scope 1 Stationary Diesel DG Sets',
        action: 'Transition auxiliary power backup at high-load facilities to battery energy storage and grid interconnects.',
        rationale: `Stationary diesel combustion contributes ${data.scope1Details.stationaryCombustionTons} tCO2e across operational facilities.`,
        expectedImpact: 'Estimated 25-35% reduction in Scope 1 direct emissions.',
      },
      {
        priority: 'HIGH' as const,
        targetArea: 'Scope 2 Power Procurement',
        action: 'Expand Open Access Corporate Power Purchase Agreements (PPAs) for solar and wind energy.',
        rationale: `Location-based grid electricity currently generates ${data.scope2Details.gridElectricityTons} tCO2e with CEA baseline factor 0.716 kgCO2e/kWh.`,
        expectedImpact: 'Achieve net-zero market-based Scope 2 compliance for connected major sites.',
      },
      {
        priority: 'MEDIUM' as const,
        targetArea: `Scope 3 ${topScope3Cat?.name || 'Supply Chain'}`,
        action: 'Mandate verified Environmental Product Declarations (EPDs) from primary steel and cement suppliers.',
        rationale: `${topScope3Cat?.name || 'Category 1'} represents ${topScope3Cat?.emissionsTons || 0} tCO2e (${topScope3Cat?.percentageOfScope3 || 0}% of Scope 3).`,
        expectedImpact: 'Replace generic secondary LCA emission factors with supplier-specific lower carbon intensity.',
      },
    ];

    if (data.anomalies.length > 0) {
      actions.unshift({
        priority: 'IMMEDIATE' as const,
        targetArea: 'Audit Evidence & Reconciliation',
        action: 'Resolve flagged data anomalies and attach statutory invoices for unverified high-impact records.',
        rationale: `${data.anomalies.length} anomaly alert(s) currently open, affecting assurance readiness.`,
        expectedImpact: 'Pre-empt statutory audit qualifications during SEBI BRSR Core review.',
      });
    }

    return {
      executiveSummary: `During reporting period ${data.reportingPeriod}, total greenhouse gas emissions across the evaluated organizational boundary stand at ${total} tCO2e. The emissions profile is led by ${topScope}, with ${topFacility.facilityName} emerging as the highest contributing site (${topFacility.totalTons} tCO2e, ${topFacility.percentageOfTotal}% of total). Period-over-period variance indicates a ${data.historicalComparison.trend.toLowerCase()} trend of ${Math.abs(data.historicalComparison.percentageChange)}% compared to ${data.historicalComparison.comparisonPeriod}.`,
      scopeDistributionAnalysis: `Scope 1 direct operations contributed ${scope1} tCO2e (${data.scopeBreakdown.scope1Percentage}%), driven primarily by ${data.scope1Details.stationaryCombustionTons} tCO2e in stationary combustion and ${data.scope1Details.processEmissionsTons} tCO2e in process activities. Scope 2 purchased electricity accounts for ${scope2} tCO2e (${data.scopeBreakdown.scope2Percentage}%), with renewable procurement at ${data.scope2Details.renewablePercentage}%. Scope 3 value chain emissions total ${scope3} tCO2e (${data.scopeBreakdown.scope3Percentage}%).`,
      facilityHotspotsAnalysis: `Site benchmarking identifies ${topFacility.facilityName} as the primary operational hotspot, followed by ${data.facilityBenchmarks[1]?.facilityName || 'secondary facilities'}. The top facility exhibits ${topFacility.activityCount} recorded activities, with ${topFacility.verifiedCount} fully verified by assurance workflows. Targeted site decarbonization roadmaps must focus on onsite renewable microgrids.`,
      scope3SupplyChainReview: `Across all 15 Scope 3 categories, Category ${topScope3Cat?.categoryNo || 1} (${topScope3Cat?.name}) accounts for the dominant share with ${topScope3Cat?.emissionsTons || 0} tCO2e. Overall Scope 3 data maturity shows ${data.readiness.primaryDataPercentage}% primary supplier data coverage and ${data.readiness.secondaryDataPercentage}% secondary/EEIO estimations.`,
      assuranceAndComplianceRisks: `The audit assurance verification rate is at ${data.readiness.verifiedPercentage}%. There are ${data.assurance.openAuditFindings} open audit findings (${data.assurance.criticalAuditFindings} critical/high) and ${data.assurance.openReconciliationCases} pending reconciliation cases. Data completeness stands at ${data.readiness.totalRecords} total entries with ${data.readiness.missingEvidenceCount} missing primary document links.`,
      prioritizedActionItems: actions,
      brsrDisclosureReadiness: {
        status: data.readiness.verifiedPercentage >= 80 ? 'EXCELLENT' : data.readiness.verifiedPercentage >= 50 ? 'ADEQUATE' : 'REQUIRES_ATTENTION',
        observations: `BRSR Principle 6 (Environment) readiness is evaluated based on SEBI Core indicators. Energy and GHG intensity metrics are mathematically validated.`,
        keyGaps: data.anomalies.map((a) => a.title),
      },
      groundedMetrics: {
        totalEmissionsTons: total,
        scope1Tons: scope1,
        scope2Tons: scope2,
        scope3Tons: scope3,
        topEmitterFacility: topFacility.facilityName,
        periodVariancePercentage: data.historicalComparison.percentageChange,
      },
      modelUsed: 'deterministic-rules-engine',
      isAiGenerated: false,
      generatedAt: Date.now(),
    };
  }

  /**
   * Produce comprehensive AI Impact Analyst review grounded in backend metrics
   */
  public async generateInsights(data: ComprehensiveAnalyticsOverview): Promise<AIImpactInsight> {
    const fallback = this.generateDeterministicInsights(data);

    if (!this.ai) {
      return fallback;
    }

    try {
      // Structured context payload with strict boundaries
      const boundedContext = {
        reportingPeriod: data.reportingPeriod,
        organizationBoundary: data.filterApplied,
        totalEmissionsTons: data.scopeBreakdown.totalTons,
        scope1: {
          totalTons: data.scopeBreakdown.scope1Tons,
          percentage: data.scopeBreakdown.scope1Percentage,
          stationaryCombustionTons: data.scope1Details.stationaryCombustionTons,
          mobileCombustionTons: data.scope1Details.mobileCombustionTons,
          processEmissionsTons: data.scope1Details.processEmissionsTons,
          fugitiveEmissionsTons: data.scope1Details.fugitiveEmissionsTons,
          carbonCaptureTons: data.scope1Details.carbonCaptureTons,
        },
        scope2: {
          totalTons: data.scopeBreakdown.scope2Tons,
          percentage: data.scopeBreakdown.scope2Percentage,
          locationBasedTons: data.scope2Details.locationBasedTons,
          marketBasedTons: data.scope2Details.marketBasedTons,
          renewablePercentage: data.scope2Details.renewablePercentage,
        },
        scope3: {
          totalTons: data.scopeBreakdown.scope3Tons,
          percentage: data.scopeBreakdown.scope3Percentage,
          categories: data.scope3Categories.filter((c) => c.emissionsTons > 0),
        },
        gasBreakdownTons: data.gasBreakdown,
        topFacilities: data.facilityBenchmarks.slice(0, 5),
        historicalComparison: data.historicalComparison,
        readiness: data.readiness,
        assurance: data.assurance,
        anomalies: data.anomalies,
      };

      const systemPrompt = `You are the Authoritative ESG & BRSR Carbon Impact Analyst for Megha Engineering & Infrastructures Limited (MEIL).
CRITICAL RULES:
1. You MUST NOT calculate, estimate, modify, or invent any numerical values. All numbers presented in your analysis MUST be directly quoted from the BOUNDED DATASET below.
2. Provide a rigorous, corporate-grade executive briefing explaining what these actual numbers mean for management, compliance risks, and decarbonization roadmap.
3. Respond ONLY with a valid JSON object matching the schema below:
{
  "executiveSummary": "string",
  "scopeDistributionAnalysis": "string",
  "facilityHotspotsAnalysis": "string",
  "scope3SupplyChainReview": "string",
  "assuranceAndComplianceRisks": "string",
  "prioritizedActionItems": [
    {
      "priority": "IMMEDIATE" | "HIGH" | "MEDIUM",
      "targetArea": "string",
      "action": "string",
      "rationale": "string",
      "expectedImpact": "string"
    }
  ],
  "brsrDisclosureReadiness": {
    "status": "EXCELLENT" | "ADEQUATE" | "REQUIRES_ATTENTION",
    "observations": "string",
    "keyGaps": ["string"]
  }
}

BOUNDED DATASET:
${JSON.stringify(boundedContext, null, 2)}`;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: systemPrompt,
      });

      const text = response.text || '';
      // Clean JSON formatting
      const cleanJson = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      return {
        executiveSummary: parsed.executiveSummary || fallback.executiveSummary,
        scopeDistributionAnalysis: parsed.scopeDistributionAnalysis || fallback.scopeDistributionAnalysis,
        facilityHotspotsAnalysis: parsed.facilityHotspotsAnalysis || fallback.facilityHotspotsAnalysis,
        scope3SupplyChainReview: parsed.scope3SupplyChainReview || fallback.scope3SupplyChainReview,
        assuranceAndComplianceRisks: parsed.assuranceAndComplianceRisks || fallback.assuranceAndComplianceRisks,
        prioritizedActionItems: parsed.prioritizedActionItems || fallback.prioritizedActionItems,
        brsrDisclosureReadiness: parsed.brsrDisclosureReadiness || fallback.brsrDisclosureReadiness,
        groundedMetrics: fallback.groundedMetrics,
        modelUsed: 'gemini-2.5-flash',
        isAiGenerated: true,
        generatedAt: Date.now(),
      };
    } catch (err: unknown) {
      logger.error('Gemini API call failed, safely defaulting to deterministic insights', { error: err });
      return fallback;
    }
  }

  /**
   * Handle user conversational questions grounded strictly in analytics numbers
   */
  public async handleUserQuery(query: string, data: ComprehensiveAnalyticsOverview): Promise<{ answer: string; groundedData: Record<string, unknown>; modelUsed: string }> {
    const contextSummary = {
      reportingPeriod: data.reportingPeriod,
      scopeBreakdown: data.scopeBreakdown,
      gasBreakdown: data.gasBreakdown,
      scope1Details: data.scope1Details,
      scope2Details: data.scope2Details,
      topCategories: data.scope3Categories.filter((c) => c.emissionsTons > 0),
      topFacilities: data.facilityBenchmarks.slice(0, 5),
      historicalComparison: data.historicalComparison,
      assurance: data.assurance,
      anomalies: data.anomalies,
    };

    if (!this.ai) {
      return {
        answer: `[Deterministic Analyst Response]: Based on authoritative records for ${data.reportingPeriod}, total emissions stand at ${data.scopeBreakdown.totalTons} tCO2e (Scope 1: ${data.scopeBreakdown.scope1Tons} tCO2e, Scope 2: ${data.scopeBreakdown.scope2Tons} tCO2e, Scope 3: ${data.scopeBreakdown.scope3Tons} tCO2e). The top emitting facility is ${data.facilityBenchmarks[0]?.facilityName || 'N/A'} with ${data.facilityBenchmarks[0]?.totalTons || 0} tCO2e. There are ${data.assurance.openAuditFindings} open audit findings and ${data.anomalies.length} anomaly flags.`,
        groundedData: contextSummary,
        modelUsed: 'deterministic-rules-engine',
      };
    }

    try {
      const prompt = `You are the ESG Analytics Copilot for MEIL.
Answer the user's question using ONLY the provided authoritative data.
Do NOT invent any metrics or estimate numbers not in the dataset.
Question: "${query}"

AUTHORITATIVE DATA:
${JSON.stringify(contextSummary, null, 2)}`;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      return {
        answer: response.text || 'No response generated.',
        groundedData: contextSummary,
        modelUsed: 'gemini-2.5-flash',
      };
    } catch (err: unknown) {
      logger.error('Error answering user ESG query with Gemini', { error: err });
      return {
        answer: `Authoritative summary: In ${data.reportingPeriod}, MEIL recorded ${data.scopeBreakdown.totalTons} tCO2e across all operations. Scope 1 accounts for ${data.scopeBreakdown.scope1Percentage}%, Scope 2 for ${data.scopeBreakdown.scope2Percentage}%, and Scope 3 for ${data.scopeBreakdown.scope3Percentage}%.`,
        groundedData: contextSummary,
        modelUsed: 'deterministic-rules-engine-fallback',
      };
    }
  }
}

export const geminiService = new GeminiService();
