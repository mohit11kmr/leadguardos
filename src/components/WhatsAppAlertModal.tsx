import React, { useState } from 'react';
import { MessageCircle, ShieldCheck, X, CheckCircle2, Zap, Radio, Bell, ArrowRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface WhatsAppAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  domain?: string;
}

export const WhatsAppAlertModal: React.FC<WhatsAppAlertModalProps> = ({
  isOpen,
  onClose,
  domain = 'yourwebsite.com',
}) => {
  const { lang, t } = useLanguage();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) return;
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md rounded-3xl border border-emerald-500/40 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 p-6 sm:p-7 shadow-2xl overflow-hidden">
        
        {/* Glow */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {isSuccess ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-950/40">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">WhatsApp Alerts Activated!</h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                We have registered <span className="text-emerald-400 font-bold">+91 {phoneNumber}</span> for real-time lead leakage notifications for <span className="font-semibold text-white">{domain}</span>.
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 text-left space-y-1">
              <p className="text-emerald-400 font-semibold">✓ 24/7 Automated Link Verification</p>
              <p>✓ Instant alert if WhatsApp +9191 error occurs</p>
              <p>✓ Monthly conversion audit digest</p>
            </div>
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
            >
              Done & Close
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Instant WhatsApp Alert System</h3>
                <p className="text-xs text-slate-400">Get notified the moment any inbound button fails</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Never let an ad campaign burn budget on a broken link. Receive instant alerts on your WhatsApp if a customer is unable to reach you.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3 pt-2">
              <div>
                <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1">
                  Business / Owner Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Rajesh or Sharma Dental"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1">
                  WhatsApp Number (India)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="98765 43210"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-12 rounded-xl bg-slate-900 border border-slate-700/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || phoneNumber.length < 10}
                className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-2.5 text-xs font-bold shadow-lg shadow-emerald-950/40 transition-all active:scale-98"
              >
                <MessageCircle className="h-4 w-4" />
                <span>{isSubmitting ? 'Activating Alerts...' : 'Activate Free WhatsApp Alerts'}</span>
              </button>
            </form>

            <div className="pt-2 text-[10px] text-slate-500 text-center">
              🔒 100% Spam-Free Guarantee. We only ping when your leads are at risk.
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
