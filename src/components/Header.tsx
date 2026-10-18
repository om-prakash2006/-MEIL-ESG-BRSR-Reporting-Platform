import React, { useState } from 'react';
import {
  Calendar,
  Filter,
  ChevronDown,
  LogOut,
  Building2,
  Shield,
  Layers,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { AuthUser, UserRole } from '../types.ts';
import { DEMO_ACCOUNTS } from '../constants/demoUsers.ts';

interface HeaderProps {
  user: AuthUser;
  onRoleSwitch: (employeeId: string) => void;
  onLogout: () => void;
  activePath: string;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onRoleSwitch,
  onLogout,
  activePath,
}) => {
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [showScopeModal, setShowScopeModal] = useState(false);

  const getRoleDisplayName = (role: UserRole) => {
    switch (role) {
      case 'PROJECT_USER':
        return 'Facility User';
      case 'BUSINESS_UNIT_USER':
        return 'Business Unit User';
      case 'COMPANY_USER':
        return 'Company User';
      case 'GROUP_ADMIN':
        return 'Group Admin';
      case 'AUDITOR':
        return 'Sustainability Auditor';
      case 'MANAGEMENT':
        return 'Management';
      default:
        return role;
    }
  };

  const getBreadcrumbScope = (role: UserRole) => {
    switch (role) {
      case 'PROJECT_USER':
        return 'Group: MEIL Group > Entity: Megha Hydro Infra Ltd > Unit: Northern Power Division > Project: Subansiri Hydro Electric (2000 MW)';
      case 'BUSINESS_UNIT_USER':
        return 'Group: MEIL Group > Entity: Megha Hydro Infra Ltd > Unit: Northern Power Division (Aggregated 6 Facilities)';
      case 'COMPANY_USER':
        return 'Group: MEIL Group > Entity: Megha Hydro Infra Ltd (MHIL) > Scope: ALL BUSINESS UNITS';
      case 'AUDITOR':
        return 'Assurance Mandate: Megha Hydro Infra Ltd > Field Scope: 28 Facilities > Lead Assurer: EY LLP';
      case 'MANAGEMENT':
        return 'Group: MEIL Group Headquarters > Scope: Executive Board & ESG Committee Oversight (Read-Only)';
      case 'GROUP_ADMIN':
      default:
        return 'Group: MEIL Group > Entity: Megha Hydro Infra Ltd > Unit: Northern Power Division > Project: Subansiri Hydro Electric (2000 MW)';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[#e2e8f0] shadow-xs">
      {/* Top Main Navigation Bar */}
      <div className="h-14 px-4 sm:px-6 flex items-center justify-between gap-4">
        
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#1d4ed8] flex items-center justify-center text-white font-bold text-xs tracking-wider shadow-xs">
            MEIL
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#0b1c30] text-sm tracking-tight">MEIL ESG</span>
            <span className="text-gray-300">|</span>
            <span className="text-xs font-semibold text-[#334155]">BRSR Reporting Platform</span>
          </div>

          {/* Fiscal Cycle Pill */}
          <div className="hidden md:flex items-center gap-1.5 ml-3 px-2.5 py-1 bg-[#eff4ff] border border-[#dce9ff] rounded text-[11px] font-semibold text-[#1e40af]">
            <Calendar className="w-3.5 h-3.5 text-[#1d4ed8]" />
            <span>FY 2025–26 | Q3</span>
          </div>
        </div>

        {/* Right: Role Switcher & User Profile */}
        <div className="flex items-center gap-3 sm:gap-4">
          
          {/* Demo Role Switcher Control */}
          <div className="relative">
            <button
              onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#f8fafc] hover:bg-[#f1f5f9] border border-[#cbd5e1] rounded text-xs font-medium text-[#334155] transition-colors"
            >
              <span className="text-[#64748b] uppercase text-[10px] font-bold tracking-wider">ROLE:</span>
              <span className="font-semibold text-[#1d4ed8]">{getRoleDisplayName(user.role)}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#64748b]" />
            </button>

            {roleDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-72 bg-white border border-[#cbd5e1] rounded-md shadow-lg py-1.5 z-50 text-xs">
                <div className="px-3 py-1.5 border-b border-[#f1f5f9] font-bold text-[10px] text-[#64748b] uppercase tracking-wider">
                  Switch Demo Account (SEBI Mandated Tiers)
                </div>
                {DEMO_ACCOUNTS.map((acc) => {
                  const isActive = acc.employeeId === user.employeeId;
                  return (
                    <button
                      key={acc.employeeId}
                      onClick={() => {
                        setRoleDropdownOpen(false);
                        onRoleSwitch(acc.employeeId);
                      }}
                      className={`w-full text-left px-3 py-2 flex items-start gap-2.5 hover:bg-[#eff4ff] transition-colors ${
                        isActive ? 'bg-[#f0fdf4] font-semibold text-[#15803d]' : 'text-[#334155]'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-[#1d4ed8]" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span>{acc.label}</span>
                          <span className="text-[10px] font-mono text-[#64748b] bg-gray-100 px-1 rounded">{acc.employeeId}</span>
                        </div>
                        <div className="text-[10px] text-[#64748b] truncate">{acc.organizationName}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* User Profile Info */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-[#e2e8f0]">
            <img
              src={user.avatarUrl || 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&h=120&fit=crop'}
              alt={user.name}
              className="w-8 h-8 rounded-full border border-[#cbd5e1] object-cover"
            />
            <div className="hidden lg:block text-left text-xs">
              <div className="font-semibold text-[#0f172a] leading-tight">{user.name}</div>
              <div className="text-[11px] text-[#64748b] leading-tight">({getRoleDisplayName(user.role)})</div>
            </div>

            {/* Logout button */}
            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-1.5 text-[#64748b] hover:text-[#e11d48] hover:bg-[#fff1f2] rounded transition-colors ml-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
