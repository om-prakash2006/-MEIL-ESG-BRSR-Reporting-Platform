import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import type { UserRole } from '../models/types.ts';

dotenv.config();

// Read firebase-applet-config.json if available
let firebaseConfig: Record<string, string> = {};
try {
  const cfgPath = path.resolve('firebase-applet-config.json');
  if (fs.existsSync(cfgPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
  }
} catch {
  // fallback
}

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  sessionSecret: process.env.SESSION_SECRET || 'meil-esg-statutory-demo-secret-2026',
  sessionTtlMs: parseInt(process.env.SESSION_TTL_MS || '43200000', 10), // 12 hours

  // Firebase project & Cloud Storage - Secrets take authoritative priority
  firestoreProjectId: process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId || 'bput-hackathon-37dfd',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket || 'bput-hackathon-37dfd.firebasestorage.app',
  firestoreDatabaseId: process.env.FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId || 'ai-studio-meilesgbrsrrepor-7c6cb2ae-4826-4437-af21-e3348a74ab7e',
  firebaseApiKey: process.env.FIREBASE_API_KEY || firebaseConfig.apiKey || '',
  firebaseAppId: process.env.FIREBASE_APP_ID || firebaseConfig.appId || '',

  // Evidence file limits & validation
  maxUploadSizeBytes: 25 * 1024 * 1024, // 25 MB
  allowedExtensions: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.jpg', '.jpeg', '.png'],
  allowedMimeTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'image/jpeg',
    'image/png',
  ],

  // Prototype demo password options accepted for testing
  acceptedDemoPasswords: [
    'demo-password',
    'meil@demo123',
    'password123',
    'meil2026',
  ],

  // Default role redirection routes
  roleDashboardRoutes: {
    PROJECT_USER: '/dashboard/project',
    BUSINESS_UNIT_USER: '/dashboard/business-unit',
    COMPANY_USER: '/dashboard/company',
    GROUP_ADMIN: '/dashboard/group',
    AUDITOR: '/dashboard/auditor',
    MANAGEMENT: '/dashboard/management',
  } as Record<UserRole, string>,
};
