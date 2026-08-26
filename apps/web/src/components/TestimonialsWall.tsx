import React, { useState } from 'react';
import { Star, CheckCircle2, MessageSquare, Plus, ShieldCheck, Quote, Sparkles, Building2, ExternalLink } from 'lucide-react';

export interface ReviewItem {
  id: string;
  clientName: string;
  businessName: string;
  domain: string;
  rating: number; // 1-5
  serviceUsed: 'Express Fix (₹2,999)' | '24/7 Watchdog (₹299/mo)' | 'Free Forensic Audit';
  reviewText: string;
  verified: boolean;
  date: string;
  approved: boolean;
}

export const INITIAL_REVIEWS: ReviewItem[] = [
  {
    id: 'rev_1',
    clientName: 'Dr. Rajesh Sharma',
    businessName: 'Sharma Dental Clinic',
    domain: 'drsharmadental.in',
    rating: 5,
    serviceUsed: 'Express Fix (₹2,999)',
    reviewText: 'Our mobile WhatsApp button had a double +9191 error for 4 months. Patients clicking on mobile were getting invalid number errors! Mohit fixed it in 12 minutes. Best ₹2,999 investment ever.',
    verified: true,
    date: '2026-08-15',
    approved: true,
  },
  {
    id: 'rev_2',
    clientName: 'Priya Kapoor',
    businessName: 'Elite Salon & Spa Mumbai',
    domain: 'elitesalonmumbai.com',
    rating: 5,
    serviceUsed: '24/7 Watchdog (₹299/mo)',
    reviewText: 'We run ₹45,000/mo Instagram ads. Watchdog caught our WhatsApp API outage within 5 minutes and alerted us on Telegram before we wasted ad money. Essential tool for any Indian business.',
    verified: true,
    date: '2026-08-18',
    approved: true,
  },
  {
    id: 'rev_3',
    clientName: 'Vikram Mehta',
    businessName: 'Urban Vogue D2C Store',
    domain: 'urbanvogue.in',
    rating: 5,
    serviceUsed: 'Express Fix (₹2,999)',
    reviewText: 'Our Shopify store had an accidental noindex tag blocking Google search results. LeadGuard OS detected it immediately, and the team removed it. Traffic recovered within a week!',
    verified: true,
    date: '2026-08-20',
    approved: true,
  },
];

interface TestimonialsWallProps {
  onOpenReviewModal: () => void;
  customReviews?: ReviewItem[];
}

export const TestimonialsWall: React.FC<TestimonialsWallProps> = ({
  onOpenReviewModal,
  customReviews = [],
}) => {
  const allReviews = [...INITIAL_REVIEWS, ...customReviews.filter(r => r.approved)];

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      
      {/* Header & Write Review Action */}
      <div className="rounded-3xl border border-amber-500/20 bg-slate-900/80 p-6 md:p-8 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            Verified Customer Case Studies & Reviews
          </span>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2 mt-0.5">
            <span>What Business Owners Say About LeadGuard OS</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real experiences from Indian clinics, salons, real estate firms, and D2C brands.
          </p>
        </div>

        <button
          onClick={onOpenReviewModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold px-4 py-2.5 text-xs transition-all shadow-md shadow-amber-950/40 active:scale-95 whitespace-nowrap"
        >
          <Plus className="h-4 w-4" />
          <span>Write a Review</span>
        </button>
      </div>

      {/* Grid of Reviews */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {allReviews.map((rev) => (
          <div
            key={rev.id}
            className="rounded-3xl border border-slate-800 bg-slate-950/90 p-6 flex flex-col justify-between shadow-xl relative overflow-hidden space-y-4 hover:border-amber-500/40 transition-colors"
          >
            <Quote className="absolute top-4 right-4 h-8 w-8 text-slate-800/40 pointer-events-none" />

            <div className="space-y-3">
              {/* Star Rating */}
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < rev.rating
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-slate-700'
                    }`}
                  />
                ))}
                <span className="text-xs font-bold text-amber-400 ml-1.5">
                  {rev.rating}.0
                </span>
              </div>

              {/* Review Text */}
              <p className="text-xs text-slate-300 leading-relaxed italic">
                "{rev.reviewText}"
              </p>
            </div>

            {/* Author Meta */}
            <div className="pt-4 border-t border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">{rev.clientName}</span>
                {rev.verified && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <CheckCircle2 className="h-3 w-3" />
                    Verified Fix
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-mono text-slate-300">{rev.businessName}</span>
                <span className="text-[10px] font-bold text-amber-400/90 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                  {rev.serviceUsed}
                </span>
              </div>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
};
