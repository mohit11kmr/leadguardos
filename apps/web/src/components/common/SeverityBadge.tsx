import React from 'react';
import { FindingSeverity } from '../../types';
import { AlertCircle, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';

interface SeverityBadgeProps {
  severity: FindingSeverity | 'HEALTHY' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({
  severity,
  showIcon = true,
  size = 'md',
}) => {
  const norm = severity.toUpperCase();

  const config: Record<string, { label: string; bg: string; text: string; border: string; icon: React.FC<{ className?: string }> }> = {
    CRITICAL: {
      label: 'Critical',
      bg: 'bg-rose-500/15',
      text: 'text-rose-400',
      border: 'border-rose-500/40',
      icon: AlertCircle,
    },
    HIGH: {
      label: 'High',
      bg: 'bg-amber-500/15',
      text: 'text-amber-400',
      border: 'border-amber-500/40',
      icon: AlertTriangle,
    },
    MEDIUM: {
      label: 'Medium',
      bg: 'bg-amber-500/10',
      text: 'text-amber-300',
      border: 'border-amber-500/30',
      icon: AlertTriangle,
    },
    LOW: {
      label: 'Low',
      bg: 'bg-slate-800/80',
      text: 'text-slate-300',
      border: 'border-slate-700',
      icon: Info,
    },
    INFO: {
      label: 'Info',
      bg: 'bg-cyan-500/10',
      text: 'text-cyan-300',
      border: 'border-cyan-500/30',
      icon: Info,
    },
    HEALTHY: {
      label: 'Healthy',
      bg: 'bg-emerald-500/15',
      text: 'text-emerald-400',
      border: 'border-emerald-500/40',
      icon: CheckCircle2,
    },
  };

  const current = config[norm] || config.INFO;
  const Icon = current.icon;

  const sizeClasses = size === 'sm' 
    ? 'px-2 py-0.5 text-[10px] gap-1' 
    : 'px-2.5 py-1 text-xs gap-1.5';

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border ${current.bg} ${current.text} ${current.border} ${sizeClasses}`}
    >
      {showIcon && <Icon className={size === 'sm' ? 'h-3 w-3 shrink-0' : 'h-3.5 w-3.5 shrink-0'} />}
      <span>{current.label}</span>
    </span>
  );
};
