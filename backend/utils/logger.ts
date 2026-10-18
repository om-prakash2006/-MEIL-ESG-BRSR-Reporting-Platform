type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'SECURITY';

export const logger = {
  log(level: LogLevel, action: string, details?: Record<string, unknown>) {
    const timestamp = new Date().toISOString();
    const sanitizedDetails = details ? { ...details } : {};
    
    // Safety check: Never log passwords or secrets
    if ('password' in sanitizedDetails) {
      delete sanitizedDetails.password;
    }
    if ('token' in sanitizedDetails) {
      sanitizedDetails.token = '***REDACTED***';
    }

    const payload = {
      timestamp,
      level,
      action,
      ...sanitizedDetails,
    };

    const prefix = `[MEIL-ESG] [${timestamp}] [${level}] ${action}`;
    if (level === 'ERROR' || level === 'SECURITY') {
      console.error(prefix, Object.keys(sanitizedDetails).length ? sanitizedDetails : '');
    } else if (level === 'WARN') {
      console.warn(prefix, Object.keys(sanitizedDetails).length ? sanitizedDetails : '');
    } else {
      console.log(prefix, Object.keys(sanitizedDetails).length ? sanitizedDetails : '');
    }
  },

  info(action: string, details?: Record<string, unknown>) {
    this.log('INFO', action, details);
  },

  warn(action: string, details?: Record<string, unknown>) {
    this.log('WARN', action, details);
  },

  error(action: string, details?: Record<string, unknown>) {
    this.log('ERROR', action, details);
  },

  security(action: string, details?: Record<string, unknown>) {
    this.log('SECURITY', action, details);
  },

  loginAttempt(employeeIdOrEmail: string, ip?: string) {
    this.info('Login attempt initiated', { employeeIdOrEmail, ip });
  },

  loginSuccess(user: { userId: string; employeeId: string; role: string; organizationId: string }) {
    this.info('Successful demo login', {
      userId: user.userId,
      employeeId: user.employeeId,
      role: user.role,
      organizationId: user.organizationId,
    });
  },

  logout(userId: string, sessionId: string) {
    this.info('User session logged out', { userId, sessionId });
  },

  unauthorizedAccess(reason: string, details?: Record<string, unknown>) {
    this.security('Unauthorized access attempt blocked', { reason, ...details });
  },

  dashboardRequest(userId: string, role: string, scope?: string) {
    this.info('Dashboard data requested', { userId, role, scope });
  },
};
