import React from 'react';
import { AuditResult } from '../types';

interface LeadAuditPanelProps { result: AuditResult; }

export const LeadAuditPanel: React.FC<LeadAuditPanelProps> = ({ result }) => {
  const audit = (result as AuditResult & { leadAuditData?: any }).leadAuditData;
  if (!audit) return <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-400">Lead Audit data is unavailable for this report.</div>;
  const sections = [
    ['Emails', audit.emails || []], ['Phones', audit.phones || []], ['WhatsApp', audit.whatsapp || []],
  ];
  return <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 md:p-8 space-y-6">
    <div><h2 className="text-xl font-bold text-white">Lead Audit</h2><p className="text-xs text-slate-400 mt-1">Contact paths, forms, analytics, and broken links found in the fetched page.</p></div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">{sections.map(([label, values]) => <div key={label as string} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4"><h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">{label as string}</h3><div className="mt-3 space-y-1 text-xs text-slate-400">{(values as string[]).length ? (values as string[]).map(value => <div key={value} className="truncate font-mono">{value}</div>) : <span>None found</span>}</div></div>)}</div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4"><h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Forms</h3>{audit.forms?.length ? audit.forms.map((form: any, index: number) => <div key={index} className="mt-3 border-t border-slate-800 pt-3 text-xs text-slate-400"><div className="font-mono text-slate-200 truncate">{form.resolvedAction || form.action}</div><div>{form.isInternal ? 'Internal' : 'External'} · {form.method} · {form.inputCount} fields</div></div>) : <p className="mt-3 text-xs text-slate-500">No forms detected.</p>}</div>
      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4"><h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Analytics</h3><div className="mt-3 flex flex-wrap gap-2">{['gtag', 'googleTagManager', 'fbq'].map(key => <span key={key} className={`rounded-full border px-2.5 py-1 text-xs ${audit.analytics?.[key] ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-slate-700 text-slate-500'}`}>{key}: {audit.analytics?.[key] ? 'detected' : 'not detected'}</span>)}</div></div>
    </div>
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4"><h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Broken Links</h3>{audit.brokenLinks?.length ? <div className="mt-3 space-y-2">{audit.brokenLinks.map((link: any) => <div key={link.url} className="flex flex-wrap justify-between gap-2 text-xs"><span className="max-w-[75%] truncate font-mono text-slate-400">{link.url}</span><span className={link.broken ? 'text-rose-300' : 'text-emerald-300'}>{link.broken ? `Broken${link.status ? ` (${link.status})` : ''}` : `OK (${link.status})`}</span></div>)}</div> : <p className="mt-3 text-xs text-slate-500">No HTTP links were checked.</p>}</div>
  </div>;
};
