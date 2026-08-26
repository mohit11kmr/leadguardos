import React, { useState } from 'react';
import { AuditResult, EcommerceInfo } from '../types';
import { ShoppingCart, AlertOctagon, CheckCircle2, ShieldAlert, Zap, ArrowRight, ExternalLink, RefreshCw, Layers } from 'lucide-react';

interface CartDeathMonitorProps {
  auditResult?: AuditResult | null;
  onScanNewStore?: (url: string) => void;
}

export const CartDeathMonitor: React.FC<CartDeathMonitorProps> = ({
  auditResult,
  onScanNewStore,
}) => {
  const [testStoreUrl, setTestStoreUrl] = useState(
    auditResult?.ecommerce?.isEcommerce ? auditResult.targetUrl : 'https://urbanvogue.in'
  );
  const [isScanning, setIsScanning] = useState(false);

  const ecommerceData: EcommerceInfo | undefined = auditResult?.ecommerce;
  const isEcommerce = Boolean(ecommerceData?.isEcommerce);

  const handleTestStore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testStoreUrl) return;
    if (onScanNewStore) {
      onScanNewStore(testStoreUrl);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Module */}
      <div className="rounded-3xl border border-slate-800/90 bg-gradient-to-br from-slate-950 via-slate-900/90 to-slate-950 p-6 md:p-8 shadow-2xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 border border-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-400">
              <ShoppingCart className="h-3.5 w-3.5" />
              <span>Module 3: E-commerce "Cart Death" Monitor</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-2">
              Detect Dead Checkout Links & Shopify / WooCommerce Leakages
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1">
              Validates e-commerce platforms, Add-to-Cart buttons, and checkout route health. Flags dead anchors (<code className="text-rose-400">href="#"</code>) and missing Meta Pixel <code className="text-emerald-400">InitiateCheckout</code> tracking that burns ad budget without attributing conversions.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-center min-w-[200px]">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Cart Health Status</span>
            <span className={`text-xl font-black ${ecommerceData?.checkoutStatus === 'CRITICAL_LEAK' ? 'text-rose-400' : 'text-emerald-400'}`}>
              {ecommerceData?.checkoutStatus === 'CRITICAL_LEAK' ? 'CRITICAL LEAK' : isEcommerce ? 'HEALTHY ROUTING' : 'READY TO SCAN'}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Platform: {ecommerceData?.platform || 'Auto-Detect'}
            </span>
          </div>
        </div>

        {/* Store Scanner Bar */}
        <form onSubmit={handleTestStore} className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={testStoreUrl}
            onChange={(e) => setTestStoreUrl(e.target.value)}
            placeholder="Enter Shopify / WooCommerce store URL..."
            className="flex-1 rounded-xl bg-slate-900 border border-slate-700 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isScanning}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 px-6 py-2.5 text-xs font-bold text-white transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Audit Store Checkout Flow</span>
          </button>
        </form>
      </div>

      {/* Diagnostics Inspection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Platform Detection */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">E-Commerce Engine</span>
            <Layers className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <span className="text-2xl font-black text-white">
              {ecommerceData?.platform || (isEcommerce ? 'Custom Store' : 'Non-Store / Lead Page')}
            </span>
            <p className="text-xs text-slate-400 mt-1">
              {isEcommerce
                ? `Verified ${ecommerceData?.platform} theme hooks & checkout DOM elements.`
                : 'Scanned page is configured as an inquiry/lead generation funnel.'}
            </p>
          </div>
          <div className="pt-3 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span>Cart Buttons Found</span>
            <span className="font-mono text-emerald-400">{ecommerceData?.cartLinksCount || 0} Action Link(s)</span>
          </div>
        </div>

        {/* Card 2: Checkout Route Integrity */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Checkout Flow</span>
            {ecommerceData?.checkoutStatus === 'CRITICAL_LEAK' ? (
              <AlertOctagon className="h-4 w-4 text-rose-400" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            )}
          </div>
          <div>
            <span className={`text-2xl font-black ${ecommerceData?.checkoutStatus === 'CRITICAL_LEAK' ? 'text-rose-400' : 'text-emerald-400'}`}>
              {ecommerceData?.checkoutStatus === 'CRITICAL_LEAK' ? 'Fatal Dead Link' : 'Active Routing'}
            </span>
            <p className="text-xs text-slate-400 mt-1">
              {ecommerceData?.checkoutStatus === 'CRITICAL_LEAK'
                ? 'Buy Now or Cart buttons lead to unrouted anchors (#), losing 100% of purchase intent.'
                : 'Cart & checkout routes pass automated syntax and path verification.'}
            </p>
          </div>
          <div className="pt-3 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span>Abandonment Risk</span>
            <span className={`font-semibold ${ecommerceData?.cartAbandonmentRisk === 'CRITICAL' ? 'text-rose-400' : 'text-emerald-400'}`}>
              {ecommerceData?.cartAbandonmentRisk || 'LOW'}
            </span>
          </div>
        </div>

        {/* Card 3: Meta Pixel Pixel / Retargeting */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Cart Retargeting</span>
            <Zap className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <span className={`text-2xl font-black ${auditResult?.metaPixel?.exists ? 'text-emerald-400' : 'text-rose-400'}`}>
              {auditResult?.metaPixel?.exists ? 'Pixel Synced' : 'Unattributed'}
            </span>
            <p className="text-xs text-slate-400 mt-1">
              {auditResult?.metaPixel?.exists
                ? 'Meta Pixel is active to capture abandoned cart custom audiences.'
                : 'No Meta Pixel active. You cannot run dynamic product ads on cart drop-offs!'}
            </p>
          </div>
          <div className="pt-3 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span>Dynamic Ads Ready</span>
            <span className={auditResult?.metaPixel?.exists ? 'text-emerald-400' : 'text-rose-400'}>
              {auditResult?.metaPixel?.exists ? 'YES' : 'NO'}
            </span>
          </div>
        </div>
      </div>

      {/* Cart Buttons Deep Inspection */}
      {ecommerceData && ecommerceData.cartButtons.length > 0 && (
        <div className="rounded-3xl border border-slate-800/90 bg-slate-900/80 p-6 md:p-8 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white tracking-tight">
            Detected Cart & Checkout Action Elements
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ecommerceData.cartButtons.map((btn, idx) => (
              <div
                key={idx}
                className={`rounded-2xl p-4 border text-xs space-y-2 ${
                  btn.status === 'BROKEN'
                    ? 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                    : 'bg-slate-950/80 border-slate-800 text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">{btn.text}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${btn.status === 'BROKEN' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    {btn.status}
                  </span>
                </div>
                <p className="font-mono text-[11px] text-slate-400 truncate">
                  Target: {btn.href || 'Unspecified anchor (#)'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
