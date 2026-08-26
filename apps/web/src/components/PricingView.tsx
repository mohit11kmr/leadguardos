import React, { useState } from 'react';
import { PageHeader } from './common/PageHeader';
import { Check, Zap, Shield, Radio, Briefcase, ArrowRight, Star, Sparkles, HelpCircle, Lock, ShieldCheck } from 'lucide-react';
import { openRazorpayCheckout } from '../utils/razorpayCheckout';
import confetti from 'canvas-confetti';

interface PricingViewProps {
  onOpenExpressFix: () => void;
  onOpenWatchdog: () => void;
}

export const PricingView: React.FC<PricingViewProps> = ({
  onOpenExpressFix,
  onOpenWatchdog,
}) => {
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const plans = [
    {
      id: 'free_audit',
      name: 'Free Diagnostic Audit',
      badge: 'Zero Friction',
      badgeVariant: 'slate' as const,
      price: '₹0',
      period: 'forever',
      description: 'Find out exactly what is broken on your website in under 30 seconds.',
      features: [
        'Full 4-Pillar Website Scan',
        'WhatsApp +9191 bug detection',
        'Click-to-call dialer verification',
        'Meta Pixel & GA4 attribution check',
        'Search engine indexing verification',
        'Estimated monthly revenue loss model',
      ],
      cta: 'Run Free Audit',
      popular: false,
      onAction: () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
    },
    {
      id: 'express_fix',
      name: 'Express 48h DFY Fix',
      badge: 'Most Popular for SMBs',
      badgeVariant: 'rose' as const,
      price: '₹2,999',
      period: 'one-time',
      description: 'Done-for-you technical repair by an expert engineer within 48 hours.',
      features: [
        'Everything in Free Audit',
        'Complete WhatsApp routing repair',
        'Click-to-call link fixes across all pages',
        'Meta Pixel & GA4 script installation',
        'Robots.txt & canonical tag correction',
        'Post-fix re-audit certificate',
        'Direct WhatsApp support from engineer',
      ],
      cta: 'Book 48h Fix (₹2,999)',
      popular: true,
      onAction: onOpenExpressFix,
    },
    {
      id: 'watchdog_monthly',
      name: '24/7 Watchdog Shield',
      badge: 'Continuous Protection',
      badgeVariant: 'emerald' as const,
      price: '₹299',
      period: 'per month',
      description: 'Continuous monitoring against silent breaks after plugin or theme updates.',
      features: [
        'Automated health check every 15 minutes',
        'Instant Telegram & WhatsApp failure alerts',
        'Lead channel uptime history log',
        'Meta Pixel drop detection',
        'Monthly PDF executive health report',
        'Cancel anytime with 1 click',
      ],
      cta: 'Activate Watchdog (₹299/mo)',
      popular: false,
      onAction: onOpenWatchdog,
    },
    {
      id: 'agency_pro',
      name: 'Agency Growth Suite',
      badge: 'For Agencies & Consultants',
      badgeVariant: 'cyan' as const,
      price: '₹4,999',
      period: 'per month',
      description: 'Scale client acquisition with white-label audits and batch prospect hunting.',
      features: [
        'Unlimited White-Label PDF Audits',
        'Custom Agency Logo & Brand Colors',
        'Batch Lead Hunter (scan 500 sites at once)',
        'Hinglish / English AI Cold Pitch Generator',
        'Client Workspace & multi-target monitoring',
        'REST API Keys & Webhook integrations',
      ],
      cta: 'Get Agency License',
      popular: false,
      onAction: onOpenExpressFix,
    },
  ];

  return (
    <div className="space-y-10 max-w-7xl mx-auto">
      {/* Page Header */}
      <PageHeader
        title="Simple, Outcome-Based Pricing"
        subtitle="Zero hidden fees. Whether you need a free diagnostic, a 48-hour done-for-you fix, or continuous 24/7 lead protection, choose the outcome you need."
        badge="Transparent Pricing"
        badgeVariant="amber"
      />

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => {
          return (
            <div
              key={plan.id}
              className={`rounded-3xl border p-6 flex flex-col justify-between space-y-6 transition-all backdrop-blur-xl relative ${
                plan.popular
                  ? 'border-rose-500/50 bg-slate-900/90 shadow-2xl shadow-rose-950/40 ring-1 ring-rose-500/30'
                  : 'border-slate-800/80 bg-slate-900/50 hover:border-slate-700/80'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-rose-600 to-rose-700 text-white text-[11px] font-bold uppercase tracking-wider shadow-md">
                  Most Popular
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    {plan.name}
                  </h3>
                  <p className="text-xs text-slate-400 min-h-[36px]">
                    {plan.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800/80">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white font-mono tracking-tight">
                      {plan.price}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      / {plan.period}
                    </span>
                  </div>
                </div>

                {/* Feature Checklist */}
                <div className="space-y-2.5 pt-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    What's included:
                  </span>
                  {plan.features.map((f, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                      <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="leading-snug">{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action CTA */}
              <button
                onClick={plan.onAction}
                className={`w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 active:scale-95 shadow-md ${
                  plan.popular
                    ? 'bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white shadow-rose-950/50'
                    : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                }`}
              >
                <span>{plan.cta}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Guarantee Banner */}
      <div className="rounded-3xl border border-slate-800/80 bg-slate-900/40 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-bold text-white">
              100% Satisfaction & Verified Lead Protection
            </h4>
            <p className="text-xs sm:text-sm text-slate-400">
              All DFY fixes are tested across real iOS, Android, and desktop WhatsApp Web environments before handover.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
