import React, { useState, useEffect } from 'react';
import { Navbar, AppNavTab } from './components/Navbar';
import { HeroScanner } from './components/HeroScanner';
import { LiveScanningRadar } from './components/LiveScanningRadar';
import { ScoreDashboard } from './components/ScoreDashboard';
import { FixCenter } from './components/FixCenter';
import { ReportsView } from './components/ReportsView';
import { MonitoringView } from './components/MonitoringView';
import { AgencyView } from './components/AgencyView';
import { PricingView } from './components/PricingView';
import { DeveloperDashboardView } from './components/DeveloperDashboardView';
import { AccountSettingsView } from './components/AccountSettingsView';
import { AdminDashboardView } from './components/AdminDashboardView';
import { TestimonialsWall, ReviewItem } from './components/TestimonialsWall';
import { BlogHubView } from './components/BlogHubView';
import { PublicReportView } from './components/PublicReportView';
import { ScanCounterStats } from './components/ScanCounterStats';
import { Footer } from './components/Footer';

// Modals
import { WatchdogModal } from './components/WatchdogModal';
import { ExpressFixModal } from './components/ExpressFixModal';
import { ContactUsModal } from './components/ContactUsModal';
import { WhatsAppAlertModal } from './components/WhatsAppAlertModal';
import { AuthModal } from './components/AuthModal';
import { ReviewSubmissionModal } from './components/ReviewSubmissionModal';
import { AboutLeadGuardModal } from './components/AboutLeadGuardModal';
import { ServicesCatalogModal } from './components/ServicesCatalogModal';
import { ShareableReportModal } from './components/ShareableReportModal';

import { AuditResult, GlobalScanStats } from './types';
import { Shield, AlertCircle } from 'lucide-react';
import { apiFetch } from './lib/api';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppNavTab>('audit');
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeUrl, setActiveUrl] = useState('');
  const [globalStats, setGlobalStats] = useState<GlobalScanStats | null>(null);

  // Public Report View
  const [publicReport, setPublicReport] = useState<AuditResult | null>(null);
  const [isLoadingPublicReport, setIsLoadingPublicReport] = useState(false);

  // Agency prospect pitch selection
  const [selectedProspectPitch, setSelectedProspectPitch] = useState<{
    domain: string;
    businessName: string;
    issues: string;
  } | null>(null);

  // Modals state
  const [isWatchdogOpen, setIsWatchdogOpen] = useState(false);
  const [isExpressFixOpen, setIsExpressFixOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const [customReviews, setCustomReviews] = useState<ReviewItem[]>([]);

  const handleAddReview = (newReview: Omit<ReviewItem, 'id' | 'approved' | 'date'>) => {
    const item: ReviewItem = {
      ...newReview,
      id: `rev_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      approved: true,
    };
    setCustomReviews((prev) => [item, ...prev]);
  };

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

    // Check if current route is a public shareable report (/report/:id)
    const checkReportRoute = async () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      const reportMatch = path.match(/^\/report\/([a-zA-Z0-9_-]+)/) || hash.match(/^#report\/([a-zA-Z0-9_-]+)/);

      if (reportMatch && reportMatch[1]) {
        const scanId = reportMatch[1];
        setIsLoadingPublicReport(true);
        try {
          const res = await apiFetch(`/api/scan/${scanId}`);
          if (res.ok) {
            const data = await res.json();
            setPublicReport(data);
          }
        } catch (e) {
          console.error('Error fetching public report:', e);
        } finally {
          setIsLoadingPublicReport(false);
        }
      }
    };

    checkReportRoute();
  }, []);

  const handleScan = async (url: string) => {
    if (!url.trim()) return;
    setIsLoading(true);
    setErrorMessage(null);
    setActiveUrl(url);

    try {
      const response = await apiFetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || errData.error || 'Failed to complete website scan.');
      }

      const data: AuditResult = await response.json();
      setAuditResult(data);
      setActiveTab('audit');
      fetchGlobalStats();
    } catch (err: any) {
      console.error('Scan error:', err);
      setErrorMessage(err.message || 'An error occurred while scanning the website.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectProspectForPitch = (prospect: { domain: string; businessName: string; issues: string }) => {
    setSelectedProspectPitch(prospect);
    setActiveTab('agency');
  };

  // If loading a dedicated public report
  if (isLoadingPublicReport) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center animate-pulse">
          <Shield className="h-6 w-6 text-rose-500" />
        </div>
        <p className="text-sm font-semibold text-slate-300">Retrieving Verified LeadGuard Forensic Report...</p>
      </div>
    );
  }

  // If viewing a standalone public report
  if (publicReport) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <PublicReportView
          report={publicReport}
          onOpenExpressFix={() => setIsExpressFixOpen(true)}
          onBackToScanner={() => {
            setPublicReport(null);
            window.history.pushState({}, '', '/');
          }}
        />

        <ExpressFixModal
          isOpen={isExpressFixOpen}
          onClose={() => setIsExpressFixOpen(false)}
          domain={publicReport.domain}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-rose-500 selection:text-white flex flex-col">
      
      {/* Top Simplified Navigation (5 Primary Tabs) */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSelectSample={handleScan}
        onOpenContact={() => setIsContactOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      {/* Main Content View Container */}
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 flex-1 space-y-8">
        
        {/* Human-Friendly Error Alert Toast */}
        {errorMessage && (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-950/30 p-4 text-xs sm:text-sm text-rose-200 flex items-center gap-3 shadow-lg">
            <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
            <div className="flex-1">
              <span className="font-bold">Scan Error: </span>
              {errorMessage}
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-slate-400 hover:text-white font-medium text-xs px-2 py-1 rounded-lg bg-slate-900 border border-slate-800"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 1. AUDIT TAB (Hero Scanner or Audit Result) */}
        {activeTab === 'audit' && (
          <div className="space-y-8">
            
            {/* Hero Input (Visible when no scan is loading) */}
            <HeroScanner
              onScan={handleScan}
              isLoading={isLoading}
              activeUrl={activeUrl}
            />

            {/* Diagnostic Progression (Visible while scanning) */}
            {isLoading && (
              <LiveScanningRadar targetUrl={activeUrl || 'Target Domain'} />
            )}

            {/* Audit Results View (Visible once scan is complete) */}
            {auditResult && !isLoading && (
              <div className="space-y-10 pt-4 border-t border-slate-800/80">
                
                {/* 1. Score & Financial Impact Overview */}
                <ScoreDashboard
                  result={auditResult}
                  onOpenWatchdog={() => setIsWatchdogOpen(true)}
                  onOpenExpressFix={() => setIsExpressFixOpen(true)}
                  onOpenAlerts={() => setIsAlertsOpen(true)}
                  onOpenShareModal={() => setIsShareModalOpen(true)}
                />

                {/* 2. Unified Fix Center */}
                <FixCenter
                  result={auditResult}
                  onOpenExpressFix={() => setIsExpressFixOpen(true)}
                  onOpenWatchdog={() => setIsWatchdogOpen(true)}
                />
              </div>
            )}

            {/* Global Live Scan Counters */}
            <ScanCounterStats statsOverride={globalStats} onRefresh={fetchGlobalStats} />
          </div>
        )}

        {/* 2. REPORTS TAB */}
        {activeTab === 'reports' && (
          <ReportsView
            currentAudit={auditResult}
            onOpenAudit={(audit) => {
              setAuditResult(audit);
              setActiveTab('audit');
            }}
            onNewScan={() => {
              setActiveTab('audit');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenShareModal={(audit) => {
              setAuditResult(audit);
              setIsShareModalOpen(true);
            }}
          />
        )}

        {/* 3. MONITORING TAB (24/7 Watchdog) */}
        {activeTab === 'monitoring' && (
          <MonitoringView
            onOpenNewMonitor={() => setIsWatchdogOpen(true)}
          />
        )}

        {/* 4. AGENCY TAB */}
        {activeTab === 'agency' && (
          <AgencyView
            currentAudit={auditResult}
            selectedProspectPitch={selectedProspectPitch}
            onSelectProspectForPitch={handleSelectProspectForPitch}
          />
        )}

        {/* 5. PRICING TAB */}
        {activeTab === 'pricing' && (
          <PricingView
            onOpenExpressFix={() => setIsExpressFixOpen(true)}
            onOpenWatchdog={() => setIsWatchdogOpen(true)}
          />
        )}

        {/* SECONDARY UTILITY TABS */}
        {activeTab === 'developer' && <DeveloperDashboardView />}
        {activeTab === 'settings' && <AccountSettingsView />}
        {activeTab === 'admin' && <AdminDashboardView />}
        {activeTab === 'reviews' && (
          <TestimonialsWall
            onOpenReviewModal={() => setIsReviewModalOpen(true)}
            customReviews={customReviews}
          />
        )}
        {activeTab === 'blog' && (
          <BlogHubView onOpenExpressFix={() => setIsExpressFixOpen(true)} />
        )}

      </main>

      {/* Footer */}
      <Footer
        setActiveTab={(tab: any) => {
          if (tab === 'scanner') setActiveTab('audit');
          else if (tab === 'watchdog') setActiveTab('monitoring');
          else setActiveTab(tab);
        }}
        onOpenContact={() => setIsContactOpen(true)}
        onOpenAlerts={() => setIsAlertsOpen(true)}
        onOpenAbout={() => setIsAboutOpen(true)}
        onOpenServices={() => setIsServicesOpen(true)}
      />

      {/* MODALS */}
      <WatchdogModal
        isOpen={isWatchdogOpen}
        onClose={() => setIsWatchdogOpen(false)}
        defaultUrl={auditResult?.targetUrl || (activeUrl ? 'https://' + activeUrl : '')}
      />

      <ExpressFixModal
        isOpen={isExpressFixOpen}
        onClose={() => setIsExpressFixOpen(false)}
        domain={auditResult?.domain || activeUrl}
      />

      <ContactUsModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
      />

      <WhatsAppAlertModal
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        domain={auditResult?.domain || activeUrl}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />

      <ReviewSubmissionModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        onSubmitReview={handleAddReview}
      />

      <AboutLeadGuardModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />

      <ServicesCatalogModal
        isOpen={isServicesOpen}
        onClose={() => setIsServicesOpen(false)}
        onOpenExpressFix={() => setIsExpressFixOpen(true)}
        onOpenWatchdog={() => setIsWatchdogOpen(true)}
      />

      {auditResult && (
        <ShareableReportModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          result={auditResult}
        />
      )}

    </div>
  );
}
