import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { isPgEnabled } from '../db/storageMode';
import { isFirebaseConfigured } from '../firebaseAdmin';

export interface PdfReportMetadata {
  pdfId: string;
  scanId: string;
  userId?: string;
  domain?: string;
  score?: number;
  storagePath: string;
  contentType: string;
  sizeBytes: number;
  sha256: string;
  generatedAt: string;
}

/**
 * Durable PDF report metadata repository.
 *
 * PostgreSQL `PdfReport` table holds authoritative metadata.
 * Actual PDF bytes live in Firebase Storage / S3 / GCS (production) or
 * the local data directory (development).
 */
class PdfReportRepository {
  /** @classification CACHE-ONLY in dev; PostgreSQL is authority in production */
  private local = new Map<string, PdfReportMetadata>();

  async save(metadata: PdfReportMetadata): Promise<void> {
    // PostgreSQL authority — fail-closed
    if (isPgEnabled()) {
      const { prisma } = await import('../db/prisma');
      await prisma.pdfReport.upsert({
        where: { id: metadata.pdfId },
        create: {
          id: metadata.pdfId,
          scanId: metadata.scanId,
          userId: metadata.userId || null,
          storagePath: metadata.storagePath,
          contentType: metadata.contentType,
          sizeBytes: metadata.sizeBytes,
          sha256: metadata.sha256,
          generatedAt: new Date(metadata.generatedAt),
        },
        update: {
          storagePath: metadata.storagePath,
          sha256: metadata.sha256,
          sizeBytes: metadata.sizeBytes,
        },
      });
      return;
    }

    if (process.env.NODE_ENV === 'production') {
      throw new Error('PDF_METADATA_STORE_UNAVAILABLE: PostgreSQL required in production');
    }

    this.local.set(metadata.pdfId, metadata);
  }

  async getById(pdfId: string): Promise<PdfReportMetadata | undefined> {
    if (isPgEnabled()) {
      const row = await (await import('../db/prisma')).prisma.pdfReport.findUnique({ where: { id: pdfId } });
      if (!row) return undefined;
      return {
        pdfId: row.id,
        scanId: row.scanId,
        userId: row.userId || undefined,
        storagePath: row.storagePath,
        contentType: row.contentType,
        sizeBytes: row.sizeBytes,
        sha256: row.sha256,
        generatedAt: row.generatedAt.toISOString(),
      };
    }

    return this.local.get(pdfId);
  }

  /**
   * Read PDF bytes from durable storage.
   * Production: Firebase Storage object at metadata.storagePath.
   * Development: local file written by the generatePdf executor.
   */
  async readBytes(metadata: PdfReportMetadata): Promise<Buffer> {
    if (isFirebaseConfigured()) {
      const { getStorage } = await import('firebase-admin/storage');
      const bucket = getStorage().bucket();
      const [exists] = await bucket.file(metadata.storagePath).exists();
      if (!exists) {
        throw new Error(`PDF_OBJECT_NOT_FOUND: ${metadata.storagePath}`);
      }
      const [buf] = await bucket.file(metadata.storagePath).download();
      return Buffer.from(buf);
    }

    if (process.env.NODE_ENV === 'production') {
      throw new Error('PDF_STORAGE_UNAVAILABLE: durable object storage required in production');
    }

    const localPath = path.join(
      process.env.LEADGUARD_DATA_DIR || path.join(process.cwd(), 'data'),
      'pdf-reports',
      `${metadata.pdfId}.pdf`
    );
    if (!fs.existsSync(localPath)) {
      throw new Error(`PDF_OBJECT_NOT_FOUND: ${localPath}`);
    }
    return fs.readFileSync(localPath);
  }

  /** Integrity verification — bytes must match persisted sha256 digest. */
  verifyIntegrity(bytes: Buffer, metadata: PdfReportMetadata): boolean {
    const digest = crypto.createHash('sha256').update(bytes).digest('hex');
    return digest === metadata.sha256;
  }

  public clear(): void {
    this.local.clear();
  }
}

export const pdfReportRepository = new PdfReportRepository();
