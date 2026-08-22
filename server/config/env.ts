import dotenv from 'dotenv';
dotenv.config();

export interface AppEnv {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  DATABASE_URL?: string;
  REDIS_URL?: string;
  JWT_SECRET: string;
  ADMIN_API_KEY: string;
  RAZORPAY_KEY_SECRET: string;
  GEMINI_API_KEY?: string;
  SCAN_TIMEOUT_MS: number;
  BROWSER_TIMEOUT_MS: number;
  MAX_BATCH_SIZE: number;
  MAX_BATCH_CONCURRENCY: number;
}

export function validateEnv(): AppEnv {
  const isProd = process.env.NODE_ENV === 'production';

  const jwtSecret = process.env.JWT_SECRET || (isProd ? '' : 'leadguard_dev_jwt_secret_key_32_chars');
  const adminKey = process.env.ADMIN_API_KEY || (isProd ? '' : 'leadguard_dev_admin_api_key');
  const razorpaySecret = process.env.RAZORPAY_KEY_SECRET || (isProd ? '' : 'leadguard_dev_razorpay_secret');

  if (isProd) {
    const missingSecrets: string[] = [];
    if (!process.env.JWT_SECRET) missingSecrets.push('JWT_SECRET');
    if (!process.env.ADMIN_API_KEY) missingSecrets.push('ADMIN_API_KEY');
    if (!process.env.RAZORPAY_KEY_SECRET) missingSecrets.push('RAZORPAY_KEY_SECRET');

    if (missingSecrets.length > 0) {
      console.error(`[FATAL] Missing required production environment variables: ${missingSecrets.join(', ')}`);
      process.exit(1);
    }
  }

  return {
    NODE_ENV: (process.env.NODE_ENV as any) || 'development',
    PORT: parseInt(process.env.PORT || '3000', 10),
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    JWT_SECRET: jwtSecret,
    ADMIN_API_KEY: adminKey,
    RAZORPAY_KEY_SECRET: razorpaySecret,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    SCAN_TIMEOUT_MS: parseInt(process.env.SCAN_TIMEOUT_MS || '15000', 10),
    BROWSER_TIMEOUT_MS: parseInt(process.env.BROWSER_TIMEOUT_MS || '15000', 10),
    MAX_BATCH_SIZE: parseInt(process.env.MAX_BATCH_SIZE || '20', 10),
    MAX_BATCH_CONCURRENCY: parseInt(process.env.MAX_BATCH_CONCURRENCY || '5', 10),
  };
}

export const env = validateEnv();
