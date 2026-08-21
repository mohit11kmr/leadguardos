import React, { useState } from 'react';
import { Zap, Shield, Check, Star, ArrowRight, Sparkles, Building2, UserCheck, Wrench, ShieldAlert } from 'lucide-react';
import confetti from 'canvas-confetti';

interface MonetizationVaultProps {
  onOpenWatchdog: () => void;
  onOpenExpressFix: () => void;
}

export const MonetizationVault: React.FC<MonetizationVaultProps> = ({
  onOpenWatchdog,
  onOpenExpressFix,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handleSimulatePurchase = (planName: string) => {
    setSelectedPlan(planName);
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 md:p-8 shadow-xl text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-red-400 mb-3">
          <Zap className="h-3.5 w-3.5 text-red-400" />
          <span>3-Tier Revenue Engine Architecture</span>
        </div>
        <h2 className="text-3xl font-black text-white tracking-tight">
          Monetization & SaaS Pricing Vault
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
          From micro-transactions to high-ticket agency subscriptions — scale with our battle-tested ₹0-cost stack.
        </p>
      </div>

      {/* 3 Tier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        
        {/* TIER 1: Audit & Express Fix */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 md:p-8 flex flex-col justify-between shadow-xl relative">
          <div>
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-slate-800 border border-slate-700 px-3 py-0.5 text-[10px] font-bold text-slate-300">
                TIER 1 • ONE-TIME
              </span>
              <Wrench className="h-5 w-5 text-rose-400" />
            </div>

            <h3 className="text-xl font-bold text-white mt-4">Audit & Express Fix</h3>
            <p className="text-xs text-slate-400 mt-1">Instant report or 15-min done-for-you link fix.</p>

            <div className="my-6">
              <div className="text-3xl font-extrabold text-white">₹49 – ₹2,999</div>
              <span className="text-[11px] text-slate-400">One-time payment • No subscription</span>
            </div>

            <ul className="text-xs text-slate-300 space-y-2.5 pt-4 border-t border-slate-800">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>₹49 Instant Forensic PDF Audit Unlock</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>₹2,999 Done-For-You 15-min Tech Fix</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>WhatsApp +9191 & dialer error correction</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Meta Pixel & GA4 conversion tags install</span>
              </li>
            </ul>
          </div>

          <button
            onClick={onOpenExpressFix}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 text-xs transition-all border border-slate-700 active:scale-95"
          >
            <span>Book Express Fix (₹2,999)</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* TIER 2: 24/7 Watchdog SaaS (Highlighted) */}
        <div className="rounded-3xl border-2 border-emerald-500 bg-gradient-to-b from-slate-900 via-slate-900 to-emerald-950/30 p-6 md:p-8 flex flex-col justify-between shadow-2xl relative">
          
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-4 py-1 text-[11px] font-extrabold text-slate-950 shadow-md">
            MOST POPULAR • RECURRING
          </div>

          <div>
            <div className="flex items-center justify-between mt-1">
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-0.5 text-[10px] font-bold text-emerald-400">
                TIER 2 • CONTINUOUS SAAS
              </span>
              <ShieldAlert className="h-5 w-5 text-emerald-400" />
            </div>

            <h3 className="text-xl font-bold text-white mt-4">24/7 Watchdog Radar</h3>
            <p className="text-xs text-slate-400 mt-1">Automated hourly link monitoring & alerts.</p>

            <div className="my-6">
              <div className="text-4xl font-extrabold text-white">₹499<span className="text-sm text-slate-400 font-normal">/month</span></div>
              <span className="text-[11px] text-emerald-400 font-semibold">Includes 24-Hour Free Trial</span>
            </div>

            <ul className="text-xs text-slate-300 space-y-2.5 pt-4 border-t border-slate-800">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Hourly daemon pinging all contact links</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Instant Telegram / WhatsApp outage alerts</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Meta Pixel & ad script drop detector</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Smart WhatsApp Floating Widget license</span>
              </li>
            </ul>
          </div>

          <button
            onClick={onOpenWatchdog}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 text-xs transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            <span>Activate 24h Free Trial</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* TIER 3: Agency & White-label */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 md:p-8 flex flex-col justify-between shadow-xl relative">
          <div>
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-slate-800 border border-slate-700 px-3 py-0.5 text-[10px] font-bold text-cyan-400">
                TIER 3 • AGENCY PRO
              </span>
              <Building2 className="h-5 w-5 text-cyan-400" />
            </div>

            <h3 className="text-xl font-bold text-white mt-4">Agency White-Label</h3>
            <p className="text-xs text-slate-400 mt-1">For freelancers & marketing agencies.</p>

            <div className="my-6">
              <div className="text-3xl font-extrabold text-white">₹1,999<span className="text-sm text-slate-400 font-normal">/month</span></div>
              <span className="text-[11px] text-slate-400">Unlimited client websites</span>
            </div>

            <ul className="text-xs text-slate-300 space-y-2.5 pt-4 border-t border-slate-800">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-cyan-400 shrink-0" />
                <span>Unlimited Domain Scans & Forensic PDF Exports</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-cyan-400 shrink-0" />
                <span>Custom Agency Logo & Branding on PDF Reports</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-cyan-400 shrink-0" />
                <span>AI Cold Pitch Generator & Lead Pipeline</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-cyan-400 shrink-0" />
                <span>Resell DFY fixes to local clients at 100% margin</span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => handleSimulatePurchase('Agency White-Label Plan')}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-400 hover:to-teal-500 text-slate-950 font-bold py-3 text-xs transition-all shadow-lg shadow-cyan-500/20 active:scale-95"
          >
            <span>{selectedPlan ? 'Agency License Active ✓' : 'Subscribe to Agency Pro'}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

      </div>

    </div>
  );
};
