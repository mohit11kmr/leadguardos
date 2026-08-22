import { storage, ScanRecord } from '../storage';

export interface IScanRepository {
  saveScan(scan: ScanRecord): Promise<ScanRecord>;
  getScanById(scanId: string): Promise<ScanRecord | undefined>;
  getScanByToken(token: string): Promise<ScanRecord | undefined>;
  getRecentScans(limit?: number): Promise<ScanRecord[]>;
  getUserScans(userId: string): Promise<ScanRecord[]>;
}

export class ScanRepository implements IScanRepository {
  async saveScan(scan: ScanRecord): Promise<ScanRecord> {
    storage.saveScan(scan);
    return scan;
  }

  async getScanById(scanId: string): Promise<ScanRecord | undefined> {
    return storage.getScan(scanId);
  }

  async getScanByToken(token: string): Promise<ScanRecord | undefined> {
    const all = storage.getScansHistory(100);
    return all.find(s => s.publicToken === token || s.scanId === token);
  }

  async getRecentScans(limit = 20): Promise<ScanRecord[]> {
    return storage.getScansHistory(limit);
  }

  async getUserScans(userId: string): Promise<ScanRecord[]> {
    const all = storage.getScansHistory(100);
    return all.filter((s: any) => s.userId === userId);
  }
}

export const scanRepository = new ScanRepository();
