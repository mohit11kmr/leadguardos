import React from 'react';
import { AuditResult } from '../types';
import { MessageCircle, Phone, Target, BarChart3, Search, Star, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

interface ChannelMatrixProps {
  result: AuditResult;
}

export const ChannelMatrix: React.FC<ChannelMatrixProps> = ({ result }) => {
  return (
    <div className="rounded-3xl border border-slate-800/90 bg-slate-900/80 p-6 md:p-8 shadow-xl space-y-6 backdrop-blur-sm">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Channel Forensic Inspection Matrix</h2>
          <p className="text-xs text-slate-400">Deep verification across inbound contact methods & tracking scripts</p>
        </div>
        <span className="rounded-lg bg-slate-950 border border-slate-800 px-3 py-1 text-xs font-mono text-slate-300 self-start sm:self-auto">
          Scanned in {result.performance.totalTimeMs}ms
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* 1. WhatsApp Channel */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <MessageCircle className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">WhatsApp Routing</h3>
                  <span className="text-xs text-slate-400">Mobile Inquiries</span>
                </div>
              </div>
              
              {result.whatsappLinks.length === 0 ? (
                <span className="rounded-full bg-slate-800 text-slate-400 px-2.5 py-0.5 text-[11px] font-semibold">
                  Missing
                </span>
              ) : result.whatsappLinks.some((w) => !w.isValid) ? (
                <span className="rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2.5 py-0.5 text-[11px] font-semibold flex items-center gap-1">
                  <XCircle className="h-3 w-3" /> Format Error
                </span>
              ) : (
                <span className="rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Active & Working
                </span>
              )}
            </div>

            <div className="mt-4 space-y-2">
              {result.whatsappLinks.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No WhatsApp links detected on the page.</p>
              ) : (
                result.whatsappLinks.map((w, idx) => (
                  <div key={idx} className="rounded-xl bg-slate-900/90 p-2.5 border border-slate-800 text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-slate-300 font-mono text-[11px]">
                      <span className="truncate max-w-[200px]">{w.url}</span>
                      <span className={w.isValid ? 'text-emerald-400 font-semibold flex items-center gap-1' : 'text-rose-400 font-semibold'}>
                        {w.isValid ? '✓ Active' : 'Error'}
                      </span>
                    </div>
                    {w.isValid ? (
                      <div className="text-[11px] text-slate-300">
                        <span className="text-emerald-400 font-medium">Chat opens correctly</span>
                        {w.digits && <span className="text-slate-400 ml-1">(+{w.digits.startsWith('91') ? w.digits.slice(0,2) + ' ' + w.digits.slice(2) : w.digits})</span>}
                        {w.hasPrefilledText ? (
                          <p className="text-[10px] text-emerald-300/90 mt-0.5">✓ Pre-filled text: "{w.prefilledText}"</p>
                        ) : (
                          <p className="text-[10px] text-slate-400 mt-0.5">💡 Optional: Add default pre-filled text for higher conversions</p>
                        )}
                      </div>
                    ) : (
                      w.issue && (
                        <p className="text-[11px] text-rose-300 font-medium">{w.issue}</p>
                      )
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
            <span>Routing Standard</span>
            <span className="text-slate-300 font-mono">{result.whatsappLinks.length} Found</span>
          </div>
        </div>

        {/* 2. Click-to-Call Phone */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-300 border border-slate-700/80">
                  <Phone className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Click-to-Call (tel:)</h3>
                  <span className="text-xs text-slate-400">Direct Phone Dialer</span>
                </div>
              </div>

              {result.phoneLinks.some((p) => !p.isValid) ? (
                <span className="rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 text-[11px] font-semibold">
                  Format Check
                </span>
              ) : result.phoneLinks.length > 0 ? (
                <span className="rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Active
                </span>
              ) : (
                <span className="rounded-full bg-slate-800 text-slate-400 px-2.5 py-0.5 text-[11px] font-semibold">
                  Not Detected
                </span>
              )}
            </div>

            <div className="mt-4 space-y-2">
              {result.phoneLinks.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No direct dialer buttons detected on page.</p>
              ) : (
                result.phoneLinks.map((p, idx) => (
                  <div key={idx} className="rounded-xl bg-slate-900/90 p-2.5 border border-slate-800 text-xs">
                    <span className="font-mono text-slate-200">{p.number || p.url}</span>
                    {p.issue && <p className="text-[11px] text-amber-400 mt-1">{p.issue}</p>}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
            <span>Direct Call Links</span>
            <span className="text-slate-300 font-mono">{result.phoneLinks.length} Dialer(s)</span>
          </div>
        </div>

        {/* 3. Meta Pixel (Ad Shield) */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Target className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Meta Pixel (fbq)</h3>
                  <span className="text-xs text-slate-400">Instagram / FB Tracking</span>
                </div>
              </div>

              {result.metaPixel.exists ? (
                <span className="rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Tracking
                </span>
              ) : (
                <span className="rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2.5 py-0.5 text-[11px] font-semibold">
                  Missing
                </span>
              )}
            </div>

            <div className="mt-4">
              {result.metaPixel.exists ? (
                <div className="rounded-xl bg-slate-900/90 p-2.5 border border-slate-800 text-xs">
                  <span className="text-slate-400 text-[11px]">Pixel ID:</span>
                  <p className="font-mono text-emerald-400 font-semibold">{result.metaPixel.pixelId || 'Verified in Header'}</p>
                </div>
              ) : (
                <div className="rounded-xl bg-rose-950/20 p-2.5 border border-rose-900/30 text-xs">
                  <p className="text-rose-300 text-[11px]">
                    No Meta Pixel detected. Ad spend cannot optimize for conversions.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
            <span>Attribution Tag</span>
            <span className={result.metaPixel.exists ? 'text-emerald-400' : 'text-rose-400 font-semibold'}>
              {result.metaPixel.exists ? 'Active' : 'Missing'}
            </span>
          </div>
        </div>

        {/* 4. Google Analytics 4 */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Google Analytics (GA4)</h3>
                  <span className="text-xs text-slate-400">Traffic & Conversion Tracker</span>
                </div>
              </div>

              {result.googleTag.exists ? (
                <span className="rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Synced
                </span>
              ) : (
                <span className="rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 text-[11px] font-semibold">
                  Missing
                </span>
              )}
            </div>

            <div className="mt-4">
              {result.googleTag.exists ? (
                <div className="rounded-xl bg-slate-900/90 p-2.5 border border-slate-800 text-xs">
                  <span className="text-slate-400 text-[11px]">Measurement ID:</span>
                  <p className="font-mono text-amber-400 font-semibold">{result.googleTag.tagId || 'gtag.js verified'}</p>
                </div>
              ) : (
                <div className="rounded-xl bg-amber-950/20 p-2.5 border border-amber-900/30 text-xs">
                  <p className="text-amber-300 text-[11px]">
                    No GA4 / GTM measurement tag detected.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
            <span>Analytics Tracking</span>
            <span className="text-slate-300">{result.googleTag.exists ? 'Installed' : 'Not Detected'}</span>
          </div>
        </div>

        {/* 5. Google SEO Penalty Check */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Search className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Google Indexing & SSL</h3>
                  <span className="text-xs text-slate-400">Robots Meta & Security</span>
                </div>
              </div>

              {result.seoPenalty.hasNoIndex ? (
                <span className="rounded-full bg-rose-600 text-white px-2.5 py-0.5 text-[11px] font-bold">
                  Noindex Blocked
                </span>
              ) : (
                <span className="rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Indexable
                </span>
              )}
            </div>

            <div className="mt-4">
              {result.seoPenalty.hasNoIndex ? (
                <div className="rounded-xl bg-rose-950/30 p-2.5 border border-rose-600/40 text-xs">
                  <p className="text-rose-300 font-semibold text-[11px]">
                    Site contains &lt;meta name="robots" content="noindex"&gt;. Google cannot index this domain!
                  </p>
                </div>
              ) : (
                <div className="rounded-xl bg-slate-900/90 p-2.5 border border-slate-800 text-xs">
                  <p className="text-slate-300 text-[11px]">
                    Robots meta allows indexing. SSL status: {result.seoPenalty.isHttps ? 'Secure (HTTPS)' : 'Insecure (HTTP)'}.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
            <span>Search Visibility</span>
            <span className={result.seoPenalty.hasNoIndex ? 'text-rose-400 font-semibold' : 'text-emerald-400 font-medium'}>
              {result.seoPenalty.hasNoIndex ? 'Blocked' : 'Clean'}
            </span>
          </div>
        </div>

        {/* 6. Google Review Link */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Star className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Google Reviews</h3>
                  <span className="text-xs text-slate-400">Social Proof Shortlinks</span>
                </div>
              </div>

              {result.reviewLinks.some((r) => !r.isValid) ? (
                <span className="rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2.5 py-0.5 text-[11px] font-semibold">
                  Broken Link
                </span>
              ) : result.reviewLinks.length > 0 ? (
                <span className="rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Verified
                </span>
              ) : (
                <span className="rounded-full bg-slate-800 text-slate-400 px-2.5 py-0.5 text-[11px] font-semibold">
                  No Direct Link
                </span>
              )}
            </div>

            <div className="mt-4 space-y-2">
              {result.reviewLinks.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No direct Google Review shortlinks found.</p>
              ) : (
                result.reviewLinks.map((r, idx) => (
                  <div key={idx} className="rounded-xl bg-slate-900/90 p-2.5 border border-slate-800 text-xs">
                    <span className="font-mono text-slate-300 truncate block">{r.url}</span>
                    {r.issue && <p className="text-[11px] text-rose-400 mt-1">{r.issue}</p>}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
            <span>Review Redirection</span>
            <span className="text-slate-300">{result.reviewLinks.length > 0 ? 'Linked' : 'Missing'}</span>
          </div>
        </div>

      </div>

    </div>
  );
};

