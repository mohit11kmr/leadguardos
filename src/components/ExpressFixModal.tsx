import React, { useState } from 'react';
import { X, Wrench, Clock, ShieldCheck, Check, Sparkles, MessageCircle, ArrowRight } from 'lucide-react';

interface ExpressFixModalProps {
  isOpen: boolean;
  onClose: () => void;
  domain: string;
}

export const ExpressFixModal: React.FC<ExpressFixModalProps> = ({ isOpen, onClose, domain }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [platform, setPlatform] = useState('WordPress');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const openWhatsAppDirect = () => {
    const text = encodeURIComponent(
      `Hi LeadGuard Team, I want to book the Express 15-Min Lead Leak Fix (₹2,999) for my website: ${domain}. My name is ${name || 'Business Owner'}.`
    );
    window.open(`https://wa.me/918307070605?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-3xl border border-red-800/40 bg-slate-900 p-6 md:p-8 shadow-2xl space-y-6 my-auto max-h-[90vh] overflow-y-auto">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20">
            <Wrench className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-red-400">
              15-Minute Guaranteed Turnaround
            </span>
            <h3 className="text-xl font-black text-white">Done-For-You Express Fix</h3>
          </div>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-2xl bg-slate-950 p-4 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-white">
                <span className="text-slate-300 uppercase tracking-wider text-[11px]">Everything Included in Express Fix:</span>
                <span className="text-red-400 font-black text-base">₹2,999</span>
              </div>
              <ul className="text-xs text-slate-300 space-y-1.5 pt-2 border-t border-slate-800">
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>Fix all broken WhatsApp (+9191, leading 0, format bugs)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>Install & verify Meta Pixel (fbq) with PageView & Lead events</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>Remove accidental &lt;noindex&gt; tags to restore Google rankings</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>Deploy custom high-converting WhatsApp floating widget</span>
                </li>
              </ul>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Your Name / Business</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Dr. Rajesh Sharma"
                required
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-white focus:border-red-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">WhatsApp Mobile Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                required
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-white focus:border-red-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Website CMS Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-white focus:border-red-500 focus:outline-none"
              >
                <option value="WordPress">WordPress / WooCommerce</option>
                <option value="Shopify">Shopify</option>
                <option value="Custom HTML/React">Custom HTML / React / Next.js</option>
                <option value="Wix">Wix / Squarespace</option>
                <option value="Other">Other / Not sure</option>
              </select>
            </div>

            <button
              id="confirm-express-fix-btn"
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 px-5 py-3 text-xs font-bold uppercase tracking-wider text-white active:scale-95 transition-all shadow-lg shadow-red-900/30"
            >
              <Wrench className="h-4 w-4" />
              <span>Confirm & Dispatch Tech Fixer (₹2,999)</span>
            </button>
          </form>
        ) : (
          <div className="text-center space-y-4 py-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <ShieldCheck className="h-8 w-8" />
            </div>

            <h4 className="text-xl font-bold text-white">Fix Request Queued!</h4>
            <p className="text-xs text-slate-300 max-w-sm mx-auto">
              Our lead developer is ready to fix <span className="font-semibold text-rose-400">{domain}</span> immediately. 
              Connect via WhatsApp to share temporary access or coordinate live.
            </p>

            <div className="pt-2">
              <button
                onClick={openWhatsAppDirect}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-5 py-3 text-xs font-bold transition-all shadow-lg shadow-emerald-500/20"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Chat with Tech Specialist on WhatsApp</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <button
                onClick={onClose}
                className="rounded-xl bg-slate-800 hover:bg-slate-700 px-5 py-2 text-xs font-semibold text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
