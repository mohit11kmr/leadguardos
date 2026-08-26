import React, { useState } from 'react';
import { apiFetch } from '../api/client';
import { ThumbsUp, ThumbsDown, MessageSquare, Check, X } from 'lucide-react';

interface UserFeedbackModalProps {
  scanId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const UserFeedbackModal: React.FC<UserFeedbackModalProps> = ({ scanId, isOpen, onClose }) => {
  const [rating, setRating] = useState<'USEFUL' | 'NOT_USEFUL' | null>(null);
  const [comments, setComments] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) return;

    try {
      await apiFetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scanId, rating, comments }),
      });
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Feedback error:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
        
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-rose-400" />
            Was this diagnostic report useful?
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="h-4 w-4" />
          </button>
        </div>

        {submitted ? (
          <div className="py-6 text-center space-y-2">
            <Check className="h-10 w-10 text-emerald-400 mx-auto" />
            <p className="text-xs font-bold text-white">Thank you for your feedback!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-center gap-4 py-2">
              <button
                type="button"
                onClick={() => setRating('USEFUL')}
                className={`flex-1 py-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  rating === 'USEFUL'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-850'
                }`}
              >
                <ThumbsUp className="h-4 w-4 text-emerald-400" />
                <span>Yes, Useful</span>
              </button>

              <button
                type="button"
                onClick={() => setRating('NOT_USEFUL')}
                className={`flex-1 py-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  rating === 'NOT_USEFUL'
                    ? 'bg-rose-600/20 border-rose-500 text-rose-300'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-850'
                }`}
              >
                <ThumbsDown className="h-4 w-4 text-rose-400" />
                <span>Could Be Better</span>
              </button>
            </div>

            <textarea
              value={comments}
              onChange={e => setComments(e.target.value)}
              placeholder="Optional notes or suggestions..."
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none h-20 resize-none"
            />

            <button
              type="submit"
              disabled={!rating}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-md"
            >
              Submit Feedback
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
