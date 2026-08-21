import React, { useState } from 'react';
import { Smartphone, CheckCircle, AlertTriangle, XCircle, Copy, Check, ExternalLink, Sparkles, RefreshCw, Send } from 'lucide-react';

export const LinkDebuggerSandbox: React.FC = () => {
  const [phoneInput, setPhoneInput] = useState('91919876543210');
  const [prefilledText, setPrefilledText] = useState('Hi, I want to book an appointment today');
  const [deviceMode, setDeviceMode] = useState<'ios' | 'android'>('ios');
  const [copied, setCopied] = useState(false);
  const [testResult, setTestResult] = useState<{
    isValid: boolean;
    issues: string[];
    fixedUrl: string;
    rawUrl: string;
    digits: string;
  } | null>(null);

  const analyzeLink = (rawDigits: string, text: string) => {
    const cleanDigits = rawDigits.replace(/\D/g, '');
    const issues: string[] = [];
    let isValid = true;
    let correctDigits = cleanDigits;

    if (!cleanDigits || cleanDigits.length < 10) {
      isValid = false;
      issues.push('Fatal: Phone number has less than 10 digits.');
      correctDigits = '919876543210';
    } else if (cleanDigits.startsWith('9191') && cleanDigits.length >= 12) {
      isValid = false;
      issues.push('Fatal: Double Country Code (+9191). Mobile devices show "Invalid Phone Number" dialog.');
      correctDigits = cleanDigits.substring(2);
    } else if (cleanDigits.startsWith('0') && cleanDigits.length === 11) {
      isValid = false;
      issues.push('Fatal: Leading "0" prefix (0XXXXXXXXXX). Fails on iOS Safari and triggers country mismatch.');
      correctDigits = '91' + cleanDigits.substring(1);
    } else if (cleanDigits.length === 10 && /^[6-9]/.test(cleanDigits)) {
      issues.push('Warning: Missing India country code (+91). Will fail for unconfigured or international callers.');
      correctDigits = '91' + cleanDigits;
    }

    const encoded = text.trim() ? `?text=${encodeURIComponent(text.trim())}` : '';
    const rawUrl = `https://wa.me/${cleanDigits}${encoded}`;
    const fixedUrl = `https://wa.me/${correctDigits}${encoded}`;

    setTestResult({
      isValid,
      issues,
      fixedUrl,
      rawUrl,
      digits: cleanDigits,
    });
  };

  // Run on mount & whenever input changes
  React.useEffect(() => {
    analyzeLink(phoneInput, prefilledText);
  }, [phoneInput, prefilledText]);

  const handleCopy = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 md:p-8 shadow-xl space-y-8 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-5">
        <div>
          <span className="text-[10px] font-extrabold font-mono text-red-400 uppercase tracking-widest">
            Diagnostic Sandbox & Mobile Simulator
          </span>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Smartphone className="h-6 w-6 text-red-500" />
            Live WhatsApp Link Debugger & Device Emulator
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Test any number or link formatting in real-time and see exactly what mobile users experience.
          </p>
        </div>

        {/* Device Mode Toggle */}
        <div className="flex items-center gap-1 rounded-xl bg-slate-950 p-1 border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setDeviceMode('ios')}
            className={`rounded-lg px-3 py-1 text-xs font-bold uppercase tracking-wider transition-all ${
              deviceMode === 'ios' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            iPhone (iOS)
          </button>
          <button
            onClick={() => setDeviceMode('android')}
            className={`rounded-lg px-3 py-1 text-xs font-bold uppercase tracking-wider transition-all ${
              deviceMode === 'android' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Android
          </button>
        </div>
      </div>

      {/* Main Grid: Inputs vs Mobile Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Col: Interactive Tester Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Preset Buttons for Quick Testing */}
          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
              Common Real-World Bug Scenarios:
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { label: '❌ Double +9191 Bug', number: '91919876543210', msg: 'Hi Dr. Sharma, need an appointment' },
                { label: '❌ Leading 0 Prefix', number: '09820011223', msg: 'Hi Salon, want to book a haircut' },
                { label: '⚠️ Missing Country 91', number: '8877665544', msg: 'Please share brochure' },
                { label: '✅ Clean Valid Link', number: '919876543210', msg: 'Hi team, checking pricing' },
              ].map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setPhoneInput(p.number);
                    setPrefilledText(p.msg);
                  }}
                  className="rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 px-3 py-1.5 text-xs text-slate-300 font-medium transition-all"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input 1: Phone Number */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300">
              Phone Number or wa.me URL
            </label>
            <input
              type="text"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="e.g. 91919876543210 or 09820011223"
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-2.5 text-sm text-white font-mono focus:border-red-500 focus:outline-none"
            />
          </div>

          {/* Input 2: Prefilled Message */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300">
              Prefilled Welcome Text (Auto URL-encoded)
            </label>
            <input
              type="text"
              value={prefilledText}
              onChange={(e) => setPrefilledText(e.target.value)}
              placeholder="e.g. Hi, I would like to book a consultation today"
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-2.5 text-sm text-white focus:border-red-500 focus:outline-none"
            />
          </div>

          {/* Diagnostic Result Output */}
          {testResult && (
            <div className={`rounded-2xl p-5 border space-y-4 ${
              testResult.isValid
                ? 'bg-emerald-950/20 border-emerald-500/40'
                : 'bg-red-950/20 border-red-500/40'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {testResult.isValid ? (
                    <CheckCircle className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-400" />
                  )}
                  <span className={`text-xs font-black uppercase tracking-wider ${
                    testResult.isValid ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {testResult.isValid ? 'Link Format is 100% Valid' : 'Critical Formatting Defect Detected'}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  {testResult.digits.length} digits analyzed
                </span>
              </div>

              {testResult.issues.length > 0 && (
                <div className="space-y-1.5">
                  {testResult.issues.map((iss, i) => (
                    <p key={i} className="text-xs text-red-300 font-medium">
                      • {iss}
                    </p>
                  ))}
                </div>
              )}

              {/* Fixed Output URL */}
              <div className="rounded-xl bg-slate-950 p-3.5 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Production-Ready Fixed URL:
                  </span>
                  <button
                    onClick={() => handleCopy(testResult.fixedUrl)}
                    className="flex items-center gap-1 text-[11px] font-bold text-red-400 hover:text-red-300"
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    <span>{copied ? 'Copied' : 'Copy Fixed Link'}</span>
                  </button>
                </div>
                <div className="font-mono text-xs text-emerald-400 break-all bg-slate-900 p-2 rounded-lg">
                  {testResult.fixedUrl}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right Col: Mobile Phone Simulator Frame (5 cols) */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="w-full max-w-[320px] rounded-[36px] border-4 border-slate-700 bg-slate-950 p-4 shadow-2xl relative overflow-hidden">
            
            {/* Phone Speaker Notch */}
            <div className="mx-auto h-4 w-28 rounded-full bg-slate-800 mb-4 flex items-center justify-center">
              <div className="h-1.5 w-1.5 rounded-full bg-slate-700 mr-2" />
              <div className="h-1.5 w-10 rounded-full bg-slate-700" />
            </div>

            {/* Screen Header */}
            <div className="border-b border-slate-800 pb-2 mb-4 text-center">
              <span className="text-[10px] font-bold text-slate-400">
                {deviceMode === 'ios' ? 'Apple iPhone Simulator' : 'Android Chrome Simulator'}
              </span>
            </div>

            {/* Simulated Web Page Content */}
            <div className="space-y-4 text-center py-4">
              <div className="h-10 w-10 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center mx-auto border border-red-500/30">
                🏥
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Dr. Sharma Clinic</h4>
                <p className="text-[11px] text-slate-400">Tap below to chat on WhatsApp</p>
              </div>

              {/* The WhatsApp Button */}
              <div className="pt-2">
                <button
                  className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 px-4 text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Book on WhatsApp</span>
                </button>
              </div>

              {/* Simulated Device Popup Response */}
              <div className="pt-4">
                {testResult && !testResult.isValid ? (
                  <div className="rounded-2xl border border-red-600/60 bg-red-950/80 p-3.5 text-left space-y-2 animate-bounce">
                    <div className="flex items-center gap-1.5 text-red-400 font-bold text-xs">
                      <XCircle className="h-4 w-4" />
                      <span>{deviceMode === 'ios' ? 'Safari Alert' : 'WhatsApp Error'}</span>
                    </div>
                    <p className="text-[11px] text-red-200 leading-snug">
                      {deviceMode === 'ios'
                        ? 'The phone number shared via url is invalid. (+9191 prefix fails)'
                        : 'Phone number does not exist on WhatsApp.'}
                    </p>
                    <span className="block text-[9px] font-extrabold uppercase text-red-400">100% USER DROP-OFF</span>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-emerald-500/60 bg-emerald-950/80 p-3.5 text-left space-y-2">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                      <CheckCircle className="h-4 w-4" />
                      <span>WhatsApp Opened</span>
                    </div>
                    <p className="text-[11px] text-emerald-200 leading-snug">
                      Chat opened instantly with prefilled text: "{prefilledText}"
                    </p>
                    <span className="block text-[9px] font-extrabold uppercase text-emerald-400">LEAD CAPTURED!</span>
                  </div>
                )}
              </div>

            </div>

            {/* Home Bar */}
            <div className="mt-6 mx-auto h-1 w-24 rounded-full bg-slate-700" />
          </div>
        </div>

      </div>

    </div>
  );
};
