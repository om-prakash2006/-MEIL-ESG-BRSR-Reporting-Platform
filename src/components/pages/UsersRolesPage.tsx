import React, { useState, useEffect } from 'react';
import {
  Users2,
  Shield,
  CheckCircle2,
  AlertCircle,
  Play,
  Lock,
  Building,
  KeyRound,
  FileCheck,
  RefreshCw,
} from 'lucide-react';
import { AuthUser } from '../../types.ts';
import { api } from '../../services/api.ts';

interface UsersRolesPageProps {
  currentUser: AuthUser;
  onSwitchUser: (employeeId: string) => void;
}

export const UsersRolesPage: React.FC<UsersRolesPageProps> = ({ currentUser, onSwitchUser }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<{
    name: string;
    description: string;
    expectedStatus: number;
    actualStatus?: number;
    response?: any;
    passed?: boolean;
    loading?: boolean;
  }[]>([
    {
      name: 'Test 1: Project User Cross-Project Boundary',
      description: 'PU001 (assigned PROJ001) attempts to access PROJ003 (Zojila Tunnel in another BU)',
      expectedStatus: 403,
    },
    {
      name: 'Test 2: BU Manager Cross-Divisional Boundary',
      description: 'BU001 (assigned BU001) attempts to access BU004 (Transmission Grid in COMP002)',
      expectedStatus: 403,
    },
    {
      name: 'Test 3: Company User Cross-Entity Boundary',
      description: 'CU001 (assigned COMP001) attempts to access COMP002 (MEIL Company B)',
      expectedStatus: 403,
    },
    {
      name: 'Test 4: Management Role Mutation Block',
      description: 'MG001 attempts POST /api/data/edit (Read-only analytical role blocked)',
      expectedStatus: 403,
    },
    {
      name: 'Test 5: Auditor Silent Overwrite Block',
      description: 'AU001 attempts POST /api/data/edit (Auditor cannot overwrite original submitted data)',
      expectedStatus: 403,
    },
    {
      name: 'Test 6: Authorized Project User Access',
      description: 'PU001 accesses assigned Project PROJ001 (Should succeed)',
      expectedStatus: 200,
    },
  ]);

  const loadDirectory = async () => {
    try {
      setLoading(true);
      const [uData, rData] = await Promise.all([
        api.getDirectoryUsers(),
        api.getDirectoryRoles(),
      ]);
      setUsers(uData);
      setRoles(rData);
    } catch (err) {
      console.error('Failed to load directory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDirectory();
  }, []);

  const runAllSecurityTests = async () => {
    const updated = [...testResults];

    // Test 1: PU001 cross-project
    try {
      updated[0].loading = true;
      setTestResults([...updated]);
      // Authenticate as PU001 first
      await api.demoLogin('PU001', 'demo-password');
      const res = await api.testProjectAccess('PROJ003');
      updated[0].actualStatus = res.status;
      updated[0].response = res.data;
      updated[0].passed = res.status === 403;
    } catch (err: any) {
      updated[0].response = err.message;
    } finally {
      updated[0].loading = false;
      setTestResults([...updated]);
    }

    // Test 2: BU001 cross-BU
    try {
      updated[1].loading = true;
      setTestResults([...updated]);
      await api.demoLogin('BU001', 'demo-password');
      const res = await api.testBuAccess('BU004');
      updated[1].actualStatus = res.status;
      updated[1].response = res.data;
      updated[1].passed = res.status === 403;
    } catch (err: any) {
      updated[1].response = err.message;
    } finally {
      updated[1].loading = false;
      setTestResults([...updated]);
    }

    // Test 3: CU001 cross-Company
    try {
      updated[2].loading = true;
      setTestResults([...updated]);
      await api.demoLogin('CU001', 'demo-password');
      const res = await api.testCompanyAccess('COMP002');
      updated[2].actualStatus = res.status;
      updated[2].response = res.data;
      updated[2].passed = res.status === 403;
    } catch (err: any) {
      updated[2].response = err.message;
    } finally {
      updated[2].loading = false;
      setTestResults([...updated]);
    }

    // Test 4: MG001 edit data
    try {
      updated[3].loading = true;
      setTestResults([...updated]);
      await api.demoLogin('MG001', 'demo-password');
      const res = await api.testDataEdit({ metric: 'Scope 1 edit', value: 999 });
      updated[3].actualStatus = res.status;
      updated[3].response = res.data;
      updated[3].passed = res.status === 403;
    } catch (err: any) {
      updated[3].response = err.message;
    } finally {
      updated[3].loading = false;
      setTestResults([...updated]);
    }

    // Test 5: AU001 edit data
    try {
      updated[4].loading = true;
      setTestResults([...updated]);
      await api.demoLogin('AU001', 'demo-password');
      const res = await api.testDataEdit({ metric: 'Scope 1 overwrite', value: 999 });
      updated[4].actualStatus = res.status;
      updated[4].response = res.data;
      updated[4].passed = res.status === 403;
    } catch (err: any) {
      updated[4].response = err.message;
    } finally {
      updated[4].loading = false;
      setTestResults([...updated]);
    }

    // Test 6: PU001 authorized access
    try {
      updated[5].loading = true;
      setTestResults([...updated]);
      await api.demoLogin('PU001', 'demo-password');
      const res = await api.testProjectAccess('PROJ001');
      updated[5].actualStatus = res.status;
      updated[5].response = res.data;
      updated[5].passed = res.status === 200;
    } catch (err: any) {
      updated[5].response = err.message;
    } finally {
      updated[5].loading = false;
      setTestResults([...updated]);
    }

    // Restore login as current user
    await api.demoLogin(currentUser.employeeId, 'demo-password');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#0f172a] tracking-tight">
              Users, Roles &amp; Organizational Scope Administration
            </h1>
            <span className="text-[10px] font-bold bg-[#eff4ff] text-[#1d4ed8] px-2 py-0.5 rounded border border-[#bfdbfe]">
              Firestore Backend v1.0
            </span>
          </div>
          <p className="text-xs text-[#64748b] mt-0.5">
            Role-Based Access Control (RBAC) and strict multi-tier organizational hierarchy enforcement.
          </p>
        </div>

        <button
          onClick={loadDirectory}
          className="px-3 py-1.5 bg-white border border-[#cbd5e1] hover:bg-[#f8fafc] text-xs font-semibold text-[#334155] rounded shadow-2xs flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Directory</span>
        </button>
      </div>

      {/* Live Security & Scope Authorization Tester Card */}
      <div className="bg-white border-2 border-[#1d4ed8]/30 rounded-lg p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#e2e8f0]">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#1d4ed8]" />
              <h3 className="text-sm font-bold text-[#0f172a]">
                Live Backend Scope &amp; Permission Authorization Test Suite
              </h3>
            </div>
            <p className="text-xs text-[#64748b]">
              Executes live HTTP requests against the Express authorization middleware to verify tenant isolation (IT Act Section 43/66).
            </p>
          </div>

          <button
            onClick={runAllSecurityTests}
            className="px-4 py-2 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-semibold rounded flex items-center gap-2 shadow-xs"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Run All 6 Live Authorization Tests</span>
          </button>
        </div>

        {/* Test Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {testResults.map((t, idx) => (
            <div
              key={idx}
              className={`p-3 rounded border text-xs space-y-2 transition-all ${
                t.passed === true
                  ? 'bg-[#f0fdf4] border-[#86efac]'
                  : t.passed === false
                  ? 'bg-[#fff1f2] border-[#fca5a5]'
                  : 'bg-[#f8fafc] border-[#e2e8f0]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-bold text-[#0f172a] text-xs">{t.name}</span>
                {t.loading ? (
                  <span className="text-[10px] font-bold text-[#1d4ed8] animate-pulse">Running...</span>
                ) : t.passed === true ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#15803d] bg-white px-1.5 py-0.5 rounded border border-[#86efac]">
                    <CheckCircle2 className="w-3 h-3 text-[#15803d]" />
                    PASSED ({t.actualStatus})
                  </span>
                ) : t.passed === false ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#e11d48] bg-white px-1.5 py-0.5 rounded border border-[#fca5a5]">
                    <AlertCircle className="w-3 h-3 text-[#e11d48]" />
                    FAILED ({t.actualStatus})
                  </span>
                ) : (
                  <span className="text-[10px] text-[#64748b] bg-gray-100 px-1.5 py-0.5 rounded">Ready</span>
                )}
              </div>

              <p className="text-[11px] text-[#475569] leading-snug">{t.description}</p>

              <div className="flex items-center justify-between pt-1 border-t border-black/5 text-[10px] text-[#64748b]">
                <span>Expected: <strong>HTTP {t.expectedStatus}</strong></span>
                {t.actualStatus && <span>Actual: <strong>HTTP {t.actualStatus}</strong></span>}
              </div>

              {t.response && (
                <div className="p-1.5 bg-black/5 rounded text-[10px] font-mono text-[#334155] truncate">
                  {typeof t.response === 'string' ? t.response : JSON.stringify(t.response)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Seeded Demo Users Directory Table */}
      <div className="bg-white border border-[#e2e8f0] rounded-md overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-[#e2e8f0] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users2 className="w-4 h-4 text-[#1d4ed8]" />
            <h3 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider">
              Seeded Directory Users (Firestore collection: users)
            </h3>
          </div>
          <span className="text-xs text-[#64748b]">{users.length} Active Accounts</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#f1f5f9] text-[#475569] text-[10px] uppercase font-bold border-b border-[#cbd5e1]">
                <th className="py-2.5 px-3">EMPLOYEE ID</th>
                <th className="py-2.5 px-3">NAME &amp; EMAIL</th>
                <th className="py-2.5 px-3">ROLE</th>
                <th className="py-2.5 px-3">ORGANIZATIONAL SCOPE</th>
                <th className="py-2.5 px-3 text-center">PERMISSIONS</th>
                <th className="py-2.5 px-3 text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {users.map((u) => {
                const isCurrent = u.employeeId === currentUser.employeeId;
                return (
                  <tr key={u.userId} className={`hover:bg-[#f8fafc] ${isCurrent ? 'bg-[#eff4ff]/40' : ''}`}>
                    <td className="py-2.5 px-3">
                      <span className="font-mono font-bold text-[#1d4ed8]">{u.employeeId}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-[#0f172a]">{u.name}</div>
                      <div className="text-[11px] text-[#64748b]">{u.email}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-[#f1f5f9] text-[#0f172a] border border-[#cbd5e1]">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[#475569]">
                      <div className="font-semibold text-[#0f172a]">
                        Org: {u.organizationId}
                      </div>
                      {u.businessUnitId && <div className="text-[11px]">BU: {u.businessUnitId}</div>}
                      {u.projectId && <div className="text-[11px]">Project: {u.projectId}</div>}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="font-mono text-xs font-semibold text-[#059669]">
                        {u.permissionsCount} permissions
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => onSwitchUser(u.employeeId)}
                        disabled={isCurrent}
                        className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                          isCurrent
                            ? 'bg-gray-100 text-gray-400 cursor-default'
                            : 'bg-[#1d4ed8] text-white hover:bg-[#1e40af]'
                        }`}
                      >
                        {isCurrent ? 'Active User' : 'Switch Role'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Definitions & Permissions Matrix */}
      <div className="bg-white border border-[#e2e8f0] rounded-md p-4 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-[#f1f5f9]">
          <KeyRound className="w-4 h-4 text-[#1d4ed8]" />
          <h3 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider">
            Role Hierarchy &amp; Permission Scopes (Firestore collection: roles)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {roles.map((r) => (
            <div key={r.roleId} className="p-3 border border-[#e2e8f0] rounded bg-[#f8fafc] text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#0f172a]">{r.roleId}</span>
                <span className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border text-[#1d4ed8]">
                  {r.scopeType}
                </span>
              </div>
              <div className="font-semibold text-[#1d4ed8] text-[11px]">{r.roleName}</div>
              <p className="text-[11px] text-[#64748b] leading-snug">{r.tierDescription}</p>
              <div className="pt-1 text-[10px] text-[#475569] font-mono">
                Route: <strong>{r.defaultDashboardRoute}</strong> ({r.permissions?.length || 0} permissions)
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
