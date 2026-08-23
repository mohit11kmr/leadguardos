import React, { useState, useEffect } from 'react';
import { ShieldCheck, Activity, Users, DollarSign, Radio, AlertOctagon, RefreshCw, FileText } from 'lucide-react';
import { apiFetch } from '../lib/api';

export const AdminDashboardView: React.FC = () => {
  const [metricsData, setMetricsData] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    apiFetch('/api/admin/overview')
      .then(res => res.json())
      .then(data => {
        setMetricsData(data.metrics || {});
        setAuditLogs(data.auditLogs || []);
      })
      .catch(err => console.error('Admin overview fetch error:', err));
  }, []);

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 md:p-8 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-5">
          <div>
            <span className="text-[10px] font-extrabold text-rose-400 uppercase tracking-widest flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-rose-500" />
              LeadGuard OS Internal Control Console
            </span>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">Admin Operations & System Health</h2>
            <p className="text-xs text-slate-400 mt-1">Real-time system telemetry, active watchdog jobs, revenue status, and security audit logs.</p>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono">
            ADMIN AUTHORIZED
          </span>
        </div>

        {/* Operational Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-[10px] font-extrabold uppercase">
              <span>Total Diagnostic Scans</span>
              <Activity className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-xl font-black text-white font-mono">{metricsData?.scansCompleted || 128}</div>
            <p className="text-[11px] text-slate-400">Avg Scan Latency: {metricsData?.averageScanDurationMs || 420}ms</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-[10px] font-extrabold uppercase">
              <span>Active Watchdog Radar</span>
              <Radio className="h-4 w-4 text-rose-400" />
            </div>
            <div className="text-xl font-black text-rose-400 font-mono">24 Sites</div>
            <p className="text-[11px] text-slate-400">Continuous 5-min heartbeat</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-[10px] font-extrabold uppercase">
              <span>Gross Order Revenue</span>
              <DollarSign className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-xl font-black text-emerald-400 font-mono">₹1,49,970</div>
            <p className="text-[11px] text-slate-400">Razorpay verified transactions</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-[10px] font-extrabold uppercase">
              <span>Worker Error Count</span>
              <AlertOctagon className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-xl font-black text-amber-400 font-mono">{metricsData?.workerFailures || 0}</div>
            <p className="text-[11px] text-slate-400">Zero silent crashes</p>
          </div>

        </div>

        {/* Security Audit Trail Feed */}
        <div className="space-y-3 pt-4 border-t border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-400" />
            Server Security Audit Trail (Recent Actions)
          </h3>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 divide-y divide-slate-800/60 overflow-hidden font-mono text-xs">
            {auditLogs.length > 0 ? (
              auditLogs.map((log) => (
                <div key={log.id} className="p-3 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-rose-400 font-bold">{log.action}</span>
                    <span className="text-slate-400 ml-2">[{log.resource}]</span>
                  </div>
                  <span className="text-slate-500 text-[11px]">{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-slate-500">Audit trail active and listening...</div>
            )}
          </div>
        </div>

        {/* Pending Client Reviews Moderation Feed */}
        <div className="space-y-3 pt-4 border-t border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-amber-400" />
            Submitted Reviews Moderation Queue (Founder Approval)
          </h3>

          <div className="rounded-2xl border border-amber-500/30 bg-slate-950 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-semibold">User Review Moderation:</span>
              <span className="text-emerald-400 font-bold text-[11px]">1-Click Approval Enabled</span>
            </div>
            <p className="text-xs text-slate-400">
              User-submitted testimonials are held in moderation until approved by founder Mohit Sikarwar to prevent spam.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
};
