import { AuthUser, LoginResponse, MeResponse } from '../types.ts';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://meil-esg-brsr-reporting-platform-1.onrender.com';
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

  private getApiUrl(path: string): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${API_BASE_URL}${normalizedPath}`;
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
