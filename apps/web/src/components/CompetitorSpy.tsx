import React, { useState } from 'react';
import { apiFetch } from '../api/client';
import { Swords, ArrowRight, ShieldCheck, AlertOctagon, CheckCircle2, XCircle, TrendingUp, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { AuditResult } from '../types';

interface CompetitorSpyProps {
  currentAudit: AuditResult | null;
}

export const CompetitorSpy: React.FC<CompetitorSpyProps> = ({ currentAudit }) => {
  const [myUrl, setMyUrl] = useState(currentAudit?.domain || 'drsharmadental.in');
  const [competitorUrl, setCompetitorUrl] = useState('clovedental.in');
  const [isComparing, setIsComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comparisonData, setComparisonData] = useState<{
    myAudit: AuditResult | null;
    competitorAudit: AuditResult | null;
    myError?: string | null;
    competitorError?: string | null;
  } | null>(null);

  const handleCompare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myUrl || !competitorUrl) return;

    setIsComparing(true);
    setError(null);
    setComparisonData(null);

    try {
      const response = await apiFetch('/api/competitor-compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          myUrl: myUrl.trim(),
          competitorUrl: competitorUrl.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Competitor audit failed');
      }

      setComparisonData(data);
    } catch (err: any) {
      console.error('Competitor comparison error:', err);
      setError(err?.message || 'Failed to compare websites');
    } finally {
      setIsComparing(false);
    }
  };

  const my = comparisonData?.myAudit;
  const comp = comparisonData?.competitorAudit;

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 md:p-8 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20">
            <Swords className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-red-400">
              Live Head-to-Head Conversion Benchmark
            </span>
            <h2 className="text-2xl font-black text-white tracking-tight">Competitor Spy & Leak Battle</h2>
          </div>
        </div>
        <p className="mt-3 text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
          Compare your real lead funnel side-by-side against any local competitor. Performs a live HTTP audit on both URLs simultaneously to check WhatsApp link routing, Meta Pixel tracking, GA4, dialers, and SEO indexability.
        </p>

        {/* Input Form */}
        <form onSubmit={handleCompare} className="mt-6 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-5">
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Your Website</label>
            <input
              type="text"
              value={myUrl}
              onChange={(e) => setMyUrl(e.target.value)}
              placeholder="e.g. yourbusiness.com"
              required
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-xs text-white focus:border-red-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2 text-center flex items-center justify-center">
            <span className="rounded-full bg-slate-800 border border-slate-700 px-3 py-1 text-xs font-bold text-slate-300">
              VS
            </span>
          </div>

          <div className="sm:col-span-5">
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Competitor Website</label>
            <input
              type="text"
              value={competitorUrl}
              onChange={(e) => setCompetitorUrl(e.target.value)}
              placeholder="e.g. competitor.com"
              required
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-xs text-white focus:border-red-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-12 mt-2">
            <button
              id="run-competitor-battle-btn"
              type="submit"
              disabled={isComparing}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-white active:scale-95 disabled:opacity-50 transition-all shadow-lg shadow-red-900/30 cursor-pointer"
            >
              {isComparing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Scanning both live domains simultaneously...</span>
                </>
              ) : (
                <>
                  <Swords className="h-4 w-4" />
                  <span>Execute Real Head-to-Head Spy Audit</span>
                </>
              )}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-xs text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Comparison Results */}
      {comparisonData && (
        <div className="space-y-6">
          
          {/* Warnings if one site failed */}
          {comparisonData.myError && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-950/30 p-4 text-xs text-amber-300">
              ⚠️ Could not connect to your site ({myUrl}): {comparisonData.myError}
            </div>
          )}
          {comparisonData.competitorError && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-950/30 p-4 text-xs text-amber-300">
              ⚠️ Could not connect to competitor site ({competitorUrl}): {comparisonData.competitorError}
            </div>
          )}

          {my && comp && (
            <>
              {/* Executive Verdict Banner */}
              <div className="rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-6 shadow-xl">
                <div className="flex items-start gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border shrink-0 ${
                    my.score >= comp.score 
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                      : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                  }`}>
                    {my.score >= comp.score ? (
                      <ShieldCheck className="h-6 w-6" />
                    ) : (
                      <AlertOctagon className="h-6 w-6 animate-pulse" />
                    )}
                  </div>
                  <div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      my.score >= comp.score ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      Live Forensic Verdict
                    </span>
                    <h3 className="text-lg font-bold text-white mt-0.5">
                      {my.score > comp.score ? (
                        `Your funnel is outperforming ${comp.domain} (+${my.score - comp.score} score lead advantage)`
                      ) : my.score === comp.score ? (
                        `Both funnels have matched lead scores (${my.score}/100)`
                      ) : (
                        `${comp.domain} has a conversion advantage (+${comp.score - my.score} points higher score)`
                      )}
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {my.score < comp.score ? (
                        `Your site (${my.domain}) is currently leaking an estimated ₹${my.estimatedMonthlyLoss.toLocaleString('en-IN')}/mo in dropped inquiries across ${my.allIssues.length} technical defects compared to ${comp.domain}.`
                      ) : (
                        `Your site (${my.domain}) shows solid lead capture architecture with an estimated monthly loss of ₹${my.estimatedMonthlyLoss.toLocaleString('en-IN')}/mo.`
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Comparison Matrix Table */}
              <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80 shadow-2xl">
                <div className="grid grid-cols-3 p-4 border-b border-slate-800 bg-slate-950/60 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <div>Conversion Channel</div>
                  <div className="text-center text-blue-400">{my.domain} (You)</div>
                  <div className="text-center text-purple-400">{comp.domain} (Competitor)</div>
                </div>

                <div className="divide-y divide-slate-800/80 text-xs">
                  
                  {/* Row 1: Funnel Health */}
                  <div className="grid grid-cols-3 p-4 items-center">
                    <span className="font-semibold text-white">Overall Lead Capture Score</span>
                    <div className={`text-center font-bold font-mono ${my.score >= 80 ? 'text-emerald-400' : my.score >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                      {my.score} / 100
                    </div>
                    <div className={`text-center font-bold font-mono ${comp.score >= 80 ? 'text-emerald-400' : comp.score >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                      {comp.score} / 100
                    </div>
                  </div>

                  {/* Row 2: WhatsApp Link Status */}
                  <div className="grid grid-cols-3 p-4 items-center">
                    <span className="font-semibold text-white">WhatsApp Click-to-Chat</span>
                    <div className="text-center font-semibold flex items-center justify-center gap-1">
                      {my.whatsappLinks.length > 0 && my.whatsappLinks.some((w: any) => w.isValid) ? (
                        <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Working ({my.whatsappLinks.length})</span>
                      ) : my.whatsappLinks.length > 0 ? (
                        <span className="text-rose-400 flex items-center gap-1"><XCircle className="h-4 w-4" /> Broken Link</span>
                      ) : (
                        <span className="text-slate-400">No Link Found</span>
                      )}
                    </div>
                    <div className="text-center font-semibold flex items-center justify-center gap-1">
                      {comp.whatsappLinks.length > 0 && comp.whatsappLinks.some((w: any) => w.isValid) ? (
                        <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Working ({comp.whatsappLinks.length})</span>
                      ) : comp.whatsappLinks.length > 0 ? (
                        <span className="text-rose-400 flex items-center gap-1"><XCircle className="h-4 w-4" /> Broken Link</span>
                      ) : (
                        <span className="text-slate-400">No Link Found</span>
                      )}
                    </div>
                  </div>

                  {/* Row 3: Meta Pixel */}
                  <div className="grid grid-cols-3 p-4 items-center">
                    <span className="font-semibold text-white">Meta Pixel (FB/IG Ads)</span>
                    <div className="text-center font-semibold flex items-center justify-center gap-1">
                      {my.metaPixel?.exists ? (
                        <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Active {my.metaPixel.pixelId ? `(${my.metaPixel.pixelId})` : ''}</span>
                      ) : (
                        <span className="text-rose-400 flex items-center gap-1"><XCircle className="h-4 w-4" /> Missing</span>
                      )}
                    </div>
                    <div className="text-center font-semibold flex items-center justify-center gap-1">
                      {comp.metaPixel?.exists ? (
                        <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Active {comp.metaPixel.pixelId ? `(${comp.metaPixel.pixelId})` : ''}</span>
                      ) : (
                        <span className="text-rose-400 flex items-center gap-1"><XCircle className="h-4 w-4" /> Missing</span>
                      )}
                    </div>
                  </div>

                  {/* Row 4: Google Analytics */}
                  <div className="grid grid-cols-3 p-4 items-center">
                    <span className="font-semibold text-white">Google Analytics / GTM</span>
                    <div className="text-center font-semibold flex items-center justify-center gap-1">
                      {my.googleTag?.exists ? (
                        <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Installed {my.googleTag.tagId ? `(${my.googleTag.tagId})` : ''}</span>
                      ) : (
                        <span className="text-rose-400 flex items-center gap-1"><XCircle className="h-4 w-4" /> Missing</span>
                      )}
                    </div>
                    <div className="text-center font-semibold flex items-center justify-center gap-1">
                      {comp.googleTag?.exists ? (
                        <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Installed {comp.googleTag.tagId ? `(${comp.googleTag.tagId})` : ''}</span>
                      ) : (
                        <span className="text-rose-400 flex items-center gap-1"><XCircle className="h-4 w-4" /> Missing</span>
                      )}
                    </div>
                  </div>

                  {/* Row 5: SEO Indexability */}
                  <div className="grid grid-cols-3 p-4 items-center">
                    <span className="font-semibold text-white">Google SEO Indexability</span>
                    <div className="text-center font-semibold flex items-center justify-center gap-1">
                      {my.seoPenalty?.hasNoIndex ? (
                        <span className="text-rose-400 flex items-center gap-1"><XCircle className="h-4 w-4" /> Blocked (noindex)</span>
                      ) : (
                        <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> 100% Indexable</span>
                      )}
                    </div>
                    <div className="text-center font-semibold flex items-center justify-center gap-1">
                      {comp.seoPenalty?.hasNoIndex ? (
                        <span className="text-rose-400 flex items-center gap-1"><XCircle className="h-4 w-4" /> Blocked (noindex)</span>
                      ) : (
                        <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> 100% Indexable</span>
                      )}
                    </div>
                  </div>

                  {/* Row 6: Click-to-Call Dialer */}
                  <div className="grid grid-cols-3 p-4 items-center">
                    <span className="font-semibold text-white">Click-to-Call Dialer</span>
                    <div className="text-center font-semibold flex items-center justify-center gap-1">
                      {my.phoneLinks.length > 0 && my.phoneLinks.some((p: any) => p.isValid) ? (
                        <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Working ({my.phoneLinks[0].number || 'tel:'})</span>
                      ) : my.phoneLinks.length > 0 ? (
                        <span className="text-rose-400 flex items-center gap-1"><XCircle className="h-4 w-4" /> Malformed Dialer</span>
                      ) : (
                        <span className="text-slate-400">None</span>
                      )}
                    </div>
                    <div className="text-center font-semibold flex items-center justify-center gap-1">
                      {comp.phoneLinks.length > 0 && comp.phoneLinks.some((p: any) => p.isValid) ? (
                        <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Working ({comp.phoneLinks[0].number || 'tel:'})</span>
                      ) : comp.phoneLinks.length > 0 ? (
                        <span className="text-rose-400 flex items-center gap-1"><XCircle className="h-4 w-4" /> Malformed Dialer</span>
                      ) : (
                        <span className="text-slate-400">None</span>
                      )}
                    </div>
                  </div>

                  {/* Row 7: Estimated Revenue Loss */}
                  <div className="grid grid-cols-3 p-4 items-center bg-slate-950/40">
                    <span className="font-bold text-white">Estimated Monthly Revenue Loss</span>
                    <div className="text-center font-extrabold text-rose-400 text-sm font-mono">
                      ₹{my.estimatedMonthlyLoss.toLocaleString('en-IN')} / mo
                    </div>
                    <div className="text-center font-bold text-emerald-400 text-sm font-mono">
                      ₹{comp.estimatedMonthlyLoss.toLocaleString('en-IN')} / mo
                    </div>
                  </div>

                </div>
              </div>
            </>
          )}

        </div>
      )}

    </div>
  );
};
