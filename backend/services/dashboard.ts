import type { User, Organization, BusinessUnit, Project } from '../models/types.ts';
import { firestore } from './firestore.ts';

export class DashboardService {
  public getDashboardData(user: User) {
    switch (user.role) {
      case 'GROUP_ADMIN':
        return this.getGroupAdminDashboard(user);
      case 'PROJECT_USER':
        return this.getProjectUserDashboard(user);
      case 'BUSINESS_UNIT_USER':
        return this.getBusinessUnitDashboard(user);
      case 'COMPANY_USER':
        return this.getCompanyDashboard(user);
      case 'AUDITOR':
        return this.getAuditorDashboard(user);
      case 'MANAGEMENT':
        return this.getManagementDashboard(user);
      default:
        return this.getGroupAdminDashboard(user);
    }
  }

  // 1. GROUP ADMIN
  private getGroupAdminDashboard(user: User) {
    return {
      dashboardType: 'GROUP_ADMIN',
      role: user.role,
      organizationScope: {
        level: 'ENTERPRISE_GROUP',
        organizationName: 'MEIL GROUP Headquarters',
        entityCount: 5,
        totalFacilities: 28,
        activeReportingCycle: 'FY 2025-26 (Q3 Active)',
      },
      metrics: {
        totalEmissions: '1,428,500',
        totalEmissionsUnit: 'tCO2e (Gross)',
        scope1: '842,100',
        scope1Pct: '58.9%',
        scope1Subtitle: 'Diesel, Machinery, Heavy Equipment',
        scope2: '312,400',
        scope2Pct: '21.9%',
        scope2Subtitle: 'Grid Purchased Power',
        scope3: '274,000',
        scope3Pct: '19.2%',
        scope3Subtitle: 'Supply chain, Cement, Steel Freight',
        esgReadiness: '78.4 / 100',
        esgReadinessStatus: 'SEBI BRSR Core Aligned',
        assuranceStatus: '68%',
        assuranceStatusSubtitle: 'Verified Disclosures · In Progress (14 Days to Filing)',
        emissionsByBU: [
          { name: 'Hydro Infra', emissions: '599,970 tCO2e', share: '42%' },
          { name: 'Transport & Roads', emissions: '399,980 tCO2e', share: '28%' },
          { name: 'Water & Irrigation', emissions: '257,130 tCO2e', share: '18%' },
          { name: 'Manufacturing', emissions: '171,420 tCO2e', share: '12%' },
        ],
      },
      pendingActions: [
        {
          id: 'ACT-01',
          type: 'APPROVAL',
          title: '4 Submissions awaiting BU Approval',
          subtitle: 'Northern Power & Irrigation divisions pending signoff',
          deadline: 'Due today 18:00',
          severity: 'HIGH',
        },
        {
          id: 'ACT-02',
          type: 'EVIDENCE',
          title: '2 Evidentiary invoices missing',
          subtitle: 'Fuel purchase vouchers for Subansiri gensets unattached',
          deadline: 'Audit Blocker',
          severity: 'CRITICAL',
        },
        {
          id: 'ACT-03',
          type: 'DISCREPANCY',
          title: '1 Factor mismatch in Zojila Site',
          subtitle: 'Explosive ANFO emission multiplier deviates from CEA standard',
          deadline: 'Correction Required',
          severity: 'MEDIUM',
        },
      ],
      pendingTasks: [
        'Review Northern Power Division aggregated emissions',
        'Sign off on EY Limited Assurance interim memorandum',
        'Authorize SEBI BRSR Principle 6 consolidated draft',
      ],
      recentSubmissions: [
        {
          date: 'Oct 28',
          project: 'Subansiri Hydro Site 4',
          unit: 'Northern Power',
          metric: 'Diesel Consumption',
          value: '120,400 L',
          status: 'Under Review',
        },
        {
          date: 'Oct 27',
          project: 'Polavaram Right Canal',
          unit: 'Irrigation Div',
          metric: 'Grid Electricity (LT)',
          value: '480,200 kWh',
          status: 'Verified',
        },
        {
          date: 'Oct 25',
          project: 'Zojila Tunnel Sector B',
          unit: 'Tunneling Div',
          metric: 'Explosives & ANFO',
          value: '45.2 Tonnes',
          status: 'Pending Audit',
        },
        {
          date: 'Oct 24',
          project: 'Kaleshwaram Pump Stn 3',
          unit: 'Water Power',
          metric: 'Lubricants & Oils',
          value: '14,800 L',
          status: 'Verified',
        },
        {
          date: 'Oct 22',
          project: 'Hyderabad Metro Ph-2',
          unit: 'Urban Transit',
          metric: 'Cement Transit Fleet',
          value: '88,500 km',
          status: 'Verified',
        },
      ],
      thirdPartyAssurance: {
        partner: 'EY LLP',
        totalItems: 142,
        verifiedCount: 96,
        inProgressCount: 28,
        discrepanciesCount: 18,
        overallProgress: '67.6%',
        assuranceLevel: 'Limited Assurance (ISAE 3000)',
      },
      reportStatus: 'FY 2025-26 Q3 Statutory Consolidation in Progress',
      recentActivity: 'Batch #SYNC-8942 validated against ERP at 08:30 IST',
    };
  }

  // 2. PROJECT USER
  private getProjectUserDashboard(user: User) {
    const project = firestore.getDoc<Project>('projects', user.projectId || 'PROJ001');
    const projectName = project ? project.name : 'Subansiri Hydro Electric (2000 MW)';

    return {
      dashboardType: 'PROJECT_USER',
      role: user.role,
      organizationScope: {
        level: 'FACILITY_OPERATOR',
        projectName,
        facilityCode: project?.facilityCode || 'FAC-HEP-SUB-01',
        location: project?.location || 'Arunachal / Assam Border',
        unitLead: 'Rajesh Kumar (Facility Site Eng.)',
        reportingCycle: 'Q3 FY 2025-26',
      },
      metrics: {
        projectName,
        dataCompletion: '88%',
        dataCompletionDetails: '42 / 48 Assigned Metrics Logged',
        pendingSubmissions: 6,
        evidencePending: 3,
        auditIssues: 1,
        submittedRecords: 42,
        environmentalCompletion: '22 / 25 Logged (88%)',
        socialCompletion: '13 / 17 Logged (76%)',
        governanceCompletion: '7 / 8 Logged (92%)',
      },
      pendingTasks: [
        'Complete Scope 1 Lubricant Oils submission for Aux Turbines (Due in 4 days)',
        'Upload missing IOCL fuel delivery challan for genset maintenance',
        'Respond to EY clarification regarding Generator 4 logbook variance',
      ],
      auditIssues: [
        {
          id: 'AUD-001',
          severity: 'CORRECTION_REQ',
          title: 'Auditor Finding #AUD-001: Diesel Variance',
          description: 'EY Assurer flagged +10,000 L drawdown in Genset 4 logbook not reflected in fuel invoice (Ref #OCT-DSL-09).',
          assuer: 'EY India (Statutory)',
          status: 'Action Required',
        },
      ],
      recentSubmissions: [
        {
          date: '12 Oct 2025',
          metric: 'Diesel Consumption (Scope 1 Stationary)',
          value: '100,000 L',
          co2e: '268.00 tCO2e',
          evidenceHash: '8f9b2d...1efca1 (SHA-256 Valid)',
          status: 'Locked for BU Review',
        },
        {
          date: '11 Oct 2025',
          metric: 'Grid Electricity Drawdown (Scope 2 Location)',
          value: '500,000 kWh',
          co2e: '358.00 tCO2e',
          evidenceHash: '3c91...4f22 (Attached)',
          status: 'Verified',
        },
        {
          date: '10 Oct 2025',
          metric: 'High-Explosive ANFO Blasting (Scope 1 Process)',
          value: '184.5 Tonnes',
          co2e: '31.36 tCO2e',
          evidenceHash: 'Blasting_Log_Oct.pdf',
          status: 'Audited',
        },
        {
          date: '08 Oct 2025',
          metric: 'Lost Time Injury Freq (LTIFR)',
          value: '0.12',
          co2e: 'Zero Fatalities',
          evidenceHash: 'HSE_Monthly_Signoff.pdf',
          status: 'Safety Assured',
        },
        {
          date: '05 Oct 2025',
          metric: 'Hazardous Waste Sludge Disposal',
          value: '14.2 MT',
          co2e: 'Safe Landfill / Incin.',
          evidenceHash: 'CPCB_Manifest_442.pdf',
          status: 'Vault Pending',
        },
      ],
      traceabilityChain: {
        activityData: '88% Logged',
        vaultSeal: 'Locked & Stamped',
        ghgCalc: '268 tCO2e Tier 1',
        assurance: '1 Discrepancy Active',
        brsrRollup: 'Pending BU Lock',
      },
      reportStatus: 'Facility Draft in Progress for Northern Power Roll-up',
      recentActivity: 'Telemetry synch from Modbus Energy Meter #EM-4091 at 08:30 IST',
    };
  }

  // 3. BUSINESS UNIT
  private getBusinessUnitDashboard(user: User) {
    const bu = firestore.getDoc<BusinessUnit>('businessUnits', user.businessUnitId || 'BU001');
    const businessUnitName = bu ? bu.name : 'Northern Power Division';

    return {
      dashboardType: 'BUSINESS_UNIT_USER',
      role: user.role,
      organizationScope: {
        level: 'DIVISIONAL_AGGREGATE',
        businessUnitName,
        code: bu?.code || 'DIV-NORTH-02',
        headName: bu?.headName || 'S. Ramanathan',
        legalEntity: 'Megha Hydro Infra Ltd (MHIL)',
        childFacilitiesCount: 6,
      },
      metrics: {
        businessUnitName,
        projectCount: 6,
        dataCompletion: '91.4%',
        dataCompletionMoM: '+4.2% MoM',
        metricsConsolidated: '168 / 184 Metrics',
        pendingReviews: 12,
        pendingReviewsSla: 'Within 48h',
        openIssues: 3,
        openIssuesTag: 'SEBI BRSR Priority 1',
        totalEmissions: '412,850',
        totalEmissionsUnit: 'tCO2e (Net Aggregated)',
        scope1: '184.2k tCO2e',
        scope2: '142.4k tCO2e',
        scope3: '86.3k tCO2e',
        reconciliationStatus: '97.8% Matched',
        reconciliationTolerance: 'Net Variance +0.8% (Within ±2.0% Threshold)',
      },
      projectSummary: [
        {
          name: 'Subansiri Hydro Electric (2000 MW)',
          lead: 'Rajesh Kumar (Sr. DGM Civil)',
          completion: '88%',
          s1: '13,200',
          s2: '8,400',
          s3: '11,450',
          evidence: '94% Validated',
          auditStatus: '1 Finding Open',
        },
        {
          name: 'Polavaram Canal Lift System',
          lead: 'M. V. Sharma (GM Electro-Mech)',
          completion: '96%',
          s1: '8,450',
          s2: '28,100',
          s3: '6,200',
          evidence: '100% Locked',
          auditStatus: 'Verified',
        },
        {
          name: 'Zojila Tunnel Project (Pkg 2)',
          lead: 'K. Srinivas (Project Director)',
          completion: '92%',
          s1: '48,200',
          s2: '12,300',
          s3: '24,100',
          evidence: '98% Locked',
          auditStatus: 'Verified w/ Obs',
        },
        {
          name: 'BHEL Turbine Enclosure Unit',
          lead: 'Amit Patel (Quality & Safety Head)',
          completion: '84%',
          s1: '15,600',
          s2: '6,800',
          s3: '3,100',
          evidence: '88% Pending',
          auditStatus: 'In Review',
        },
        {
          name: 'Rishikesh Rail Link Segment',
          lead: 'V. K. Nair (Chief Engineer)',
          completion: '94%',
          s1: '22,400',
          s2: '9,100',
          s3: '14,800',
          evidence: '100% Locked',
          auditStatus: 'Verified',
        },
        {
          name: 'Kishtwar Hydro Complex (JV)',
          lead: 'T. Gurumurthy (VP Hydel Ops)',
          completion: '90%',
          s1: '76,350',
          s2: '77,700',
          s3: '26,600',
          evidence: '92% Validated',
          auditStatus: '1 Finding Open',
        },
      ],
      consolidationBottlenecks: [
        {
          facility: 'Subansiri Hydro — Fuel Variance (+10.0%)',
          description: 'Scope 1 fuel consumption logs exceed baseline cap by 10%. Facilitate re-metering log submission between Site Lead Rajesh Kumar & EY Auditor.',
          status: 'Discrepancy',
          action: 'Coordinate Resolution',
        },
        {
          facility: 'BHEL Enclosure — Scope 2 Solar Invoice',
          description: '32,000 kWh off-site solar wheeling credit certificate pending official upload from AP Transco. Evidence file required for assurance signoff.',
          status: 'Missing Evidence',
          action: 'Send Facility Reminder',
        },
        {
          facility: 'Freight Manifest Batch Consolidation',
          description: 'Scope 3 Category 4 upstream transportation: 4 cement transport invoices require standardized t-km calculation signoff from BU ESG Head.',
          status: 'BU Approval Needed',
          action: 'Approve BU Batch',
        },
      ],
      pendingTasks: [
        'Review Subansiri Hydro fuel variance explanation',
        'Verify 4 cement freight invoices for Scope 3 t-km standardization',
        'Submit Northern Power aggregated package to Megha Hydro Infra Ltd',
      ],
      reportStatus: 'Divisional Consolidation 94.8% Audited & Aligned with SEBI BRSR',
      recentActivity: 'Aggregated direct Scope 1: 184,200 tCO2e synced to division ledger',
    };
  }

  // 4. COMPANY USER
  private getCompanyDashboard(user: User) {
    const org = firestore.getDoc<Organization>('organizations', user.organizationId || 'COMP001');
    const companyName = org ? org.name : 'Megha Hydro Infra Ltd';

    return {
      dashboardType: 'COMPANY_USER',
      role: user.role,
      organizationScope: {
        level: 'LEGAL_ENTITY_LEVEL',
        companyName,
        cin: org?.cin || 'U45200TG2006PLC050123',
        signatory: 'K. Radhakrishnan (ESG Director)',
        operatingDivisions: 3,
        totalFacilities: 15,
      },
      metrics: {
        companyName,
        businessUnitCount: 3,
        projectCount: 15,
        reportingCompletion: '94.2%',
        reportingProgressDelta: '+3.8%',
        auditCompletion: '86.4%',
        verifiedRecordsCount: '184 / 213 Records (EY)',
        totalGHG: '894.3k',
        totalGHGUnit: 'tCO2e (Net Statutory Entity)',
        scope1: '524k tCO2e',
        scope2: '218k tCO2e',
        scope3: '152k tCO2e',
        esgGovernance: '81.6 / 100',
        esgGovernanceTier: 'Tier-1 SEBI Compliant (Listing Regs Clause 34)',
        openDiscrepancies: 4,
        reportReadiness: '88% (Stage 5 of 6)',
      },
      workflowPipeline: [
        { stage: 'Stage 01', name: 'Data Collection', progress: '100% Ingested', status: 'Complete' },
        { stage: 'Stage 02', name: 'Evidence Vault', progress: '92% Locked', status: 'Complete' },
        { stage: 'Stage 03', name: 'Calculations', progress: '100% Verified', status: 'Complete' },
        { stage: 'Stage 04', name: 'Audit & Assurance', progress: '86% In Progress', status: 'In Progress' },
        { stage: 'Stage 05', name: 'Reconciliation', progress: '78% In Progress', status: 'In Progress' },
        { stage: 'Stage 06', name: 'Final BRSR Dossier', progress: 'Board Signoff Pending', status: 'Pending Signoff' },
      ],
      businessUnitSummary: [
        {
          name: 'Northern Power Division',
          head: 'S. Ramanathan',
          facilitiesCount: 6,
          completion: '91.4%',
          ghg: '412,850 tCO2e',
          auditStatus: '86% Verified',
          issuesCount: 3,
          readiness: '88% Ready',
        },
        {
          name: 'Southern Hydro & Irrigation',
          head: 'Dr. V. Murthy',
          facilitiesCount: 5,
          completion: '96.8%',
          ghg: '298,400 tCO2e',
          auditStatus: '92% Verified',
          issuesCount: 1,
          readiness: '94% Ready',
        },
        {
          name: 'Transmission & Substation Grid',
          head: 'R. Swaminathan',
          facilitiesCount: 4,
          completion: '95.0%',
          ghg: '183,050 tCO2e',
          auditStatus: '88% Verified',
          issuesCount: 0,
          readiness: '92% Ready',
        },
      ],
      statutoryBlockers: [
        {
          title: 'Subansiri Hydro Diesel Invoice Mismatch (+10%)',
          division: 'Northern Power',
          description: 'ERP fuel volume logs exceed metered fuel meter readout by 10.4%. Assigned to S. Ramanathan.',
          action: 'Reconcile Invoice',
        },
        {
          title: 'CSR Local Community Spending Receipt',
          division: 'Southern Division',
          description: '₹4.82 Cr rehabilitation disbursement documentation awaiting CA digital signature.',
          action: 'Ping Signatory',
        },
        {
          title: 'Zojila Rock Haulage Freight Calculation Harmonization',
          division: 'Transmission',
          description: 'Scope 3 Category 4 method shift from spend-based to ton-kilometer calculation required.',
          action: 'Harmonize Formula',
        },
      ],
      pendingTasks: [
        'Review cross-divisional diesel reconciliation variances',
        'Approve Southern Hydro & Irrigation final quarterly consolidation',
        'Authorize submission of Stage 5 reconciliation file to MEIL Group Admin',
      ],
      reportStatus: 'Stage 5/6: Reconciliation in progress prior to final board docket',
      recentActivity: 'Last audit sync completed today at 10:42 AM IST under ISAE 3000 / AA1000AS',
    };
  }

  // 5. AUDITOR
  private getAuditorDashboard(user: User) {
    return {
      dashboardType: 'AUDITOR',
      role: user.role,
      organizationScope: {
        level: 'INDEPENDENT_ASSURANCE_PARTNER',
        firmName: 'EY LLP Climate & Sustainability Services',
        leadAssurer: 'Dr. Ananya Sen (#88A2-3000-EY)',
        assignedMandate: 'Megha Hydro Infra Ltd (MEIL Company A)',
        standard: 'ISAE 3000 (Revised) & ISO 14064-3:2019',
        materialityThreshold: '± 2.0% (SEBI BRSR Core Mandated)',
      },
      metrics: {
        pendingReviews: 32,
        pendingReviewsSubtitle: 'Queued across 28 active field locations',
        inReview: 14,
        inReviewSubtitle: 'Assigned across 3 audit analysts',
        verified: 184,
        verifiedSubtitle: 'Signed off under ISAE 3000 Scope',
        correctionRequired: 8,
        correctionRequiredSubtitle: 'Material variance >2% or missing vouchers',
        assuranceProgress: '77.3%',
        assuranceProgressRatio: '184 / 238 Records',
      },
      auditQueue: [
        {
          id: 'AUD-001',
          facility: 'Subansiri Hydro Electric (2000 MW)',
          metric: 'Diesel Consumption (Scope 1 Stationary)',
          reportedQty: '100,000 L (268.00 tCO2e)',
          evidenceStatus: 'Fuel_Invoice_Oct2025.pdf (Valid)',
          calcModel: 'CEA Factor 2.68 kg CO2e / L',
          auditStatus: 'In Review',
        },
        {
          id: 'AUD-002',
          facility: 'Northern Central Complex',
          metric: 'Grid Electricity Purchased (Scope 2)',
          reportedQty: '500,000 kWh (358.00 tCO2e)',
          evidenceStatus: 'Electricity_Bill_Nov.pdf (Signed)',
          calcModel: 'CEA Baseline Factor v20',
          auditStatus: 'Verified',
        },
        {
          id: 'AUD-003',
          facility: 'Zojila Logistics Fleet',
          metric: 'HCV Cement Transport (Scope 3 Cat 4)',
          reportedQty: '120,000 t-km (114.24 tCO2e)',
          evidenceStatus: 'Transporter_Note.xlsx (Missing Odometer)',
          calcModel: 'DEFRA 2025 Freight Model',
          auditStatus: 'Correction Req.',
        },
        {
          id: 'AUD-004',
          facility: 'Corporate Hyderabad HQ',
          metric: 'Commercial Air Travel (Scope 3 Cat 6)',
          reportedQty: '25,000 p-km (3.12 tCO2e)',
          evidenceStatus: 'Travel_Manifest_Q3.pdf',
          calcModel: 'ICAO Flight Factor (Radiative)',
          auditStatus: 'Pending Review',
        },
        {
          id: 'AUD-005',
          facility: 'BHEL Powerhouse Bay 2',
          metric: 'Heavy Fuel Oil (HFO) (Scope 1 Stationary)',
          reportedQty: '45,000 L (143.55 tCO2e)',
          evidenceStatus: 'IOCL_Challan.pdf (Discrepant Meter Run)',
          calcModel: 'IPCC Stationary Factor',
          auditStatus: 'Correction Req.',
        },
      ],
      majorFindings: [
        {
          id: 'AUD-001',
          severity: 'MATERIAL_VARIANCE',
          title: 'Subansiri Hydro fuel logbook indicates +10,000 L drawdown',
          description: 'Under-reporting estimated at 26.80 tCO2e. Facility re-submission requested.',
          actionDueDate: '28 Jan 2026',
        },
        {
          id: 'AUD-005',
          severity: 'MODERATE_VARIANCE',
          title: 'Bay 2 fuel oil dipstick calibration certificate expired on 30 Sept 2025',
          description: 'Recalibration laboratory slip required prior to Scope 1 statutory signoff.',
          actionDueDate: '28 Jan 2026',
        },
        {
          id: 'AUD-003',
          severity: 'MINOR_METHODOLOGY',
          title: 'HCV empty return journey haulage calculation used unladen emission factors',
          description: 'SEBI BRSR Core requires full round-trip allocation for dedicated cement fleets.',
          actionDueDate: '05 Feb 2026',
        },
      ],
      pendingClarifications: 6,
      pendingTasks: [
        'Review Subansiri generator auxiliary fuel voucher batch',
        'Verify Zojila tunnel ventilation power meter calibration certificates',
        'Complete limited assurance sign-off dossier for Q3 statutory filing',
      ],
      reportStatus: 'Assurance Stage: 184 / 238 items certified. Zero silent overwrite rule strictly enforced.',
      recentActivity: 'Cryptographic stamp applied to 184 records in immutable assurance vault',
    };
  }

  // 6. MANAGEMENT
  private getManagementDashboard(user: User) {
    return {
      dashboardType: 'MANAGEMENT',
      role: user.role,
      organizationScope: {
        level: 'EXECUTIVE_BOARD_OVERSIGHT',
        entityName: 'MEIL GROUP Board & ESG Committee',
        executiveSignatory: 'B. Srinivasa Reddy (Executive Director)',
        assuranceState: 'ISAE 3000 Type-II Verified (Ernst & Young LLP)',
        reportingPeriod: 'FY 2025-26 (Q3 YTD)',
      },
      metrics: {
        esgPerformance: '78.4 / 100 (Tier-1 Top Decile Governance)',
        totalGHG: '1,428,500',
        totalGHGUnit: 'tCO2e (-3.2% vs FY24 Baseline)',
        scope1: '842,100 tCO2e (58.9%)',
        scope2: '312,400 tCO2e (21.9%)',
        scope3: '274,000 tCO2e (19.2%)',
        environmental: {
          score: 'Verified Compliant',
          totalEnergyConsumption: '2.41 Million GJ',
          waterRecycledPct: '68.4%',
          wasteDivertedFromLandfill: '84.2%',
          emissionIntensity: '18.2 tCO2e / ₹ Cr Turnover (-5.1% YoY)',
          brsrCorePrinciple6: '9/9 Indicators Disclosed',
        },
        social: {
          score: 'Verified Compliant',
          monitoredWorkforce: '42,850 Total',
          ltifr: '0.12 (Zero Fatalities)',
          trainingHours: '28.4 hrs/employee',
          csrSpendYtd: '₹48.20 Crores (102% of Mandate)',
          fairWagePosh: '100% Audited',
        },
        governance: {
          score: 'Verified Compliant',
          boardIndependence: '54.0% Independent',
          antiCorruptionTraining: '100% Coverage',
          stakeholderGrievancesResolved: '98.4%',
          coreIndicatorsLocked: '100% Locked Immutable Ledger',
          relatedPartyReview: 'Zero Non-Compliances',
        },
        assuranceStatus: 'Certified · 0 Critical Disqualifications by EY LLP',
        finalReports: [
          {
            title: 'MEIL Consolidated ESG & BRSR Statutory Report (FY 2025-26 Q3)',
            ref: 'DOC-BRSR-2026-V1.0',
            status: 'Approved & Signed',
            date: '14 Jan 2026',
          },
          {
            title: 'Northern Power Division & Subansiri Hydro Electric Annexure',
            ref: 'DOC-NPD-HYD-Q3',
            status: 'Ready to Publish',
            date: '12 Jan 2026',
          },
          {
            title: 'FY 2024-25 Annual Sustainability Disclosures & BRSR Filing',
            ref: 'NSE/BSE Listed Statutory Filing',
            status: 'Archived / Public',
            date: 'Annual Cycle',
          },
        ],
      },
      emissionTrajectory: {
        fy23_24: { emissions: '1.475M tCO2e', intensity: '19.8 t/₹Cr', status: 'Historical' },
        fy24_25: { emissions: '1.452M tCO2e', intensity: '18.9 t/₹Cr', status: 'Assured' },
        fy25_26: { emissions: '1.428M tCO2e', intensity: '18.2 t/₹Cr', status: 'Certified Target Achieved' },
        netZeroTrajectory: 'On Track (-8.1% Cumulative Decarbonization vs 2047 Net-Zero Roadmap)',
      },
      pendingTasks: [
        'Review Executive Summary PDF for upcoming Board of Directors meeting',
        'Inspect SEBI BRSR Principle 6 emission intensity metrics',
        'Review EY limited assurance formal opinion docket',
      ],
      reportStatus: 'Executive Governance Mode: READ-ONLY · All core metrics verified & certified',
      recentActivity: 'Digital Security Certificate #88A2-3000-EY validated at 10:45 AM IST',
    };
  }
}

export const dashboardService = new DashboardService();
