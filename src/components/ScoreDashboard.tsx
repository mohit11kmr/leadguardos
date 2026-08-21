import React, { useState } from 'react';
import { AuditResult } from '../types';
import { Download, Share2, Sparkles, Check, TrendingDown, Clock, ShieldAlert, CheckCircle, AlertTriangle, XCircle, MessageCircle, Bell } from 'lucide-react';
import { generateAuditPdf } from '../utils/pdfGenerator';
import { useLanguage } from '../context/LanguageContext';
import confetti from 'canvas-confetti';

interface ScoreDashboardProps {
  result: AuditResult;
  onOpenWatchdog: () => void;
  onOpenExpressFix: () => void;
  onOpenAlerts?: () => void;
}

export const ScoreDashboard: React.FC<ScoreDashboardProps> = ({
  result,
  onOpenWatchdog,
  onOpenExpressFix,
  onOpenAlerts,
}) => {
  const { lang, t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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

  const scoreBadgeBg = isHealthy
    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
    : isModerate
    ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
    : 'border-rose-500/30 bg-rose-500/10 text-rose-400';

  return (
    <div className="space-y-6">
      
      {/* Top Banner: Score & Financial Loss Summary */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        
        {/* Score Card (Col 4) */}
        <div className="md:col-span-4 rounded-3xl border border-slate-800/90 bg-slate-900/80 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-xl backdrop-blur-sm">
          
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Funnel Health Score
          </span>

          <div className="my-5 relative flex items-center justify-center">
            {/* Circular Gauge Ring */}
            <div className="relative h-32 w-32 flex items-center justify-center">
              <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 36 36">
                <path
                  className="text-slate-800"
                  strokeWidth="3.2"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={isHealthy ? 'text-emerald-500' : isModerate ? 'text-amber-500' : 'text-rose-500'}
                  strokeDasharray={`${result.score}, 100`}
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className={`text-4xl font-extrabold tracking-tight ${isHealthy ? 'text-emerald-400' : isModerate ? 'text-amber-400' : 'text-rose-400'}`}>
                  {result.score}
                </span>
                <span className="text-[10px] font-semibold text-slate-500 tracking-wider">OUT OF 100</span>
              </div>
            </div>
          </div>

          <div className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-xs font-bold ${scoreBadgeBg}`}>
            {isHealthy ? 'Clean Lead Channels' : isModerate ? 'Moderate Leaks Found' : 'Critical Conversion Leaks'}
          </div>

          <p className="mt-4 text-xs text-slate-400 font-mono">
            Domain: <span className="font-semibold text-slate-200">{result.domain}</span>
          </p>
        </div>

        {/* Financial Impact & Forensic Overview (Col 8) */}
        <div className="md:col-span-8 rounded-3xl border border-slate-800/90 bg-slate-900/80 p-6 md:p-8 flex flex-col justify-between shadow-xl relative overflow-hidden backdrop-blur-sm">
          
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-xs font-semibold text-slate-300">
                  Revenue & Lead Leakage Analysis
                </span>
              </div>
              <div className="rounded-full bg-slate-800 border border-slate-700/80 px-3 py-0.5 text-xs font-medium text-slate-300">
                Ad Bleed Risk: <span className={result.adSpendRisk === 'HIGH' ? 'text-rose-400 font-semibold' : 'text-slate-200'}>{result.adSpendRisk}</span>
              </div>
            </div>

            <div>
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-mono">
                  ₹{result.estimatedMonthlyLoss.toLocaleString('en-IN')}
                </span>
                <span className="text-sm font-semibold text-rose-400">
                  Estimated Monthly Inquiries & Revenue Lost
                </span>
              </div>

              <div className="mt-2.5 rounded-xl bg-slate-950/70 p-3 border border-slate-800 text-xs space-y-1.5 text-slate-300">
                <div className="flex items-center justify-between font-mono text-[11px] text-slate-400 border-b border-slate-800/80 pb-1.5">
                  <span className="font-semibold text-slate-200">🧮 Real Mathematical Calculation:</span>
                  <span className="text-emerald-400 font-bold">100% Transparent Logic</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                  <div className="space-y-0.5">
                    <p><strong className="text-slate-300">Standard Traffic Model:</strong> ~5,000 visitors/month with ~6.5% lead click rate.</p>
                    <p><strong className="text-slate-300">Average Order Value:</strong> ₹3,500 with 20% conversion benchmark.</p>
                  </div>
                  <div className="space-y-0.5">
                    {result.allIssues.length === 0 ? (
                      <p className="text-emerald-400 font-semibold">✓ No bottlenecks found. Loss is ₹0.</p>
                    ) : (
                      <>
                        <p><strong className="text-rose-400">Flaws Detected:</strong> {result.allIssues.map((i: any) => i.title).join(', ')}</p>
                        <p><strong className="text-slate-300">Impact:</strong> Unchecked leads & untracked ads ≈ ₹{result.estimatedMonthlyLoss.toLocaleString('en-IN')}/mo.</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                💡 <em>Aap niche diye gaye <strong>"Funnel Leak Simulator"</strong> tab me apne business ke exact visitors aur ad budget sliders ko adjust karke exact loss calculate kar sakte hain.</em>
              </p>
            </div>

            {/* AI Executive Diagnostic */}
            {result.aiDiagnosticAdvice && (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5 flex items-start gap-3">
                <Sparkles className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">Diagnostic Forensic Insight</span>
                  <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{result.aiDiagnosticAdvice}</p>
                </div>
              </div>
            )}
          </div>

          {/* Clean Action Toolbar */}
          <div className="mt-6 flex flex-wrap items-center gap-2.5 pt-4 border-t border-slate-800/80">
            {/* 1. Direct WhatsApp Share */}
            <button
              id="whatsapp-share-button"
              onClick={handleWhatsAppShare}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2.5 text-xs font-semibold tracking-wide transition-all shadow-sm shadow-emerald-950/40 active:scale-95"
            >
              <MessageCircle className="h-4 w-4 text-white" />
              <span>Share on WhatsApp</span>
            </button>

            {/* 2. Download PDF Report */}
            <button
              id="download-pdf-button"
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white px-3.5 py-2.5 text-xs font-semibold tracking-wide transition-all shadow-sm shadow-rose-950/40 active:scale-95"
            >
              <Download className="h-3.5 w-3.5 text-white" />
              <span>{isExporting ? 'Generating PDF...' : 'Download PDF'}</span>
            </button>

            {/* 3. WhatsApp Alerts */}
            {onOpenAlerts && (
              <button
                id="get-whatsapp-alerts-btn"
                onClick={onOpenAlerts}
                className="flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2.5 text-xs font-semibold tracking-wide transition-all border border-slate-700/80"
              >
                <Bell className="h-3.5 w-3.5 text-emerald-400" />
                <span>WhatsApp Alerts</span>
              </button>
            )}

            {/* 4. Share Link */}
            <button
              id="share-report-button"
              onClick={handleShare}
              className="flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2.5 text-xs font-semibold tracking-wide transition-all border border-slate-700/80"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-rose-400" />
                  <span className="text-rose-400">Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="h-3.5 w-3.5 text-slate-400" />
                  <span>Copy Link</span>
                </>
              )}
            </button>

            {/* 5. Enable 24/7 Watchdog */}
            <button
              id="activate-watchdog-btn"
              onClick={onOpenWatchdog}
              className="flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2.5 text-xs font-semibold tracking-wide transition-all border border-slate-700/80 sm:ml-auto"
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

