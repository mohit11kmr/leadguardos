import React, { useState } from 'react';
import { AuditResult, AuditIssue, PillarType, FindingSeverity } from '../types';
import { 
  MessageSquare, 
  Target, 
  Search, 
  ShieldAlert, 
  ShoppingCart, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Terminal, 
  AlertCircle, 
  CheckCircle2, 
  Info,
  Sparkles,
  Lock,
  ArrowRight
} from 'lucide-react';

interface FindingsDetailTabsProps {
  result: AuditResult;
  selectedPillar: PillarType | 'ALL';
  onSelectPillar: (pillar: PillarType | 'ALL') => void;
  onOpenExpressFix: () => void;
  onOpenWatchdog: () => void;
}

export const FindingsDetailTabs: React.FC<FindingsDetailTabsProps> = ({
  result,
  selectedPillar,
  onSelectPillar,
  onOpenExpressFix,
  onOpenWatchdog,
}) => {
  const [selectedSeverity, setSelectedSeverity] = useState<FindingSeverity | 'ALL'>('ALL');
  const [expandedTechnical, setExpandedTechnical] = useState<Record<string, boolean>>({});
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null);

  const toggleTechnical = (id: string) => {
    setExpandedTechnical(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyFixSnippet = (id: string, snippet: string) => {
    navigator.clipboard.writeText(snippet);
    setCopiedSnippetId(id);
    setTimeout(() => setCopiedSnippetId(null), 2000);
  };

  // Filter issues
  const filteredIssues = result.allIssues.filter((issue) => {
    // Pillar filter
    if (selectedPillar !== 'ALL') {
      if (selectedPillar === 'LEAD' && issue.pillar !== 'LEAD' && !['whatsapp', 'phone', 'reviews', 'email'].includes(issue.category)) return false;
      if (selectedPillar === 'AD' && issue.pillar !== 'AD' && issue.category !== 'pixel') return false;
      if (selectedPillar === 'SEO' && issue.pillar !== 'SEO' && issue.category !== 'seo') return false;
      if (selectedPillar === 'CYBER' && issue.pillar !== 'CYBER' && issue.category !== 'cyber') return false;
      if (selectedPillar === 'ECOMMERCE' && issue.pillar !== 'ECOMMERCE' && issue.category !== 'ecommerce') return false;
    }
    // Severity filter
    if (selectedSeverity !== 'ALL' && issue.severity !== selectedSeverity) {
      return false;
    }
    return true;
  });

  const getSeverityBadge = (severity: FindingSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            🔴 CRITICAL
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            🟠 HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">
            🟡 MEDIUM
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/30">
            🔵 LOW / TIP
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
            ⚪ INFO
          </span>
        );
    }
  };

  const getPillarIcon = (pillar: PillarType | string) => {
    switch (pillar) {
      case 'LEAD':
        return <MessageSquare className="h-4 w-4 text-emerald-400" />;
      case 'AD':
        return <Target className="h-4 w-4 text-indigo-400" />;
      case 'SEO':
        return <Search className="h-4 w-4 text-purple-400" />;
      case 'CYBER':
        return <ShieldAlert className="h-4 w-4 text-rose-400" />;
      case 'ECOMMERCE':
        return <ShoppingCart className="h-4 w-4 text-amber-400" />;
      default:
        return <AlertCircle className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <div className="rounded-3xl border border-slate-800/90 bg-slate-900/80 p-6 md:p-8 shadow-xl space-y-6 backdrop-blur-sm">
      
      {/* Header & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            Detailed Diagnostic Findings ({filteredIssues.length})
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Technical evidence, business risk impact, and instant copyable code fixes
          </p>
        </div>

        {/* Severity Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-slate-400 font-medium mr-1">Severity:</span>
          {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const).map((sev) => {
            const isSelected = selectedSeverity === sev;
            return (
              <button
                key={sev}
                onClick={() => setSelectedSeverity(sev)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-slate-200 text-slate-950 shadow-sm'
                    : 'bg-slate-950/70 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {sev === 'ALL' ? 'All' : sev}
              </button>
            );
          })}
        </div>
      </div>

      {/* Pillar Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {[
          { id: 'ALL' as const, label: 'All Pillars', count: result.allIssues.length },
          { id: 'LEAD' as const, label: 'Lead Guardian', count: result.allIssues.filter(i => i.pillar === 'LEAD' || ['whatsapp', 'phone', 'reviews', 'email'].includes(i.category)).length },
          { id: 'AD' as const, label: 'AdShield', count: result.allIssues.filter(i => i.pillar === 'AD' || i.category === 'pixel').length },
          { id: 'SEO' as const, label: 'SEO Shield', count: result.allIssues.filter(i => i.pillar === 'SEO' || i.category === 'seo').length },
          { id: 'CYBER' as const, label: 'Cyber Shield', count: result.allIssues.filter(i => i.pillar === 'CYBER' || i.category === 'cyber').length },
        ].map((tab) => {
          const isActive = selectedPillar === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectPillar(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-950/40'
                  : 'bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${isActive ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-800 text-slate-400'}`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Findings List */}
      <div className="space-y-4">
        {filteredIssues.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-8 text-center space-y-2">
            <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
            <h3 className="text-sm font-bold text-white">No Issues Found in This View</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Great news! No vulnerabilities matching your selected filters were detected by the automated diagnostic rules.
            </p>
          </div>
        ) : (
          filteredIssues.map((issue, idx) => {
            const isTechnicalExpanded = !!expandedTechnical[issue.id];
            const isCopied = copiedSnippetId === issue.id;

            return (
              <div
                key={issue.id || idx}
                className="rounded-2xl border border-slate-800/90 bg-slate-950/80 p-5 space-y-4 hover:border-slate-700/80 transition-all shadow-md backdrop-blur-sm"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {getSeverityBadge(issue.severity)}
                    <span className="text-xs font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      {issue.ruleId || `RULE-${idx + 1}`}
                    </span>
                    {issue.confidence && (
                      <span className="text-[11px] text-slate-400 font-medium">
                        Confidence: <strong className="text-slate-300">{(issue.confidence * 100).toFixed(0)}%</strong>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-800">
                    {getPillarIcon(issue.pillar || issue.category)}
                    <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                      {issue.pillar || issue.category}
                    </span>
                  </div>
                </div>

                {/* Title & Description */}
                <div className="space-y-1.5">
                  <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                    {issue.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {issue.description}
                  </p>
                </div>

                {/* Business Impact Note */}
                {issue.impact && (
                  <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3 flex items-start gap-2.5 text-xs text-slate-300">
                    <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-rose-400 font-semibold">Why It Matters: </strong>
                      <span>{issue.impact}</span>
                    </div>
                  </div>
                )}

                {/* Recommended Fix Box & 1-Click Code Snippet */}
                {issue.fixSnippet && (
                  <div className="rounded-xl bg-slate-900 border border-slate-800 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5" />
                        Recommended 1-Click Fix Code
                      </span>
                      <button
                        onClick={() => copyFixSnippet(issue.id, issue.fixSnippet)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700"
                      >
                        {isCopied ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3 text-slate-400" />
                            <span>Copy Fix</span>
                          </>
                        )}
                      </button>
                    </div>

                    <pre className="text-xs font-mono text-slate-200 bg-slate-950 p-2.5 rounded-lg overflow-x-auto border border-slate-800/80 whitespace-pre-wrap break-all">
                      {issue.fixSnippet}
                    </pre>
                  </div>
                )}

                {/* Expandable Technical Detail & Evidence */}
                {(issue.technical || issue.evidence) && (
                  <div>
                    <button
                      onClick={() => toggleTechnical(issue.id)}
                      className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      <Terminal className="h-3.5 w-3.5" />
                      <span>{isTechnicalExpanded ? 'Hide Technical Evidence' : 'Show Technical Evidence & DOM Trace'}</span>
                      {isTechnicalExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>

                    {isTechnicalExpanded && (
                      <div className="mt-2.5 rounded-xl bg-slate-950 p-3 border border-slate-800 font-mono text-xs text-slate-300 space-y-1.5">
                        {issue.evidence && (
                          <div>
                            <span className="text-slate-500 text-[10px] uppercase font-bold">Evidence:</span>
                            <p className="text-rose-300 break-all">{typeof issue.evidence === 'object' ? JSON.stringify(issue.evidence, null, 2) : issue.evidence}</p>
                          </div>
                        )}
                        {issue.technical && (
                          <div className="pt-1 border-t border-slate-800/60">
                            <span className="text-slate-500 text-[10px] uppercase font-bold">Diagnostic Trace:</span>
                            <p className="text-slate-400">{issue.technical}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

              </div>
            );
          })
        )}
      </div>

      {/* Done-for-You Callout */}
      <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <h4 className="text-sm font-bold text-white flex items-center justify-center sm:justify-start gap-2">
            <Sparkles className="h-4 w-4 text-indigo-400" />
            Want Mohit's Team to Deploy These Fixes For You in 15 Minutes?
          </h4>
          <p className="text-xs text-slate-300">
            Zero downtime express remediation. We verify cross-device WhatsApp routing, Meta Pixel events, and robots indexing directly.
          </p>
        </div>
        <button
          onClick={onOpenExpressFix}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold tracking-wide transition-all shadow-md shadow-indigo-950/40 whitespace-nowrap active:scale-95 flex items-center gap-1.5"
        >
          <span>Get Express Fix (₹2,999)</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

    </div>
  );
};
