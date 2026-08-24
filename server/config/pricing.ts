export type PlanTier = 'FREE' | 'USER' | 'AGENCY' | 'ADMIN';

export const PLAN_CONFIG: Record<PlanTier, { monthlyScanLimit: number; monthlyScans: number; maxWatchdogTargets: number; allowExports: boolean; allowAdvancedTools: boolean }> = {
  FREE: { monthlyScanLimit: 5, monthlyScans: 5, maxWatchdogTargets: 1, allowExports: false, allowAdvancedTools: false },
  USER: { monthlyScanLimit: 20, monthlyScans: 20, maxWatchdogTargets: 5, allowExports: true, allowAdvancedTools: true },
  AGENCY: { monthlyScanLimit: 1000, monthlyScans: 1000, maxWatchdogTargets: 50, allowExports: true, allowAdvancedTools: true },
  ADMIN: { monthlyScanLimit: 100000, monthlyScans: 100000, maxWatchdogTargets: 1000, allowExports: true, allowAdvancedTools: true },
};

export interface TierPricingConfig {
  tierId: string;
  name: string;
  amountINR: number;
  currency: string;
  billingPeriod: 'ONE_TIME' | 'MONTHLY' | 'YEARLY';
  description: string;
  features: string[];
}

export const CENTRALIZED_PRICING_CATALOG: Record<string, TierPricingConfig> = {
  'tier-express-fix': {
    tierId: 'tier-express-fix',
    name: 'Express 15-Minute DFY Lead Repair',
    amountINR: 2999,
    currency: 'INR',
    billingPeriod: 'ONE_TIME',
    description: 'Done-For-You technician repair of broken WhatsApp links (+9191 bug), call dialers, Meta Pixel lead events, and robots tags in 15 minutes.',
    features: [
      '15-Minute Guaranteed Repair',
      'WhatsApp +9191 Bug Fix',
      'Meta Pixel (fbq) Event Verification',
      'Mobile Click-to-Call Link Patch',
      'Google <noindex> SEO Recovery',
      '30-Day Money Back Assurance',
    ],
  },
  'tier-watchdog-monthly': {
    tierId: 'tier-watchdog-monthly',
    name: '24/7 Watchdog Uptime Radar',
    amountINR: 299,
    currency: 'INR',
    billingPeriod: 'MONTHLY',
    description: 'Continuous background surveillance polling your WhatsApp buttons, Meta Pixels, and phone dialers every 60 minutes with instant Telegram/WhatsApp alerts.',
    features: [
      '60-Minute Background Polling',
      'Instant WhatsApp & Telegram Alerts',
      'Meta Pixel Runtime Network Verification',
      'SHA-256 Incident Fingerprinting',
      'Zero False Alarm Cooldown Filter',
      'Cancel Anytime',
    ],
  },
  'tier-agency-monthly': {
    tierId: 'tier-agency-monthly',
    name: 'Agency White-Label License',
    amountINR: 4999,
    currency: 'INR',
    billingPeriod: 'MONTHLY',
    description: 'Tailored for marketing agencies & freelancers. Generate custom logo PDF audit reports, run multi-client scans, and access AI cold-pitch generator.',
    features: [
      'Multi-Client Workspace Dashboard',
      'Custom Logo & Branding PDF Export',
      'Unlimited Prospect Scans',
      'AI Cold-Outreach Pitch Generator',
      'Multi-Member Role Access Control',
      'Priority Founder Support',
    ],
  },
};

/**
 * Server-authoritative calculation of tier pricing.
 * Rejects client-supplied prices or amounts to prevent tampering.
 */
export function calculateTierPrice(tierId: string): { amountINR: number; currency: string; config: TierPricingConfig } {
  const config = CENTRALIZED_PRICING_CATALOG[tierId] || CENTRALIZED_PRICING_CATALOG['tier-express-fix'];
  return {
    amountINR: config.amountINR,
    currency: config.currency,
    config,
  };
}

export function getTierConfig(tierId: string): TierPricingConfig {
  return CENTRALIZED_PRICING_CATALOG[tierId] || CENTRALIZED_PRICING_CATALOG['tier-express-fix'];
}
