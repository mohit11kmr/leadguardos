import React from 'react';
import { AuditResult, PillarType } from '../types';
import { MessageSquare, Target, Search, ShieldAlert, ArrowRight, CheckCircle2, AlertTriangle, XCircle, ShieldCheck } from 'lucide-react';

interface FourPillarsOverviewProps {
  result: AuditResult;
  onSelectPillar: (pillar: PillarType | 'ALL') => void;
  activePillarFilter: PillarType | 'ALL';
}

export const FourPillarsOverview: React.FC<FourPillarsOverviewProps> = ({
  result,
  onSelectPillar,
  activePillarFilter,
}) => {
  const pillars = result.pillars || {
    lead: {
      pillar: 'LEAD' as PillarType,
      title: 'Lead Guardian',
      score: 80,
      weight: 0.35,
      criticalCount: 0,
      warningCount: 0,
      validCount: 2,
      diagnosis: 'Contact channels active.',
      statusText: 'Healthy',
    },
    ad: {
      pillar: 'AD' as PillarType,
      title: 'AdShield',
      score: 75,
      weight: 0.20,
      criticalCount: 0,
      warningCount: 1,
      validCount: 1,
      diagnosis: 'Tracking signals inspected.',
      statusText: 'Moderate',
    },
    seo: {
      pillar: 'SEO' as PillarType,
      title: 'SEO & Penalty Shield',
      score: 85,
      weight: 0.20,
      criticalCount: 0,
      warningCount: 0,
      validCount: 2,
      diagnosis: 'Search engine indexability verified.',
      statusText: 'Healthy',
    },
    cyber: {
      pillar: 'CYBER' as PillarType,
      title: 'Cyber & Hack Shield',
      score: 95,
      weight: 0.25,
      criticalCount: 0,
      warningCount: 0,
      validCount: 1,
      diagnosis: 'No malicious injections or spam found.',
      statusText: 'Clean',
    },
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10 shadow-sm shadow-emerald-950/40';
    if (score >= 50) return 'text-amber-400 border-amber-500/30 bg-amber-500/10 shadow-sm shadow-amber-950/40';
    return 'text-rose-400 border-rose-500/30 bg-rose-500/10 shadow-sm shadow-rose-950/40';
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 80) return 'bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-sm shadow-emerald-500';
    if (score >= 50) return 'bg-gradient-to-r from-amber-600 to-amber-400 shadow-sm shadow-amber-500';
    return 'bg-gradient-to-r from-rose-600 to-rose-400 shadow-sm shadow-rose-500';
  };

  const pillarCards = [
    {
      id: 'LEAD' as PillarType,
      title: 'Lead Guardian',
      weightText: '35% Impact',
      icon: MessageSquare,
      iconColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      data: pillars.lead,
      description: 'WhatsApp, Click-to-Call, Email & Google Maps routing verification.',
    },
    {
      id: 'AD' as PillarType,
      title: 'AdShield',
      weightText: '20% Impact',
      icon: Target,
      iconColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
      data: pillars.ad,
      description: 'Meta Pixel (fbq), Google Tag (GA4), GTM & Conversion attribution.',
    },
    {
      id: 'SEO' as PillarType,
      title: 'SEO & Penalty Shield',
      weightText: '20% Impact',
      icon: Search,
      iconColor: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
      data: pillars.seo,
      description: 'Robots noindex de-indexing risk, Canonical, Sitemap & HTTPS status.',
    },
    {
      id: 'CYBER' as PillarType,
      title: 'Cyber & Hack Shield',
      weightText: '25% Impact',
      icon: ShieldAlert,
      iconColor: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
      data: pillars.cyber,
      description: 'Spam/Gambling keywords, Base64 obfuscation, hidden iframes & mobile redirects.',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-rose-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">4-Pillar Diagnostic Health Breakdown</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Holistic diagnostic audit weighting Customer Reach (35%), Ads (20%), SEO (20%), and Security (25%)
          </p>
        </div>

        {/* Filter Reset / View All */}
        {activePillarFilter !== 'ALL' && (
          <button
            onClick={() => onSelectPillar('ALL')}
            className="text-xs text-rose-400 hover:text-rose-300 font-medium underline underline-offset-4 self-start sm:self-auto transition-colors"
          >
            Show All 4 Pillars
          </button>
        )}
      </div>

      {/* 4 Pillars Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {pillarCards.map((card) => {
          const Icon = card.icon;
          const isSelected = activePillarFilter === card.id;
          const score = card.data.score;
          const isHealthy = score >= 80;
          const isModerate = score >= 50 && score < 80;

          return (
            <div
              key={card.id}
              onClick={() => onSelectPillar(isSelected ? 'ALL' : card.id)}
              className={`rounded-2xl border transition-all duration-300 p-5 flex flex-col justify-between cursor-pointer relative overflow-hidden backdrop-blur-xl ${
                isSelected
                  ? 'border-rose-500 bg-slate-900 shadow-xl shadow-rose-950/40 ring-1 ring-rose-500/50 scale-[1.02]'
                  : 'border-slate-800/80 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900/90 hover:-translate-y-0.5 shadow-lg'
              }`}
            >
              {/* Pillar Header */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${card.iconColor} shadow-md`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-tight">{card.title}</h3>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        {card.weightText}
                      </span>
                    </div>
                  </div>

                  {/* Score badge */}
                  <div className={`px-2.5 py-0.5 rounded-full border text-xs font-bold font-mono ${getScoreColor(score)}`}>
                    {score}/100
                  </div>
                </div>

                {/* Score Progress Bar */}
                <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${getScoreBarColor(score)}`}
                    style={{ width: `${score}%` }}
                  />
                </div>

                {/* Finding Counters */}
                <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                  {card.data.criticalCount > 0 ? (
                    <span className="inline-flex items-center gap-1 text-rose-400 font-semibold">
                      <XCircle className="h-3 w-3" /> {card.data.criticalCount} Critical
                    </span>
                  ) : card.data.warningCount > 0 ? (
                    <span className="inline-flex items-center gap-1 text-amber-400 font-semibold">
                      <AlertTriangle className="h-3 w-3" /> {card.data.warningCount} Warning
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                      <CheckCircle2 className="h-3 w-3" /> 0 Critical Issues
                    </span>
                  )}
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-400">{card.data.statusText}</span>
                </div>

                {/* 1-Line Diagnosis */}
                <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                  {card.data.diagnosis}
                </p>
              </div>

              {/* Action Link */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className={`font-semibold flex items-center gap-1 ${isSelected ? 'text-rose-400' : 'text-slate-400 group-hover:text-slate-200'}`}>
                  {isSelected ? 'Viewing Findings' : 'View Findings'}
                  <ArrowRight className="h-3 w-3" />
                </span>
                <span className="text-[10px] text-slate-500 uppercase font-mono">
                  {card.id}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

