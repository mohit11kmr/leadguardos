import React from 'react';
import { X, Wrench, ShieldAlert, Layers, Check, Sparkles, MessageCircle, ArrowRight, Clock, ShieldCheck } from 'lucide-react';

interface ServicesCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenExpressFix: () => void;
  onOpenWatchdog: () => void;
}

export const ServicesCatalogModal: React.FC<ServicesCatalogModalProps> = ({
  isOpen,
  onClose,
  onOpenExpressFix,
  onOpenWatchdog,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl border border-rose-500/30 bg-slate-900 p-6 md:p-8 shadow-2xl space-y-6 m-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center font-bold text-white shadow-lg border border-rose-400/30 shrink-0">
            <Wrench className="h-6 w-6 text-white" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-rose-400 uppercase tracking-widest flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              LeadGuard Services Catalog
            </span>
            <h3 className="text-xl font-extrabold text-white tracking-tight">Lead Recovery & Conversion Solutions</h3>
          </div>
        </div>

        {/* 3 Service Cards */}
        <div className="space-y-4 text-xs font-sans">
          
          {/* Service 1: Express Fix */}
          <div className="rounded-2xl border border-rose-500/30 bg-slate-950 p-5 space-y-3 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-extrabold text-rose-400 uppercase tracking-wider">DONE-FOR-YOU SERVICE</span>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-rose-400" />
                  Express 15-Minute Lead Leak Fix
                </h4>
              </div>
              <div className="text-right">
                <span className="text-xl font-black text-white">₹2,999</span>
                <span className="text-[10px] text-slate-400 block font-mono">One-Time Fee</span>
              </div>
            </div>

            <p className="text-slate-300 text-xs leading-relaxed">
              Our engineering team manually audits and repairs all broken WhatsApp links (+9191 errors), click-to-call dialers, Meta Pixel Lead events, and Google robots tags with zero downtime.
            </p>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                15-Min Guaranteed Turnaround
              </span>

              <button
                onClick={() => {
                  onClose();
                  onOpenExpressFix();
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-2 text-xs transition-all shadow-md active:scale-95"
              >
                <span>Book Express Fix</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Service 2: 24/7 Watchdog */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-3 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-extrabold text-cyan-400 uppercase tracking-wider">RECURRING SAAS SURVEILLANCE</span>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-cyan-400" />
                  24/7 Watchdog Uptime & Link Radar
                </h4>
              </div>
              <div className="text-right">
                <span className="text-xl font-black text-white">₹299</span>
                <span className="text-[10px] text-slate-400 block font-mono">per month</span>
              </div>
            </div>

            <p className="text-slate-300 text-xs leading-relaxed">
              Automated background daemon that polls your website's WhatsApp buttons, Meta Pixels, and phone dialers every 60 minutes. Dispatches instant Telegram/WhatsApp alerts before you lose customers.
            </p>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] font-mono text-cyan-400 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                Continuous 60-Min Heartbeat
              </span>

              <button
                onClick={() => {
                  onClose();
                  onOpenWatchdog();
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2 text-xs transition-all border border-slate-700 active:scale-95"
              >
                <span>Activate Watchdog</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Service 3: Agency License */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-3 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider">WHITE-LABEL AGENCY SUITE</span>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="h-4 w-4 text-amber-400" />
                  Agency Pro Multi-Client Workspace
                </h4>
              </div>
              <div className="text-right">
                <span className="text-xl font-black text-white">₹4,999</span>
                <span className="text-[10px] text-slate-400 block font-mono">per month</span>
              </div>
            </div>

            <p className="text-slate-300 text-xs leading-relaxed">
              Tailored for marketing agencies & freelancers. Generate custom logo PDF audit reports, run unlimited prospect scans, and use our AI cold-outreach pitch generator.
            </p>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] font-mono text-amber-400 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                Unlimited White-Label PDFs
              </span>

              <button
                onClick={() => {
                  const text = encodeURIComponent('Namaste Mohit! I am interested in the Agency Pro Suite (₹4,999/mo) for my digital marketing agency.');
                  window.open(`https://wa.me/918307070605?text=${text}`, '_blank');
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 text-xs transition-all active:scale-95"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span>Contact Sales</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
