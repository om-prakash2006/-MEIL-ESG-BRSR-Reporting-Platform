import { v4 as uuidv4 } from 'uuid';
import { firestore } from './firestore.ts';
import { config } from '../config/index.ts';
import type { User, Session, UserRole } from '../models/types.ts';
import { logger } from '../utils/logger.ts';

class AuthService {
  private sessions: Map<string, Session> = new Map();

  constructor() {
    // Periodically prune expired sessions every 10 minutes
    setInterval(() => {
      this.cleanExpiredSessions();
    }, 10 * 60 * 1000);
  }

  private cleanExpiredSessions() {
    const now = Date.now();
    for (const [id, session] of this.sessions.entries()) {
      if (session.expiresAt <= now) {
        this.sessions.delete(id);
      }
    }
  }

  public findUserByEmployeeIdOrEmail(identifier: string): User | null {
    const cleanId = identifier.trim().toLowerCase();
    const users = firestore.getDocs<User>('users');
    const matched = users.find(
      (u) =>
        u.employeeId.toLowerCase() === cleanId ||
        u.email.toLowerCase() === cleanId
    );
    return matched || null;
  }

  public verifyDemoPassword(submittedPassword: string): boolean {
    if (!submittedPassword) return false;
    const clean = submittedPassword.trim();
    // Allow any of the designated demo passwords
    return config.acceptedDemoPasswords.some(
      (p) => p.toLowerCase() === clean.toLowerCase()
    );
  }

  public createSession(userId: string): Session {
    const sessionId = `meil_sess_${uuidv4()}`;
    const now = Date.now();
    const expiresAt = now + config.sessionTtlMs;

    const session: Session = {
      sessionId,
      userId,
      createdAt: now,
      lastActivity: now,
      expiresAt,
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  public getSession(sessionId: string): Session | null {
    if (!sessionId) return null;
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const now = Date.now();
    if (session.expiresAt <= now) {
      this.sessions.delete(sessionId);
      return null;
    }

    // Slide activity window
    session.lastActivity = now;
    return session;
  }

  public invalidateSession(sessionId: string): boolean {
    if (!sessionId) return false;
    return this.sessions.delete(sessionId);
  }

  public getRedirectPath(role: UserRole): string {
    return config.roleDashboardRoutes[role] || '/dashboard/group';
  }

  public getUserById(userId: string): User | null {
    return firestore.getDoc<User>('users', userId);
  }
}

export const authService = new AuthService();
