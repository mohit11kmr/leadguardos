import React, { useState } from 'react';
import { Search, Loader2, ArrowRight, ShieldCheck, AlertCircle, CheckCircle2, Flame, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';

interface HeroScannerProps {
  onScan: (url: string) => Promise<void>;
  isLoading: boolean;
  activeUrl: string;
}

const SCAN_STEPS = [
  'Pinging domain & verifying SSL certificates...',
  'Inspecting WhatsApp routing for +9191 / prefix bugs...',
  'Verifying Click-to-Call (tel:) and Google Review links...',
  'Scanning for Meta Pixel & Google Analytics 4 tracking...',
  'Auditing <meta name="robots"> for accidental noindex tags...',
  'Synthesizing Revenue Leakage & Lead Impact report...',
];

export const HeroScanner: React.FC<HeroScannerProps> = ({ onScan, isLoading, activeUrl }) => {
  const { lang, t } = useLanguage();
  const [urlInput, setUrlInput] = useState(activeUrl || '');
  const [stepIndex, setStepIndex] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim() || isLoading) return;

    let currentStep = 0;
    setStepIndex(0);
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep < SCAN_STEPS.length) {
        setStepIndex(currentStep);
      }
    }, 450);

    try {
      await onScan(urlInput.trim());
    } finally {
      clearInterval(interval);
    }
  };

  const handleQuickSelect = (url: string) => {
    setUrlInput(url);
    onScan(url);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-800/90 bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950 p-6 md:p-10 shadow-2xl backdrop-blur-sm">
      
      {/* Background Subtle Ambient Glow */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-64 w-[500px] rounded-full bg-rose-500/10 blur-[110px]" />
      
      <div className="relative mx-auto max-w-3xl text-center space-y-6">
        
        {/* Market Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-3.5 py-1 text-xs font-semibold text-rose-400">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
          <span>⚡ 6-Layer Business Revenue & Conversion Diagnostic</span>
        </div>

        {/* Headline */}
        <div className="space-y-3">
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl leading-tight">
            {t('hero.title', 'Stop Losing Paying Customers & Recover 100% Lost Leads')}
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {t(
              'hero.subtitle',
              'अपनी वेबसाइट से ग्राहक टूटना तुरंत रोकें — Detect broken +9191 WhatsApp links, dead call buttons, untracked Meta Pixels, and silent SEO flaws before wasting your ad budget.'
            )}
          </p>
        </div>

        {/* Clean Input Form */}
        <form onSubmit={handleSubmit} className="pt-2 max-w-2xl mx-auto">
          <div className="relative flex flex-col sm:flex-row items-center gap-2 rounded-2xl bg-slate-950/90 p-2 border border-slate-700/80 shadow-2xl focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-500/20 transition-all">
            <div className="flex w-full items-center gap-3 px-3 py-2 sm:py-0">
              <Globe className="h-5 w-5 text-slate-400 shrink-0" />
              <input
                id="target-website-input"
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder={t(
                  'hero.inputPlaceholder',
                  'Enter website domain (e.g. drsharmadental.in, yourdomain.com)'
                )}
                className="w-full bg-transparent text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none"
                disabled={isLoading}
              />
            </div>
            <button
              id="run-audit-button"
              type="submit"
              disabled={isLoading || !urlInput.trim()}
              className="flex w-full sm:w-auto shrink-0 items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 px-7 py-3.5 text-sm font-semibold text-white tracking-wide active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-md shadow-rose-950/50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>{t('hero.scanning', 'Scanning...')}</span>
                </>
              ) : (
                <>
                  <span>{t('hero.scanButton', 'Audit Website')}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Live Loading Progress Bar */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl border border-slate-800 bg-slate-950/90 p-4 text-left max-w-2xl mx-auto shadow-xl"
            >
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="flex items-center gap-2 font-medium text-rose-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Running Diagnostic Scan
                </span>
                <span className="font-mono text-slate-300">{Math.min(100, Math.round(((stepIndex + 1) / SCAN_STEPS.length) * 100))}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <motion.div
                  className="h-full bg-rose-500"
                  initial={{ width: '10%' }}
                  animate={{ width: `${Math.min(100, ((stepIndex + 1) / SCAN_STEPS.length) * 100)}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="mt-2.5 text-xs text-slate-300 font-mono">
                {SCAN_STEPS[stepIndex]}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sample Presets */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs pt-1">
          <span className="text-slate-500 text-xs mr-1 font-medium">Sample Audits:</span>
          
          <button
            id="preset-drsharma"
            onClick={() => handleQuickSelect('drsharmadental.in')}
            className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-rose-300 hover:bg-rose-500/20 transition-colors flex items-center gap-1.5 font-medium"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
            Dr. Sharma Dental (+9191 Bug)
          </button>

          <button
            id="preset-elitesalon"
            onClick={() => handleQuickSelect('elitesalonmumbai.com')}
            className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-amber-300 hover:bg-amber-500/20 transition-colors flex items-center gap-1.5 font-medium"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Elite Salon (Broken Review)
          </button>

          <button
            id="preset-apexgrand"
            onClick={() => handleQuickSelect('apexgrandrealestate.com')}
            className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-rose-300 hover:bg-rose-500/20 transition-colors flex items-center gap-1.5 font-medium"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
            Apex Realty (No Pixel)
          </button>

          <button
            id="preset-urbanvogue"
            onClick={() => handleQuickSelect('urbanvogue.in')}
            className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-emerald-300 hover:bg-emerald-500/20 transition-colors flex items-center gap-1.5 font-medium"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            UrbanVogue (Verified Clean)
          </button>
        </div>

        {/* Local Trust & Bharosa Guarantee Banner (Hindi & English) */}
        <div className="pt-3 border-t border-slate-800/80 max-w-2xl mx-auto">
          <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/30 via-slate-950/80 to-emerald-950/30 p-4 shadow-xl text-left">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-emerald-500/20">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5">
                    100% सुरक्षित एवं भरोसेमंद डायग्नोस्टिक
                    <span className="text-[10px] text-emerald-400 font-normal hidden sm:inline">| Non-Intrusive & Safe</span>
                  </span>
                  <p className="text-[11px] text-emerald-300/90 font-medium">
                    "आपका एक भी ग्राहक या लीड व्यर्थ न जाए — यही हमारा संकल्प है।"
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-300 font-mono shrink-0">
                🇮🇳 भारत के व्यापारियों का भरोसा
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3 text-[11px] text-slate-300">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span><strong>No Password Needed:</strong> बिना किसी लॉगिन या कोड बदले सुरक्षित जांच</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span><strong>Zero Server Load:</strong> आपकी वेबसाइट की स्पीड पर कोई असर नहीं</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span><strong>100% Confidential:</strong> आपका डेटा पूरी तरह प्राइवेट और सेफ है</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

