import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, Circle, Radio, Globe, Shield, Zap, Target, SearchCheck } from 'lucide-react';
import { motion } from 'motion/react';

interface LiveScanningRadarProps {
  targetUrl: string;
}

interface DiagnosticStage {
  id: string;
  label: string;
  subtext: string;
  icon: any;
}

export const LiveScanningRadar: React.FC<LiveScanningRadarProps> = ({ targetUrl }) => {
  const [progress, setProgress] = useState(15);
  const [activeStage, setActiveStage] = useState(0);

  const stages: DiagnosticStage[] = [
    {
      id: 'availability',
      label: 'Checking website availability & SSL handshake',
      subtext: 'Verifying DNS resolution and HTTPS encryption certificates',
      icon: Globe,
    },
    {
      id: 'whatsapp',
      label: 'Inspecting WhatsApp buttons for +9191 routing errors',
      subtext: 'Checking mobile click-to-chat links, country codes, and pre-filled texts',
      icon: Radio,
    },
    {
      id: 'phone',
      label: 'Verifying click-to-call dialers and contact forms',
      subtext: 'Inspecting tel: protocol links and submission handlers',
      icon: Target,
    },
    {
      id: 'analytics',
      label: 'Scanning Meta Pixel and Google Analytics 4 tags',
      subtext: 'Checking conversion tracking scripts and ad attribution setup',
      icon: Zap,
    },
    {
      id: 'seo',
      label: 'Checking SEO indexing directives and canonical tags',
      subtext: 'Verifying robots noindex tags and search engine crawler visibility',
      icon: SearchCheck,
    },
    {
      id: 'security',
      label: 'Auditing security headers and Content Security Policy',
      subtext: 'Inspecting CSP directives, mixed content, and browser protection headers',
      icon: Shield,
    },
  ];

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev;
        const jump = Math.floor(Math.random() * 8) + 4;
        return Math.min(95, prev + jump);
      });
    }, 250);

    const stageInterval = setInterval(() => {
      setActiveStage((prev) => (prev < stages.length - 1 ? prev + 1 : prev));
    }, 550);

    return () => {
      clearInterval(progressInterval);
      clearInterval(stageInterval);
    };
  }, [stages.length]);

  const cleanDomain = targetUrl.replace(/^https?:\/\//i, '').split('/')[0] || targetUrl;

  return (
    <div className="rounded-3xl border border-slate-800/80 bg-slate-950/90 p-6 sm:p-8 shadow-2xl space-y-6 max-w-3xl mx-auto backdrop-blur-xl">
      
      {/* Target Domain Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Diagnosing Website
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {cleanDomain}
          </h2>
        </div>
        <div className="text-right font-mono text-xl font-bold text-rose-400">
          {progress}%
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900 border border-slate-800">
        <motion.div
          className="h-full bg-gradient-to-r from-rose-600 via-rose-500 to-amber-400"
          initial={{ width: '10%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Diagnostic Checklist */}
      <div className="space-y-3 pt-2">
        {stages.map((stage, idx) => {
          const isDone = activeStage > idx;
          const isCurrent = activeStage === idx;

          return (
            <div
              key={stage.id}
              className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                isCurrent
                  ? 'bg-rose-950/20 border-rose-500/40 text-white'
                  : isDone
                  ? 'bg-slate-900/40 border-slate-800/60 text-slate-300'
                  : 'bg-transparent border-transparent text-slate-500'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : isCurrent ? (
                  <Loader2 className="h-4 w-4 text-rose-400 animate-spin" />
                ) : (
                  <Circle className="h-4 w-4 text-slate-700" />
                )}
              </div>
              <div className="space-y-0.5">
                <div className={`text-xs sm:text-sm font-semibold ${isCurrent ? 'text-rose-200 font-bold' : isDone ? 'text-slate-200' : 'text-slate-500'}`}>
                  {stage.label}
                </div>
                <div className="text-[11px] text-slate-400">
                  {stage.subtext}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
