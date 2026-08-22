import React, { useState } from 'react';
import { Search, Loader2, ArrowRight, ShieldCheck, AlertCircle, Globe, ChevronDown, Sliders } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';

interface HeroScannerProps {
  onScan: (url: string) => Promise<void>;
  isLoading: boolean;
  activeUrl: string;
}

const SCAN_STEPS = [
  'Connecting to target domain...',
  'Analyzing page HTML & security headers...',
  'Checking WhatsApp routing for +9191 & digit errors...',
  'Inspecting Click-to-Call & review links...',
  'Scanning Meta Pixel & Google Analytics 4 tags...',
  'Running browser runtime analysis...',
  'Calculating 4-pillar health score...',
  'Preparing forensic diagnostic report...',
];

export const HeroScanner: React.FC<HeroScannerProps> = ({ onScan, isLoading, activeUrl }) => {
  const { t } = useLanguage();
  const [urlInput, setUrlInput] = useState(activeUrl || '');
  const [stepIndex, setStepIndex] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  React.useEffect(() => {
    if (activeUrl) {
      setUrlInput(activeUrl);
    }
  }, [activeUrl]);

  const validateUrlFormat = (input: string): boolean => {
    if (!input.trim()) {
      setValidationError('Please enter a website domain or URL.');
      return false;
    }
    const clean = input.trim().replace(/^https?:\/\//i, '');
    if (!clean.includes('.') || clean.length < 4) {
      setValidationError('Please enter a valid domain (e.g. drsharmadental.in).');
      return false;
    }
    setValidationError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateUrlFormat(urlInput) || isLoading) return;

    let currentStep = 0;
    setStepIndex(0);
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep < SCAN_STEPS.length) {
        setStepIndex(currentStep);
      }
    }, 500);

    try {
      await onScan(urlInput.trim());
    } finally {
      clearInterval(interval);
    }
  };

  const handleQuickSelect = (url: string) => {
    setUrlInput(url);
    setValidationError(null);
    onScan(url);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-800/90 bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950 p-6 md:p-10 shadow-2xl backdrop-blur-sm">
      
      {/* Background Ambient Glow */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-64 w-[500px] rounded-full bg-rose-500/10 blur-[110px]" />
      
      <div className="relative mx-auto max-w-3xl text-center space-y-6">
        
        {/* Product Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-3.5 py-1 text-xs font-semibold text-rose-400">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
          <span>⚡ LeadGuard OS — Diagnostic Conversion Audit</span>
        </div>

        {/* Headline */}
        <div className="space-y-3">
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl leading-tight">
            Audit Your Website for Conversion Leaks & Revenue Loss
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Detect broken WhatsApp buttons, un-tracked Meta Pixels, silent SEO penalties, and dead phone links in under 30 seconds.
          </p>
        </div>

        {/* Streamlined Input Form */}
        <form onSubmit={handleSubmit} className="pt-2 max-w-2xl mx-auto space-y-3">
          <div className="relative flex flex-col sm:flex-row items-center gap-2 rounded-2xl bg-slate-950/90 p-2 border border-slate-700/80 shadow-2xl focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-500/20 transition-all">
            <div className="flex w-full items-center gap-3 px-3 py-2 sm:py-0">
              <Globe className="h-5 w-5 text-slate-400 shrink-0" />
              <input
                id="target-website-input"
                type="text"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder="Enter website domain (e.g. drsharmadental.in)"
                className="w-full bg-transparent text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none"
                disabled={isLoading}
              />
            </div>
            <button
              id="run-audit-button"
              type="submit"
              disabled={isLoading || !urlInput.trim()}
              className="flex w-full sm:w-auto shrink-0 items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 px-7 py-3.5 text-sm font-semibold text-white tracking-wide active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-md shadow-rose-950/50 whitespace-nowrap"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Scanning...</span>
                </>
              ) : (
                <>
                  <span>Audit Website</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>

          {/* Validation Error Message */}
          {validationError && (
            <div className="text-xs text-rose-400 flex items-center justify-center gap-1.5 pt-1">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Advanced Scan Options Toggle */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              <Sliders className="h-3 w-3 text-rose-400" />
              <span>Advanced scan options</span>
              <ChevronDown className={`h-3 w-3 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            </button>

            {showAdvanced && (
              <div className="mt-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-left text-xs space-y-2 text-slate-300">
                <div className="flex items-center justify-between">
                  <span>Browser Runtime Stage (Playwright DOM Inspection)</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[10px]">ENABLED</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>SSRF Private Network Defense Guard</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[10px]">ACTIVE</span>
                </div>
              </div>
            )}
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
            Elite Salon (Broken WA)
          </button>

          <button
            id="preset-leadguard"
            onClick={() => handleQuickSelect('leadguard.ai')}
            className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-emerald-300 hover:bg-emerald-500/20 transition-colors flex items-center gap-1.5 font-medium"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            LeadGuard AI (Clean)
          </button>
        </div>

      </div>
    </div>
  );
};
