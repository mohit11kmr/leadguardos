import { APP_CONFIG } from '../config/appConfig';
import { AuditResult, AuditIssue } from '../types';

export interface RevenueModelAssumptions {
  monthlyVisitors: number;
  ctaClickRatePercent: number;
  leadConversionRatePercent: number;
  avgCustomerValueINR: number;
  monthlyAdSpendINR?: number;
}

export interface RevenueLossEstimate {
  estimatedMonthlyLossINR: number;
  breakdown: {
    whatsappLossINR: number;
    phoneLossINR: number;
    pixelAdWasteINR: number;
    seoDeindexLossINR: number;
    ecommerceCartLossINR: number;
    otherLossINR: number;
  };
  assumptions: RevenueModelAssumptions;
  formulaDescription: string;
  affectedVisitorsCount: number;
  lostCustomersCount: number;
  disclaimer: string;
}

export function calculateRevenueImpact(
  result: Partial<AuditResult>,
  customAssumptions?: Partial<RevenueModelAssumptions>
): RevenueLossEstimate {
  const assumptions: RevenueModelAssumptions = {
    monthlyVisitors: customAssumptions?.monthlyVisitors ?? APP_CONFIG.revenueModelDefaults.monthlyVisitors,
    ctaClickRatePercent: customAssumptions?.ctaClickRatePercent ?? APP_CONFIG.revenueModelDefaults.ctaClickRatePercent,
    leadConversionRatePercent: customAssumptions?.leadConversionRatePercent ?? APP_CONFIG.revenueModelDefaults.leadConversionRatePercent,
    avgCustomerValueINR: customAssumptions?.avgCustomerValueINR ?? APP_CONFIG.revenueModelDefaults.avgCustomerValueINR,
    monthlyAdSpendINR: customAssumptions?.monthlyAdSpendINR ?? 25000,
  };

  const totalCtaClickers = (assumptions.monthlyVisitors * assumptions.ctaClickRatePercent) / 100;
  const leadConvRate = assumptions.leadConversionRatePercent / 100;
  const leadValue = assumptions.avgCustomerValueINR;

  let whatsappLossINR = 0;
  let phoneLossINR = 0;
  let pixelAdWasteINR = 0;
  let seoDeindexLossINR = 0;
  let ecommerceCartLossINR = 0;
  let otherLossINR = 0;

  const issues: AuditIssue[] = result.allIssues || [];
  const waIssues = issues.filter(i => i.category === 'whatsapp' && i.severity === 'CRITICAL');
  const hasBrokenWhatsApp = (result.whatsappLinks?.some(w => !w.isValid) || waIssues.length > 0);
  const hasBrokenPhone = result.phoneLinks?.some(p => !p.isValid);
  const hasMissingPixel = result.metaPixel?.status === 'MISSING' || issues.some(i => i.category === 'pixel');
  const hasNoIndex = result.seoPenalty?.hasNoIndex || issues.some(i => i.category === 'seo' && i.ruleId === 'SEO-NOINDEX-001');
  const hasBrokenCart = result.ecommerce?.checkoutStatus === 'CRITICAL_LEAK' || issues.some(i => i.category === 'ecommerce');

  let totalAffectedVisitors = 0;

  if (hasBrokenWhatsApp) {
    // 65% of mobile inquiries in India go to WhatsApp
    const affectedWaClickers = totalCtaClickers * APP_CONFIG.revenueModelDefaults.channelWeights.whatsapp;
    totalAffectedVisitors += affectedWaClickers;
    whatsappLossINR = Math.round(affectedWaClickers * leadConvRate * leadValue);
  }

  if (hasBrokenPhone) {
    // 25% of mobile inquiries go to click-to-call
    const affectedPhoneClickers = totalCtaClickers * APP_CONFIG.revenueModelDefaults.channelWeights.phone;
    totalAffectedVisitors += affectedPhoneClickers;
    phoneLossINR = Math.round(affectedPhoneClickers * leadConvRate * leadValue);
  }

  if (hasMissingPixel) {
    // 30% of paid ad budget is burned due to zero conversion attribution and algorithmic blindness
    pixelAdWasteINR = Math.round((assumptions.monthlyAdSpendINR || 25000) * APP_CONFIG.revenueModelDefaults.adSpendWastageMultiplier);
  }

  if (hasNoIndex) {
    // Complete loss of organic search discovery (estimated equivalent to 40% of baseline traffic)
    const lostOrganicVisitors = assumptions.monthlyVisitors * 0.40;
    const lostOrganicLeads = lostOrganicVisitors * (assumptions.ctaClickRatePercent / 100) * leadConvRate;
    seoDeindexLossINR = Math.round(lostOrganicLeads * leadValue);
  }

  if (hasBrokenCart) {
    // Cart abandonment on dead buttons
    const cartClickers = assumptions.monthlyVisitors * 0.05; // 5% visit cart
    ecommerceCartLossINR = Math.round(cartClickers * 0.20 * leadValue);
  }

  // Cap max and round
  const estimatedMonthlyLossINR = whatsappLossINR + phoneLossINR + pixelAdWasteINR + seoDeindexLossINR + ecommerceCartLossINR + otherLossINR;
  const lostCustomersCount = Math.round((whatsappLossINR + phoneLossINR + seoDeindexLossINR + ecommerceCartLossINR) / (leadValue || 1));

  return {
    estimatedMonthlyLossINR,
    breakdown: {
      whatsappLossINR,
      phoneLossINR,
      pixelAdWasteINR,
      seoDeindexLossINR,
      ecommerceCartLossINR,
      otherLossINR,
    },
    assumptions,
    formulaDescription: `Potential Loss = (Affected Visitors × ${assumptions.ctaClickRatePercent}% CTA Click Rate × ${assumptions.leadConversionRatePercent}% Lead Conv Rate × ₹${leadValue.toLocaleString('en-IN')}) + Ad Spend Waste`,
    affectedVisitorsCount: Math.round(totalAffectedVisitors),
    lostCustomersCount,
    disclaimer: 'This figure is a modeled potential revenue impact estimate based on standard conversion funnels and user-configurable assumptions, not verified accounting data.',
  };
}
