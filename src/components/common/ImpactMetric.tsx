import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ImpactMetricProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  variant?: 'rose' | 'amber' | 'emerald' | 'cyan' | 'slate';
  tooltip?: string;
}

export const ImpactMetric: React.FC<ImpactMetricProps> = ({
  label,
  value,
  subtext,
  icon: Icon,
  variant = 'rose',
}) => {
  const styles = {
    rose: {
      border: 'border-rose-500/25',
      bg: 'bg-rose-950/15',
      iconBg: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
      value: 'text-rose-400',
    },
    amber: {
      border: 'border-amber-500/25',
      bg: 'bg-amber-950/15',
      iconBg: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
      value: 'text-amber-400',
    },
    emerald: {
      border: 'border-emerald-500/25',
      bg: 'bg-emerald-950/15',
      iconBg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
      value: 'text-emerald-400',
    },
    cyan: {
      border: 'border-cyan-500/25',
      bg: 'bg-cyan-950/15',
      iconBg: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
      value: 'text-cyan-400',
    },
    slate: {
      border: 'border-slate-800',
      bg: 'bg-slate-900/60',
      iconBg: 'bg-slate-800 border-slate-700 text-slate-400',
      value: 'text-white',
    },
  };

  const current = styles[variant];

  return (
    <div className={`rounded-2xl border ${current.border} ${current.bg} p-4 sm:p-5 flex flex-col justify-between space-y-3 backdrop-blur-md`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {label}
        </span>
        <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${current.iconBg}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div>
        <div className={`text-xl sm:text-2xl font-extrabold tracking-tight ${current.value}`}>
          {value}
        </div>
        {subtext && (
          <p className="text-[11px] sm:text-xs text-slate-400 mt-1 leading-snug">
            {subtext}
          </p>
        )}
      </div>
    </div>
  );
};
