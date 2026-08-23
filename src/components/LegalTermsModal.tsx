import React from 'react';
import { X, ShieldCheck, Scale, Lock, AlertCircle } from 'lucide-react';

interface LegalTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  type?: 'TERMS' | 'PRIVACY' | 'DISCLAIMER';
}

export const LegalTermsModal: React.FC<LegalTermsModalProps> = ({
  isOpen,
  onClose,
  type = 'TERMS',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div 
        className="relative w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-950 p-6 md:p-8 shadow-2xl space-y-6 my-auto max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
            <Scale className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">
              Legal Compliance & Disclaimer
            </h3>
            <p className="text-xs text-slate-400">
              Terms of Service, Privacy Protection (DPDP Act 2023), & Trademark Notice
            </p>
          </div>
        </div>

        {/* Body Content */}
        <div className="space-y-4 text-xs text-slate-300 leading-relaxed font-sans">
          
          <div className="rounded-2xl border border-rose-500/20 bg-rose-950/20 p-4 space-y-2">
            <h4 className="font-bold text-rose-300 flex items-center gap-1.5 text-xs uppercase tracking-wider">
              <AlertCircle className="h-4 w-4 shrink-0" />
              1. Third-Party Trademark Disclaimer
            </h4>
            <p className="text-slate-300">
              WhatsApp® is a registered trademark of Meta Platforms, Inc. Facebook® and Meta® are registered trademarks of Meta Platforms, Inc. Google® and Google Analytics® are registered trademarks of Google LLC. LeadGuard OS is an independent revenue recovery diagnostic software developed by <strong>Mohit Sikarwar</strong> and is not affiliated, sponsored, endorsed, or partnered with Meta Platforms, Google LLC, or Razorpay.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-white text-sm">2. Diagnostic Audit Disclaimer</h4>
            <p>
              Audit scores (e.g. 45/100), estimated revenue loss ranges (₹/month), and vulnerability assessments provided by LeadGuard OS are automated technical estimations generated via HTTP headers, HTML DOM analysis, and Playwright browser runtime inspections. They serve as diagnostic optimization guidance and do not constitute financial, legal, or binding performance guarantees.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-white text-sm">3. Privacy Policy & DPDP Act 2023 Compliance</h4>
            <p>
              LeadGuard OS respects your digital privacy under the Digital Personal Data Protection (DPDP) Act 2023 (India) and GDPR guidelines:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li><strong>Data Collection:</strong> We only collect publicly accessible domain HTTP/DOM data requested during audits.</li>
              <li><strong>Data Storage:</strong> Scanned domain records are stored securely with SHA-256 encryption. We never sell, trade, or share your contact info or domain data to third parties.</li>
              <li><strong>Right to Erase:</strong> You may request complete erasure of your domain audit history at any time by contacting <code>mohitsikarwar123@gmail.com</code>.</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-white text-sm">4. Responsible Scanning Policy</h4>
            <p>
              LeadGuard OS enforces strict Server-Side Request Forgery (SSRF) guards and RFC 1918 private network blocks. Users are prohibited from utilizing LeadGuard OS for unauthorized vulnerability exploitation or malicious port scanning.
            </p>
          </div>

        </div>

        {/* Footer Close */}
        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-xs font-bold text-white shadow-lg transition-all"
          >
            I Understand & Agree
          </button>
        </div>

      </div>
    </div>
  );
};
