import React, { useState } from 'react';
import { AuditResult } from '../types';
import { Shield, AlertTriangle, CheckCircle2, TrendingDown, Phone, MessageCircle, FileText, ArrowRight, ExternalLink, Share2, Copy, Download, Zap, Sparkles } from 'lucide-react';
import { generateAuditPdf } from '../utils/pdfGenerator';

interface PublicReportViewProps {
  report: AuditResult;
  onOpenExpressFix?: () => void;
  onBackToScanner?: () => void;
}

export const PublicReportView: React.FC<PublicReportViewProps> = ({
  report,
  onOpenExpressFix,
  onBackToScanner,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDownloadPDF = () => {
    generateAuditPdf(report);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
      
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center font-bold text-white shadow-lg border border-rose-400/30">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white text-lg tracking-tight">LeadGuard OS</span>
              <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-400 border border-rose-500/20">
                Verified Public Forensic Report
              </span>
            </div>
            <p className="text-xs text-slate-400">Target Audit: <span className="text-slate-200 font-mono font-medium">{report.domain}</span></p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {onBackToScanner && (
            <button
              onClick={onBackToScanner}
              className="text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl transition-all"
            >
              ← Run Another Scan
            </button>
          )}

          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 px-3.5 py-2 rounded-xl transition-all shadow-sm"
          >
            {copiedLink ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-slate-400" />}
            <span>{copiedLink ? 'Link Copied!' : 'Share Link'}</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 px-4 py-2 rounded-xl transition-all shadow-md active:scale-95"
          >
            <Download className="h-4 w-4" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* Main Score Hero Card */}
      <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900/90 via-slate-900 to-slate-950 p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          
          <div className="space-y-4 max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-rose-400">
              <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
              <span>Revenue Diagnostic Summary</span>
            </div>

            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              {report.businessName || report.domain}
            </h1>

            <p className="text-sm text-slate-300 leading-relaxed">
              {report.aiDiagnosticAdvice || "Audit completed across WhatsApp links, click-to-call dialers, Meta Pixel tags, and Google search indexing."}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <div className="rounded-xl bg-slate-950/80 p-3 border border-slate-800">
                <span className="text-[11px] text-slate-400 font-medium">Est. Monthly Loss</span>
                <div className="text-xl font-extrabold text-rose-400 mt-0.5">
                  ₹{report.estimatedMonthlyLoss.toLocaleString('en-IN')}
                </div>
              </div>

              <div className="rounded-xl bg-slate-950/80 p-3 border border-slate-800">
                <span className="text-[11px] text-slate-400 font-medium">Ad Spend Risk</span>
                <div className={`text-xl font-extrabold mt-0.5 ${
                  report.adSpendRisk === 'CRITICAL' ? 'text-red-500' : report.adSpendRisk === 'HIGH' ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {report.adSpendRisk}
                </div>
              </div>

              <div className="rounded-xl bg-slate-950/80 p-3 border border-slate-800 col-span-2 sm:col-span-1">
                <span className="text-[11px] text-slate-400 font-medium">Issues Detected</span>
                <div className="text-xl font-extrabold text-white mt-0.5">
                  {report.allIssues.length} Leaks
                </div>
              </div>
            </div>
          </div>

          {/* Big Score Ring */}
          <div className="flex flex-col items-center justify-center shrink-0">
            <div className="relative w-40 h-40 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className="stroke-slate-800"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className={`${
                    report.score >= 80 ? 'stroke-emerald-500' : report.score >= 50 ? 'stroke-amber-500' : 'stroke-rose-500'
                  } transition-all duration-1000 ease-out`}
                  strokeWidth="8"
                  strokeDasharray="264"
                  strokeDashoffset={264 - (264 * report.score) / 100}
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-4xl font-black text-white">{report.score}</span>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Out of 100</span>
              </div>
            </div>
            <span className={`mt-3 text-xs font-bold px-3 py-1 rounded-full border ${
              report.score >= 80
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : report.score >= 50
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
            }`}>
              {report.score >= 80 ? 'Shielded & Healthy' : report.score >= 50 ? 'Moderate Revenue Leaks' : 'Critical Lead Drop Alert'}
            </span>
          </div>

        </div>
      </div>

      {/* 4 Pillars Breakdown Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Lead Guardian */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">📱 Lead Guardian</span>
            <span className="text-sm font-extrabold text-white">{report.pillars.lead.score}/100</span>
          </div>
          <p className="text-xs text-slate-400">{report.pillars.lead.diagnosis}</p>
        </div>

        {/* AdShield */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">🎯 AdShield & Pixel</span>
            <span className="text-sm font-extrabold text-white">{report.pillars.ad.score}/100</span>
          </div>
          <p className="text-xs text-slate-400">{report.pillars.ad.diagnosis}</p>
        </div>

        {/* SEO */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">🔍 Google SEO</span>
            <span className="text-sm font-extrabold text-white">{report.pillars.seo.score}/100</span>
          </div>
          <p className="text-xs text-slate-400">{report.pillars.seo.diagnosis}</p>
        </div>

        {/* Cyber */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">🛡️ Cyber & Spam</span>
            <span className="text-sm font-extrabold text-white">{report.pillars.cyber.score}/100</span>
          </div>
          <p className="text-xs text-slate-400">{report.pillars.cyber.diagnosis}</p>
        </div>
      </div>

      {/* Detected Leaks & Recommendations List */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 md:p-8 space-y-6 shadow-xl">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span>Detected Conversion Leaks</span>
          <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-300 font-mono">
            {report.allIssues.length}
          </span>
        </h2>

        {report.allIssues.length === 0 ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center space-y-2">
            <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
            <h3 className="text-base font-bold text-emerald-300">Flawless Setup — No Revenue Leaks Detected!</h3>
            <p className="text-xs text-slate-300">All WhatsApp buttons, click-to-call links, Meta Pixel tags, and search indexers are fully operational.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {report.allIssues.map((issue, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 sm:p-5 space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                      issue.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    }`}>
                      {issue.severity}
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-white">{issue.title}</h3>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-300">{issue.description}</p>

                <div className="rounded-xl bg-slate-900 p-3 border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto">
                  <span className="text-[10px] text-slate-500 font-sans block mb-1 uppercase font-bold">Suggested Fix Snippet:</span>
                  <code>{issue.fixSnippet}</code>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CTA Box: Express Fix */}
      <div className="rounded-3xl border-2 border-rose-500/50 bg-gradient-to-r from-slate-900 via-rose-950/40 to-slate-900 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
        <div className="space-y-2 text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-400">
            <Zap className="h-4 w-4" />
            <span>15-Minute Guaranteed Turnaround</span>
          </div>
          <h2 className="text-2xl font-black text-white">Need Our Team to Fix These Leaks for You?</h2>
          <p className="text-xs sm:text-sm text-slate-300">
            We will correct WhatsApp routing, install Meta Pixel conversion tags, and configure GA4 within 48 hours.
          </p>
        </div>

        <button
          onClick={onOpenExpressFix}
          className="shrink-0 flex items-center gap-2 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-extrabold px-6 py-3.5 rounded-2xl text-sm shadow-xl shadow-rose-900/40 active:scale-95 transition-all"
        >
          <Sparkles className="h-4 w-4" />
          <span>Book Express Fix (₹4,999)</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

    </div>
  );
};
