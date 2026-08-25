import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { getAdminDb, FieldValue, isFirebaseConfigured } from '../firebaseAdmin';

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
 * Firestore holds ONLY small metadata documents. Actual PDF bytes live in
 * Firebase Storage (production) or the local data directory (development).
 * Never store large base64 blobs in Firestore.
 */
class PdfReportRepository {
  /** @classification CACHE-ONLY in dev; Firestore is authority in production */
  private local = new Map<string, PdfReportMetadata>();

  async save(metadata: PdfReportMetadata): Promise<void> {
    this.local.set(metadata.pdfId, metadata);

    if (isFirebaseConfigured()) {
      const db = getAdminDb();
      // Fail-closed: metadata write failure must fail the generating job.
      await db.collection('pdfReports').doc(metadata.pdfId).set({
        ...metadata,
        serverTimestamp: FieldValue.serverTimestamp(),
      });
      return;
    }

    if (process.env.NODE_ENV === 'production') {
      throw new Error('PDF_METADATA_STORE_UNAVAILABLE: Firestore required in production');
    }
  }

  async getById(pdfId: string): Promise<PdfReportMetadata | undefined> {
    if (isFirebaseConfigured()) {
      try {
        const snap = await getAdminDb().collection('pdfReports').doc(pdfId).get();
        if (snap.exists) {
          const meta = snap.data() as PdfReportMetadata;
          this.local.set(pdfId, meta);
          return meta;
        }
      } catch {
        // Fall through to local cache
      }
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
}

export const pdfReportRepository = new PdfReportRepository();
