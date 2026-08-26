import React, { useState } from 'react';
import { PageHeader } from './common/PageHeader';
import { Layers, Briefcase, Crosshair, Swords, Wrench, Sparkles, Plus, Download } from 'lucide-react';
import { AgencyWorkspaceView } from './AgencyWorkspaceView';
import { BatchProspectScanner } from './BatchProspectScanner';
import { AgencyPitchSuite } from './AgencyPitchSuite';
import { CompetitorSabotageRadar } from './CompetitorSabotageRadar';
import { AgencyToolsHub } from './AgencyToolsHub';
import { AuditResult } from '../types';

interface AgencyViewProps {
  currentAudit: AuditResult | null;
  selectedProspectPitch: { domain: string; businessName: string; issues: string } | null;
  onSelectProspectForPitch: (prospect: { domain: string; businessName: string; issues: string }) => void;
}

type AgencySubTab = 'workspace' | 'hunter' | 'pitch' | 'competitor' | 'tools';

export const AgencyView: React.FC<AgencyViewProps> = ({
  currentAudit,
  selectedProspectPitch,
  onSelectProspectForPitch,
}) => {
  const [subTab, setSubTab] = useState<AgencySubTab>(selectedProspectPitch ? 'pitch' : 'workspace');

  const tabs = [
    { id: 'workspace', label: 'Client Workspace', icon: Briefcase, description: 'Manage agency client audits & white-label reports' },
    { id: 'hunter', label: 'Prospect Lead Hunter', icon: Crosshair, description: 'Batch scan 100+ websites to find high-value leads' },
    { id: 'pitch', label: 'AI Cold Pitch Suite', icon: Sparkles, description: 'Generate personalized Hinglish/English outreach pitches' },
    { id: 'competitor', label: 'Competitor Gap Radar', icon: Swords, description: 'Identify competitor conversion leaks' },
    { id: 'tools', label: 'Diagnostic Studio', icon: Wrench, description: 'Auto-fix scripts, link sandbox & widget generator' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <PageHeader
        title="Agency & Growth Workspace"
        subtitle="Tools engineered for digital marketing agencies, SEO consultants, and freelancers to audit client websites, generate white-label reports, and pitch high-ticket retainers."
        badge="Agency Edition"
        badgeVariant="rose"
      />

      {/* Sub-Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-800/80">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = subTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id as AgencySubTab)}
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

      {/* Active Sub-Tab View */}
      <div className="pt-2">
        {subTab === 'workspace' && <AgencyWorkspaceView />}
        {subTab === 'hunter' && (
          <BatchProspectScanner
            onSelectProspectForPitch={(prospect) => {
              onSelectProspectForPitch(prospect);
              setSubTab('pitch');
            }}
          />
        )}
        {subTab === 'pitch' && (
          <AgencyPitchSuite
            currentAudit={
              selectedProspectPitch
                ? {
                    ...(currentAudit || ({} as any)),
                    domain: selectedProspectPitch.domain,
                    businessName: selectedProspectPitch.businessName,
                    aiDiagnosticAdvice: selectedProspectPitch.issues,
                  }
                : currentAudit
            }
          />
        )}
        {subTab === 'competitor' && (
          <CompetitorSabotageRadar
            currentAudit={currentAudit}
            onSelectProspectForPitch={(prospect) => {
              onSelectProspectForPitch(prospect);
              setSubTab('pitch');
            }}
          />
        )}
        {subTab === 'tools' && (
          <AgencyToolsHub
            currentAudit={currentAudit}
            onSelectProspectForPitch={onSelectProspectForPitch}
          />
        )}
      </div>
    </div>
  );
};
