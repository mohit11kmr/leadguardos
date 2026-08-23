import React, { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingDown, ShieldAlert, AlertTriangle, Activity, ArrowUpRight } from 'lucide-react';

interface DashboardData {
  vulnerabilitiesPerDay: { date: string; count: number }[];
  severityDistribution: Record<string, number>;
  riskiestUrls: { domain: string; targetUrl: string; riskScore: number }[];
}

const COLORS = ['#f43f5e', '#f59e0b', '#3b82f6', '#10b981'];

export const ExecutiveDashboardView: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/api/dashboard')
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load executive dashboard data.');
        setData(await response.json());
      })
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-6 text-sm text-rose-200 backdrop-blur-md">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-12 text-center text-sm text-slate-400 font-mono">
        <Activity className="h-6 w-6 text-rose-500 animate-spin mx-auto mb-2" />
        Loading Executive Vulnerability Intelligence...
      </div>
    );
  }

  const pieData = Object.entries(data.severityDistribution).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <TrendingDown className="h-6 w-6 text-rose-400" />
            <h2 className="text-2xl font-extrabold text-white tracking-tight">Executive Intelligence Dashboard</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time vulnerability trends, risk scoring, and severity distributions for the last 7 days.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>7-Day Aggregated Intelligence</span>
        </div>
      </div>

      {/* Grid Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Vulnerabilities Per Day */}
        <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-6 shadow-xl backdrop-blur-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="h-4 w-4 text-rose-400" />
              Vulnerabilities Discovered Per Day
            </h3>
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">TREND LINE</span>
          </div>

          <div className="h-64 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.vulnerabilitiesPerDay}>
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }} />
                <Line type="monotone" dataKey="count" stroke="#f43f5e" strokeWidth={3} dot={{ fill: '#f43f5e', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Severity Distribution */}
        <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-6 shadow-xl backdrop-blur-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-400" />
              Severity Breakdown Distribution
            </h3>
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">PILLAR SEVERITY</span>
          </div>

          <div className="h-64 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label>
                  {pieData.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Top 3 Riskiest URLs */}
      <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-6 shadow-xl backdrop-blur-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-400" />
            Top High-Risk Websites Audited
          </h3>
          <span className="text-xs text-slate-400 font-mono">Ranked by Vulnerability Severity</span>
        </div>

        {data.riskiestUrls.length > 0 ? (
          <div className="divide-y divide-slate-800/80">
            {data.riskiestUrls.map((site) => (
              <div key={site.targetUrl} className="flex items-center justify-between gap-4 py-3.5">
                <div className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                  <span className="font-mono text-sm text-slate-200 font-semibold">{site.domain}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-300 font-bold font-mono text-xs border border-rose-500/30">
                    Risk Score: {site.riskScore}
                  </span>
                  <a
                    href={site.targetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white transition-colors"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400 py-4">No high-risk website findings in the last 7 days.</p>
        )}
      </div>
    </div>
  );
};
