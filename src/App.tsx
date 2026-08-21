import React, { useState, useEffect } from 'react';
import { Navbar, AppTab } from './components/Navbar';
import { HeroScanner } from './components/HeroScanner';
import { ScoreDashboard } from './components/ScoreDashboard';
import { ChannelMatrix } from './components/ChannelMatrix';
import { FreeFixAndLockedPaywall } from './components/FreeFixAndLockedPaywall';
import { FunnelLeakSimulator } from './components/FunnelLeakSimulator';
import { AgencyToolsHub } from './components/AgencyToolsHub';
import { WatchdogConsole } from './components/WatchdogConsole';
import { WatchdogModal } from './components/WatchdogModal';
import { ExpressFixModal } from './components/ExpressFixModal';
import { ContactUsModal } from './components/ContactUsModal';
import { WhatsAppAlertModal } from './components/WhatsAppAlertModal';
import { Footer } from './components/Footer';
import { MonetizationVault } from './components/MonetizationVault';
import { CompetitorSabotageRadar } from './components/CompetitorSabotageRadar';
import { ZeroIntentChecker } from './components/ZeroIntentChecker';
import { CartDeathMonitor } from './components/CartDeathMonitor';
import { HunterMode } from './components/HunterMode';
import { ScanCounterStats } from './components/ScanCounterStats';
import { LiveScanningRadar } from './components/LiveScanningRadar';
import { AuditResult, GlobalScanStats } from './types';
import { Shield, AlertCircle, Sparkles, CheckCircle2, ArrowRight, Search, ShieldCheck, Zap } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('scanner');
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeUrl, setActiveUrl] = useState('');
  const [globalStats, setGlobalStats] = useState<GlobalScanStats | null>(null);

  // Selected prospect for pitch
  const [selectedProspectPitch, setSelectedProspectPitch] = useState<{
    domain: string;
    businessName: string;
    issues: string;
  } | null>(null);

  // Modals
  const [isWatchdogOpen, setIsWatchdogOpen] = useState(false);
  const [isExpressFixOpen, setIsExpressFixOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);

  const fetchGlobalStats = async () => {
    try {
      const res = await fetch('/api/scan-stats');
      if (res.ok) {
        const data = await res.json();
        setGlobalStats(data);
      }
    } catch (err) {
      console.error('Failed to load scan stats:', err);
    }
  };

  useEffect(() => {
    fetchGlobalStats();
  }, []);

  const handleScan = async (url: string) => {
    if (!url.trim()) return;
    setIsLoading(true);
    setErrorMessage(null);
    setActiveUrl(url);

    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to complete website scan.');
      }

      const data: AuditResult = await response.json();
      setAuditResult(data);
      // Refresh global stats counter after successful scan
      fetchGlobalStats();
    } catch (err: any) {
      console.error('Scan error:', err);
      setErrorMessage(err.message || 'An error occurred while scanning the website.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleIncrementFix = async () => {
    try {
      const res = await fetch('/api/scan-stats/increment-fix', { method: 'POST' });
      if (res.ok) {
        fetchGlobalStats();
      }
    } catch (err) {
      console.error('Fix increment error:', err);
    }
  };

  const handleSelectProspectForPitch = (prospect: { domain: string; businessName: string; issues: string }) => {
    setSelectedProspectPitch(prospect);
    setActiveTab('agency');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-rose-500 selection:text-white flex flex-col">
      
      {/* Top Clean Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSelectSample={(domain) => {
          handleScan(domain);
        }}
        onOpenContact={() => setIsContactOpen(true)}
      />

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 flex-1 space-y-8">
        
        {/* Error Alert Toast */}
        {errorMessage && (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-950/30 p-4 text-xs sm:text-sm text-rose-200 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
            <div className="flex-1">{errorMessage}</div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-slate-400 hover:text-white font-medium"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* TAB 1: LIVE SCANNER & AUDIT RESULTS */}
        {activeTab === 'scanner' && (
          <div className="space-y-8">
            
            {/* Hero Zero-Friction Scan Input (Top Position) */}
            <HeroScanner
              onScan={handleScan}
              isLoading={isLoading}
              activeUrl={activeUrl}
            />

            {/* Scanning Radar Visual State (Shown while scan is actively running) */}
            {isLoading && (
              <LiveScanningRadar targetUrl={activeUrl || 'Target Domain'} />
            )}

            {/* Empty State when User has not yet scanned a URL */}
            {!isLoading && !auditResult && (
              <div className="rounded-3xl border border-slate-800/80 bg-slate-900/40 p-8 text-center space-y-4">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <Search className="h-6 w-6" />
                </div>
                <div className="max-w-md mx-auto space-y-1">
                  <h3 className="text-lg font-bold text-white">No Website Scanned Yet</h3>
                  <p className="text-xs sm:text-sm text-slate-400">
                    Type your website domain in the search box above or click any sample audit to run the 6-layer forensic diagnostic.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <button
                    onClick={() => handleScan('drsharmadental.in')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 transition-colors"
                  >
                    <span>Test Dr. Sharma Dental</span>
                    <ArrowRight className="h-3 w-3 text-rose-400" />
                  </button>
                  <button
                    onClick={() => handleScan('elitesalonmumbai.com')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 transition-colors"
                  >
                    <span>Test Elite Salon</span>
                    <ArrowRight className="h-3 w-3 text-amber-400" />
                  </button>
                </div>
              </div>
            )}

            {/* Audit Results View (Only shown after user runs a scan) */}
            {auditResult && !isLoading && (
              <div className="space-y-8">
                
                {/* Score & Financial Impact Overview */}
                <ScoreDashboard
                  result={auditResult}
                  onOpenWatchdog={() => setIsWatchdogOpen(true)}
                  onOpenExpressFix={() => {
                    handleIncrementFix();
                    setIsExpressFixOpen(true);
                  }}
                  onOpenAlerts={() => setIsAlertsOpen(true)}
                />

                {/* Free Fix & Locked Paywall Resolution Engine */}
                <FreeFixAndLockedPaywall
                  result={auditResult}
                  onOpenWatchdog={() => setIsWatchdogOpen(true)}
                  onOpenExpressFix={() => {
                    handleIncrementFix();
                    setIsExpressFixOpen(true);
                  }}
                />

                {/* 6-Channel Verification Matrix */}
                <ChannelMatrix result={auditResult} />

              </div>
            )}

            {/* Global Live Scan Counter Bar (Positioned Below Search and Audit Results) */}
            <ScanCounterStats statsOverride={globalStats} onRefresh={fetchGlobalStats} />

          </div>
        )}

        {/* MODULE 1: COMPETITOR SABOTAGE RADAR */}
        {activeTab === 'sabotage-radar' && (
          <div className="space-y-6">
            <CompetitorSabotageRadar
              currentAudit={auditResult}
              onSelectProspectForPitch={handleSelectProspectForPitch}
            />
          </div>
        )}

        {/* MODULE 2: WHATSAPP ZERO-INTENT LEAKAGE CHECKER */}
        {activeTab === 'zero-intent' && (
          <div className="space-y-6">
            <ZeroIntentChecker auditResult={auditResult} />
          </div>
        )}

        {/* MODULE 3: E-COMMERCE CART DEATH MONITOR */}
        {activeTab === 'cart-death' && (
          <div className="space-y-6">
            <CartDeathMonitor
              auditResult={auditResult}
              onScanNewStore={(url) => {
                handleScan(url);
                setActiveTab('cart-death');
              }}
            />
          </div>
        )}

        {/* MODULE 4: HUNTER MODE (B2B BULK OUTBOUND) */}
        {activeTab === 'hunter' && (
          <div className="space-y-6">
            <HunterMode onSelectProspectForPitch={handleSelectProspectForPitch} />
          </div>
        )}

        {/* TAB 2: INTERACTIVE FUNNEL SIMULATOR */}
        {activeTab === 'funnel' && auditResult && (
          <div className="space-y-6">
            <FunnelLeakSimulator result={auditResult} />
          </div>
        )}

        {/* TAB 3: AGENCY TOOLS HUB */}
        {activeTab === 'agency' && (
          <div className="space-y-6">
            <AgencyToolsHub
              currentAudit={
                selectedProspectPitch
                  ? {
                      ...(auditResult || ({} as any)),
                      domain: selectedProspectPitch.domain,
                      businessName: selectedProspectPitch.businessName,
                      aiDiagnosticAdvice: selectedProspectPitch.issues,
                    }
                  : auditResult
              }
              onSelectProspectForPitch={handleSelectProspectForPitch}
            />
          </div>
        )}

        {/* TAB 4: 24/7 WATCHDOG LIVE RADAR CONSOLE */}
        {activeTab === 'watchdog' && (
          <div className="space-y-6">
            <WatchdogConsole onOpenNewMonitor={() => setIsWatchdogOpen(true)} />
          </div>
        )}

        {/* TAB 5: PRICING & MONETIZATION VAULT */}
        {activeTab === 'pricing' && (
          <div className="space-y-6">
            <MonetizationVault
              onOpenWatchdog={() => setIsWatchdogOpen(true)}
              onOpenExpressFix={() => setIsExpressFixOpen(true)}
            />
          </div>
        )}

      </main>

      {/* Modern High-End Comprehensive Footer with Contact Info & Copyright */}
      <Footer
        setActiveTab={setActiveTab}
        onOpenContact={() => setIsContactOpen(true)}
        onOpenAlerts={() => setIsAlertsOpen(true)}
      />

      {/* 24-Hour Watchdog Modal */}
      <WatchdogModal
        isOpen={isWatchdogOpen}
        onClose={() => setIsWatchdogOpen(false)}
        defaultUrl={auditResult?.targetUrl || 'https://' + activeUrl}
      />

      {/* Express DFY Fix Modal */}
      <ExpressFixModal
        isOpen={isExpressFixOpen}
        onClose={() => setIsExpressFixOpen(false)}
        domain={auditResult?.domain || activeUrl}
      />

      {/* Contact Founder Modal (Mohit Sikarwar - 8307070605 / mohitsikarwar123@gmail.com) */}
      <ContactUsModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
      />

      {/* Real-time WhatsApp Alert Modal */}
      <WhatsAppAlertModal
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        domain={auditResult?.domain || activeUrl}
      />

    </div>
  );
}
