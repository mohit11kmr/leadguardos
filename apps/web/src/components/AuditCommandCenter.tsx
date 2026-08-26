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
import { generateAuditPdf } from '../utils/pdfGenerator';
import {
  LayoutDashboard,
  MessageSquare,
  Target,
  SearchCheck,
  Shield,
  Smartphone,
  TrendingDown,
  Sparkles,
  Wrench,
  Grid,
  Download,
  Share2,
  Radio,
  RefreshCw,
  Copy,
  Check,
  ChevronRight,
  ExternalLink,
  Zap,
  Globe,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface AuditCommandCenterProps {
  result: AuditResult;
  onOpenWatchdog: () => void;
  onOpenExpressFix: () => void;
  onOpenAlerts: () => void;
  onOpenShareModal: () => void;
  onRescan?: (url: string) => void;
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
  onRescan,
}) => {
  const [activeTab, setActiveTab] = useState<AuditSubTab>('overview');
  const [copiedAi, setCopiedAi] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const sidebarSections = [
    {
      title: 'AUDIT',
      items: [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard, badge: `${result.score}/100` },
        { id: 'lead', label: 'Lead Capture', icon: MessageSquare, badge: `${result.pillars?.lead?.score ?? Math.round(result.score * 0.9)}` },
        { id: 'ad', label: 'Advertising', icon: Target, badge: `${result.pillars?.ad?.score ?? Math.round(result.score * 0.85)}` },
        { id: 'seo', label: 'SEO & Indexing', icon: SearchCheck, badge: `${result.pillars?.seo?.score ?? Math.round(result.score * 1.05)}` },
        { id: 'security', label: 'Security', icon: Shield, badge: `${result.pillars?.cyber?.score ?? result.score}` },
      ],
    },
    {
      title: 'EXPERIENCE',
      items: [
        { id: 'mobile', label: 'Mobile Experience', icon: Smartphone },
        { id: 'funnel', label: 'Funnel & Revenue', icon: TrendingDown },
      ],
    },
    {
      title: 'AUTOMATION',
      items: [
        { id: 'ai', label: 'AI Fixes', icon: Sparkles },
        { id: 'fix-center', label: 'Fix Center', icon: Wrench, badge: `${result.allIssues?.length || 0}` },
      ],
    },
    {
      title: 'TOOLS',
      items: [
        { id: 'matrix', label: 'Verification Matrix', icon: Grid },
      ],
    },
  ];

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
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyAi = (content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedAi(true);
    setTimeout(() => setCopiedAi(false), 2000);
  };

  const auditDate = result.scannedAt
    ? new Date(result.scannedAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

  return (
    <div className="space-y-7">
      
      {/* Enterprise Workspace Header with Breadcrumb & Action Bar */}
      <div className="border-b border-slate-800/80 pb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1.5">
          {/* Breadcrumb Hierarchy */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <span>LeadGuard OS</span>
            <ChevronRight className="h-3 w-3 text-slate-600" />
            <span>Audit Workspace</span>
            <ChevronRight className="h-3 w-3 text-slate-600" />
            <span className="text-rose-400 font-semibold">{result.domain}</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Globe className="h-5 w-5 text-slate-400" />
              <span>{result.domain}</span>
            </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-900/70 text-slate-300 border border-slate-800/80">
              <Clock className="h-3 w-3 text-slate-400" />
              Audited {auditDate}
            </span>
          </div>
        </div>

        {/* Workspace Quick Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {onRescan && (
            <button
              onClick={() => onRescan(result.targetUrl || result.domain)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800/80 text-xs font-semibold transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Re-scan</span>
            </button>
          )}

          <button
            onClick={handleDownloadPdf}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800/80 text-xs font-semibold transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-rose-400" />
            <span>{isExporting ? 'Exporting...' : 'Export PDF'}</span>
          </button>

          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800/80 text-xs font-semibold transition-colors"
          >
            <Share2 className="h-3.5 w-3.5 text-cyan-400" />
            <span>{copiedLink ? 'Copied' : 'Share'}</span>
          </button>

          <button
            onClick={onOpenWatchdog}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-950/40 hover:bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors"
          >
            <Radio className="h-3.5 w-3.5 text-emerald-400" />
            <span>24/7 Monitoring</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Layout: Left Sidebar + Right Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Workspace Sidebar (Desktop) */}
        <aside className="hidden lg:block lg:col-span-3 space-y-6 sticky top-20">
          <div className="rounded-xl border border-slate-800/70 bg-slate-950/45 p-3 backdrop-blur-xl space-y-5">
            {sidebarSections.map((sec, sIdx) => (
              <div key={sIdx} className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block px-2.5 mb-1">
                  {sec.title}
                </span>
                <div className="space-y-0.5">
                  {sec.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id as AuditSubTab)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-rose-600 text-white shadow-md shadow-rose-950/40'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span
                            className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                              isActive
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-900 text-slate-400 border border-slate-800'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Quick 48h DFY Repair Widget in Sidebar */}
          <div className="rounded-xl border border-rose-500/25 bg-rose-950/15 p-4 space-y-3">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-rose-300 flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-amber-300 fill-amber-300" />
                Need it fixed for you?
              </span>
              <p className="text-xs text-slate-400 leading-snug">
                Senior engineer will fix WhatsApp links, dialers, and pixels within 48 hours.
              </p>
            </div>
            <button
              onClick={onOpenExpressFix}
              className="w-full py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors shadow-sm"
            >
              Get Expert Help (₹2,999)
            </button>
          </div>
        </aside>

        {/* Mobile Horizontal Sub-Navigation Bar */}
        <div className="lg:hidden col-span-1 overflow-x-auto pb-1">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
            {sidebarSections.flatMap((s) => s.items).map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as AuditSubTab)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Main Content Area */}
        <main className="col-span-1 lg:col-span-9 space-y-8">

          {/* 1. OVERVIEW: ScoreDashboard & Unified Fix Center */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <ScoreDashboard
                result={result}
                onOpenWatchdog={onOpenWatchdog}
                onOpenExpressFix={onOpenExpressFix}
                onOpenAlerts={onOpenAlerts}
                onOpenShareModal={onOpenShareModal}
                onSelectPillar={(p) => {
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

          {/* 3. ADVERTISING PILLAR */}
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

          {/* 4. SEO & INDEXING PILLAR */}
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

          {/* 8. AI REMEDIATION GUIDANCE */}
          {activeTab === 'ai' && (
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-6 sm:p-8 space-y-6 backdrop-blur-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-amber-300" />
                    AI Automated Remediation Guidance
                  </span>
                  <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    Structured Code Solutions for {result.domain}
                  </h3>
                </div>

                {result.aiRemediation?.content && (
                  <button
                    onClick={() => handleCopyAi(result.aiRemediation?.content || '')}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold transition-colors border border-slate-800 active:scale-95 shrink-0"
                  >
                    {copiedAi ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-rose-400" />}
                    <span>{copiedAi ? 'Copied' : 'Copy Fix Code'}</span>
                  </button>
                )}
              </div>

              {result.aiRemediation?.status === 'COMPLETED' && result.aiRemediation.content ? (
                <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs sm:text-sm text-slate-300 leading-relaxed overflow-x-auto whitespace-pre-wrap">
                  {result.aiRemediation.content}
                </div>
              ) : (
                <div className="p-8 text-center rounded-xl bg-slate-900/40 border border-slate-800/60 space-y-2">
                  <Sparkles className="h-8 w-8 text-amber-400 mx-auto animate-pulse" />
                  <h4 className="text-sm font-bold text-white">AI Fixes are Being Generated</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
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

        </main>
      </div>
    </div>
  );
};
