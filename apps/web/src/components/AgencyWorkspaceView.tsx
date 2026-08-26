import React, { useState } from 'react';
import { Layers, Users, Globe, Image, Check, Plus } from 'lucide-react';

export const AgencyWorkspaceView: React.FC = () => {
  const [clients, setClients] = useState<any[]>([
    { id: 'cli_1', name: 'Sharma Dental Clinic', domains: ['drsharmadental.in'], contact: 'drsharma@dental.in' },
    { id: 'cli_2', name: 'Elite Salon & Spa', domains: ['elitesalonmumbai.com'], contact: 'contact@elitesalon.in' },
  ]);

  const [clientName, setClientName] = useState('');
  const [domainInput, setDomainInput] = useState('');
  const [logoUrl, setLogoUrl] = useState('https://leadguard.os/assets/agency-logo-sample.png');
  const [agencyName, setAgencyName] = useState('Apex Digital Growth Agency');
  const [brandColor, setBrandColor] = useState('#E11D48');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleAddClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !domainInput.trim()) return;

    const newClient = {
      id: `cli_${Date.now()}`,
      name: clientName.trim(),
      domains: [domainInput.trim()],
      contact: 'client@agency.com',
    };

    setClients([...clients, newClient]);
    setClientName('');
    setDomainInput('');
  };

  const handleSaveWhiteLabel = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      
      {/* Header */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 md:p-8 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <span className="text-[10px] font-extrabold text-rose-400 uppercase tracking-widest flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-rose-500" />
              Agency Pitch Studio & Multi-Client Workspace
            </span>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">Agency Workspace & White-Label Reports</h2>
            <p className="text-xs text-slate-400 mt-1">Manage client website audits, team roles, and custom agency PDF report branding.</p>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase">
            AGENCY STUDIO
          </span>
        </div>

        {/* Client Management Section */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-400" />
            Client Accounts & Assigned Domains
          </h3>

          <form onSubmit={handleAddClient} className="flex flex-col sm:flex-row items-center gap-2 pt-1">
            <input
              type="text"
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              placeholder="Client Name (e.g. Sharma Dental Clinic)"
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none w-full"
            />
            <input
              type="text"
              value={domainInput}
              onChange={e => setDomainInput(e.target.value)}
              placeholder="Assigned Domain (e.g. drsharmadental.in)"
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none w-full"
            />
            <button
              type="submit"
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white whitespace-nowrap flex items-center justify-center gap-1.5 shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>Add Client</span>
            </button>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {clients.map(cli => (
              <div key={cli.id} className="rounded-xl bg-slate-900 border border-slate-800 p-3.5 space-y-1">
                <h4 className="text-xs font-bold text-white">{cli.name}</h4>
                <div className="text-[11px] font-mono text-rose-300 flex items-center gap-1">
                  <Globe className="h-3 w-3 text-slate-400" />
                  <span>{cli.domains.join(', ')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* White-Label PDF Branding Settings */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Image className="h-4 w-4 text-indigo-400" />
            White-Label Report Branding
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-medium">Agency / Company Name:</label>
              <input
                type="text"
                value={agencyName}
                onChange={e => setAgencyName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-medium">Report Brand Accent Color:</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={brandColor}
                  onChange={e => setBrandColor(e.target.value)}
                  className="w-9 h-9 rounded-lg bg-transparent border-0 cursor-pointer"
                />
                <span className="text-xs font-mono text-slate-300">{brandColor}</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleSaveWhiteLabel}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white flex items-center gap-1.5"
          >
            {savedSuccess ? <Check className="h-4 w-4 text-emerald-400" /> : null}
            <span>{savedSuccess ? 'Branding Saved!' : 'Save White-Label Branding'}</span>
          </button>
        </div>

      </div>

    </div>
  );
};
