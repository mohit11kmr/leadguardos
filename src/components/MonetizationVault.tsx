import React, { useState } from 'react';
import { Zap, Shield, Check, Star, ArrowRight, Sparkles, Building2, UserCheck, Wrench, ShieldAlert, CreditCard, QrCode, Download, CheckCircle2, Lock } from 'lucide-react';
import confetti from 'canvas-confetti';

interface MonetizationVaultProps {
  onOpenWatchdog: () => void;
  onOpenExpressFix: () => void;
}

export const MonetizationVault: React.FC<MonetizationVaultProps> = ({
  onOpenWatchdog,
  onOpenExpressFix,
}) => {
  const [selectedPlanModal, setSelectedPlanModal] = useState<{
    tier: string;
    name: string;
    price: string;
    period: string;
    features: string[];
  } | null>(null);

  const [checkoutStep, setCheckoutStep] = useState<'DETAILS' | 'PAYMENT' | 'SUCCESS'>('DETAILS');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerDomain, setCustomerDomain] = useState('');

  const handleSelectPlan = (plan: {
    tier: string;
    name: string;
    price: string;
    period: string;
    features: string[];
  }) => {
    setSelectedPlanModal(plan);
    setCheckoutStep('DETAILS');
  };

  const handleProceedPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutStep('PAYMENT');
  };

  const handleCompleteOrder = () => {
    setCheckoutStep('SUCCESS');
    confetti({
      particleCount: 80,
      spread: 80,
      origin: { y: 0.6 },
    });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header */}
      <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900/90 via-slate-900 to-slate-950 p-6 md:p-8 shadow-xl text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-rose-400 mb-3">
          <Zap className="h-3.5 w-3.5 text-rose-400" />
          <span>Production-Ready 3-Tier Monetization Stack</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          Monetization & Plans Architecture
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl mx-auto">
          Tailored for Indian businesses & marketing agencies — from one-time 15-minute emergency repairs to continuous ₹299/mo SaaS watchdog monitoring.
        </p>
      </div>

      {/* 3 Tier Categories */}
      <div className="space-y-12">
        
        {/* TIER 1: One-Time Audit & Fix Services */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-rose-500/20 text-rose-400 px-3 py-1 text-xs font-black uppercase border border-rose-500/30">
              Tier 1 • One-Time Services
            </span>
            <h2 className="text-xl font-bold text-white">Forensic Audit & Rapid Repair</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Quick Audit */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 flex flex-col justify-between shadow-xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">ONE-TIME REPORT</span>
                  <Wrench className="h-4 w-4 text-slate-400" />
                </div>
                <h3 className="text-lg font-bold text-white">Quick Audit</h3>
                <p className="text-xs text-slate-400">Forensic PDF report + broken links + revenue loss blueprint.</p>
                <div className="text-3xl font-extrabold text-white">₹2,999</div>
                <ul className="text-xs text-slate-300 space-y-2 pt-4 border-t border-slate-800">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Complete 4-Pillar PDF Report</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>WhatsApp, Phone & Pixel Breakdown</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>24-Hour Report Delivery</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={() => handleSelectPlan({
                  tier: 'TIER 1',
                  name: 'Quick Audit',
                  price: '₹2,999',
                  period: 'One-Time',
                  features: ['Complete 4-Pillar PDF Report', 'WhatsApp, Phone & Pixel Breakdown', '24-Hour Delivery'],
                })}
                className="mt-6 w-full rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 text-xs transition-all border border-slate-700"
              >
                Order Quick Audit (₹2,999)
              </button>
            </div>

            {/* Audit + Fix (Popular) */}
            <div className="rounded-3xl border-2 border-rose-500 bg-gradient-to-b from-slate-900 to-rose-950/20 p-6 flex flex-col justify-between shadow-2xl relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-rose-500 px-3 py-0.5 text-[10px] font-extrabold text-white">
                MOST REQUESTED
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-400">DONE-FOR-YOU</span>
                  <Sparkles className="h-4 w-4 text-rose-400" />
                </div>
                <h3 className="text-lg font-bold text-white">Audit + Rapid Fix</h3>
                <p className="text-xs text-slate-300">Report + direct repair of all WhatsApp/Call/Pixel links in 48 hrs.</p>
                <div className="text-3xl font-extrabold text-white">₹4,999</div>
                <ul className="text-xs text-slate-200 space-y-2 pt-4 border-t border-slate-800">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Everything in Quick Audit</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>WhatsApp +9191 & Dialer Code Repair</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Meta Pixel & GA4 Tag Installation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>48-Hour Deployment Guarantee</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={() => handleSelectPlan({
                  tier: 'TIER 1',
                  name: 'Audit + Rapid Fix',
                  price: '₹4,999',
                  period: 'One-Time',
                  features: ['Complete Audit Report', 'WhatsApp & Dialer Fix', 'Meta Pixel & GA4 Install', '48h Deployment'],
                })}
                className="mt-6 w-full rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold py-3 text-xs transition-all shadow-lg shadow-rose-900/40 active:scale-95"
              >
                Book Audit + Fix (₹4,999)
              </button>
            </div>

            {/* Audit + Fix + Monitoring */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 flex flex-col justify-between shadow-xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-400">COMPLETE SUITE</span>
                  <Shield className="h-4 w-4 text-indigo-400" />
                </div>
                <h3 className="text-lg font-bold text-white">Audit + Fix + 30D Monitor</h3>
                <p className="text-xs text-slate-400">Full tech repair + 30 days of continuous watchdog alerts.</p>
                <div className="text-3xl font-extrabold text-white">₹6,999</div>
                <ul className="text-xs text-slate-300 space-y-2 pt-4 border-t border-slate-800">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Full Audit & Code Fixes</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>30-Day Automated Watchdog Radar</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Instant WhatsApp Downtime Alerts</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={() => handleSelectPlan({
                  tier: 'TIER 1',
                  name: 'Audit + Fix + 30D Monitor',
                  price: '₹6,999',
                  period: 'One-Time + 30D',
                  features: ['Full Audit Report', 'Code & Tag Repairs', '30-Day 24/7 Watchdog', 'WhatsApp Alerts'],
                })}
                className="mt-6 w-full rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 text-xs transition-all border border-slate-700"
              >
                Order Complete Suite (₹6,999)
              </button>
            </div>
          </div>
        </div>

        {/* TIER 2: Recurring SaaS Monitoring */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-500/20 text-emerald-400 px-3 py-1 text-xs font-black uppercase border border-emerald-500/30">
              Tier 2 • Recurring SaaS
            </span>
            <h2 className="text-xl font-bold text-white">24/7 Automated Monitoring Radar</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Starter ₹99/mo */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 flex flex-col justify-between shadow-xl">
              <div className="space-y-4">
                <span className="text-xs font-bold text-slate-400">STARTER MONITOR</span>
                <h3 className="text-lg font-bold text-white">Single Site Shield</h3>
                <div className="text-3xl font-extrabold text-white">₹99 <span className="text-xs text-slate-400 font-normal">/month</span></div>
                <ul className="text-xs text-slate-300 space-y-2 pt-4 border-t border-slate-800">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>1 Monitored Website</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Weekly Automated Re-Scans</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Email Score Drop Alerts</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={() => handleSelectPlan({
                  tier: 'TIER 2',
                  name: 'Starter Single Site',
                  price: '₹99',
                  period: 'Monthly Recurring',
                  features: ['1 Site', 'Weekly Re-scans', 'Email Alerts'],
                })}
                className="mt-6 w-full rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 text-xs transition-all border border-slate-700"
              >
                Subscribe ₹99/mo
              </button>
            </div>

            {/* Pro ₹299/mo (Target: ₹29,900 MRR from 100 clients) */}
            <div className="rounded-3xl border-2 border-emerald-500 bg-gradient-to-b from-slate-900 to-emerald-950/20 p-6 flex flex-col justify-between shadow-2xl relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-3 py-0.5 text-[10px] font-extrabold text-slate-950">
                RECOMMENDED SAAS
              </div>
              <div className="space-y-4">
                <span className="text-xs font-bold text-emerald-400">BUSINESS PRO</span>
                <h3 className="text-lg font-bold text-white">Pro 5-Site Shield</h3>
                <div className="text-3xl font-extrabold text-white">₹299 <span className="text-xs text-slate-400 font-normal">/month</span></div>
                <ul className="text-xs text-slate-200 space-y-2 pt-4 border-t border-slate-800">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>5 Monitored Websites</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Daily 24/7 Automated Re-Scans</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Instant WhatsApp + Email Alerts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Zero-Intent & Pixel Drop Radar</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={() => handleSelectPlan({
                  tier: 'TIER 2',
                  name: 'Pro 5-Site Shield',
                  price: '₹299',
                  period: 'Monthly Recurring',
                  features: ['5 Sites Monitored', 'Daily 24/7 Re-scans', 'WhatsApp + Email Alerts', 'Zero-Intent Radar'],
                })}
                className="mt-6 w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3 text-xs transition-all shadow-lg shadow-emerald-950/50 active:scale-95"
              >
                Subscribe Pro (₹299/mo)
              </button>
            </div>

            {/* Agency ₹999/mo */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 flex flex-col justify-between shadow-xl">
              <div className="space-y-4">
                <span className="text-xs font-bold text-indigo-400">AGENCY 25</span>
                <h3 className="text-lg font-bold text-white">Agency Multi-Client</h3>
                <div className="text-3xl font-extrabold text-white">₹999 <span className="text-xs text-slate-400 font-normal">/month</span></div>
                <ul className="text-xs text-slate-300 space-y-2 pt-4 border-t border-slate-800">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>25 Client Domains Monitored</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>White-Label Branded Reports</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Webhooks & Custom Integrations</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={() => handleSelectPlan({
                  tier: 'TIER 2',
                  name: 'Agency Multi-Client',
                  price: '₹999',
                  period: 'Monthly Recurring',
                  features: ['25 Client Domains', 'White-Label Reports', 'Webhooks API', 'Client Portal'],
                })}
                className="mt-6 w-full rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 text-xs transition-all border border-slate-700"
              >
                Subscribe Agency (₹999/mo)
              </button>
            </div>
          </div>
        </div>

        {/* TIER 3: White-Label Agency Reseller Suite */}
        <div className="rounded-3xl border-2 border-indigo-500/50 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400">
              <Building2 className="h-4 w-4" />
              <span>TIER 3 • AGENCY WHITE-LABEL RESELLER</span>
            </div>
            <h2 className="text-2xl font-black text-white">Resell Audits Under Your Own Agency Brand</h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Agencies pay ₹999/mo base license and resell ₹4,999 manual audits & ₹299/mo monitoring directly to Indian SME clients under their own logo and domain.
            </p>
          </div>

          <button
            onClick={() => handleSelectPlan({
              tier: 'TIER 3',
              name: 'White-Label Agency License',
              price: '₹999',
              period: 'Monthly Base License',
              features: ['Custom Agency Logo on Reports', 'Resell at ₹1,999–₹4,999/mo', '116 Leads Outreach Vault', 'Priority WhatsApp Support'],
            })}
            className="shrink-0 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold px-6 py-3.5 rounded-2xl text-sm shadow-xl shadow-indigo-900/40 active:scale-95 transition-all"
          >
            <Sparkles className="h-4 w-4" />
            <span>Claim Agency License (₹999/mo)</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

      </div>

      {/* Interactive Checkout Modal (Razorpay / UPI Instant Simulation) */}
      {selectedPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 md:p-8 max-w-lg w-full space-y-6 shadow-2xl">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">{selectedPlanModal.tier}</span>
                <h3 className="text-xl font-bold text-white">{selectedPlanModal.name}</h3>
              </div>
              <button
                onClick={() => setSelectedPlanModal(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {checkoutStep === 'DETAILS' && (
              <form onSubmit={handleProceedPayment} className="space-y-4">
                <div className="rounded-2xl bg-slate-950 p-4 border border-slate-800 space-y-1">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Plan Total:</span>
                    <span>{selectedPlanModal.period}</span>
                  </div>
                  <div className="text-2xl font-black text-white">{selectedPlanModal.price}</div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Your Name / Business Name *</label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Dr. Sharma or Apex Media"
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white focus:border-rose-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Target Website Domain *</label>
                    <input
                      type="text"
                      required
                      value={customerDomain}
                      onChange={(e) => setCustomerDomain(e.target.value)}
                      placeholder="e.g. yourclinic.in"
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white focus:border-rose-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">WhatsApp Number (for alert setup) *</label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white focus:border-rose-500 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold py-3 text-xs transition-all shadow-md active:scale-95"
                >
                  Proceed to Payment ({selectedPlanModal.price})
                </button>
              </form>
            )}

            {checkoutStep === 'PAYMENT' && (
              <div className="space-y-6 text-center">
                <div className="rounded-2xl bg-slate-950 p-6 border border-slate-800 space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto">
                    <QrCode className="h-6 w-6 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">Instant UPI & Card Checkout</h4>
                    <p className="text-xs text-slate-400 mt-1">Scan via Google Pay, PhonePe, Paytm, or Credit Card</p>
                  </div>
                  <div className="text-3xl font-black text-emerald-400">{selectedPlanModal.price}</div>
                  <div className="text-[11px] font-mono text-slate-400 bg-slate-900 p-2 rounded-lg border border-slate-800">
                    UPI ID: <span className="text-slate-200 font-bold">leadguard.pay@icici</span>
                  </div>
                </div>

                <button
                  onClick={handleCompleteOrder}
                  className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3 text-xs transition-all shadow-lg active:scale-95"
                >
                  Simulate Successful Payment & Activate Shield
                </button>
              </div>
            )}

            {checkoutStep === 'SUCCESS' && (
              <div className="space-y-6 text-center">
                <div className="rounded-2xl bg-emerald-500/10 p-6 border border-emerald-500/30 space-y-3">
                  <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto" />
                  <h4 className="text-lg font-bold text-emerald-300">Order Confirmed & Shield Activated!</h4>
                  <p className="text-xs text-slate-300">
                    Thank you {customerName || 'Partner'}! Your {selectedPlanModal.name} for <span className="font-mono text-white">{customerDomain || 'your site'}</span> is now queued. Our engineers will verify WhatsApp routing and deliver confirmation to {customerPhone || 'your WhatsApp'}.
                  </p>
                </div>

                <button
                  onClick={() => setSelectedPlanModal(null)}
                  className="w-full rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 text-xs transition-all"
                >
                  Back to Dashboard
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
