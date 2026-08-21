import React from 'react';
import { Shield, Phone, Mail, MessageCircle, Heart, Lock, CheckCircle2, ArrowUp } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { AppTab } from './Navbar';

interface FooterProps {
  setActiveTab: (tab: AppTab) => void;
  onOpenContact: () => void;
  onOpenAlerts: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  setActiveTab,
  onOpenContact,
  onOpenAlerts,
}) => {
  const { lang, setLang, t } = useLanguage();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="mt-16 border-t border-slate-800/80 bg-slate-950/90 text-slate-400">
      {/* Top Footer Banner */}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          
          {/* Brand & Mission (Col 5) */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-rose-500 to-rose-700 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-rose-950/40 border border-rose-400/30">
                <Shield className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight text-white">
                LeadGuard<span className="text-rose-500 font-extrabold ml-0.5">OS</span>
              </span>
              <span className="inline-flex items-center rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-400 border border-rose-500/20">
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
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-200 transition-colors"
              >
                <span>🌐 भाषा: {lang === 'en' ? 'English (Switch to हिंदी)' : 'हिंदी (Switch to English)'}</span>
              </button>
            </div>
          </div>

          {/* Quick Tools & Modules (Col 3) */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Diagnostic Modules</h4>
            <ul className="space-y-2 text-xs">
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
              <li>
                <button
                  onClick={() => { setActiveTab('agency'); scrollToTop(); }}
                  className="hover:text-rose-400 transition-colors"
                >
                  Agency Cold-Pitch & ROI Suite
                </button>
              </li>
            </ul>
          </div>

          {/* Direct Founder Contact (Col 4) */}
          <div className="md:col-span-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">Founder & Direct Contact</h4>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
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
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950/40 transition-colors"
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

        {/* Bottom Copyright Strip */}
        <div className="mt-10 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            © {new Date().getFullYear()} <strong className="text-white font-semibold">LeadGuard OS</strong>. All Rights Reserved. Created by <strong className="text-slate-200">Mohit Sikarwar</strong>.
          </div>

          <div className="flex items-center gap-4 text-[11px]">
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
