import React, { useState } from 'react';
import { AuditResult } from '../types';
import { Share2, Copy, Check, ExternalLink, Download, MessageSquare, X, ShieldCheck, FileText, CheckCircle2 } from 'lucide-react';

interface ShareableReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: AuditResult;
}

export const ShareableReportModal: React.FC<ShareableReportModalProps> = ({
  isOpen,
  onClose,
  result,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPitch, setCopiedPitch] = useState(false);

  if (!isOpen) return null;

  const reportUrl = `${window.location.origin}/report/${result.scanId}`;
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(reportUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const shareViaWhatsApp = () => {
    const message = `Namaste! Here is the detailed 4-Pillar Website Conversion & Security Audit for *${result.domain}* (Score: ${result.score}/100):\n\n${reportUrl}\n\nKey issues detected: ${result.allIssues.slice(0, 2).map(i => i.title).join(', ')}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleDownloadJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(result, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `LeadGuard-Audit-${result.domain}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900 p-6 md:p-8 shadow-2xl space-y-6 my-auto max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Share2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Shareable Forensic Audit Report</h3>
            <p className="text-xs text-slate-400">
              Share a clean, public diagnostic report with your client, developer, or stakeholder
            </p>
          </div>
        </div>

        {/* Report Overview Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300">Target Website:</span>
            <strong className="text-white font-mono">{result.domain}</strong>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300">Funnel Score:</span>
            <span className={`px-2 py-0.5 rounded-full font-bold font-mono ${result.score >= 80 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
              {result.score}/100
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300">Monthly Revenue Bleed:</span>
            <strong className="text-rose-400 font-mono">₹{result.estimatedMonthlyLoss.toLocaleString('en-IN')}/mo</strong>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300">Total Vulnerabilities:</span>
            <span className="text-slate-300 font-semibold">{result.allIssues.length} Findings</span>
          </div>
        </div>

        {/* Shareable Link Input */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300">Public Shareable Link</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={reportUrl}
              className="flex-1 rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-slate-300 font-mono select-all focus:outline-none"
            />
            <button
              onClick={handleCopyLink}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-md shadow-indigo-950/40"
            >
              {copiedLink ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
          <button
            onClick={shareViaWhatsApp}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition-colors"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Send on WhatsApp</span>
          </button>

          <button
            onClick={handlePrintPDF}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition-colors"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Export / Print PDF</span>
          </button>

          <button
            onClick={handleDownloadJSON}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download JSON</span>
          </button>
        </div>

      </div>
    </div>
  );
};
