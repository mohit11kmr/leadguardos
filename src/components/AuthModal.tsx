import React, { useState } from 'react';
import { X, Shield, Mail, CheckCircle2, AlertCircle, ArrowRight, UserCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { signInWithGoogle, loginAsDemoUser } = useAuth();
  const [emailInput, setEmailInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await signInWithGoogle();
      onClose();
    } catch (err: any) {
      console.error('Google Sign in error:', err);
      setErrorMessage(
        err.code === 'auth/popup-closed-by-user'
          ? 'Sign-in window was closed. Please try again or use Quick Email login.'
          : err.message || 'Google Sign-in failed. Please try Quick Email login below.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      if (loginAsDemoUser) {
        await loginAsDemoUser(emailInput.trim(), 'USER');
      }
      setSuccessMessage(`Welcome back! Signed in as ${emailInput}`);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMessage('Failed to sign in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemoRole = async (role: 'ADMIN' | 'AGENCY' | 'USER', email: string, name: string) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      if (loginAsDemoUser) {
        await loginAsDemoUser(email, role, name);
      }
      setSuccessMessage(`Signed in as ${name} (${role})`);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMessage('Failed to set demo session.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md rounded-3xl border border-rose-500/30 bg-slate-900 p-6 md:p-8 shadow-2xl space-y-6">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center font-bold text-white shadow-lg border border-rose-400/30">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-rose-400 uppercase tracking-widest flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              LeadGuard Secure Access
            </span>
            <h3 className="text-xl font-extrabold text-white tracking-tight">Sign In to LeadGuard OS</h3>
          </div>
        </div>

        {/* Error / Success Toast */}
        {errorMessage && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-xs text-rose-200 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-3 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Primary Google Sign-In Button */}
        <div className="space-y-3">
          <button
            onClick={handleGoogleSignIn}
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-3 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold py-3.5 px-4 text-xs transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google Account</span>
          </button>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-slate-900 px-3 text-[10px] text-slate-500 font-bold uppercase tracking-wider whitespace-nowrap">
              or sign in with email
            </span>
          </div>
        </div>

        {/* Email Direct Login Form */}
        <form onSubmit={handleEmailSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Business Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="you@company.com"
                className="w-full rounded-xl bg-slate-950 border border-slate-700 pl-10 pr-3.5 py-2.5 text-xs text-white focus:border-rose-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold py-2.5 text-xs transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            <span>Instant Email Login</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </form>

        {/* Quick Presets for Founder / Agency Demo */}
        <div className="pt-3 border-t border-slate-800 space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Quick Account Presets:</span>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={() => handleQuickDemoRole('ADMIN', 'mohitsikarwar123@gmail.com', 'Mohit Sikarwar')}
              className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-colors"
            >
              <UserCheck className="h-4 w-4 text-amber-400 shrink-0" />
              <div>
                <div className="text-[11px] font-bold text-white">Mohit Sikarwar</div>
                <div className="text-[9px] text-amber-400 font-extrabold uppercase">FOUNDER / ADMIN</div>
              </div>
            </button>

            <button
              onClick={() => handleQuickDemoRole('AGENCY', 'agency@leadguard.os', 'Apex Digital Agency')}
              className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-colors"
            >
              <UserCheck className="h-4 w-4 text-rose-400 shrink-0" />
              <div>
                <div className="text-[11px] font-bold text-white">Agency Pro</div>
                <div className="text-[9px] text-rose-400 font-extrabold uppercase">AGENCY LICENSE</div>
              </div>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
