import React, { useState } from 'react';
import { Shield, Search, FileText, Radio, Briefcase, Zap, HelpCircle, User, LogIn, LogOut, Wrench, Settings, Sun, Moon, Monitor, ChevronDown, Menu, X, MessageSquare, Star, Phone, Code, ShieldAlert } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useTheme, ThemeMode } from '../context/ThemeContext';

export type AppNavTab = 'audit' | 'reports' | 'monitoring' | 'agency' | 'pricing' | 'developer' | 'settings' | 'admin' | 'reviews' | 'blog';
export type AppTab = AppNavTab;

interface NavbarProps {
  activeTab: AppNavTab;
  setActiveTab: (tab: AppNavTab) => void;
  onSelectSample: (domain: string) => void;
  onOpenContact: () => void;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onSelectSample,
  onOpenContact,
  onOpenAuth,
}) => {
  const { lang, setLang } = useLanguage();
  const { user, profile, signOut, isAdmin } = useAuth();
  const { theme, setTheme } = useTheme();
  
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isHelpMenuOpen, setIsHelpMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const cycleTheme = () => {
    const modes: ThemeMode[] = ['dark', 'light', 'system'];
    const nextIndex = (modes.indexOf(theme) + 1) % modes.length;
    setTheme(modes[nextIndex]);
  };

  const navItems = [
    { id: 'audit', label: 'Audit', icon: Search },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'monitoring', label: 'Monitoring', icon: Radio },
    { id: 'agency', label: 'Agency', icon: Briefcase },
    { id: 'pricing', label: 'Pricing', icon: Zap },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl shadow-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        
        {/* Brand Logo & Tagline */}
        <div 
          className="flex items-center gap-3 cursor-pointer select-none group shrink-0" 
          onClick={() => {
            setActiveTab('audit');
            setIsMobileMenuOpen(false);
          }}
        >
          <div className="relative flex items-center justify-center">
            <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center text-rose-500 font-bold shadow-md border border-rose-500/30 group-hover:border-rose-500/60 transition-colors">
              <Shield className="h-5 w-5" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold tracking-tight text-white">
                LeadGuard<span className="bg-gradient-to-r from-rose-400 to-amber-300 bg-clip-text text-transparent font-extrabold ml-0.5">OS</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-300 border border-rose-500/20">
                Lead Protection
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden md:block">Stop Dropping Leads & Wasting Ad Spend</p>
          </div>
        </div>

        {/* Primary Desktop Navigation (Clean 5-Tab Architecture) */}
        <nav className="hidden md:flex items-center gap-1 rounded-2xl bg-slate-900/80 p-1.5 border border-slate-800 shadow-inner">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-tab-${item.id}`}
                onClick={() => setActiveTab(item.id as AppNavTab)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold tracking-wide transition-all ${
                  isActive
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-950/50 border border-rose-400/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Side: Help & Account Menus */}
        <div className="flex items-center gap-2">
          
          {/* Help Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setIsHelpMenuOpen(!isHelpMenuOpen);
                setIsAccountMenuOpen(false);
              }}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-colors"
            >
              <HelpCircle className="h-4 w-4 text-slate-400" />
              <span className="hidden sm:inline">Help</span>
              <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${isHelpMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isHelpMenuOpen && (
              <div 
                className="absolute right-0 mt-2 w-56 rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl p-2 z-50 space-y-1 backdrop-blur-2xl text-xs"
                onMouseLeave={() => setIsHelpMenuOpen(false)}
              >
                <button
                  onClick={() => {
                    onOpenContact();
                    setIsHelpMenuOpen(false);
                  }}
                  className="w-full text-left flex items-center gap-2.5 p-2.5 rounded-xl text-slate-200 hover:bg-slate-900 hover:text-white transition-colors"
                >
                  <Phone className="h-4 w-4 text-emerald-400" />
                  <div>
                    <div className="font-semibold">Direct Founder Support</div>
                    <div className="text-[10px] text-slate-400">+91 83070 70605</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('reviews');
                    setIsHelpMenuOpen(false);
                  }}
                  className="w-full text-left flex items-center gap-2.5 p-2.5 rounded-xl text-slate-200 hover:bg-slate-900 hover:text-white transition-colors"
                >
                  <Star className="h-4 w-4 text-amber-400" />
                  <div>
                    <div className="font-semibold">Client Reviews</div>
                    <div className="text-[10px] text-slate-400">Verified SMB Testimonials</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('blog');
                    setIsHelpMenuOpen(false);
                  }}
                  className="w-full text-left flex items-center gap-2.5 p-2.5 rounded-xl text-slate-200 hover:bg-slate-900 hover:text-white transition-colors"
                >
                  <FileText className="h-4 w-4 text-cyan-400" />
                  <div>
                    <div className="font-semibold">Knowledge Hub</div>
                    <div className="text-[10px] text-slate-400">How to fix +9191 WhatsApp bugs</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Account Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setIsAccountMenuOpen(!isAccountMenuOpen);
                setIsHelpMenuOpen(false);
              }}
              className="flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-850 px-3 py-2 text-xs font-semibold text-white border border-slate-800 transition-colors shadow-sm"
            >
              <div className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-[10px]">
                {user?.email?.charAt(0).toUpperCase() || <User className="h-3 w-3" />}
              </div>
              <span className="hidden sm:inline max-w-[100px] truncate">
                {user ? user.email?.split('@')[0] : 'Account'}
              </span>
              <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${isAccountMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isAccountMenuOpen && (
              <div 
                className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl p-2 z-50 space-y-1 backdrop-blur-2xl text-xs"
                onMouseLeave={() => setIsAccountMenuOpen(false)}
              >
                {user ? (
                  <div className="px-3 py-2 border-b border-slate-800/80 mb-1">
                    <div className="font-bold text-white truncate">{(profile as any)?.name || (profile as any)?.displayName || user.email}</div>
                    <div className="text-[10px] text-slate-400 truncate">{user.email}</div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      onOpenAuth();
                      setIsAccountMenuOpen(false);
                    }}
                    className="w-full text-left flex items-center gap-2 p-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold mb-1 shadow-md transition-colors"
                  >
                    <LogIn className="h-4 w-4" />
                    <span>Sign In / Register</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setActiveTab('developer');
                    setIsAccountMenuOpen(false);
                  }}
                  className="w-full text-left flex items-center gap-2.5 p-2.5 rounded-xl text-slate-200 hover:bg-slate-900 hover:text-white transition-colors"
                >
                  <Code className="h-4 w-4 text-cyan-400" />
                  <div>
                    <div className="font-semibold">Developer Portal</div>
                    <div className="text-[10px] text-slate-400">REST API Keys & Webhooks</div>
                  </div>
                </button>

                {isAdmin && (
                  <button
                    onClick={() => {
                      setActiveTab('admin');
                      setIsAccountMenuOpen(false);
                    }}
                    className="w-full text-left flex items-center gap-2.5 p-2.5 rounded-xl text-slate-200 hover:bg-slate-900 hover:text-white transition-colors"
                  >
                    <ShieldAlert className="h-4 w-4 text-amber-400" />
                    <div>
                      <div className="font-semibold">Admin Overview</div>
                      <div className="text-[10px] text-slate-400">System Logs & Metrics</div>
                    </div>
                  </button>
                )}

                {/* Theme & Language Utilities */}
                <div className="pt-2 border-t border-slate-800/80 mt-1 space-y-1">
                  <div className="flex items-center justify-between px-3 py-1.5 text-slate-400 text-[11px]">
                    <span>Language:</span>
                    <button
                      onClick={() => setLang(lang === 'hi' ? 'en' : 'hi')}
                      className="font-bold text-rose-400 hover:underline uppercase"
                    >
                      {lang === 'hi' ? '🇮🇳 Hinglish' : '🌐 English'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between px-3 py-1.5 text-slate-400 text-[11px]">
                    <span>Theme:</span>
                    <button
                      onClick={cycleTheme}
                      className="font-bold text-slate-200 hover:text-white capitalize flex items-center gap-1"
                    >
                      {theme === 'dark' ? <Moon className="h-3 w-3" /> : theme === 'light' ? <Sun className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}
                      <span>{theme}</span>
                    </button>
                  </div>
                </div>

                {user && (
                  <div className="pt-1 border-t border-slate-800/80">
                    <button
                      onClick={() => {
                        signOut();
                        setIsAccountMenuOpen(false);
                      }}
                      className="w-full text-left flex items-center gap-2 p-2.5 rounded-xl text-rose-400 hover:bg-rose-950/30 font-medium transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile Menu Hamburger Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-slate-900 text-slate-300 hover:text-white border border-slate-800"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950/95 p-4 space-y-2 backdrop-blur-2xl">
          <div className="grid grid-cols-2 gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as AppNavTab);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-2 rounded-xl p-3 text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-950/50'
                      : 'bg-slate-900 text-slate-300 border border-slate-800'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};
