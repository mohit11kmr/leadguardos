import React, { useState } from 'react';
import { MessageSquare, Sparkles, Copy, Check, Palette, Smartphone, Send, ArrowRight, ShieldCheck, RefreshCw, Loader2 } from 'lucide-react';
import { WidgetCustomization } from '../types';

export const WidgetGenerator: React.FC = () => {
  const [config, setConfig] = useState<WidgetCustomization>({
    phoneNumber: '919876543210',
    businessName: 'Dr. Sharma Dental Care',
    tagline: 'Online • Typical reply in 2 mins',
    welcomeMessage: 'Namaste! 👋 How can we help you today? Tap below to chat directly with our specialist on WhatsApp.',
    prefilledMessage: 'Hi Dr. Sharma, I saw your website and would like to book a dental checkup slot this week!',
    brandColor: '#10b981', // Emerald
    position: 'bottom-right',
    avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80',
    showBadge: true,
    badgeText: '1',
    autoOpenDelay: 4,
  });

  const [isOpenPreview, setIsOpenPreview] = useState(true);
  const [copied, setCopied] = useState(false);
  const [category, setCategory] = useState('Dental Clinic');
  const [langMode, setLangMode] = useState('hinglish');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([
    'Hi Dr. Sharma, I would like to book an appointment for dental cleaning this Saturday.',
    'Namaste! Consultation fees aur clinic timings share kar dijiye please.',
    'Hi, do you offer painless root canal treatment? Please send details.',
  ]);

  const handleGenerateAiMessage = async () => {
    setIsGeneratingAi(true);
    try {
      const res = await fetch('/api/ai/optimize-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessCategory: category,
          businessName: config.businessName,
          language: langMode,
        }),
      });
      const data = await res.json();
      if (data.templates && data.templates.length > 0) {
        setAiSuggestions(data.templates);
        setConfig((prev) => ({ ...prev, prefilledMessage: data.templates[0] }));
      }
    } catch (err) {
      console.error('Failed to generate AI templates:', err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const generatedEmbedCode = `<!-- LeadGuard OS Smart WhatsApp Widget -->
<script>
  window.LeadGuardWhatsApp = {
    phone: "${config.phoneNumber}",
    businessName: "${config.businessName}",
    tagline: "${config.tagline}",
    welcomeMessage: "${config.welcomeMessage.replace(/"/g, '\\"')}",
    prefilledText: "${config.prefilledMessage.replace(/"/g, '\\"')}",
    color: "${config.brandColor}",
    position: "${config.position}"
  };
</script>
<script src="https://cdn.leadguardos.com/widget.v2.min.js" async></script>`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedEmbedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleTestWhatsAppOpen = () => {
    const cleanNumber = config.phoneNumber.replace(/\D/g, '');
    const encodedText = encodeURIComponent(config.prefilledMessage);
    window.open(`https://wa.me/${cleanNumber}?text=${encodedText}`, '_blank');
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 md:p-8 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <MessageSquare className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">
              Zero-Friction Conversion Tool
            </span>
            <h2 className="text-2xl font-black text-white tracking-tight">Smart WhatsApp Floating Widget Generator</h2>
          </div>
        </div>
        <p className="mt-3 text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
          Create an animated, 100% bug-free WhatsApp floating widget for any website. Features 1-tap prefilled conversation 
          starters, verified +91 country dialing, and custom branding to boost visitor inquiries by 3x.
        </p>
      </div>

      {/* 2-Column Layout: Controls (Left) & Live Sandbox Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Controls Column (Col 7) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* General Config Card */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-emerald-400" />
              1. Business & Contact Settings
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">WhatsApp Mobile (+91 Prefix)</label>
                <input
                  type="text"
                  value={config.phoneNumber}
                  onChange={(e) => setConfig({ ...config, phoneNumber: e.target.value })}
                  placeholder="919876543210"
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
                <span className="text-[10px] text-emerald-400 mt-1 block">✓ Formatted for India without double 9191</span>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Business Display Name</label>
                <input
                  type="text"
                  value={config.businessName}
                  onChange={(e) => setConfig({ ...config, businessName: e.target.value })}
                  placeholder="e.g. Dr. Sharma Dental"
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Status Subtitle</label>
                <input
                  type="text"
                  value={config.tagline}
                  onChange={(e) => setConfig({ ...config, tagline: e.target.value })}
                  placeholder="Online • Replying in 2 mins"
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Widget Placement</label>
                <select
                  value={config.position}
                  onChange={(e) => setConfig({ ...config, position: e.target.value as any })}
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="bottom-right">Bottom Right (Standard)</option>
                  <option value="bottom-left">Bottom Left</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Welcome Chat Header Message</label>
              <textarea
                value={config.welcomeMessage}
                onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })}
                rows={2}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 p-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* AI Pre-filled Message Generator */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                2. AI High-Converting Chat Starter
              </h3>
              <button
                id="generate-ai-templates-btn"
                type="button"
                onClick={handleGenerateAiMessage}
                disabled={isGeneratingAi}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-3 py-1 text-xs font-bold transition-all border border-emerald-500/30 active:scale-95 disabled:opacity-50"
              >
                {isGeneratingAi ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                <span>{isGeneratingAi ? 'Crafting...' : 'AI Generate'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Business Niche</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white focus:outline-none"
                >
                  <option value="Dental Clinic">Dental / Doctor Clinic</option>
                  <option value="Salon & Spa">Salon & Luxury Spa</option>
                  <option value="Real Estate">Real Estate / Builders</option>
                  <option value="Gym & Fitness">Gym & Personal Trainer</option>
                  <option value="Coaching & Tuition">Coaching & EdTech</option>
                  <option value="Restaurant & Cafe">Restaurant & Bakery</option>
                  <option value="E-commerce Store">E-Commerce Brand</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Language Style</label>
                <select
                  value={langMode}
                  onChange={(e) => setLangMode(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white focus:outline-none"
                >
                  <option value="hinglish">Hinglish (Hindi + English)</option>
                  <option value="english">Professional English</option>
                  <option value="hindi">Pure Hindi (Devanagari)</option>
                </select>
              </div>
            </div>

            {/* AI Preset Chips */}
            <div className="space-y-2 pt-2">
              <span className="text-[11px] font-bold text-slate-400">Click to apply high-intent prompt:</span>
              <div className="space-y-2">
                {aiSuggestions.map((msg, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setConfig({ ...config, prefilledMessage: msg })}
                    className={`w-full text-left rounded-xl p-2.5 text-xs transition-all border ${
                      config.prefilledMessage === msg
                        ? 'border-emerald-500 bg-emerald-950/40 text-emerald-200 font-semibold'
                        : 'border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    "{msg}"
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Embed Code Snippet */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                3. One-Line Embed Code
              </span>
              <button
                id="copy-embed-code-btn"
                type="button"
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3 py-1.5 text-xs font-bold transition-all active:scale-95 shadow-md shadow-emerald-500/20"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Embed Code</span>
                  </>
                )}
              </button>
            </div>
            <pre className="overflow-x-auto rounded-xl bg-slate-950 p-3.5 text-[11px] font-mono text-emerald-300 border border-slate-800">
              <code>{generatedEmbedCode}</code>
            </pre>
          </div>

        </div>

        {/* Live Sandbox Preview Column (Col 5) */}
        <div className="lg:col-span-5 sticky top-24 space-y-4">
          
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Live Interactive Sandbox
            </span>
            <button
              onClick={() => setIsOpenPreview(!isOpenPreview)}
              className="text-xs font-semibold text-emerald-400 hover:underline"
            >
              {isOpenPreview ? 'Collapse Chat Window' : 'Open Chat Window'}
            </button>
          </div>

          {/* Simulated Mobile/Desktop Screen */}
          <div className="relative h-[480px] w-full rounded-3xl border-2 border-slate-700 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6 overflow-hidden shadow-2xl flex flex-col justify-between">
            
            {/* Fake Mock Website UI Background */}
            <div className="space-y-4 opacity-40 select-none pointer-events-none">
              <div className="h-5 w-32 rounded-full bg-slate-700" />
              <div className="h-8 w-4/5 rounded-xl bg-slate-800" />
              <div className="space-y-2">
                <div className="h-3 w-full rounded bg-slate-800" />
                <div className="h-3 w-5/6 rounded bg-slate-800" />
                <div className="h-3 w-4/6 rounded bg-slate-800" />
              </div>
              <div className="h-10 w-36 rounded-xl bg-slate-800" />
            </div>

            {/* FLOATING WHATSAPP WIDGET IN PREVIEW */}
            <div className={`absolute bottom-5 ${config.position === 'bottom-left' ? 'left-5' : 'right-5'} flex flex-col items-${config.position === 'bottom-left' ? 'start' : 'end'} space-y-3 z-30`}>
              
              {/* Chat Popup Box */}
              {isOpenPreview && (
                <div className="w-72 rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden animate-fade-in text-left">
                  
                  {/* Chat Header */}
                  <div className="bg-emerald-600 p-3.5 text-white flex items-center gap-2.5">
                    <div className="relative">
                      <img
                        src={config.avatarUrl}
                        alt="Avatar"
                        className="h-10 w-10 rounded-full object-cover border-2 border-white/40"
                      />
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-300 border-2 border-emerald-600" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold leading-tight">{config.businessName}</h4>
                      <p className="text-[10px] text-emerald-100">{config.tagline}</p>
                    </div>
                  </div>

                  {/* Chat Body */}
                  <div className="p-3.5 bg-slate-950 space-y-3">
                    <div className="rounded-2xl rounded-tl-none bg-slate-900 p-3 text-xs text-slate-200 border border-slate-800 shadow-sm leading-relaxed">
                      {config.welcomeMessage}
                    </div>

                    <div className="rounded-xl bg-slate-900/60 p-2.5 border border-slate-800 text-[11px] text-slate-400">
                      <span className="font-semibold text-slate-300 block mb-1">Pre-filled Chat Trigger:</span>
                      <p className="text-emerald-300 font-mono italic">"{config.prefilledMessage}"</p>
                    </div>

                    {/* Launch WhatsApp Button */}
                    <button
                      type="button"
                      onClick={handleTestWhatsAppOpen}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 text-xs transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>Start Chat on WhatsApp</span>
                    </button>
                  </div>

                </div>
              )}

              {/* Floating Action Circle Button */}
              <button
                type="button"
                onClick={() => setIsOpenPreview(!isOpenPreview)}
                className="relative flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-2xl transition-transform hover:scale-105 active:scale-95 shadow-emerald-500/30"
              >
                <MessageSquare className="h-7 w-7 text-slate-950" />
                
                {config.showBadge && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-extrabold text-white shadow-md">
                    {config.badgeText}
                  </span>
                )}
              </button>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
