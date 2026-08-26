import React, { useState } from 'react';
import { PageHeader } from './common/PageHeader';
import { TrendingDown, Calculator, MessageCircle, ShoppingCart, Swords, LineChart, Sparkles, AlertTriangle, ArrowRight } from 'lucide-react';
import { ExecutiveDashboardView } from './ExecutiveDashboardView';
import { FunnelLeakSimulator } from './FunnelLeakSimulator';
import { RevenueScenarioCalculator } from './RevenueScenarioCalculator';
import { ZeroIntentChecker } from './ZeroIntentChecker';
import { CartDeathMonitor } from './CartDeathMonitor';
import { CompetitorSabotageRadar } from './CompetitorSabotageRadar';
import { AuditResult } from '../types';

interface IntelligenceViewProps {
  currentAudit: AuditResult | null;
  onOpenExpressFix: () => void;
  onSelectProspectForPitch: (prospect: { domain: string; businessName: string; issues: string }) => void;
  onScanNewStore?: (url: string) => void;
}

export type IntelligenceSubTab = 'executive' | 'funnel' | 'revenue' | 'zero-intent' | 'cart-death' | 'sabotage';

export const IntelligenceView: React.FC<IntelligenceViewProps> = ({
  currentAudit,
  onOpenExpressFix,
  onSelectProspectForPitch,
  onScanNewStore,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<IntelligenceSubTab>('executive');

  const subTabs = [
    { id: 'executive', label: 'Executive Intelligence', icon: LineChart, description: 'Vulnerability trends & 7-day risk analysis' },
    { id: 'funnel', label: 'Funnel Leak Simulator', icon: TrendingDown, description: 'Simulate ad spend dropoffs & conversion leaks' },
    { id: 'revenue', label: 'Revenue Scenario', icon: Calculator, description: 'Interactive financial modeling & loss calculation' },
    { id: 'zero-intent', label: 'WhatsApp Zero-Intent', icon: MessageCircle, description: 'Check mobile pre-filled message conversion rates' },
    { id: 'cart-death', label: 'Cart Leakage Monitor', icon: ShoppingCart, description: 'E-commerce cart abandonment & checkout health' },
    { id: 'sabotage', label: 'Competitor Sabotage Radar', icon: Swords, description: 'Audit competitor landing pages & exploit leaks' },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Workspace Header */}
      <PageHeader
        title="Revenue Intelligence & Conversion Modeling"
        subtitle="Advanced diagnostic models to simulate marketing funnel drop-offs, quantify rupee loss scenarios, analyze competitor vulnerabilities, and optimize lead velocity."
        badge="Level 2 • Intelligence"
        badgeVariant="cyan"
      />

      {/* Sub-Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-800/80">
        {subTabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeSubTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveSubTab(t.id as IntelligenceSubTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-950/40 border border-rose-400/30'
                  : 'bg-slate-900/80 text-slate-400 border border-slate-800 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-rose-400'}`} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sub-Tab Content Views */}
      <div className="pt-2">
        {activeSubTab === 'executive' && <ExecutiveDashboardView />}

        {activeSubTab === 'funnel' && (
          <FunnelLeakSimulator result={currentAudit || ({} as any)} />
        )}

        {activeSubTab === 'revenue' && (
          <RevenueScenarioCalculator
            result={currentAudit || ({
              score: 62,
              domain: 'example.com',
              estimatedMonthlyLoss: 42500,
              allIssues: [],
            } as any)}
            onOpenExpressFix={onOpenExpressFix}
          />
        )}

        {activeSubTab === 'zero-intent' && (
          <ZeroIntentChecker auditResult={currentAudit} />
        )}

        {activeSubTab === 'cart-death' && (
          <CartDeathMonitor
            auditResult={currentAudit}
            onScanNewStore={onScanNewStore || (() => {})}
          />
        )}

        {activeSubTab === 'sabotage' && (
          <CompetitorSabotageRadar
            currentAudit={currentAudit}
            onSelectProspectForPitch={onSelectProspectForPitch}
          />
        )}
      </div>
    </div>
  );
};
