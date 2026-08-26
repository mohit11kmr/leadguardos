import { Logger } from '../observability/logger';

export interface EnvValidationResult {
  valid: boolean;
  environment: 'development' | 'staging' | 'production';
  warnings: string[];
  errors: string[];
}

export function validateEnvironment(): EnvValidationResult {
  const env = process.env.NODE_ENV || 'development';
  const isProd = env === 'production';
  const warnings: string[] = [];
  const errors: string[] = [];

  const jwtSecret = process.env.JWT_SECRET;
  const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;
  const databaseUrl = process.env.DATABASE_URL;
  const storageMode = process.env.STORAGE_MODE || 'local';

  // 1. JWT Secret Validation
  if (!jwtSecret) {
    if (isProd) {
      errors.push('JWT_SECRET is required in production environment');
    } else {
      warnings.push('JWT_SECRET not set, using development fallback secret');
    }
  } else if (jwtSecret.includes('dev_secret') || jwtSecret.length < 16) {
    if (isProd) {
      errors.push('JWT_SECRET is insecure or uses development default in production');
    } else {
      warnings.push('JWT_SECRET is weak or uses development default');
    }
  }

  // 2. Razorpay Secret Validation
  if (!razorpaySecret) {
    if (isProd) {
      errors.push('RAZORPAY_KEY_SECRET is required in production environment');
    } else {
      warnings.push('RAZORPAY_KEY_SECRET not set; payment verification will be disabled (HTTP 503)');
    }
  }

  // 3. Database URL Validation
  if (isProd && storageMode === 'local') errors.push('STORAGE_MODE=local is forbidden in production');
  if (isProd && !process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.FIREBASE_PRIVATE_KEY && process.env.K_SERVICE !== 'true') errors.push('Firestore credentials are required in production');

  const result: EnvValidationResult = {
    valid: errors.length === 0,
    environment: env as any,
    warnings,
    errors,
  };

  if (warnings.length > 0) {
    warnings.forEach(w => Logger.warn(`[EnvValidator] ${w}`));
  }

  if (errors.length > 0) {
    errors.forEach(e => Logger.error(`[EnvValidator] CRITICAL: ${e}`));
    if (isProd) {
      throw new Error(`[EnvValidator] Production startup aborted due to environment errors:\n${errors.join('\n')}`);
    }
  }

  return result;
}
