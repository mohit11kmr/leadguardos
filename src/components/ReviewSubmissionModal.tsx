import React, { useState } from 'react';
import { X, Star, Sparkles, Send, CheckCircle2, MessageSquare, Building2, Globe } from 'lucide-react';
import confetti from 'canvas-confetti';
import { ReviewItem } from './TestimonialsWall';

interface ReviewSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitReview: (review: Omit<ReviewItem, 'id' | 'approved' | 'date'>) => void;
}

export const ReviewSubmissionModal: React.FC<ReviewSubmissionModalProps> = ({
  isOpen,
  onClose,
  onSubmitReview,
}) => {
  const [clientName, setClientName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [domain, setDomain] = useState('');
  const [rating, setRating] = useState<number>(5);
  const [serviceUsed, setServiceUsed] = useState<'Express Fix (₹2,999)' | '24/7 Watchdog (₹299/mo)' | 'Free Forensic Audit'>('Express Fix (₹2,999)');
  const [reviewText, setReviewText] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !reviewText) return;

    onSubmitReview({
      clientName,
      businessName: businessName || 'Business Owner',
      domain: domain || 'My Website',
      rating,
      serviceUsed,
      reviewText,
      verified: true,
    });

    setSubmitted(true);
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.7 },
    });
  };

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-3xl border border-amber-500/30 bg-slate-900 p-6 md:p-8 shadow-2xl space-y-6 m-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Star className="h-6 w-6 fill-amber-400" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-widest flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Community Feedback
            </span>
            <h3 className="text-xl font-extrabold text-white tracking-tight">Submit Your LeadGuard OS Review</h3>
          </div>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Rating Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Your Overall Rating</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 text-slate-600 hover:text-amber-400 transition-colors"
                  >
                    <Star
                      className={`h-7 w-7 ${
                        star <= rating
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-700'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs font-bold text-amber-400 ml-2">
                  {rating} of 5 Stars
                </span>
              </div>
            </div>

            {/* Client Name & Business */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Your Name *</label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Dr. Rajesh Sharma"
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Business Name</label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Sharma Dental Clinic"
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Service Used Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Service Used</label>
              <select
                value={serviceUsed}
                onChange={(e) => setServiceUsed(e.target.value as any)}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
              >
                <option value="Express Fix (₹2,999)">Express 15-Min Fix (₹2,999)</option>
                <option value="24/7 Watchdog (₹299/mo)">24/7 Watchdog Uptime Radar (₹299/mo)</option>
                <option value="Free Forensic Audit">Free Live Forensic Audit</option>
              </select>
            </div>

            {/* Review Message */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Your Experience / Review *</label>
              <textarea
                required
                rows={3}
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Describe how LeadGuard OS helped recover lost leads, fix broken WhatsApp links, or save ad spend..."
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold py-3 text-xs uppercase tracking-wider transition-all shadow-md active:scale-95"
            >
              <Send className="h-4 w-4" />
              <span>Submit Review for Admin Approval</span>
            </button>
          </form>
        ) : (
          <div className="text-center space-y-4 py-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <h4 className="text-xl font-bold text-white">Review Submitted!</h4>
            <p className="text-xs text-slate-300 max-w-sm mx-auto">
              Thank you {clientName}! Your review is sent to the founder <span className="font-semibold text-amber-400">Mohit Sikarwar</span> for moderation. Once approved, it will be published live on the reviews wall!
            </p>

            <div className="pt-4 border-t border-slate-800">
              <button
                onClick={onClose}
                className="rounded-xl bg-slate-800 hover:bg-slate-700 px-5 py-2 text-xs font-semibold text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
