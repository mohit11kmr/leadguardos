import React, { useState, useEffect } from 'react';
import { Search, Loader2, ArrowRight, MessageSquare, Target, SearchCheck, Shield, Sparkles, CheckCircle2, AlertCircle, Globe, Zap } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface HeroScannerProps {
  onScan: (url: string) => Promise<void>;
  isLoading: boolean;
  activeUrl: string;
}

export const HeroScanner: React.FC<HeroScannerProps> = ({ onScan, isLoading, activeUrl }) => {
  const { t } = useLanguage();
  const [urlInput, setUrlInput] = useState(activeUrl || '');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
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
    await onScan(urlInput.trim());
  };

  const handleSampleClick = (domain: string) => {
    setUrlInput(domain);
    setValidationError(null);
    onScan(domain);
  };

  return (
    <div className="space-y-10">
      {/* Hero Card */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-950/80 p-6 sm:p-12 md:p-14 text-center space-y-8 shadow-2xl backdrop-blur-2xl">
        
        {/* Subtle Ambient Glow */}
        <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-72 w-[550px] rounded-full bg-rose-600/15 blur-[120px]" />

        <div className="relative max-w-3xl mx-auto space-y-4">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3.5 py-1 text-xs font-semibold text-rose-300 shadow-md">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse"></span>
            <span>Instant Forensic Lead Audit</span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Is Your Website <span className="bg-gradient-to-r from-rose-400 via-rose-500 to-amber-300 bg-clip-text text-transparent">Losing Leads?</span>
          </h1>

          {/* Supporting Text */}
          <p className="text-sm sm:text-base md:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            LeadGuard finds broken WhatsApp, phone, forms, tracking, SEO and security problems that can cost you customers and ad money.
          </p>
        </div>

        {/* Primary Scan Input Form */}
        <form onSubmit={handleSubmit} className="relative max-w-2xl mx-auto space-y-3">
          <div className="flex flex-col sm:flex-row items-center gap-2.5 rounded-2xl bg-slate-900/90 p-2.5 border border-slate-700/80 shadow-2xl focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-500/30 transition-all">
            <div className="flex w-full items-center gap-3 px-3 py-1 sm:py-0">
              <Globe className="h-5 w-5 text-rose-400 shrink-0" />
              <input
                id="target-website-input"
                type="text"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder="yourwebsite.com"
                className="w-full bg-transparent text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none"
                disabled={isLoading}
              />
            </div>
            <button
              id="run-audit-button"
              type="submit"
              disabled={isLoading || !urlInput.trim()}
              className="flex w-full sm:w-auto shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 px-7 py-3.5 text-sm font-semibold text-white tracking-wide active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-lg shadow-rose-950/60 whitespace-nowrap border border-rose-400/30"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Scanning...</span>
                </>
              ) : (
                <>
                  <span>Scan My Website</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>

          {/* Validation Error */}
          {validationError && (
            <div className="text-xs text-rose-400 flex items-center justify-center gap-1.5 pt-1 font-medium">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Reassurance Label */}
          <div className="text-xs text-slate-400 flex items-center justify-center gap-2 pt-1 font-medium">
            <span className="text-emerald-400 font-bold">⏱️ 30-second audit</span>
            <span>•</span>
            <span>No code or installation required</span>
          </div>

          {/* Sample Demo Buttons */}
          <div className="pt-3 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="text-slate-500">Try sample audit:</span>
            <button
              type="button"
              onClick={() => handleSampleClick('drsharmadental.in')}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
            >
              Dental Clinic (+9191 bug)
            </button>
            <button
              type="button"
              onClick={() => handleSampleClick('elitesalonmumbai.com')}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
            >
              Elite Salon (Missing Pixel)
            </button>
          </div>
        </form>
      </div>

      {/* 4 Business-Outcome Diagnostic Cards Below Fold */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Lead Capture */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 space-y-2.5 backdrop-blur-sm">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Lead Capture
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Find broken WhatsApp buttons, unclickable phone dialers, and broken contact form paths.
            </p>
          </div>
        </div>

        {/* Card 2: Ad Tracking */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 space-y-2.5 backdrop-blur-sm">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Ad Tracking
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Find missing Meta Pixels or broken GA4 tags that waste ad spend without conversion attribution.
            </p>
          </div>
        </div>

        {/* Card 3: SEO */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 space-y-2.5 backdrop-blur-sm">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <SearchCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              SEO & Indexing
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Find unintended noindex tags, canonical tag errors, and broken sitemaps blocking search rankings.
            </p>
          </div>
        </div>

        {/* Card 4: Security */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 space-y-2.5 backdrop-blur-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Security Shield
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Detect SSL vulnerabilities, mixed HTTP content, and missing headers that trigger browser warnings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
