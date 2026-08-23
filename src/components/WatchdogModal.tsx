import React, { useState } from 'react';
import { X, ShieldAlert, Send, CheckCircle2, BellRing, Sparkles, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { apiFetch } from '../lib/api';

interface WatchdogModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultUrl: string;
}

export const WatchdogModal: React.FC<WatchdogModalProps> = ({ isOpen, onClose, defaultUrl }) => {
  const [url, setUrl] = useState(defaultUrl || '');
  const [contact, setContact] = useState('');
  const [channel, setChannel] = useState<'TELEGRAM' | 'WHATSAPP' | 'EMAIL'>('TELEGRAM');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [testSent, setTestSent] = useState(false);

  if (!isOpen) return null;

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !contact) return;

    setIsSubmitting(true);
    try {
      const res = await apiFetch('/api/watchdog/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUrl: url, contact, channel }),
      });
      const data = await res.json();
      if (data.success) {
        setIsSuccess(true);
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
      }
    } catch (err) {
      console.error('Watchdog subscribe error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSimulateAlert = () => {
    setTestSent(true);
    setTimeout(() => setTestSent(false), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-900 p-6 md:p-8 shadow-2xl space-y-6 my-auto max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-red-400">
              Continuous Uptime & Link Radar
            </span>
            <h3 className="text-xl font-black text-white">24-Hour Watchdog Shield</h3>
          </div>
        </div>

        {!isSuccess ? (
          <form onSubmit={handleActivate} className="space-y-4">
            <p className="text-xs text-slate-300 leading-relaxed">
              Never let a broken link leak your leads again. Our background daemon pings your WhatsApp buttons, 
              Meta pixel scripts, and click-to-call links every 60 minutes. Get instant alerts before you lose customers.
            </p>

            {/* Target URL Input */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Monitored Website URL</label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://yourwebsite.com"
                required
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-white focus:border-red-500 focus:outline-none"
              />
            </div>

            {/* Notification Channel Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Alert Dispatch Channel</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'TELEGRAM', label: 'Telegram Bot' },
                  { id: 'WHATSAPP', label: 'WhatsApp' },
                  { id: 'EMAIL', label: 'Email' },
                ].map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setChannel(ch.id as any)}
                    className={`rounded-xl border p-2 text-xs font-bold uppercase tracking-wider transition-all ${
                      channel === ch.id
                        ? 'border-red-500 bg-red-950/40 text-red-400'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {ch.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Contact Input */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {channel === 'TELEGRAM'
                  ? 'Telegram Username / Chat ID'
                  : channel === 'WHATSAPP'
                  ? 'WhatsApp Phone Number (+91...)'
                  : 'Alert Email Address'}
              </label>
              <input
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder={channel === 'TELEGRAM' ? '@username or 9876543210' : channel === 'WHATSAPP' ? '+91 98765 43210' : 'founder@company.com'}
                required
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-white focus:border-red-500 focus:outline-none"
              />
            </div>

            <button
              id="submit-watchdog-btn"
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 px-5 py-3 text-xs font-bold uppercase tracking-wider text-white active:scale-95 disabled:opacity-50 transition-all shadow-lg shadow-red-900/30"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Connecting to Radar...</span>
                </>
              ) : (
                <>
                  <BellRing className="h-4 w-4" />
                  <span>Activate 24-Hour Free Trial</span>
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="text-center space-y-4 py-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <h4 className="text-xl font-bold text-white">Watchdog Radar Activated!</h4>
            <p className="text-xs text-slate-300 max-w-sm mx-auto">
              Your website <span className="font-semibold text-cyan-400">{url}</span> is now protected under our 24-Hour 
              active surveillance engine. Alerts will be dispatched to <span className="font-semibold text-white">{contact}</span>.
            </p>

            {/* Simulate Test Alert Button */}
            <div className="pt-2">
              <button
                onClick={handleSimulateAlert}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 px-4 py-2 border border-slate-700"
              >
                <Send className="h-3.5 w-3.5 text-cyan-400" />
                <span>Simulate Immediate Test Alert</span>
              </button>

              {testSent && (
                <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3 text-xs text-emerald-300 animate-fade-in text-left font-mono">
                  🚨 <strong>[TEST ALERT]:</strong> Simulated link failure detected on {url}. WhatsApp button ping failed with HTTP 400. Notification delivered!
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-800">
              <button
                onClick={onClose}
                className="rounded-xl bg-slate-800 hover:bg-slate-700 px-5 py-2 text-xs font-semibold text-white transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
