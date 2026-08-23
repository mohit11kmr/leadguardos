import React, { useState } from 'react';
import { Shield, Phone, Mail, MessageCircle, Heart, Lock, CheckCircle2, ArrowUp, Scale } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { AppTab } from './Navbar';
import { LegalTermsModal } from './LegalTermsModal';

interface FooterProps {
  setActiveTab: (tab: AppTab) => void;
  onOpenContact: () => void;
  onOpenAlerts: () => void;
  onOpenAbout?: () => void;
  onOpenServices?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  setActiveTab,
  onOpenContact,
  onOpenAlerts,
  onOpenAbout,
  onOpenServices,
}) => {
  const { lang, setLang, t } = useLanguage();
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="mt-16 border-t border-slate-800/80 bg-slate-950/90 text-slate-400 backdrop-blur-xl relative">
      <LegalTermsModal isOpen={isLegalModalOpen} onClose={() => setIsLegalModalOpen(false)} />
      
      {/* High-Impact Emergency Conversion Banner */}
      <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
        <div className="rounded-3xl border border-rose-500/30 bg-cyber-grid bg-gradient-to-r from-rose-950/60 via-slate-950 to-slate-950 p-6 md:p-8 shadow-2xl backdrop-blur-2xl flex flex-col lg:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="pointer-events-none absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-rose-600/20 blur-3xl" />
          
          <div className="space-y-2 text-center lg:text-left relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-300 text-[11px] font-bold uppercase border border-rose-500/20">
              <Shield className="h-3.5 w-3.5 text-rose-400" />
              Is Your Business Leaking Customer Leads Right Now?
            </span>
            <h3 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
              Get Your Free Audit Report & 1-Click Code Patch In Under 30 Seconds
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Don't let broken WhatsApp links (+9191 errors) or dead call buttons drain your ad budget. Test your site free.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 relative z-10 w-full lg:w-auto">
            <button
              onClick={() => { setActiveTab('scanner'); scrollToTop(); }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 px-6 py-3.5 text-xs font-bold text-white shadow-lg shadow-rose-950/60 border border-rose-400/30 transition-all active:scale-95"
            >
              <span>Audit My Website Free</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
            </button>
            <a
              href="https://wa.me/918307070605?text=Namaste%20Mohit,%20I%20want%20to%20consult%20about%20LeadGuard%20and%20website%20lead%20recovery."
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-6 py-3.5 text-xs font-bold text-white shadow-lg shadow-emerald-950/60 border border-emerald-400/30 transition-all active:scale-95"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Talk to Founder</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          
          {/* Brand & Mission (Col 5) */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-rose-500 to-rose-700 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-rose-950/40 border border-rose-400/30">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight text-white">
                LeadGuard<span className="text-rose-500 font-extrabold ml-0.5">OS</span>
              </span>
              <span className="inline-flex items-center rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-rose-400 border border-rose-500/20">
                v3.2 Enterprise
              </span>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              India's premier revenue protection and lead recovery diagnostic system. 
              Safeguarding Indian local businesses from broken WhatsApp prefixes (+9191), dead Click-to-Call buttons, 
              and untracked marketing ad bleed.
            </p>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-200 transition-colors shadow-sm"
              >
                <span>🌐 भाषा: {lang === 'en' ? 'English (Switch to हिंदी)' : 'हिंदी (Switch to English)'}</span>
              </button>
            </div>
          </div>

          {/* Quick Tools & Modules (Col 3) */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Company & Solutions</h4>
            <ul className="space-y-2 text-xs">
              {onOpenAbout && (
                <li>
                  <button
                    onClick={onOpenAbout}
                    className="hover:text-rose-400 font-bold text-slate-200 transition-colors flex items-center gap-1"
                  >
                    <span>📖 About LeadGuard Story</span>
                  </button>
                </li>
              )}
              {onOpenServices && (
                <li>
                  <button
                    onClick={onOpenServices}
                    className="hover:text-rose-400 font-bold text-slate-200 transition-colors flex items-center gap-1"
                  >
                    <span>📋 Detailed Services Catalog</span>
                  </button>
                </li>
              )}
              <li>
                <button
                  onClick={() => { setActiveTab('scanner'); scrollToTop(); }}
                  className="hover:text-rose-400 transition-colors"
                >
                  Live 6-Layer Website Audit
                </button>
              </li>
              <li>
                <button
                  onClick={() => { setActiveTab('sabotage-radar'); scrollToTop(); }}
                  className="hover:text-rose-400 transition-colors"
                >
                  Competitor Sabotage Radar
                </button>
              </li>
              <li>
                <button
                  onClick={() => { setActiveTab('zero-intent'); scrollToTop(); }}
                  className="hover:text-rose-400 transition-colors"
                >
                  Zero-Intent WhatsApp Probe
                </button>
              </li>
              <li>
                <button
                  onClick={() => { setActiveTab('cart-death'); scrollToTop(); }}
                  className="hover:text-rose-400 transition-colors"
                >
                  Cart Death & Checkout Monitor
                </button>
              </li>
            </ul>
          </div>

          {/* Direct Founder Contact (Col 4) */}
          <div className="md:col-span-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-3.5 backdrop-blur-md shadow-lg">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">Founder & Direct Contact</h4>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                Verified
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="text-white font-bold text-sm">Mohit Sikarwar</div>
              
              <div className="flex items-center gap-2 text-slate-300">
                <Phone className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <a href="tel:8307070605" className="hover:text-white font-mono">
                  +91 83070 70605
                </a>
              </div>

              <div className="flex items-center gap-2 text-slate-300">
                <Mail className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                <a href="mailto:mohitsikarwar123@gmail.com" className="hover:text-white font-mono truncate">
                  mohitsikarwar123@gmail.com
                </a>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <a
                href="https://wa.me/918307070605?text=Namaste%20Mohit,%20I%20want%20to%20consult%20about%20LeadGuard%20and%20website%20lead%20recovery."
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950/40 transition-colors"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span>Chat on WhatsApp</span>
              </a>

              <button
                onClick={onOpenContact}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700/80 transition-colors"
              >
                Contact Card
              </button>
            </div>
          </div>

        </div>

        {/* Legal Trademark Disclaimer Bar */}
        <div className="mt-8 pt-4 border-t border-slate-800/60 text-[11px] text-slate-400 leading-relaxed space-y-1">
          <p>
            <strong className="text-slate-300">Legal Disclaimer:</strong> WhatsApp® and Meta® are registered trademarks of Meta Platforms, Inc. Facebook® and Meta Pixel® are trademarks of Meta Platforms, Inc. Google Analytics® is a registered trademark of Google LLC. LeadGuard OS is an independent diagnostic software developed by Mohit Sikarwar and is not affiliated with, endorsed by, or partnered with Meta Platforms, Inc., Google LLC, or Razorpay. Audit scores are automated estimations for technical optimization purposes.
          </p>
        </div>

        {/* Bottom Copyright Strip */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            © {new Date().getFullYear()} <strong className="text-white font-semibold">LeadGuard OS</strong>. All Rights Reserved. Created by <strong className="text-slate-200">Mohit Sikarwar</strong>.
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            <button
              onClick={() => setIsLegalModalOpen(true)}
              className="flex items-center gap-1 hover:text-white transition-colors text-rose-400 font-medium"
            >
              <Scale className="h-3 w-3" />
              <span>Terms & Privacy</span>
            </button>
            <span>•</span>
            <span className="flex items-center gap-1 text-slate-400">
              <Lock className="h-3 w-3 text-emerald-400" /> Bank-Grade SSL Safe
            </span>
            <span>•</span>
            <button
              onClick={scrollToTop}
              className="inline-flex items-center gap-1 hover:text-white transition-colors"
            >
              <span>Back to Top</span>
              <ArrowUp className="h-3 w-3" />
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
};

