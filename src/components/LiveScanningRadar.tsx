import React, { useEffect, useState } from 'react';
import { Loader2, ShieldCheck, CheckCircle2, AlertTriangle, Radio, Sparkles, Zap, Globe, Lock, Cpu } from 'lucide-react';
import { motion } from 'motion/react';

interface LiveScanningRadarProps {
  targetUrl: string;
}

interface ScanStepItem {
  id: string;
  label: string;
  detail: string;
  icon: any;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED';
}

export const LiveScanningRadar: React.FC<LiveScanningRadarProps> = ({ targetUrl }) => {
  const [progress, setProgress] = useState(12);
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  const steps: ScanStepItem[] = [
    {
      id: 'dns',
      label: 'DNS & SSL Encryption Handshake',
      detail: 'Pinging host server and validating SSL certificates...',
      icon: Lock,
      status: activeStepIndex > 0 ? 'COMPLETED' : activeStepIndex === 0 ? 'RUNNING' : 'PENDING',
    },
    {
      id: 'wa',
      label: 'WhatsApp Mobile Routing & Prefix Probe',
      detail: 'Scanning for broken +9191 prefixes and blank chat zero-intent leaks...',
      icon: Radio,
      status: activeStepIndex > 1 ? 'COMPLETED' : activeStepIndex === 1 ? 'RUNNING' : 'PENDING',
    },
    {
      id: 'pixel',
      label: 'Meta Pixel & GA4 Attribution Crawler',
      detail: 'Inspecting DOM for fbq("init") scripts and Google Tag Manager IDs...',
      icon: Zap,
      status: activeStepIndex > 2 ? 'COMPLETED' : activeStepIndex === 2 ? 'RUNNING' : 'PENDING',
    },
    {
      id: 'tel',
      label: 'Telephony & Review Anchor Health',
      detail: 'Verifying Click-to-Call (tel:) buttons and Google Business Profile links...',
      icon: ShieldCheck,
      status: activeStepIndex > 3 ? 'COMPLETED' : activeStepIndex === 3 ? 'RUNNING' : 'PENDING',
    },
    {
      id: 'seo',
      label: 'SEO Visibility & Robots Directives',
      detail: 'Scanning <meta name="robots"> for accidental noindex ranking penalties...',
      icon: Globe,
      status: activeStepIndex > 4 ? 'COMPLETED' : activeStepIndex === 4 ? 'RUNNING' : 'PENDING',
    },
    {
      id: 'ai',
      label: 'AI Revenue Loss Synthesis',
      detail: 'Synthesizing forensic financial risk and generating 1-click fix code...',
      icon: Cpu,
      status: activeStepIndex > 5 ? 'COMPLETED' : activeStepIndex === 5 ? 'RUNNING' : 'PENDING',
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 98) return prev;
        const next = prev + Math.floor(Math.random() * 8) + 4;
        return Math.min(98, next);
      });
    }, 280);

    const stepTimer = setInterval(() => {
      setActiveStepIndex((prev) => (prev < 5 ? prev + 1 : prev));
    }, 420);

    return () => {
      clearInterval(timer);
      clearInterval(stepTimer);
    };
  }, []);

  const cleanDomain = targetUrl.replace(/^https?:\/\//i, '').split('/')[0] || targetUrl;

  return (
    <div className="rounded-3xl border border-rose-500/30 bg-gradient-to-b from-slate-950 via-slate-900/90 to-slate-950 p-6 md:p-8 shadow-2xl space-y-6 relative overflow-hidden">
      {/* Background Animated Radar Sweep */}
      <div className="pointer-events-none absolute -top-12 -right-12 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute -bottom-12 -left-12 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl animate-pulse" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 border border-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Active Forensic Diagnostic in Progress</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>Auditing:</span>
            <span className="text-rose-400 font-mono underline decoration-rose-500/40">{cleanDomain}</span>
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-right">
            <span className="text-[10px] text-slate-400 font-mono uppercase block">Crawler Progress</span>
            <span className="text-xl font-mono font-black text-rose-400">{progress}%</span>
          </div>
        </div>
      </div>

      {/* Live Animated Progress Bar */}
      <div className="space-y-2">
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900 border border-slate-800">
          <motion.div
            className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 shadow-lg shadow-rose-500/50"
            initial={{ width: '10%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>Concurrency: 6 Parallel Probes</span>
          <span className="text-emerald-400">DOM Engine: Live Headless Parser</span>
        </div>
      </div>

      {/* 6 Step Interactive Inspection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.id}
              className={`rounded-2xl p-4 border text-xs space-y-1.5 transition-all ${
                step.status === 'RUNNING'
                  ? 'border-rose-500/60 bg-rose-950/20 shadow-lg shadow-rose-950/40'
                  : step.status === 'COMPLETED'
                  ? 'border-emerald-500/30 bg-slate-950/80'
                  : 'border-slate-800/80 bg-slate-950/40 opacity-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-white">
                  <Icon className={`h-4 w-4 ${step.status === 'RUNNING' ? 'text-rose-400 animate-spin' : step.status === 'COMPLETED' ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span>{step.label}</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    step.status === 'RUNNING'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
                      : step.status === 'COMPLETED'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {step.status === 'RUNNING' ? 'Auditing...' : step.status === 'COMPLETED' ? 'Passed' : 'Queued'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">{step.detail}</p>
            </div>
          );
        })}
      </div>

      {/* Terminal Pulse Bar */}
      <div className="rounded-xl bg-slate-950 border border-slate-800/80 p-3 font-mono text-[11px] text-slate-300 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-slate-400">Stream:</span>
          <span className="text-emerald-300 truncate">
            {steps[activeStepIndex]?.detail || 'Finalizing audit calculation...'}
          </span>
        </div>
        <span className="text-slate-500 hidden sm:inline text-[10px]">LeadGuard v3.2 Engine</span>
      </div>
    </div>
  );
};
