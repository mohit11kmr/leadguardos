import React, { useState } from 'react';
import { Shield, TrendingDown, Layers, Radio, Zap, ChevronDown, Swords, MessageCircle, ShoppingCart, Crosshair, Phone, Globe, User, LogIn, LogOut, Wrench, Settings, CreditCard, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { AuthModal } from './AuthModal';

export type AppTab = 'scanner' | 'dashboard' | 'schedules' | 'sabotage-radar' | 'zero-intent' | 'cart-death' | 'hunter' | 'funnel' | 'agency' | 'watchdog' | 'pricing' | 'billing' | 'settings' | 'admin' | 'developer' | 'workspace';

interface NavbarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  onSelectSample: (domain: string) => void;
  onOpenContact: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onSelectSample,
  onOpenContact,
}) => {
  const { lang, setLang, t } = useLanguage();
  const { user, profile, signOut, isAdmin } = useAuth();
  const [isToolsDropdownOpen, setIsToolsDropdownOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const primaryTabs = [
    { id: 'scanner', label: t('nav.liveAudit', 'Live Audit'), icon: Shield },
    { id: 'watchdog', label: t('nav.watchdog', '24/7 Watchdog'), icon: Radio },
    { id: 'pricing', label: t('nav.pricing', 'Plans & Pricing'), icon: Zap },
  ];

  const secondaryTools = [
    { id: 'dashboard', label: 'Executive Intelligence', description: 'Vulnerability trends & 7-day risk analysis', icon: TrendingDown },
    { id: 'schedules', label: 'Automated Schedules', description: 'Configure 24/7 background audit timers', icon: Radio },
    { id: 'funnel', label: 'Funnel Simulator', description: 'Simulate ad spend dropoffs & conversion leaks', icon: TrendingDown },
    { id: 'workspace', label: 'Agency Workspace', description: 'Client management & white-label reports', icon: Layers },
    { id: 'developer', label: 'Developer Portal', description: 'REST API keys, webhooks & OpenAPI spec', icon: Wrench },
    { id: 'sabotage-radar', label: 'Competitive Monitor', description: 'Audit competitor landing pages & leaks', icon: Swords },
    { id: 'zero-intent', label: 'CTA & WhatsApp Analyzer', description: 'Check mobile chat links & drop-offs', icon: MessageCircle },
    { id: 'cart-death', label: 'Cart Leakage Detector', description: 'Identify e-commerce checkout barriers', icon: ShoppingCart },
    { id: 'hunter', label: 'Prospect Hunter', description: 'Find & audit lead opportunities', icon: Crosshair },
  ];

  const isSecondaryActive = secondaryTools.some(tool => tool.id === activeTab);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-rose-500/20 bg-slate-950/85 backdrop-blur-2xl shadow-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        
        {/* Brand Identity */}
        <div 
          className="flex items-center gap-2.5 cursor-pointer select-none group shrink-0" 
          onClick={() => setActiveTab('scanner')}
        >
          <div className="relative flex items-center justify-center">
            <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-rose-500 to-rose-700 opacity-60 blur-sm group-hover:opacity-100 transition-opacity"></div>
            <div className="relative w-9 h-9 bg-slate-950 rounded-xl flex items-center justify-center font-bold text-white shadow-lg border border-rose-500/40">
              <Shield className="h-5 w-5 text-rose-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold tracking-tight text-white">
                LeadGuard<span className="bg-gradient-to-r from-rose-400 to-amber-300 bg-clip-text text-transparent font-extrabold ml-0.5">OS</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-300 border border-rose-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" />
                Shield
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">Diagnostic & Lead Recovery</p>
          </div>
        </div>

        {/* Clean Structured Navigation Bar (3 Primary Tabs + Tools Dropdown) */}
        <nav className="hidden lg:flex items-center gap-1.5 rounded-xl bg-slate-900/90 p-1 border border-slate-800 shadow-inner">
          {primaryTabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                id={`nav-tab-${t.id}`}
                onClick={() => setActiveTab(t.id as AppTab)}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold tracking-wide whitespace-nowrap transition-all relative ${
                  isActive
                    ? 'bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-md shadow-rose-950/60 border border-rose-400/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{t.label}</span>
              </button>
            );
          })}

          {/* Secondary Tools Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsToolsDropdownOpen(!isToolsDropdownOpen)}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold tracking-wide whitespace-nowrap transition-all ${
                isSecondaryActive
                  ? 'bg-rose-950/80 text-rose-300 border border-rose-500/50 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
              }`}
            >
              <Wrench className="h-3.5 w-3.5 text-rose-400 shrink-0" />
              <span>Tools & Advanced</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isToolsDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isToolsDropdownOpen && (
              <div 
                className="absolute right-0 mt-2 w-72 rounded-2xl bg-slate-950/95 border border-rose-500/30 shadow-2xl p-2 z-50 space-y-1 backdrop-blur-2xl max-h-[420px] overflow-y-auto"
                onMouseLeave={() => setIsToolsDropdownOpen(false)}
              >
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Diagnostic Modules & Tools
                </div>
                {secondaryTools.map((tool) => {
                  const Icon = tool.icon;
                  const isActive = activeTab === tool.id;
                  return (
                    <button
                      key={tool.id}
                      onClick={() => {
                        setActiveTab(tool.id as AppTab);
                        setIsToolsDropdownOpen(false);
                      }}
                      className={`w-full text-left flex items-start gap-2.5 p-2.5 rounded-xl text-xs transition-colors ${
                        isActive
                          ? 'bg-rose-500/20 border border-rose-500/40 text-white font-medium shadow-sm'
                          : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                      }`}
                    >
                      <Icon className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-slate-200">{tool.label}</div>
                        <div className="text-[11px] text-slate-400 leading-tight">{tool.description}</div>
                      </div>
                    </button>
                  );
                })}

                {/* Sample Presets inside Tools */}
                <div className="border-t border-slate-800/80 pt-2 mt-2 px-3 pb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Load Demo Presets:</span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => { onSelectSample('drsharmadental.in'); setActiveTab('scanner'); setIsToolsDropdownOpen(false); }}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 text-[11px] border border-slate-800 transition-colors"
                    >
                      Dr. Sharma Dental
                    </button>
                    <button
                      onClick={() => { onSelectSample('elitesalonmumbai.com'); setActiveTab('scanner'); setIsToolsDropdownOpen(false); }}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 text-[11px] border border-slate-800 transition-colors"
                    >
                      Elite Salon
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Actions Toolbar (Clean, No Phone Number Clutter) */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* Language Switcher */}
          <button
            onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 border border-slate-800 px-2.5 py-1.5 text-xs font-bold text-slate-200 hover:border-slate-700 transition-colors shadow-sm whitespace-nowrap"
            title="Toggle Hindi / English Language"
          >
            <Globe className="h-3.5 w-3.5 text-rose-400 shrink-0" />
            <span className="uppercase">{lang === 'en' ? 'HI' : 'EN'}</span>
          </button>

          {/* Help Contact Button (Clean Icon Only, No Raw Number) */}
          <button
            onClick={onOpenContact}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 border border-emerald-500/40 hover:border-emerald-500/70 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition-colors shadow-sm whitespace-nowrap"
            title="Direct Founder Support & Help"
          >
            <Phone className="h-3.5 w-3.5 text-emerald-400 animate-pulse shrink-0" />
            <span className="hidden sm:inline">Help</span>
          </button>

          {/* User Auth Profile */}
          {user || profile ? (
            <div className="flex items-center gap-2 pl-1 border-l border-slate-800">
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" className="w-5 h-5 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <User className="w-4 h-4 text-rose-400" />
                )}
                <span className="text-xs font-medium text-slate-200 max-w-[90px] truncate hidden sm:inline">
                  {profile?.displayName?.split(' ')[0] || user?.displayName?.split(' ')[0] || 'User'}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {profile?.role || 'USER'}
                </span>
              </div>
              <button
                onClick={() => signOut()}
                title="Sign Out"
                className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white px-3 py-1.5 text-xs font-semibold shadow-md shadow-rose-950/50 transition-all whitespace-nowrap active:scale-95"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          )}

        </div>

      </div>

      {/* Mobile Nav Bar */}
      <div className="flex lg:hidden border-t border-slate-800/80 bg-slate-950 px-3 py-2 overflow-x-auto gap-1.5 scrollbar-none">
        {[...primaryTabs, ...secondaryTools].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as AppTab)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="whitespace-nowrap">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </header>
  );
};
