import React, { useEffect, useState } from 'react';
import { GlobalScanStats } from '../types';
import { Globe, AlertTriangle, ShieldCheck, Zap, Activity, RefreshCw, Sparkles, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';

interface ScanCounterStatsProps {
  onRefresh?: () => void;
  statsOverride?: GlobalScanStats | null;
}

export const ScanCounterStats: React.FC<ScanCounterStatsProps> = ({ statsOverride, onRefresh }) => {
  const [stats, setStats] = useState<GlobalScanStats>({
    totalScannedSites: 14820,
    problemsFound: 38490,
    healthySites: 2940,
    fixedByLeadGuard: 11260,
    lastUpdated: new Date().toISOString(),
  });
  const [isLoading, setIsLoading] = useState(false);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/scan-stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        if (onRefresh) {
          onRefresh();
        }
      }
    } catch (err) {
      console.error('Failed to fetch scan stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (statsOverride) {
      setStats(statsOverride);
    }
  }, [statsOverride]);

  useEffect(() => {
    fetchStats();
    // Periodic light telemetry sync every 15s
    const timer = setInterval(() => {
      fetch('/api/scan-stats')
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (d) setStats(d);
        })
        .catch(() => {});
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="rounded-3xl border border-slate-800/90 bg-gradient-to-br from-slate-950 via-slate-900/80 to-slate-950 p-5 sm:p-6 shadow-2xl backdrop-blur-md relative overflow-hidden">
      {/* Background soft glow */}
      <div className="absolute top-0 right-1/4 w-80 h-32 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-80 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <Activity className="h-4 w-4 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
              LeadGuard Global Live Scan Counter
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live Network Active
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Real-time audit telemetry across Indian websites, e-commerce stores & local service funnels
            </p>
          </div>
        </div>

        <button
          onClick={fetchStats}
          disabled={isLoading}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-[11px] font-semibold text-slate-300 transition-colors disabled:opacity-50"
          title="Refresh live counters"
        >
          <RefreshCw className={`h-3 w-3 text-slate-400 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Sync Telemetry</span>
        </button>
      </div>

      {/* 4 Counter Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-4">
        {/* Metric 1: Total Scanned Sites */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
          className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 relative overflow-hidden flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Scanned Sites
            </span>
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Globe className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-white tracking-tight font-mono">
              {stats.totalScannedSites.toLocaleString('en-IN')}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-sky-400 mt-1 font-medium">
              <TrendingUp className="h-3 w-3" />
              <span>कुल स्कैन की गई वेबसाइट्स</span>
            </div>
          </div>
        </motion.div>

        {/* Metric 2: Problems Found in Sites */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
          className="rounded-2xl border border-rose-500/30 bg-gradient-to-b from-rose-950/20 to-slate-900/60 p-4 relative overflow-hidden flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-rose-300 uppercase tracking-wider">
              Problems Found
            </span>
            <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-rose-400 tracking-tight font-mono">
              {stats.problemsFound.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-rose-300/80 mt-1 font-medium flex items-center gap-1">
              <span>पकड़ी गई गलतियाँ / Defects</span>
            </div>
          </div>
        </motion.div>

        {/* Metric 3: Healthy Sites */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
          className="rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/20 to-slate-900/60 p-4 relative overflow-hidden flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
              Healthy Sites
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight font-mono">
              {stats.healthySites.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-emerald-300/80 mt-1 font-medium flex items-center gap-1">
              <span>स्वस्थ / 100% Validated</span>
            </div>
          </div>
        </motion.div>

        {/* Metric 4: Fixed by LeadGuard Sites */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
          className="rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-950/20 to-slate-900/60 p-4 relative overflow-hidden flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
              Fixed By LeadGuard
            </span>
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight font-mono">
              {stats.fixedByLeadGuard.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-amber-300/80 mt-1 font-medium flex items-center gap-1">
              <span>फिक्स & रिकवर की गई साइट्स</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
