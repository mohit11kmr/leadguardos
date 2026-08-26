import React, { useState } from 'react';
import { Code2, Copy, Check, Terminal, Layers, FileCode, CheckCircle, ShieldCheck, Zap } from 'lucide-react';

export const AutoFixScriptStudio: React.FC = () => {
  const [platform, setPlatform] = useState<'universal' | 'wordpress' | 'shopify' | 'elementor' | 'webflow'>('universal');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const universalScript = `<!-- LeadGuard OS: Zero-Touch Auto-Repair Script -->
<script>
(function() {
  function fixLeadLinks() {
    // 1. Repair WhatsApp Links (Double +9191, leading 0s, missing country codes)
    document.querySelectorAll('a[href*="wa.me"], a[href*="api.whatsapp.com"]').forEach(function(el) {
      var href = el.getAttribute('href');
      if (!href) return;
      var textMatch = href.match(/[?&]text=([^&]+)/);
      var textQuery = textMatch ? '?text=' + textMatch[1] : '';
      var digits = href.replace(/\\D/g, '');
      
      if (digits.startsWith('9191') && digits.length >= 12) {
        digits = digits.substring(2);
      } else if (digits.startsWith('0') && digits.length === 11) {
        digits = '91' + digits.substring(1);
      } else if (digits.length === 10 && /^[6-9]/.test(digits)) {
        digits = '91' + digits;
      }
      
      if (digits.length >= 10) {
        el.setAttribute('href', 'https://wa.me/' + digits + textQuery);
      }
    });

    // 2. Repair Click-to-Call tel: links
    document.querySelectorAll('a[href^="tel:"]').forEach(function(el) {
      var href = el.getAttribute('href');
      var clean = href.replace(/[^0-9+]/g, '');
      if (clean.length === 10) {
        el.setAttribute('href', 'tel:+91' + clean);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixLeadLinks);
  } else {
    fixLeadLinks();
  }
})();
</script>`;

  const wordpressSnippet = `<?php
// Add this to your child theme's functions.php or Code Snippets plugin
add_action('wp_footer', function() {
    ?>
    <script>
    document.addEventListener('DOMContentLoaded', function() {
        document.querySelectorAll('a[href*="wa.me"]').forEach(function(el) {
            var href = el.getAttribute('href') || '';
            var digits = href.replace(/\\D/g, '');
            if (digits.startsWith('9191') && digits.length >= 12) {
                el.href = href.replace(/9191/, '91');
            }
        });
    });
    </script>
    <?php
});`;

  const shopifySnippet = `<!-- Add to layout/theme.liquid right before </body> -->
<script>
  window.addEventListener('DOMContentLoaded', function() {
    var waLinks = document.querySelectorAll('a[href*="wa.me"], a[href*="whatsapp"]');
    waLinks.forEach(function(a) {
      var href = a.getAttribute('href') || '';
      var digits = href.replace(/\\D/g, '');
      if (digits.startsWith('9191')) {
        a.href = href.replace('9191', '91');
      }
    });
  });
</script>`;

  const elementorSnippet = `<!-- Add an HTML Widget to your Elementor Global Footer -->
<script>
jQuery(document).ready(function($) {
  $('a[href*="wa.me"]').each(function() {
    var href = $(this).attr('href');
    if (href && href.indexOf('9191') !== -1) {
      $(this).attr('href', href.replace('9191', '91'));
    }
  });
});
</script>`;

  const webflowSnippet = `<!-- Add to Project Settings > Custom Code > Footer Code -->
<script>
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('a[href*="wa.me"]').forEach(function(btn) {
    var raw = btn.getAttribute('href');
    if (raw && raw.includes('9191')) {
      btn.setAttribute('href', raw.replace('9191', '91'));
    }
  });
});
</script>`;

  const getCode = () => {
    switch (platform) {
      case 'wordpress': return wordpressSnippet;
      case 'shopify': return shopifySnippet;
      case 'elementor': return elementorSnippet;
      case 'webflow': return webflowSnippet;
      default: return universalScript;
    }
  };

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 md:p-8 shadow-xl space-y-8 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-5">
        <div>
          <span className="text-[10px] font-extrabold font-mono text-red-400 uppercase tracking-widest">
            1-Click Implementation Studio
          </span>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Code2 className="h-6 w-6 text-red-500" />
            Zero-Touch Lead Auto-Repair Script & CMS Patches
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Fix all broken WhatsApp, tel:, and tracking links instantly across any website with a single snippet.
          </p>
        </div>

        <div className="flex items-center gap-1.5 rounded-full bg-emerald-950/40 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-400">
          <ShieldCheck className="h-4 w-4" />
          <span>Client-Side Safe (No DB Changes)</span>
        </div>
      </div>

      {/* Platform Selector Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: 'universal', label: '⚡ Universal HTML (All Sites)' },
          { id: 'wordpress', label: 'WordPress (functions.php)' },
          { id: 'shopify', label: 'Shopify (theme.liquid)' },
          { id: 'elementor', label: 'Elementor Global Footer' },
          { id: 'webflow', label: 'Webflow Custom Code' },
        ].map((p) => (
          <button
            key={p.id}
            onClick={() => setPlatform(p.id as any)}
            className={`rounded-xl px-3.5 py-2 text-xs font-bold uppercase tracking-wider transition-all border ${
              platform === p.id
                ? 'border-red-500 bg-red-600 text-white shadow-md shadow-red-900/30'
                : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Code Viewer Box */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <Terminal className="h-4 w-4 text-red-500" />
            <span>Target: {platform.toUpperCase()} INJECTION</span>
          </div>

          <button
            id="copy-script-code-btn"
            onClick={() => handleCopy('script', getCode())}
            className="flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-red-900/20 active:scale-95"
          >
            {copiedKey === 'script' ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Copied Code!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy 1-Click Script</span>
              </>
            )}
          </button>
        </div>

        <pre className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-emerald-400 overflow-x-auto leading-relaxed max-h-[340px]">
          <code>{getCode()}</code>
        </pre>
      </div>

      {/* How it works 3-Step Guide */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-800">
        <div className="rounded-xl bg-slate-950 p-4 border border-slate-800 space-y-1">
          <span className="text-[10px] font-extrabold text-red-400 uppercase tracking-wider">Step 1</span>
          <h4 className="text-xs font-bold text-white">Copy Snippet</h4>
          <p className="text-[11px] text-slate-400">Copy the platform-specific code above in 1 click.</p>
        </div>

        <div className="rounded-xl bg-slate-950 p-4 border border-slate-800 space-y-1">
          <span className="text-[10px] font-extrabold text-red-400 uppercase tracking-wider">Step 2</span>
          <h4 className="text-xs font-bold text-white">Paste Before &lt;/body&gt;</h4>
          <p className="text-[11px] text-slate-400">Paste inside your site theme footer or custom code manager.</p>
        </div>

        <div className="rounded-xl bg-slate-950 p-4 border border-slate-800 space-y-1">
          <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider">Step 3</span>
          <h4 className="text-xs font-bold text-white">Instant Lead Recovery</h4>
          <p className="text-[11px] text-slate-400">All broken WhatsApp links and dialers auto-heal instantly on user click.</p>
        </div>
      </div>

    </div>
  );
};
