import React, { useState } from 'react';
import { AuditResult, PillarType } from '../types';
import { Download, Share2, Sparkles, AlertTriangle, CheckCircle2, AlertCircle, Radio, Zap, ArrowRight, ShieldCheck, MessageSquare, Target, SearchCheck, Shield, ChevronRight } from 'lucide-react';
import { generateAuditPdf } from '../utils/pdfGenerator';
import { ImpactMetric } from './common/ImpactMetric';
import confetti from 'canvas-confetti';

interface ScoreDashboardProps {
  result: AuditResult;
  onOpenWatchdog: () => void;
  onOpenExpressFix: () => void;
  onOpenAlerts?: () => void;
  onOpenShareModal?: () => void;
  onSelectPillar?: (pillar: PillarType | 'ALL') => void;
}

export const ScoreDashboard: React.FC<ScoreDashboardProps> = ({
  result,
  onOpenWatchdog,
  onOpenExpressFix,
  onOpenAlerts,
  onOpenShareModal,
  onSelectPillar,
}) => {
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleDownloadPdf = () => {
    setIsExporting(true);
    try {
      generateAuditPdf(result);
      confetti({ particleCount: 35, spread: 60, origin: { y: 0.8 } });
    } catch (err) {
      console.error('PDF generation error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = () => {
    if (onOpenShareModal) {
      onOpenShareModal();
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const score = result.score;
  const isHealthy = score >= 80;
  const isModerate = score >= 50 && score < 80;

  const scoreTheme = isHealthy
    ? {
        textColor: 'text-emerald-400',
        badgeBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
        status: 'Healthy & Operational',
        summary: 'Your website has minimal revenue leakage. Most lead conversion channels are functioning properly.',
      }
    : isModerate
    ? {
        textColor: 'text-amber-400',
        badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
        status: 'Needs Attention',
        summary: 'Your website has several issues that may be causing dropped customer leads and wasted ad spend.',
      }
    : {
        textColor: 'text-rose-400',
        badgeBg: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
        status: 'Critical Lead Losses Detected',
        summary: 'High-severity conversion breaks detected. Customers attempting to reach out or purchase are dropping off silently.',
      };

  // 4 Pillars Breakdown calculation
  const pillarScores = [
    {
      type: 'LEAD' as PillarType,
      name: 'Lead Capture',
      score: result.pillars?.lead?.score ?? Math.min(100, Math.max(20, Math.round(result.score * 0.9))),
      icon: MessageSquare,
      summary: 'WhatsApp buttons, click-to-call links & contact forms',
    },
    {
      type: 'AD' as PillarType,
      name: 'Ad Tracking',
      score: result.pillars?.ad?.score ?? Math.min(100, Math.max(10, Math.round(result.score * 0.85))),
      icon: Target,
      summary: 'Meta Pixel (fbq), GA4 tags & conversion events',
    },
    {
      type: 'SEO' as PillarType,
      name: 'SEO & Indexing',
      score: result.pillars?.seo?.score ?? Math.min(100, Math.max(30, Math.round(result.score * 1.05))),
      icon: SearchCheck,
      summary: 'Search crawler noindex tags & canonical URLs',
    },
    {
      type: 'CYBER' as PillarType,
      name: 'Security Shield',
      score: result.pillars?.cyber?.score ?? Math.min(100, Math.max(40, Math.round(result.score * 1.0))),
      icon: Shield,
      summary: 'SSL encryption status & Content Security Policy',
    },
  ];

  const criticalIssues = (result.allIssues || []).filter((i) => i.severity === 'CRITICAL' || i.severity === 'HIGH');
  const estimatedLeadsLost = Math.max(4, Math.round(result.estimatedMonthlyLoss / 1500));

  return (
    <div className="space-y-8">
      
      {/* Top Banner: Score & Executive Summary */}
      <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-6 sm:p-8 md:p-10 shadow-2xl backdrop-blur-xl relative overflow-hidden space-y-8">
        
        {/* Subtle Ambient Accent Glow */}
        <div className="pointer-events-none absolute -top-24 right-0 h-64 w-64 rounded-full bg-rose-500/10 blur-3xl" />

        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Forensic Audit Results
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {result.domain}
            </h1>
          </div>

          {/* Quick Action Toolbar */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-semibold transition-colors shadow-sm"
            >
              <Download className="h-4 w-4 text-rose-400" />
              <span>{isExporting ? 'Generating PDF...' : 'Download PDF Report'}</span>
            </button>

            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-semibold transition-colors shadow-sm"
            >
              <Share2 className="h-4 w-4 text-cyan-400" />
              <span>{copied ? 'Link Copied!' : 'Share Audit'}</span>
            </button>

            <button
              onClick={onOpenWatchdog}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-950/40 hover:bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors shadow-sm"
            >
              <Radio className="h-4 w-4 text-emerald-400" />
              <span>Enable 24/7 Monitoring</span>
            </button>
          </div>
        </div>

        {/* Lead Health Score & Executive Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Score Gauge */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 text-center space-y-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Lead Health Score
            </span>
            <div className="flex items-baseline justify-center gap-1">
              <span className={`text-6xl sm:text-7xl font-black font-mono tracking-tight ${scoreTheme.textColor}`}>
                {score}
              </span>
              <span className="text-xl text-slate-500 font-bold">/ 100</span>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${scoreTheme.badgeBg}`}>
              {scoreTheme.status}
            </span>
          </div>

          {/* Business Impact Overview */}
          <div className="lg:col-span-8 space-y-4">
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {scoreTheme.status}
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                {scoreTheme.summary}
              </p>
            </div>

            {/* Quick DFY Fix Action Card */}
            <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-amber-300 fill-amber-300" />
                  Express 48h Done-For-You Repair Available
                </span>
                <p className="text-xs text-slate-400">
                  An expert LeadGuard engineer will fix all detected broken WhatsApp links, dialers, and pixels for ₹2,999.
                </p>
              </div>
              <button
                onClick={onOpenExpressFix}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-xs sm:text-sm font-bold text-white transition-all shadow-lg shadow-rose-950/50 active:scale-95 whitespace-nowrap shrink-0"
              >
                <span>Fix All Issues (₹2,999)</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Four-Pillar Health Score Cards (Progressive Summary) */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
          Four-Pillar Diagnostic Breakdown
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {pillarScores.map((p) => {
            const Icon = p.icon;
            const isGood = p.score >= 80;
            const isWarn = p.score >= 50 && p.score < 80;
            const color = isGood ? 'text-emerald-400' : isWarn ? 'text-amber-400' : 'text-rose-400';
            const badgeBg = isGood ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : isWarn ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400';
            const iconBadge = isGood ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : isWarn ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20';

            return (
              <div
                key={p.type}
                className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-5 space-y-3 flex flex-col justify-between backdrop-blur-sm hover:border-slate-700 transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${iconBadge}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className={`text-xl font-bold font-mono ${color}`}>
                      {p.score}<span className="text-xs text-slate-500 font-normal">/100</span>
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white tracking-tight">
                      {p.name}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5 leading-snug">
                      {p.summary}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badgeBg}`}>
                    {isGood ? 'Healthy' : isWarn ? 'Needs Attention' : 'Critical Leak'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Business Impact Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
          Estimated Business Impact
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ImpactMetric
            label="Estimated Monthly Loss"
            value={`₹${result.estimatedMonthlyLoss?.toLocaleString('en-IN') || 0}`}
            subtext="Estimated ad spend & lead leakage per month"
            icon={Zap}
            variant="rose"
          />
          <ImpactMetric
            label="Leads at Risk"
            value={`~${estimatedLeadsLost} / mo`}
            subtext="Lost calls, chats & un-submitted forms"
            icon={MessageSquare}
            variant="amber"
          />
          <ImpactMetric
            label="Critical Lead Breaks"
            value={result.allIssues?.filter(i => i.severity === 'CRITICAL').length || 0}
            subtext="High-severity conversion blockers"
            icon={AlertCircle}
            variant="rose"
          />
          <ImpactMetric
            label="Total Diagnostics"
            value={result.allIssues?.length || 0}
            subtext="Identified optimization opportunities"
            icon={Target}
            variant="slate"
          />
        </div>
      </div>

      {/* Critical Lead Losses Highlight (High Priority Issues) */}
      {criticalIssues.length > 0 && (
        <div className="rounded-3xl border border-rose-500/40 bg-rose-950/20 p-6 sm:p-8 space-y-4 backdrop-blur-xl">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-sm uppercase tracking-wider">
            <AlertCircle className="h-5 w-5" />
            <span>Critical Lead Losses (Fix First)</span>
          </div>

          <div className="space-y-3">
            {criticalIssues.slice(0, 3).map((issue, idx) => (
              <div
                key={issue.id || idx}
                className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase">
                      {issue.severity}
                    </span>
                    <h4 className="text-sm font-bold text-white">
                      {issue.title}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                    {issue.impact || issue.description}
                  </p>
                </div>

                <button
                  onClick={onOpenExpressFix}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors shrink-0 shadow-sm"
                >
                  <span>View Fix</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
