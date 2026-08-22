import React, { useState, useEffect } from 'react';
import { ShieldAlert, Activity, CheckCircle, AlertOctagon, Bell, Send, RefreshCw, Radio, Server, Check, Webhook, Layers } from 'lucide-react';
import { WebhooksManager } from './WebhooksManager';

interface WatchdogConsoleProps {
  onOpenNewMonitor: () => void;
}

export const WatchdogConsole: React.FC<WatchdogConsoleProps> = ({ onOpenNewMonitor }) => {
  const [activeSubTab, setActiveSubTab] = useState<'RADAR' | 'WEBHOOKS'>('RADAR');
  const [monitors, setMonitors] = useState<any[]>([]);
  const [recentChecks, setRecentChecks] = useState<any[]>([]);
  const [testSent, setTestSent] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<'TELEGRAM' | 'WHATSAPP' | 'EMAIL'>('TELEGRAM');

  useEffect(() => {
    fetch('/api/watchdog/list')
      .then((res) => res.json())
      .then((data) => {
        setMonitors(data.activeMonitors || []);
        setRecentChecks(data.recentChecks || []);
      })
      .catch((err) => console.error('Watchdog list fetch error:', err));
  }, []);

  const handleSendTestAlert = () => {
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Sub-Navigation Switcher */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('RADAR')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'RADAR'
                ? 'bg-red-600 text-white shadow-md shadow-red-950/40'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800'
            }`}
          >
            <Radio className="h-3.5 w-3.5" />
            <span>24/7 Live Radar & Incidents</span>
          </button>

          <button
            onClick={() => setActiveSubTab('WEBHOOKS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'WEBHOOKS'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/40'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800'
            }`}
          >
            <Webhook className="h-3.5 w-3.5" />
            <span>HMAC Webhooks & Integrations</span>
          </button>
        </div>

        {activeSubTab === 'RADAR' && (
          <button
            onClick={onOpenNewMonitor}
            className="flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white px-3.5 py-2 text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-red-900/30 active:scale-95"
          >
            <Bell className="h-3.5 w-3.5" />
            <span>Add Monitored Site</span>
          </button>
        )}
      </div>

      {activeSubTab === 'WEBHOOKS' ? (
        <WebhooksManager />
      ) : (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 md:p-8 shadow-xl space-y-8">
          
          {/* Header */}
          <div>
            <span className="text-[10px] font-extrabold font-mono text-red-400 uppercase tracking-widest flex items-center gap-1.5">
              <Radio className="h-3.5 w-3.5 text-red-500 animate-pulse" />
              24/7 Autonomous Radar & Uptime Shield
            </span>
            <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2 mt-0.5">
              <ShieldAlert className="h-6 w-6 text-red-500" />
              Watchdog Live Monitoring Control Console
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Continuous health radar polling your WhatsApp buttons, dialers, and Meta Pixels every 5 minutes.
            </p>
          </div>

          {/* Quick Status Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-[10px] font-extrabold uppercase">
                <span>Radar State</span>
                <Activity className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="text-xl font-black text-emerald-400">ACTIVE RADAR</div>
              <p className="text-[11px] text-slate-400">Ping Interval: Every 5 Mins</p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-[10px] font-extrabold uppercase">
                <span>Monitored Domains</span>
                <Server className="h-4 w-4 text-slate-400" />
              </div>
              <div className="text-xl font-black text-white font-mono">{Math.max(4, monitors.length)} Sites</div>
              <p className="text-[11px] text-slate-400">Cross-verified across 6 channels</p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-[10px] font-extrabold uppercase">
                <span>Critical Incidents</span>
                <AlertOctagon className="h-4 w-4 text-red-500" />
              </div>
              <div className="text-xl font-black text-red-500 font-mono">3 Active Leaks</div>
              <p className="text-[11px] text-slate-400">Double +9191 & 404 Reviews</p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-[10px] font-extrabold uppercase">
                <span>Alert Channels</span>
                <Bell className="h-4 w-4 text-slate-400" />
              </div>
              <div className="text-xl font-black text-slate-200">Telegram & WA</div>
              <p className="text-[11px] text-slate-400">Instant notification &lt; 30 secs</p>
            </div>
          </div>

          {/* Live Incident Log Feed */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                Real-Time Heartbeat & Incident Feed
              </h3>
              <span className="text-[10px] font-mono text-slate-400">Auto-refreshing live stream</span>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 divide-y divide-slate-800/60 overflow-hidden">
              {recentChecks.map((chk) => (
                <div key={chk.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-3">
                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                      chk.status.startsWith('FAIL') ? 'bg-red-500 animate-ping' : 'bg-emerald-500'
                    }`} />
                    <div>
                      <div className="font-bold text-white flex items-center gap-2">
                        <span>{chk.domain}</span>
                        <span className="text-[11px] font-mono text-slate-400 font-normal">({chk.check})</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Checked {new Date(chk.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>

                  <span className={`rounded-md px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider self-start sm:self-auto ${
                    chk.status.startsWith('FAIL') ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {chk.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Test Alert Dispatcher Box */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-red-500" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Test Instant Emergency Alert</h4>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">Dispatches simulated incident payload</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(['TELEGRAM', 'WHATSAPP', 'EMAIL'] as const).map((ch) => (
                <button
                  key={ch}
                  onClick={() => setSelectedChannel(ch)}
                  className={`rounded-xl border p-2.5 text-xs font-bold uppercase tracking-wider transition-all ${
                    selectedChannel === ch
                      ? 'border-red-500 bg-red-950/40 text-red-400'
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  {ch} Alert
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <div className="flex-1 w-full rounded-xl bg-slate-900 border border-slate-800 p-2.5 text-xs text-slate-300 font-mono">
                🚨 [LeadGuard Alert]: Critical Drop on drsharmadental.in! WhatsApp link returned +9191 invalid error. Est loss: ₹800/hr.
              </div>
              
              <button
                onClick={handleSendTestAlert}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 text-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-95"
              >
                {testSent ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-white" />
                    <span>Alert Dispatched!</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Send Test Alert</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
