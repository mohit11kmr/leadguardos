import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'hi';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string, defaultText?: string) => string;
}

const translations: Record<string, { en: string; hi: string }> = {
  // Nav
  'nav.liveAudit': { en: 'Live Audit', hi: 'लाइव ऑडिट' },
  'nav.sabotage': { en: 'Sabotage Radar', hi: 'प्रतिद्वंद्वी रडार' },
  'nav.zeroIntent': { en: 'Zero-Intent WA', hi: 'व्हाट्सएप जांच' },
  'nav.cartDeath': { en: 'Cart Death', hi: 'कार्ट ड्रॉप मॉनिटर' },
  'nav.hunter': { en: 'Hunter Mode', hi: 'हंटर मोड' },
  'nav.funnel': { en: 'Funnel Simulator', hi: 'फनल सिमुलेटर' },
  'nav.agency': { en: 'Agency Hub', hi: 'एजेंसी हब' },
  'nav.watchdog': { en: '24/7 Watchdog', hi: '24/7 वॉचडॉग' },
  'nav.pricing': { en: 'Plans & Fixes', hi: 'प्लान व सोल्यूशंस' },
  'nav.contact': { en: 'Contact Support', hi: 'सम्पर्क करें' },

  // Hero
  'hero.title': {
    en: 'Stop Losing Paying Customers & Recover 100% Lost Leads',
    hi: 'ग्राहकों का टूटना तुरंत रोकें और 100% खोई हुई लीड्स रिकवर करें',
  },
  'hero.subtitle': {
    en: 'Detect broken +9191 WhatsApp links, dead call buttons, untracked Meta Pixels, and silent SEO flaws before wasting your ad budget.',
    hi: 'अपनी वेबसाइट के टूटे व्हाट्सएप लिंक (+9191), कॉल बटन, मेटा पिक्सेल और छुपे हुए डिफेक्ट्स को 15 सेकंड में स्कैन करें।',
  },
  'hero.inputPlaceholder': {
    en: 'Enter website domain (e.g. drsharmadental.in, yourbrand.com)',
    hi: 'अपनी वेबसाइट का नाम लिखें (उदा. yourbusiness.in, brand.com)',
  },
  'hero.scanButton': {
    en: 'Run 6-Layer Forensic Diagnostic',
    hi: '6-स्तरीय पूर्ण ऑडिट शुरू करें',
  },
  'hero.scanning': {
    en: 'Scanning Channels...',
    hi: 'वेबसाइट स्कैन हो रही है...',
  },

  // Trust Banner
  'trust.heading': {
    en: '100% Safe, Non-Intrusive & Trusted Diagnostic',
    hi: '100% सुरक्षित एवं भरोसेमंद डायग्नोस्टिक',
  },
  'trust.quote': {
    en: '"Never let a single paying customer slip away — that is our promise."',
    hi: '"आपका एक भी ग्राहक या लीड व्यर्थ न जाए — यही हमारा संकल्प है।"',
  },
  'trust.badge': {
    en: '🇮🇳 Trusted by Indian Business Owners',
    hi: '🇮🇳 भारत के व्यापारियों का सच्चा भरोसा',
  },
  'trust.noPassword': {
    en: 'No Password Needed: Pure client-side external scan',
    hi: 'No Password Needed: बिना किसी लॉगिन या पासवर्ड के सेफ जांच',
  },
  'trust.zeroLoad': {
    en: 'Zero Server Load: 0% impact on website speed',
    hi: 'Zero Server Load: आपकी वेबसाइट स्पीड पर कोई असर नहीं',
  },
  'trust.confidential': {
    en: '100% Confidential: Fully private and encrypted',
    hi: '100% Confidential: आपका डेटा पूरी तरह सुरक्षित व प्राइवेट',
  },

  // Counters
  'counter.title': {
    en: 'LeadGuard Global Live Scan Counter',
    hi: 'लीडगार्ड ग्लोबल लाइव स्कैन काउंटर',
  },
  'counter.totalScanned': {
    en: 'Total Scanned Sites',
    hi: 'कुल स्कैन की गई वेबसाइट्स',
  },
  'counter.problems': {
    en: 'Problems Found in Sites',
    hi: 'पकड़ी गई तकनीकी गलतियाँ',
  },
  'counter.healthy': {
    en: 'Healthy Sites',
    hi: 'स्वस्थ व 100% फिट साइट्स',
  },
  'counter.fixed': {
    en: 'Fixed by LeadGuard',
    hi: 'लीडगार्ड द्वारा रिकवर की गई साइट्स',
  },

  // Actions
  'action.shareWhatsapp': {
    en: 'Share on WhatsApp',
    hi: 'व्हाट्सएप पर शेयर करें',
  },
  'action.downloadPdf': {
    en: 'Download PDF Report',
    hi: 'पीडीएफ रिपोर्ट डाउनलोड करें',
  },
  'action.getAlerts': {
    en: 'Get WhatsApp Alerts',
    hi: 'व्हाट्सएप अलर्ट सेट करें',
  },
  'action.contactOwner': {
    en: 'Talk to Mohit Sikarwar',
    hi: 'मोहित सिकरवार से बात करें',
  },
};

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  setLang: () => {},
  t: (key: string, defaultText?: string) => defaultText || key,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('leadguard_lang');
    return (saved as Language) || 'en';
  });

  useEffect(() => {
    localStorage.setItem('leadguard_lang', lang);
  }, [lang]);

  const t = (key: string, defaultText?: string): string => {
    const item = translations[key];
    if (!item) return defaultText || key;
    return item[lang] || defaultText || item.en;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
