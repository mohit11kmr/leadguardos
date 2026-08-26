import React, { useState } from 'react';
import { AuditResult, AuditIssue, FindingSeverity } from '../types';
import { SeverityBadge } from './common/SeverityBadge';
import { Wrench, ChevronDown, ChevronUp, CheckCircle2, AlertCircle, ExternalLink, Zap, Copy, Check, Code, ShieldAlert, Sparkles, ArrowRight } from 'lucide-react';

interface FixCenterProps {
  result: AuditResult;
  onOpenExpressFix: () => void;
  onOpenWatchdog?: () => void;
}

export const FixCenter: React.FC<FixCenterProps> = ({
  result,
  onOpenExpressFix,
  onOpenWatchdog,
}) => {
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);
  const [copiedFixId, setCopiedFixId] = useState<string | null>(null);

  const allIssues = result.allIssues || [];

  const counts = {
    ALL: allIssues.length,
    CRITICAL: allIssues.filter((i) => i.severity === 'CRITICAL').length,
    HIGH: allIssues.filter((i) => i.severity === 'HIGH').length,
    MEDIUM: allIssues.filter((i) => i.severity === 'MEDIUM').length,
    LOW: allIssues.filter((i) => i.severity === 'LOW').length,
  };

  const filteredIssues = allIssues.filter((i) => {
    if (severityFilter === 'ALL') return true;
    return i.severity === severityFilter;
  });

  const toggleExpand = (id: string) => {
    setExpandedIssueId(expandedIssueId === id ? null : id);
  };

  const copyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedFixId(id);
    setTimeout(() => setCopiedFixId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Fix Center Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <Wrench className="h-4 w-4" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Fix Center
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Actionable fixes prioritized by lead and revenue impact. Fix these to restore dropped customer conversions.
          </p>
        </div>

        {/* Express 48h DFY Action */}
        <button
          onClick={onOpenExpressFix}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-xs sm:text-sm font-semibold text-white transition-all shadow-lg shadow-rose-950/40 active:scale-95 shrink-0"
        >
          <Zap className="h-4 w-4 text-amber-300 fill-amber-300" />
          <span>Get All Fixed in 48h (₹2,999)</span>
        </button>
      </div>

      {/* Severity Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((sev) => {
          const count = counts[sev];
          const isActive = severityFilter === sev;
          return (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                isActive
                  ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-950/50'
                  : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
              }`}
            >
              <span>{sev === 'ALL' ? 'All Issues' : sev.charAt(0) + sev.slice(1).toLowerCase()}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Issues List */}
      {filteredIssues.length === 0 ? (
        <div className="p-8 rounded-2xl border border-slate-800/80 bg-slate-900/40 text-center space-y-2">
          <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
          <h3 className="text-sm font-bold text-white">No {severityFilter.toLowerCase()} issues detected</h3>
          <p className="text-xs text-slate-400">All checks in this severity bracket passed cleanly.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredIssues.map((issue) => {
            const isExpanded = expandedIssueId === issue.id;
            const isCopied = copiedFixId === issue.id;

            return (
              <div
                key={issue.id}
                className="rounded-2xl border border-slate-800/80 bg-slate-900/50 hover:border-slate-700/80 transition-all p-5 sm:p-6 space-y-4 backdrop-blur-sm"
              >
                {/* Issue Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <SeverityBadge severity={issue.severity} />
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        {issue.category} Pillar
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-white">
                      {issue.title}
                    </h3>
                  </div>

                  {/* Top Action CTA */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={onOpenExpressFix}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors"
                    >
                      Get This Fixed
                    </button>
                  </div>
                </div>

                {/* Business Impact / Why It Matters */}
                <div className="rounded-xl bg-slate-950/60 border border-slate-800/60 p-3.5 space-y-1">
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                    Why this matters to your business:
                  </span>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {issue.impact || issue.description}
                  </p>
                </div>

                {/* Recommended Fix */}
                {(issue.recommendation || issue.fixSnippet) && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Recommended Solution:
                    </span>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {issue.recommendation || 'Apply the recommended code fix below.'}
                    </p>
                  </div>
                )}

                {/* Progressive Technical Details Accordion */}
                <div className="pt-2 border-t border-slate-800/60">
                  <button
                    onClick={() => toggleExpand(issue.id)}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors font-medium"
                  >
                    <Code className="h-3.5 w-3.5 text-rose-400" />
                    <span>{isExpanded ? 'Hide technical details' : 'Show technical details & code evidence'}</span>
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>

                  {isExpanded && (
                    <div className="mt-3 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-3 font-mono text-slate-300">
                      <div>
                        <span className="text-slate-400 block mb-1">Issue Identifier:</span>
                        <code className="text-rose-400">{issue.id || issue.ruleId}</code>
                      </div>

                      {issue.evidence && (
                        <div>
                          <span className="text-slate-400 block mb-1">Detected Raw Evidence:</span>
                          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 text-amber-300 overflow-x-auto whitespace-pre-wrap">
                            {typeof issue.evidence === 'string' ? issue.evidence : JSON.stringify(issue.evidence, null, 2)}
                          </div>
                        </div>
                      )}

                      {issue.fixSnippet && (
                        <div>
                          <div className="flex items-center justify-between text-slate-400 mb-1">
                            <span>Fix Code Snippet:</span>
                            <button
                              onClick={() => copyCode(issue.id, issue.fixSnippet || '')}
                              className="inline-flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300"
                            >
                              {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                              <span>{isCopied ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 text-emerald-300 overflow-x-auto whitespace-pre-wrap">
                            {issue.fixSnippet}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
