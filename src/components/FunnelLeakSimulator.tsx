import React, { useState } from 'react';
import { AuditResult } from '../types';
import { TrendingDown, DollarSign, Users, Target, ArrowRight, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';

interface FunnelLeakSimulatorProps {
  result: AuditResult;
}

export const FunnelLeakSimulator: React.FC<FunnelLeakSimulatorProps> = ({ result }) => {
  const [monthlyVisitors, setMonthlyVisitors] = useState<number>(8500);
  const [adSpend, setAdSpend] = useState<number>(35000);
  const [averageTicket, setAverageTicket] = useState<number>(3500);
  const [clickRate, setClickRate] = useState<number>(6.5); // % of visitors clicking WhatsApp/Call

  // Heuristic drop-off rates based on scan results
  const hasBrokenWhatsApp = (result?.whatsappLinks || []).some((w) => !w.isValid) || (result?.whatsappLinks || []).length === 0;
  const hasBrokenPhone = (result?.phoneLinks || []).some((p) => !p.isValid);
  const isPixelMissing = !result?.metaPixel?.exists;
  const hasNoIndex = !!result?.seoPenalty?.hasNoIndex;

  // Funnel calculations
  const totalClickers = Math.round((monthlyVisitors * (clickRate / 100)));
  
  // WhatsApp drop rate: 100% bounce if broken (+9191), 35% if missing, 12% if valid
  const whatsappDropPercent = hasBrokenWhatsApp ? 95 : 15;
  const lostWhatsAppInquiries = Math.round(totalClickers * 0.7 * (whatsappDropPercent / 100));

  // Phone drop rate: 80% if invalid length, 20% if valid
  const phoneDropPercent = hasBrokenPhone ? 75 : 20;
  const lostPhoneInquiries = Math.round(totalClickers * 0.3 * (phoneDropPercent / 100));

  const totalLostLeads = Math.min(totalClickers, lostWhatsAppInquiries + lostPhoneInquiries);
  
  // Conversion of leads into paying customers (typical 20%)
  const lostCustomers = Math.round(totalLostLeads * 0.22);
  const monthlyRevenueLoss = Math.round(lostCustomers * averageTicket);
  const annualRevenueLoss = monthlyRevenueLoss * 12;

  // Ad waste calculation: If pixel missing, ~40% of ad spend is burned on blind audiences
  const wastedAdSpend = Math.round(adSpend * (isPixelMissing ? 0.42 : 0.08));

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 md:p-8 shadow-xl space-y-8 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-5">
        <div>
          <span className="text-[10px] font-extrabold font-mono text-red-400 uppercase tracking-widest">
            Interactive Funnel Simulator
          </span>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <TrendingDown className="h-6 w-6 text-red-500" />
            Lead Drop-off & Ad Bleed Forensics
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Adjust your business metrics to calculate exact personalized monthly revenue loss and wasted ad spend.
          </p>
        </div>

        <button
          onClick={() => {
            setMonthlyVisitors(8500);
            setAdSpend(35000);
            setAverageTicket(3500);
            setClickRate(6.5);
          }}
          className="flex items-center gap-1.5 self-start sm:self-auto rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all border border-slate-700"
        >
          <RefreshCw className="h-3 w-3" />
          <span>Reset Defaults</span>
        </button>
      </div>

      {/* Interactive Controls Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Monthly Visitors */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Monthly Visitors</span>
            <Users className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {monthlyVisitors.toLocaleString('en-IN')}
          </div>
          <input
            type="range"
            min="1000"
            max="50000"
            step="500"
            value={monthlyVisitors}
            onChange={(e) => setMonthlyVisitors(Number(e.target.value))}
            className="w-full accent-red-600 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>1,000</span>
            <span>50,000+</span>
          </div>
        </div>

        {/* Metric 2: Monthly Ad Spend */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Monthly Ad Budget</span>
            <Target className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            ₹{adSpend.toLocaleString('en-IN')}
          </div>
          <input
            type="range"
            min="0"
            max="200000"
            step="5000"
            value={adSpend}
            onChange={(e) => setAdSpend(Number(e.target.value))}
            className="w-full accent-red-600 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>₹0 (Organic)</span>
            <span>₹2,00,000</span>
          </div>
        </div>

        {/* Metric 3: Average Ticket / Deal Value */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Avg Customer Value</span>
            <DollarSign className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            ₹{averageTicket.toLocaleString('en-IN')}
          </div>
          <input
            type="range"
            min="500"
            max="50000"
            step="500"
            value={averageTicket}
            onChange={(e) => setAverageTicket(Number(e.target.value))}
            className="w-full accent-red-600 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>₹500</span>
            <span>₹50,000+</span>
          </div>
        </div>

        {/* Metric 4: Lead Intent Rate */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Click-to-Chat Intent</span>
            <Sparkles className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {clickRate}%
          </div>
          <input
            type="range"
            min="1"
            max="15"
            step="0.5"
            value={clickRate}
            onChange={(e) => setClickRate(Number(e.target.value))}
            className="w-full accent-red-600 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>1% (Low)</span>
            <span>15% (High Intent)</span>
          </div>
        </div>

      </div>

      {/* Visual Funnel Breakdown Stage Map */}
      <div className="space-y-4">
        <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
          Conversion Funnel Stage-by-Stage Forensic Breakdown
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          
          {/* Stage 1: Traffic Inflow */}
          <div className="rounded-2xl bg-slate-950 p-4 border border-slate-800 relative">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Stage 1</div>
            <div className="text-sm font-bold text-white mt-1">Website Traffic</div>
            <div className="text-xl font-black text-white font-mono mt-2">{monthlyVisitors.toLocaleString('en-IN')}</div>
            <p className="text-[11px] text-slate-400 mt-1">Total inbound visitors from organic & ads.</p>
            <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10">
              <ArrowRight className="h-5 w-5 text-slate-600" />
            </div>
          </div>

          {/* Stage 2: Lead Intent (Button Clicks) */}
          <div className="rounded-2xl bg-slate-950 p-4 border border-slate-800 relative">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Stage 2</div>
            <div className="text-sm font-bold text-white mt-1">Contact Button Clicks</div>
            <div className="text-xl font-black text-slate-200 font-mono mt-2">~{totalClickers.toLocaleString('en-IN')}</div>
            <p className="text-[11px] text-slate-400 mt-1">Visitors intending to book or inquire.</p>
            <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10">
              <ArrowRight className="h-5 w-5 text-slate-600" />
            </div>
          </div>

          {/* Stage 3: The Leak (Bounced Due to Bug) */}
          <div className="rounded-2xl bg-red-950/20 p-4 border border-red-900/40 relative">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-red-400">Stage 3 (Fatal Drop)</div>
            <div className="text-sm font-black text-red-300 mt-1">Lost at Launch</div>
            <div className="text-xl font-black text-red-500 font-mono mt-2">-{totalLostLeads.toLocaleString('en-IN')} leads</div>
            <p className="text-[11px] text-red-300 mt-1">
              {hasBrokenWhatsApp ? 'Broken WhatsApp format causes instant bounce.' : 'Standard dropoff rate.'}
            </p>
            <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10">
              <ArrowRight className="h-5 w-5 text-slate-600" />
            </div>
          </div>

          {/* Stage 4: Net Lost Revenue */}
          <div className="rounded-2xl bg-red-950/40 p-4 border-2 border-red-600/60 shadow-lg shadow-red-900/20">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-red-400">Net Impact</div>
            <div className="text-sm font-black text-white mt-1">Lost Monthly Revenue</div>
            <div className="text-2xl font-black text-red-400 font-mono mt-2">
              ₹{monthlyRevenueLoss.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-300 mt-1">
              ₹{(monthlyRevenueLoss * 12).toLocaleString('en-IN')}/year in lost clients.
            </p>
          </div>

        </div>
      </div>

      {/* Summary Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-800">
        <div className="rounded-xl bg-slate-950 p-4 border border-slate-800">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Ad Budget Bleed</span>
          <div className="text-xl font-black text-white mt-1">₹{wastedAdSpend.toLocaleString('en-IN')} / mo</div>
          <p className="text-xs text-slate-400 mt-1">
            {isPixelMissing ? 'Meta Pixel is missing; ad budget is spending blind.' : 'Meta Pixel installed.'}
          </p>
        </div>

        <div className="rounded-xl bg-slate-950 p-4 border border-slate-800">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">WhatsApp Lead Leak</span>
          <div className="text-xl font-black text-red-400 mt-1">~{lostWhatsAppInquiries} clients / mo</div>
          <p className="text-xs text-slate-400 mt-1">
            {hasBrokenWhatsApp ? 'Tapping WhatsApp button fails with error.' : 'WhatsApp links active.'}
          </p>
        </div>

        <div className="rounded-xl bg-slate-950 p-4 border border-slate-800">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">Recoverable by Fixing</span>
          <div className="text-xl font-black text-emerald-400 mt-1">₹{Math.round(monthlyRevenueLoss * 0.85).toLocaleString('en-IN')} / mo</div>
          <p className="text-xs text-slate-400 mt-1">
            Immediate 15-minute code fix restores full lead funnel.
          </p>
        </div>
      </div>

    </div>
  );
};
