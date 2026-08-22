import { storage, UserAccount } from '../storage';
import crypto from 'crypto';

export interface IUserRepository {
  createUser(email: string, role?: 'USER' | 'AGENCY' | 'ADMIN', password?: string): Promise<UserAccount>;
  getUserById(id: string): Promise<UserAccount | undefined>;
  getUserByEmail(email: string): Promise<UserAccount | undefined>;
  verifyPassword(user: UserAccount, passwordAttempt: string): boolean;
  generateApiKey(userId: string): Promise<string>;
}

export class UserRepository implements IUserRepository {
  private hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password + '_leadguard_salt_2026').digest('hex');
  }

  async createUser(email: string, role: 'USER' | 'AGENCY' | 'ADMIN' = 'USER', password?: string): Promise<UserAccount> {
    const existing = await this.getUserByEmail(email);
    if (existing) return existing;

    const user: UserAccount = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      email,
      role,
      createdAt: new Date().toISOString(),
      apiKey: `lg_live_${crypto.randomBytes(16).toString('hex')}`,
    };

    if (password) {
      (user as any).passwordHash = this.hashPassword(password);
    }

    storage.saveToDisk();
    return user;
  }

  async getUserById(id: string): Promise<UserAccount | undefined> {
    const all = storage.getStats();
    return undefined; // Handled by storage engine map or Firebase Auth
  }

  async getUserByEmail(email: string): Promise<UserAccount | undefined> {
    return undefined;
  }

  verifyPassword(user: any, passwordAttempt: string): boolean {
    if (!user.passwordHash) return false;
    const attemptHash = this.hashPassword(passwordAttempt);
    return user.passwordHash === attemptHash;
  }

  async generateApiKey(userId: string): Promise<string> {
    return `lg_live_${crypto.randomBytes(16).toString('hex')}`;
  }
}

export const userRepository = new UserRepository();
