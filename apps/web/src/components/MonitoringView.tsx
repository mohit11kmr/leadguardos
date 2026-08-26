import React, { useState } from 'react';
import { PageHeader } from './common/PageHeader';
import { Radio, Bell, Plus, ShieldCheck, Activity, RefreshCw, Send, Globe, Zap, Clock, Smartphone, MessageSquare, Webhook, Calendar } from 'lucide-react';
import { WatchdogConsole } from './WatchdogConsole';
import { SchedulesView } from './SchedulesView';
import { WebhooksManager } from './WebhooksManager';

interface MonitoringViewProps {
  onOpenNewMonitor: () => void;
}

export type MonitoringSubTab = 'radar' | 'schedules' | 'webhooks';

export const MonitoringView: React.FC<MonitoringViewProps> = ({ onOpenNewMonitor }) => {
  const [activeSubTab, setActiveSubTab] = useState<MonitoringSubTab>('radar');

  const subTabs = [
    { id: 'radar', label: '24/7 Watchdog Radar', icon: Radio, description: 'Live monitoring console polling WhatsApp & pixel uptime' },
    { id: 'schedules', label: 'Automated Schedules', icon: Calendar, description: 'Daily, hourly, and weekly scheduled scan intervals' },
    { id: 'webhooks', label: 'HMAC Webhooks & Integrations', icon: Webhook, description: 'Signed incident dispatchers for Slack, Zapier, Make' },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <PageHeader
        title="24/7 Lead Channel Monitoring & Incident Radar"
        subtitle="Websites break silently after plugin updates, theme redesigns, or CMS changes. LeadGuard polls your lead capture channels continuously to notify you the moment a button fails."
        badge="Level 3 • Protection"
        badgeVariant="emerald"
        actions={
          <button
            onClick={onOpenNewMonitor}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-xs sm:text-sm font-semibold text-white transition-all shadow-lg shadow-rose-950/40 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Protect This Website</span>
          </button>
        }
      />

      {/* Sub-Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-800/80">
        {subTabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeSubTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveSubTab(t.id as MonitoringSubTab)}
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

      {/* Sub-Tab View Rendering */}
      <div className="pt-2">
        {activeSubTab === 'radar' && (
          <WatchdogConsole onOpenNewMonitor={onOpenNewMonitor} />
        )}
        {activeSubTab === 'schedules' && <SchedulesView />}
        {activeSubTab === 'webhooks' && <WebhooksManager />}
      </div>
    </div>
  );
};
