import React, { useState, useEffect } from 'react';
import { Key, Webhook, Code2, Activity, Check, Copy, Terminal, Shield, Zap, Sparkles } from 'lucide-react';
import { WebhooksManager } from './WebhooksManager';
import { apiFetch } from '../lib/api';

export const DeveloperDashboardView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'KEYS' | 'WEBHOOKS' | 'DOCS'>('KEYS');
  const [openApiSpec, setOpenApiSpec] = useState<any>(null);
  const [apiKeyInfo, setApiKeyInfo] = useState<any>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    fetch('/api/v1/openapi.json')
      .then((res) => res.json())
      .then((data) => setOpenApiSpec(data))
      .catch((err) => console.error('OpenAPI fetch error:', err));
  }, []);

  const handleGenerateKey = async () => {
    try {
      const res = await apiFetch('/api/keys/create', { method: 'POST' });
      const data = await res.json();
      if (data.apiKey) setApiKeyInfo(data);
    } catch (err) {
      console.error('API key error:', err);
    }
  };

  const handleCopy = () => {
    if (apiKeyInfo?.apiKey) {
      navigator.clipboard.writeText(apiKeyInfo.apiKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      
      {/* Header & Sub-Nav */}
      <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-6 md:p-8 shadow-2xl backdrop-blur-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div>
            <span className="text-[10px] font-extrabold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
              <Code2 className="h-4 w-4 text-cyan-400" />
              LeadGuard Developer Portal & REST API v1
            </span>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">Developer Portal & Webhooks Engine</h2>
            <p className="text-xs text-slate-400 mt-1">
              Manage versioned REST API keys, test signed webhook delivery, and inspect OpenAPI 3.0 specs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSubTab('KEYS')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                activeSubTab === 'KEYS'
                  ? 'bg-rose-600 text-white shadow-rose-950/40 border border-rose-400/30'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              API Keys
            </button>
            <button
              onClick={() => setActiveSubTab('WEBHOOKS')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                activeSubTab === 'WEBHOOKS'
                  ? 'bg-rose-600 text-white shadow-rose-950/40 border border-rose-400/30'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              Signed Webhooks
            </button>
            <button
              onClick={() => setActiveSubTab('DOCS')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                activeSubTab === 'DOCS'
                  ? 'bg-rose-600 text-white shadow-rose-950/40 border border-rose-400/30'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              OpenAPI Specs
            </button>
          </div>
        </div>

        {/* Sub-Tab 1: API Keys */}
        {activeSubTab === 'KEYS' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Key className="h-4 w-4 text-rose-400" />
                  Active REST API Authentication Keys
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Use bearer tokens to run website scans and pull vulnerability reports via curl or Node.js.
                </p>
              </div>
              <button
                onClick={handleGenerateKey}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-bold shadow-lg shadow-rose-950/50 border border-rose-400/30 flex items-center gap-1.5"
              >
                <Zap className="h-3.5 w-3.5 text-amber-300 fill-amber-300" />
                Generate Live API Key
              </button>
            </div>

            {apiKeyInfo && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-2 backdrop-blur-md">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <Sparkles className="h-4 w-4" />
                  <span>Save your live key now. It will not be shown again:</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono text-emerald-300 bg-slate-950 p-3 rounded-xl border border-slate-800 flex-1 truncate">
                    {apiKeyInfo.apiKey}
                  </code>
                  <button
                    onClick={handleCopy}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
                  >
                    {copiedKey ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-5 font-mono text-xs text-slate-300 space-y-3 shadow-inner">
              <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5">
                <Terminal className="h-3.5 w-3.5 text-cyan-400" />
                cURL Example Request:
              </span>
              <pre className="bg-slate-900/90 p-4 rounded-xl border border-slate-800/80 overflow-x-auto text-rose-300 text-xs leading-relaxed">
{`curl -X POST https://leadguard.os/api/v1/scans \\
  -H "X-API-Key: lg_live_your_secret_key" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://drsharmadental.in"}'`}
              </pre>
            </div>
          </div>
        )}

        {/* Sub-Tab 2: Webhooks */}
        {activeSubTab === 'WEBHOOKS' && <WebhooksManager />}

        {/* Sub-Tab 3: OpenAPI Spec Viewer */}
        {activeSubTab === 'DOCS' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Code2 className="h-4 w-4 text-cyan-400" />
              OpenAPI 3.0 JSON Specification
            </h3>
            <pre className="bg-slate-950/90 p-4 rounded-2xl border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto max-h-96 shadow-inner">
              {JSON.stringify(openApiSpec, null, 2)}
            </pre>
          </div>
        )}

      </div>

    </div>
  );
};
