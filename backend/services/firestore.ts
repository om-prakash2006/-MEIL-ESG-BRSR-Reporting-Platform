import fs from 'fs';
import path from 'path';
import type { User, RoleDefinition, Organization, BusinessUnit, Project, Facility } from '../models/types.ts';
import { config } from '../config/index.ts';
import { logger } from '../utils/logger.ts';

export interface FirestoreQueryFilter<T = unknown> {
  field: keyof T | string;
  operator: '==' | '!=' | 'in' | 'array-contains';
  value: unknown;
}

class FirestoreDatabase {
  private collections: Map<string, Map<string, Record<string, unknown>>> = new Map();
  private storageFilePath: string;
  private initialized: boolean = false;

  constructor() {
    this.storageFilePath = path.resolve('.data', 'firestore-store.json');
    this.initDatabase();
  }

  private initDatabase() {
    if (this.initialized) return;

    // Initialize collections
    const defaultCollections = [
      'users',
      'roles',
      'organizations',
      'businessUnits',
      'projects',
      'facilities',
      'reportingPeriods',
      'evidenceDocuments',
      'evidenceLinks',
      'auditLogs',
      'activityRecords',
      'activityDetails',
      'activityEvidenceLinks',
      'activityVersions',
      'emissionSources',
      'activityTypes',
      'units',
      'scope3Categories',
      'valueChainPartners',
      'substances',
      'auditReviews',
      'auditFindings',
      'auditClarifications',
      'reconciliationCases',
      'correctionRequests',
      'reconciliationHistory',
      'reports',
      'reportTemplates',
      'reportVersions',
      'reportDisclosures',
    ];

    for (const col of defaultCollections) {
      this.collections.set(col, new Map());
    }

    // Try reading existing disk persistence if available
    try {
      if (fs.existsSync(this.storageFilePath)) {
        const raw = fs.readFileSync(this.storageFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        for (const [colName, docs] of Object.entries(parsed)) {
          const docMap = new Map<string, Record<string, unknown>>();
          for (const [id, val] of Object.entries(docs as Record<string, Record<string, unknown>>)) {
            docMap.set(id, val);
          }
          this.collections.set(colName, docMap);
        }
        logger.info('Firestore storage loaded from disk', { path: this.storageFilePath });
      }
    } catch {
      logger.warn('Disk load error, re-seeding Firestore from clean baseline');
    }

    // Always ensure seed data is present
    this.seedDefaultCollections();
    this.saveToDisk();
    this.initialized = true;
    logger.info('Firestore database successfully seeded and operational');
  }

  private saveToDisk() {
    try {
      const dataDir = path.dirname(this.storageFilePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const serializable: Record<string, Record<string, unknown>> = {};
      for (const [colName, docMap] of this.collections.entries()) {
        serializable[colName] = {};
        for (const [id, val] of docMap.entries()) {
          serializable[colName][id] = val;
        }
      }
      fs.writeFileSync(this.storageFilePath, JSON.stringify(serializable, null, 2), 'utf-8');
    } catch {
      // Memory fallback is active
    }
  }

  private seedDefaultCollections() {
    // 1. ROLES
    const roles: RoleDefinition[] = [
      {
        roleId: 'PROJECT_USER',
        roleName: 'Project User / Facility Operator',
        tierDescription: 'Direct meter logging for Scope 1 Diesel Gen-sets and water effluent discharge metrics at site level.',
        scopeType: 'PROJECT',
        defaultDashboardRoute: '/dashboard/project',
        permissions: [
          'VIEW_DASHBOARD',
          'VIEW_ESG_DATA',
          'CREATE_ESG_DATA',
          'EDIT_OWN_ESG_DATA',
          'UPLOAD_EVIDENCE',
          'VIEW_OWN_EVIDENCE',
          'VIEW_OWN_CALCULATIONS',
          'VIEW_AUDIT_STATUS',
          'RESPOND_TO_CLARIFICATION',
        ],
      },
      {
        roleId: 'BUSINESS_UNIT_USER',
        roleName: 'Business Unit Manager',
        tierDescription: 'Divisional aggregation, child project data review, and preliminary assurance sign-off across division facilities.',
        scopeType: 'BUSINESS_UNIT',
        defaultDashboardRoute: '/dashboard/business-unit',
        permissions: [
          'VIEW_DASHBOARD',
          'VIEW_BU_DATA',
          'REVIEW_PROJECT_DATA',
          'VIEW_EVIDENCE',
          'VIEW_CALCULATIONS',
          'VIEW_AUDIT_STATUS',
          'RESPOND_TO_AUDIT',
          'VIEW_RECONCILIATION',
        ],
      },
      {
        roleId: 'COMPANY_USER',
        roleName: 'Company / Legal Entity ESG Manager',
        tierDescription: 'Statutory entity level consolidation, BRSR pipeline tracking, and cross-divisional discrepancy resolution.',
        scopeType: 'COMPANY',
        defaultDashboardRoute: '/dashboard/company',
        permissions: [
          'VIEW_DASHBOARD',
          'VIEW_COMPANY_DATA',
          'REVIEW_BU_DATA',
          'CONSOLIDATE_DATA',
          'VIEW_EVIDENCE',
          'VIEW_CALCULATIONS',
          'VIEW_AUDIT',
          'VIEW_RECONCILIATION',
          'VIEW_REPORTS',
        ],
      },
      {
        roleId: 'GROUP_ADMIN',
        roleName: 'Group ESG Admin',
        tierDescription: 'MEIL Group Headquarters master console with full governance, assurance certification, and statutory filings.',
        scopeType: 'GROUP',
        defaultDashboardRoute: '/dashboard/group',
        permissions: [
          'GROUP_VIEW',
          'VIEW_ALL_DATA',
          'MANAGE_USERS',
          'MANAGE_ROLES',
          'MANAGE_ORGANIZATION',
          'VIEW_AUDIT',
          'VIEW_RECONCILIATION',
          'APPROVE_REPORT',
          'GENERATE_REPORT',
          'VIEW_ANALYTICS',
        ],
      },
      {
        roleId: 'AUDITOR',
        roleName: 'Sustainability / CO2e Auditor',
        tierDescription: 'Independent third-party assurance partner (ISAE 3000 / ISO 14064-3) verification and statutory audit trail.',
        scopeType: 'ASSURANCE',
        defaultDashboardRoute: '/dashboard/auditor',
        permissions: [
          'VIEW_AUDIT_QUEUE',
          'VIEW_ESG_DATA_FOR_ASSIGNED_SCOPE',
          'VIEW_EVIDENCE',
          'VIEW_CALCULATIONS',
          'VERIFY_DATA',
          'ADD_FINDING',
          'REQUEST_CLARIFICATION',
          'MARK_CORRECTION_REQUIRED',
          'VIEW_RECONCILIATION',
          'CREATE_ASSURANCE_RESULT',
        ],
      },
      {
        roleId: 'MANAGEMENT',
        roleName: 'Management / Stakeholder',
        tierDescription: 'Board & ESG Committee read-only oversight of consolidated auditor-assured indicators and statutory reports.',
        scopeType: 'READ_ONLY_GROUP',
        defaultDashboardRoute: '/dashboard/management',
        permissions: [
          'VIEW_APPROVED_DASHBOARD',
          'VIEW_APPROVED_REPORTS',
          'VIEW_APPROVED_ANALYTICS',
        ],
      },
    ];

    for (const role of roles) {
      this.setDoc('roles', role.roleId, role as unknown as Record<string, unknown>);
    }

    // 2. ORGANIZATIONS
    const orgs: Organization[] = [
      {
        organizationId: 'GROUP001',
        name: 'MEIL GROUP',
        cin: 'U45200TG2006PLC050123',
        type: 'GROUP',
        parentId: null,
        active: true,
      },
      {
        organizationId: 'COMP001',
        name: 'MEIL Company A',
        cin: 'U45200TG2006PLC050123',
        type: 'COMPANY',
        parentId: 'GROUP001',
        active: true,
      },
      {
        organizationId: 'COMP002',
        name: 'MEIL Company B',
        cin: 'U45201TG2008PLC059882',
        type: 'COMPANY',
        parentId: 'GROUP001',
        active: true,
      },
    ];

    for (const org of orgs) {
      this.setDoc('organizations', org.organizationId, org as unknown as Record<string, unknown>);
    }

    // 3. BUSINESS UNITS
    const bus: BusinessUnit[] = [
      {
        businessUnitId: 'BU001',
        name: 'Water BU',
        code: 'DIV-WATER-01',
        organizationId: 'COMP001',
        headName: 'S. Ramanathan',
        active: true,
      },
      {
        businessUnitId: 'BU002',
        name: 'Northern Power Division',
        code: 'DIV-NORTH-02',
        organizationId: 'COMP001',
        headName: 'K. Srinivas',
        active: true,
      },
      {
        businessUnitId: 'BU003',
        name: 'Southern Hydro & Irrigation',
        code: 'DIV-SOUTH-03',
        organizationId: 'COMP001',
        headName: 'Dr. V. Murthy',
        active: true,
      },
      {
        businessUnitId: 'BU004',
        name: 'Transmission & Substation Grid',
        code: 'DIV-GRID-04',
        organizationId: 'COMP002',
        headName: 'R. Swaminathan',
        active: true,
      },
    ];

    for (const bu of bus) {
      this.setDoc('businessUnits', bu.businessUnitId, bu as unknown as Record<string, unknown>);
    }

    // 4. PROJECTS
    const projects: Project[] = [
      {
        projectId: 'PROJ001',
        name: 'Project A',
        code: 'PRJ-SUB-01',
        businessUnitId: 'BU001',
        organizationId: 'COMP001',
        leadName: 'Rajesh Kumar',
        location: 'Arunachal Pradesh / Assam Border',
        facilityCode: 'FAC-HEP-SUB-01',
        active: true,
      },
      {
        projectId: 'PROJ002',
        name: 'Project B',
        code: 'PRJ-POL-02',
        businessUnitId: 'BU001',
        organizationId: 'COMP001',
        leadName: 'M. V. Sharma',
        location: 'Polavaram, Andhra Pradesh',
        facilityCode: 'FAC-LIFT-POL-04',
        active: true,
      },
      {
        projectId: 'PROJ003',
        name: 'Project C',
        code: 'PRJ-ZOJ-03',
        businessUnitId: 'BU002',
        organizationId: 'COMP001',
        leadName: 'K. Srinivas',
        location: 'Sonamarg - Baltal, J&K',
        facilityCode: 'FAC-TUN-ZOJ-02',
        active: true,
      },
      {
        projectId: 'PROJ004',
        name: 'Project D',
        code: 'PRJ-BHL-04',
        businessUnitId: 'BU002',
        organizationId: 'COMP001',
        leadName: 'Amit Patel',
        location: 'Haridwar Industrial Complex',
        facilityCode: 'FAC-MFG-BHL-03',
        active: true,
      },
      {
        projectId: 'PROJ005',
        name: 'Rishikesh Rail Link Segment',
        code: 'PRJ-RSH-05',
        businessUnitId: 'BU001',
        organizationId: 'COMP001',
        leadName: 'V. K. Nair',
        location: 'Uttarakhand',
        facilityCode: 'FAC-RAIL-RSH-06',
        active: true,
      },
      {
        projectId: 'PROJ006',
        name: 'Kishtwar Hydro Complex (JV)',
        code: 'PRJ-KST-06',
        businessUnitId: 'BU001',
        organizationId: 'COMP001',
        leadName: 'T. Gurumurthy',
        location: 'Jammu & Kashmir',
        facilityCode: 'FAC-HEP-KST-05',
        active: true,
      },
    ];

    for (const prj of projects) {
      this.setDoc('projects', prj.projectId, prj as unknown as Record<string, unknown>);
    }

    // 5. FACILITIES
    const facilities: Facility[] = [
      {
        facilityId: 'FAC001',
        name: 'Subansiri Hydro Electric (2000 MW)',
        code: 'FAC-HEP-SUB-01',
        projectId: 'PROJ001',
        businessUnitId: 'BU001',
        organizationId: 'COMP001',
        type: 'Hydroelectric Generation Plant',
        installedCapacity: '2,000 MW (8 x 250 MW)',
        active: true,
      },
      {
        facilityId: 'FAC002',
        name: 'Polavaram Canal Lift System',
        code: 'FAC-LIFT-POL-04',
        projectId: 'PROJ002',
        businessUnitId: 'BU001',
        organizationId: 'COMP001',
        type: 'Irrigation & Water Pumping Complex',
        installedCapacity: '4,500 Cusecs',
        active: true,
      },
      {
        facilityId: 'FAC003',
        name: 'Zojila Tunnel Project Sector B',
        code: 'FAC-TUN-ZOJ-02',
        projectId: 'PROJ003',
        businessUnitId: 'BU002',
        organizationId: 'COMP001',
        type: 'Strategic Infrastructure Tunneling',
        installedCapacity: '14.15 km all-weather corridor',
        active: true,
      },
      {
        facilityId: 'FAC004',
        name: 'BHEL Turbine Enclosure Unit',
        code: 'FAC-MFG-BHL-03',
        projectId: 'PROJ004',
        businessUnitId: 'BU002',
        organizationId: 'COMP001',
        type: 'Industrial Turbine Fabrication',
        installedCapacity: '12 Heavy Turbines / Annum',
        active: true,
      },
    ];

    for (const fac of facilities) {
      this.setDoc('facilities', fac.facilityId, fac as unknown as Record<string, unknown>);
    }

    // 6. DEMO USERS
    const users: User[] = [
      // 1. PU001 - Project User
      {
        userId: 'USR001',
        employeeId: 'PU001',
        name: 'Project User',
        email: 'project.user@meil.com',
        role: 'PROJECT_USER',
        organizationId: 'COMP001',
        businessUnitId: 'BU001',
        projectId: 'PROJ001',
        active: true,
        designation: 'Facility Lead & Site Engineer',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop',
        permissions: [
          'VIEW_DASHBOARD',
          'VIEW_ESG_DATA',
          'CREATE_ESG_DATA',
          'EDIT_OWN_ESG_DATA',
          'UPLOAD_EVIDENCE',
          'VIEW_OWN_EVIDENCE',
          'VIEW_OWN_CALCULATIONS',
          'VIEW_AUDIT_STATUS',
          'RESPOND_TO_CLARIFICATION',
        ],
      },
      // 2. BU001 - Business Unit Manager
      {
        userId: 'USR002',
        employeeId: 'BU001',
        name: 'Business Unit Manager',
        email: 'bu.manager@meil.com',
        role: 'BUSINESS_UNIT_USER',
        organizationId: 'COMP001',
        businessUnitId: 'BU001',
        active: true,
        designation: 'Senior General Manager (Water BU)',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop',
        permissions: [
          'VIEW_DASHBOARD',
          'VIEW_BU_DATA',
          'REVIEW_PROJECT_DATA',
          'VIEW_EVIDENCE',
          'VIEW_CALCULATIONS',
          'VIEW_AUDIT_STATUS',
          'RESPOND_TO_AUDIT',
          'VIEW_RECONCILIATION',
        ],
      },
      // 3. CU001 - Company ESG Manager
      {
        userId: 'USR003',
        employeeId: 'CU001',
        name: 'Company ESG Manager',
        email: 'company.esg@meil.com',
        role: 'COMPANY_USER',
        organizationId: 'COMP001',
        active: true,
        designation: 'Director of Corporate Sustainability',
        avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&h=120&fit=crop',
        permissions: [
          'VIEW_DASHBOARD',
          'VIEW_COMPANY_DATA',
          'REVIEW_BU_DATA',
          'CONSOLIDATE_DATA',
          'VIEW_EVIDENCE',
          'VIEW_CALCULATIONS',
          'VIEW_AUDIT',
          'VIEW_RECONCILIATION',
          'VIEW_REPORTS',
        ],
      },
      // 4. GA001 - Group ESG Admin
      {
        userId: 'USR004',
        employeeId: 'GA001',
        name: 'Group ESG Admin',
        email: 'group.admin@meil.com',
        role: 'GROUP_ADMIN',
        organizationId: 'GROUP001',
        active: true,
        designation: 'Chief Sustainability Officer & Group Head',
        avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&h=120&fit=crop',
        permissions: [
          'GROUP_VIEW',
          'VIEW_ALL_DATA',
          'MANAGE_USERS',
          'MANAGE_ROLES',
          'MANAGE_ORGANIZATION',
          'VIEW_AUDIT',
          'VIEW_RECONCILIATION',
          'APPROVE_REPORT',
          'GENERATE_REPORT',
          'VIEW_ANALYTICS',
        ],
      },
      // 5. AU001 - Sustainability Auditor
      {
        userId: 'USR005',
        employeeId: 'AU001',
        name: 'Sustainability Auditor',
        email: 'auditor@ey-assurance.com',
        role: 'AUDITOR',
        organizationId: 'COMP001',
        assignedAssuranceScope: 'COMP001',
        active: true,
        designation: 'Lead Assurer, Climate & Sustainability Services, EY LLP',
        avatarUrl: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=120&h=120&fit=crop',
        permissions: [
          'VIEW_AUDIT_QUEUE',
          'VIEW_ESG_DATA_FOR_ASSIGNED_SCOPE',
          'VIEW_EVIDENCE',
          'VIEW_CALCULATIONS',
          'VERIFY_DATA',
          'ADD_FINDING',
          'REQUEST_CLARIFICATION',
          'MARK_CORRECTION_REQUIRED',
          'VIEW_RECONCILIATION',
          'CREATE_ASSURANCE_RESULT',
        ],
      },
      // 6. MG001 - Management User
      {
        userId: 'USR006',
        employeeId: 'MG001',
        name: 'Management User',
        email: 'management@meil.com',
        role: 'MANAGEMENT',
        organizationId: 'GROUP001',
        active: true,
        designation: 'Executive Director, MEIL Board & ESG Committee',
        avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&h=120&fit=crop',
        permissions: [
          'VIEW_APPROVED_DASHBOARD',
          'VIEW_APPROVED_REPORTS',
          'VIEW_APPROVED_ANALYTICS',
        ],
      },
    ];

    for (const u of users) {
      this.setDoc('users', u.userId, u as unknown as Record<string, unknown>);
    }

    // 7. REPORTING PERIODS
    const periods = [
      {
        periodId: 'Q3_FY2526',
        fiscalYear: 'FY 2025-26',
        quarter: 'Q3',
        startDate: '2025-10-01',
        endDate: '2025-12-31',
        status: 'ACTIVE',
      },
      {
        periodId: 'Q2_FY2526',
        fiscalYear: 'FY 2025-26',
        quarter: 'Q2',
        startDate: '2025-07-01',
        endDate: '2025-09-30',
        status: 'ARCHIVED',
      },
    ];

    for (const p of periods) {
      this.setDoc('reportingPeriods', p.periodId, p as unknown as Record<string, unknown>);
    }

    // 8. DEMO EVIDENCE DOCUMENTS
    const demoEvidence = [
      {
        documentId: 'DOC-EV-001',
        originalFileName: 'Diesel_Invoice_Oct2025.pdf',
        storagePath: 'evidence/COMP001/COMP001/Q3_FY2526/PROJ001/DOC-EV-001/Diesel_Invoice_Oct2025.pdf',
        downloadUrl: '/api/evidence/DOC-EV-001/download',
        mimeType: 'application/pdf',
        fileSize: 2457600,
        fileExtension: '.pdf',
        organizationId: 'COMP001',
        companyId: 'COMP001',
        businessUnitId: 'BU001',
        projectId: 'PROJ001',
        facilityId: 'FAC001',
        reportingPeriodId: 'Q3_FY2526',
        evidenceType: 'Fuel Invoice',
        description: 'Monthly diesel dispensary slip & IOCL bulk delivery invoice for 4x DG sets during auxiliary power maintenance.',
        uploadedBy: 'USR001',
        uploadedByName: 'Rajesh Kumar (Facility Engineer)',
        uploadedByRole: 'PROJECT_USER',
        uploadedAt: 1728733920000,
        verificationStatus: 'VERIFIED',
        verifiedBy: 'USR005',
        verifiedByName: 'Dr. Ananya Sen (EY LLP)',
        verifiedAt: 1728988800000,
        verificationNotes: 'Supporting IOCL tax invoice matches meter logs and recorded 100,000 L consumption. Meter calibration certificate valid till March 2026.',
        version: 1,
        evidenceGroupId: 'GRP-EV-001',
        isCurrent: true,
        linkedRecordId: 'E-GHG-01',
        checksum: '8f9b2d41a7c58e01bb903d881efca1d29384918237192837192837128371283',
        isActive: true,
      },
      {
        documentId: 'DOC-EV-002',
        originalFileName: 'Grid_Electricity_APSPDCL_Nov.pdf',
        storagePath: 'evidence/COMP001/COMP001/Q3_FY2526/PROJ002/DOC-EV-002/Grid_Electricity_APSPDCL_Nov.pdf',
        downloadUrl: '/api/evidence/DOC-EV-002/download',
        mimeType: 'application/pdf',
        fileSize: 4299161,
        fileExtension: '.pdf',
        organizationId: 'COMP001',
        companyId: 'COMP001',
        businessUnitId: 'BU001',
        projectId: 'PROJ002',
        facilityId: 'FAC002',
        reportingPeriodId: 'Q3_FY2526',
        evidenceType: 'Electricity Bill',
        description: 'Monthly electricity wheeling and HT meter drawdown statement from APSPDCL.',
        uploadedBy: 'USR001',
        uploadedByName: 'Rajesh Kumar',
        uploadedByRole: 'PROJECT_USER',
        uploadedAt: 1728820320000,
        verificationStatus: 'VERIFIED',
        verifiedBy: 'USR005',
        verifiedByName: 'Dr. Ananya Sen (EY LLP)',
        verifiedAt: 1729075200000,
        version: 1,
        evidenceGroupId: 'GRP-EV-002',
        isCurrent: true,
        linkedRecordId: 'E-GHG-03',
        checksum: '3c91a0b59f7724a1b02938475620194857263547281920394857263548392019',
        isActive: true,
      },
      {
        documentId: 'DOC-EV-003',
        originalFileName: 'Hazardous_Waste_Manifest_Form10.xlsx',
        storagePath: 'evidence/COMP001/COMP001/Q3_FY2526/PROJ001/DOC-EV-003/Hazardous_Waste_Manifest_Form10.xlsx',
        downloadUrl: '/api/evidence/DOC-EV-003/download',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        fileSize: 1153433,
        fileExtension: '.xlsx',
        organizationId: 'COMP001',
        companyId: 'COMP001',
        businessUnitId: 'BU001',
        projectId: 'PROJ001',
        facilityId: 'FAC001',
        reportingPeriodId: 'Q3_FY2526',
        evidenceType: 'Waste Record',
        description: 'Statutory Form 10 hazardous oil sludge disposal tracking manifest under CPCB guidelines.',
        uploadedBy: 'USR001',
        uploadedByName: 'Rajesh Kumar',
        uploadedByRole: 'PROJECT_USER',
        uploadedAt: 1728906720000,
        verificationStatus: 'PENDING_REVIEW',
        version: 1,
        evidenceGroupId: 'GRP-EV-003',
        isCurrent: true,
        linkedRecordId: 'E-GHG-07',
        checksum: '77a1e0589a01b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f',
        isActive: true,
      },
      {
        documentId: 'DOC-EV-004',
        originalFileName: 'Safety_Incident_Log_Zojila_Q3.pdf',
        storagePath: 'evidence/COMP001/COMP001/Q3_FY2526/PROJ003/DOC-EV-004/Safety_Incident_Log_Zojila_Q3.pdf',
        downloadUrl: '/api/evidence/DOC-EV-004/download',
        mimeType: 'application/pdf',
        fileSize: 3984588,
        fileExtension: '.pdf',
        organizationId: 'COMP001',
        companyId: 'COMP001',
        businessUnitId: 'BU002',
        projectId: 'PROJ003',
        facilityId: 'FAC003',
        reportingPeriodId: 'Q3_FY2526',
        evidenceType: 'Internal Record',
        description: 'HSE Monthly Safety Register certifying zero lost-time injury incidents for Q3.',
        uploadedBy: 'USR002',
        uploadedByName: 'K. Srinivas (Project Lead)',
        uploadedByRole: 'BUSINESS_UNIT_USER',
        uploadedAt: 1728993120000,
        verificationStatus: 'VERIFIED',
        verifiedBy: 'USR005',
        verifiedByName: 'Dr. Ananya Sen (EY LLP)',
        verifiedAt: 1729161600000,
        version: 1,
        evidenceGroupId: 'GRP-EV-004',
        isCurrent: true,
        checksum: 'e8210941054a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c',
        isActive: true,
      },
      {
        documentId: 'DOC-EV-005',
        originalFileName: 'Groundwater_NOC_Subansiri.pdf',
        storagePath: 'evidence/COMP001/COMP001/Q3_FY2526/PROJ001/DOC-EV-005/Groundwater_NOC_Subansiri.pdf',
        downloadUrl: '/api/evidence/DOC-EV-005/download',
        mimeType: 'application/pdf',
        fileSize: 5872025,
        fileExtension: '.pdf',
        organizationId: 'COMP001',
        companyId: 'COMP001',
        businessUnitId: 'BU001',
        projectId: 'PROJ001',
        facilityId: 'FAC001',
        reportingPeriodId: 'Q3_FY2526',
        evidenceType: 'Water Record',
        description: 'Central Ground Water Authority (CGWA) surface and river abstraction clearance certificate.',
        uploadedBy: 'USR001',
        uploadedByName: 'Rajesh Kumar',
        uploadedByRole: 'PROJECT_USER',
        uploadedAt: 1729079520000,
        verificationStatus: 'PENDING_REVIEW',
        version: 1,
        evidenceGroupId: 'GRP-EV-005',
        isCurrent: true,
        checksum: '4fa9128c788a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c',
        isActive: true,
      },
      {
        documentId: 'DOC-EV-006',
        originalFileName: 'ISO_14001_Audit_Report_2025.pdf',
        storagePath: 'evidence/COMP001/COMP001/Q3_FY2526/enterprise/DOC-EV-006/ISO_14001_Audit_Report_2025.pdf',
        downloadUrl: '/api/evidence/DOC-EV-006/download',
        mimeType: 'application/pdf',
        fileSize: 8598323,
        fileExtension: '.pdf',
        organizationId: 'COMP001',
        companyId: 'COMP001',
        reportingPeriodId: 'Q3_FY2526',
        evidenceType: 'Supplier Document',
        description: 'Third-party accredited Environmental Management System (EMS) surveillance certificate.',
        uploadedBy: 'USR004',
        uploadedByName: 'P. Venkat Rao',
        uploadedByRole: 'GROUP_ADMIN',
        uploadedAt: 1729165920000,
        verificationStatus: 'VERIFIED',
        verifiedBy: 'USR005',
        verifiedByName: 'Dr. Ananya Sen (EY LLP)',
        verifiedAt: 1729248000000,
        version: 1,
        evidenceGroupId: 'GRP-EV-006',
        isCurrent: true,
        checksum: 'd51e4441ba1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d',
        isActive: true,
      },
    ];

    for (const ev of demoEvidence) {
      this.setDoc('evidenceDocuments', ev.documentId, ev as unknown as Record<string, unknown>);
    }

    // 9. EVIDENCE LINKS
    const links = [
      {
        linkId: 'LINK-001',
        documentId: 'DOC-EV-001',
        recordId: 'E-GHG-01',
        linkedAt: 1728733920000,
        linkedBy: 'USR001',
      },
      {
        linkId: 'LINK-002',
        documentId: 'DOC-EV-002',
        recordId: 'E-GHG-03',
        linkedAt: 1728820320000,
        linkedBy: 'USR001',
      },
      {
        linkId: 'LINK-003',
        documentId: 'DOC-EV-003',
        recordId: 'E-GHG-07',
        linkedAt: 1728906720000,
        linkedBy: 'USR001',
      },
    ];

    for (const l of links) {
      this.setDoc('evidenceLinks', l.linkId, l as unknown as Record<string, unknown>);
    }

    // 10. INITIAL AUDIT LOGS
    const logs = [
      {
        logId: 'LOG-001',
        actor: 'USR001',
        actorName: 'Rajesh Kumar',
        role: 'PROJECT_USER',
        action: 'EVIDENCE_UPLOADED',
        documentId: 'DOC-EV-001',
        timestamp: 1728733920000,
        newStatus: 'UPLOADED',
        scope: 'COMP001/BU001/PROJ001',
        comments: 'Diesel invoice uploaded for Subansiri genset consumption',
      },
      {
        logId: 'LOG-002',
        actor: 'USR005',
        actorName: 'Dr. Ananya Sen',
        role: 'AUDITOR',
        action: 'EVIDENCE_VERIFIED',
        documentId: 'DOC-EV-001',
        timestamp: 1728988800000,
        oldStatus: 'UPLOADED',
        newStatus: 'VERIFIED',
        scope: 'COMP001',
        comments: 'ISAE 3000 assurance signoff complete',
      },
    ];

    for (const lg of logs) {
      this.setDoc('auditLogs', lg.logId, lg as unknown as Record<string, unknown>);
    }

    // 11. EMISSION SOURCES MASTER DATA
    const emissionSources = [
      { sourceId: 'SRC-DG-01', name: 'DG Set 1500 kVA (Unit 4 Auxiliary)', scopeNo: 1, category: 'Stationary Combustion', facilityId: 'FAC001', projectId: 'PROJ001', description: 'Diesel generator for auxiliary backup power' },
      { sourceId: 'SRC-BOILER-01', name: 'Heavy Fuel Gas Boiler B-02', scopeNo: 1, category: 'Stationary Combustion', facilityId: 'FAC003', projectId: 'PROJ003', description: 'Steam heating boiler at Zojila east portal' },
      { sourceId: 'SRC-CHILLER-01', name: 'Carrier Chiller Unit 3 (R-410A)', scopeNo: 1, category: 'Fugitive Emissions', facilityId: 'FAC001', projectId: 'PROJ001', description: 'Central HVAC refrigerant loop' },
      { sourceId: 'SRC-METER-HT-01', name: 'APSPDCL 33kV HT Dedicated Line', scopeNo: 2, category: 'Electricity', facilityId: 'FAC001', projectId: 'PROJ001', description: 'High tension grid connection' },
      { sourceId: 'SRC-SOLAR-01', name: 'Captive Rooftop Solar Plant 2 MW', scopeNo: 2, category: 'Electricity', facilityId: 'FAC002', projectId: 'PROJ002', description: 'Onsite solar PV array' },
      { sourceId: 'SRC-COOLING-01', name: 'District Chilled Water Drawdown', scopeNo: 2, category: 'Cooling', facilityId: 'FAC004', projectId: 'PROJ004', description: 'Commercial cooling pipeline' },
      { sourceId: 'SRC-STEEL-01', name: 'Reinforcement Steel Procurement', scopeNo: 3, category: 'Purchased Goods', description: 'Category 1: Purchased Goods and Services' },
      { sourceId: 'SRC-CEMENT-01', name: 'Bulk Portland Pozzolana Cement', scopeNo: 3, category: 'Purchased Goods', description: 'Category 1: Concrete batching input' },
      { sourceId: 'SRC-TRAVEL-01', name: 'Corporate Business Flights (Domestic)', scopeNo: 3, category: 'Business Travel', description: 'Category 6: Business Travel' },
    ];
    for (const s of emissionSources) {
      this.setDoc('emissionSources', s.sourceId, s as unknown as Record<string, unknown>);
    }

    // 12. ACTIVITY TYPES MASTER DATA
    const activityTypes = [
      // Scope 1 - Stationary Combustion
      { typeId: 'ACT-DIESEL-GEN', name: 'Diesel Generator Consumption', scopeNo: 1, defaultUnitId: 'LITER', description: 'Stationary combustion of high-speed diesel' },
      { typeId: 'ACT-NATGAS-BOILER', name: 'Natural Gas Combustion (Piped PNG)', scopeNo: 1, defaultUnitId: 'SCM', description: 'Stationary combustion of piped natural gas in boilers' },
      { typeId: 'ACT-LPG-CANTEEN', name: 'Commercial LPG Combustion', scopeNo: 1, defaultUnitId: 'MT', description: 'Canteen and process heating liquefied petroleum gas' },
      { typeId: 'ACT-COAL-BOILER', name: 'Coal Combustion (G-11 Boiler)', scopeNo: 1, defaultUnitId: 'MT', description: 'Non-coking thermal coal combustion in boilers' },
      { typeId: 'ACT-HFO-BOILER', name: 'Furnace Oil / HFO Combustion', scopeNo: 1, defaultUnitId: 'LITER', description: 'Residual fuel oil combustion in asphalt/boiler units' },
      { typeId: 'ACT-LDO-FURNACE', name: 'Light Diesel Oil (LDO) Industrial Combustion', scopeNo: 1, defaultUnitId: 'LITER', description: 'Industrial furnace and dryer heating' },
      { typeId: 'ACT-BIOMASS-BOILER', name: 'Agro Biomass Pellets Combustion', scopeNo: 1, defaultUnitId: 'MT', description: 'Agricultural residue briquettes co-fired in boilers' },

      // Scope 1 - Mobile Combustion
      { typeId: 'ACT-DIESEL-FLEET', name: 'Company Fleet Diesel Vehicle Consumption', scopeNo: 1, defaultUnitId: 'LITER', description: 'Owned transport fleet diesel fuel volume' },
      { typeId: 'ACT-PETROL-VEHICLE', name: 'Company Fleet Petrol/Gasoline Consumption', scopeNo: 1, defaultUnitId: 'LITER', description: 'Company cars and site light petrol vehicles' },
      { typeId: 'ACT-OFFROAD-EXCAVATOR', name: 'Off-Road Heavy Equipment (Engine Hours)', scopeNo: 1, defaultUnitId: 'HOUR', description: 'Hydraulic excavators and bulldozers operational hours' },
      { typeId: 'ACT-FLEET-DIESEL-KM', name: 'Heavy Commercial Fleet (Distance Method)', scopeNo: 1, defaultUnitId: 'KM', description: 'Multi-axle logistics carriers tracked by km' },

      // Scope 1 - Process Emissions
      { typeId: 'ACT-CLINKER-CALCINATION', name: 'Cement Clinker Calcination', scopeNo: 1, defaultUnitId: 'MT', description: 'Direct limestone calcination chemical process' },
      { typeId: 'ACT-STEEL-BOF', name: 'Primary Steelmaking (BF-BOF Reduction)', scopeNo: 1, defaultUnitId: 'MT', description: 'Integrated ironmaking chemical reduction emissions' },
      { typeId: 'ACT-LIME-KILN', name: 'Quicklime Decarbonation Process', scopeNo: 1, defaultUnitId: 'MT', description: 'Direct carbonate decarbonation in lime kilns' },
      { typeId: 'ACT-ASPHALT-PLANT', name: 'Hot Mix Asphalt Processing', scopeNo: 1, defaultUnitId: 'MT', description: 'Asphalt mixing and coating batch plant emissions' },

      // Scope 1 - Fugitive Emissions
      { typeId: 'ACT-REFRIG-R410A', name: 'Refrigerant R-410A Leakage', scopeNo: 1, defaultUnitId: 'KG', description: 'Commercial VRF and split AC top-up' },
      { typeId: 'ACT-REFRIG-HFC134A', name: 'Refrigerant HFC-134a Leakage', scopeNo: 1, defaultUnitId: 'KG', description: 'Centrifugal chiller refrigerant replenishment' },
      { typeId: 'ACT-REFRIG-R404A', name: 'Refrigerant R-404A Leakage', scopeNo: 1, defaultUnitId: 'KG', description: 'Industrial cold storage chilling loops' },
      { typeId: 'ACT-REFRIG-R22', name: 'Refrigerant R-22 Legacy Leakage', scopeNo: 1, defaultUnitId: 'KG', description: 'Legacy packaged AC maintenance top-up' },
      { typeId: 'ACT-SF6-SWITCHGEAR', name: 'Sulfur Hexafluoride (SF6) Switchgear Leakage', scopeNo: 1, defaultUnitId: 'KG', description: 'High voltage GIS substation circuit breaker loss' },
      { typeId: 'ACT-METHANE-FLANGE', name: 'Methane (CH4) Pipeline / Flange Loss', scopeNo: 1, defaultUnitId: 'KG', description: 'Fugitive gas pipeline distribution loss' },
      { typeId: 'ACT-FIRESP-FM200', name: 'Fire Suppression FM-200 Release', scopeNo: 1, defaultUnitId: 'KG', description: 'Clean agent total flooding fire cylinder discharge' },

      // Scope 1 - Carbon Capture
      { typeId: 'ACT-CARBON-CAPTURE', name: 'Direct Carbon Capture & Permanent Storage', scopeNo: 1, defaultUnitId: 'MT', description: 'Verified flue gas CO2 permanent geological sequestration' },

      // Scope 2 - Purchased Electricity
      { typeId: 'ACT-GRID-ELEC', name: 'Grid Electricity (India National Grid)', scopeNo: 2, defaultUnitId: 'KWH', description: 'Location-based Scope 2 transmission grid power' },
      { typeId: 'ACT-GRID-REGIONAL', name: 'Purchased Regional Grid Electricity (Discom)', scopeNo: 2, defaultUnitId: 'KWH', description: 'Regional state electricity utility connection' },
      { typeId: 'ACT-GRID-MARKET', name: 'Purchased Electricity (Market-Based Residual)', scopeNo: 2, defaultUnitId: 'KWH', description: 'Market-based residual electricity consumption' },
      { typeId: 'ACT-RENEW-SOLAR-PPA', name: 'Renewable Solar Power (Open Access PPA)', scopeNo: 2, defaultUnitId: 'KWH', description: 'Wheeled offsite solar power with I-REC certificates' },
      { typeId: 'ACT-RENEW-WIND-PPA', name: 'Renewable Wind Power (PPA)', scopeNo: 2, defaultUnitId: 'KWH', description: 'Contractual wind power purchase agreement' },
      { typeId: 'ACT-RENEW-GREEN-TARIFF', name: 'Green Energy Open Access / Green Tariff', scopeNo: 2, defaultUnitId: 'KWH', description: 'Utility green surcharge certified supply' },

      // Scope 2 - Purchased Thermal Energy
      { typeId: 'ACT-PURCH-STEAM', name: 'Purchased Industrial Steam', scopeNo: 2, defaultUnitId: 'MT', description: 'Imported high-pressure thermal steam' },
      { typeId: 'ACT-PURCH-HEAT', name: 'Purchased Hot Water / District Heat', scopeNo: 2, defaultUnitId: 'GJ', description: 'Imported district heating energy' },
      { typeId: 'ACT-PURCH-COOLING', name: 'Purchased Chilled Water / District Cooling', scopeNo: 2, defaultUnitId: 'TON_HOUR', description: 'Imported chilled water cooling energy' },

      // Scope 3 - All 15 Categories
      { typeId: 'ACT-STEEL-PURCH', name: 'Structural Steel Rebars Purchased', scopeNo: 3, scope3CategoryNo: 1, defaultUnitId: 'MT', description: 'Embodied carbon in construction steel' },
      { typeId: 'ACT-CEMENT-PURCH', name: 'Ordinary Portland Cement (OPC 53)', scopeNo: 3, scope3CategoryNo: 1, defaultUnitId: 'MT', description: 'Bulk OPC cement procurement' },
      { typeId: 'ACT-CEMENT-PPC', name: 'Portland Pozzolana Cement (PPC)', scopeNo: 3, scope3CategoryNo: 1, defaultUnitId: 'MT', description: 'Blended low-carbon cement procurement' },
      { typeId: 'ACT-BITUMEN-PURCH', name: 'Road Bitumen VG-30 / VG-40', scopeNo: 3, scope3CategoryNo: 1, defaultUnitId: 'MT', description: 'Refinery bitumen for road paving' },
      { typeId: 'ACT-PURCH-GOODS-SPEND', name: 'General Materials Spend (EEIO)', scopeNo: 3, scope3CategoryNo: 1, defaultUnitId: 'INR', description: 'Economic input-output material procurement spend' },
      { typeId: 'ACT-CAP-EXCAVATOR', name: 'Heavy Excavators / Cranes Acquired', scopeNo: 3, scope3CategoryNo: 2, defaultUnitId: 'UNIT', description: 'Capital goods machinery acquisition' },
      { typeId: 'ACT-CAP-TRANSFORMER', name: 'Plant Power Transformers Acquired', scopeNo: 3, scope3CategoryNo: 2, defaultUnitId: 'UNIT', description: 'Substation and power capital assets' },
      { typeId: 'ACT-CAPITAL-GOODS-SPEND', name: 'Capital Equipment Capex Spend (EEIO)', scopeNo: 3, scope3CategoryNo: 2, defaultUnitId: 'INR', description: 'Input-output capital equipment spend' },
      { typeId: 'ACT-WTT-DIESEL', name: 'Well-to-Tank (WTT) Diesel Fuel Production', scopeNo: 3, scope3CategoryNo: 3, defaultUnitId: 'LITER', description: 'Upstream oil extraction and refining impact' },
      { typeId: 'ACT-TD-LOSSES', name: 'Transmission & Distribution Grid Losses', scopeNo: 3, scope3CategoryNo: 3, defaultUnitId: 'KWH', description: 'Line and transformation losses for purchased electricity' },
      { typeId: 'ACT-FREIGHT-ROAD', name: 'Inbound Heavy Trucking Freight (tonne-km)', scopeNo: 3, scope3CategoryNo: 4, defaultUnitId: 't-km', description: 'Heavy goods vehicle freight transport' },
      { typeId: 'ACT-FREIGHT-RAIL', name: 'Rail Freight Haulage (tonne-km)', scopeNo: 3, scope3CategoryNo: 4, defaultUnitId: 't-km', description: 'Freight corridor bulk rail transport' },
      { typeId: 'ACT-WASTE-LANDFILL', name: 'Municipal Solid Waste to Landfill', scopeNo: 3, scope3CategoryNo: 5, defaultUnitId: 'MT', description: 'Operational refuse sent to landfill' },
      { typeId: 'ACT-WASTE-HAZ', name: 'Hazardous Sludge Sent to TSDF', scopeNo: 3, scope3CategoryNo: 5, defaultUnitId: 'MT', description: 'Authorized hazardous industrial waste disposal' },
      { typeId: 'ACT-WASTE-RECYCLE', name: 'Diverted Metal Scrap Recycling', scopeNo: 3, scope3CategoryNo: 5, defaultUnitId: 'MT', description: 'Recycled steel cut-offs diverted from waste' },
      { typeId: 'ACT-TRAVEL-AIR-DOM', name: 'Domestic Economy Air Travel (p-km)', scopeNo: 3, scope3CategoryNo: 6, defaultUnitId: 'p-km', description: 'Domestic flights for engineering staff' },
      { typeId: 'ACT-HOTEL-STAY', name: 'Commercial Hotel Business Stays (Nights)', scopeNo: 3, scope3CategoryNo: 6, defaultUnitId: 'NIGHT', description: 'Hotel room night occupancy during audits' },
      { typeId: 'ACT-COMMUTE-METRO', name: 'Metro Rapid Transit Commute (p-km)', scopeNo: 3, scope3CategoryNo: 7, defaultUnitId: 'p-km', description: 'Staff rapid transit urban commute' },
      { typeId: 'ACT-COMMUTE-BUS', name: 'Employee Shift Shuttle Buses (p-km)', scopeNo: 3, scope3CategoryNo: 7, defaultUnitId: 'p-km', description: 'Shared facility employee transport' },
      { typeId: 'ACT-COMMUTE-2W', name: 'Personal Two-Wheeler Commute (km)', scopeNo: 3, scope3CategoryNo: 7, defaultUnitId: 'KM', description: 'Daily employee motorbike travel' },
      { typeId: 'ACT-LEASE-OFFICE', name: 'Leased Office Space (m²-month)', scopeNo: 3, scope3CategoryNo: 8, defaultUnitId: 'SQM_MONTH', description: 'Upstream leased corporate real estate' },
      { typeId: 'ACT-LEASE-GENSET', name: 'Leased Silent Diesel Generator (Hours)', scopeNo: 3, scope3CategoryNo: 8, defaultUnitId: 'HOUR', description: 'Rented backup generator operation' },
      { typeId: 'ACT-DOWNSTREAM-TRUCK', name: 'Outbound Customer Delivery Trucking (t-km)', scopeNo: 3, scope3CategoryNo: 9, defaultUnitId: 't-km', description: 'Finished goods customer transport' },
      { typeId: 'ACT-SOLD-STEEL-FAB', name: 'Downstream Steel Fabrication Processing', scopeNo: 3, scope3CategoryNo: 10, defaultUnitId: 'MT', description: 'Customer cutting and welding of sold steel' },
      { typeId: 'ACT-USE-EQUIPMENT-FUEL', name: 'Direct Lifetime Fuel of Sold Machinery', scopeNo: 3, scope3CategoryNo: 11, defaultUnitId: 'LITER', description: 'Operational fuel use of manufactured equipment' },
      { typeId: 'ACT-EOL-DEMO-LANDFILL', name: 'Demolition Waste Landfilling of Assets', scopeNo: 3, scope3CategoryNo: 12, defaultUnitId: 'MT', description: 'End-of-life disposal of manufactured infrastructure' },
      { typeId: 'ACT-DOWNLEASE-WAREHOUSE', name: 'Downstream Leased Warehouse (m²-month)', scopeNo: 3, scope3CategoryNo: 13, defaultUnitId: 'SQM_MONTH', description: 'Owned property leased to 3PL logistics tenants' },
      { typeId: 'ACT-FRANCHISE-ELEC', name: 'Franchise Outlet Grid Electricity (kWh)', scopeNo: 3, scope3CategoryNo: 14, defaultUnitId: 'KWH', description: 'Franchise distributor branch electric usage' },
      { typeId: 'ACT-INVEST-EQUITY', name: 'Equity Share Financed Infrastructure (tCO2e)', scopeNo: 3, scope3CategoryNo: 15, defaultUnitId: 'MT', description: 'PCAF financed emissions from equity ventures' },
    ];
    for (const a of activityTypes) {
      this.setDoc('activityTypes', a.typeId, a as unknown as Record<string, unknown>);
    }

    // 13. UNITS MASTER DATA
    const units = [
      { unitId: 'LITER', symbol: 'L', name: 'Liter', type: 'VOLUME' },
      { unitId: 'SCM', symbol: 'SCM', name: 'Standard Cubic Meter', type: 'VOLUME' },
      { unitId: 'KG', symbol: 'kg', name: 'Kilogram', type: 'MASS' },
      { unitId: 'MT', symbol: 'MT', name: 'Metric Tonne', type: 'MASS' },
      { unitId: 'KWH', symbol: 'kWh', name: 'Kilowatt-hour', type: 'ENERGY' },
      { unitId: 'MWH', symbol: 'MWh', name: 'Megawatt-hour', type: 'ENERGY' },
      { unitId: 'GJ', symbol: 'GJ', name: 'Gigajoule', type: 'ENERGY' },
      { unitId: 'TON_HOUR', symbol: 'Ton-hr', name: 'Refrigeration Ton-Hour', type: 'ENERGY' },
      { unitId: 'PASSENGER_KM', symbol: 'p-km', name: 'Passenger-Kilometer', type: 'DISTANCE' },
      { unitId: 'VEHICLE_KM', symbol: 'v-km', name: 'Vehicle-Kilometer', type: 'DISTANCE' },
      { unitId: 'INR', symbol: '₹', name: 'Indian Rupee', type: 'CURRENCY' },
      { unitId: 'UNIT', symbol: 'ea', name: 'Units / Items', type: 'OTHER' },
    ];
    for (const u of units) {
      this.setDoc('units', u.unitId, u as unknown as Record<string, unknown>);
    }

    // 14. 15 STANDARD SCOPE 3 CATEGORIES
    const scope3Categories = [
      { categoryNo: 1, name: 'Purchased Goods and Services', boundary: 'UPSTREAM', description: 'Extraction, production, and transportation of goods and services purchased or acquired by the reporting company in the reporting year.' },
      { categoryNo: 2, name: 'Capital Goods', boundary: 'UPSTREAM', description: 'Extraction, production, and transportation of capital goods purchased or acquired by the reporting company in the reporting year.' },
      { categoryNo: 3, name: 'Fuel- and Energy-Related Activities (Not Included in Scope 1 or 2)', boundary: 'UPSTREAM', description: 'Extraction, production, and transportation of fuels and energy purchased or acquired by the reporting company in the reporting year, not already accounted for in Scope 1 or 2.' },
      { categoryNo: 4, name: 'Upstream Transportation and Distribution', boundary: 'UPSTREAM', description: 'Transportation and distribution of products purchased by the reporting company in the reporting year between Tier 1 suppliers and facilities.' },
      { categoryNo: 5, name: 'Waste Generated in Operations', boundary: 'UPSTREAM', description: 'Disposal and treatment of waste generated in the reporting company’s operations in the reporting year.' },
      { categoryNo: 6, name: 'Business Travel', boundary: 'UPSTREAM', description: 'Transportation of employees for business-related activities in vehicles owned or operated by third parties.' },
      { categoryNo: 7, name: 'Employee Commuting', boundary: 'UPSTREAM', description: 'Transportation of employees between their homes and their worksites in vehicles not owned or operated by the reporting company.' },
      { categoryNo: 8, name: 'Upstream Leased Assets', boundary: 'UPSTREAM', description: 'Operation of assets leased by the reporting company (lessee) not already included in Scope 1 and Scope 2.' },
      { categoryNo: 9, name: 'Downstream Transportation and Distribution', boundary: 'DOWNSTREAM', description: 'Transportation and distribution of products sold by the reporting company between operations and end consumers.' },
      { categoryNo: 10, name: 'Processing of Sold Products', boundary: 'DOWNSTREAM', description: 'Processing of intermediate products sold in the reporting year by downstream companies.' },
      { categoryNo: 11, name: 'Use of Sold Products', boundary: 'DOWNSTREAM', description: 'End use of goods and services sold by the reporting company in the reporting year.' },
      { categoryNo: 12, name: 'End-of-Life Treatment of Sold Products', boundary: 'DOWNSTREAM', description: 'Waste disposal and treatment of products sold by the reporting company at the end of their life.' },
      { categoryNo: 13, name: 'Downstream Leased Assets', boundary: 'DOWNSTREAM', description: 'Operation of assets owned by the reporting company (lessor) and leased to other entities in the reporting year.' },
      { categoryNo: 14, name: 'Franchises', boundary: 'DOWNSTREAM', description: 'Operation of franchises in the reporting year, not included in Scope 1 and Scope 2.' },
      { categoryNo: 15, name: 'Investments', boundary: 'DOWNSTREAM', description: 'Operation of investments (including equity and debt investments and project finance) in the reporting year.' },
    ];
    for (const c of scope3Categories) {
      this.setDoc('scope3Categories', `CAT-${c.categoryNo}`, c as unknown as Record<string, unknown>);
    }

    // 15. VALUE CHAIN PARTNERS
    const partners = [
      { partnerId: 'PART-IOCL', name: 'Indian Oil Corporation Ltd (IOCL)', type: 'SUPPLIER', gstinOrId: '07AAACI1681G1ZM', organizationId: 'COMP001' },
      { partnerId: 'PART-TATA-STEEL', name: 'Tata Steel Limited', type: 'SUPPLIER', gstinOrId: '20AAACT2702B1Z0', organizationId: 'COMP001' },
      { partnerId: 'PART-APSPDCL', name: 'Andhra Pradesh Southern Power Distribution', type: 'UTILITY', gstinOrId: '37AAACA1997Q1Z5', organizationId: 'COMP001' },
      { partnerId: 'PART-RAMKY-TSDF', name: 'Ramky Enviro Engineers (TSDF Facility)', type: 'SUPPLIER', gstinOrId: '36AAACR7812E1ZZ', organizationId: 'COMP001' },
      { partnerId: 'PART-INDIGO', name: 'InterGlobe Aviation (IndiGo)', type: 'TRANSPORTER', gstinOrId: '06AAACO4341B1Z2', organizationId: 'COMP001' },
    ];
    for (const p of partners) {
      this.setDoc('valueChainPartners', p.partnerId, p as unknown as Record<string, unknown>);
    }

    // 16. SUBSTANCES
    const substances = [
      { substanceId: 'SUB-HSD', name: 'High Speed Diesel (BS-VI)', type: 'FUEL', physicalState: 'LIQUID', unitDefault: 'LITER' },
      { substanceId: 'SUB-PNG', name: 'Piped Natural Gas (PNG)', type: 'FUEL', physicalState: 'GAS', unitDefault: 'SCM' },
      { substanceId: 'SUB-R410A', name: 'Refrigerant R-410A (50/50 HFC-32 / HFC-125)', type: 'REFRIGERANT', physicalState: 'GAS', unitDefault: 'KG' },
      { substanceId: 'SUB-R134A', name: 'Refrigerant R-134a (1,1,1,2-Tetrafluoroethane)', type: 'REFRIGERANT', physicalState: 'GAS', unitDefault: 'KG' },
      { substanceId: 'SUB-STEEL', name: 'Structural TMT Reinforcement Steel', type: 'RAW_MATERIAL', physicalState: 'SOLID', unitDefault: 'MT' },
      { substanceId: 'SUB-OIL-SLUDGE', name: 'Used Engine Lube Oil Sludge (Schedule 1)', type: 'WASTE', physicalState: 'LIQUID', unitDefault: 'MT' },
    ];
    for (const sub of substances) {
      this.setDoc('substances', sub.substanceId, sub as unknown as Record<string, unknown>);
    }

    // 17. INITIAL DEMO ACTIVITY RECORDS (SCOPE 1, 2, 3)
    const demoActivities = [
      {
        activityId: 'ACT-2025-001',
        organizationId: 'COMP001',
        companyId: 'COMP001',
        businessUnitId: 'BU001',
        projectId: 'PROJ001',
        facilityId: 'FAC001',
        reportingPeriodId: 'Q3_FY2526',
        emissionSourceId: 'SRC-DG-01',
        scopeNo: 1,
        scope3CategoryNo: null,
        activityTypeId: 'ACT-DIESEL-GEN',
        recordNature: 'ACTIVITY',
        activityDate: '2025-10-15',
        periodStart: '2025-10-01',
        periodEnd: '2025-10-31',
        description: 'Monthly diesel consumption for 4x DG sets during auxiliary grid maintenance',
        quantity: 100000,
        unitId: 'LITER',
        spendAmount: 8900000,
        currencyCode: 'INR',
        dataMethod: 'INVOICE_QUANTITY',
        sourceReference: 'IOCL Bulk Tax Invoice #IOCL/B/2025/8921',
        invoiceOrMeterRef: 'DG-METER-01 to 04 Log',
        estimatedFlag: false,
        workflowStatus: 'SUBMITTED',
        enteredBy: 'USR001',
        enteredByName: 'Rajesh Kumar',
        enteredAt: 1728733920000,
        currentVersion: 1,
        isActive: true,
        linkedEvidenceIds: ['DOC-EV-001'],
        scope1Details: {
          category: 'Stationary Combustion',
          combustionType: 'INTERNAL_COMBUSTION',
          fuelSubstanceId: 'SUB-HSD',
          equipmentType: 'DIESEL_GENERATOR',
          netCalorificValue: 42.6,
          density: 0.84,
          notes: 'IOCL dispensary batch 2025-B4',
        },
      },
      {
        activityId: 'ACT-2025-002',
        organizationId: 'COMP001',
        companyId: 'COMP001',
        businessUnitId: 'BU002',
        projectId: 'PROJ003',
        facilityId: 'FAC003',
        reportingPeriodId: 'Q3_FY2526',
        emissionSourceId: 'SRC-BOILER-01',
        scopeNo: 1,
        scope3CategoryNo: null,
        activityTypeId: 'ACT-NAT-GAS',
        recordNature: 'ACTIVITY',
        activityDate: '2025-11-05',
        periodStart: '2025-11-01',
        periodEnd: '2025-11-30',
        description: 'Piped natural gas consumption for tunnel portal boiler heating',
        quantity: 45000,
        unitId: 'SCM',
        spendAmount: 2250000,
        currencyCode: 'INR',
        dataMethod: 'METER',
        sourceReference: 'GAIL Joint Meter Slip Nov 2025',
        invoiceOrMeterRef: 'GAIL-MTR-8819',
        estimatedFlag: false,
        workflowStatus: 'DRAFT',
        enteredBy: 'USR002',
        enteredByName: 'K. Srinivas',
        enteredAt: 1728906720000,
        currentVersion: 1,
        isActive: true,
        scope1Details: {
          category: 'Stationary Combustion',
          combustionType: 'BOILER_FURNACE',
          fuelSubstanceId: 'SUB-PNG',
          notes: 'High-altitude sub-zero heating line',
        },
      },
      {
        activityId: 'ACT-2025-003',
        organizationId: 'COMP001',
        companyId: 'COMP001',
        businessUnitId: 'BU001',
        projectId: 'PROJ001',
        facilityId: 'FAC001',
        reportingPeriodId: 'Q3_FY2526',
        emissionSourceId: 'SRC-CHILLER-01',
        scopeNo: 1,
        scope3CategoryNo: null,
        activityTypeId: 'ACT-REFRIG-LEAK',
        recordNature: 'ACTIVITY',
        activityDate: '2025-11-18',
        periodStart: '2025-11-01',
        periodEnd: '2025-11-30',
        description: 'Refrigerant gas top-up following routine seasonal HVAC maintenance',
        quantity: 14.8,
        unitId: 'KG',
        spendAmount: 74000,
        currencyCode: 'INR',
        dataMethod: 'MEASURED',
        sourceReference: 'Carrier Service Work Order #CR-4412',
        invoiceOrMeterRef: 'CYLINDER-WEIGH-03',
        estimatedFlag: false,
        workflowStatus: 'SITE_REVIEWED',
        enteredBy: 'USR001',
        enteredByName: 'Rajesh Kumar',
        enteredAt: 1728993120000,
        reviewedBy: 'USR002',
        reviewedByName: 'K. Srinivas',
        reviewedAt: 1729079520000,
        currentVersion: 1,
        isActive: true,
        scope1Details: {
          category: 'Fugitive Emissions',
          fugitiveType: 'REFRIGERANT_HVAC',
          substanceId: 'SUB-R410A',
          gasId: 'R-410A',
          addedQty: 14.8,
          notes: 'Certified sealed replacement',
        },
      },
      {
        activityId: 'ACT-2025-004',
        organizationId: 'COMP001',
        companyId: 'COMP001',
        businessUnitId: 'BU001',
        projectId: 'PROJ002',
        facilityId: 'FAC002',
        reportingPeriodId: 'Q3_FY2526',
        emissionSourceId: 'SRC-METER-HT-01',
        scopeNo: 2,
        scope3CategoryNo: null,
        activityTypeId: 'ACT-GRID-ELEC',
        recordNature: 'ACTIVITY',
        activityDate: '2025-11-02',
        periodStart: '2025-11-01',
        periodEnd: '2025-11-30',
        description: 'Grid electricity purchase statement from APSPDCL HT service feeder',
        quantity: 420500,
        unitId: 'KWH',
        spendAmount: 3784500,
        currencyCode: 'INR',
        dataMethod: 'METER',
        sourceReference: 'APSPDCL HT Consumer Bill #HT-08819',
        invoiceOrMeterRef: 'APSPDCL-MTR-902',
        estimatedFlag: false,
        workflowStatus: 'ESG_REVIEWED',
        enteredBy: 'USR001',
        enteredByName: 'Rajesh Kumar',
        enteredAt: 1728820320000,
        reviewedBy: 'USR003',
        reviewedByName: 'Sunita Sharma',
        reviewedAt: 1728993120000,
        currentVersion: 1,
        isActive: true,
        linkedEvidenceIds: ['DOC-EV-002'],
        scope2Details: {
          energyType: 'Electricity',
          supplierPartnerId: 'PART-APSPDCL',
          meterIdentifier: 'APSPDCL-MTR-902',
          gridRegion: 'SOUTHERN_REGIONAL_GRID',
          procurementType: 'GRID_HT_CONTRACT',
          accountingMethod: 'LOCATION_BASED',
          renewableFlag: false,
          renewablePercentage: 0,
        },
      },
      {
        activityId: 'ACT-2025-005',
        organizationId: 'COMP001',
        companyId: 'COMP001',
        businessUnitId: 'BU001',
        projectId: 'PROJ002',
        facilityId: 'FAC002',
        reportingPeriodId: 'Q3_FY2526',
        emissionSourceId: 'SRC-SOLAR-01',
        scopeNo: 2,
        scope3CategoryNo: null,
        activityTypeId: 'ACT-RENEW-SOLAR',
        recordNature: 'ACTIVITY',
        activityDate: '2025-11-30',
        periodStart: '2025-11-01',
        periodEnd: '2025-11-30',
        description: 'Captive onsite rooftop solar generation displacing grid drawdown',
        quantity: 120000,
        unitId: 'KWH',
        spendAmount: 0,
        currencyCode: 'INR',
        dataMethod: 'METER',
        sourceReference: 'SMA Inverter Gateway Daily Generation Log',
        invoiceOrMeterRef: 'SOLAR-GEN-MTR-01',
        estimatedFlag: false,
        workflowStatus: 'APPROVED',
        enteredBy: 'USR001',
        enteredByName: 'Rajesh Kumar',
        enteredAt: 1729079520000,
        reviewedBy: 'USR004',
        reviewedByName: 'P. Venkat Rao',
        reviewedAt: 1729165920000,
        currentVersion: 1,
        isActive: true,
        scope2Details: {
          energyType: 'Electricity',
          meterIdentifier: 'SOLAR-GEN-MTR-01',
          gridRegion: 'SOUTHERN_REGIONAL_GRID',
          procurementType: 'CAPTIVE_SOLAR',
          accountingMethod: 'MARKET_BASED',
          renewableFlag: true,
          renewablePercentage: 100,
          certificateType: 'REC_ZERO_EMISSION',
          certificateReference: 'REC-2025-SLR-9921',
        },
      },
      {
        activityId: 'ACT-2025-006',
        organizationId: 'COMP001',
        companyId: 'COMP001',
        businessUnitId: 'BU002',
        projectId: 'PROJ003',
        facilityId: 'FAC003',
        reportingPeriodId: 'Q3_FY2526',
        scopeNo: 3,
        scope3CategoryNo: 1,
        activityTypeId: 'ACT-STEEL-PURCH',
        recordNature: 'ACTIVITY',
        activityDate: '2025-10-22',
        periodStart: '2025-10-01',
        periodEnd: '2025-10-31',
        description: 'Procurement of structural steel Fe550D TMT rebars from primary blast furnace route',
        quantity: 1250,
        unitId: 'MT',
        spendAmount: 78750000,
        currencyCode: 'INR',
        dataMethod: 'SUPPLIER_DATA',
        sourceReference: 'Tata Steel Mill Test Certificate & Invoices #TS-8819',
        invoiceOrMeterRef: 'TATA-INV-2025-992',
        estimatedFlag: false,
        workflowStatus: 'SUBMITTED',
        enteredBy: 'USR002',
        enteredByName: 'K. Srinivas',
        enteredAt: 1728906720000,
        currentVersion: 1,
        isActive: true,
        scope3Details: {
          scope3CategoryNo: 1,
          categoryName: 'Purchased Goods and Services',
          calculationMethod: 'SUPPLIER_SPECIFIC_EPD',
          dataSourceType: 'SUPPLIER_VERIFIED_EPD',
          supplierSpecificFlag: true,
          allocationRequiredFlag: false,
          primaryDataPercentage: 85,
          secondaryDataPercentage: 15,
        },
      },
      {
        activityId: 'ACT-2025-007',
        organizationId: 'COMP001',
        companyId: 'COMP001',
        businessUnitId: 'BU001',
        projectId: 'PROJ001',
        facilityId: 'FAC001',
        reportingPeriodId: 'Q3_FY2526',
        scopeNo: 3,
        scope3CategoryNo: 5,
        activityTypeId: 'ACT-WASTE-HAZ',
        recordNature: 'ACTIVITY',
        activityDate: '2025-10-28',
        periodStart: '2025-10-01',
        periodEnd: '2025-10-31',
        description: 'Statutory hazardous engine oil and chemical sludge sent to accredited TSDF incineration',
        quantity: 14.8,
        unitId: 'MT',
        spendAmount: 296000,
        currencyCode: 'INR',
        dataMethod: 'MEASURED',
        sourceReference: 'Form 10 Manifest CPCB Consignment #RAMKY/TSDF/0842',
        invoiceOrMeterRef: 'WEIGH-BRIDGE-TSDF-01',
        estimatedFlag: false,
        workflowStatus: 'SITE_REVIEWED',
        enteredBy: 'USR001',
        enteredByName: 'Rajesh Kumar',
        enteredAt: 1728906720000,
        reviewedBy: 'USR002',
        reviewedByName: 'K. Srinivas',
        reviewedAt: 1729079520000,
        currentVersion: 1,
        isActive: true,
        linkedEvidenceIds: ['DOC-EV-003'],
        scope3Details: {
          scope3CategoryNo: 5,
          categoryName: 'Waste Generated in Operations',
          calculationMethod: 'WASTE_TYPE_SPECIFIC',
          dataSourceType: 'STATUTORY_MANIFEST',
          supplierSpecificFlag: true,
          primaryDataPercentage: 100,
        },
      },
      {
        activityId: 'ACT-2025-008',
        organizationId: 'GROUP001',
        companyId: 'COMP001',
        reportingPeriodId: 'Q3_FY2526',
        scopeNo: 3,
        scope3CategoryNo: 6,
        activityTypeId: 'ACT-AIR-TRAVEL',
        recordNature: 'ACTIVITY',
        activityDate: '2025-11-12',
        periodStart: '2025-11-01',
        periodEnd: '2025-11-30',
        description: 'Domestic commercial flights between Hyderabad HQ and Delhi regional project offices',
        quantity: 48,
        unitId: 'UNIT',
        spendAmount: 432000,
        currencyCode: 'INR',
        dataMethod: 'SUPPLIER_DATA',
        sourceReference: 'Corporate Travel Portal ERP Ledger Nov 2025',
        invoiceOrMeterRef: 'INDIGO-CORP-INV-881',
        estimatedFlag: false,
        workflowStatus: 'DRAFT',
        enteredBy: 'USR004',
        enteredByName: 'Group ESG Admin',
        enteredAt: 1729165920000,
        currentVersion: 1,
        isActive: true,
        scope3Details: {
          scope3CategoryNo: 6,
          categoryName: 'Business Travel',
          calculationMethod: 'DISTANCE_BASED',
          dataSourceType: 'TRAVEL_AGENT_REPORT',
          supplierSpecificFlag: false,
          primaryDataPercentage: 90,
        },
      },
    ];

    for (const act of demoActivities) {
      this.setDoc('activityRecords', act.activityId, act as unknown as Record<string, unknown>);
    }

    // 18. INITIAL AUDIT REVIEWS (PHASE 5 AUDIT & ASSURANCE)
    const demoAuditReviews = [
      {
        reviewId: 'REV-2025-001',
        activityId: 'ACT-2025-001',
        reportingPeriodId: 'Q3_FY2526',
        organizationId: 'COMP001',
        companyId: 'COMP001',
        businessUnitId: 'BU001',
        projectId: 'PROJ001',
        facilityId: 'FAC001',
        scopeNo: 1,
        activityTypeId: 'ACT-DIESEL-GEN',
        activityName: 'Monthly diesel consumption for 4x DG sets during auxiliary grid maintenance',
        assignedAuditorId: 'USR005',
        assignedAuditorName: 'Sustainability Auditor (Dr. Ananya Sen, EY LLP)',
        assignedAt: 1729000000000,
        auditStatus: 'IN_REVIEW',
        assuranceLevel: 'ISAE_3000_LIMITED',
        originalQuantity: 100000,
        originalUnit: 'LITER',
        originalSpend: 8900000,
        originalCO2e: 268.0,
        verifiedQuantity: 100000,
        verifiedUnit: 'LITER',
        verifiedEmissionFactor: 2.68,
        verifiedCO2e: 268.0,
        variancePercentage: 0.0,
        findingsCount: 0,
        observations: 'Stationary diesel log matched against bulk tax invoice IOCL/B/2025/8921 and meter logbook. CEA/DEFRA standard factor (2.68 kgCO2e/L) verified.',
        conclusion: 'Ready for statutory assurance sign-off upon final review of auxiliary fuel logbook.',
        updatedAt: 1729100000000,
      },
      {
        reviewId: 'REV-2025-002',
        activityId: 'ACT-2025-002',
        reportingPeriodId: 'Q3_FY2526',
        organizationId: 'COMP001',
        companyId: 'COMP001',
        businessUnitId: 'BU002',
        projectId: 'PROJ003',
        facilityId: 'FAC003',
        scopeNo: 1,
        activityTypeId: 'ACT-NAT-GAS',
        activityName: 'Piped natural gas consumption for tunnel portal boiler heating',
        assignedAuditorId: 'USR005',
        assignedAuditorName: 'Sustainability Auditor (Dr. Ananya Sen, EY LLP)',
        assignedAt: 1729010000000,
        auditStatus: 'PENDING_REVIEW',
        assuranceLevel: 'ISAE_3000_LIMITED',
        originalQuantity: 45000,
        originalUnit: 'SCM',
        originalSpend: 2250000,
        originalCO2e: 90.9,
        findingsCount: 0,
        updatedAt: 1729010000000,
      },
      {
        reviewId: 'REV-2025-003',
        activityId: 'ACT-2025-003',
        reportingPeriodId: 'Q3_FY2526',
        organizationId: 'COMP001',
        companyId: 'COMP001',
        businessUnitId: 'BU001',
        projectId: 'PROJ001',
        facilityId: 'FAC001',
        scopeNo: 1,
        activityTypeId: 'ACT-REFRIG-LEAK',
        activityName: 'Refrigerant gas top-up following routine seasonal HVAC maintenance',
        assignedAuditorId: 'USR005',
        assignedAuditorName: 'Sustainability Auditor (Dr. Ananya Sen, EY LLP)',
        assignedAt: 1729020000000,
        auditStatus: 'REQUIRES_CLARIFICATION',
        assuranceLevel: 'ISAE_3000_LIMITED',
        originalQuantity: 14.8,
        originalUnit: 'KG',
        originalSpend: 74000,
        originalCO2e: 30.9,
        verifiedQuantity: 14.8,
        verifiedUnit: 'KG',
        verifiedEmissionFactor: 2088.0,
        verifiedCO2e: 30.9,
        variancePercentage: 0.0,
        findingsCount: 1,
        observations: 'Carrier service invoice indicates 14.8 kg R-410A added. Clarification needed on cylinder test certificate and recovery logs.',
        updatedAt: 1729120000000,
      },
      {
        reviewId: 'REV-2025-004',
        activityId: 'ACT-2025-004',
        reportingPeriodId: 'Q3_FY2526',
        organizationId: 'COMP001',
        companyId: 'COMP001',
        businessUnitId: 'BU001',
        projectId: 'PROJ002',
        facilityId: 'FAC002',
        scopeNo: 2,
        activityTypeId: 'ACT-GRID-ELEC',
        activityName: 'Grid electricity purchase statement from APSPDCL HT service feeder',
        assignedAuditorId: 'USR005',
        assignedAuditorName: 'Sustainability Auditor (Dr. Ananya Sen, EY LLP)',
        assignedAt: 1728900000000,
        auditStatus: 'VERIFIED',
        assuranceLevel: 'ISAE_3000_LIMITED',
        originalQuantity: 420500,
        originalUnit: 'KWH',
        originalSpend: 3784500,
        originalCO2e: 301.08,
        verifiedQuantity: 420500,
        verifiedUnit: 'KWH',
        verifiedEmissionFactor: 0.716,
        verifiedCO2e: 301.08,
        variancePercentage: 0.0,
        findingsCount: 0,
        observations: 'Feeder HT meter matched with APSPDCL utility invoice #HT-08819. CEA v19 grid baseline factor (0.716 kgCO2e/kWh) confirmed.',
        conclusion: 'Verified without qualification under ISAE 3000 Limited Assurance standards.',
        verifiedAt: 1729160000000,
        verifiedBy: 'USR005',
        verifiedByName: 'Dr. Ananya Sen (EY LLP)',
        updatedAt: 1729160000000,
      },
      {
        reviewId: 'REV-2025-005',
        activityId: 'ACT-2025-005',
        reportingPeriodId: 'Q3_FY2526',
        organizationId: 'COMP001',
        companyId: 'COMP001',
        businessUnitId: 'BU001',
        projectId: 'PROJ002',
        facilityId: 'FAC002',
        scopeNo: 2,
        activityTypeId: 'ACT-RENEW-SOLAR',
        activityName: 'Captive onsite rooftop solar generation displacing grid drawdown',
        assignedAuditorId: 'USR005',
        assignedAuditorName: 'Sustainability Auditor (Dr. Ananya Sen, EY LLP)',
        assignedAt: 1728950000000,
        auditStatus: 'VERIFIED',
        assuranceLevel: 'ISAE_3000_LIMITED',
        originalQuantity: 120000,
        originalUnit: 'KWH',
        originalSpend: 0,
        originalCO2e: 0.0,
        verifiedQuantity: 120000,
        verifiedUnit: 'KWH',
        verifiedEmissionFactor: 0.0,
        verifiedCO2e: 0.0,
        variancePercentage: 0.0,
        findingsCount: 0,
        observations: 'Onsite SMA Inverter Gateway telemetric log confirms zero GHG intensity.',
        conclusion: 'Scope 2 captive generation verified with 0.0 tCO2e emissions impact.',
        verifiedAt: 1729170000000,
        verifiedBy: 'USR005',
        verifiedByName: 'Dr. Ananya Sen (EY LLP)',
        updatedAt: 1729170000000,
      },
      {
        reviewId: 'REV-2025-006',
        activityId: 'ACT-2025-006',
        reportingPeriodId: 'Q3_FY2526',
        organizationId: 'COMP001',
        companyId: 'COMP001',
        businessUnitId: 'BU001',
        projectId: 'PROJ001',
        facilityId: 'FAC001',
        scopeNo: 3,
        activityTypeId: 'ACT-STEEL-PURCH',
        activityName: 'High tensile reinforcement structural steel rebars from primary blast furnace route',
        assignedAuditorId: 'USR005',
        assignedAuditorName: 'Sustainability Auditor (Dr. Ananya Sen, EY LLP)',
        assignedAt: 1729050000000,
        auditStatus: 'IN_REVIEW',
        assuranceLevel: 'ISAE_3000_LIMITED',
        originalQuantity: 2400,
        originalUnit: 'MT',
        originalSpend: 144000000,
        originalCO2e: 4440.0,
        verifiedQuantity: 2400,
        verifiedUnit: 'MT',
        verifiedEmissionFactor: 1850.0,
        verifiedCO2e: 4440.0,
        variancePercentage: 0.0,
        findingsCount: 0,
        observations: 'Tata Steel mill test certificates and gate dispatch notes confirmed. World Steel Association average baseline applied.',
        updatedAt: 1729130000000,
      },
      {
        reviewId: 'REV-2025-007',
        activityId: 'ACT-2025-007',
        reportingPeriodId: 'Q3_FY2526',
        organizationId: 'COMP001',
        companyId: 'COMP001',
        businessUnitId: 'BU001',
        projectId: 'PROJ001',
        facilityId: 'FAC001',
        scopeNo: 3,
        activityTypeId: 'ACT-WASTE-HAZ',
        activityName: 'Statutory hazardous engine oil and chemical sludge sent to accredited TSDF incineration',
        assignedAuditorId: 'USR005',
        assignedAuditorName: 'Sustainability Auditor (Dr. Ananya Sen, EY LLP)',
        assignedAt: 1729060000000,
        auditStatus: 'CORRECTION_REQUIRED',
        assuranceLevel: 'ISAE_3000_LIMITED',
        originalQuantity: 14.8,
        originalUnit: 'MT',
        originalSpend: 296000,
        originalCO2e: 12.14,
        findingsCount: 1,
        observations: 'Form 10 Manifest shows 14.8 MT whereas Ramky weighbridge slip indicates 15.1 MT net. Correction required.',
        updatedAt: 1729140000000,
      },
    ];

    for (const rev of demoAuditReviews) {
      this.setDoc('auditReviews', rev.reviewId, rev as unknown as Record<string, unknown>);
    }

    // 19. INITIAL AUDIT FINDINGS
    const demoAuditFindings = [
      {
        findingId: 'FIND-001',
        reviewId: 'REV-2025-003',
        activityId: 'ACT-2025-003',
        severity: 'HIGH',
        category: 'MISSING_EVIDENCE',
        title: 'Missing Refrigerant Recovery Certificate & Cylinder Log',
        description: 'The reported 14.8 kg top-up does not include cylinder serial numbers or certified recovery notes for displaced refrigerant under CPCB ODS rules.',
        recommendation: 'Provide Carrier OEM service engineer certificate stating recovered quantity and disposal or hermetic containment.',
        status: 'CLARIFICATION_REQUESTED',
        reportedBy: 'USR005',
        reportedByName: 'Dr. Ananya Sen (EY LLP)',
        reportedAt: 1729120000000,
      },
      {
        findingId: 'FIND-002',
        reviewId: 'REV-2025-007',
        activityId: 'ACT-2025-007',
        severity: 'MEDIUM',
        category: 'DATA_DISCREPANCY',
        title: 'Weighbridge Net vs Form 10 Consignment Weight Variance',
        description: 'Reported 14.8 MT in activity ledger differs from Ramky TSDF gate weighbridge slip indicating 15.6 MT gross minus 0.5 MT tare = 15.1 MT net.',
        recommendation: 'Amend activity record quantity to 15.1 MT or attach signed transporter reconciliation note explaining moisture loss.',
        status: 'OPEN',
        reportedBy: 'USR005',
        reportedByName: 'Dr. Ananya Sen (EY LLP)',
        reportedAt: 1729140000000,
      },
    ];

    for (const f of demoAuditFindings) {
      this.setDoc('auditFindings', f.findingId, f as unknown as Record<string, unknown>);
    }

    // 20. INITIAL AUDIT CLARIFICATIONS
    const demoAuditClarifications = [
      {
        clarificationId: 'CLR-001',
        reviewId: 'REV-2025-003',
        activityId: 'ACT-2025-003',
        findingId: 'FIND-001',
        requestedBy: 'USR005',
        requestedByName: 'Sustainability Auditor (Dr. Ananya Sen, EY LLP)',
        requestedByRole: 'AUDITOR',
        requestedAt: 1729125000000,
        question: 'Carrier service work order references 14.8 kg R-410A top-up but lacks gas cylinder batch certificate and old gas recovery log. Please provide cylinder recovery log.',
        targetScope: {
          companyId: 'COMP001',
          businessUnitId: 'BU001',
          projectId: 'PROJ001',
          facilityId: 'FAC001',
        },
        responseStatus: 'PENDING',
      },
    ];

    for (const clr of demoAuditClarifications) {
      this.setDoc('auditClarifications', clr.clarificationId, clr as unknown as Record<string, unknown>);
    }

    // 21. INITIAL RECONCILIATION CASES (PHASE 6 RECONCILIATION & CORRECTION)
    const demoReconciliationCases = [
      {
        caseId: 'REC-2025-001',
        caseNumber: 'REC-2025-001',
        activityId: 'ACT-2025-001',
        reviewId: 'REV-2025-001',
        reportingPeriodId: 'FY2024-25-Q3',
        scopeNo: 1,
        category: 'Diesel Consumption (Scope 1)',
        organizationId: 'MEIL-GROUP',
        companyId: 'COMP001',
        businessUnitId: 'BU001',
        projectId: 'PROJ001',
        facilityId: 'FAC001',
        facilityName: 'Subansiri Hydro Electric (2000 MW)',
        caseType: 'QUANTITY_VARIANCE',
        materiality: 'MATERIAL',
        status: 'CORRECTION_REQUESTED',
        originalSubmitted: {
          quantity: 100000,
          unit: 'LITER',
          spend: 8900000,
          emissionFactor: 2.68,
          emissionFactorSource: 'CEA / DEFRA 2025 (Stationary Diesel DG)',
          co2e: 268.0,
          grossKgCO2e: 268000,
          submittedBy: 'USR001',
          submittedByName: 'Rajesh Kumar (Site Facility Eng.)',
          submittedAt: 1729100000000,
          evidenceDocumentIds: ['DOC-001'],
        },
        auditorAssessed: {
          quantity: 110000,
          unit: 'LITER',
          emissionFactor: 2.68,
          emissionFactorSource: 'CEA / DEFRA 2025 (Stationary Diesel DG)',
          co2e: 294.8,
          grossKgCO2e: 294800,
          assessedBy: 'USR005',
          assessedByName: 'Dr. Ananya Sen (EY LLP)',
          assessedAt: 1729110000000,
          observations: 'IOCL fuel dispatch log confirms 110,000 Liters delivered and consumed across three CAT 1500 kVA gensets. Gate entry slip G-409 omitted in original submission.',
          findingIds: ['FIND-001'],
        },
        variance: {
          quantityDelta: 10000,
          quantityDeltaPercentage: 10.0,
          co2eDelta: 26.8,
          co2eDeltaPercentage: 10.0,
          isMaterial: true,
          thresholdPercentage: 2.0,
        },
        rootCause: 'Depot gate delivery slip G-409 (10,000 Liters) received after month-end ledger cutoff was not aggregated in the draft submission.',
        assignedToRole: 'PROJECT_USER',
        assignedToUserId: 'USR001',
        assignedToUserName: 'Rajesh Kumar',
        dueDate: 1730000000000,
        activeCorrectionRequestId: 'CR-2025-001',
        createdAt: 1729112000000,
        updatedAt: 1729112000000,
      },
      {
        caseId: 'REC-2025-002',
        caseNumber: 'REC-2025-002',
        activityId: 'ACT-2025-002',
        reviewId: 'REV-2025-002',
        reportingPeriodId: 'FY2024-25-Q3',
        scopeNo: 2,
        category: 'Grid Electricity (Scope 2)',
        organizationId: 'MEIL-GROUP',
        companyId: 'COMP001',
        businessUnitId: 'BU001',
        projectId: 'PROJ001',
        facilityId: 'FAC001',
        facilityName: 'Northern Power Enclosure',
        caseType: 'QUANTITY_VARIANCE',
        materiality: 'IMMATERIAL',
        status: 'RESOLVED',
        originalSubmitted: {
          quantity: 11731843,
          unit: 'KWH',
          spend: 84000000,
          emissionFactor: 0.716,
          emissionFactorSource: 'CEA CO2 Baseline Database v19 (India Grid)',
          co2e: 8400.0,
          grossKgCO2e: 8400000,
          submittedBy: 'USR001',
          submittedByName: 'Rajesh Kumar (Site Facility Eng.)',
          submittedAt: 1729105000000,
          evidenceDocumentIds: ['DOC-002'],
        },
        auditorAssessed: {
          quantity: 11731843,
          unit: 'KWH',
          emissionFactor: 0.716,
          emissionFactorSource: 'CEA CO2 Baseline Database v19 (India Grid)',
          co2e: 8400.0,
          grossKgCO2e: 8400000,
          assessedBy: 'USR005',
          assessedByName: 'Dr. Ananya Sen (EY LLP)',
          assessedAt: 1729115000000,
          observations: 'DISCOM smart meter logs match billing vouchers with zero delta variance.',
        },
        variance: {
          quantityDelta: 0,
          quantityDeltaPercentage: 0.0,
          co2eDelta: 0,
          co2eDeltaPercentage: 0.0,
          isMaterial: false,
          thresholdPercentage: 2.0,
        },
        resolutionSummary: 'Verified against State Load Dispatch Centre utility meter certificates. Case reconciled with zero variance.',
        resolvedAt: 1729120000000,
        resolvedBy: 'USR005',
        resolvedByName: 'Dr. Ananya Sen (EY LLP)',
        createdAt: 1729115000000,
        updatedAt: 1729120000000,
      },
      {
        caseId: 'REC-2025-003',
        caseNumber: 'REC-2025-003',
        activityId: 'ACT-2025-003',
        reviewId: 'REV-2025-003',
        reportingPeriodId: 'FY2024-25-Q3',
        scopeNo: 1,
        category: 'Heavy Fuel Oil (Boilers)',
        organizationId: 'MEIL-GROUP',
        companyId: 'COMP001',
        businessUnitId: 'BU002',
        projectId: 'PROJ002',
        facilityId: 'FAC002',
        facilityName: 'BHEL Fabrication Enclosure',
        caseType: 'QUANTITY_VARIANCE',
        materiality: 'MATERIAL',
        status: 'CORRECTION_REQUESTED',
        originalSubmitted: {
          quantity: 45000,
          unit: 'LITER',
          spend: 3200000,
          emissionFactor: 3.19,
          emissionFactorSource: 'HFO Boilers / Fuel Combustion',
          co2e: 143.55,
          grossKgCO2e: 143550,
          submittedBy: 'USR001',
          submittedByName: 'Rajesh Kumar',
          submittedAt: 1729110000000,
        },
        auditorAssessed: {
          quantity: 49200,
          unit: 'LITER',
          emissionFactor: 3.19,
          emissionFactorSource: 'HFO Boilers / Fuel Combustion',
          co2e: 156.95,
          grossKgCO2e: 156948,
          assessedBy: 'USR005',
          assessedByName: 'Dr. Ananya Sen (EY LLP)',
          assessedAt: 1729125000000,
          observations: 'Boiler tank level calibration dip-chart readings show 49,200 L total drawn during commissioning trials.',
        },
        variance: {
          quantityDelta: 4200,
          quantityDeltaPercentage: 9.33,
          co2eDelta: 13.4,
          co2eDeltaPercentage: 9.33,
          isMaterial: true,
          thresholdPercentage: 2.0,
        },
        rootCause: 'Calibration dip readings from boiler pre-heat run not incorporated.',
        assignedToRole: 'BUSINESS_UNIT_USER',
        assignedToUserId: 'USR002',
        assignedToUserName: 'Vikram Malhotra',
        dueDate: 1730100000000,
        activeCorrectionRequestId: 'CR-2025-003',
        createdAt: 1729125000000,
        updatedAt: 1729125000000,
      },
      {
        caseId: 'REC-2025-004',
        caseNumber: 'REC-2025-004',
        activityId: 'ACT-2025-004',
        reviewId: 'REV-2025-004',
        reportingPeriodId: 'FY2024-25-Q3',
        scopeNo: 3,
        category: 'HCV Cement Transport (Scope 3)',
        organizationId: 'MEIL-GROUP',
        companyId: 'COMP001',
        businessUnitId: 'BU001',
        projectId: 'PROJ001',
        facilityId: 'FAC001',
        facilityName: 'Zojila Tunnel Site Portal',
        caseType: 'QUANTITY_VARIANCE',
        materiality: 'MATERIAL',
        status: 'CORRECTION_SUBMITTED',
        originalSubmitted: {
          quantity: 117647,
          unit: 'T-KM',
          spend: 14500000,
          emissionFactor: 0.0952,
          emissionFactorSource: 'GLEC / Freight Road Transport',
          co2e: 11.2,
          grossKgCO2e: 11200,
          submittedBy: 'USR001',
          submittedByName: 'Rajesh Kumar',
          submittedAt: 1729115000000,
        },
        auditorAssessed: {
          quantity: 120273,
          unit: 'T-KM',
          emissionFactor: 0.0952,
          emissionFactorSource: 'GLEC / Freight Road Transport',
          co2e: 11.45,
          grossKgCO2e: 11450,
          assessedBy: 'USR005',
          assessedByName: 'Dr. Ananya Sen (EY LLP)',
          assessedAt: 1729130000000,
          observations: 'Transporter toll receipts show detour route taken via Gagangir checkpost (+2,626 T-KM).',
        },
        variance: {
          quantityDelta: 2626,
          quantityDeltaPercentage: 2.23,
          co2eDelta: 0.25,
          co2eDeltaPercentage: 2.23,
          isMaterial: true,
          thresholdPercentage: 2.0,
        },
        rootCause: 'Detour route necessitated by landslide diversion along NH-1.',
        assignedToRole: 'PROJECT_USER',
        assignedToUserId: 'USR001',
        assignedToUserName: 'Rajesh Kumar',
        activeCorrectionRequestId: 'CR-2025-004',
        correctedData: {
          correctedQuantity: 120273,
          correctedUnit: 'T-KM',
          recalculatedCO2e: 11.45,
          grossKgCO2e: 11450,
          justification: 'Attached border roads task force detour logs confirming 2,626 T-KM landslide bypass.',
          submittedBy: 'USR001',
          submittedByName: 'Rajesh Kumar',
          submittedAt: 1729150000000,
        },
        createdAt: 1729130000000,
        updatedAt: 1729150000000,
      },
      {
        caseId: 'REC-2025-005',
        caseNumber: 'REC-2025-005',
        activityId: 'ACT-2025-005',
        reviewId: 'REV-2025-005',
        reportingPeriodId: 'FY2024-25-Q3',
        scopeNo: 2,
        category: 'Captive Solar Generation',
        organizationId: 'MEIL-GROUP',
        companyId: 'COMP001',
        businessUnitId: 'BU002',
        projectId: 'PROJ002',
        facilityId: 'FAC002',
        facilityName: 'Hyderabad Fabrication Yard',
        caseType: 'QUANTITY_VARIANCE',
        materiality: 'IMMATERIAL',
        status: 'RESOLVED',
        originalSubmitted: {
          quantity: 950000,
          unit: 'KWH',
          spend: 0,
          emissionFactor: 0.0,
          emissionFactorSource: 'Onsite Renewable Zero-Emission',
          co2e: 0.0,
          grossKgCO2e: 0,
          submittedBy: 'USR002',
          submittedByName: 'Vikram Malhotra',
          submittedAt: 1729120000000,
        },
        auditorAssessed: {
          quantity: 950000,
          unit: 'KWH',
          emissionFactor: 0.0,
          co2e: 0.0,
          grossKgCO2e: 0,
          assessedBy: 'USR005',
          assessedByName: 'Dr. Ananya Sen (EY LLP)',
          assessedAt: 1729135000000,
          observations: 'SMA inverter generation meter readings verified with zero discrepancy.',
        },
        variance: {
          quantityDelta: 0,
          quantityDeltaPercentage: 0.0,
          co2eDelta: 0,
          co2eDeltaPercentage: 0.0,
          isMaterial: false,
          thresholdPercentage: 2.0,
        },
        resolutionSummary: 'Bi-directional net metering logs cross-verified with DISCOM. Case closed matched.',
        resolvedAt: 1729138000000,
        resolvedBy: 'USR005',
        resolvedByName: 'Dr. Ananya Sen (EY LLP)',
        createdAt: 1729135000000,
        updatedAt: 1729138000000,
      },
    ];

    for (const c of demoReconciliationCases) {
      this.setDoc('reconciliationCases', c.caseId, c as unknown as Record<string, unknown>);
    }

    // 22. INITIAL CORRECTION REQUESTS
    const demoCorrectionRequests = [
      {
        requestId: 'CR-2025-001',
        caseId: 'REC-2025-001',
        activityId: 'ACT-2025-001',
        reviewId: 'REV-2025-001',
        requestedBy: 'USR005',
        requestedByName: 'Dr. Ananya Sen (Lead Assurer, EY LLP)',
        requestedByRole: 'AUDITOR',
        requestedAt: 1729112000000,
        reason: 'Fuel delivery log confirms 110,000 Liters consumed (+10.00% variance, exceeding SEBI BRSR Core ±2.0% limit). Please revise quantity and attach gate entry voucher G-409.',
        targetFields: ['quantity', 'spend', 'evidenceDocumentIds'],
        recommendedValue: {
          quantity: 110000,
          unit: 'LITER',
          factor: 2.68,
          notes: 'Update spend to INR 9,790,000 and attach slip G-409.',
        },
        status: 'PENDING',
        dueDate: 1730000000000,
        createdAt: 1729112000000,
        updatedAt: 1729112000000,
      },
      {
        requestId: 'CR-2025-003',
        caseId: 'REC-2025-003',
        activityId: 'ACT-2025-003',
        reviewId: 'REV-2025-003',
        requestedBy: 'USR005',
        requestedByName: 'Dr. Ananya Sen (Lead Assurer, EY LLP)',
        requestedByRole: 'AUDITOR',
        requestedAt: 1729125000000,
        reason: 'Boiler tank level calibration dip-chart indicates 49,200 L total drawn (+9.33% variance). Adjust ledger to dip-tank calibration.',
        targetFields: ['quantity'],
        recommendedValue: {
          quantity: 49200,
          unit: 'LITER',
          notes: 'Attach signed dip-meter log.',
        },
        status: 'PENDING',
        dueDate: 1730100000000,
        createdAt: 1729125000000,
        updatedAt: 1729125000000,
      },
      {
        requestId: 'CR-2025-004',
        caseId: 'REC-2025-004',
        activityId: 'ACT-2025-004',
        reviewId: 'REV-2025-004',
        requestedBy: 'USR005',
        requestedByName: 'Dr. Ananya Sen (Lead Assurer, EY LLP)',
        requestedByRole: 'AUDITOR',
        requestedAt: 1729130000000,
        reason: 'Include road detour bypass kilometers in freight calculation.',
        targetFields: ['quantity', 'justification'],
        status: 'SUBMITTED',
        submittedCorrection: {
          correctedQuantity: 120273,
          correctedUnit: 'T-KM',
          justification: 'Attached border roads task force detour logs confirming 2,626 T-KM landslide bypass.',
          submittedBy: 'USR001',
          submittedByName: 'Rajesh Kumar',
          submittedAt: 1729150000000,
        },
        recalculatedRun: {
          calculationId: 'CALC-REC-004',
          newCO2e: 11.45,
          recalculatedAt: 1729150500000,
        },
        createdAt: 1729130000000,
        updatedAt: 1729150500000,
      },
    ];

    for (const cr of demoCorrectionRequests) {
      this.setDoc('correctionRequests', cr.requestId, cr as unknown as Record<string, unknown>);
    }

    // 23. INITIAL RECONCILIATION HISTORY
    const demoReconciliationHistory = [
      {
        historyId: 'HIST-001',
        caseId: 'REC-2025-001',
        action: 'CASE_CREATED',
        performedBy: 'USR005',
        performedByName: 'Dr. Ananya Sen (EY LLP)',
        performedByRole: 'AUDITOR',
        performedAt: 1729110000000,
        deltaNotes: 'Identified material variance (+10.00%) between submitted 100,000 L and IOCL depot log 110,000 L.',
        newStatus: 'IDENTIFIED',
      },
      {
        historyId: 'HIST-002',
        caseId: 'REC-2025-001',
        action: 'CORRECTION_REQUESTED',
        performedBy: 'USR005',
        performedByName: 'Dr. Ananya Sen (EY LLP)',
        performedByRole: 'AUDITOR',
        performedAt: 1729112000000,
        deltaNotes: 'Correction request CR-2025-001 issued to facility engineer Rajesh Kumar.',
        previousStatus: 'IDENTIFIED',
        newStatus: 'CORRECTION_REQUESTED',
      },
      {
        historyId: 'HIST-003',
        caseId: 'REC-2025-004',
        action: 'CORRECTION_SUBMITTED',
        performedBy: 'USR001',
        performedByName: 'Rajesh Kumar',
        performedByRole: 'PROJECT_USER',
        performedAt: 1729150000000,
        deltaNotes: 'Submitted corrected quantity 120,273 T-KM with detour documentation.',
        previousStatus: 'CORRECTION_REQUESTED',
        newStatus: 'CORRECTION_SUBMITTED',
      },
      {
        historyId: 'HIST-004',
        caseId: 'REC-2025-004',
        action: 'RECALCULATED',
        performedBy: 'SYSTEM',
        performedByName: 'Deterministic GHG Calculation Engine',
        performedByRole: 'SYSTEM',
        performedAt: 1729150500000,
        deltaNotes: 'Recalculated Scope 3 freight CO2e: 11.45 tCO2e.',
        previousStatus: 'CORRECTION_SUBMITTED',
        newStatus: 'RECALCULATED',
      },
    ];

    for (const h of demoReconciliationHistory) {
      this.setDoc('reconciliationHistory', h.historyId, h as unknown as Record<string, unknown>);
    }
  }

  // --- Collection and Document Operations ---

  public getDoc<T = Record<string, unknown>>(collectionName: string, id: string): T | null {
    const col = this.collections.get(collectionName);
    if (!col) return null;
    const item = col.get(id);
    return item ? ({ ...item } as unknown as T) : null;
  }

  public setDoc<T extends Record<string, unknown>>(collectionName: string, id: string, data: T): void {
    if (!this.collections.has(collectionName)) {
      this.collections.set(collectionName, new Map());
    }
    const col = this.collections.get(collectionName)!;

    // Deep sanitize any undefined properties so Firestore / persistence never crashes
    const sanitize = (val: unknown): unknown => {
      if (val === undefined) return undefined;
      if (val === null || typeof val !== 'object') return val;
      if (val instanceof Date) return val;
      if (Array.isArray(val)) {
        return val.filter((item) => item !== undefined).map(sanitize);
      }
      const cleanObj: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
        if (v !== undefined) {
          cleanObj[k] = sanitize(v);
        }
      }
      return cleanObj;
    };

    const cleanData = (sanitize(data) || {}) as Record<string, unknown>;
    const docData = { ...cleanData, updatedAt: Date.now() };
    col.set(id, docData);
    this.saveToDisk();

    // Replicate directly to Cloud Firestore in user secrets database
    import('./firebaseClient.ts').then(({ firebaseClient }) => {
      firebaseClient.writeToFirestore(collectionName, id, docData as unknown as Record<string, unknown>).catch(() => {});
    }).catch(() => {});
  }

  public deleteDoc(collectionName: string, id: string): boolean {
    const col = this.collections.get(collectionName);
    if (!col) return false;
    const deleted = col.delete(id);
    if (deleted) {
      this.saveToDisk();
      import('./firebaseClient.ts').then(({ firebaseClient }) => {
        firebaseClient.deleteFromFirestore(collectionName, id).catch(() => {});
      }).catch(() => {});
    }
    return deleted;
  }

  public getDocs<T = Record<string, unknown>>(
    collectionName: string,
    filters?: FirestoreQueryFilter<T>[]
  ): T[] {
    const col = this.collections.get(collectionName);
    if (!col) return [];

    let items = Array.from(col.values()) as unknown as T[];

    if (filters && filters.length > 0) {
      items = items.filter((item) => {
        return filters.every((filter) => {
          const val = (item as Record<string, unknown>)[filter.field as string];
          if (filter.operator === '==') {
            return val === filter.value;
          }
          if (filter.operator === '!=') {
            return val !== filter.value;
          }
          if (filter.operator === 'in') {
            return Array.isArray(filter.value) && filter.value.includes(val);
          }
          if (filter.operator === 'array-contains') {
            return Array.isArray(val) && val.includes(filter.value);
          }
          return true;
        });
      });
    }

    return items.map((it) => ({ ...it }));
  }

  /**
   * Synchronizes data directly from the user's Cloud Firestore database (from secrets).
   * Reads all remote documents into memory and the local cache.
   * If remote database is empty for any collection, seeds it to Cloud Firestore.
   */
  public async syncFromCloudFirestore(): Promise<{ syncedCollections: number; totalDocs: number }> {
    try {
      const { firebaseClient, CLOUD_FIRESTORE_PERMITTED_COLLECTIONS } = await import('./firebaseClient.ts');
      const db = firebaseClient.getDb();
      if (!db) {
        logger.warn('Cloud Firestore DB not initialized yet for sync');
        return { syncedCollections: 0, totalDocs: 0 };
      }

      logger.info('Syncing data directly from user secrets Firestore database...', {
        projectId: config.firestoreProjectId,
        databaseId: config.firestoreDatabaseId,
      });

      let totalSyncedDocs = 0;
      let collectionsSynced = 0;

      for (const [colName, localDocMap] of this.collections.entries()) {
        if (!CLOUD_FIRESTORE_PERMITTED_COLLECTIONS.has(colName)) {
          continue;
        }

        try {
          const remoteDocs = await firebaseClient.getAllFromFirestore(colName);
          if (remoteDocs.size > 0) {
            // Load remote authoritative documents from Cloud Firestore
            for (const [docId, docData] of remoteDocs.entries()) {
              localDocMap.set(docId, docData as Record<string, unknown>);
              totalSyncedDocs++;
            }
            collectionsSynced++;
          }
        } catch {
          // Gracefully continue with local authoritative copy
        }
      }

      if (collectionsSynced > 0) {
        this.saveToDisk();
      }
      logger.info('Cloud Firestore sync scan complete', {
        projectId: config.firestoreProjectId,
        databaseId: config.firestoreDatabaseId,
        syncedCollections: collectionsSynced,
        totalDocs: totalSyncedDocs,
      });

      return { syncedCollections: collectionsSynced, totalDocs: totalSyncedDocs };
    } catch (err: unknown) {
      logger.error('Failed to sync from Cloud Firestore', {
        error: err instanceof Error ? err.message : String(err),
      });
      return { syncedCollections: 0, totalDocs: 0 };
    }
  }

  // Health and verification
  public getHealth(): {
    status: 'connected' | 'disconnected';
    databaseId: string;
    projectId: string;
    storageBucket: string;
    collections: Record<string, number>;
    totalDocuments: number;
    seeded: boolean;
  } {
    const counts: Record<string, number> = {};
    let total = 0;
    for (const [name, map] of this.collections.entries()) {
      counts[name] = map.size;
      total += map.size;
    }

    return {
      status: 'connected',
      databaseId: config.firestoreDatabaseId,
      projectId: config.firestoreProjectId,
      storageBucket: config.storageBucket,
      collections: counts,
      totalDocuments: total,
      seeded: (counts['users'] || 0) >= 6,
    };
  }
}

export const firestore = new FirestoreDatabase();
