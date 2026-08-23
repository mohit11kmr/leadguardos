import React, { useState } from 'react';
import { Briefcase, Sparkles, Copy, Check, Send, TrendingUp, Calculator, ArrowRight, Loader2, MessageSquare, Mail } from 'lucide-react';
import { AuditResult } from '../types';
import { apiFetch } from '../lib/api';

interface AgencyPitchSuiteProps {
  currentAudit: AuditResult | null;
}

export const AgencyPitchSuite: React.FC<AgencyPitchSuiteProps> = ({ currentAudit }) => {
  const [clientName, setClientName] = useState('Dr. Rajesh Sharma');
  const [businessName, setBusinessName] = useState(currentAudit?.businessName || 'Sharma Dental & Implant Center');
  const [issueSummary, setIssueSummary] = useState(
    currentAudit?.allIssues.map((i) => i.title).join(', ') || 'Broken WhatsApp Link (+9191 bug) & Missing Meta Pixel'
  );
  const [channel, setChannel] = useState<'WHATSAPP' | 'EMAIL' | 'INSTAGRAM'>('WHATSAPP');
  const [tone, setTone] = useState<'direct_urgent' | 'consultative' | 'agency_proposal'>('direct_urgent');
  const [language, setLanguage] = useState<'hinglish' | 'english' | 'hindi'>('hinglish');

  const [generatedPitch, setGeneratedPitch] = useState<string>(
    `Namaste Dr. Rajesh Sharma ji,

I was checking your clinic's website today and noticed a critical technical leak on your mobile WhatsApp booking button. 

Right now, the button has a double country code (+9191), so whenever a patient taps to book a consultation on their phone, WhatsApp crashes with an "Invalid Phone Number" error.

Since you are actively marketing your clinic, this is leaking approximately 12–15 patient appointments every month (estimated loss: ₹20,000+).

I run a rapid tech-fix service for clinics in India and can get this resolved + tested in under 15 minutes today.

Would you like me to fix this for you right away?

Best regards,
LeadGuard Specialist`
  );

  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Agency ROI Calculator State
  const [scansPerDay, setScansPerDay] = useState(15);
  const [conversionRate, setConversionRate] = useState(20); // 20%
  const [ticketSize, setTicketSize] = useState(3000); // ₹3,000 per fix

  const dailyCloses = Math.round((scansPerDay * (conversionRate / 100)) * 10) / 10;
  const monthlyRevenue = Math.round(dailyCloses * ticketSize * 26);

  const handleGenerateAiPitch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      const res = await apiFetch('/api/ai/pitch-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName,
          businessName,
          auditSummary: issueSummary,
          tone,
          language,
        }),
      });
      const data = await res.json();
      if (data.pitch) {
        setGeneratedPitch(data.pitch);
      }
    } catch (err) {
      console.error('Failed to generate pitch:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedPitch);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 md:p-8 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Briefcase className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
              Freelancer & Agency Cold Outreach
            </span>
            <h2 className="text-2xl font-black text-white tracking-tight">Agency Cold-Pitch & Revenue Engine</h2>
          </div>
        </div>
        <p className="mt-3 text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
          Turn audit findings into paying clients in 5 minutes. Generate highly tailored, non-spammy Hinglish & English 
          pitches that prove immediate financial leakage to local business owners.
        </p>
      </div>

      {/* 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Controls Column (Col 6) */}
        <div className="lg:col-span-6 space-y-6">
          
          <form onSubmit={handleGenerateAiPitch} className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              Pitch Customization Parameters
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Owner / Client Name</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Dr. Rajesh Sharma"
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Business Name</label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Sharma Dental Clinic"
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-white focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="block text-slate-300 font-semibold mb-1">Audit Leakage Findings</label>
              <textarea
                value={issueSummary}
                onChange={(e) => setIssueSummary(e.target.value)}
                rows={2}
                placeholder="e.g. Broken +9191 WhatsApp link, Missing Meta Pixel, Accidental noindex tag"
                className="w-full rounded-xl bg-slate-950 border border-slate-700 p-3 text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Outreach Channel</label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as any)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white focus:outline-none"
                >
                  <option value="WHATSAPP">WhatsApp DM</option>
                  <option value="EMAIL">Cold Email</option>
                  <option value="INSTAGRAM">Instagram DM</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Tone of Voice</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value as any)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white focus:outline-none"
                >
                  <option value="direct_urgent">Direct & High Urgency</option>
                  <option value="consultative">Consultative Partner</option>
                  <option value="agency_proposal">Full Agency Proposal</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as any)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white focus:outline-none"
                >
                  <option value="hinglish">Hinglish</option>
                  <option value="english">English</option>
                  <option value="hindi">Hindi</option>
                </select>
              </div>
            </div>

            <button
              id="generate-cold-pitch-btn"
              type="submit"
              disabled={isGenerating}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 px-5 py-3 text-xs font-bold uppercase tracking-wider text-white active:scale-95 disabled:opacity-50 transition-all shadow-lg shadow-red-900/30"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>AI Generating Personalized Pitch...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Generate High-Converting Pitch</span>
                </>
              )}
            </button>
          </form>

          {/* Agency ROI Simulator Card */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Agency Monthly Revenue Simulator
              </h3>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Audits / Day</label>
                <input
                  type="number"
                  value={scansPerDay}
                  onChange={(e) => setScansPerDay(Number(e.target.value))}
                  min={1}
                  max={100}
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Close Rate (%)</label>
                <input
                  type="number"
                  value={conversionRate}
                  onChange={(e) => setConversionRate(Number(e.target.value))}
                  min={1}
                  max={100}
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Fee per Fix (₹)</label>
                <input
                  type="number"
                  value={ticketSize}
                  onChange={(e) => setTicketSize(Number(e.target.value))}
                  min={500}
                  step={500}
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white font-mono"
                />
              </div>
            </div>

            <div className="rounded-2xl bg-slate-950 p-4 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block">Projected Monthly Agency Revenue:</span>
                <span className="text-2xl font-extrabold text-emerald-400">
                  ₹{monthlyRevenue.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  ({dailyCloses} clients/day × ₹{ticketSize.toLocaleString('en-IN')} × 26 days)
                </span>
              </div>
              <div className="rounded-full bg-emerald-500/10 border border-emerald-500/30 p-2.5 text-emerald-400">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
          </div>

        </div>

        {/* Generated Pitch View (Col 6) */}
        <div className="lg:col-span-6 space-y-4">
          
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              {channel === 'WHATSAPP' ? <MessageSquare className="h-3.5 w-3.5 text-emerald-400" /> : <Mail className="h-3.5 w-3.5 text-cyan-400" />}
              Ready-to-Send Outreach Message
            </span>
            <button
              id="copy-pitch-btn"
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3 py-1.5 text-xs font-bold transition-all active:scale-95 shadow-md shadow-emerald-500/20"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Pitch</span>
                </>
              )}
            </button>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5 shadow-2xl space-y-4">
            <textarea
              value={generatedPitch}
              onChange={(e) => setGeneratedPitch(e.target.value)}
              rows={16}
              className="w-full bg-transparent text-xs sm:text-sm text-slate-200 leading-relaxed font-sans focus:outline-none resize-none"
            />

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>{generatedPitch.length} characters</span>
              <span className="text-emerald-400 font-semibold">100% Non-Spammy • High Reply Rate</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
