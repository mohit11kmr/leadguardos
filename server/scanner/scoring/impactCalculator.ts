import { StandardFinding, RevenueImpactEstimate } from '../core/types';

export class ImpactCalculator {
  public static calculateImpact(findings: StandardFinding[]): RevenueImpactEstimate {
    const hasBrokenWa = findings.some(f => f.category === 'whatsapp' && f.severity === 'CRITICAL');
    const hasMissingWa = findings.some(f => f.category === 'whatsapp' && f.id === 'wa_missing_widget');
    const hasMissingPixel = findings.some(f => f.category === 'pixel');
    const hasNoIndex = findings.some(f => f.category === 'seo' && f.severity === 'CRITICAL');

    // Assumptions
    const monthlyVisitors = 1500;
    const ctaClickRatePercent = 4.0; // 4% click CTA
    const leadConversionRatePercent = 25.0; // 25% close rate
    const avgCustomerValueINR = 3500; // ₹3,500 average deal value
    const monthlyAdSpendINR = 25000; // ₹25,000 baseline ad budget

    let whatsappLossINR = 0;
    if (hasBrokenWa) {
      // 1500 visitors * 4% clicks * 60% wa share * 25% close * ₹3500
      whatsappLossINR = Math.round(monthlyVisitors * 0.04 * 0.60 * 0.25 * avgCustomerValueINR); // ~₹31,500
    } else if (hasMissingWa) {
      whatsappLossINR = Math.round(monthlyVisitors * 0.04 * 0.20 * 0.25 * avgCustomerValueINR); // ~₹10,500
    }

    let pixelAdWasteINR = 0;
    if (hasMissingPixel) {
      // 30% waste on un-optimized ad spend
      pixelAdWasteINR = Math.round(monthlyAdSpendINR * 0.30); // ₹7,500
    }

    let seoDeindexLossINR = 0;
    if (hasNoIndex) {
      seoDeindexLossINR = 18000;
    }

    const totalEstimatedLossINR = whatsappLossINR + pixelAdWasteINR + seoDeindexLossINR;

    const lowEstimateINR = Math.round(totalEstimatedLossINR * 0.7);
    const highEstimateINR = Math.round(totalEstimatedLossINR * 1.3);

    return {
      estimatedMonthlyLossINR: totalEstimatedLossINR,
      lowEstimateINR,
      highEstimateINR,
      breakdown: {
        whatsappLossINR,
        phoneLossINR: 0,
        pixelAdWasteINR,
        seoDeindexLossINR,
        ecommerceCartLossINR: 0,
        otherLossINR: 0,
      },
      assumptions: {
        monthlyVisitors,
        ctaClickRatePercent,
        leadConversionRatePercent,
        avgCustomerValueINR,
        monthlyAdSpendINR,
      },
      confidence: 'MEDIUM',
      formulaDescription: `Calculated from range estimation model based on baseline assumptions (~${monthlyVisitors} visitors/month, ₹${avgCustomerValueINR} avg customer value).`,
      disclaimer: 'Estimated potential impact based on stated model assumptions, not a guaranteed financial audit statement.',
    };
  }
}
