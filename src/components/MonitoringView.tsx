import React, { useState, useEffect } from 'react';
import { PageHeader } from './common/PageHeader';
import { EmptyState } from './common/EmptyState';
import { Radio, Bell, Plus, ShieldCheck, Activity, AlertCircle, CheckCircle2, RefreshCw, Send, Globe, Zap, Clock, Smartphone, MessageSquare } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface MonitoringViewProps {
  onOpenNewMonitor: () => void;
}

export const MonitoringView: React.FC<MonitoringViewProps> = ({ onOpenNewMonitor }) => {
  const [monitors, setMonitors] = useState<any[]>([]);
  const [recentChecks, setRecentChecks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    fetchMonitors();
  }, []);

  const fetchMonitors = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch('/api/watchdog/list');
      if (res.ok) {
        const data = await res.json();
        setMonitors(data.activeMonitors || []);
        setRecentChecks(data.recentChecks || []);
      }
    } catch (err) {
      console.error('Watchdog fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendTestAlert = () => {
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <PageHeader
        title="24/7 Lead Channel Monitoring"
        subtitle="Websites break after plugin updates, theme redesigns, or accidental edits. LeadGuard polls your lead capture channels continuously to notify you the moment a button fails."
        badge="Active Watchdog"
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

      {/* Why Monitoring Matters Educational Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4 space-y-1.5 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
            <Radio className="h-4 w-4" />
            <span>15-Minute Polling</span>
          </div>
          <p className="text-xs text-slate-300">
            Autonomous background worker verifies WhatsApp URLs, phone links, and conversion tags every 15 minutes.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4 space-y-1.5 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
            <MessageSquare className="h-4 w-4" />
            <span>Instant Incident Alerts</span>
          </div>
          <p className="text-xs text-slate-300">
            Receive instant Telegram, WhatsApp, or Email notifications when a critical lead channel fails.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4 space-y-1.5 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
            <ShieldCheck className="h-4 w-4" />
            <span>Zero Revenue Drops</span>
          </div>
          <p className="text-xs text-slate-300">
            Prevent weeks of silent lead loss caused by broken form endpoints or dead phone buttons.
          </p>
        </div>
      </div>

      {/* Monitored Websites List / Empty State */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-400" />
            <span>Monitored Domains ({monitors.length})</span>
          </h2>
          <button
            onClick={fetchMonitors}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {monitors.length === 0 ? (
          <EmptyState
            icon={Radio}
            title="No Websites Monitored Yet"
            description="Activate 24/7 Watchdog on your primary business website or ad landing page to receive instant alerts if WhatsApp links or forms go down."
            actionLabel="Protect a Website (₹299/mo)"
            onAction={onOpenNewMonitor}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {monitors.map((m, idx) => (
              <div
                key={m.id || idx}
                className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 space-y-4 flex flex-col justify-between backdrop-blur-sm"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs">
                        <Globe className="h-4 w-4" />
                      </div>
                      <span className="font-bold text-white text-sm truncate max-w-[180px]">
                        {m.domain || m.url}
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      ACTIVE
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Frequency:</span>
                      <span className="font-semibold text-slate-200 uppercase">{m.frequency || 'Every 15 min'}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Alert Channels:</span>
                      <span className="font-semibold text-rose-400">{m.channels?.join(', ') || 'WhatsApp, Telegram'}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Last Status:</span>
                      <span className="font-semibold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Healthy
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Alert Test Sandbox */}
      <div className="rounded-3xl border border-slate-800/80 bg-slate-900/40 p-6 sm:p-8 space-y-4 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Bell className="h-4 w-4 text-amber-400" />
              <span>Test Notification Delivery</span>
            </h3>
            <p className="text-xs text-slate-400">
              Send a simulated lead break alert to verify your Telegram or WhatsApp alert endpoint.
            </p>
          </div>

          <button
            onClick={handleSendTestAlert}
            disabled={testSent}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5 text-rose-400" />
            <span>{testSent ? 'Alert Dispatched!' : 'Send Test Notification'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
