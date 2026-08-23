import React, { useState } from 'react';
import { BookOpen, Sparkles, Clock, User, ArrowRight, Search, ShieldCheck, Tag, Wrench, MessageCircle, AlertTriangle } from 'lucide-react';

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: 'WhatsApp Fixes' | 'Meta Pixel & Ads' | 'SEO Indexing' | 'Lead Conversion';
  readTime: string;
  author: string;
  date: string;
  content: string;
}

export const ARTICLES: BlogPost[] = [
  {
    id: 'post_1',
    slug: 'fix-whatsapp-double-country-code-9191-bug',
    title: 'The +9191 Double Country Code Bug: How Indian Businesses Lose 30% WhatsApp Leads',
    excerpt: 'Why wa.me links with repeated country codes (+9191) fail on mobile WhatsApp apps and how to fix them in 2 minutes.',
    category: 'WhatsApp Fixes',
    readTime: '4 min read',
    author: 'Mohit Sikarwar (Founder)',
    date: '2026-08-20',
    content: `
### What is the +9191 Double Country Code Bug?
In India, thousands of WordPress, Shopify, and HTML websites suffer from a silent formatting bug. When site owners add their 10-digit mobile number (e.g. \`9876543210\`) into WhatsApp plugin settings that automatically prepend \`+91\`, the resulting link becomes:

\`https://wa.me/+91919876543210\` or \`https://api.whatsapp.com/send?phone=91919876543210\`

### Why Does It Break Mobile Conversions?
When a mobile customer taps this button:
1. Android & iOS WhatsApp apps check the country code \`+9191\`.
2. WhatsApp parses \`919876543210\` as an invalid 12-digit number.
3. The customer sees a dead error popup: *"Phone number is not on WhatsApp"*.
4. **Result:** The prospective client bounces immediately, burning your ad budget!

### How to Fix It Step-by-Step
1. Clean your raw number format to 12 digits: \`919876543210\` (without \`+\`, spaces, or leading \`0\`).
2. Always test your link on Chrome Mobile in Incognito Mode.
3. Or use **LeadGuard OS Express Fix (₹2,999)** to automatically repair and verify all mobile links in 15 minutes!
    `,
  },
  {
    id: 'post_2',
    slug: 'meta-pixel-fbq-lead-tracking-guide-for-indian-smes',
    title: 'Why Meta Ads Burn Money Without Verified Meta Pixel (fbq) Lead Events',
    excerpt: 'Running Instagram & Facebook Ads without custom fbq("track", "Lead") events causes Meta AI to optimize for cheap clicks instead of paying customers.',
    category: 'Meta Pixel & Ads',
    readTime: '6 min read',
    author: 'LeadGuard Research Team',
    date: '2026-08-21',
    content: `
### The Silent Meta Ad Budget Bleed
Many business owners in India spend ₹20,000 to ₹1,000,000 per month on Instagram & Facebook Ads. However, if your website only has basic Meta Pixel PageView tracking without **Custom Lead Event Triggers**, Meta's AI algorithm operates blindly.

### What Happens Without Custom Lead Triggers?
- Meta sends window shoppers and accidental link clickers to your website.
- Because Meta never receives feedback on who actually tapped your WhatsApp button or submitted your consultation form, it cannot optimize your target audience.
- You end up paying 4x higher Cost-Per-Lead (CPL).

### Recommended Implementation
Install event listeners on your WhatsApp and Call buttons:
\`\`\`javascript
document.getElementById('whatsapp-btn').addEventListener('click', function() {
  if (typeof fbq !== 'undefined') {
    fbq('track', 'Lead', { content_name: 'WhatsApp Consultation' });
  }
});
\`\`\`
    `,
  },
  {
    id: 'post_3',
    slug: 'accidental-noindex-tag-restore-google-search-rankings',
    title: 'Accidental <noindex> Meta Tags: How to Restore Lost Google Search Rankings',
    excerpt: 'Discover why WordPress "Discourage search engines" checkboxes or leftover staging meta tags can wipe your business off Google Search overnight.',
    category: 'SEO Indexing',
    readTime: '5 min read',
    author: 'Mohit Sikarwar (Founder)',
    date: '2026-08-22',
    content: `
### The Silent Killer of Google Organic Traffic
Imagine spending months building a clinic, salon, or real estate website, only to discover that Google hasn't indexed a single page! In 40% of audits we perform, websites contain an accidental meta tag in their \`<head>\` HTML:

\`<meta name="robots" content="noindex, nofollow">\`

### How Does This Happen?
1. Web developers check *"Discourage search engines from indexing this site"* during WordPress staging.
2. After launching, they forget to uncheck the setting.
3. Google Bot crawls the site, sees the \`noindex\` tag, and permanently removes your pages from Google Search results!

### How LeadGuard OS Detects It
Our 4-Pillar Scanner inspects raw DOM response headers and HTML meta tags to flag any indexability penalty instantly.
    `,
  },
  {
    id: 'post_4',
    slug: 'mobile-click-to-call-tel-links-audit-checklist',
    title: 'Mobile Click-to-Call (tel:) Audit: Complete Diagnostic Checklist for SMEs',
    excerpt: 'Ensure your phone buttons open native mobile dialers seamlessly without formatting or non-numeric digit errors.',
    category: 'Lead Conversion',
    readTime: '4 min read',
    author: 'LeadGuard Technical Team',
    date: '2026-08-23',
    content: `
### The Click-to-Call Customer Experience
When a potential client on a smartphone visits your website, they want to tap your phone number and talk to you immediately.

### Common Tel: Formatting Mistakes
- Writing plain text \`Phone: 9876543210\` without an anchor tag \`<a href="tel:9876543210">\`.
- Including spaces or dashes inside the \`href\` attribute: \`href="tel:+91 987-654-3210"\` which fails on certain Android dialers.
- Missing international country code \`+91\` for roaming users.

### The Fix
Always format phone links as:
\`<a href="tel:+919876543210" class="call-btn">Call Us Now</a>\`
    `,
  },
];

interface BlogHubViewProps {
  onOpenExpressFix: () => void;
}

export const BlogHubView: React.FC<BlogHubViewProps> = ({ onOpenExpressFix }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPosts = ARTICLES.filter((post) => {
    if (selectedCategory !== 'ALL' && post.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return post.title.toLowerCase().includes(q) || post.excerpt.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
      
      {/* Header */}
      <div className="rounded-3xl border border-rose-500/20 bg-slate-900/80 p-6 md:p-10 shadow-2xl backdrop-blur-2xl space-y-4 text-center relative overflow-hidden">
        <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-rose-300 shadow-md">
          <BookOpen className="h-4 w-4 text-rose-400" />
          <span>LeadGuard B2B Conversion & SEO Knowledge Hub</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          Conversion Engineering & Ad Shield Blog
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Deep-dive technical guides on fixing broken WhatsApp links, optimizing Meta Pixel events, and recovering lost customer leads.
        </p>

        {/* Search Bar */}
        <div className="max-w-md mx-auto relative pt-2">
          <Search className="absolute left-3.5 top-5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search articles (e.g. +9191, Meta Pixel, noindex)..."
            className="w-full rounded-2xl bg-slate-950 border border-slate-700 pl-10 pr-4 py-2.5 text-xs text-white focus:border-rose-500 focus:outline-none shadow-inner"
          />
        </div>
      </div>

      {/* Categories Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {['ALL', 'WhatsApp Fixes', 'Meta Pixel & Ads', 'SEO Indexing', 'Lead Conversion'].map((cat) => (
          <button
            key={cat}
            onClick={() => { setSelectedCategory(cat); setSelectedPost(null); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? 'bg-rose-600 text-white shadow-md border border-rose-400/30'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Reader View or Grid View */}
      {selectedPost ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-950/90 p-6 md:p-10 shadow-2xl space-y-6 animate-fade-in">
          <button
            onClick={() => setSelectedPost(null)}
            className="text-xs font-bold text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
          >
            ← Back to All Articles
          </button>

          <div className="space-y-2 border-b border-slate-800 pb-6">
            <span className="text-[10px] font-extrabold text-rose-400 uppercase tracking-widest bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
              {selectedPost.category}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white">{selectedPost.title}</h2>
            <div className="flex items-center gap-4 text-xs text-slate-400 pt-2 font-mono">
              <span>{selectedPost.author}</span>
              <span>•</span>
              <span>{selectedPost.date}</span>
              <span>•</span>
              <span>{selectedPost.readTime}</span>
            </div>
          </div>

          <div className="prose prose-invert max-w-none text-xs sm:text-sm text-slate-300 leading-relaxed space-y-4 font-sans whitespace-pre-line">
            {selectedPost.content}
          </div>

          {/* Bottom High-Converting Conversion Banner */}
          <div className="rounded-2xl border border-rose-500/40 bg-gradient-to-r from-rose-950/60 to-slate-900 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl pt-6">
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="text-sm font-bold text-white flex items-center justify-center sm:justify-start gap-2">
                <Wrench className="h-4 w-4 text-rose-400" />
                Don't Want to Fix Code Manually? Get 15-Min Express Fix
              </h4>
              <p className="text-xs text-slate-300">
                Mohit's engineering team will repair all broken WhatsApp links, Meta Pixels, and robots tags for ₹2,999.
              </p>
            </div>

            <button
              onClick={onOpenExpressFix}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-5 py-3 transition-all shadow-lg active:scale-95 whitespace-nowrap border border-rose-400/30"
            >
              <span>Book Express Fix (₹2,999)</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              onClick={() => setSelectedPost(post)}
              className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 flex flex-col justify-between shadow-xl cursor-pointer hover:border-rose-500/40 transition-all space-y-4 group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-rose-400 uppercase tracking-widest bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
                    {post.category}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {post.readTime}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white group-hover:text-rose-300 transition-colors leading-snug">
                  {post.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                  {post.excerpt}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400 font-mono">{post.author}</span>
                <span className="text-rose-400 font-bold text-xs group-hover:translate-x-1 transition-transform flex items-center gap-1">
                  Read Article <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
