import React from 'react';
import { ArrowRight, BarChart3, CheckCircle2, ChevronRight, Eye, Globe2, LineChart, Radio, SearchCheck, ShieldCheck, Smartphone, Target, Users, Wrench } from 'lucide-react';
import { HeroScanner } from './HeroScanner';
import { GlobalScanStats } from '../types';
import { AppNavTab } from './Navbar';

interface MarketingHomeProps {
  onScan: (url: string) => Promise<void>;
  isLoading: boolean;
  activeUrl: string;
  setActiveTab: (tab: AppNavTab) => void;
  stats: GlobalScanStats | null;
}

const steps = [
  ['01', 'Scan', 'Enter your website and run a real audit.'],
  ['02', 'Discover', 'Check lead channels, attribution, SEO and security.'],
  ['03', 'Understand', 'See issues ranked by business importance.'],
  ['04', 'Fix', 'Get clear recommendations or expert help.'],
  ['05', 'Monitor', 'Keep watching after changes and deployments.'],
];

export const MarketingHome: React.FC<MarketingHomeProps> = ({ onScan, isLoading, activeUrl, setActiveTab, stats }) => {
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="marketing-site">
      <header className="marketing-header">
        <button className="marketing-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <span className="marketing-brand-mark"><ShieldCheck className="h-5 w-5" /></span>
          <span>LeadGuard <strong>OS</strong></span>
        </button>
        <nav className="hidden items-center gap-7 md:flex" aria-label="Public navigation">
          <button onClick={() => scrollTo('product')}>Product</button>
          <button onClick={() => scrollTo('solutions')}>Solutions</button>
          <button onClick={() => scrollTo('how-it-works')}>How it works</button>
          <button onClick={() => scrollTo('resources')}>Resources</button>
          <button onClick={() => setActiveTab('pricing')}>Pricing</button>
        </nav>
        <div className="flex items-center gap-2">
          <button className="marketing-sign-in" onClick={() => setActiveTab('audit')}>Sign in</button>
          <button className="marketing-nav-cta" onClick={() => scrollTo('scanner')}>
            Check my website <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main>
        <section id="scanner" className="marketing-hero">
          <div className="marketing-hero-copy">
            <p className="marketing-eyebrow"><span className="marketing-eyebrow-dot" /> Website lead protection and revenue intelligence</p>
            <h1>Find the problems that <em>quietly cost you customers.</em></h1>
            <p className="marketing-lead">LeadGuard checks the website paths your customers use to contact, call, buy and convert, then shows you what matters and what to fix first.</p>
            <HeroScanner onScan={onScan} isLoading={isLoading} activeUrl={activeUrl} />
          </div>
          <div className="marketing-preview" aria-label="Sample LeadGuard audit preview">
            <div className="preview-toolbar"><span className="preview-dot" /><span>Sample audit</span><span className="preview-domain">drsharmadental.in</span></div>
            <div className="preview-score-row">
              <div><span className="preview-label">Lead health</span><strong>62 <small>/ 100</small></strong><span className="preview-status warning">Needs attention</span></div>
              <div className="preview-risk"><span className="preview-label">Estimated revenue risk</span><strong>₹42,500<small>/ month</small></strong></div>
            </div>
            <div className="preview-divider" />
            <div className="preview-heading"><span>Priority findings</span><span>Business impact</span></div>
            {[
              ['WhatsApp routing', 'Critical', 'critical'],
              ['Click-to-call', 'Critical', 'critical'],
              ['Meta Pixel', 'Warning', 'warning'],
              ['SEO indexing', 'Healthy', 'healthy'],
              ['Security headers', 'Healthy', 'healthy'],
            ].map(([label, status, tone]) => (
              <div className="preview-finding" key={label}><span>{label}</span><span className={`preview-status ${tone}`}><i />{status}</span></div>
            ))}
            <button className="preview-link" onClick={() => onScan('drsharmadental.in')}>Explore the sample audit <ArrowRight className="h-4 w-4" /></button>
          </div>
        </section>

        <section className="marketing-proof" aria-label="Product assurance">
          <span><CheckCircle2 /> Real website analysis</span><span><CheckCircle2 /> No code required</span><span><CheckCircle2 /> Business-first reporting</span><span><CheckCircle2 /> Continuous monitoring</span>
          {stats?.totalScannedSites ? <span className="marketing-proof-count">{stats.totalScannedSites.toLocaleString()} sites scanned</span> : null}
        </section>

        <section id="product" className="marketing-section marketing-story">
          <div className="marketing-section-intro"><p className="marketing-kicker">The hidden cost</p><h2>Your website can look perfectly fine and still lose customers.</h2><p>LeadGuard follows the high-intent paths that analytics dashboards often miss.</p></div>
          <div className="story-flow">
            {[
              ['Click WhatsApp', 'Broken or invalid routing', 'Lost conversation', MessageSquareIcon],
              ['Tap to call', 'Button does nothing', 'Lost lead', Smartphone],
              ['Click an ad', 'Conversion tracking missing', 'Poor attribution', Target],
            ].map(([visitor, failure, outcome, Icon]) => <div className="story-row" key={visitor as string}><div className="story-node"><Icon className="h-4 w-4" />{visitor as string}</div><ChevronRight className="story-arrow" /><div className="story-node muted">{failure as string}</div><ChevronRight className="story-arrow" /><div className="story-outcome">{outcome as string}</div></div>)}
          </div>
        </section>

        <section id="solutions" className="marketing-section">
          <div className="marketing-section-intro"><p className="marketing-kicker">One system, four lenses</p><h2>Protect the paths that turn attention into revenue.</h2><p>Every diagnostic is connected to a clear business consequence and a next action.</p></div>
          <div className="solution-grid">
            {[
              [Globe2, 'Lead capture', 'WhatsApp, calls, forms and CTAs', 'Make every contact path usable.'],
              [BarChart3, 'Ad attribution', 'Meta, Google, GA4 and events', 'Know which campaigns really convert.'],
              [SearchCheck, 'Search visibility', 'Indexing, canonical, sitemap and robots', 'Stay discoverable when customers search.'],
              [ShieldCheck, 'Website security', 'SSL, mixed content, headers and CSP', 'Reduce risk without slowing the team down.'],
            ].map(([Icon, title, detail, copy]) => <article className="solution-item" key={title as string}><Icon className="h-5 w-5" /><p className="solution-title">{title as string}</p><p className="solution-detail">{detail as string}</p><p>{copy as string}</p></article>)}
          </div>
        </section>

        <section id="how-it-works" className="marketing-section process-section">
          <div className="marketing-section-intro"><p className="marketing-kicker">From scan to protection</p><h2>A practical workflow for teams that need answers.</h2></div>
          <div className="process-grid">{steps.map(([number, title, copy]) => <div className="process-step" key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p></div>)}</div>
        </section>

        <section id="resources" className="marketing-section marketing-impact">
          <div className="impact-copy"><p className="marketing-kicker">Beyond the audit</p><h2>Turn technical problems into business decisions.</h2><p>Once the issues are clear, LeadGuard helps your team prioritize remediation, model revenue exposure and keep important website paths under watch.</p><button className="marketing-text-cta" onClick={() => setActiveTab('intelligence')}>Explore revenue intelligence <ArrowRight className="h-4 w-4" /></button></div>
          <div className="impact-panel"><div className="impact-panel-header"><LineChart className="h-5 w-5" /><span>Executive view</span></div><div className="impact-metrics"><div><span>Lead health</span><strong>62 / 100</strong></div><div><span>Critical issues</span><strong>3</strong></div><div><span>Leads at risk</span><strong>~24 / mo</strong></div><div><span>Revenue risk</span><strong>₹42,500 / mo</strong></div></div><div className="impact-bar"><span style={{ width: '62%' }} /></div><p>Prioritize the issues with the clearest business impact.</p></div>
        </section>

        <section className="marketing-section marketing-operations"><div><p className="marketing-kicker">Always on</p><h2>Websites change. LeadGuard keeps watching.</h2><p>Schedule audits, detect regressions and route alerts before a broken link becomes a missed opportunity.</p></div><div className="operations-flow"><div><Globe2 /><span>Website</span></div><ArrowRight /><div><Radio /><span>Continuous checks</span></div><ArrowRight /><div><Eye /><span>Issue detected</span></div><ArrowRight /><div><Users /><span>Alert</span></div></div><button className="marketing-secondary-cta" onClick={() => setActiveTab('monitoring')}>Protect this website <ArrowRight className="h-4 w-4" /></button></section>

        <section className="marketing-section agency-banner"><div><p className="marketing-kicker">For agencies</p><h2>One platform for every client.</h2><p>Manage audits, monitoring, white-label reports and prospect workflows from one commercial workspace.</p></div><div className="agency-mini-stats"><strong>12 <small>Clients</small></strong><strong>48 <small>Audits this month</small></strong><strong>9 <small>Monitored sites</small></strong></div><button className="marketing-secondary-cta" onClick={() => setActiveTab('agency')}>Explore agency <ArrowRight className="h-4 w-4" /></button></section>

        <section className="marketing-final-cta"><p className="marketing-kicker">Start with evidence</p><h2>Find out what your website is losing.</h2><button className="marketing-nav-cta" onClick={() => scrollTo('scanner')}>Check my website <ArrowRight className="h-4 w-4" /></button></section>
      </main>
    </div>
  );
};

const MessageSquareIcon: React.FC<{ className?: string }> = ({ className }) => <Wrench className={className} />;
