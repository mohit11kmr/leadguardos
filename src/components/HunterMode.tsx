import React, { useState } from 'react';
import { HunterProspect } from '../types';
import { getAll116SmeLeads, SmeLead } from '../data/smeLeadsVault';
import { Crosshair, Download, Send, Sparkles, AlertTriangle, CheckCircle2, Copy, FileText, Filter, MessageSquare, ExternalLink, RefreshCw, Layers, Phone, Building2, MapPin, Check } from 'lucide-react';

interface HunterModeProps {
  onSelectProspectForPitch?: (prospect: { domain: string; businessName: string; issues: string }) => void;
}

export const HunterMode: React.FC<HunterModeProps> = ({ onSelectProspectForPitch }) => {
  const [prospects, setProspects] = useState<SmeLead[]>(getAll116SmeLeads());
  const [selectedIndustry, setSelectedIndustry] = useState<string>('ALL');
  const [filterSeverity, setFilterSeverity] = useState<'ALL' | 'CRITICAL' | 'ZERO_INTENT' | 'MISSING_PIXEL' | 'BROKEN_CALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLeadModal, setSelectedLeadModal] = useState<SmeLead | null>(null);
  const [copiedPitchId, setCopiedPitchId] = useState<string | null>(null);

  const industries = [
    'ALL',
    'Healthcare & Dental',
    'Real Estate',
    'Fashion & D2C',
    'Salon & Spa',
    'Education & Coaching',
    'Solar & Services',
    'Automobile',
    'Legal & Financial',
    'Hospitality & Events',
  ];

  const filteredProspects = prospects.filter((p) => {
    if (selectedIndustry !== 'ALL' && p.industry !== selectedIndustry) return false;
    if (filterSeverity === 'CRITICAL' && p.adSpendRisk !== 'CRITICAL' && p.score >= 40) return false;
    if (filterSeverity === 'ZERO_INTENT' && p.whatsappStatus !== 'ZERO_INTENT') return false;
    if (filterSeverity === 'MISSING_PIXEL' && p.metaPixelStatus !== 'MISSING') return false;
    if (filterSeverity === 'BROKEN_CALL' && p.phoneStatus !== 'BROKEN') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.domain.toLowerCase().includes(q) ||
        p.businessName.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.primaryLeak.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleExportCSV = () => {
    if (filteredProspects.length === 0) return;

    const headers = [
      'Lead ID',
      'Target Domain',
      'Business Name',
      'Industry',
      'City',
      'Health Score',
      'Est. Monthly Loss (INR)',
      'Primary Revenue Leak',
      'WhatsApp Status',
      'Meta Pixel',
      'Cold WhatsApp Pitch',
      'Cold Email Pitch',
    ];

    const rows = filteredProspects.map((p) => [
      `"${p.id}"`,
      `"${p.domain}"`,
      `"${p.businessName}"`,
      `"${p.industry}"`,
      `"${p.city}"`,
      p.score,
      p.estimatedMonthlyLoss,
      `"${p.primaryLeak.replace(/"/g, '""')}"`,
      p.whatsappStatus,
      p.metaPixelStatus,
      `"${p.coldWhatsAppPitch.replace(/"/g, '""')}"`,
      `"${p.coldEmailPitch.replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `LeadGuard_116_Lost_Leads_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyPitch = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPitchId(id);
    setTimeout(() => setCopiedPitchId(null), 2500);
  };

  const handleOpenWhatsAppOutreach = (pitch: string) => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(pitch)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Top Banner */}
      <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900/90 via-slate-900 to-slate-950 p-6 md:p-8 shadow-2xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-rose-400">
              <Crosshair className="h-3.5 w-3.5 text-rose-400" />
              <span>Agency Goldmine • 116 Pre-Audited Broken SME Leads</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              116 High-Intent Indian SME Leads Losing Customers
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Real scanned Indian businesses with verified +9191 WhatsApp bugs, missing Meta Pixels, and zero-intent leaks. Ready for 1-click cold outreach.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-3 text-xs sm:text-sm transition-all border border-slate-700 active:scale-95 shadow-md"
            >
              <Download className="h-4 w-4 text-rose-400" />
              <span>Export {filteredProspects.length} Leads (CSV)</span>
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="mt-6 pt-6 border-t border-slate-800 flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by city (e.g. Mumbai, Delhi, Jaipur), domain, or business name..."
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:border-rose-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
              className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-xs font-semibold text-slate-200 focus:border-rose-500 focus:outline-none"
            >
              {industries.map((ind) => (
                <option key={ind} value={ind}>
                  {ind === 'ALL' ? '🏢 All Industries' : ind}
                </option>
              ))}
            </select>

            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value as any)}
              className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-xs font-semibold text-slate-200 focus:border-rose-500 focus:outline-none"
            >
              <option value="ALL">🔍 All Issue Types</option>
              <option value="CRITICAL">🔴 Critical Revenue Drop</option>
              <option value="ZERO_INTENT">💬 Zero-Intent WhatsApp</option>
              <option value="MISSING_PIXEL">🎯 Missing Meta Pixel</option>
              <option value="BROKEN_CALL">📞 Dead Call Button</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <span className="text-[11px] text-slate-400 font-medium">Qualified Leads</span>
          <div className="text-xl font-extrabold text-white mt-1">{filteredProspects.length} Sites</div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <span className="text-[11px] text-slate-400 font-medium">Avg. Monthly Loss</span>
          <div className="text-xl font-extrabold text-rose-400 mt-1">₹34,500/mo</div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <span className="text-[11px] text-slate-400 font-medium">Outreach Conversion</span>
          <div className="text-xl font-extrabold text-emerald-400 mt-1">28.4% Response</div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <span className="text-[11px] text-slate-400 font-medium">Fix Turnaround</span>
          <div className="text-xl font-extrabold text-indigo-400 mt-1">15 Mins</div>
        </div>
      </div>

      {/* Prospects Table / Grid */}
      <div className="space-y-4">
        {filteredProspects.map((lead) => (
          <div
            key={lead.id}
            className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4 shadow-xl hover:border-slate-700 transition-all"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    {lead.id}
                  </span>
                  <h3 className="text-base font-bold text-white">{lead.businessName}</h3>
                  <span className="text-xs text-slate-400 font-mono font-medium">({lead.domain})</span>
                  <span className="flex items-center gap-1 text-[11px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full">
                    <MapPin className="h-3 w-3 text-rose-400" />
                    {lead.city}
                  </span>
                  <span className="text-[11px] text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-800/40 font-medium">
                    {lead.industry}
                  </span>
                </div>

                <p className="text-xs text-rose-300 font-medium flex items-center gap-1.5 pt-1">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-400" />
                  <span>Primary Leak: {lead.primaryLeak}</span>
                </p>
              </div>

              {/* Score & Estimated Loss */}
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Health Score</span>
                  <span className={`text-xl font-black ${
                    lead.score < 40 ? 'text-rose-400' : 'text-amber-400'
                  }`}>
                    {lead.score}/100
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Lost Value</span>
                  <span className="text-base font-extrabold text-rose-400">
                    ₹{lead.estimatedMonthlyLoss.toLocaleString('en-IN')}/mo
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions & Outreach */}
            <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  lead.whatsappStatus === 'BROKEN'
                    ? 'bg-red-500/10 text-red-400 border-red-500/30'
                    : lead.whatsappStatus === 'ZERO_INTENT'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                }`}>
                  WA: {lead.whatsappStatus}
                </span>

                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  lead.metaPixelStatus === 'MISSING'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                }`}>
                  Pixel: {lead.metaPixelStatus}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedLeadModal(lead)}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 text-xs font-bold transition-all border border-slate-700"
                >
                  <MessageSquare className="h-3.5 w-3.5 text-rose-400" />
                  <span>View Outreach Pitch</span>
                </button>

                <button
                  onClick={() => handleOpenWhatsAppOutreach(lead.coldWhatsAppPitch)}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 text-xs font-bold transition-all shadow-md active:scale-95"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Pitch on WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Outreach Pitch Modal */}
      {selectedLeadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 md:p-8 max-w-2xl w-full space-y-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
                  <MessageSquare className="h-4 w-4 text-rose-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{selectedLeadModal.businessName}</h3>
                  <p className="text-xs text-slate-400">{selectedLeadModal.domain} • {selectedLeadModal.city}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedLeadModal(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* WhatsApp Pitch Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">📱 WhatsApp Pitch (Hindi + English):</span>
                <button
                  onClick={() => handleCopyPitch(selectedLeadModal.id + '_wa', selectedLeadModal.coldWhatsAppPitch)}
                  className="text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1"
                >
                  {copiedPitchId === selectedLeadModal.id + '_wa' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedPitchId === selectedLeadModal.id + '_wa' ? 'Copied!' : 'Copy Text'}</span>
                </button>
              </div>
              <textarea
                readOnly
                rows={5}
                value={selectedLeadModal.coldWhatsAppPitch}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-slate-200 font-mono focus:outline-none"
              />
            </div>

            {/* Email Pitch Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">✉️ Cold Email Pitch:</span>
                <button
                  onClick={() => handleCopyPitch(selectedLeadModal.id + '_email', selectedLeadModal.coldEmailPitch)}
                  className="text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1"
                >
                  {copiedPitchId === selectedLeadModal.id + '_email' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedPitchId === selectedLeadModal.id + '_email' ? 'Copied!' : 'Copy Text'}</span>
                </button>
              </div>
              <textarea
                readOnly
                rows={4}
                value={selectedLeadModal.coldEmailPitch}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-slate-200 font-mono focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedLeadModal(null)}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-200"
              >
                Close
              </button>
              <button
                onClick={() => handleOpenWhatsAppOutreach(selectedLeadModal.coldWhatsAppPitch)}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md transition-all active:scale-95"
              >
                <Send className="h-4 w-4" />
                <span>Launch in WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
