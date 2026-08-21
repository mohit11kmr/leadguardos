import React, { useState } from 'react';
import { HunterProspect } from '../types';
import { Crosshair, Download, Send, Sparkles, AlertTriangle, CheckCircle2, Copy, FileText, Filter, MessageSquare, ExternalLink, RefreshCw } from 'lucide-react';

interface HunterModeProps {
  onSelectProspectForPitch?: (prospect: { domain: string; businessName: string; issues: string }) => void;
}

export const HunterMode: React.FC<HunterModeProps> = ({ onSelectProspectForPitch }) => {
  const [urlInput, setUrlInput] = useState(
    `drsharmadental.in\nelitesalonmumbai.com\napexgrandrealestate.com\nurbanvogue.in\nskylinefitness.co.in\nroyaloakinteriors.in`
  );
  const [isScanning, setIsScanning] = useState(false);
  const [prospects, setProspects] = useState<HunterProspect[]>([]);
  const [filterSeverity, setFilterSeverity] = useState<'ALL' | 'CRITICAL' | 'ZERO_INTENT' | 'MISSING_PIXEL'>('ALL');
  const [selectedProspectForModal, setSelectedProspectForModal] = useState<HunterProspect | null>(null);
  const [copiedPitchId, setCopiedPitchId] = useState<string | null>(null);

  const handleScanBatch = async () => {
    const rawList = urlInput
      .split(/[\n,]+/)
      .map((u) => u.trim())
      .filter(Boolean);

    if (rawList.length === 0) return;

    setIsScanning(true);
    try {
      const res = await fetch('/api/scan-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: rawList }),
      });

      if (!res.ok) {
        throw new Error('Failed to run Hunter Mode scan.');
      }

      const data = await res.json();
      setProspects(data.results || []);
    } catch (err) {
      console.error('Hunter batch error:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleExportCSV = () => {
    if (prospects.length === 0) return;

    const headers = [
      'Target URL',
      'Business Name',
      'Health Score',
      'Est. Monthly Loss (INR)',
      'Primary Leak',
      'WhatsApp Status',
      'Meta Pixel',
      'Shareable Report Link',
      'Cold WhatsApp Pitch',
      'Cold Email Pitch',
    ];

    const rows = prospects.map((p) => [
      `"${p.targetUrl}"`,
      `"${p.businessName}"`,
      p.score,
      p.estimatedMonthlyLoss,
      `"${p.primaryLeak.replace(/"/g, '""')}"`,
      p.whatsappStatus,
      p.metaPixelStatus,
      `"${p.shareableReportUrl}"`,
      `"${p.coldWhatsAppPitch.replace(/"/g, '""')}"`,
      `"${p.coldEmailPitch.replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `LeadGuard_Hunter_Prospects_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredProspects = prospects.filter((p) => {
    if (filterSeverity === 'CRITICAL') return p.adSpendRisk === 'CRITICAL' || p.score < 50;
    if (filterSeverity === 'ZERO_INTENT') return p.whatsappStatus === 'ZERO_INTENT' || p.whatsappStatus === 'BROKEN';
    if (filterSeverity === 'MISSING_PIXEL') return p.metaPixelStatus === 'MISSING';
    return true;
  });

  const handleCopyPitch = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPitchId(id);
    setTimeout(() => setCopiedPitchId(null), 2500);
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="rounded-3xl border border-slate-800/90 bg-gradient-to-br from-slate-950 via-slate-900/90 to-slate-950 p-6 md:p-8 shadow-2xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 border border-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-400">
              <Crosshair className="h-3.5 w-3.5" />
              <span>Module 4: "Hunter Mode" (B2B Bulk Outbound Machine)</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-2">
              Bulk Scan Up to 500 URLs & Auto-Generate 1-Click Cold Pitches
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1">
              Paste a list of prospect URLs or competitor websites. Hunter Mode audits each domain, identifies the exact technical revenue leak, generates a live shareable report URL, and writes a hyper-personalized cold outreach pitch ready to copy and send.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {prospects.length > 0 && (
              <button
                onClick={handleExportCSV}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-950/40 transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Export CSV with Pitches ({prospects.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Input Box */}
        <div className="space-y-3 pt-4 border-t border-slate-800">
          <label className="text-xs font-semibold text-slate-300 block">
            Paste Target Prospect URLs (One per line or comma-separated):
          </label>
          <textarea
            rows={4}
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="drsharmadental.in&#10;elitesalonmumbai.com&#10;apexgrandrealestate.com"
            className="w-full rounded-2xl bg-slate-950 border border-slate-700/80 p-4 text-xs font-mono text-slate-200 placeholder-slate-500 focus:border-rose-500 focus:outline-none"
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs text-slate-400">
              {urlInput.split(/[\n,]+/).filter((u) => u.trim()).length} target domain(s) ready to audit
            </span>

            <button
              type="button"
              onClick={handleScanBatch}
              disabled={isScanning}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-950/40 transition-all disabled:opacity-50"
            >
              {isScanning ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Crawling & Generating Forensic Pitches...</span>
                </>
              ) : (
                <>
                  <Crosshair className="h-3.5 w-3.5" />
                  <span>Launch Hunter Mode Scan</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Prospect Table & Pipeline */}
      {prospects.length > 0 && (
        <div className="rounded-3xl border border-slate-800/90 bg-slate-900/80 p-6 md:p-8 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Hunter Outbound Prospect Pipeline ({filteredProspects.length})
              </h3>
              <p className="text-xs text-slate-400">Ready-to-send agency pitches with shareable forensic audit links</p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {(['ALL', 'CRITICAL', 'ZERO_INTENT', 'MISSING_PIXEL'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterSeverity(f)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                    filterSeverity === f
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {f.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {filteredProspects.map((p, idx) => (
              <div
                key={p.scanId || idx}
                className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 space-y-4 hover:border-slate-700 transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h4 className="text-base font-bold text-white">{p.businessName || p.domain}</h4>
                      <span className="font-mono text-xs text-slate-400">({p.domain})</span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          p.score < 50
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        Score: {p.score}/100
                      </span>
                      <span className="text-xs text-rose-400 font-semibold">
                        Loss: ₹{p.estimatedMonthlyLoss.toLocaleString('en-IN')}/mo
                      </span>
                    </div>
                    <p className="text-xs text-rose-300 font-medium">
                      Primary Leak: {p.primaryLeak}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <a
                      href={p.shareableReportUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-300 transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                      <span>View Report</span>
                    </a>

                    <button
                      onClick={() => handleCopyPitch(`wa-${p.scanId}`, p.coldWhatsAppPitch)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 px-3.5 py-2 text-xs font-semibold text-emerald-300 transition-colors"
                    >
                      <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />
                      <span>{copiedPitchId === `wa-${p.scanId}` ? 'Copied Pitch!' : 'Copy WA Pitch'}</span>
                    </button>

                    <button
                      onClick={() => handleCopyPitch(`mail-${p.scanId}`, p.coldEmailPitch)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 px-3.5 py-2 text-xs font-semibold text-rose-300 transition-colors"
                    >
                      <FileText className="h-3.5 w-3.5 text-rose-400" />
                      <span>{copiedPitchId === `mail-${p.scanId}` ? 'Copied Email!' : 'Copy Email Pitch'}</span>
                    </button>
                  </div>
                </div>

                {/* Cold WhatsApp Pitch Preview */}
                <div className="rounded-xl bg-slate-900/90 p-3.5 border border-slate-800 text-xs text-slate-300 font-mono space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block font-sans">
                    Generated WhatsApp Cold Hook Preview:
                  </span>
                  <p className="whitespace-pre-line text-[11px] text-slate-200">
                    {p.coldWhatsAppPitch}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
