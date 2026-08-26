import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, Globe, Loader2 } from 'lucide-react';

interface HeroScannerProps {
  onScan: (url: string) => Promise<void>;
  isLoading: boolean;
  activeUrl: string;
}

export const HeroScanner: React.FC<HeroScannerProps> = ({ onScan, isLoading, activeUrl }) => {
  const [urlInput, setUrlInput] = useState(activeUrl || '');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (activeUrl) setUrlInput(activeUrl);
  }, [activeUrl]);

  const validateUrlFormat = (input: string) => {
    if (!input.trim()) {
      setValidationError('Enter a website domain or URL.');
      return false;
    }
    const clean = input.trim().replace(/^https?:\/\//i, '');
    if (!clean.includes('.') || clean.length < 4) {
      setValidationError('Enter a valid domain, such as yourwebsite.com.');
      return false;
    }
    setValidationError(null);
    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateUrlFormat(urlInput) || isLoading) return;
    await onScan(urlInput.trim());
  };

  return (
    <div className="marketing-scanner">
      <form onSubmit={handleSubmit}>
        <div className="marketing-input-wrap">
          <Globe className="h-5 w-5 shrink-0 text-rose-500" />
          <input id="target-website-input" type="text" value={urlInput} onChange={(event) => { setUrlInput(event.target.value); setValidationError(null); }} placeholder="yourwebsite.com" disabled={isLoading} aria-label="Website domain" />
          <button id="run-audit-button" type="submit" disabled={isLoading || !urlInput.trim()}>
            {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Scanning</> : <>Check my website <ArrowRight className="h-4 w-4" /></>}
          </button>
        </div>
        {validationError && <p className="marketing-validation"><AlertCircle className="h-4 w-4" />{validationError}</p>}
      </form>
      <p className="marketing-trust-line"><span>No code required</span><i /> <span>Real website analysis</span><i /> <span>About 30 seconds</span></p>
      <div className="marketing-sample-links"><span>Explore a sample:</span><button type="button" onClick={() => onScan('drsharmadental.in')}>Dental clinic</button><button type="button" onClick={() => onScan('elitesalonmumbai.com')}>Salon website</button></div>
    </div>
  );
};
