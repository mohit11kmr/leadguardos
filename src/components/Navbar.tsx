import React from 'react';
import { Shield, TrendingDown, Layers, Radio, Zap, Sparkles, ChevronDown, Swords, MessageCircle, ShoppingCart, Crosshair, Phone, Globe, User, LogIn, LogOut } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export type AppTab = 'scanner' | 'sabotage-radar' | 'zero-intent' | 'cart-death' | 'hunter' | 'funnel' | 'agency' | 'watchdog' | 'pricing';

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
  const { user, profile, signInWithGoogle, signOut, isAgency, isAdmin } = useAuth();

  const tabs = [
    { id: 'scanner', label: t('nav.liveAudit', 'Live Audit'), icon: Shield },
    { id: 'sabotage-radar', label: t('nav.sabotage', 'Sabotage Radar'), icon: Swords },
    { id: 'zero-intent', label: t('nav.zeroIntent', 'Zero-Intent WA'), icon: MessageCircle },
    { id: 'cart-death', label: t('nav.cartDeath', 'Cart Death'), icon: ShoppingCart },
    { id: 'hunter', label: t('nav.hunter', 'Hunter Mode'), icon: Crosshair },
    { id: 'funnel', label: t('nav.funnel', 'Funnel Simulator'), icon: TrendingDown },
    { id: 'agency', label: t('nav.agency', 'Agency Hub'), icon: Layers },
    { id: 'watchdog', label: t('nav.watchdog', '24/7 Watchdog'), icon: Radio },
    { id: 'pricing', label: t('nav.pricing', 'Plans & Fixes'), icon: Zap },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        
        {/* Brand Identity */}
        <div 
          className="flex items-center gap-3 cursor-pointer select-none group" 
          onClick={() => setActiveTab('scanner')}
        >
          <div className="w-9 h-9 bg-gradient-to-br from-rose-500 to-rose-700 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-rose-950/40 border border-rose-400/30 group-hover:scale-105 transition-transform">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-white">
                LeadGuard<span className="text-rose-500 font-extrabold ml-0.5">OS</span>
              </span>
              <span className="hidden sm:inline-flex items-center rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-rose-400 border border-rose-500/20">
                Revenue Shield
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Diagnostic & Conversion Audit</p>
          </div>
        </div>

        {/* Clean Categorized Navigation Tabs with no-wrap and responsive styling */}
        <nav className="hidden lg:flex items-center gap-1 rounded-xl bg-slate-900/80 p-1 border border-slate-800/80 overflow-x-auto max-w-full">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                id={`nav-tab-${t.id}`}
                onClick={() => setActiveTab(t.id as AppTab)}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold tracking-wide whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-rose-600 text-white shadow-sm shadow-rose-900/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="whitespace-nowrap">{t.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Actions Toolbar: Language Toggle + Sample Selector + Contact Us + Auth */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          
          {/* Language Switcher Toggle */}
          <button
            onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 border border-slate-800 px-2.5 py-1.5 text-xs font-bold text-slate-200 hover:border-slate-700 transition-colors shadow-sm whitespace-nowrap"
            title="Toggle Hindi / English Language"
          >
            <Globe className="h-3.5 w-3.5 text-rose-400 shrink-0" />
            <span className="uppercase">{lang === 'en' ? 'HI' : 'EN'}</span>
          </button>

          {/* Contact Founder Modal Button */}
          <button
            onClick={onOpenContact}
            className="hidden md:inline-flex items-center gap-1.5 rounded-lg bg-slate-900 border border-emerald-500/30 hover:border-emerald-500/60 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition-colors shadow-sm whitespace-nowrap"
          >
            <Phone className="h-3.5 w-3.5 text-emerald-400 animate-pulse shrink-0" />
            <span className="whitespace-nowrap">Help (8307070605)</span>
          </button>

          {/* Live Case Study Dropdown */}
          <div className="relative shrink-0">
            <select
              id="demo-preset-select"
              onChange={(e) => {
                if (e.target.value) {
                  onSelectSample(e.target.value);
                  setActiveTab('scanner');
                }
              }}
              defaultValue=""
              aria-label="Test Demo Case Studies"
              className="rounded-lg bg-slate-900 border border-slate-700/80 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-500/40 appearance-none pr-7 cursor-pointer shadow-sm whitespace-nowrap"
            >
              <option value="" disabled>Demos</option>
              <option value="drsharmadental.in">Dr. Sharma Dental</option>
              <option value="elitesalonmumbai.com">Elite Salon</option>
              <option value="apexgrandrealestate.com">Apex Grand</option>
              <option value="urbanvogue.in">UrbanVogue</option>
            </select>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Firebase Authentication Sign-In / User Profile Badge */}
          {user ? (
            <div className="flex items-center gap-2 pl-1 border-l border-slate-800">
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" className="w-5 h-5 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <User className="w-4 h-4 text-rose-400" />
                )}
                <span className="text-xs font-medium text-slate-200 max-w-[90px] truncate hidden sm:inline">
                  {user.displayName?.split(' ')[0] || 'User'}
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
              onClick={() => signInWithGoogle()}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white px-2.5 py-1.5 text-xs font-semibold shadow-md shadow-rose-950/50 transition-all whitespace-nowrap"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          )}

        </div>

      </div>

      {/* Mobile & Tablet Nav Bar with Smooth Scrolling & No-Wrap */}
      <div className="flex lg:hidden border-t border-slate-800/80 bg-slate-950 px-3 py-2 overflow-x-auto gap-1.5 scrollbar-none">
        {tabs.map((t) => {
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
    </header>
  );
};

