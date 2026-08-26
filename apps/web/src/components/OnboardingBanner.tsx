import React from 'react';
import { ShieldCheck, CheckCircle2, Circle, ArrowRight } from 'lucide-react';

interface OnboardingBannerProps {
  currentStep: 'ENTER_URL' | 'AUDIT_RUNNING' | 'RESULTS_READY' | 'WATCHDOG_ACTIVE';
  onNavigateToTab: (tab: any) => void;
}

export const OnboardingBanner: React.FC<OnboardingBannerProps> = ({ currentStep, onNavigateToTab }) => {
  const steps = [
    { id: 'ENTER_URL', label: '1. Enter Website', tab: 'scanner' },
    { id: 'AUDIT_RUNNING', label: '2. Diagnostic Scan', tab: 'scanner' },
    { id: 'RESULTS_READY', label: '3. Fix Priorities', tab: 'scanner' },
    { id: 'WATCHDOG_ACTIVE', label: '4. 24/7 Watchdog', tab: 'watchdog' },
  ];

  const getStepStatus = (stepId: string) => {
    if (stepId === currentStep) return 'ACTIVE';
    if (currentStep === 'WATCHDOG_ACTIVE') return 'COMPLETED';
    if (currentStep === 'RESULTS_READY' && (stepId === 'ENTER_URL' || stepId === 'AUDIT_RUNNING')) return 'COMPLETED';
    if (currentStep === 'AUDIT_RUNNING' && stepId === 'ENTER_URL') return 'COMPLETED';
    return 'PENDING';
  };

  return (
    <div className="rounded-2xl border border-rose-500/30 bg-gradient-to-r from-rose-950/40 via-slate-900/90 to-rose-950/40 p-4 shadow-xl mb-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-rose-600 flex items-center justify-center text-white font-bold shrink-0">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Product Onboarding Journey</h3>
            <p className="text-[11px] text-slate-300">Complete 4 steps to protect your website against silent revenue leaks</p>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {steps.map((s, idx) => {
            const status = getStepStatus(s.id);
            return (
              <React.Fragment key={s.id}>
                <button
                  onClick={() => onNavigateToTab(s.tab)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    status === 'ACTIVE'
                      ? 'bg-rose-600 text-white shadow-md'
                      : status === 'COMPLETED'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-950/60 text-slate-400 border border-slate-800'
                  }`}
                >
                  {status === 'COMPLETED' ? (
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Circle className={`h-3 w-3 ${status === 'ACTIVE' ? 'text-white' : 'text-slate-500'}`} />
                  )}
                  <span>{s.label}</span>
                </button>
                {idx < steps.length - 1 && <ArrowRight className="h-3 w-3 text-slate-600 shrink-0 hidden sm:block" />}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};
