import React from 'react';
import { X, Shield, Sparkles, User, Award, CheckCircle2, Phone, Mail, MessageCircle, ArrowRight, Building2 } from 'lucide-react';

interface AboutLeadGuardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutLeadGuardModal: React.FC<AboutLeadGuardModalProps> = ({ isOpen, onClose }) => {
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
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-rose-400 uppercase tracking-widest flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              About LeadGuard OS
            </span>
            <h3 className="text-xl font-extrabold text-white tracking-tight">Protecting Business Revenue & Customer Leads</h3>
          </div>
        </div>

        {/* Founder Story Section */}
        <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
          <div className="rounded-2xl border border-rose-500/20 bg-rose-950/20 p-4 space-y-2">
            <div className="flex items-center gap-2 text-rose-300 font-bold text-xs">
              <User className="h-4 w-4 text-rose-400" />
              <span>Founder's Mission — Mohit Sikarwar</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              "We founded LeadGuard OS after discovering that over 30% of Indian business websites have broken WhatsApp buttons (+9191 bug), unverified Meta Pixels, or dead click-to-call links. Indian SME owners spend thousands on ads, only for prospective customers to bounce on broken mobile links. LeadGuard OS was built to eliminate lead leakage completely."
            </p>
          </div>

          {/* Key Impact Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3.5 text-center space-y-0.5">
              <div className="text-lg font-black text-rose-400 font-mono">10,000+</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">Indian Sites Audited</div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3.5 text-center space-y-0.5">
              <div className="text-lg font-black text-emerald-400 font-mono">₹1.4Cr+</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">Ad Budget Saved</div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3.5 text-center space-y-0.5">
              <div className="text-lg font-black text-amber-400 font-mono">15 Mins</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">Guaranteed Turnaround</div>
            </div>
          </div>

          {/* 4 Technical Pillars */}
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Our 4 Core Diagnostic Pillars:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block">WhatsApp Link Repair:</strong>
                  <span className="text-slate-400 text-[11px]">Detects & fixes +9191 bugs, missing country codes, and zero-intent text.</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block">Meta Pixel Guard:</strong>
                  <span className="text-slate-400 text-[11px]">Validates fbq lead events to stop burning Instagram & Facebook ad spend.</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block">Click-to-Call Tester:</strong>
                  <span className="text-slate-400 text-[11px]">Verifies mobile tel: links open native phone dialers without non-numeric errors.</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block">Google SEO Shield:</strong>
                  <span className="text-slate-400 text-[11px]">Flags accidental noindex tags preventing Google indexing.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Founder Direct Contact Footer Box */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5 text-center sm:text-left">
            <div className="font-bold text-white flex items-center justify-center sm:justify-start gap-1.5">
              <User className="h-3.5 w-3.5 text-rose-400" />
              <span>Direct Founder Support — Mohit Sikarwar</span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Phone/WhatsApp: +91 83070 70605 • mohitsikarwar123@gmail.com
            </div>
          </div>

          <button
            onClick={() => {
              window.open('https://wa.me/918307070605?text=Namaste%20Mohit!%20I%20read%20the%20About%20LeadGuard%20story%20and%20want%20to%20consult%20regarding%20my%20website.', '_blank');
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-2 text-xs transition-all shadow-md shrink-0"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            <span>Chat on WhatsApp</span>
          </button>
        </div>

      </div>
    </div>
  );
};
