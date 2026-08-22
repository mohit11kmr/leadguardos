import React, { useState, useEffect } from 'react';
import { Zap, Check, Shield, ArrowRight, CreditCard, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface BillingViewProps {
  onOpenExpressFix: () => void;
}

export const BillingView: React.FC<BillingViewProps> = ({ onOpenExpressFix }) => {
  const { user, profile } = useAuth();
  const [entitlements, setEntitlements] = useState<any>(null);

  useEffect(() => {
    fetch('/api/entitlements')
      .then(res => res.json())
      .then(data => setEntitlements(data))
      .catch(err => console.error('Entitlements fetch error:', err));
  }, []);

  const plan = entitlements?.plan || profile?.role || 'FREE';
  const usage = entitlements?.usage || { scansThisMonth: 1, watchdogTargetsCount: 1 };
  const limits = entitlements?.limits || { monthlyScans: 5, maxWatchdogTargets: 1 };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      
      {/* Header */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 md:p-8 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-5">
          <div>
            <span className="text-[10px] font-extrabold text-rose-400 uppercase tracking-widest">Billing & Subscription Management</span>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">Plan Usage & Invoices</h2>
            <p className="text-xs text-slate-400 mt-1">Manage subscription plan, monthly scan entitlements, and payment receipts.</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase">
              CURRENT PLAN: {plan}
            </span>
          </div>
        </div>

        {/* Usage Progress Meters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-3">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-300">Monthly Scans</span>
              <span className="font-mono text-rose-400 font-bold">{usage.scansThisMonth} / {limits.monthlyScans}</span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
              <div
                className="h-full bg-rose-500 transition-all duration-500"
                style={{ width: `${Math.min(100, (usage.scansThisMonth / limits.monthlyScans) * 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400">Resets on the 1st of next month</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-3">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-300">Active Watchdog Targets</span>
              <span className="font-mono text-emerald-400 font-bold">{usage.watchdogTargetsCount} / {limits.maxWatchdogTargets}</span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${Math.min(100, (usage.watchdogTargetsCount / limits.maxWatchdogTargets) * 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400">24/7 continuous monitoring slots</p>
          </div>

        </div>
      </div>

      {/* Upgrade Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Free Card */}
        <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase">Starter</span>
            <h3 className="text-lg font-bold text-white">Free Starter</h3>
            <div className="text-2xl font-black text-white font-mono">₹0 <span className="text-xs text-slate-500 font-normal">/mo</span></div>
            <ul className="text-xs text-slate-300 space-y-2 pt-2">
              <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-400" /> 5 Scans per month</li>
              <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-400" /> 1 Watchdog Target</li>
              <li className="flex items-center gap-2 text-slate-500"><Check className="h-3.5 w-3.5 text-slate-600" /> PDF Report Exports</li>
            </ul>
          </div>
          <button disabled className="w-full py-2.5 rounded-xl bg-slate-900 text-slate-400 text-xs font-bold border border-slate-800">
            {plan === 'FREE' ? 'Current Plan' : 'Free Tier'}
          </button>
        </div>

        {/* Pro Card */}
        <div className="rounded-3xl border border-rose-500/40 bg-gradient-to-b from-rose-950/30 to-slate-950 p-6 space-y-4 flex flex-col justify-between shadow-xl relative overflow-hidden">
          <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[9px] font-extrabold border border-rose-500/30 uppercase">
            POPULAR
          </div>
          <div className="space-y-2">
            <span className="text-xs font-bold text-rose-400 uppercase">Pro Growth</span>
            <h3 className="text-lg font-bold text-white">Pro Shield</h3>
            <div className="text-2xl font-black text-white font-mono">₹4,999 <span className="text-xs text-slate-500 font-normal">/mo</span></div>
            <ul className="text-xs text-slate-200 space-y-2 pt-2">
              <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-400" /> 50 Scans per month</li>
              <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-400" /> 5 Watchdog Targets</li>
              <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-400" /> PDF / CSV Report Exports</li>
              <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-400" /> Advanced Tools Access</li>
            </ul>
          </div>
          <button
            onClick={onOpenExpressFix}
            className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg transition-all"
          >
            Upgrade to Pro
          </button>
        </div>

        {/* Agency Card */}
        <div className="rounded-3xl border border-indigo-500/40 bg-gradient-to-b from-indigo-950/30 to-slate-950 p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <span className="text-xs font-bold text-indigo-400 uppercase">Unlimited</span>
            <h3 className="text-lg font-bold text-white">Agency Studio</h3>
            <div className="text-2xl font-black text-white font-mono">₹14,999 <span className="text-xs text-slate-500 font-normal">/mo</span></div>
            <ul className="text-xs text-slate-200 space-y-2 pt-2">
              <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-400" /> Unlimited Scans</li>
              <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-400" /> 25 Watchdog Targets</li>
              <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-400" /> White-Label PDF Branding</li>
              <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-400" /> Master API Key Access</li>
            </ul>
          </div>
          <button
            onClick={onOpenExpressFix}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg transition-all"
          >
            Get Agency Studio
          </button>
        </div>

      </div>

    </div>
  );
};
