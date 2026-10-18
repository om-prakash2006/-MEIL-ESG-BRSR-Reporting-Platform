import { Router, Request, Response } from 'express';
import { firestore } from '../services/firestore.ts';
import { config } from '../config/index.ts';

export const healthRouter = Router();

/**
 * GET /api/health
 * Backend health verification with Firestore connectivity validation.
 */
healthRouter.get('/', (_req: Request, res: Response): void => {
  const firestoreHealth = firestore.getHealth();

  res.status(200).json({
    status: 'ok',
    service: 'MEIL ESG Backend',
    firebase: {
      projectId: config.firestoreProjectId,
      storageBucket: config.storageBucket,
      databaseId: config.firestoreDatabaseId,
    },
    firestore: {
      status: firestoreHealth.status,
      databaseId: firestoreHealth.databaseId,
      collections: firestoreHealth.collections,
      totalDocuments: firestoreHealth.totalDocuments,
      seeded: firestoreHealth.seeded,
    },
    timestamp: new Date().toISOString(),
  });
});
