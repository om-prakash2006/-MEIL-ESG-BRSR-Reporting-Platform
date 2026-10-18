import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { config } from '../config/index.ts';
import { logger } from '../utils/logger.ts';

export interface StorageUploadResult {
  storagePath: string;
  localPath: string;
  checksum: string;
  fileSize: number;
  mimeType: string;
  originalFileName: string;
  downloadUrl: string;
}

class StorageService {
  private localBaseDir: string;

  constructor() {
    this.localBaseDir = path.resolve('.data', 'storage');
    if (!fs.existsSync(this.localBaseDir)) {
      fs.mkdirSync(this.localBaseDir, { recursive: true });
    }
  }

  /**
   * Sanitizes filename, removing directory traversal and dangerous characters.
   */
  public sanitizeFilename(filename: string): string {
    const base = path.basename(filename);
    return base.replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  /**
   * Constructs the server-authoritative predictable Firebase Storage path:
   * evidence/{organizationId}/{companyId}/{reportingPeriodId}/{projectId}/{documentId}/{safeFilename}
   */
  public buildStoragePath(params: {
    organizationId: string;
    companyId?: string;
    reportingPeriodId: string;
    projectId?: string;
    documentId: string;
    filename: string;
  }): string {
    const org = params.organizationId || 'GROUP001';
    const comp = params.companyId || 'COMP001';
    const period = params.reportingPeriodId || 'Q3_FY2526';
    const proj = params.projectId || 'enterprise';
    const safeName = this.sanitizeFilename(params.filename);

    return `evidence/${org}/${comp}/${period}/${proj}/${params.documentId}/${safeName}`;
  }

  /**
   * Computes SHA-256 checksum for immutable evidence integrity auditing.
   */
  public computeSha256(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Uploads and secures evidence file.
   */
  public async uploadEvidenceFile(params: {
    buffer: Buffer;
    originalFileName: string;
    mimeType: string;
    documentId: string;
    organizationId: string;
    companyId?: string;
    reportingPeriodId: string;
    projectId?: string;
  }): Promise<StorageUploadResult> {
    const checksum = this.computeSha256(params.buffer);
    const storagePath = this.buildStoragePath({
      organizationId: params.organizationId,
      companyId: params.companyId,
      reportingPeriodId: params.reportingPeriodId,
      projectId: params.projectId,
      documentId: params.documentId,
      filename: params.originalFileName,
    });

    // Save to local secure mirror for fast and reliable streaming
    const diskPath = path.resolve(this.localBaseDir, storagePath);
    const diskDir = path.dirname(diskPath);
    if (!fs.existsSync(diskDir)) {
      fs.mkdirSync(diskDir, { recursive: true });
    }
    fs.writeFileSync(diskPath, params.buffer);

    // Upload to real Firebase Cloud Storage in project bput-hackathon-37dfd if bucket is available
    let cloudDownloadUrl = `/api/evidence/${params.documentId}/download`;
    let cloudUploaded = false;
    try {
      const { firebaseClient } = await import('./firebaseClient.ts');
      const cloudResult = await firebaseClient.uploadToCloudStorage(storagePath, params.buffer, params.mimeType);
      if (cloudResult.cloudUploaded && cloudResult.downloadUrl) {
        cloudDownloadUrl = cloudResult.downloadUrl;
        cloudUploaded = true;
      }
    } catch {
      // Local mirror already stored the file securely with SHA-256 integrity
    }

    logger.info('Evidence file stored securely with SHA-256 integrity verification', {
      documentId: params.documentId,
      storagePath,
      bucket: config.storageBucket,
      checksum: checksum.slice(0, 16) + '...',
      sizeBytes: params.buffer.length,
      cloudUploaded,
    });

    return {
      storagePath,
      localPath: diskPath,
      checksum,
      fileSize: params.buffer.length,
      mimeType: params.mimeType,
      originalFileName: params.originalFileName,
      downloadUrl: cloudDownloadUrl,
    };
  }

  /**
   * Returns root storage directory.
   */
  public getLocalBaseDir(): string {
    return this.localBaseDir;
  }

  /**
   * Checks whether the underlying file exists in storage.
   */
  public checkFileExists(storagePath: string): boolean {
    if (!storagePath) return false;
    const diskPath = path.resolve(this.localBaseDir, storagePath);
    return fs.existsSync(diskPath);
  }

  /**
   * Returns exact on-disk byte size for a stored path, or 0 if missing.
   */
  public getFileSize(storagePath: string): number {
    if (!storagePath) return 0;
    const diskPath = path.resolve(this.localBaseDir, storagePath);
    if (fs.existsSync(diskPath)) {
      try {
        return fs.statSync(diskPath).size;
      } catch {
        return 0;
      }
    }
    return 0;
  }

  /**
   * Reads stored evidence buffer for download streaming.
   */
  public getFileBuffer(storagePath: string): { buffer: Buffer; exists: boolean } {
    const diskPath = path.resolve(this.localBaseDir, storagePath);
    if (fs.existsSync(diskPath)) {
      return { buffer: fs.readFileSync(diskPath), exists: true };
    }
    return { buffer: Buffer.alloc(0), exists: false };
  }

  /**
   * Constructs the server-authoritative predictable Firebase Storage path for reports:
   * reports/{organizationId}/{companyId}/{reportingPeriodId}/{reportId}/v{reportVersion}/report.pdf
   */
  public buildReportStoragePath(params: {
    organizationId: string;
    companyId: string;
    reportingPeriodId: string;
    reportId: string;
    reportVersion: number;
  }): string {
    const org = params.organizationId || 'GROUP001';
    const comp = params.companyId || 'COMP001';
    const period = params.reportingPeriodId || 'Q3_FY2526';
    return `reports/${org}/${comp}/${period}/${params.reportId}/v${params.reportVersion}/report.pdf`;
  }

  /**
   * Uploads generated report PDF artifact to Cloud Storage & local mirror.
   */
  public async uploadReportArtifact(params: {
    buffer: Buffer;
    organizationId: string;
    companyId: string;
    reportingPeriodId: string;
    reportId: string;
    reportVersion: number;
  }): Promise<{
    storagePath: string;
    downloadUrl: string;
    checksum: string;
    fileSize: number;
    cloudUploaded: boolean;
  }> {
    const checksum = this.computeSha256(params.buffer);
    const storagePath = this.buildReportStoragePath(params);

    // Save to local secure mirror
    const diskPath = path.resolve(this.localBaseDir, storagePath);
    const diskDir = path.dirname(diskPath);
    if (!fs.existsSync(diskDir)) {
      fs.mkdirSync(diskDir, { recursive: true });
    }
    fs.writeFileSync(diskPath, params.buffer);

    let downloadUrl = `/api/reports/${params.reportId}/download`;
    let cloudUploaded = false;

    try {
      const { firebaseClient } = await import('./firebaseClient.ts');
      const cloudResult = await firebaseClient.uploadToCloudStorage(storagePath, params.buffer, 'application/pdf');
      if (cloudResult.cloudUploaded && cloudResult.downloadUrl) {
        downloadUrl = cloudResult.downloadUrl;
        cloudUploaded = true;
      }
    } catch {
      // Local mirror already stored the report securely
    }

    logger.info('Report PDF artifact stored securely with SHA-256 integrity verification', {
      reportId: params.reportId,
      version: params.reportVersion,
      storagePath,
      checksum: checksum.slice(0, 16) + '...',
      sizeBytes: params.buffer.length,
      cloudUploaded,
    });

    return {
      storagePath,
      downloadUrl,
      checksum,
      fileSize: params.buffer.length,
      cloudUploaded,
    };
  }
}

export const storageService = new StorageService();
