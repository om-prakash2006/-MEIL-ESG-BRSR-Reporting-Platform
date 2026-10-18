import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './backend/config/index.ts';
import { healthRouter } from './backend/routes/health.ts';
import { authRouter } from './backend/routes/auth.ts';
import { dashboardRouter } from './backend/routes/dashboard.ts';
import { dataRouter } from './backend/routes/data.ts';
import { evidenceRouter } from './backend/routes/evidence.ts';
import { esgRouter } from './backend/routes/esg.ts';
import { auditRouter } from './backend/routes/audit.ts';
import { reconciliationRouter } from './backend/routes/reconciliation.ts';
import { reportsRouter } from './backend/routes/reports.ts';
import { calculationsRouter } from './backend/routes/calculations.ts';
import { analyticsRouter } from './backend/routes/analytics.ts';
import { firestore } from './backend/services/firestore.ts';
import { logger } from './backend/utils/logger.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = config.port;

  // JSON Body Parser with limit
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // CORS and Cache Control Headers for corporate preview
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-session-id');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Backend API Routes
  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/data', dataRouter);
  app.use('/api/evidence', evidenceRouter);
  app.use('/api/esg', esgRouter);
  app.use('/api/audit', auditRouter);
  app.use('/api/reconciliation', reconciliationRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/calculations', calculationsRouter);
  app.use('/api/analytics', analyticsRouter);

  // Standard API 404 handler
  app.all('/api/*', (req, res) => {
    res.status(404).json({
      error: 'Not found',
      message: `API route ${req.method} ${req.path} does not exist.`,
    });
  });

  // Global error handler
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error('Unhandled server exception', {
      error: err instanceof Error ? err.message : String(err),
    });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'A secure backend error occurred. Check system diagnostics.',
    });
  });

  // Mount Vite middleware in development; serve dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    logger.info('Vite development middlewares attached');
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`MEIL ESG Statutory Platform running on http://0.0.0.0:${PORT}`);
    // Non-blocking background sync after server is up and listening
    setTimeout(() => {
      firestore.syncFromCloudFirestore().catch((err: unknown) => {
        logger.warn('Background Cloud Firestore sync deferred', {
          error: err instanceof Error ? err.message : String(err),
        });
      });
    }, 100);
  });
}

startServer().catch((err) => {
  console.error('Fatal failure launching MEIL ESG server:', err);
  process.exit(1);
});
