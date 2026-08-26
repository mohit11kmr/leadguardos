/**
 * LeadGuard OS — Centralized Application & Diagnostic Configuration
 * Defines scoring formulas, weights, tier pricing, timeouts, and default assumptions.
 */

export const APP_CONFIG = {
  appName: 'LeadGuard OS',
  version: '2.4.0-production',
  founder: {
    name: 'Mohit Sikarwar',
    phone: '+91 83070 70605',
    phoneRaw: '918307070605',
    email: 'mohitsikarwar123@gmail.com',
    supportEmail: 'support@leadguard.ai',
  },
  
  // 4-Pillar Score Weights (Sum to 1.00)
  pillarWeights: {
    lead: 0.35,  // 35% - Lead Guardian (WhatsApp, Phone, Email, Reviews)
    ad: 0.20,    // 20% - AdShield (Meta Pixel, GA4, GTM)
    seo: 0.20,   // 20% - SEO & Penalty Shield (Robots noindex, Canonical, SSL)
    cyber: 0.25, // 25% - Cyber & Hack Shield (Spam keywords, Obfuscation, Iframes)
  },

  // Scoring Severities
  scorePenalties: {
    critical: 35,
    high: 20,
    medium: 10,
    low: 3,
  },

  // Transparent Revenue Impact Default Assumptions
  revenueModelDefaults: {
    monthlyVisitors: 5000,
    ctaClickRatePercent: 4.5,       // % of visitors clicking on contact CTAs
    leadConversionRatePercent: 8.0, // % of CTA clickers that become paying customers
    avgCustomerValueINR: 4500,      // Average transaction / lifetime value per customer (INR)
    channelWeights: {
      whatsapp: 0.65, // 65% of mobile inquiries go through WhatsApp in India
      phone: 0.25,    // 25% through direct click-to-call
      email: 0.10,    // 10% through email/form
    },
    adSpendWastageMultiplier: 0.30, // 30% of ad spend is wasted if Meta Pixel / attribution is missing
  },

  // Production Pricing Stack (INR)
  pricing: {
    oneTimeServices: [
      {
        id: 'tier-audit',
        name: 'Quick Diagnostic Audit',
        priceINR: 2999,
        originalPriceINR: 5999,
        features: ['Full 4-Pillar Forensic Scan', 'Unlocked Code Snippets', 'Branded Executive PDF', 'Email Delivery'],
        badge: 'Popular for DIY',
      },
      {
        id: 'tier-express-fix',
        name: 'Audit + Express Fix (48h)',
        priceINR: 4999,
        originalPriceINR: 9999,
        features: ['Everything in Quick Audit', 'DFY WhatsApp + Pixel Fix', '48-Hour Live Deployment', 'Dedicated LeadGuard Engineer', 'Zero-Downtime Guarantee'],
        badge: 'Most Recommended',
        isBestValue: true,
      },
      {
        id: 'tier-full-stack',
        name: 'Audit + Fix + 30-Day Shield',
        priceINR: 6999,
        originalPriceINR: 14999,
        features: ['Full Audit & DFY Repairs', '30-Day 24/7 Watchdog Radar', 'Instant Telegram/WhatsApp Alerts', 'Weekly Conversion Health Reports', 'Priority Phone Support'],
        badge: 'Complete Peace of Mind',
      },
    ],
    saasPlans: [
      {
        id: 'saas-starter',
        name: 'Starter Single Site',
        priceMonthlyINR: 99,
        billing: 'monthly',
        sitesLimit: 1,
        frequency: 'Daily (24h)',
        features: ['1 Monitored Website', 'Daily WhatsApp/Pixel Pings', 'Email & Telegram Alerts', 'Public Status Badge'],
      },
      {
        id: 'saas-pro',
        name: 'Pro 5-Site Shield',
        priceMonthlyINR: 299,
        billing: 'monthly',
        sitesLimit: 5,
        frequency: 'Hourly',
        features: ['Up to 5 Websites', 'Hourly Heartbeat Radar', 'Instant WhatsApp Alerts', 'Competitor Radar (3 sites)', 'Webhook Integration'],
        isPopular: true,
      },
      {
        id: 'saas-agency',
        name: 'Agency 25 Sites',
        priceMonthlyINR: 999,
        billing: 'monthly',
        sitesLimit: 25,
        frequency: 'Every 15 min',
        features: ['Up to 25 Websites', '15-min Critical Probes', 'White-Label PDF Reports', 'Multi-channel Webhooks', 'Batch Prospect Hunter'],
      },
    ],
  },

  // Scanner Network Rules
  scanner: {
    timeoutMs: 15000,
    maxResponseSizeBytes: 5 * 1024 * 1024, // 5MB
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 LeadGuard-Auditor/2.4',
    maxBatchLimit: 500,
  },
};
