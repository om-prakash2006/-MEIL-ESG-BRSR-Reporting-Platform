import React, { useState } from 'react';
import {
  Settings,
  HelpCircle,
  Radio,
  Building,
  ShieldCheck,
  X,
  Mail,
  Phone,
  FileCheck2,
  ExternalLink,
} from 'lucide-react';
import { AuthUser } from '../types.ts';
import {
  getAuthorizedNavItems,
  getRoleScopeInfo,
  NavItemConfig,
} from '../utils/navigation.ts';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  user: AuthUser;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  user,
}) => {
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Dynamically resolve permitted navigation items for this user role & scope
  const { mainNav, adminNav, canAccessAdmin } = getAuthorizedNavItems(user);
  const scopeInfo = getRoleScopeInfo(user);

  return (
    <>
      <aside className="w-56 shrink-0 bg-white border-r border-[#e2e8f0] flex flex-col justify-between select-none">
        <div className="py-4 overflow-y-auto">
          {/* Navigation Category Label */}
          <div className="px-4 mb-2 text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider flex items-center justify-between">
            <span>NAVIGATION</span>
            <span className="text-[9px] font-normal text-[#94a3b8]">
              {mainNav.length} {mainNav.length === 1 ? 'module' : 'modules'}
            </span>
          </div>

          {/* Dynamic Main Navigation Items */}
          <nav className="space-y-0.5 px-2">
            {mainNav.map((item: NavItemConfig) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  title={item.description}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded transition-colors text-left ${
                    isActive
                      ? 'bg-[#1d4ed8] text-white shadow-xs'
                      : 'text-[#334155] hover:bg-[#f1f5f9] hover:text-[#0f172a]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-white' : 'text-[#64748b]'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : item.badgeColor || 'bg-[#dbeafe] text-[#1e40af]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Administration Category - STRICTLY SHOWN ONLY TO AUTHORIZED ADMINS */}
          {canAccessAdmin && adminNav.length > 0 && (
            <div className="mt-5">
              <div className="px-4 mb-2 text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">
                ADMINISTRATION
              </div>

              <div className="space-y-0.5 px-2">
                {adminNav.map((item: NavItemConfig) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onSelectTab(item.id)}
                      title={item.description}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded transition-colors text-left ${
                        isActive
                          ? 'bg-[#1d4ed8] text-white shadow-xs'
                          : 'text-[#334155] hover:bg-[#f1f5f9]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isActive ? 'text-white' : 'text-[#64748b]'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wide uppercase ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-[#dbeafe] text-[#1e40af]'
                        }`}
                      >
                        {item.badge || 'Admin'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer System Status & Permitted Actions */}
        <div className="p-3 border-t border-[#f1f5f9] space-y-1.5 text-xs">
          {/* Security & API Tests - Only available to users with Admin permissions */}
          {canAccessAdmin && (
            <button
              onClick={() => onSelectTab('users-roles')}
              className={`w-full flex items-center gap-2.5 px-2 py-1.5 text-xs rounded transition-colors ${
                currentTab === 'users-roles'
                  ? 'bg-[#f1f5f9] text-[#1d4ed8] font-semibold'
                  : 'text-[#64748b] hover:text-[#0f172a] hover:bg-[#f8fafc]'
              }`}
            >
              <Settings className="w-3.5 h-3.5 shrink-0" />
              <span>Security &amp; API Tests</span>
            </button>
          )}

          {/* Clean In-App Help Modal trigger (no window.alert) */}
          <button
            onClick={() => setShowHelpModal(true)}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 text-xs text-[#64748b] hover:text-[#0f172a] rounded hover:bg-[#f8fafc] transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Help &amp; Governance</span>
          </button>

          {/* Statutory Version & Sync Badge */}
          <div className="pt-2 border-t border-[#f1f5f9] flex items-center justify-between px-2 text-[10px] text-[#64748b]">
            <span className="font-medium">Statutory BRSR v2.4</span>
            <div className="flex items-center gap-1 font-semibold text-[#059669]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#059669] animate-pulse"></span>
              <span>Live Sync</span>
            </div>
          </div>
        </div>
      </aside>

      {/* In-App Help & Governance Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full border border-[#cbd5e1] overflow-hidden text-xs">
            <div className="bg-[#1e40af] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" />
                <span className="font-bold text-sm">MEIL ESG Governance &amp; Support</span>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-white/80 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <h4 className="font-bold text-[#0f172a] mb-1">Current Active Session Scope</h4>
                <div className="p-2.5 bg-[#f8fafc] rounded border border-[#e2e8f0] space-y-1">
                  <div className="font-semibold text-[#1d4ed8]">{user.name} ({scopeInfo.roleLabel})</div>
                  <div className="text-[11px] text-[#475569]">Authorized Scope: {scopeInfo.scopeText}</div>
                  <div className="text-[10px] text-[#64748b]">{scopeInfo.boundaryNote}</div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-[#0f172a] mb-1">Statutory ESG Reporting Timelines</h4>
                <div className="p-2.5 bg-[#f0fdf4] rounded border border-[#bbf7d0] text-[#166534] space-y-0.5 text-[11px]">
                  <div className="font-semibold">SEBI BRSR Core FY 2025–26 Q3 Submission</div>
                  <div>Limited Assurance Mandate: ISAE 3000 / ISO 14064-3</div>
                  <div>Assurance Agency: Ernst &amp; Young (EY LLP)</div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-[#0f172a] mb-1">MEIL Corporate Help Desk</h4>
                <div className="space-y-1.5 text-[11px] text-[#334155]">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-[#64748b]" />
                    <span className="font-medium">esg-support@meilgroup.com</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-[#64748b]" />
                    <span className="font-medium">+91 (40) 4433-4402 (MEIL Ext: 4402)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-[#f8fafc] border-t border-[#e2e8f0] flex justify-end">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-semibold rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
