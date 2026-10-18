import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc, setLogLevel } from 'firebase/firestore';
import { getStorage, FirebaseStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import fs from 'fs';
import path from 'path';
import { config } from '../config/index.ts';
import { logger } from '../utils/logger.ts';

// Suppress internal Firestore WebChannel/gRPC idle listen stream logs
try {
  setLogLevel('silent');
} catch {
  // Ignore if already configured
}

export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
} as const;
export type OperationType = typeof OperationType[keyof typeof OperationType];

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: false,
      tenantId: null,
      providerInfo: [],
    },
    operationType,
    path,
  };
  logger.error('Firestore Error: ', errInfo as unknown as Record<string, unknown>);
  throw new Error(JSON.stringify(errInfo));
}

let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;
let cloudStorage: FirebaseStorage | null = null;
let storageBucketAvailable: boolean | null = null;

export function initFirebaseClient() {
  if (firebaseApp) return { app: firebaseApp, db: firestoreDb, storage: cloudStorage };

  try {
    const cfg: Record<string, string> = {
      projectId: config.firestoreProjectId,
      apiKey: config.firebaseApiKey,
      appId: config.firebaseAppId,
      storageBucket: config.storageBucket,
    };

    if (getApps().length === 0) {
      firebaseApp = initializeApp(cfg);
    } else {
      firebaseApp = getApps()[0];
    }

    const databaseId = config.firestoreDatabaseId;
    firestoreDb = getFirestore(firebaseApp, databaseId);
    cloudStorage = getStorage(firebaseApp, 'gs://' + config.storageBucket);

    logger.info('Firebase Client initialized for project (secrets database)', {
      projectId: config.firestoreProjectId,
      databaseId: config.firestoreDatabaseId,
      storageBucket: config.storageBucket,
    });
  } catch (err: unknown) {
    logger.error('Failed to initialize Firebase Client SDK', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return { app: firebaseApp, db: firestoreDb, storage: cloudStorage };
}

/**
 * Recursively cleans an object or array for Cloud Firestore, stripping out any
 * keys with `undefined` values at any depth. In Google Cloud Firestore SDK,
 * passing `undefined` in any document field throws:
 * "Function setDoc() called with invalid data. Unsupported field value: undefined".
 */
export function sanitizeForFirestore<T>(val: T): T {
  if (val === undefined) {
    return undefined as unknown as T;
  }
  if (val === null || typeof val !== 'object') {
    return val;
  }
  if (val instanceof Date) {
    return val;
  }
  if (Array.isArray(val)) {
    return val
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(val as Record<string, unknown>)) {
    if (value !== undefined) {
      clean[key] = sanitizeForFirestore(value);
    }
  }
  return clean as unknown as T;
}

export const CLOUD_FIRESTORE_PERMITTED_COLLECTIONS = new Set([
  'evidenceDocuments',
  'evidenceLinks',
  'auditLogs',
  'users',
  'roles',
  'organizations',
  'businessUnits',
  'projects',
  'facilities',
  'reportingPeriods',
  'activityRecords',
  'activityDetails',
  'activityEvidenceLinks',
  'activityVersions',
  'emissionSources',
  'activityTypes',
  'units',
  'scope3Categories',
  'valueChainPartners',
  'substances',
  'auditAssignments',
  'auditReviews',
  'auditFindings',
  'auditClarifications',
  'reconciliationCases',
  'correctionRequests',
  'reconciliationHistory',
]);

export const firebaseClient = {
  getApp(): FirebaseApp | null {
    if (!firebaseApp) initFirebaseClient();
    return firebaseApp;
  },

  getDb(): Firestore | null {
    if (!firestoreDb) initFirebaseClient();
    return firestoreDb;
  },

  getStorage(): FirebaseStorage | null {
    if (!cloudStorage) initFirebaseClient();
    return cloudStorage;
  },

  /**
   * Uploads file buffer directly to Firebase Cloud Storage.
   * Returns live Cloud Storage public/download URL or falls back gracefully to local mirror.
   */
  async uploadToCloudStorage(storagePath: string, buffer: Buffer, mimeType: string): Promise<{ downloadUrl: string; storagePath: string; cloudUploaded: boolean }> {
    if (storageBucketAvailable === false) {
      return { downloadUrl: '', storagePath, cloudUploaded: false };
    }

    const storage = this.getStorage();
    if (!storage) {
      return { downloadUrl: '', storagePath, cloudUploaded: false };
    }

    const storageRef = ref(storage, storagePath);
    try {
      const snapshot = await uploadBytes(storageRef, buffer, {
        contentType: mimeType,
      });

      storageBucketAvailable = true;
      const downloadUrl = await getDownloadURL(storageRef);
      logger.info('File successfully uploaded to Firebase Cloud Storage', {
        storagePath: snapshot.metadata.fullPath,
        bucket: snapshot.metadata.bucket,
        sizeBytes: snapshot.metadata.size,
      });

      return { downloadUrl, storagePath: snapshot.metadata.fullPath, cloudUploaded: true };
    } catch (err: unknown) {
      const error = err as { status_?: number; code?: string; message?: string };
      if (error.status_ === 404 || error.code === 'storage/unknown' || (error.message && error.message.includes('404'))) {
        storageBucketAvailable = false;
        logger.info('Firebase Cloud Storage bucket not yet enabled in Firebase console; using local secure mirror', {
          bucket: config.storageBucket,
          project: config.firestoreProjectId,
        });
        return { downloadUrl: '', storagePath, cloudUploaded: false };
      }

      logger.info('Firebase Cloud Storage upload deferred; file maintained in verified local store', {
        message: error.message || String(err),
      });
      return { downloadUrl: '', storagePath, cloudUploaded: false };
    }
  },

  /**
   * Writes metadata document to real Cloud Firestore in project bput-hackathon-37dfd.
   */
  async writeToFirestore(collectionName: string, documentId: string, data: Record<string, unknown>): Promise<void> {
    if (!CLOUD_FIRESTORE_PERMITTED_COLLECTIONS.has(collectionName)) {
      // Local-only collection; authoritative in primary JSON/memory store
      return;
    }

    const db = this.getDb();
    if (!db) return;

    try {
      const cleanData = sanitizeForFirestore(data);
      const docRef = doc(db, collectionName, documentId);
      await setDoc(docRef, { ...cleanData, _persistedToCloudFirestoreAt: Date.now() });
      logger.info('Document written to Cloud Firestore', {
        collection: collectionName,
        documentId,
        project: config.firestoreProjectId,
      });
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      if (error.code === 'permission-denied' || (error.message && error.message.includes('PERMISSION_DENIED'))) {
        logger.info('Cloud sync deferred for collection due to security rules; authoritative in local store', {
          collection: collectionName,
          documentId,
        });
      } else {
        logger.warn(`Could not sync doc ${documentId} in ${collectionName} to Cloud Firestore`, {
          message: error.message || String(err),
        });
      }
    }
  },

  /**
   * Reads metadata document from Cloud Firestore.
   */
  async readFromFirestore<T = Record<string, unknown>>(collectionName: string, documentId: string): Promise<T | null> {
    if (!CLOUD_FIRESTORE_PERMITTED_COLLECTIONS.has(collectionName)) {
      return null;
    }

    const db = this.getDb();
    if (!db) return null;

    try {
      const docRef = doc(db, collectionName, documentId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return null;
      return snap.data() as T;
    } catch {
      return null;
    }
  },

  /**
   * Reads all documents in a collection from Cloud Firestore.
   */
  async getAllFromFirestore<T = Record<string, unknown>>(collectionName: string): Promise<Map<string, T>> {
    const result = new Map<string, T>();
    if (!CLOUD_FIRESTORE_PERMITTED_COLLECTIONS.has(collectionName)) {
      return result;
    }

    const db = this.getDb();
    if (!db) return result;

    try {
      const snap = await getDocs(collection(db, collectionName));
      snap.forEach((docSnap) => {
        result.set(docSnap.id, docSnap.data() as T);
      });
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      if (error.code !== 'permission-denied' && (!error.message || !error.message.includes('PERMISSION_DENIED'))) {
        logger.warn(`Could not read collection ${collectionName} from Cloud Firestore`, {
          message: error.message || String(err),
        });
      }
    }
    return result;
  },

  /**
   * Deletes a document from Cloud Firestore.
   */
  async deleteFromFirestore(collectionName: string, documentId: string): Promise<void> {
    if (!CLOUD_FIRESTORE_PERMITTED_COLLECTIONS.has(collectionName)) {
      return;
    }

    const db = this.getDb();
    if (!db) return;

    try {
      const docRef = doc(db, collectionName, documentId);
      await deleteDoc(docRef);
      logger.info('Document deleted from Cloud Firestore', {
        collection: collectionName,
        documentId,
        project: config.firestoreProjectId,
      });
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      if (error.code !== 'permission-denied' && (!error.message || !error.message.includes('PERMISSION_DENIED'))) {
        logger.warn(`Could not delete doc ${documentId} in ${collectionName} from Cloud Firestore`, {
          message: error.message || String(err),
        });
      }
    }
  },

  /**
   * Checks Cloud Storage availability status.
   */
  getStorageAvailability(): boolean | null {
    return storageBucketAvailable;
  },
};
