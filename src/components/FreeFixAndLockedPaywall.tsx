import React, { useState } from 'react';
import { AuditResult, AuditIssue } from '../types';
import { Lock, Unlock, Copy, Check, ShieldAlert, Sparkles, Zap, Wrench, ArrowRight, Eye, ShieldCheck } from 'lucide-react';
import confetti from 'canvas-confetti';

interface FreeFixAndLockedPaywallProps {
  result: AuditResult;
  onOpenWatchdog: () => void;
  onOpenExpressFix: () => void;
}

export const FreeFixAndLockedPaywall: React.FC<FreeFixAndLockedPaywallProps> = ({
  result,
  onOpenWatchdog,
  onOpenExpressFix,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [unlockedState, setUnlockedState] = useState(false);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleSimulatedPayment = () => {
    setUnlockedState(true);
    confetti({
      particleCount: 70,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  const freeIssue = result.freeIssue;
  const lockedIssues = result.allIssues.filter((i) => i.id !== freeIssue?.id);

  if (result.allIssues.length === 0) {
    return (
      <div className="rounded-3xl border border-emerald-500/30 bg-emerald-950/20 p-8 text-center shadow-xl space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
          <ShieldCheck className="h-8 w-8" />
        </div>
        <h3 className="text-2xl font-bold text-white">No Critical Leakage Detected!</h3>
        <p className="text-sm text-slate-300 max-w-lg mx-auto">
          Congratulations! <span className="font-semibold text-emerald-400">{result.domain}</span> has proper WhatsApp formatting, 
          active ad tracking tags, and zero SEO penalties.
        </p>
        <div className="pt-2">
          <button
            onClick={onOpenWatchdog}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-5 py-2.5 text-xs font-bold transition-all shadow-lg shadow-emerald-500/20"
          >
            <ShieldAlert className="h-4 w-4" />
            Enable 24/7 Watchdog to Prevent Future Drops (Free)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 text-xs font-bold">
              100% FREE FORENSIC FIX
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">Step-by-Step Resolution Engine</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            We provide the 1st critical solution completely free. Fix this leak immediately to recover lost inquiries.
          </p>
        </div>

        {!unlockedState && lockedIssues.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full font-semibold">
            <Lock className="h-3 w-3" />
            {lockedIssues.length} Additional Critical Leaks Locked
          </div>
        )}
      </div>

      {/* 1. FREE UNLOCKED ISSUE CARD */}
      {freeIssue && (
        <div className="rounded-3xl border-2 border-emerald-500/50 bg-slate-900/90 p-6 md:p-8 shadow-2xl space-y-5">
          
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/30">
                <Unlock className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold font-mono text-emerald-400 uppercase tracking-widest">
                  Unlocked Free Resolution • Insight #1
                </span>
                <h3 className="text-lg font-black text-white">{freeIssue.title}</h3>
              </div>
            </div>

            <span className={`rounded-md px-3 py-1 text-xs font-extrabold uppercase tracking-wider ${
              freeIssue.severity === 'CRITICAL' 
                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                : freeIssue.severity === 'HIGH'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
            }`}>
              {freeIssue.severity === 'LOW' ? 'CONVERSION TIP' : `${freeIssue.severity} SEVERITY`}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="rounded-xl bg-slate-950 p-4 border border-slate-800 space-y-2">
              <span className="font-extrabold text-slate-400 uppercase tracking-wider text-[10px]">
                {freeIssue.severity === 'LOW' ? 'Diagnostic Insight:' : 'What is Broken:'}
              </span>
              <p className="text-slate-200 leading-relaxed">{freeIssue.description}</p>
            </div>

            <div className={`rounded-xl p-4 border space-y-2 ${
              freeIssue.severity === 'LOW' 
                ? 'bg-emerald-950/20 border-emerald-900/30 text-emerald-200' 
                : 'bg-red-950/20 border-red-900/30 text-red-200'
            }`}>
              <span className={`font-extrabold uppercase tracking-wider text-[10px] ${
                freeIssue.severity === 'LOW' ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {freeIssue.severity === 'LOW' ? 'Conversion Opportunity:' : 'Financial Damage:'}
              </span>
              <p className="leading-relaxed">{freeIssue.impact}</p>
            </div>
          </div>

          {/* Code Fix Snippet */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-emerald-400 font-bold flex items-center gap-2">
                <Wrench className="h-3.5 w-3.5" />
                Copy-Paste Fix Snippet (HTML/URL):
              </span>
              <button
                id={`copy-fix-${freeIssue.id}`}
                onClick={() => handleCopy(freeIssue.id, freeIssue.fixSnippet)}
                className="flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1 text-xs font-bold uppercase tracking-wider font-mono transition-all border border-slate-700"
              >
                {copiedId === freeIssue.id ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Fix</span>
                  </>
                )}
              </button>
            </div>
            <pre className="overflow-x-auto rounded-xl bg-slate-900 p-3 text-xs font-mono text-emerald-300 border border-slate-800">
              <code>{freeIssue.fixSnippet}</code>
            </pre>
          </div>

        </div>
      )}

      {/* 2. BLURRED / LOCKED ISSUES (PSYCHOLOGICAL PAYWALL) */}
      {lockedIssues.length > 0 && (
        <div className="relative rounded-3xl border border-slate-800 bg-slate-950 p-6 md:p-8 overflow-hidden shadow-2xl">
          
          {/* Top banner */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Lock className="h-4 w-4 text-amber-400" />
                Remaining High-Priority Vulnerabilities ({lockedIssues.length})
              </h3>
              <p className="text-xs text-slate-400">
                Additional silent conversion blocks detected on this domain.
              </p>
            </div>
          </div>

          {/* Blurred Cards Container */}
          <div className={`space-y-4 ${!unlockedState ? 'select-none' : ''}`}>
            {lockedIssues.map((issue, idx) => (
              <div
                key={issue.id}
                className={`relative rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition-all ${
                  !unlockedState ? 'filter blur-[3.5px] opacity-75' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-300 font-mono text-xs font-bold">
                      #{idx + 2}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{issue.title}</h4>
                      <span className="text-[11px] text-slate-400">Category: {issue.category.toUpperCase()}</span>
                    </div>
                  </div>
                  <span className="rounded-md bg-red-500/10 text-red-400 border border-red-500/30 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider">
                    {issue.severity}
                  </span>
                </div>

                <div className="mt-3 text-xs text-slate-300 space-y-2">
                  <p>{issue.description}</p>
                  <div className="rounded-lg bg-slate-950 p-3 font-mono text-[11px] text-emerald-400 border border-slate-800">
                    Fix: {issue.fixSnippet}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Paywall Overlay Banner (When locked) */}
          {!unlockedState && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-[3px] p-6 text-center">
              
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-xl mb-4">
                <Lock className="h-7 w-7" />
              </div>

              <h4 className="text-xl sm:text-2xl font-black text-white">
                Unlock {lockedIssues.length} More Hidden Revenue Leaks
              </h4>
              <p className="text-xs sm:text-sm text-slate-300 max-w-md mt-2">
                Gain full forensic code snippets, Meta Pixel payload fixes, and instant resolution steps.
              </p>

              {/* 3 Unlock Pathways */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl text-left">
                
                {/* Option 1: Instant Micro-Unlock */}
                <button
                  id="unlock-micro-pay"
                  onClick={handleSimulatedPayment}
                  className="rounded-2xl border-2 border-amber-500/60 bg-amber-950/30 hover:bg-amber-900/40 p-4 transition-all flex flex-col justify-between group active:scale-95 shadow-lg shadow-amber-500/10"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
                        Instant Report
                      </span>
                      <Zap className="h-4 w-4 text-amber-400" />
                    </div>
                    <div className="mt-2 text-2xl font-black text-white">₹49</div>
                    <p className="text-[11px] text-slate-300 mt-1">Unlock all {lockedIssues.length} code fixes & raw forensic report.</p>
                  </div>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-amber-400 group-hover:translate-x-1 transition-transform">
                    Unlock Now <ArrowRight className="h-3 w-3" />
                  </span>
                </button>

                {/* Option 2: 24-Hour Watchdog Free */}
                <button
                  id="unlock-watchdog"
                  onClick={onOpenWatchdog}
                  className="rounded-2xl border border-slate-700 bg-slate-900/80 hover:bg-slate-800 p-4 transition-all flex flex-col justify-between group active:scale-95"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-300">
                        Continuous Radar
                      </span>
                      <ShieldAlert className="h-4 w-4 text-slate-300" />
                    </div>
                    <div className="mt-2 text-2xl font-black text-white">FREE TRIAL</div>
                    <p className="text-[11px] text-slate-300 mt-1">Enable 24h WhatsApp & Review uptime alerts.</p>
                  </div>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-300 group-hover:translate-x-1 transition-transform">
                    Activate Free <ArrowRight className="h-3 w-3" />
                  </span>
                </button>

                {/* Option 3: Done-For-You Express Fix */}
                <button
                  id="unlock-express-fix"
                  onClick={onOpenExpressFix}
                  className="rounded-2xl border border-red-700/60 bg-red-950/40 hover:bg-red-900/50 p-4 transition-all flex flex-col justify-between group active:scale-95"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-400">
                        Expert Fix (15m)
                      </span>
                      <Wrench className="h-4 w-4 text-red-400" />
                    </div>
                    <div className="mt-2 text-2xl font-black text-white">₹2,999</div>
                    <p className="text-[11px] text-slate-300 mt-1">Our certified engineer fixes all links on your site today.</p>
                  </div>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-red-400 group-hover:translate-x-1 transition-transform">
                    Book Fixer <ArrowRight className="h-3 w-3" />
                  </span>
                </button>

              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
};
