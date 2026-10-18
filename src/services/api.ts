import { AuthUser, LoginResponse, MeResponse } from '../types.ts';

const SESSION_STORAGE_KEY = 'meil_esg_session_id';

class ApiService {
  private getHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const sessionId = this.getSessionId();
    if (sessionId) {
      headers['Authorization'] = `Bearer ${sessionId}`;
      headers['x-session-id'] = sessionId;
    }
    return headers;
  }

  public getSessionId(): string | null {
    return localStorage.getItem(SESSION_STORAGE_KEY);
  }

  public setSessionId(id: string) {
    localStorage.setItem(SESSION_STORAGE_KEY, id);
  }

  public clearSession() {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }

  // --- Auth Endpoints ---

  public async demoLogin(employeeId: string, password: string): Promise<LoginResponse> {
    const res = await fetch('/api/auth/demo-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Authentication failed');
    }

    if (data.session?.sessionId) {
      this.setSessionId(data.session.sessionId);
    }
    return data as LoginResponse;
  }

  public async getMe(): Promise<MeResponse> {
    const res = await fetch('/api/auth/me', {
      headers: this.getHeaders(),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Failed to fetch current user profile');
    }
    return data as MeResponse;
  }

  public async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: this.getHeaders(),
      });
    } finally {
      this.clearSession();
    }
  }

  // --- Dashboard Endpoint ---

  public async getDashboard(): Promise<any> {
    const res = await fetch('/api/dashboard', {
      headers: this.getHeaders(),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Failed to load dashboard metrics');
    }
    return data;
  }

  // --- Health Endpoint ---

  public async getHealth(): Promise<any> {
    const res = await fetch('/api/health');
    return res.json();
  }

  // --- Scoped Data & Verification Endpoints ---

  public async testProjectAccess(projectId: string): Promise<{ status: number; data: any }> {
    const res = await fetch(`/api/data/project/${encodeURIComponent(projectId)}`, {
      headers: this.getHeaders(),
    });
    const data = await res.json();
    return { status: res.status, data };
  }

  public async testBuAccess(buId: string): Promise<{ status: number; data: any }> {
    const res = await fetch(`/api/data/business-unit/${encodeURIComponent(buId)}`, {
      headers: this.getHeaders(),
    });
    const data = await res.json();
    return { status: res.status, data };
  }

  public async testCompanyAccess(orgId: string): Promise<{ status: number; data: any }> {
    const res = await fetch(`/api/data/company/${encodeURIComponent(orgId)}`, {
      headers: this.getHeaders(),
    });
    const data = await res.json();
    return { status: res.status, data };
  }

  public async testDataEdit(payload: any): Promise<{ status: number; data: any }> {
    const res = await fetch('/api/data/edit', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return { status: res.status, data };
  }

  // Directory inspection endpoints
  public async getDirectoryUsers(): Promise<any[]> {
    const res = await fetch('/api/data/users', { headers: this.getHeaders() });
    return res.json();
  }

  public async getDirectoryRoles(): Promise<any[]> {
    const res = await fetch('/api/data/roles', { headers: this.getHeaders() });
    return res.json();
  }

  // --- Evidence Management Endpoints ---

  public async getEvidenceList(params?: Record<string, string>): Promise<any> {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    const res = await fetch(`/api/evidence${query}`, { headers: this.getHeaders() });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Failed to fetch evidence list');
    }
    return data;
  }

  public async getEvidenceTypes(): Promise<string[]> {
    const res = await fetch('/api/evidence/types', { headers: this.getHeaders() });
    const data = await res.json();
    return data.types || [];
  }

  public async getEvidenceDetails(documentId: string): Promise<any> {
    const res = await fetch(`/api/evidence/${encodeURIComponent(documentId)}`, {
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Failed to fetch evidence details');
    }
    return data;
  }

  public async uploadEvidence(formData: FormData): Promise<any> {
    const sessionId = this.getSessionId();
    const headers: Record<string, string> = {};
    if (sessionId) {
      headers['Authorization'] = `Bearer ${sessionId}`;
      headers['x-session-id'] = sessionId;
    }

    const res = await fetch('/api/evidence/upload', {
      method: 'POST',
      headers,
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Failed to upload evidence');
    }
    return data;
  }

  public async replaceEvidence(documentId: string, formData: FormData): Promise<any> {
    const sessionId = this.getSessionId();
    const headers: Record<string, string> = {};
    if (sessionId) {
      headers['Authorization'] = `Bearer ${sessionId}`;
      headers['x-session-id'] = sessionId;
    }

    const res = await fetch(`/api/evidence/${encodeURIComponent(documentId)}/replace`, {
      method: 'POST',
      headers,
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Failed to replace evidence');
    }
    return data;
  }

  public async verifyEvidence(documentId: string, status: string, notes?: string): Promise<any> {
    const res = await fetch(`/api/evidence/${encodeURIComponent(documentId)}/verify`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ status, notes }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Failed to verify evidence');
    }
    return data;
  }

  public async deleteEvidence(documentId: string, reason?: string): Promise<any> {
    const res = await fetch(`/api/evidence/${encodeURIComponent(documentId)}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Failed to delete evidence');
    }
    return data;
  }

  public getEvidenceDownloadUrl(documentId: string): string {
    const sid = this.getSessionId();
    const tokenQuery = sid ? `?token=${encodeURIComponent(sid)}` : '';
    return `/api/evidence/${encodeURIComponent(documentId)}/download${tokenQuery}`;
  }

  public getEvidencePreviewUrl(documentId: string): string {
    const sid = this.getSessionId();
    const tokenQuery = sid ? `?token=${encodeURIComponent(sid)}` : '';
    return `/api/evidence/${encodeURIComponent(documentId)}/preview${tokenQuery}`;
  }

  public async downloadEvidenceFile(documentId: string, fallbackFileName?: string): Promise<void> {
    const res = await fetch(`/api/evidence/${encodeURIComponent(documentId)}/download`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      let errorMsg = 'Failed to download evidence file.';
      try {
        const errJson = await res.json();
        errorMsg = errJson.message || errJson.error || errorMsg;
      } catch {
        errorMsg = `Server error ${res.status}: ${res.statusText}`;
      }
      throw new Error(errorMsg);
    }

    const disposition = res.headers.get('content-disposition');
    let fileName = fallbackFileName || `${documentId}`;
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^";]+)"?/);
      if (match && match[1]) fileName = decodeURIComponent(match[1]);
    }

    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
  }

  // --- Phase 3: ESG Data Entry & Activity Ledger Endpoints ---

  public async getESGMasterData(): Promise<any> {
    const res = await fetch('/api/esg/master-data', { headers: this.getHeaders() });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Failed to fetch master data');
    }
    return data;
  }

  public async getESGRecords(params?: Record<string, string>): Promise<any> {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    const res = await fetch(`/api/esg/records${query}`, { headers: this.getHeaders() });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Failed to fetch ESG activity records');
    }
    return data;
  }

  public async getESGRecordById(activityId: string): Promise<any> {
    const res = await fetch(`/api/esg/records/${encodeURIComponent(activityId)}`, {
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Failed to fetch activity record');
    }
    return data;
  }

  public async createESGRecord(payload: any): Promise<any> {
    const res = await fetch('/api/esg/records', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Failed to create activity record');
    }
    return data;
  }

  public async saveESGDraft(activityId: string, payload: any): Promise<any> {
    const res = await fetch(`/api/esg/records/${encodeURIComponent(activityId)}/save-draft`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Failed to save draft');
    }
    return data;
  }

  public async updateESGRecord(activityId: string, payload: any): Promise<any> {
    const res = await fetch(`/api/esg/records/${encodeURIComponent(activityId)}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Failed to update record');
    }
    return data;
  }

  public async submitESGRecord(activityId: string): Promise<any> {
    const res = await fetch(`/api/esg/records/${encodeURIComponent(activityId)}/submit`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Failed to submit record');
    }
    return data;
  }

  public async transitionESGRecord(activityId: string, targetStatus: string, remarks?: string): Promise<any> {
    const res = await fetch(`/api/esg/records/${encodeURIComponent(activityId)}/transition`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ targetStatus, remarks }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Failed to transition record status');
    }
    return data;
  }

  public async rejectESGRecord(activityId: string, reason: string): Promise<any> {
    const res = await fetch(`/api/esg/records/${encodeURIComponent(activityId)}/reject`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Failed to reject record');
    }
    return data;
  }

  public async returnESGRecordForCorrection(activityId: string, reason: string): Promise<any> {
    const res = await fetch(`/api/esg/records/${encodeURIComponent(activityId)}/return-for-correction`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Failed to return record for correction');
    }
    return data;
  }

  public async buReviewRecord(
    activityId: string,
    payload: {
      checklist?: Record<string, boolean>;
      notes?: string;
      hasBlockingDiscrepancy?: boolean;
      blockingDiscrepancyReason?: string;
    }
  ): Promise<any> {
    const res = await fetch(`/api/esg/records/${encodeURIComponent(activityId)}/bu-review`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Failed to save BU review');
    }
    return data;
  }

  public async buVerifyRecord(activityId: string, notes?: string): Promise<any> {
    const res = await fetch(`/api/esg/records/${encodeURIComponent(activityId)}/bu-verify`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ notes }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Failed to verify and forward record');
    }
    return data;
  }

  public async buReturnRecord(activityId: string, reason: string): Promise<any> {
    const res = await fetch(`/api/esg/records/${encodeURIComponent(activityId)}/bu-return`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Failed to return record');
    }
    return data;
  }

  public async linkESGEvidence(activityId: string, documentId: string): Promise<any> {
    const res = await fetch(`/api/esg/records/${encodeURIComponent(activityId)}/link-evidence`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ documentId }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Failed to link evidence');
    }
    return data;
  }

  // ==========================================
  // Phase 5: Audit & Assurance Endpoints
  // ==========================================

  public async getAuditSummary(): Promise<{ success: boolean; summary: any }> {
    const res = await fetch('/api/audit/summary', {
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Failed to fetch audit summary');
    }
    return data;
  }

  public async getAuditQueue(params: {
    status?: string;
    scopeNo?: number;
    search?: string;
    reportingPeriodId?: string;
  } = {}): Promise<{ success: boolean; total: number; queue: any[] }> {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'ALL') query.append('status', params.status);
    if (params.scopeNo) query.append('scopeNo', String(params.scopeNo));
    if (params.search) query.append('search', params.search);
    if (params.reportingPeriodId) query.append('reportingPeriodId', params.reportingPeriodId);

    const url = `/api/audit/queue${query.toString() ? `?${query.toString()}` : ''}`;
    const res = await fetch(url, {
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Failed to fetch audit queue');
    }
    return data;
  }

  public async getAuditReviewDetails(id: string): Promise<any> {
    const res = await fetch(`/api/audit/reviews/${encodeURIComponent(id)}`, {
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Failed to fetch audit review details');
    }
    return data;
  }

  public async startAuditReview(id: string): Promise<any> {
    const res = await fetch(`/api/audit/reviews/${encodeURIComponent(id)}/start`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Failed to initiate audit review');
    }
    return data;
  }

  public async saveIndependentAssessment(id: string, assessmentData: {
    verifiedQuantity?: number;
    verifiedUnit?: string;
    verifiedEmissionFactor?: number;
    verifiedCO2e?: number;
    observations?: string;
    conclusion?: string;
    assuranceLevel?: string;
  }): Promise<any> {
    const res = await fetch(`/api/audit/reviews/${encodeURIComponent(id)}/assessment`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(assessmentData),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Failed to save independent assessment');
    }
    return data;
  }

  public async addAuditFinding(id: string, findingData: {
    severity: string;
    category: string;
    title: string;
    description: string;
    recommendation?: string;
  }): Promise<any> {
    const res = await fetch(`/api/audit/reviews/${encodeURIComponent(id)}/findings`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(findingData),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Failed to record audit finding');
    }
    return data;
  }

  public async requestAuditClarification(id: string, reqData: {
    question: string;
    findingId?: string;
  }): Promise<any> {
    const res = await fetch(`/api/audit/reviews/${encodeURIComponent(id)}/clarifications`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(reqData),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Failed to request clarification');
    }
    return data;
  }

  public async respondAuditClarification(clarificationId: string, respData: {
    response: string;
    supplementaryEvidenceIds?: string[];
  }): Promise<any> {
    const res = await fetch(`/api/audit/clarifications/${encodeURIComponent(clarificationId)}/respond`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(respData),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Failed to submit clarification response');
    }
    return data;
  }

  public async concludeAuditReview(id: string, concludeData: {
    decision: 'VERIFY' | 'REJECT' | 'CORRECTION_REQUIRED';
    conclusionNotes: string;
    assuranceLevel?: string;
  }): Promise<any> {
    const res = await fetch(`/api/audit/reviews/${encodeURIComponent(id)}/conclude`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(concludeData),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Failed to conclude audit review');
    }
    return data;
  }

  public async assignAuditor(id: string, assignData: {
    auditorId: string;
    auditorName?: string;
  }): Promise<any> {
    const res = await fetch(`/api/audit/reviews/${encodeURIComponent(id)}/assign`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(assignData),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Failed to assign auditor');
    }
    return data;
  }

  public async exportAssuranceDossier(): Promise<Blob> {
    const res = await fetch('/api/audit/export', {
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      throw new Error('Failed to export assurance dossier');
    }
    return await res.blob();
  }

  // ==========================================
  // Phase 6: Reconciliation API Methods
  // ==========================================

  public async getReconciliationSummary(): Promise<{ success: boolean; summary: any }> {
    const res = await fetch('/api/reconciliation/summary', {
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Failed to fetch reconciliation summary');
    }
    return data;
  }

  public async getReconciliationCases(params?: {
    status?: string;
    materiality?: string;
    scopeNo?: number;
    search?: string;
  }): Promise<{ success: boolean; total: number; cases: any[] }> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.materiality) query.set('materiality', params.materiality);
    if (params?.scopeNo) query.set('scopeNo', String(params.scopeNo));
    if (params?.search) query.set('search', params.search);

    const res = await fetch(`/api/reconciliation/cases?${query.toString()}`, {
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Failed to fetch reconciliation cases');
    }
    return data;
  }

  public async getReconciliationCaseDetails(caseId: string): Promise<any> {
    const res = await fetch(`/api/reconciliation/cases/${encodeURIComponent(caseId)}`, {
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Failed to fetch reconciliation case details');
    }
    return data;
  }

  public async createReconciliationCase(payload: any): Promise<any> {
    const res = await fetch('/api/reconciliation/cases', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Failed to create reconciliation case');
    }
    return data;
  }

  public async requestReconciliationCorrection(
    caseId: string,
    reqData: {
      reason: string;
      targetFields?: string[];
      recommendedQuantity?: number;
      recommendedUnit?: string;
      notes?: string;
      dueDate?: number;
    }
  ): Promise<any> {
    const res = await fetch(`/api/reconciliation/cases/${encodeURIComponent(caseId)}/request-correction`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(reqData),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Failed to request correction');
    }
    return data;
  }

  public async submitReconciliationCorrection(
    caseId: string,
    correctionData: {
      correctedQuantity: number;
      correctedUnit?: string;
      correctedSpend?: number;
      justification: string;
      evidenceDocumentIds?: string[];
    }
  ): Promise<any> {
    const res = await fetch(`/api/reconciliation/cases/${encodeURIComponent(caseId)}/submit-correction`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(correctionData),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Failed to submit correction');
    }
    return data;
  }

  public async signOffReconciliation(
    caseId: string,
    signOffData: {
      decision: 'ACCEPTED' | 'REJECTED';
      notes: string;
    }
  ): Promise<any> {
    const res = await fetch(`/api/reconciliation/cases/${encodeURIComponent(caseId)}/sign-off`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(signOffData),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Failed to sign off on reconciliation case');
    }
    return data;
  }

  public async closeReconciliationCase(
    caseId: string,
    closeData: {
      resolutionSummary: string;
      status?: string;
    }
  ): Promise<any> {
    const res = await fetch(`/api/reconciliation/cases/${encodeURIComponent(caseId)}/close`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(closeData),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Failed to close reconciliation case');
    }
    return data;
  }

  public async exportReconciliationLedger(): Promise<Blob> {
    const res = await fetch('/api/reconciliation/export', {
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      throw new Error('Failed to export reconciliation ledger');
    }
    return await res.blob();
  }

  // ==========================================
  // PHASE 7: BRSR & ESG REPORTS APIS
  // ==========================================

  public async getReportTemplates(): Promise<any[]> {
    const res = await fetch('/api/reports/templates', {
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch report templates');
    return data.templates || [];
  }

  public async listReports(filters?: { companyId?: string; reportingPeriodId?: string; reportType?: string; status?: string }): Promise<any[]> {
    const params = new URLSearchParams();
    if (filters?.companyId) params.append('companyId', filters.companyId);
    if (filters?.reportingPeriodId) params.append('reportingPeriodId', filters.reportingPeriodId);
    if (filters?.reportType) params.append('reportType', filters.reportType);
    if (filters?.status) params.append('status', filters.status);

    const res = await fetch(`/api/reports?${params.toString()}`, {
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to list reports');
    return data.reports || [];
  }

  public async getReportById(reportId: string): Promise<any> {
    const res = await fetch(`/api/reports/${encodeURIComponent(reportId)}`, {
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch report details');
    return data.report;
  }

  public async getReportPreview(reportId: string): Promise<any> {
    const res = await fetch(`/api/reports/${encodeURIComponent(reportId)}/preview`, {
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch report preview');
    return data.report;
  }

  public async generateReport(payload: {
    templateId?: string;
    reportType?: string;
    companyId?: string;
    reportingPeriodId?: string;
    notes?: string;
  }): Promise<any> {
    const res = await fetch('/api/reports/generate', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to generate report snapshot');
    return data;
  }

  public async submitReportForReview(reportId: string, comments?: string): Promise<any> {
    const res = await fetch(`/api/reports/${encodeURIComponent(reportId)}/submit-for-review`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ comments }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to submit report for review');
    return data;
  }

  public async requestReportChanges(reportId: string, comments: string): Promise<any> {
    const res = await fetch(`/api/reports/${encodeURIComponent(reportId)}/request-changes`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ comments }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to request changes on report');
    return data;
  }

  public async approveReport(reportId: string, comments?: string): Promise<any> {
    const res = await fetch(`/api/reports/${encodeURIComponent(reportId)}/approve`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ comments }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.details?.join(' ') || 'Failed to approve report');
    return data;
  }

  public async lockReport(reportId: string): Promise<any> {
    const res = await fetch(`/api/reports/${encodeURIComponent(reportId)}/lock`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to lock report');
    return data;
  }

  public async exportReportPdf(reportId: string): Promise<any> {
    const res = await fetch(`/api/reports/${encodeURIComponent(reportId)}/export/pdf`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to export report PDF');
    return data;
  }

  public getReportDownloadUrl(reportId: string): string {
    const sid = this.getSessionId();
    const tokenQuery = sid ? `?token=${encodeURIComponent(sid)}` : '';
    return `/api/reports/${encodeURIComponent(reportId)}/download${tokenQuery}`;
  }

  public getReportPreviewUrl(reportId: string): string {
    const sid = this.getSessionId();
    const tokenQuery = sid ? `?token=${encodeURIComponent(sid)}` : '';
    return `/api/reports/${encodeURIComponent(reportId)}/preview-pdf${tokenQuery}`;
  }

  public async downloadReportPdf(reportId: string, fallbackFileName?: string): Promise<void> {
    const res = await fetch(`/api/reports/${encodeURIComponent(reportId)}/download`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      let errorMsg = 'Failed to download report PDF.';
      try {
        const errJson = await res.json();
        errorMsg = errJson.message || errJson.error || errorMsg;
      } catch {
        errorMsg = `Server error ${res.status}: ${res.statusText}`;
      }
      throw new Error(errorMsg);
    }

    const disposition = res.headers.get('content-disposition');
    let fileName = fallbackFileName || `${reportId}.pdf`;
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^";]+)"?/);
      if (match && match[1]) fileName = decodeURIComponent(match[1]);
    }

    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
  }

  public async validateReport(reportId: string): Promise<any> {
    const res = await fetch(`/api/reports/${encodeURIComponent(reportId)}/validate`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to re-validate report');
    return data;
  }

  public async submitReportRevision(reportId: string, comments: string): Promise<any> {
    const res = await fetch(`/api/reports/${encodeURIComponent(reportId)}/submit-revision`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ comments }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to submit report revision');
    return data;
  }

  public async companyApproveReport(reportId: string, comments?: string): Promise<any> {
    const res = await fetch(`/api/reports/${encodeURIComponent(reportId)}/company-approve`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ comments }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to record company approval');
    return data;
  }

  public async auditorApproveReport(reportId: string, comments?: string): Promise<any> {
    const res = await fetch(`/api/reports/${encodeURIComponent(reportId)}/auditor-approve`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ comments }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to record auditor sign-off');
    return data;
  }

  public async finalizeReport(reportId: string, comments?: string): Promise<any> {
    const res = await fetch(`/api/reports/${encodeURIComponent(reportId)}/finalize`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ comments }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to finalize report');
    return data;
  }

  public async getReportVersions(reportId: string): Promise<any> {
    const res = await fetch(`/api/reports/${encodeURIComponent(reportId)}/versions`, {
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch report versions');
    return data;
  }

  // ==========================================
  // PHASE 4: EMISSION FACTOR & CALCULATION ENGINE APIS
  // ==========================================

  public async getEmissionFactors(params?: { scopeNo?: number; category?: string; search?: string }): Promise<any> {
    const q = new URLSearchParams();
    if (params?.scopeNo) q.append('scopeNo', String(params.scopeNo));
    if (params?.category) q.append('category', params.category);
    if (params?.search) q.append('search', params.search);

    const res = await fetch(`/api/calculations/factors?${q.toString()}`, {
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch emission factors');
    return data;
  }

  public async getGwpTable(): Promise<any> {
    const res = await fetch('/api/calculations/gwp-table', {
      headers: this.getHeaders(),
    });
    return res.json();
  }

  public async computeCalculation(payload: any): Promise<any> {
    const res = await fetch('/api/calculations/compute', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Calculation computation failed');
    return data.result;
  }

  public async batchRecalculate(reportingPeriodId?: string, scopeNo?: number): Promise<any> {
    const res = await fetch('/api/calculations/batch-recalculate', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ reportingPeriodId, scopeNo }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Batch recalculation failed');
    return data;
  }

  // ==========================================
  // PHASE 8: ESG ANALYTICS & GEMINI AI INTELLIGENCE APIS
  // ==========================================

  public async getAnalyticsOverview(filters?: {
    organizationId?: string;
    companyId?: string;
    businessUnitId?: string;
    projectId?: string;
    facilityId?: string;
    reportingPeriodId?: string;
  }): Promise<any> {
    const q = new URLSearchParams();
    if (filters?.organizationId) q.append('organizationId', filters.organizationId);
    if (filters?.companyId) q.append('companyId', filters.companyId);
    if (filters?.businessUnitId) q.append('businessUnitId', filters.businessUnitId);
    if (filters?.projectId) q.append('projectId', filters.projectId);
    if (filters?.facilityId) q.append('facilityId', filters.facilityId);
    if (filters?.reportingPeriodId) q.append('reportingPeriodId', filters.reportingPeriodId);

    const res = await fetch(`/api/analytics/overview?${q.toString()}`, {
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load analytics overview');
    return data.overview;
  }

  public async getScope3Breakdown(filters?: {
    companyId?: string;
    businessUnitId?: string;
    projectId?: string;
    reportingPeriodId?: string;
  }): Promise<any> {
    const q = new URLSearchParams();
    if (filters?.companyId) q.append('companyId', filters.companyId);
    if (filters?.businessUnitId) q.append('businessUnitId', filters.businessUnitId);
    if (filters?.projectId) q.append('projectId', filters.projectId);
    if (filters?.reportingPeriodId) q.append('reportingPeriodId', filters.reportingPeriodId);

    const res = await fetch(`/api/analytics/scope3-breakdown?${q.toString()}`, {
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load Scope 3 breakdown');
    return data;
  }

  public async getAnalyticsAnomalies(reportingPeriodId?: string): Promise<any> {
    const q = new URLSearchParams();
    if (reportingPeriodId) q.append('reportingPeriodId', reportingPeriodId);

    const res = await fetch(`/api/analytics/anomalies?${q.toString()}`, {
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch anomalies');
    return data;
  }

  public async generateAiInsights(filter?: any): Promise<any> {
    const res = await fetch('/api/analytics/ai-insights', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ filter }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to generate AI insights');
    return data.insights;
  }

  public async queryAiAnalyst(query: string, filter?: any): Promise<any> {
    const res = await fetch('/api/analytics/ai-query', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ query, filter }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to query AI Analyst');
    return data;
  }
}

export const api = new ApiService();
