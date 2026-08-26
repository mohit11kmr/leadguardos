import React, { useState, useEffect } from 'react';
import { PageHeader } from './common/PageHeader';
import { EmptyState } from './common/EmptyState';
import { SeverityBadge } from './common/SeverityBadge';
import { FileText, Download, Share2, ArrowRight, Clock, ShieldCheck, Check, Search, Trash2, Globe, Sparkles } from 'lucide-react';
import { AuditResult } from '../types';
import { generateAuditPdf } from '../utils/pdfGenerator';
import { apiFetch } from '../lib/api';

interface ReportsViewProps {
  currentAudit: AuditResult | null;
  onOpenAudit: (audit: AuditResult) => void;
  onNewScan: () => void;
  onOpenShareModal?: (audit: AuditResult) => void;
}

interface SavedScanSummary {
  id: string;
  domain: string;
  score: number;
  estimatedMonthlyLoss: number;
  totalIssues: number;
  scannedAt: string;
  raw?: AuditResult;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  currentAudit,
  onOpenAudit,
  onNewScan,
  onOpenShareModal,
}) => {
  const [savedScans, setSavedScans] = useState<SavedScanSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, [currentAudit]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch('/api/scans/history');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setSavedScans(data);
          return;
        }
      }
    } catch (e) {
      console.error('Failed to load history from server:', e);
    } finally {
      setIsLoading(false);
    }

    // Fallback: If currentAudit exists, show it as primary entry
    if (currentAudit) {
      setSavedScans([
        {
          id: currentAudit.scanId || 'current',
          domain: currentAudit.domain,
          score: currentAudit.score,
          estimatedMonthlyLoss: currentAudit.estimatedMonthlyLoss,
          totalIssues: currentAudit.allIssues?.length || 0,
          scannedAt: currentAudit.scannedAt || new Date().toISOString(),
          raw: currentAudit,
        },
      ]);
    }
  };

  const handleDownloadPdf = (scan: SavedScanSummary) => {
    if (scan.raw) {
      generateAuditPdf(scan.raw);
    } else if (currentAudit && currentAudit.domain === scan.domain) {
      generateAuditPdf(currentAudit);
    }
  };

  const handleCopyLink = (scanId: string) => {
    const shareUrl = `${window.location.origin}/report/${scanId}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedId(scanId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <PageHeader
        title="Audit Reports Hub"
        subtitle="Access forensic reports, download branded client PDFs, and share verified diagnostic links."
        badge="Reports Archive"
        badgeVariant="cyan"
        actions={
          <button
            onClick={onNewScan}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-xs sm:text-sm font-semibold text-white transition-all shadow-lg shadow-rose-950/40 active:scale-95"
          >
            <Search className="h-4 w-4" />
            <span>New Website Audit</span>
          </button>
        }
      />

      {/* Reports Grid / Empty State */}
      {savedScans.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No Audit Reports Yet"
          description="You haven't generated any website audits yet. Scan your website or test a client domain to generate your first forensic report."
          actionLabel="Scan My Website"
          onAction={onNewScan}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {savedScans.map((scan) => {
            const isHealthy = scan.score >= 80;
            const isModerate = scan.score >= 50 && scan.score < 80;
            const scoreColor = isHealthy ? 'text-emerald-400' : isModerate ? 'text-amber-400' : 'text-rose-400';
            const isCopied = copiedId === scan.id;

            return (
              <div
                key={scan.id}
                className="rounded-2xl border border-slate-800/80 bg-slate-900/60 hover:border-slate-700 transition-all p-5 space-y-4 flex flex-col justify-between backdrop-blur-sm"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 font-bold text-xs">
                        <Globe className="h-4 w-4" />
                      </div>
                      <span className="font-bold text-white text-sm truncate max-w-[180px]">
                        {scan.domain}
                      </span>
                    </div>
                    <span className={`text-lg font-black font-mono ${scoreColor}`}>
                      {scan.score}<span className="text-xs text-slate-400 font-normal">/100</span>
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Est. Monthly Loss:</span>
                      <span className="font-bold text-rose-400 font-mono">
                        ₹{scan.estimatedMonthlyLoss?.toLocaleString('en-IN') || 0}/mo
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Issues Detected:</span>
                      <span className="font-medium text-slate-200">
                        {scan.totalIssues} problems
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleDownloadPdf(scan)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>PDF</span>
                  </button>

                  <button
                    onClick={() => handleCopyLink(scan.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                  >
                    {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Share2 className="h-3.5 w-3.5" />}
                    <span>{isCopied ? 'Copied' : 'Share'}</span>
                  </button>

                  {scan.raw && (
                    <button
                      onClick={() => onOpenAudit(scan.raw!)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors ml-auto shadow-sm"
                    >
                      <span>View</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
