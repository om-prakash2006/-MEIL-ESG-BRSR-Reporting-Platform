import { AuthUser, UserRole } from '../types.ts';
import {
  LayoutGrid,
  TableProperties,
  Paperclip,
  Calculator,
  ShieldCheck,
  GitCompare,
  FileSpreadsheet,
  LineChart,
  Users2,
  LucideIcon,
} from 'lucide-react';

export interface NavItemConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
  badgeColor?: string;
  description?: string;
}

export const ALL_MODULES: Record<string, NavItemConfig> = {
  dashboard: {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutGrid,
    description: 'Role-specific operational and executive overview',
  },
  'esg-data': {
    id: 'esg-data',
    label: 'ESG Data',
    icon: TableProperties,
    description: 'Activity data entry, records ledger, and review queue',
  },
  evidence: {
    id: 'evidence',
    label: 'Evidence',
    icon: Paperclip,
    description: 'Statutory evidentiary documents, invoices, and logs',
  },
  calculations: {
    id: 'calculations',
    label: 'Calculations',
    icon: Calculator,
    description: 'Emissions calculation engine and factor library',
  },
  audit: {
    id: 'audit',
    label: 'Audit & Assurance',
    icon: ShieldCheck,
    description: 'Independent verification, queries, and findings',
  },
  reconciliation: {
    id: 'reconciliation',
    label: 'Reconciliation',
    icon: GitCompare,
    description: 'Data discrepancy checks, variance analysis, and fixes',
  },
  reports: {
    id: 'reports',
    label: 'Reports',
    icon: FileSpreadsheet,
    description: 'SEBI BRSR Core statutory drafts, XBRL, and filings',
  },
  analytics: {
    id: 'analytics',
    label: 'Analytics',
    icon: LineChart,
    description: 'Multi-tier emissions trends, target tracking, and benchmarks',
  },
  'users-roles': {
    id: 'users-roles',
    label: 'Users & Roles',
    icon: Users2,
    badge: 'Admin',
    badgeColor: 'bg-[#dbeafe] text-[#1e40af]',
    description: 'User access management, RBAC, and org scopes',
  },
};

/**
 * Base module configurations by user role adhering strictly to governance principles:
 * - PROJECT_USER: Dashboard, ESG Data, Evidence, Calculations, Audit & Assurance, Reconciliation
 * - BUSINESS_UNIT_USER: Dashboard, ESG Data, Evidence, Calculations, Audit & Assurance, Reconciliation, Analytics
 * - COMPANY_USER: Dashboard, ESG Data, Evidence, Calculations, Audit & Assurance, Reconciliation, Reports, Analytics
 * - GROUP_ADMIN: All 8 operational modules + Users & Roles under Administration
 * - AUDITOR: Dashboard, ESG Data, Evidence, Calculations, Audit & Assurance, Reconciliation, Reports
 * - MANAGEMENT: Dashboard, Reports, Analytics (Executive read-only oversight)
 */
const ROLE_MAIN_MODULES: Record<UserRole, string[]> = {
  PROJECT_USER: [
    'dashboard',
    'esg-data',
    'evidence',
    'calculations',
    'audit',
    'reconciliation',
  ],
  BUSINESS_UNIT_USER: [
    'dashboard',
    'esg-data',
    'evidence',
    'calculations',
    'audit',
    'reconciliation',
    'analytics',
  ],
  COMPANY_USER: [
    'dashboard',
    'esg-data',
    'evidence',
    'calculations',
    'audit',
    'reconciliation',
    'reports',
    'analytics',
  ],
  GROUP_ADMIN: [
    'dashboard',
    'reports',
    'reconciliation',
    'analytics',
    'evidence',
    'calculations',
  ],
  AUDITOR: [
    'dashboard',
    'esg-data',
    'evidence',
    'calculations',
    'audit',
    'reconciliation',
    'reports',
  ],
  MANAGEMENT: [
    'dashboard',
    'reports',
    'analytics',
  ],
};

/**
 * Returns the permitted navigation items dynamically based on the user's role and specific permissions
 */
export function getAuthorizedNavItems(user: AuthUser): {
  mainNav: NavItemConfig[];
  adminNav: NavItemConfig[];
  canAccessAdmin: boolean;
} {
  const role = user.role;
  const permissions = user.permissions || [];

  // Determine main navigation items
  const baseModuleIds = ROLE_MAIN_MODULES[role] || [
    'dashboard',
    'reports',
    'evidence',
    'calculations',
  ];

  // Dynamic permission expansion if explicit grants exist
  const moduleIds = [...baseModuleIds];

  if (
    (permissions.includes('VIEW_REPORTS') || permissions.includes('GENERATE_REPORT')) &&
    !moduleIds.includes('reports') &&
    role !== 'PROJECT_USER' &&
    role !== 'BUSINESS_UNIT_USER'
  ) {
    moduleIds.push('reports');
  }

  if (permissions.includes('VIEW_ANALYTICS') && !moduleIds.includes('analytics') && role !== 'PROJECT_USER') {
    moduleIds.push('analytics');
  }

  const mainNav = moduleIds
    .map((id) => ALL_MODULES[id])
    .filter((item): item is NavItemConfig => Boolean(item));

  // Determine administration navigation items
  const canAccessAdmin =
    role !== 'GROUP_ADMIN' &&
    (permissions.includes('MANAGE_USERS') || permissions.includes('MANAGE_ROLES'));

  const adminNav: NavItemConfig[] = [];
  if (canAccessAdmin) {
    adminNav.push(ALL_MODULES['users-roles']);
  }

  return { mainNav, adminNav, canAccessAdmin };
}

/**
 * Checks if a specific tab ID is permitted for the given user
 */
export function isTabAuthorized(tab: string, user: AuthUser): boolean {
  if (tab === 'dashboard') return true;
  const { mainNav, adminNav } = getAuthorizedNavItems(user);
  return (
    mainNav.some((item) => item.id === tab) ||
    adminNav.some((item) => item.id === tab)
  );
}

/**
 * Provides human-readable organizational boundary context for display in sidebar
 */
export function getRoleScopeInfo(user: AuthUser): {
  roleLabel: string;
  tierBadge: string;
  scopeText: string;
  boundaryNote: string;
  badgeBg: string;
} {
  switch (user.role) {
    case 'PROJECT_USER':
      return {
        roleLabel: 'Facility Operator',
        tierBadge: 'Tier 4 · Project',
        scopeText: 'Subansiri Hydro Electric (2000 MW)',
        boundaryNote: 'Direct Meter Logging & Evidence Upload',
        badgeBg: 'bg-[#e0f2fe] text-[#0369a1] border-[#bae6fd]',
      };
    case 'BUSINESS_UNIT_USER':
      return {
        roleLabel: 'Business Unit Manager',
        tierBadge: 'Tier 3 · Division',
        scopeText: 'Northern Power Division',
        boundaryNote: 'Aggregated 6 Child Facility Units',
        badgeBg: 'bg-[#fef3c7] text-[#92400e] border-[#fde68a]',
      };
    case 'COMPANY_USER':
      return {
        roleLabel: 'Company ESG Head',
        tierBadge: 'Tier 2 · Legal Entity',
        scopeText: 'Megha Hydro Infra Ltd (MHIL)',
        boundaryNote: 'Statutory Consolidation & Discrepancies',
        badgeBg: 'bg-[#dcfce7] text-[#166534] border-[#bbf7d0]',
      };
    case 'AUDITOR':
      return {
        roleLabel: 'Sustainability Auditor',
        tierBadge: 'Statutory Assurer',
        scopeText: 'Independent Assurer (EY LLP)',
        boundaryNote: 'ISAE 3000 / ISO 14064 Immutable Review',
        badgeBg: 'bg-[#ccfbf1] text-[#0f766e] border-[#99f6e4]',
      };
    case 'MANAGEMENT':
      return {
        roleLabel: 'Executive Director',
        tierBadge: 'Board Oversight',
        scopeText: 'MEIL Board & ESG Committee',
        boundaryNote: 'Read-Only Strategic ESG Oversight',
        badgeBg: 'bg-[#f3e8ff] text-[#6b21a8] border-[#e9d5ff]',
      };
    case 'GROUP_ADMIN':
    default:
      return {
        roleLabel: 'Group ESG Admin',
        tierBadge: 'Tier 1 · HQ Master',
        scopeText: 'MEIL Group Headquarters',
        boundaryNote: 'Enterprise-Wide Master Administration',
        badgeBg: 'bg-[#dbeafe] text-[#1e40af] border-[#bfdbfe]',
      };
  }
}
