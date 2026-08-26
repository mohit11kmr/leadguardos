import React, { useState } from 'react';
import { User, Bell, Key, Download, Trash2, ShieldAlert, Check, Copy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';

export const AccountSettingsView: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const [apiKeyInfo, setApiKeyInfo] = useState<{ apiKey?: string; keyId?: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletedMsg, setDeletedMsg] = useState(false);

  const handleCreateApiKey = async () => {
    try {
      const res = await apiFetch('/api/keys/create', { method: 'POST' });
      const data = await res.json();
      if (data.apiKey) {
        setApiKeyInfo(data);
      }
    } catch (err) {
      console.error('API key generation error:', err);
    }
  };

  const handleCopyKey = () => {
    if (apiKeyInfo?.apiKey) {
      navigator.clipboard.writeText(apiKeyInfo.apiKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleExportPersonalData = async () => {
    try {
      const res = await apiFetch('/api/user/export-data');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leadguard_personal_data_${Date.now()}.json`;
      a.click();
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.toUpperCase() !== 'DELETE') return;
    setIsDeleting(true);
    try {
      const res = await apiFetch('/api/user/delete-account', { method: 'POST' });
      if (res.ok) {
        setDeletedMsg(true);
        setTimeout(() => {
          signOut();
        }, 1500);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      
      {/* Header */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 md:p-8 shadow-xl space-y-6">
        <div>
          <span className="text-[10px] font-extrabold text-rose-400 uppercase tracking-widest">User Control Panel</span>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Account Settings & Privacy</h2>
          <p className="text-xs text-slate-400 mt-1">Manage user profile, API credentials, notification alerts, and data privacy.</p>
        </div>

        {/* Profile Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400 font-bold">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{user?.displayName || 'LeadGuard Account User'}</h3>
              <p className="text-xs text-slate-400">{user?.email || 'authenticated_user@leadguard.os'}</p>
            </div>
          </div>
        </div>

        {/* API Keys Section */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-indigo-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">REST API Access Keys</h4>
            </div>
            <button
              onClick={handleCreateApiKey}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-all"
            >
              Generate New API Key
            </button>
          </div>

          {apiKeyInfo && (
            <div className="rounded-xl bg-slate-900 border border-slate-800 p-3 space-y-2">
              <div className="text-[11px] text-amber-400 font-bold">⚠️ Store your API key securely. It will not be shown again:</div>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono text-emerald-300 bg-slate-950 p-2 rounded-lg border border-slate-800 flex-1 truncate">
                  {apiKeyInfo.apiKey}
                </code>
                <button
                  onClick={handleCopyKey}
                  className="px-3 py-2 rounded-lg bg-slate-800 text-xs font-bold text-slate-200 hover:bg-slate-700"
                >
                  {copiedKey ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Data Privacy & GDPR Section */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">GDPR Personal Data Archive</h4>
              <p className="text-xs text-slate-400">Download a full JSON archive of your diagnostic scans, watchdogs, and logs.</p>
            </div>
            <button
              onClick={handleExportPersonalData}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700"
            >
              <Download className="h-3.5 w-3.5 text-indigo-400" />
              <span>Export Data Archive</span>
            </button>
          </div>
        </div>

        {/* Danger Zone: Account Deletion */}
        <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-rose-500" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Danger Zone — Permanent Account Deletion</h4>
          </div>
          <p className="text-xs text-slate-300">
            Permanently revokes all active JWT tokens, deletes watchdog monitoring targets, revokes webhooks, and removes personal records. This action is non-reversible.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <input
              type="text"
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none w-full sm:w-64"
            />
            <button
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText.toUpperCase() !== 'DELETE' || isDeleting}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{isDeleting ? 'Deleting Account...' : 'Permanently Delete Account'}</span>
            </button>
          </div>

          {deletedMsg && (
            <div className="text-xs text-emerald-400 font-bold">Account successfully deleted. Signing out...</div>
          )}
        </div>

      </div>

    </div>
  );
};
