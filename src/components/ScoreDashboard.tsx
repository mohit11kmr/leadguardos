import React, { useState } from 'react';
import { AuditResult } from '../types';
import { Download, Share2, Sparkles, Check, TrendingDown, Clock, ShieldAlert, CheckCircle2, AlertTriangle, XCircle, MessageCircle, Bell, ArrowRight, Zap, HelpCircle, ShieldCheck } from 'lucide-react';
import { generateAuditPdf } from '../utils/pdfGenerator';
import { useLanguage } from '../context/LanguageContext';
import confetti from 'canvas-confetti';

interface ScoreDashboardProps {
  result: AuditResult;
  onOpenWatchdog: () => void;
  onOpenExpressFix: () => void;
  onOpenAlerts?: () => void;
  onOpenShareModal?: () => void;
}

export const ScoreDashboard: React.FC<ScoreDashboardProps> = ({
  result,
  onOpenWatchdog,
  onOpenExpressFix,
  onOpenAlerts,
  onOpenShareModal,
}) => {
  const { lang, t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showPlainSummary, setShowPlainSummary] = useState(true);

  const handleDownloadPdf = () => {
    setIsExporting(true);
    try {
      generateAuditPdf(result);
      confetti({
        particleCount: 30,
        spread: 50,
        origin: { y: 0.8 },
      });
    } catch (err) {
      console.error('PDF generation error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const issuesList = result.allIssues.map((i, idx) => `${idx + 1}. ${i.title} (${i.severity})`).join('\n');
    const msg = `🚨 *LeadGuard Website Diagnostic Report for ${result.domain}*\n\n` +
      `📊 *Funnel Health Score:* ${result.score}/100\n` +
      `💸 *Estimated Revenue Leaking:* ₹${result.estimatedMonthlyLoss.toLocaleString('en-IN')}/month\n` +
      `⚠️ *Detected Vulnerabilities:*\n${issuesList || 'No critical issues found'}\n\n` +
      `🛡️ *Audited by LeadGuard OS* (Created by Mohit Sikarwar - +91 83070 70605)\n` +
      `👉 Test your business website now at LeadGuard!`;
    
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const isHealthy = result.score >= 80;
  const isModerate = result.score >= 50 && result.score < 80;
  const isCritical = result.score < 50;

  const scoreTheme = isHealthy
    ? {
        text: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        statusLabel: 'All Systems Operational',
        statusDesc: 'No major revenue leakage detected on customer channels.',
      }
    : isModerate
    ? {
        text: 'text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        statusLabel: 'Moderate Leakage Risk',
        statusDesc: 'Some customer lead channels or tracking pixels require attention.',
      }
    : {
        text: 'text-rose-400',
        bg: 'bg-rose-500/10',
        border: 'border-rose-500/30',
        badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        statusLabel: 'Critical Revenue Leaks Detected',
        statusDesc: 'Customers attempting to contact or purchase are dropping off silently.',
      };

  return (
    <div className="space-y-6">
      
      {/* 3-Second Executive Diagnostic Banner */}
      <div className="rounded-3xl border border-slate-800/90 bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950 p-6 md:p-8 shadow-2xl backdrop-blur-md space-y-6">
        
        {/* Domain & Quick Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-300 shadow-inner">
              <ShieldCheck className="h-5 w-5 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Audit Report: <span className="text-rose-400 font-mono">{result.domain}</span>
                </h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  LIVE SCANNED
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Automated 6-Layer Diagnostic Scan completed in 1.2 seconds
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPlainSummary(!showPlainSummary)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-700/80 transition-all"
            >
              <HelpCircle className="h-3.5 w-3.5 text-indigo-400" />
              <span>{showPlainSummary ? 'Hide Simple Guide' : 'Explain in Simple Hindi/English'}</span>
            </button>
          </div>
        </div>

        {/* 3 Core Questions: The Non-Technical 3-Second Triage */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
          
          {/* Card 1: Question 1: Is Something Wrong? */}
          <div className={`rounded-2xl border ${scoreTheme.border} ${scoreTheme.bg} p-5 flex flex-col justify-between space-y-3 relative overflow-hidden`}>
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                1. Website Status
              </span>
              <div className="flex items-center gap-2 pt-1">
                {isHealthy ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                ) : isModerate ? (
                  <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-rose-400 shrink-0" />
                )}
                <h3 className={`text-base sm:text-lg font-extrabold ${scoreTheme.text} leading-snug`}>
                  {scoreTheme.statusLabel}
                </h3>
              </div>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed">
              {scoreTheme.statusDesc}
            </p>

            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-400">Total Flaws Found:</span>
              <span className={`font-mono font-bold ${scoreTheme.text}`}>
                {result.allIssues.length} issues
              </span>
            </div>
          </div>

          {/* Card 2: Question 2: How Serious Is It? */}
          <div className="rounded-2xl border border-slate-800/90 bg-slate-950/80 p-5 flex flex-col justify-between space-y-3">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                2. Health Score & Money At Risk
              </span>
              <div className="flex items-baseline gap-3 pt-1">
                <span className={`text-3xl sm:text-4xl font-extrabold font-mono tracking-tight ${scoreTheme.text}`}>
                  {result.score}<span className="text-sm font-semibold text-slate-500">/100</span>
                </span>
                <div className="text-right ml-auto">
                  <span className="text-xs text-slate-400 block">Est. Revenue Leak:</span>
                  <span className="text-base sm:text-lg font-bold font-mono text-rose-400">
                    ₹{result.estimatedMonthlyLoss.toLocaleString('en-IN')}<span className="text-[11px] text-slate-400">/mo</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Health Meter Bar */}
            <div className="space-y-1">
              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    isHealthy ? 'bg-emerald-500' : isModerate ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${result.score}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0 (Broken)</span>
                <span>50 (Moderate)</span>
                <span>100 (Flawless)</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-400">Ad Spend Risk:</span>
              <span className={`font-mono px-2 py-0.5 rounded text-[11px] ${
                result.adSpendRisk === 'HIGH' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-slate-800 text-slate-300'
              }`}>
                {result.adSpendRisk} RISK
              </span>
            </div>
          </div>

          {/* Card 3: Question 3: What Should I Do Next? */}
          <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-5 flex flex-col justify-between space-y-3">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-300">
                3. Recommended Immediate Action
              </span>
              <h3 className="text-sm sm:text-base font-bold text-white pt-1">
                {result.score < 80 ? 'Fix Critical Leaks Now' : 'Keep Website Monitored'}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {result.score < 80
                  ? 'Apply the verified 1-click code fixes below or let our engineers resolve your +9191 WhatsApp & tracking bugs within 2 hours.'
                  : 'Your website channels are clean! Enable 24/7 Watchdog to get alerted if a link breaks in the future.'}
              </p>
            </div>

            <button
              id="fix-now-primary-cta"
              onClick={onOpenExpressFix}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white py-3 px-4 text-xs sm:text-sm font-bold shadow-lg shadow-rose-950/60 active:scale-95 transition-all"
            >
              <Zap className="h-4 w-4" />
              <span>{result.score < 80 ? 'Fix My Website Leaks (₹2,999)' : 'Optimize Further'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

        </div>

        {/* Simple Plain-English / आसान भाषा में Explanation Box */}
        {showPlainSummary && (
          <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-400 shrink-0" />
              <h4 className="text-xs sm:text-sm font-bold text-indigo-200">
                Summary in Plain Language (आसान भाषा में सारांश)
              </h4>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="rounded-xl bg-slate-950/60 p-3 border border-indigo-900/40 space-y-1">
                <span className="font-bold text-slate-200">📱 WhatsApp Contact:</span>
                <p className="text-slate-300">
                  {result.whatsappLinks && result.whatsappLinks.length > 0 && result.whatsappLinks.every(w => w.isValid)
                    ? '✅ Perfect: Link opens WhatsApp directly with valid number.'
                    : result.whatsappLinks && result.whatsappLinks.some(w => !w.isValid)
                    ? '❌ Broken: +9191 double code or missing country code causes WhatsApp error for users.'
                    : '⚠️ Missing: No direct WhatsApp chat button found on page.'}
                </p>
              </div>

              <div className="rounded-xl bg-slate-950/60 p-3 border border-indigo-900/40 space-y-1">
                <span className="font-bold text-slate-200">📞 Phone Call Button:</span>
                <p className="text-slate-300">
                  {result.phoneLinks && result.phoneLinks.length > 0 && result.phoneLinks.some(p => p.isValid)
                    ? '✅ Working: Clicking phone opens mobile dialer directly.'
                    : '⚠️ Not configured or missing standard tel: link.'}
                </p>
              </div>

              <div className="rounded-xl bg-slate-950/60 p-3 border border-indigo-900/40 space-y-1">
                <span className="font-bold text-slate-200">🎯 Ad Tracking (Meta Pixel):</span>
                <p className="text-slate-300">
                  {result.metaPixel?.present
                    ? '✅ Active: Tracking conversions for Facebook/Instagram ads.'
                    : '⚠️ Missing: Ad money may be wasted without conversion data.'}
                </p>
              </div>

              <div className="rounded-xl bg-slate-950/60 p-3 border border-indigo-900/40 space-y-1">
                <span className="font-bold text-slate-200">🔍 Google SEO Status:</span>
                <p className="text-slate-300">
                  {result.seoPenalty?.isIndexable !== false
                    ? '✅ Indexable: Pages can appear in Google search results.'
                    : '⚠️ Warning: Hidden noindex tags or missing title detected.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Clean Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800/80">
          
          <div className="flex flex-wrap items-center gap-2">
            {/* 1. Share on WhatsApp */}
            <button
              id="whatsapp-share-button"
              onClick={handleWhatsAppShare}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 text-xs font-semibold tracking-wide transition-all shadow-md shadow-emerald-950/40 active:scale-95"
            >
              <MessageCircle className="h-4 w-4 text-white" />
              <span>Share on WhatsApp</span>
            </button>

            {/* 2. Download Official PDF */}
            <button
              id="download-pdf-button"
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 text-xs font-semibold tracking-wide transition-all border border-slate-700 active:scale-95"
            >
              <Download className="h-3.5 w-3.5 text-white" />
              <span>{isExporting ? 'Generating PDF...' : 'Download PDF Report'}</span>
            </button>

            {/* 3. Share Public Link Modal */}
            {onOpenShareModal && (
              <button
                id="share-report-modal-button"
                onClick={onOpenShareModal}
                className="flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2.5 text-xs font-semibold tracking-wide transition-all border border-slate-700"
              >
                <Share2 className="h-3.5 w-3.5 text-indigo-400" />
                <span>Share Public Report</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* 4. WhatsApp Alerts */}
            {onOpenAlerts && (
              <button
                id="get-whatsapp-alerts-btn"
                onClick={onOpenAlerts}
                className="flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 px-3.5 py-2.5 text-xs font-semibold tracking-wide transition-all border border-slate-800"
              >
                <Bell className="h-3.5 w-3.5 text-emerald-400" />
                <span>Get Daily Alerts</span>
              </button>
            )}

            {/* 5. 24/7 Watchdog */}
            <button
              id="activate-watchdog-btn"
              onClick={onOpenWatchdog}
              className="flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 px-3.5 py-2.5 text-xs font-semibold tracking-wide transition-all border border-slate-800"
            >
              <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
              <span>24/7 Watchdog</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};


