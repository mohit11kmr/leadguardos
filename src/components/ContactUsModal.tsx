import React, { useState } from 'react';
import { Phone, Mail, MessageCircle, X, ShieldCheck, CheckCircle2, User, Clock, Send, Sparkles, Copy, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface ContactUsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContactUsModal: React.FC<ContactUsModalProps> = ({ isOpen, onClose }) => {
  const { lang, t } = useLanguage();
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [message, setMessage] = useState('');
  const [clientWebsite, setClientWebsite] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  if (!isOpen) return null;

  const phoneNumber = '8307070605';
  const emailAddress = 'mohitsikarwar123@gmail.com';
  const formattedPhone = '+91 83070 70605';

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(phoneNumber);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(emailAddress);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleDirectWhatsApp = () => {
    const defaultMsg = encodeURIComponent(
      message.trim()
        ? `Namaste Mohit, I came across LeadGuard OS. My website is ${clientWebsite || 'my business site'}. ${message}`
        : `Namaste Mohit, I want to consult regarding website lead recovery and LeadGuard OS for my business website: ${clientWebsite || ''}`
    );
    window.open(`https://wa.me/91${phoneNumber}?text=${defaultMsg}`, '_blank');
  };

  const handleSendMessageForm = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      setSentSuccess(true);
      // Auto open WhatsApp directly
      handleDirectWhatsApp();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl rounded-3xl border border-rose-500/30 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 p-6 sm:p-8 shadow-2xl overflow-hidden">
        
        {/* Decorative Glow */}
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 text-white shadow-lg shadow-rose-900/30">
            <User className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-white tracking-tight">Mohit Sikarwar</h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400">
                Founder & Lead Architect
              </span>
            </div>
            <p className="text-xs text-slate-400">LeadGuard OS • Revenue Protection & Inbound Funnel Optimization</p>
          </div>
        </div>

        {/* Contact Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-5">
          {/* Phone / WhatsApp Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Phone & WhatsApp</span>
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Phone className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-sm font-bold text-white font-mono">{formattedPhone}</div>
            <div className="flex items-center gap-1.5 pt-1">
              <button
                type="button"
                onClick={handleDirectWhatsApp}
                className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-sm shadow-emerald-950/40"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span>WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={handleCopyPhone}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                title="Copy Number"
              >
                {copiedPhone ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Email Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Official Email</span>
              <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
                <Mail className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-xs font-bold text-slate-200 truncate font-mono">{emailAddress}</div>
            <div className="flex items-center gap-1.5 pt-1">
              <a
                href={`mailto:${emailAddress}?subject=LeadGuard%20Inquiry%20from%20Business`}
                className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors shadow-sm shadow-sky-950/40"
              >
                <Mail className="h-3.5 w-3.5" />
                <span>Send Email</span>
              </a>
              <button
                type="button"
                onClick={handleCopyEmail}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                title="Copy Email"
              >
                {copiedEmail ? <Check className="h-3.5 w-3.5 text-sky-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Quick Message Form */}
        <form onSubmit={handleSendMessageForm} className="space-y-3 pt-2">
          <div className="text-xs font-bold text-white flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-rose-400" />
            <span>Direct Priority Consultation Request</span>
          </div>

          <div className="space-y-2">
            <input
              type="text"
              placeholder="Your Business Website (e.g. mysite.in)"
              value={clientWebsite}
              onChange={(e) => setClientWebsite(e.target.value)}
              className="w-full rounded-xl bg-slate-900 border border-slate-700/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
            />
            <textarea
              rows={2}
              placeholder="How can we help your business recover lost leads or fix technical bugs?"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-xl bg-slate-900 border border-slate-700/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/40 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSending}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white py-2.5 text-xs font-bold shadow-lg shadow-emerald-950/40 transition-all active:scale-98"
          >
            <MessageCircle className="h-4 w-4" />
            <span>{isSending ? 'Connecting...' : 'Connect Instantly on WhatsApp (+91 83070 70605)'}</span>
          </button>
        </form>

        {/* Trust Footer Note */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-emerald-400" /> Response Time: Under 15 Minutes
          </span>
          <span className="text-emerald-400 font-medium">100% Direct Human Support</span>
        </div>

      </div>
    </div>
  );
};
