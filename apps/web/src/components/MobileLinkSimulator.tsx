import React, { useState } from 'react';
import { Smartphone, AlertTriangle, CheckCircle2, MessageCircle, Phone, ArrowRight, XCircle, Sparkles } from 'lucide-react';

interface MobileLinkSimulatorProps {
  domain?: string;
  whatsappStatus?: 'BROKEN' | 'WORKING' | 'MISSING';
  phoneStatus?: 'WORKING' | 'MISSING';
}

export const MobileLinkSimulator: React.FC<MobileLinkSimulatorProps> = ({
  domain = 'drsharmadental.in',
  whatsappStatus = 'BROKEN',
  phoneStatus = 'WORKING',
}) => {
  const [activeTab, setActiveTab] = useState<'BEFORE' | 'AFTER'>('BEFORE');

  return (
    <div className="rounded-3xl border border-rose-500/20 bg-slate-950/90 p-6 md:p-8 shadow-2xl backdrop-blur-2xl space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-400 flex items-center gap-1.5 font-mono">
            <Smartphone className="h-4 w-4 text-rose-400" />
            Real Customer Mobile Experience Simulator
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-0.5">
            What Happens When A Customer Taps Your Contact Button?
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            See why potential clients bounce when visiting <span className="text-white font-mono">{domain}</span> on their mobile phone.
          </p>
        </div>

        {/* Before vs After Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900 border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('BEFORE')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'BEFORE'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-950/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <XCircle className="h-3.5 w-3.5" />
            <span>Before (Current Flaw)</span>
          </button>
          <button
            onClick={() => setActiveTab('AFTER')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'AFTER'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>After (LeadGuard Fix)</span>
          </button>
        </div>
      </div>

      {/* Mobile Device Mockup */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        
        {/* Left Explanation Column (5 cols) */}
        <div className="md:col-span-5 space-y-4">
          {activeTab === 'BEFORE' ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-5 space-y-3">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <span>Critical Mobile Customer Bounce</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                When a customer visits <strong className="text-white">{domain}</strong> from an Instagram/Google ad and taps the WhatsApp button, their phone launches WhatsApp with a broken double country code (<code className="text-rose-300 font-mono">+91919876543210</code>).
              </p>
              <div className="pt-2 border-t border-rose-500/20 text-xs text-rose-300 font-semibold flex items-center justify-between">
                <span>Resulting Lead Loss:</span>
                <span className="font-mono font-bold text-rose-400">100% Dropoff</span>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <Sparkles className="h-5 w-5 shrink-0 text-amber-300" />
                <span>Seamless 1-Tap Lead Recovery</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                With the LeadGuard 1-click patch applied, tapping the button immediately opens WhatsApp directly with a pre-filled greeting message: <em className="text-emerald-200">"Namaste! I want to consult regarding your services..."</em>
              </p>
              <div className="pt-2 border-t border-emerald-500/20 text-xs text-emerald-300 font-semibold flex items-center justify-between">
                <span>Resulting Lead Loss:</span>
                <span className="font-mono font-bold text-emerald-400">0% Loss (3x Conversion)</span>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-2 text-xs">
            <span className="font-bold text-slate-200">💡 Why this matters to your business:</span>
            <p className="text-slate-400 leading-relaxed">
              Over 82% of website visitors in India view your site on a mobile phone. If your contact button fails on tap, ad budget spent on Facebook & Instagram is completely wasted.
            </p>
          </div>
        </div>

        {/* Right Phone Frame (7 cols) */}
        <div className="md:col-span-7 flex justify-center">
          <div className="relative w-full max-w-[320px] rounded-[40px] border-[10px] border-slate-800 bg-slate-950 p-4 shadow-2xl space-y-4">
            
            {/* Phone Notch */}
            <div className="mx-auto h-4 w-32 rounded-full bg-slate-800" />

            {/* Simulated Phone Screen Content */}
            <div className="rounded-2xl bg-slate-900 p-4 space-y-4 border border-slate-800 min-h-[360px] flex flex-col justify-between">
              
              {/* Top Site Header inside Phone */}
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <span className="text-xs font-bold text-white truncate max-w-[160px]">{domain}</span>
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>

              {/* Center Screen Event Simulation */}
              {activeTab === 'BEFORE' ? (
                <div className="rounded-xl bg-slate-950 p-4 border border-rose-500/40 text-center space-y-3 my-auto shadow-inner">
                  <div className="w-10 h-10 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto text-rose-400">
                    <XCircle className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-extrabold text-rose-400 block">WhatsApp Error</span>
                    <p className="text-[11px] text-slate-300 font-mono">
                      "Phone number +91919876543210 is not on WhatsApp."
                    </p>
                  </div>
                  <span className="inline-block px-2.5 py-1 rounded bg-rose-500/10 text-rose-300 text-[10px] font-bold uppercase border border-rose-500/20">
                    Customer Closes App
                  </span>
                </div>
              ) : (
                <div className="rounded-xl bg-emerald-950/40 p-4 border border-emerald-500/40 text-left space-y-3 my-auto shadow-inner">
                  <div className="flex items-center gap-2 border-b border-emerald-900/60 pb-2">
                    <MessageCircle className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-300">WhatsApp Chat Active</span>
                  </div>
                  <div className="rounded-lg bg-emerald-900/40 p-2.5 text-[11px] text-emerald-100 font-mono border border-emerald-800/60">
                    "Namaste! I saw your website {domain} and would like to book an appointment."
                  </div>
                  <div className="flex justify-end">
                    <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase border border-emerald-500/30">
                      Lead Captured Instant!
                    </span>
                  </div>
                </div>
              )}

              {/* Bottom Call to Action Button inside Phone */}
              <div className="pt-2">
                <button
                  className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold text-white transition-all shadow-md ${
                    activeTab === 'BEFORE'
                      ? 'bg-rose-600 animate-pulse'
                      : 'bg-emerald-600'
                  }`}
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Chat on WhatsApp</span>
                </button>
              </div>

            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
