export type PlanTier = 'FREE' | 'PRO' | 'AGENCY';

export interface PlanLimits {
  id: PlanTier;
  name: string;
  priceINR: number;
  monthlyScans: number;
  maxWatchdogTargets: number;
  allowExports: boolean;
  allowAdvancedTools: boolean;
  allowWhiteLabel: boolean;
  teamMembersLimit: number;
}

export const PLAN_CONFIG: Record<PlanTier, PlanLimits> = {
  FREE: {
    id: 'FREE',
    name: 'LeadGuard Free Starter',
    priceINR: 0,
    monthlyScans: 5,
    maxWatchdogTargets: 1,
    allowExports: false,
    allowAdvancedTools: false,
    allowWhiteLabel: false,
    teamMembersLimit: 1,
  },
  PRO: {
    id: 'PRO',
    name: 'LeadGuard Pro Growth',
    priceINR: 4999,
    monthlyScans: 50,
    maxWatchdogTargets: 5,
    allowExports: true,
    allowAdvancedTools: true,
    allowWhiteLabel: false,
    teamMembersLimit: 3,
  },
  AGENCY: {
    id: 'AGENCY',
    name: 'LeadGuard Agency Unlimited',
    priceINR: 14999,
    monthlyScans: 9999,
    maxWatchdogTargets: 25,
    allowExports: true,
    allowAdvancedTools: true,
    allowWhiteLabel: true,
    teamMembersLimit: 10,
  },
};
