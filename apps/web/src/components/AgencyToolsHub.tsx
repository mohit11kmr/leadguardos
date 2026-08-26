import React, { useState } from 'react';
import { Layers, Smartphone, Swords, MessageSquare, Briefcase, Code } from 'lucide-react';
import { LinkDebuggerSandbox } from './LinkDebuggerSandbox';
import { AutoFixScriptStudio } from './AutoFixScriptStudio';
import { BatchProspectScanner } from './BatchProspectScanner';
import { CompetitorSpy } from './CompetitorSpy';
import { WidgetGenerator } from './WidgetGenerator';
import { AgencyPitchSuite } from './AgencyPitchSuite';
import { AuditResult } from '../types';

interface AgencyToolsHubProps {
  currentAudit: AuditResult | null;
  onSelectProspectForPitch: (prospect: { domain: string; businessName: string; issues: string }) => void;
}

type SubTool = 'debugger' | 'prospect' | 'competitor' | 'widget' | 'pitch' | 'script';

export const AgencyToolsHub: React.FC<AgencyToolsHubProps> = ({
  currentAudit,
  onSelectProspectForPitch,
}) => {
  const [activeSubTool, setActiveSubTool] = useState<SubTool>('debugger');

  const subTools = [
    { id: 'debugger', label: 'Link Debugger & Sandbox', icon: Smartphone },
    { id: 'script', label: '1-Click Auto-Fix Script', icon: Code },
    { id: 'prospect', label: 'Bulk Lead Prospector', icon: Layers },
    { id: 'competitor', label: 'Competitor Gap Spy', icon: Swords },
    { id: 'widget', label: 'WhatsApp Widget Studio', icon: MessageSquare },
    { id: 'pitch', label: 'AI Cold-Pitch Generator', icon: Briefcase },
  ];

  return (
    <div className="space-y-6">
      
      {/* Sub-navigation selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-2 rounded-2xl border border-slate-800/80">
        <div className="flex items-center gap-1.5 overflow-x-auto p-1">
          {subTools.map((tool) => {
            const Icon = tool.icon;
            const isCurrent = activeSubTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => setActiveSubTool(tool.id as SubTool)}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
                  isCurrent
                    ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Icon className={`h-4 w-4 ${isCurrent ? 'text-rose-400' : 'text-slate-400'}`} />
                <span>{tool.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Render selected tool */}
      <div className="transition-all duration-200">
        {activeSubTool === 'debugger' && <LinkDebuggerSandbox />}
        {activeSubTool === 'script' && <AutoFixScriptStudio />}
        {activeSubTool === 'prospect' && (
          <BatchProspectScanner
            onSelectProspectForPitch={(p) => {
              onSelectProspectForPitch(p);
              setActiveSubTool('pitch');
            }}
          />
        )}
        {activeSubTool === 'competitor' && <CompetitorSpy currentAudit={currentAudit} />}
        {activeSubTool === 'widget' && <WidgetGenerator />}
        {activeSubTool === 'pitch' && <AgencyPitchSuite currentAudit={currentAudit} />}
      </div>

    </div>
  );
};
