import React, { useState, useEffect } from 'react';
import { Webhook, Shield, Check, Copy, AlertCircle, RefreshCw, Send, Trash2, Key, BellRing, Sparkles } from 'lucide-react';

interface WebhookItem {
  id: string;
  url: string;
  secret: string;
  events: string[];
  createdAt: string;
  lastStatus?: string;
  lastPingAt?: string;
}

export const WebhooksManager: React.FC = () => {
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ id: string; message: string; success: boolean } | null>(null);
  const [copiedSecretId, setCopiedSecretId] = useState<string | null>(null);

  const fetchWebhooks = async () => {
    try {
      const res = await fetch('/api/webhooks');
      if (res.ok) {
        const data = await res.json();
        setWebhooks(data.webhooks || []);
      }
    } catch (err) {
      console.error('Failed to load webhooks:', err);
    }
  };

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newUrl }),
      });

      if (res.ok) {
        setNewUrl('');
        fetchWebhooks();
      }
    } catch (err) {
      console.error('Webhook create error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestWebhook = async (id: string) => {
    try {
      const res = await fetch('/api/webhooks/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      const data = await res.json();
      setTestResult({
        id,
        message: data.message || 'Webhook ping dispatched with HMAC-SHA256 signature',
        success: data.success || res.ok,
      });

      setTimeout(() => setTestResult(null), 4000);
      fetchWebhooks();
    } catch (err: any) {
      setTestResult({ id, message: err.message || 'Failed to dispatch test ping', success: false });
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    try {
      await fetch(`/api/webhooks/${id}`, { method: 'DELETE' });
      setWebhooks(webhooks.filter((w) => w.id !== id));
    } catch (err) {
      console.error('Failed to delete webhook:', err);
    }
  };

  const handleCopySecret = (id: string, secret: string) => {
    navigator.clipboard.writeText(secret);
    setCopiedSecretId(id);
    setTimeout(() => setCopiedSecretId(null), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 md:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">
              <Webhook className="h-3.5 w-3.5" />
              <span>Developer Webhook & Automation Engine</span>
            </div>
            <h2 className="text-2xl font-black text-white">Real-Time Alert Webhooks</h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Receive instant HMAC-signed alerts on Slack, Discord, Zapier, or your CRM whenever a monitored site's score drops or a WhatsApp link breaks.
            </p>
          </div>
        </div>

        {/* Add Webhook Form */}
        <form onSubmit={handleCreateWebhook} className="mt-6 flex flex-col sm:flex-row gap-3">
          <input
            type="url"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="https://hooks.slack.com/services/... or https://your-domain.com/webhook"
            required
            className="flex-1 rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 text-xs sm:text-sm transition-all shadow-md active:scale-95 shrink-0"
          >
            <Webhook className="h-4 w-4" />
            <span>Register Webhook</span>
          </button>
        </form>
      </div>

      {/* Webhooks List */}
      <div className="space-y-4">
        {webhooks.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center space-y-2">
            <Webhook className="h-8 w-8 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">No Webhooks Registered Yet</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Add your endpoint URL above to test automated alerting with HMAC-SHA256 signature verification.
            </p>
          </div>
        ) : (
          webhooks.map((w) => (
            <div
              key={w.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-3 shadow-lg"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-indigo-400 break-all">{w.url}</span>
                    <span className="rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 border border-emerald-500/20">
                      Active
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Key className="h-3.5 w-3.5 text-slate-500" />
                    <span>Secret: </span>
                    <code className="font-mono text-slate-300 text-[11px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {w.secret.substring(0, 10)}••••••••••••••••
                    </code>
                    <button
                      onClick={() => handleCopySecret(w.id, w.secret)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-bold ml-1"
                    >
                      {copiedSecretId === w.id ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleTestWebhook(w.id)}
                    className="flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 text-xs font-bold transition-all border border-slate-700 active:scale-95"
                  >
                    <Send className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Test Ping</span>
                  </button>

                  <button
                    onClick={() => handleDeleteWebhook(w.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                    title="Delete webhook"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {testResult && testResult.id === w.id && (
                <div className={`rounded-xl p-3 text-xs font-medium ${
                  testResult.success ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                }`}>
                  {testResult.message}
                </div>
              )}
            </div>
          ))
        )}
      </div>

    </div>
  );
};
