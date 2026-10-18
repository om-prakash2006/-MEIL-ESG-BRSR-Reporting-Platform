import React, { useState, useEffect } from 'react';
import { LoginPage } from './components/LoginPage.tsx';
import { Header } from './components/Header.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { GroupAdminDashboard } from './components/dashboards/GroupAdminDashboard.tsx';
import { BusinessUnitDashboard } from './components/dashboards/BusinessUnitDashboard.tsx';
import { CompanyDashboard } from './components/dashboards/CompanyDashboard.tsx';
import { ProjectDashboard } from './components/dashboards/ProjectDashboard.tsx';
import { AuditorDashboard } from './components/dashboards/AuditorDashboard.tsx';
import { ManagementDashboard } from './components/dashboards/ManagementDashboard.tsx';
import { ESGDataPage } from './components/pages/ESGDataPage.tsx';
import { EvidencePage } from './components/pages/EvidencePage.tsx';
import { CalculationsPage } from './components/pages/CalculationsPage.tsx';
import { AuditAssurancePage } from './components/pages/AuditAssurancePage.tsx';
import { ReconciliationPage } from './components/pages/ReconciliationPage.tsx';
import { ReportsPage } from './components/pages/ReportsPage.tsx';
import { AnalyticsPage } from './components/pages/AnalyticsPage.tsx';
import { UsersRolesPage } from './components/pages/UsersRolesPage.tsx';
import { api } from './services/api.ts';
import { AuthUser, LoginResponse } from './types.ts';
import { isTabAuthorized } from './utils/navigation.ts';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activePath, setActivePath] = useState<string>('/dashboard/group');

  // Verify existing session on initial mount
  useEffect(() => {
    const checkActiveSession = async () => {
      try {
        const sessionId = api.getSessionId();
        if (sessionId) {
          const profile = await api.getMe();
          setCurrentUser(profile.user);
          setActivePath(profile.dashboardRoute);
          const dData = await api.getDashboard();
          setDashboardData(dData);
        }
      } catch (err) {
        api.clearSession();
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkActiveSession();
  }, []);

  // Handle successful login
  const handleLoginSuccess = async (loginRes: LoginResponse) => {
    try {
      setLoading(true);
      // Fetch authoritative user profile with permissions and dashboard route
      const profile = await api.getMe();
      setCurrentUser(profile.user);
      setActivePath(profile.dashboardRoute || loginRes.redirectPath);
      setCurrentTab('dashboard');

      // Fetch scoped dashboard data from backend API
      const dData = await api.getDashboard();
      setDashboardData(dData);
    } catch (err) {
      console.error('Error post-login initialization:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle instant demo role switch from Header or User Directory
  const handleRoleSwitch = async (employeeId: string) => {
    try {
      setLoading(true);
      const res = await api.demoLogin(employeeId, 'demo-password');
      const profile = await api.getMe();
      setCurrentUser(profile.user);
      setActivePath(profile.dashboardRoute || res.redirectPath);
      setCurrentTab('dashboard');

      const dData = await api.getDashboard();
      setDashboardData(dData);
    } catch (err) {
      console.error('Failed to switch demo role:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle sign out
  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    setDashboardData(null);
    setCurrentTab('dashboard');
  };

  if (loading && !currentUser) {
    return (
      <div className="min-h-screen bg-[#f8f9ff] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#1d4ed8] border-t-transparent rounded-full animate-spin"></div>
          <div className="text-xs font-semibold text-[#1e40af]">Loading MEIL Statutory ESG Platform...</div>
        </div>
      </div>
    );
  }

  // Not logged in -> Show Login Page
  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // Render Role-specific Dashboard
  const renderDashboardView = () => {
    switch (currentUser.role) {
      case 'PROJECT_USER':
        return <ProjectDashboard data={dashboardData} onNavigate={(tab) => setCurrentTab(tab)} />;
      case 'BUSINESS_UNIT_USER':
        return <BusinessUnitDashboard data={dashboardData} onNavigate={(tab) => setCurrentTab(tab)} />;
      case 'COMPANY_USER':
        return <CompanyDashboard data={dashboardData} onNavigate={(tab) => setCurrentTab(tab)} />;
      case 'AUDITOR':
        return <AuditorDashboard data={dashboardData} onNavigate={(tab) => setCurrentTab(tab)} />;
      case 'MANAGEMENT':
        return <ManagementDashboard data={dashboardData} onNavigate={(tab) => setCurrentTab(tab)} />;
      case 'GROUP_ADMIN':
      default:
        return <GroupAdminDashboard data={dashboardData} onNavigate={(tab) => setCurrentTab(tab)} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-[#0f172a]">
      {/* Top Header */}
      <Header
        user={currentUser}
        onRoleSwitch={handleRoleSwitch}
        onLogout={handleLogout}
        activePath={activePath}
      />

      {/* Main Body with Sidebar and Content View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation Rail */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            if (currentUser && isTabAuthorized(tab, currentUser)) {
              setCurrentTab(tab);
            } else {
              setCurrentTab('dashboard');
            }
          }}
          user={currentUser}
        />

        {/* Dynamic Content View */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {!isTabAuthorized(currentTab, currentUser) ? (
              <div className="bg-white border border-[#fecaca] rounded-lg p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#fef2f2] text-[#dc2626] flex items-center justify-center mx-auto text-lg font-bold">
                  !
                </div>
                <h2 className="text-base font-bold text-[#0f172a]">Module Access Restricted</h2>
                <p className="text-xs text-[#64748b] max-w-md mx-auto">
                  Your current role (<span className="font-semibold text-[#0f172a]">{currentUser.role}</span>) is not authorized to access this module under MEIL governance policies.
                </p>
                <button
                  onClick={() => setCurrentTab('dashboard')}
                  className="px-4 py-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-semibold rounded"
                >
                  Return to Authorized Dashboard
                </button>
              </div>
            ) : (
              <>
                {currentTab === 'dashboard' && renderDashboardView()}
                {currentTab === 'esg-data' && <ESGDataPage user={currentUser} />}
                {currentTab === 'evidence' && <EvidencePage user={currentUser} />}
                {currentTab === 'calculations' && <CalculationsPage user={currentUser} />}
                {currentTab === 'audit' && <AuditAssurancePage user={currentUser} />}
                {currentTab === 'reconciliation' && <ReconciliationPage user={currentUser} />}
                {currentTab === 'reports' && <ReportsPage user={currentUser} />}
                {currentTab === 'analytics' && <AnalyticsPage user={currentUser} />}
                {currentTab === 'users-roles' && (
                  <UsersRolesPage
                    currentUser={currentUser}
                    onSwitchUser={handleRoleSwitch}
                  />
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
