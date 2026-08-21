import React, { useState } from 'react';
import { Layers, Search, Loader2, AlertCircle, ArrowUpRight, Download, Send, Zap, CheckCircle2, XCircle } from 'lucide-react';

interface BatchProspectScannerProps {
  onSelectProspectForPitch: (prospect: { domain: string; businessName: string; issues: string }) => void;
}

export const BatchProspectScanner: React.FC<BatchProspectScannerProps> = ({ onSelectProspectForPitch }) => {
  const [urlsInput, setUrlsInput] = useState<string>(
    `drsharmadental.in\nelitesalonmumbai.com\napexgrandrealestate.com\nurbanvogue.in`
  );
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [activeNiche, setActiveNiche] = useState<string>('all');

  const NICHE_PRESETS = [
    {
      id: 'dental',
      label: '🏥 Dental & Cosmetic Clinics',
      urls: `drsharmadental.in\ncare32dentalclinic.in\ncosmeticdentistrydelhi.com\napollodentalcare.in`,
    },
    {
      id: 'salon',
      label: '💇 Luxury Salons & Spas',
      urls: `elitesalonmumbai.com\nglamourstudiodelhi.com\nblisshairsalon.in\nluxespaaesthetics.com`,
    },
    {
      id: 'realestate',
      label: '🏢 Real Estate & Builders',
      urls: `apexgrandrealestate.com\nskylinepropertiesblr.com\ngoldenpalmsresidences.in\nprimeestatesmumbai.com`,
    },
    {
      id: 'd2c',
      label: '🛍️ D2C & Apparel Brands',
      urls: `urbanvogue.in\norganicskinessentials.in\ntrendyfitsfashion.com\npureherbalcure.in`,
    },
  ];

  const handleBatchScan = async () => {
    setIsScanning(true);
    setResults([]);

    const urlList = urlsInput
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    try {
      const response = await fetch('/api/scan-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: urlList }),
      });

      if (!response.ok) {
        throw new Error('Batch scan failed');
      }

      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      console.error('Batch scan error:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleExportCsv = () => {
    if (results.length === 0) return;

    const headers = ['Domain', 'Business Name', 'Score', 'Est Monthly Loss (INR)', 'Risk Level', 'Issues Detected'];
    const rows = results.map((r) => [
      r.domain || r.url,
      r.businessName || '',
      r.score || 0,
      r.estimatedMonthlyLoss || 0,
      r.adSpendRisk || 'UNKNOWN',
      (r.issues || []).join('; '),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `LeadGuard_Agency_Prospects_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 md:p-8 shadow-xl space-y-8 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-5">
        <div>
          <span className="text-[10px] font-extrabold font-mono text-red-400 uppercase tracking-widest">
            Agency Lead Prospecting Radar
          </span>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Layers className="h-6 w-6 text-red-500" />
            Bulk Website Scanner & Prospect Leaderboard
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Audit multiple local business websites in parallel. Identify high-loss targets to close agency fix retainers.
          </p>
        </div>

        {results.length > 0 && (
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 self-start sm:self-auto rounded-xl bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2 text-xs font-bold uppercase tracking-wider transition-all border border-slate-700"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Prospect CSV</span>
          </button>
        )}
      </div>

      {/* Niche Preset Pickers */}
      <div>
        <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
          One-Click Industry Prospect Batches:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {NICHE_PRESETS.map((niche) => (
            <button
              key={niche.id}
              onClick={() => {
                setActiveNiche(niche.id);
                setUrlsInput(niche.urls);
              }}
              className={`rounded-xl border p-2.5 text-xs text-left font-bold transition-all ${
                activeNiche === niche.id
                  ? 'border-red-500 bg-red-950/30 text-white'
                  : 'border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {niche.label}
            </button>
          ))}
        </div>
      </div>

      {/* Textarea Input + Action Button */}
      <div className="space-y-3">
        <label className="block text-xs font-bold text-slate-300">
          Target URLs to Audit (1 per line, up to 10 sites):
        </label>
        <textarea
          rows={4}
          value={urlsInput}
          onChange={(e) => setUrlsInput(e.target.value)}
          placeholder="yourprospect1.in&#10;clientclinic.com&#10;luxurysalon.in"
          className="w-full rounded-2xl bg-slate-950 border border-slate-700 p-4 text-xs font-mono text-white focus:border-red-500 focus:outline-none leading-relaxed"
        />

        <button
          id="run-bulk-audit-btn"
          onClick={handleBatchScan}
          disabled={isScanning}
          className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 px-6 py-3 text-xs font-bold uppercase tracking-wider text-white active:scale-95 disabled:opacity-50 transition-all shadow-lg shadow-red-900/30"
        >
          {isScanning ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-white" />
              <span>Scanning All Websites in Parallel...</span>
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" />
              <span>Launch Bulk Agency Audit</span>
            </>
          )}
        </button>
      </div>

      {/* Results Table / Leaderboard */}
      {results.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              Prospecting Vulnerability Leaderboard ({results.length} Scanned)
            </h3>
            <span className="text-[11px] font-mono text-slate-400">Sorted by Outreach Priority</span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-900/80 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="p-3.5">Business & Domain</th>
                  <th className="p-3.5">Health Score</th>
                  <th className="p-3.5">Est. Monthly Loss</th>
                  <th className="p-3.5">Issues Found</th>
                  <th className="p-3.5 text-right">Agency Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium text-slate-200">
                {results.map((res, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-white">{res.businessName || res.domain || res.url}</div>
                      <div className="text-[11px] font-mono text-slate-400">{res.domain || res.url}</div>
                    </td>
                    <td className="p-3.5">
                      <span className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-black ${
                        res.score >= 80 ? 'bg-emerald-500/10 text-emerald-400' : res.score >= 50 ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {res.score}/100
                      </span>
                    </td>
                    <td className="p-3.5 font-bold font-mono text-red-400">
                      ₹{(res.estimatedMonthlyLoss || 0).toLocaleString('en-IN')}/mo
                    </td>
                    <td className="p-3.5 text-slate-400 text-[11px]">
                      {res.issues && res.issues.length > 0 ? (
                        <div className="space-y-0.5">
                          {res.issues.slice(0, 2).map((iss: string, i: number) => (
                            <div key={i} className="text-red-300 truncate max-w-[220px]">
                              • {iss}
                            </div>
                          ))}
                          {res.issues.length > 2 && (
                            <span className="text-[10px] text-slate-500 font-bold">
                              +{res.issues.length - 2} more issues
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-emerald-400">Zero Critical Leaks</span>
                      )}
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() =>
                          onSelectProspectForPitch({
                            domain: res.domain || res.url,
                            businessName: res.businessName || res.domain || res.url,
                            issues: (res.issues || []).join(', ') || 'Lead channel audit complete',
                          })
                        }
                        className="inline-flex items-center gap-1 rounded-lg bg-red-600 hover:bg-red-500 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white transition-all shadow-sm active:scale-95"
                      >
                        <Send className="h-3 w-3" />
                        <span>Pitch Lead</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
