import React, { useState } from 'react';
import { AuditResult, PillarType } from '../types';
import { ScoreDashboard } from './ScoreDashboard';
import { FourPillarsOverview } from './FourPillarsOverview';
import { FindingsDetailTabs } from './FindingsDetailTabs';
import { FixCenter } from './FixCenter';
import { MobileLinkSimulator } from './MobileLinkSimulator';
import { FunnelLeakSimulator } from './FunnelLeakSimulator';
import { RevenueScenarioCalculator } from './RevenueScenarioCalculator';
import { ChannelMatrix } from './ChannelMatrix';
import { FreeFixAndLockedPaywall } from './FreeFixAndLockedPaywall';
import { LayoutDashboard, MessageSquare, Target, SearchCheck, Shield, Smartphone, TrendingDown, Sparkles, Wrench, Grid, Copy, Check, ArrowRight, Zap } from 'lucide-react';

interface AuditCommandCenterProps {
  result: AuditResult;
  onOpenWatchdog: () => void;
  onOpenExpressFix: () => void;
  onOpenAlerts: () => void;
  onOpenShareModal: () => void;
}

export type AuditSubTab =
  | 'overview'
  | 'lead'
  | 'ad'
  | 'seo'
  | 'security'
  | 'mobile'
  | 'funnel'
  | 'ai'
  | 'fix-center'
  | 'matrix';

export const AuditCommandCenter: React.FC<AuditCommandCenterProps> = ({
  result,
  onOpenWatchdog,
  onOpenExpressFix,
  onOpenAlerts,
  onOpenShareModal,
}) => {
  const [activeTab, setActiveTab] = useState<AuditSubTab>('overview');
  const [selectedPillarFilter, setSelectedPillarFilter] = useState<PillarType | 'ALL'>('ALL');
  const [copiedAi, setCopiedAi] = useState(false);

  const subTabs = [
    { id: 'overview', label: 'Command Overview', icon: LayoutDashboard },
    { id: 'lead', label: 'Lead Capture', icon: MessageSquare },
    { id: 'ad', label: 'Advertising & Pixels', icon: Target },
    { id: 'seo', label: 'SEO & Indexing', icon: SearchCheck },
    { id: 'security', label: 'Security & SSL', icon: Shield },
    { id: 'mobile', label: 'Mobile Simulator', icon: Smartphone },
    { id: 'funnel', label: 'Funnel & Revenue', icon: TrendingDown },
    { id: 'ai', label: 'AI Remediation', icon: Sparkles },
    { id: 'fix-center', label: 'Fix Center', icon: Wrench },
    { id: 'matrix', label: 'Verification Matrix', icon: Grid },
  ];

  const handleCopyAi = (content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedAi(true);
    setTimeout(() => setCopiedAi(false), 2000);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Workspace Command Header Navigation Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto p-1.5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-inner">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AuditSubTab)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-950/40 border border-rose-400/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-rose-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sub-Tab View Rendering */}
      <div className="space-y-8">
        
        {/* 1. OVERVIEW: Executive Lead Health Score + Four Pillars + Critical Losses + Fix Center */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <ScoreDashboard
              result={result}
              onOpenWatchdog={onOpenWatchdog}
              onOpenExpressFix={onOpenExpressFix}
              onOpenAlerts={onOpenAlerts}
              onOpenShareModal={onOpenShareModal}
              onSelectPillar={(p) => {
                setSelectedPillarFilter(p);
                if (p === 'LEAD') setActiveTab('lead');
                else if (p === 'AD') setActiveTab('ad');
                else if (p === 'SEO') setActiveTab('seo');
                else if (p === 'CYBER') setActiveTab('security');
              }}
            />

            <FixCenter
              result={result}
              onOpenExpressFix={onOpenExpressFix}
              onOpenWatchdog={onOpenWatchdog}
            />
          </div>
        )}

        {/* 2. LEAD CAPTURE PILLAR */}
        {activeTab === 'lead' && (
          <div className="space-y-8">
            <FourPillarsOverview
              result={result}
              activePillarFilter="LEAD"
              onSelectPillar={() => {}}
            />
            <FindingsDetailTabs
              result={result}
              selectedPillar="LEAD"
              onSelectPillar={() => {}}
              onOpenExpressFix={onOpenExpressFix}
              onOpenWatchdog={onOpenWatchdog}
            />
            <MobileLinkSimulator domain={result.domain} />
          </div>
        )}

        {/* 3. AD & ATTRIBUTION PILLAR */}
        {activeTab === 'ad' && (
          <div className="space-y-8">
            <FourPillarsOverview
              result={result}
              activePillarFilter="AD"
              onSelectPillar={() => {}}
            />
            <FindingsDetailTabs
              result={result}
              selectedPillar="AD"
              onSelectPillar={() => {}}
              onOpenExpressFix={onOpenExpressFix}
              onOpenWatchdog={onOpenWatchdog}
            />
            <RevenueScenarioCalculator
              result={result}
              onOpenExpressFix={onOpenExpressFix}
            />
          </div>
        )}

        {/* 4. SEO & VISIBILITY PILLAR */}
        {activeTab === 'seo' && (
          <div className="space-y-8">
            <FourPillarsOverview
              result={result}
              activePillarFilter="SEO"
              onSelectPillar={() => {}}
            />
            <FindingsDetailTabs
              result={result}
              selectedPillar="SEO"
              onSelectPillar={() => {}}
              onOpenExpressFix={onOpenExpressFix}
              onOpenWatchdog={onOpenWatchdog}
            />
          </div>
        )}

        {/* 5. SECURITY & CYBER PILLAR */}
        {activeTab === 'security' && (
          <div className="space-y-8">
            <FourPillarsOverview
              result={result}
              activePillarFilter="CYBER"
              onSelectPillar={() => {}}
            />
            <FindingsDetailTabs
              result={result}
              selectedPillar="CYBER"
              onSelectPillar={() => {}}
              onOpenExpressFix={onOpenExpressFix}
              onOpenWatchdog={onOpenWatchdog}
            />
          </div>
        )}

        {/* 6. MOBILE EXPERIENCE SIMULATOR */}
        {activeTab === 'mobile' && (
          <div className="space-y-8">
            <MobileLinkSimulator domain={result.domain} />
          </div>
        )}

        {/* 7. FUNNEL LEAK & REVENUE SCENARIO */}
        {activeTab === 'funnel' && (
          <div className="space-y-8">
            <FunnelLeakSimulator result={result} />
            <RevenueScenarioCalculator
              result={result}
              onOpenExpressFix={onOpenExpressFix}
            />
          </div>
        )}

        {/* 8. AI REMEDIATION */}
        {activeTab === 'ai' && (
          <div className="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-6 sm:p-8 space-y-6 backdrop-blur-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div className="space-y-1">
                <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-amber-300" />
                  AI Automated Remediation Guidance
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Tailored Code Patches for {result.domain}
                </h3>
              </div>

              {result.aiRemediation?.content && (
                <button
                  onClick={() => handleCopyAi(result.aiRemediation?.content || '')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors border border-slate-700 active:scale-95 shrink-0"
                >
                  {copiedAi ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-rose-400" />}
                  <span>{copiedAi ? 'Copied to Clipboard' : 'Copy All AI Fixes'}</span>
                </button>
              )}
            </div>

            {result.aiRemediation?.status === 'COMPLETED' && result.aiRemediation.content ? (
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800/80 font-mono text-xs sm:text-sm text-slate-300 leading-relaxed overflow-x-auto whitespace-pre-wrap">
                {result.aiRemediation.content}
              </div>
            ) : (
              <div className="p-8 text-center rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                <Sparkles className="h-8 w-8 text-amber-400 mx-auto animate-pulse" />
                <h4 className="text-base font-bold text-white">AI Fixes are Being Generated</h4>
                <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
                  LeadGuard AI is analyzing the detected broken links and generating contextual code snippets.
                </p>
              </div>
            )}
          </div>
        )}

        {/* 9. UNIFIED FIX CENTER */}
        {activeTab === 'fix-center' && (
          <div className="space-y-8">
            <FixCenter
              result={result}
              onOpenExpressFix={onOpenExpressFix}
              onOpenWatchdog={onOpenWatchdog}
            />
            <FreeFixAndLockedPaywall
              result={result}
              onOpenWatchdog={onOpenWatchdog}
              onOpenExpressFix={onOpenExpressFix}
            />
          </div>
        )}

        {/* 10. COMPREHENSIVE CHANNEL VERIFICATION MATRIX */}
        {activeTab === 'matrix' && (
          <div className="space-y-8">
            <ChannelMatrix result={result} />
          </div>
        )}

      </div>
    </div>
  );
};
