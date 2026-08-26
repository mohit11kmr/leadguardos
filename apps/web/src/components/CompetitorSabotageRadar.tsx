import React, { useState } from 'react';
import { AuditResult, CompetitorSabotageOpportunity } from '../types';
import { Swords, ShieldAlert, Zap, TrendingUp, AlertTriangle, ArrowRight, CheckCircle2, XCircle, Sparkles, ExternalLink, Target, MessageSquare } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface CompetitorSabotageRadarProps {
  currentAudit?: AuditResult | null;
  onSelectProspectForPitch?: (prospect: { domain: string; businessName: string; issues: string }) => void;
}

export const CompetitorSabotageRadar: React.FC<CompetitorSabotageRadarProps> = ({
  currentAudit,
  onSelectProspectForPitch,
}) => {
  const [myUrl, setMyUrl] = useState(currentAudit?.targetUrl || 'https://drsharmadental.in');
  const [competitors, setCompetitors] = useState<string[]>([
    'https://clovedental.in',
    'https://parthadental.com',
    'https://mydentist.co.in',
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sabotageResults, setSabotageResults] = useState<{
    myAudit: AuditResult | null;
    competitors: CompetitorSabotageOpportunity[];
  } | null>(null);

  const handleCompetitorChange = (index: number, value: string) => {
    const updated = [...competitors];
    updated[index] = value;
    setCompetitors(updated);
  };

  const handleRunRadar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myUrl.trim()) {
      setError('Please enter your website URL.');
      return;
    }

    const validComps = competitors.map((c) => c.trim()).filter(Boolean);
    if (validComps.length === 0) {
      setError('Please provide at least 1 competitor URL.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await apiFetch('/api/competitor-sabotage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          myUrl: myUrl.trim(),
          competitorUrls: validComps,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to scan competitor radar.');
      }

      const data = await res.json();
      setSabotageResults({
        myAudit: data.myAudit,
        competitors: data.competitors,
      });
    } catch (err: any) {
      console.error('Sabotage radar error:', err);
      setError(err.message || 'Failed to execute competitor radar scan.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Module Header */}
      <div className="rounded-3xl border border-rose-500/20 bg-cyber-grid bg-slate-950/80 p-6 md:p-8 shadow-2xl backdrop-blur-2xl relative overflow-hidden">
        <div className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 bg-rose-600/15 rounded-full blur-[100px]" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 border border-rose-500/30 px-3.5 py-1 text-xs font-semibold text-rose-300 shadow-sm">
              <Swords className="h-3.5 w-3.5 text-rose-400" />
              <span>Module 1: The Competitor Sabotage Radar Engine</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Exploit Competitor Conversion Flaws & Steal Their High-Intent Leads
            </h2>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Concurrently scan up to 3 competitors. LeadGuard identifies missing Meta Pixels, broken WhatsApp buttons (+9191 errors), and SEO penalties on their sites so you can outbid and outconvert them in real-time.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-center backdrop-blur-md">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-mono font-bold">Scan Engine</span>
              <span className="text-sm font-bold text-emerald-400 flex items-center justify-center gap-1.5 mt-0.5">
                <CheckCircle2 className="h-4 w-4" /> Real DOM Concurrency
              </span>
            </div>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleRunRadar} className="mt-8 space-y-4 pt-6 border-t border-slate-800/80">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* My Website URL */}
            <div className="lg:col-span-1 space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Your Website URL:
              </label>
              <input
                type="text"
                value={myUrl}
                onChange={(e) => setMyUrl(e.target.value)}
                placeholder="https://yourwebsite.com"
                className="w-full rounded-xl bg-slate-900/90 border border-slate-700/80 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Competitor URLs */}
            <div className="lg:col-span-3 space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></span>
                Competitor Target URLs (up to 3):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {competitors.map((comp, idx) => (
                  <input
                    key={idx}
                    type="text"
                    value={comp}
                    onChange={(e) => handleCompetitorChange(idx, e.target.value)}
                    placeholder={`Competitor #${idx + 1} URL`}
                    className="w-full rounded-xl bg-slate-900/90 border border-slate-700/80 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 focus:outline-none"
                  />
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-300 flex items-center gap-2 font-medium">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-rose-950/60 border border-rose-400/30 transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>Scanning All Targets Concurrently...</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 text-amber-300 fill-amber-300" />
                  <span>Run Sabotage Radar Scan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Results View: Split-Screen Comparison */}
      {sabotageResults && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Head-to-Head Sabotage Matrix
              </h3>
              <p className="text-xs text-slate-400">
                Direct side-by-side weakness comparison and weaponized ad tactics
              </p>
            </div>
            <span className="rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-1.5 text-xs text-slate-300 font-mono font-semibold shadow-sm">
              {sabotageResults.competitors.length} Competitors Analyzed
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* 1. Your Website Card */}
            <div className="lg:col-span-1 rounded-3xl border border-emerald-500/30 bg-slate-950/90 p-6 shadow-xl space-y-5 flex flex-col justify-between backdrop-blur-xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-bold uppercase">
                    Your Website
                  </span>
                  <span className="text-xs font-mono text-emerald-400">
                    Health: {sabotageResults.myAudit?.score || 85}/100
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-bold text-white truncate">
                    {sabotageResults.myAudit?.businessName || myUrl.replace(/^https?:\/\//i, '').split('/')[0]}
                  </h4>
                  <p className="text-xs text-slate-400 font-mono truncate">{myUrl}</p>
                </div>

                <div className="space-y-2.5 pt-2 border-t border-slate-800/80 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">WhatsApp Status:</span>
                    <span className={sabotageResults.myAudit?.whatsappLinks.some(w => !w.isValid) ? 'text-rose-400 font-semibold' : 'text-emerald-400 font-medium'}>
                      {sabotageResults.myAudit?.whatsappLinks.some(w => !w.isValid) ? 'Broken' : 'Verified'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Meta Pixel:</span>
                    <span className={sabotageResults.myAudit?.metaPixel.exists ? 'text-emerald-400 font-medium' : 'text-rose-400 font-semibold'}>
                      {sabotageResults.myAudit?.metaPixel.exists ? 'Installed' : 'Missing'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Google GA4:</span>
                    <span className={sabotageResults.myAudit?.googleTag.exists ? 'text-emerald-400 font-medium' : 'text-amber-400'}>
                      {sabotageResults.myAudit?.googleTag.exists ? 'Active' : 'Missing'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-emerald-950/20 border border-emerald-500/20 p-3 text-xs text-emerald-300">
                <p className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Defense Status
                </p>
                <p className="text-[11px] text-slate-300 mt-1">
                  Keep your Meta Pixel active and ensure prefilled WhatsApp UTM tags are live to block competitor takeovers.
                </p>
              </div>
            </div>

            {/* 2. Competitors Sabotage Cards */}
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
              {sabotageResults.competitors.map((comp, idx) => {
                const isHighVuln = comp.sabotageScore >= 60;
                return (
                  <div
                    key={idx}
                    className={`rounded-3xl border ${
                      isHighVuln ? 'border-rose-500/40 bg-gradient-to-b from-rose-950/20 to-slate-950/90' : 'border-slate-800 bg-slate-950/80'
                    } p-5 shadow-xl space-y-4 flex flex-col justify-between`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase">
                          Competitor #{idx + 1}
                        </span>
                        <div className="flex items-center gap-1 text-xs font-extrabold text-rose-400">
                          <Target className="h-3.5 w-3.5" />
                          <span>Vuln: {comp.sabotageScore}%</span>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-white truncate">{comp.domain}</h4>
                        <p className="text-[11px] text-slate-400 truncate">{comp.competitorUrl}</p>
                      </div>

                      {/* Sabotage Opportunities List */}
                      <div className="space-y-2 pt-2 border-t border-slate-800">
                        {comp.opportunities.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">No critical leaks detected on this competitor.</p>
                        ) : (
                          comp.opportunities.map((op, oIdx) => (
                            <div
                              key={oIdx}
                              className="rounded-xl bg-slate-900/90 p-2.5 border border-slate-800 text-xs space-y-1.5"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-rose-300 text-[11px] flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3 text-rose-400 shrink-0" />
                                  {op.title}
                                </span>
                                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-900">
                                  {op.severity}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400">{op.impact}</p>
                              <div className="rounded-lg bg-rose-950/40 p-2 border border-rose-800/40 text-[11px] text-rose-200 font-medium flex items-start gap-1.5">
                                <Zap className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                                <div>
                                  <span className="text-[10px] text-amber-400 font-bold uppercase block">Sabotage Action:</span>
                                  <span>{op.cta}</span>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-3 border-t border-slate-800/80">
                      <button
                        onClick={() => {
                          if (onSelectProspectForPitch) {
                            onSelectProspectForPitch({
                              domain: comp.domain,
                              businessName: comp.domain.replace(/\.[a-z]+$/, '').toUpperCase(),
                              issues: comp.opportunities.map((o) => o.title).join('; ') || 'Competitor Weakness Audit',
                            });
                          }
                        }}
                        className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors"
                      >
                        <MessageSquare className="h-3.5 w-3.5 text-rose-400" />
                        <span>Generate Acquisition Pitch</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
