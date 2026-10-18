import React, { useState } from 'react';
import { ShieldCheck, Info, Play, ArrowRight, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { DEMO_ACCOUNTS } from '../constants/demoUsers.ts';
import { api } from '../services/api.ts';
import { LoginResponse } from '../types.ts';

interface LoginPageProps {
  onLoginSuccess: (data: LoginResponse) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [selectedDemoIndex, setSelectedDemoIndex] = useState(0);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedDemo = DEMO_ACCOUNTS[selectedDemoIndex];

  // Handle standard manual login
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId.trim()) {
      setError('Please enter your Employee ID or Corporate Email.');
      return;
    }
    if (!password) {
      setError('Please enter your secure password.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.demoLogin(employeeId.trim(), password);
      onLoginSuccess(res);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Handle quick demo role launch
  const handleLaunchDemoRole = async () => {
    try {
      setLoading(true);
      setError(null);
      // Pre-fill inputs for clarity
      setEmployeeId(selectedDemo.employeeId);
      setPassword(selectedDemo.defaultPassword || 'demo-password');

      const res = await api.demoLogin(
        selectedDemo.employeeId,
        selectedDemo.defaultPassword || 'demo-password'
      );
      onLoginSuccess(res);
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate demo role');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-[620px] bg-white rounded-lg border border-[#e2e8f0] shadow-sm p-8 sm:p-10">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded bg-[#0037b0] flex items-center justify-center text-white mb-3 shadow-sm">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div className="text-[11px] font-bold tracking-widest text-[#0037b0] uppercase mb-1">
            MEIL ESG · STATUTORY DISCLOSURES
          </div>
          <h1 className="text-2xl sm:text-[26px] font-bold text-[#0b1c30] tracking-tight mb-1">
            BRSR Reporting Platform
          </h1>
          <p className="text-xs text-[#64748b]">
            Corporate Access Portal · Ministry & SEBI Mandate
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-[#fff1f2] border border-[#fecdd3] rounded text-xs text-[#e11d48] flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Authentication Error: </span>
              {error}
            </div>
          </div>
        )}

        {/* Manual Credentials Form */}
        <form onSubmit={handleManualSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#334155] mb-1.5">
              Employee ID / Corporate Email
            </label>
            <input
              type="text"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="e.g. EMP49201 or p.venkat@meilgroup.com"
              className="w-full h-10 px-3 bg-[#f8f9ff] hover:bg-white focus:bg-white border border-[#cbd5e1] focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#dbeafe] rounded text-sm text-[#0f172a] transition-all outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[#334155]">
                Password
              </label>
              <button
                type="button"
                onClick={() => alert('For prototype demo testing, any valid demo password like "demo-password" or "meil@demo123" is accepted.')}
                className="text-xs font-medium text-[#1d4ed8] hover:underline"
              >
                Forgot Password?
              </button>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter secure intranet credentials"
              className="w-full h-10 px-3 bg-[#f8f9ff] hover:bg-white focus:bg-white border border-[#cbd5e1] focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#dbeafe] rounded text-sm text-[#0f172a] transition-all outline-none"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberDevice}
                onChange={(e) => setRememberDevice(e.target.checked)}
                className="w-4 h-4 rounded border-[#94a3b8] text-[#1d4ed8] focus:ring-[#1d4ed8]"
              />
              <span className="text-xs text-[#475569]">Remember device for 12 hours</span>
            </label>
            <span className="text-[11px] font-medium text-[#64748b]">SSO / MFA Enabled</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 mt-2 bg-[#1d4ed8] hover:bg-[#1e40af] active:bg-[#1e3a8a] text-white text-xs font-semibold rounded flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block animate-pulse">Authenticating with Directory...</span>
            ) : (
              <>
                <span>Secure Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Prototype Demo Access Section */}
        <div className="relative my-7 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#e2e8f0]"></div>
          </div>
          <span className="relative px-3 bg-white text-[10px] font-bold text-[#64748b] tracking-wider uppercase">
            OR PROTOTYPE DEMO ACCESS
          </span>
        </div>

        <div className="bg-[#eff4ff] border border-[#dce9ff] rounded-md p-4 space-y-3.5">
          <div className="flex items-start gap-2 text-xs text-[#1e40af]">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#1d4ed8]" />
            <p className="leading-snug">
              Select an organizational tier to inspect mapped data fields, assurance flags, and approval scopes:
            </p>
          </div>

          {/* 6 Demo Tiers Radio Selection */}
          <div className="space-y-2 pt-1">
            {DEMO_ACCOUNTS.map((acc, index) => {
              const isSelected = selectedDemoIndex === index;
              return (
                <div
                  key={acc.employeeId}
                  onClick={() => setSelectedDemoIndex(index)}
                  className={`flex items-start gap-2.5 p-2 rounded cursor-pointer transition-colors ${
                    isSelected ? 'bg-white/80 shadow-xs ring-1 ring-[#1d4ed8]' : 'hover:bg-white/40'
                  }`}
                >
                  <input
                    type="radio"
                    name="demoRole"
                    checked={isSelected}
                    onChange={() => setSelectedDemoIndex(index)}
                    className="mt-1 w-3.5 h-3.5 text-[#1d4ed8] focus:ring-[#1d4ed8]"
                  />
                  <div className="flex-1 text-xs">
                    <div className="font-semibold text-[#0f172a]">{acc.label}</div>
                    <div className="text-[#64748b] text-[11px] leading-tight">{acc.organizationName}</div>
                  </div>
                  <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-[#e0e7ff] text-[#1e40af]">
                    {acc.employeeId}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Scope Explanation Panel */}
          <div className="bg-white/90 border border-[#dce9ff] rounded p-2.5 text-xs">
            <div className="font-bold text-[#1d4ed8] text-[11px] mb-0.5">
              {selectedDemo.tierTag}
            </div>
            <p className="text-[#475569] text-[11px] leading-relaxed">
              {selectedDemo.scopeDescription}
            </p>
          </div>

          {/* Launch Demo Button */}
          <button
            type="button"
            onClick={handleLaunchDemoRole}
            disabled={loading}
            className="w-full h-9 bg-white hover:bg-[#f8f9ff] text-[#1d4ed8] border border-[#1d4ed8] font-semibold text-xs rounded flex items-center justify-center gap-1.5 transition-colors shadow-xs"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Launch Selected Demo Role ({selectedDemo.employeeId})</span>
          </button>
        </div>

        {/* Regulatory Footer */}
        <div className="mt-8 pt-5 border-t border-[#f1f5f9] text-center space-y-1.5">
          <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-[#059669]">
            <span className="w-2 h-2 rounded-full bg-[#059669]"></span>
            <span>SEBI Circular SEBI/HO/CFD/CFD-SEC-2/P/CIR/2023/122</span>
          </div>
          <p className="text-[10px] text-[#94a3b8] leading-normal max-w-[500px] mx-auto">
            Confidential Megha Engineering & Infrastructures Ltd System. Unauthorized attempts to extract emissions datasets or bypass role validation are strictly tracked under IT Act Section 43/66.
          </p>
        </div>

      </div>
    </div>
  );
};
