export type EnvironmentCategory = 'web' | 'api' | 'worker' | 'shared';
export type EnvironmentValueKind = 'required' | 'optional' | 'defaulted';

export interface EnvironmentVariableDefinition {
  name: string;
  category: EnvironmentCategory;
  kind: EnvironmentValueKind;
  secret: boolean;
  description: string;
}

export const environmentManifest: readonly EnvironmentVariableDefinition[] = [
  { name: 'VITE_API_URL', category: 'web', kind: 'defaulted', secret: false, description: 'API origin used by the browser; current V5 uses same-origin paths.' },
  { name: 'VITE_APP_URL', category: 'web', kind: 'defaulted', secret: false, description: 'Canonical public web origin.' },
  { name: 'NODE_ENV', category: 'shared', kind: 'defaulted', secret: false, description: 'development, test, or production runtime.' },
  { name: 'PORT', category: 'api', kind: 'defaulted', secret: false, description: 'HTTP listen port; current default is 3000.' },
  { name: 'DATABASE_URL', category: 'api', kind: 'required', secret: true, description: 'Canonical PostgreSQL connection string in production.' },
  { name: 'JWT_SECRET', category: 'api', kind: 'required', secret: true, description: 'Application access-token signing secret in production.' },
  { name: 'JWT_REFRESH_SECRET', category: 'api', kind: 'required', secret: true, description: 'Legacy/configured refresh secret; canonical refresh tokens are opaque.' },
  { name: 'ADMIN_API_KEY', category: 'api', kind: 'required', secret: true, description: 'Existing production admin configuration requirement; replace with role policy later.' },
  { name: 'RAZORPAY_KEY_ID', category: 'api', kind: 'optional', secret: false, description: 'Public provider key used to initialize checkout.' },
  { name: 'RAZORPAY_KEY_SECRET', category: 'api', kind: 'required', secret: true, description: 'Server-side payment verification secret.' },
  { name: 'RAZORPAY_WEBHOOK_SECRET', category: 'api', kind: 'optional', secret: true, description: 'Provider webhook signing secret when distinct from current configuration.' },
  { name: 'GEMINI_API_KEY', category: 'worker', kind: 'optional', secret: true, description: 'Current Gemini diagnostic enhancement credential.' },
  { name: 'OPENAI_API_KEY', category: 'worker', kind: 'optional', secret: true, description: 'Current AI remediation provider credential.' },
  { name: 'OPENAI_REMEDIATION_MODEL', category: 'worker', kind: 'defaulted', secret: false, description: 'AI remediation model selector.' },
  { name: 'AI_REMEDIATION_TIMEOUT_MS', category: 'worker', kind: 'defaulted', secret: false, description: 'AI request timeout.' },
  { name: 'SMTP_HOST', category: 'worker', kind: 'optional', secret: false, description: 'Email notification provider host.' },
  { name: 'SMTP_PORT', category: 'worker', kind: 'defaulted', secret: false, description: 'Email notification provider port.' },
  { name: 'SMTP_USER', category: 'worker', kind: 'optional', secret: true, description: 'Email notification provider user.' },
  { name: 'SMTP_PASSWORD', category: 'worker', kind: 'optional', secret: true, description: 'Email notification provider password.' },
  { name: 'SMTP_FROM', category: 'worker', kind: 'optional', secret: false, description: 'Email sender identity.' },
  { name: 'TELEGRAM_BOT_TOKEN', category: 'worker', kind: 'optional', secret: true, description: 'Telegram notification credential.' },
  { name: 'WHATSAPP_API_TOKEN', category: 'worker', kind: 'optional', secret: true, description: 'WhatsApp notification credential.' },
  { name: 'WHATSAPP_PHONE_NUMBER_ID', category: 'worker', kind: 'optional', secret: false, description: 'WhatsApp provider number identifier.' },
  { name: 'CORS_ORIGINS', category: 'api', kind: 'defaulted', secret: false, description: 'Explicit comma-separated browser origins; not centralized in V5 yet.' },
  { name: 'STORAGE_MODE', category: 'api', kind: 'defaulted', secret: false, description: 'Existing compatibility selector; local is forbidden in production.' },
  { name: 'LEADGUARD_DATA_DIR', category: 'shared', kind: 'defaulted', secret: false, description: 'Development/test legacy storage directory.' },
  { name: 'FIREBASE_PROJECT_ID', category: 'api', kind: 'optional', secret: false, description: 'Transitional Firebase compatibility configuration.' },
  { name: 'FIREBASE_CLIENT_EMAIL', category: 'api', kind: 'optional', secret: true, description: 'Transitional Firebase Admin credential.' },
  { name: 'FIREBASE_PRIVATE_KEY', category: 'api', kind: 'optional', secret: true, description: 'Transitional Firebase Admin credential.' },
  { name: 'REDIS_URL', category: 'shared', kind: 'optional', secret: true, description: 'Reserved distributed limiter/queue infrastructure URL.' },
];

export function getEnvironmentDefinitions(category: EnvironmentCategory): EnvironmentVariableDefinition[] {
  return environmentManifest.filter((variable) => variable.category === category);
}
