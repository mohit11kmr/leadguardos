import React, { useState } from 'react';
import { AuditResult } from '../types';
import { Calculator, IndianRupee, TrendingDown, Users, Percent, ShieldCheck, Sparkles, ArrowRight } from 'lucide-react';

interface RevenueScenarioCalculatorProps {
  result: AuditResult;
  onOpenExpressFix: () => void;
}

export const RevenueScenarioCalculator: React.FC<RevenueScenarioCalculatorProps> = ({
  result,
  onOpenExpressFix,
}) => {
  // Preset scenarios
  const [monthlyVisitors, setMonthlyVisitors] = useState<number>(10000);
  const [contactRate, setContactRate] = useState<number>(2.5); // %
  const [avgCustomerValue, setAvgCustomerValue] = useState<number>(3500); // ₹
  const [affectedChannelRate, setAffectedChannelRate] = useState<number>(
    result.score < 50 ? 50 : result.score < 80 ? 25 : 10
  ); // %

  // Calculations
  const expectedMonthlyLeads = Math.round(monthlyVisitors * (contactRate / 100));
  const lostLeadsPerMonth = Math.round(expectedMonthlyLeads * (affectedChannelRate / 100));
  const monthlyRevenueExposure = lostLeadsPerMonth * avgCustomerValue;
  const annualRevenueExposure = monthlyRevenueExposure * 12;

  // Preset switchers
  const applyPreset = (preset: 'CLINIC' | 'D2C' | 'REALESTATE' | 'B2B') => {
    switch (preset) {
      case 'CLINIC':
        setMonthlyVisitors(4500);
        setContactRate(3.5);
        setAvgCustomerValue(2200);
        setAffectedChannelRate(35);
        break;
      case 'D2C':
        setMonthlyVisitors(25000);
        setContactRate(2.0);
        setAvgCustomerValue(1800);
        setAffectedChannelRate(25);
        break;
      case 'REALESTATE':
        setMonthlyVisitors(3000);
        setContactRate(1.5);
        setAvgCustomerValue(45000);
        setAffectedChannelRate(30);
        break;
      case 'B2B':
        setMonthlyVisitors(8000);
        setContactRate(2.0);
        setAvgCustomerValue(15000);
        setAffectedChannelRate(20);
        break;
    }
  };

  return (
    <div className="rounded-3xl border border-slate-800/90 bg-slate-900/80 p-6 md:p-8 shadow-xl space-y-6 backdrop-blur-sm">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              Interactive Financial Loss & Scenario Calculator
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Model your monthly ad bleed & lost revenue exposure based on real visitor metrics for <strong>{result.domain}</strong>
          </p>
        </div>

        {/* Industry Presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-slate-400 font-medium mr-1">Presets:</span>
          <button
            onClick={() => applyPreset('CLINIC')}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-all"
          >
            Clinic/Salon
          </button>
          <button
            onClick={() => applyPreset('D2C')}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-all"
          >
            D2C Store
          </button>
          <button
            onClick={() => applyPreset('REALESTATE')}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-all"
          >
            Real Estate
          </button>
          <button
            onClick={() => applyPreset('B2B')}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-all"
          >
            B2B Services
          </button>
        </div>
      </div>

      {/* Grid: Controls on Left, Visual Outcome on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        
        {/* Controls (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Monthly Visitors */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-indigo-400" />
                Monthly Website Visitors
              </span>
              <span className="font-mono font-bold text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {monthlyVisitors.toLocaleString('en-IN')} visitors/mo
              </span>
            </div>
            <input
              type="range"
              min="500"
              max="100000"
              step="500"
              value={monthlyVisitors}
              onChange={(e) => setMonthlyVisitors(Number(e.target.value))}
              className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>500</span>
              <span>25,000</span>
              <span>50,000</span>
              <span>100,000+</span>
            </div>
          </div>

          {/* Contact / Intent Rate */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Percent className="h-3.5 w-3.5 text-emerald-400" />
                Estimated Contact / Inquire Rate (%)
              </span>
              <span className="font-mono font-bold text-emerald-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {contactRate}% ({expectedMonthlyLeads} total inquiries)
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="10"
              step="0.5"
              value={contactRate}
              onChange={(e) => setContactRate(Number(e.target.value))}
              className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          {/* Average Customer Value */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <IndianRupee className="h-3.5 w-3.5 text-amber-400" />
                Average Revenue Per Customer / Client (₹)
              </span>
              <span className="font-mono font-bold text-amber-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                ₹{avgCustomerValue.toLocaleString('en-IN')}
              </span>
            </div>
            <input
              type="range"
              min="500"
              max="50000"
              step="500"
              value={avgCustomerValue}
              onChange={(e) => setAvgCustomerValue(Number(e.target.value))}
              className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          {/* Affected Channel Traffic Share */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <TrendingDown className="h-3.5 w-3.5 text-rose-400" />
                Traffic Impacted by Detected Leaks (%)
              </span>
              <span className="font-mono font-bold text-rose-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {affectedChannelRate}% ({lostLeadsPerMonth} dropped leads)
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="80"
              step="5"
              value={affectedChannelRate}
              onChange={(e) => setAffectedChannelRate(Number(e.target.value))}
              className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
          </div>

        </div>

        {/* Dynamic Financial Outcome Card (5 Cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-rose-500/30 bg-gradient-to-b from-rose-950/20 to-slate-950/90 p-6 flex flex-col justify-between space-y-6 backdrop-blur-sm">
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingDown className="h-4 w-4" />
                Monthly Revenue Exposure
              </span>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                Live Model
              </span>
            </div>

            {/* Big Loss Figure */}
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight flex items-center">
                <span className="text-rose-400">₹</span>
                {monthlyRevenueExposure.toLocaleString('en-IN')}
                <span className="text-xs font-normal text-slate-400 ml-2">/ month</span>
              </div>
              <p className="text-xs text-rose-300/80">
                Estimated <strong>{lostLeadsPerMonth} leads</strong> bouncing directly due to funnel defects every 30 days.
              </p>
            </div>

            {/* Annual Run-rate metric */}
            <div className="rounded-xl bg-slate-950/80 border border-slate-800/80 p-3 flex items-center justify-between text-xs">
              <span className="text-slate-400">Annual Run-rate Bleed:</span>
              <strong className="text-rose-400 font-mono text-sm">
                ₹{annualRevenueExposure.toLocaleString('en-IN')} / yr
              </strong>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed italic">
              * Scenario estimate based on {monthlyVisitors.toLocaleString('en-IN')} monthly visits and ₹{avgCustomerValue.toLocaleString('en-IN')} average deal size.
            </p>
          </div>

          {/* Quick Action Button */}
          <button
            onClick={onOpenExpressFix}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-bold text-xs tracking-wide transition-all shadow-lg shadow-rose-950/50 flex items-center justify-center gap-2 active:scale-98"
          >
            <Sparkles className="h-4 w-4" />
            <span>Stop This Revenue Leak (₹2,999 Fix)</span>
            <ArrowRight className="h-4 w-4" />
          </button>

        </div>

      </div>

    </div>
  );
};
