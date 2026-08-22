import React, { useState, useEffect } from 'react';
import { Key, Webhook, Code2, Activity, Check, Copy, Terminal, Shield } from 'lucide-react';
import { WebhooksManager } from './WebhooksManager';

export const DeveloperDashboardView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'KEYS' | 'WEBHOOKS' | 'DOCS'>('KEYS');
  const [openApiSpec, setOpenApiSpec] = useState<any>(null);
  const [apiKeyInfo, setApiKeyInfo] = useState<any>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    fetch('/api/v1/openapi.json')
      .then(res => res.json())
      .then(data => setOpenApiSpec(data))
      .catch(err => console.error('OpenAPI fetch error:', err));
  }, []);

  const handleGenerateKey = async () => {
    try {
      const res = await fetch('/api/keys/create', { method: 'POST' });
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
      <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 md:p-8 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
              <Code2 className="h-4 w-4 text-indigo-400" />
              LeadGuard Developer Portal & REST API v1
            </span>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">Developer Settings & API v1</h2>
            <p className="text-xs text-slate-400 mt-1">Manage versioned REST API keys, signed webhook endpoints, and OpenAPI 3.0 documentation.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSubTab('KEYS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeSubTab === 'KEYS' ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-slate-400 border border-slate-800'
              }`}
            >
              API Keys
            </button>
            <button
              onClick={() => setActiveSubTab('WEBHOOKS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeSubTab === 'WEBHOOKS' ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-slate-400 border border-slate-800'
              }`}
            >
              Signed Webhooks
            </button>
            <button
              onClick={() => setActiveSubTab('DOCS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeSubTab === 'DOCS' ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-slate-400 border border-slate-800'
              }`}
            >
              OpenAPI Specs
            </button>
          </div>
        </div>

        {/* Sub-Tab 1: API Keys */}
        {activeSubTab === 'KEYS' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Active REST API Keys</h3>
              <button
                onClick={handleGenerateKey}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md"
              >
                Generate Live API Key
              </button>
            </div>

            {apiKeyInfo && (
              <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/30 p-4 space-y-2">
                <span className="text-xs font-bold text-amber-400">⚠️ Save your live key now. It will not be shown again:</span>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono text-emerald-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex-1 truncate">
                    {apiKeyInfo.apiKey}
                  </code>
                  <button onClick={handleCopy} className="px-3 py-2 rounded-xl bg-slate-800 text-xs font-bold text-white">
                    {copiedKey ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-300 space-y-2">
              <span className="text-slate-500 text-[10px] uppercase font-bold">curl Example Request:</span>
              <pre className="bg-slate-900 p-3 rounded-xl border border-slate-800 overflow-x-auto text-rose-300">
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
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">OpenAPI 3.0 JSON Specification</h3>
            <pre className="bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto max-h-96">
              {JSON.stringify(openApiSpec, null, 2)}
            </pre>
          </div>
        )}

      </div>

    </div>
  );
};
