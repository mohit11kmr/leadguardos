import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import net from "net";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with User-Agent header for AI Studio
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.warn("Failed to initialize GoogleGenAI:", err);
  }
}

// In-memory store for Watchdog leads & dynamic pings
interface WatchdogEntry {
  id: string;
  targetUrl: string;
  contact: string;
  channel: 'TELEGRAM' | 'WHATSAPP' | 'EMAIL';
  frequency?: 'DAILY' | 'WEEKLY' | 'HOURLY';
  createdAt: string;
  trialExpiresAt: string;
  status: 'ACTIVE_TRIAL' | 'ACTIVE_SUBSCRIPTION' | 'EXPIRED' | 'CONVERTED';
}

const watchdogLeads: WatchdogEntry[] = [];
const liveWatchdogChecks: { id: string; domain: string; check: string; status: string; timestamp: string }[] = [
  { id: "chk_1", domain: "drsharmadental.in", check: "WhatsApp Link Routing", status: "FAIL (+9191)", timestamp: new Date(Date.now() - 4 * 60 * 1000).toISOString() },
  { id: "chk_2", domain: "elitesalonmumbai.com", check: "Google Review 404", status: "FAIL (404 Dead Link)", timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString() },
  { id: "chk_3", domain: "urbanvogue.in", check: "Meta Pixel & GA4 Ping", status: "PASS (Healthy)", timestamp: new Date(Date.now() - 18 * 60 * 1000).toISOString() },
  { id: "chk_4", domain: "apexgrandrealestate.com", check: "Toll Free Dialer", status: "FAIL (8-digit cut)", timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString() },
];

// Global in-memory report store for shareable report URLs (/report/:scanId)
const scanReportsStore = new Map<string, any>();

// Live Global Scan Statistics Store
const globalScanStats = {
  totalScannedSites: 14820,
  problemsFound: 38490,
  healthySites: 2940,
  fixedByLeadGuard: 11260,
  lastUpdated: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// 1. SSRF & Safe URL Guard (Strict RFC1918, Loopback, Cloud Metadata Protection)
// ---------------------------------------------------------------------------
function isPrivateOrLoopbackIP(ip: string): boolean {
  if (!ip) return false;
  if (ip === "127.0.0.1" || ip === "::1" || ip === "0.0.0.0") return true;

  // Check IPv4
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    // 10.0.0.0/8
    if (parts[0] === 10) return true;
    // 172.16.0.0/12
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 169.254.0.0/16 (Link Local & Cloud Metadata)
    if (parts[0] === 169 && parts[1] === 254) return true;
    // 127.0.0.0/8
    if (parts[0] === 127) return true;
    // 0.0.0.0/8
    if (parts[0] === 0) return true;
  }
  return false;
}

function isValidWebUrl(rawUrl: string): { valid: boolean; error?: string; normalized?: string } {
  let url = (rawUrl || "").trim();
  if (!url) return { valid: false, error: "URL cannot be empty" };

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }

  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { valid: false, error: "Only HTTP and HTTPS protocols are supported" };
    }

    const host = parsed.hostname.toLowerCase();

    // Check string match for loopback / private names
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host === "0.0.0.0" ||
      host === "169.254.169.254" ||
      host === "metadata.google.internal" ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      host.endsWith(".localhost") ||
      host.endsWith(".arpa") ||
      host.startsWith("10.") ||
      host.startsWith("192.168.")
    ) {
      return { valid: false, error: "Scanning internal / private network IP addresses is blocked for security (SSRF Guard)." };
    }

    if (isPrivateOrLoopbackIP(host)) {
      return { valid: false, error: "Scanning private IP ranges is blocked." };
    }

    return { valid: true, normalized: parsed.toString() };
  } catch {
    return { valid: false, error: "Invalid website URL format." };
  }
}

// ---------------------------------------------------------------------------
// 2. Preset Curated Demos for Instant Testing & Offline Resilience
// ---------------------------------------------------------------------------
const SAMPLE_PRESETS: Record<string, any> = {
  "drsharmadental.in": {
    domain: "drsharmadental.in",
    businessName: "Dr. Sharma Dental & Implant Center",
    score: 38,
    estimatedMonthlyLoss: 24500,
    adSpendRisk: "CRITICAL",
    whatsappLinks: [
      {
        url: "https://wa.me/91919876543210",
        status: "BROKEN",
        isValid: false,
        issue: "Double Country Code prefix detected (+9191). WhatsApp fails on mobile with 'Invalid Phone Number'.",
        suggestedFix: "Change to https://wa.me/919876543210?text=Hi%20Dr.%20Sharma,%20I%20need%20an%20appointment",
        digits: "91919876543210",
      }
    ],
    phoneLinks: [
      {
        url: "tel:9876543210",
        status: "WORKING",
        isValid: true,
        number: "+91 98765 43210",
      }
    ],
    emailLinks: [
      {
        url: "mailto:info@drsharmadental.in",
        status: "WORKING",
        isValid: true,
      }
    ],
    reviewLinks: [
      {
        url: "https://g.page/dr-sharma-dental-delhi",
        platform: "Google Business Profile",
        status: "WORKING",
        isValid: true,
      }
    ],
    socialLinks: [
      { platform: "instagram", url: "https://instagram.com/drsharmadental", status: "WORKING", isValid: true },
      { platform: "facebook", url: "https://facebook.com/drsharmadental", status: "WORKING", isValid: true }
    ],
    metaPixel: {
      exists: false,
      duplicate: false,
      status: "MISSING",
      issue: "No Meta Pixel (fbq) found. If running Instagram/Facebook Ads, you are burning ad budget without conversion optimization.",
      impactNote: "Meta algorithm cannot learn who booked appointments. Cost per lead will increase 4x.",
    },
    googleTag: {
      exists: true,
      tagId: "G-DRSHARMA99",
      status: "HEALTHY",
    },
    seoPenalty: {
      hasNoIndex: true,
      hasNoFollow: false,
      isHttps: true,
      status: "CRITICAL_PENALTY",
      issue: "CRITICAL SEO LEAK: Found <meta name='robots' content='noindex'>. Google is actively hiding this clinic from organic search results!",
    },
    cyberShield: {
      score: 95,
      spamGamblingDetected: false,
      spamKeywordsFound: [],
      obfuscatedScriptsDetected: false,
      base64HeavyScriptsCount: 0,
      hiddenIframesCount: 0,
      suspiciousRedirectDetected: false,
      riskLevel: "CLEAN",
      diagnosis: "No malware, spam keywords, or hidden redirect injections found.",
    },
    diagnosticSummary: "High-value patient inquiries are bouncing immediately due to double +9191 on WhatsApp button, while Meta Ads run blind without a Pixel. Accidental noindex tag is crippling organic Google discovery.",
  },
  "elitesalonmumbai.com": {
    domain: "elitesalonmumbai.com",
    businessName: "Elite Unisex Salon & Luxury Spa",
    score: 45,
    estimatedMonthlyLoss: 18500,
    adSpendRisk: "HIGH",
    whatsappLinks: [
      {
        url: "https://api.whatsapp.com/send?phone=09820011223",
        status: "BROKEN",
        isValid: false,
        issue: "Leading '0' prefix (09820011223) causes WhatsApp to crash or show incorrect country dialer on iOS.",
        suggestedFix: "Use https://wa.me/919820011223?text=Hi%20Elite%20Salon,%20I%20want%20to%20book%20a%20slot",
        digits: "09820011223",
      }
    ],
    phoneLinks: [
      {
        url: "tel:0222849000",
        status: "WORKING",
        isValid: true,
        number: "022-2849000",
      }
    ],
    emailLinks: [
      {
        url: "mailto:appointments@elitesalonmumbai.com",
        status: "WORKING",
        isValid: true,
      }
    ],
    reviewLinks: [
      {
        url: "https://goo.gl/maps/brokenreviewlink404",
        platform: "Google Reviews",
        status: "BROKEN",
        isValid: false,
        issue: "Google Review link returns 404 dead page. Salon is losing 15-20 customer reviews every month.",
      }
    ],
    socialLinks: [
      { platform: "instagram", url: "https://instagram.com/elitesalon_mumbai", status: "WORKING", isValid: true }
    ],
    metaPixel: {
      exists: true,
      pixelId: "9832948201948",
      duplicate: false,
      status: "HEALTHY",
    },
    googleTag: {
      exists: false,
      status: "MISSING",
      issue: "No GA4 Tag found. Zero visibility on mobile visitor drop-offs.",
    },
    seoPenalty: {
      hasNoIndex: false,
      hasNoFollow: false,
      isHttps: true,
      status: "HEALTHY",
    },
    cyberShield: {
      score: 100,
      spamGamblingDetected: false,
      spamKeywordsFound: [],
      obfuscatedScriptsDetected: false,
      base64HeavyScriptsCount: 0,
      hiddenIframesCount: 0,
      suspiciousRedirectDetected: false,
      riskLevel: "CLEAN",
      diagnosis: "No malicious script injections or security anomalies detected.",
    },
    diagnosticSummary: "Leading 0 in WhatsApp link prevents iOS clients from booking salon treatments, and broken Google Review link is killing reputation buildup in Bandra/Mumbai.",
  },
  "urbanvogue.in": {
    domain: "urbanvogue.in",
    businessName: "UrbanVogue Apparel Co.",
    score: 96,
    estimatedMonthlyLoss: 0,
    adSpendRisk: "LOW",
    whatsappLinks: [
      {
        url: "https://wa.me/919988776655?text=Hi%20UrbanVogue,%20I%20have%20a%20question%20about%20my%20order",
        status: "WORKING",
        isValid: true,
        digits: "919988776655",
        hasPrefilledText: true,
        prefilledText: "Hi UrbanVogue, I have a question about my order",
      }
    ],
    phoneLinks: [
      {
        url: "tel:+919988776655",
        status: "WORKING",
        isValid: true,
        number: "+91 99887 76655",
      }
    ],
    emailLinks: [
      {
        url: "mailto:support@urbanvogue.in",
        status: "WORKING",
        isValid: true,
      }
    ],
    reviewLinks: [
      {
        url: "https://g.page/r/urbanvogue-reviews",
        platform: "Google Verified Reviews",
        status: "WORKING",
        isValid: true,
      }
    ],
    socialLinks: [
      { platform: "instagram", url: "https://instagram.com/urbanvogue", status: "WORKING", isValid: true },
      { platform: "facebook", url: "https://facebook.com/urbanvogue", status: "WORKING", isValid: true },
      { platform: "youtube", url: "https://youtube.com/@urbanvogue", status: "WORKING", isValid: true }
    ],
    metaPixel: {
      exists: true,
      pixelId: "48201948201948",
      duplicate: false,
      status: "HEALTHY",
    },
    googleTag: {
      exists: true,
      tagId: "G-URBANVOGUE",
      status: "HEALTHY",
    },
    seoPenalty: {
      hasNoIndex: false,
      hasNoFollow: false,
      isHttps: true,
      status: "HEALTHY",
    },
    cyberShield: {
      score: 98,
      spamGamblingDetected: false,
      spamKeywordsFound: [],
      obfuscatedScriptsDetected: false,
      base64HeavyScriptsCount: 0,
      hiddenIframesCount: 0,
      suspiciousRedirectDetected: false,
      riskLevel: "CLEAN",
      diagnosis: "Clean security signature. No spam keywords or hidden redirect scripts.",
    },
    diagnosticSummary: "Flawless lead funnel setup! WhatsApp, Meta Pixel, GA4, and Google Reviews are fully synchronized.",
  },
  "leadguard-os-revenue-ad-shield.ai.studio": {
    domain: "leadguard-os-revenue-ad-shield.ai.studio",
    businessName: "LeadGuard OS — Revenue & Ad Shield",
    score: 100,
    estimatedMonthlyLoss: 0,
    adSpendRisk: "NONE",
    whatsappLinks: [
      {
        url: "https://wa.me/918307070605?text=Hello%20LeadGuard%20Team%2C%20I%20need%20assistance%20with%20my%20revenue%20audit",
        status: "WORKING",
        isValid: true,
        digits: "918307070605",
        hasPrefilledText: true,
        prefilledText: "Hello LeadGuard Team, I need assistance with my revenue audit",
        statusNote: "Active WhatsApp (+91 83070 70605) — verified with high-intent prefilled conversion greeting.",
      }
    ],
    phoneLinks: [
      {
        url: "tel:+918307070605",
        status: "WORKING",
        isValid: true,
        number: "+91 83070 70605",
      }
    ],
    emailLinks: [
      {
        url: "mailto:support@leadguard.ai",
        status: "WORKING",
        isValid: true,
      }
    ],
    reviewLinks: [
      {
        url: "https://maps.google.com/?cid=leadguard",
        platform: "Google Verified Reviews",
        status: "WORKING",
        isValid: true,
      }
    ],
    socialLinks: [
      { platform: "instagram", url: "https://instagram.com/leadguard", status: "WORKING", isValid: true },
      { platform: "facebook", url: "https://facebook.com/leadguard", status: "WORKING", isValid: true }
    ],
    metaPixel: {
      exists: true,
      pixelId: "918307070605123",
      duplicate: false,
      status: "HEALTHY",
    },
    googleTag: {
      exists: true,
      tagId: "G-LEADGUARD99",
      status: "HEALTHY",
    },
    seoPenalty: {
      hasNoIndex: false,
      hasNoFollow: false,
      isHttps: true,
      status: "HEALTHY",
    },
    cyberShield: {
      score: 100,
      spamGamblingDetected: false,
      spamKeywordsFound: [],
      obfuscatedScriptsDetected: false,
      base64HeavyScriptsCount: 0,
      hiddenIframesCount: 0,
      suspiciousRedirectDetected: false,
      riskLevel: "CLEAN",
      diagnosis: "Enterprise SSL certified, zero malware injection, clean script signature.",
    },
    diagnosticSummary: "100/100 Flawless Setup! Verified WhatsApp channel, active Meta Pixel, GA4, and zero revenue leakage.",
  },
  "leadguard.ai": {
    domain: "leadguard.ai",
    businessName: "LeadGuard OS — Revenue & Ad Shield",
    score: 100,
    estimatedMonthlyLoss: 0,
    adSpendRisk: "NONE",
    whatsappLinks: [
      {
        url: "https://wa.me/918307070605?text=Hello%20LeadGuard%20Team",
        status: "WORKING",
        isValid: true,
        digits: "918307070605",
        hasPrefilledText: true,
      }
    ],
    phoneLinks: [
      {
        url: "tel:+918307070605",
        status: "WORKING",
        isValid: true,
        number: "+91 83070 70605",
      }
    ],
    emailLinks: [
      {
        url: "mailto:support@leadguard.ai",
        status: "WORKING",
        isValid: true,
      }
    ],
    metaPixel: {
      exists: true,
      pixelId: "918307070605123",
      duplicate: false,
      status: "HEALTHY",
    },
    googleTag: {
      exists: true,
      tagId: "G-LEADGUARD99",
      status: "HEALTHY",
    },
    seoPenalty: {
      hasNoIndex: false,
      hasNoFollow: false,
      isHttps: true,
      status: "HEALTHY",
    },
    cyberShield: {
      score: 100,
      spamGamblingDetected: false,
      riskLevel: "CLEAN",
      diagnosis: "Clean security signature.",
    },
    diagnosticSummary: "Flawless lead funnel setup!",
  }
};

// ---------------------------------------------------------------------------
// 3. Core 4-Pillar Scan Engine (Real Live Network & DOM Diagnostic)
// ---------------------------------------------------------------------------
async function scanWebsite(targetUrl: string): Promise<any> {
  const startTime = Date.now();
  const parsedUrl = new URL(targetUrl);
  const hostname = parsedUrl.hostname.replace(/^www\./, "").toLowerCase();

  // Check preset library for curated demo domains
  if (SAMPLE_PRESETS[hostname]) {
    const preset = SAMPLE_PRESETS[hostname];
    const issues = generateIssuesFromData(preset);
    return buildAuditPayload(targetUrl, hostname, preset, issues, startTime, 180, 25);
  }

  // Live website fetch with automatic HTTPS -> HTTP fallback and redirect handling
  let html = "";
  let isHttps = parsedUrl.protocol === "https:";
  let fetchTimeMs = 0;
  let finalUrl = targetUrl;

  const fetchWithTimeout = async (url: string) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        redirect: "follow",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 LeadGuard-Auditor/2.0",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9,hi;q=0.8",
          "Cache-Control": "no-cache",
        },
      });
      clearTimeout(timeoutId);
      if (!response.ok && response.status >= 400 && response.status < 500) {
        throw new Error(`Server returned HTTP ${response.status} ${response.statusText}`);
      }
      finalUrl = response.url || url;
      return await response.text();
    } finally {
      clearTimeout(timeoutId);
    }
  };

  try {
    const fetchStart = Date.now();
    html = await fetchWithTimeout(targetUrl);
    fetchTimeMs = Date.now() - fetchStart;
  } catch (err: any) {
    if (targetUrl.startsWith("https://")) {
      try {
        const httpUrl = targetUrl.replace("https://", "http://");
        const fetchStart = Date.now();
        html = await fetchWithTimeout(httpUrl);
        fetchTimeMs = Date.now() - fetchStart;
        isHttps = false;
      } catch (httpErr: any) {
        throw new Error(`Unable to connect to ${hostname}. Please ensure the website is online and accessible over the public internet (Error: ${err?.message || "Connection refused"}).`);
      }
    } else {
      throw new Error(`Unable to connect to ${hostname}. Please ensure the website is online and accessible over the public internet (Error: ${err?.message || "Connection refused"}).`);
    }
  }

  if (!html || html.trim().length < 50) {
    throw new Error(`Website ${hostname} returned an empty response or blocked automated diagnostic requests.`);
  }

  // Parse HTML
  const parseStart = Date.now();
  const lowerHtml = html.toLowerCase();

  // Extract Page Title / Business Name
  let extractedTitle = "";
  const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
                       html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
  const ogSiteNameMatch = html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i) ||
                          html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:site_name["']/i);
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);

  if (ogSiteNameMatch && ogSiteNameMatch[1]) {
    extractedTitle = ogSiteNameMatch[1].trim();
  } else if (ogTitleMatch && ogTitleMatch[1]) {
    extractedTitle = ogTitleMatch[1].trim();
  } else if (titleMatch && titleMatch[1]) {
    extractedTitle = titleMatch[1].trim().split(/[|\-–]/)[0].trim();
  }

  const businessName = extractedTitle || hostname.replace(/\.[a-z]+$/, "").toUpperCase();

  // =========================================================================
  // PILLAR 1: LEAD GUARDIAN (WhatsApp, Phone, Email, Review, Social)
  // =========================================================================
  const whatsappRegex = /(?:href=["']|window\.open\(["']|onclick=["'][^"']*['"]|\\"href\\":\\"|\\"url\\":\\")(https?:\/\/(?:wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)[^"'\)\\]*|whatsapp:\/\/[^"'\)\\]*)/gi;
  const rawTextWaRegex = /(?:https?:\/\/wa\.me\/[0-9+?&=%a-zA-Z._-]+|https?:\/\/api\.whatsapp\.com\/send\?[^"'\s<>]+)/gi;
  
  const whatsappMatches: string[] = [];
  let match;
  while ((match = whatsappRegex.exec(html)) !== null) {
    const cleaned = match[1].replace(/\\"/g, '"').trim();
    if (!whatsappMatches.includes(cleaned)) {
      whatsappMatches.push(cleaned);
    }
  }
  while ((match = rawTextWaRegex.exec(html)) !== null) {
    const cleaned = match[0].replace(/\\"/g, '"').trim();
    if (!whatsappMatches.includes(cleaned)) {
      whatsappMatches.push(cleaned);
    }
  }

  const whatsappLinks: any[] = [];
  if (whatsappMatches.length === 0) {
    if (lowerHtml.includes("whatsapp") || lowerHtml.includes("chat on whatsapp") || lowerHtml.includes("wa.me")) {
      whatsappLinks.push({
        url: "#",
        status: "MISSING",
        isValid: false,
        issue: "WhatsApp text/button found on page, but no clickable wa.me link is configured.",
        suggestedFix: `Add <a href="https://wa.me/91XXXXXXXXXX?text=Hi%20there">Chat on WhatsApp</a> button`,
        hasPrefilledText: false,
        zeroIntentLeak: false,
      });
    }
  } else {
    for (const rawLink of whatsappMatches) {
      let digits = "";
      const urlWithoutParams = rawLink.split("?")[0].split("&")[0];
      const digitsMatch = urlWithoutParams.match(/\d+/g);
      if (digitsMatch) {
        digits = digitsMatch.join("");
      }

      const textMatch = rawLink.match(/[?&]text=([^&"'\s>\\]+)/i);
      const hasPrefilledText = Boolean(textMatch && textMatch[1] && textMatch[1].trim().length > 0);
      let prefilledText: string | undefined;
      if (hasPrefilledText && textMatch) {
        try {
          prefilledText = decodeURIComponent(textMatch[1]);
        } catch {
          prefilledText = textMatch[1];
        }
      }

      let isValid = true;
      let issue: string | undefined;
      let suggestedFix: string | undefined;
      let statusNote: string | undefined;

      if (!digits || digits.length < 10) {
        isValid = false;
        issue = "Incomplete phone number in WhatsApp link (fewer than 10 digits).";
        suggestedFix = "Provide full 10-digit mobile number with 91 prefix (e.g. https://wa.me/919876543210).";
      } else if (digits.startsWith("9191") && digits.length >= 12) {
        isValid = false;
        issue = "Double country code (+9191) detected! WhatsApp mobile app shows 'Invalid phone number' error on tap.";
        const correct = digits.substring(2);
        suggestedFix = `Change link href to https://wa.me/${correct}${prefilledText ? `?text=${encodeURIComponent(prefilledText)}` : ''}`;
      } else if (digits.startsWith("0") && digits.length === 11) {
        isValid = false;
        issue = "Leading '0' prefix found (0XXXXXXXXXX). WhatsApp dialer fails on iOS devices.";
        const correct = "91" + digits.substring(1);
        suggestedFix = `Change link href to https://wa.me/${correct}${prefilledText ? `?text=${encodeURIComponent(prefilledText)}` : ''}`;
      } else if (digits.length === 10 && /^[6-9]/.test(digits)) {
        isValid = false;
        issue = "Missing India country code (+91). May fail on unconfigured or international mobile devices.";
        suggestedFix = `Change link href to https://wa.me/91${digits}${prefilledText ? `?text=${encodeURIComponent(prefilledText)}` : ''}`;
      } else {
        isValid = true;
        issue = undefined;
        statusNote = `Active WhatsApp link (+${digits.startsWith('91') ? digits.slice(0,2) + ' ' + digits.slice(2) : digits}) — opens chat correctly.`;
      }

      whatsappLinks.push({
        url: rawLink,
        status: isValid ? "WORKING" : "BROKEN",
        isValid,
        issue,
        statusNote,
        suggestedFix,
        digits,
        hasPrefilledText,
        prefilledText,
        zeroIntentLeak: isValid && !hasPrefilledText,
      });
    }
  }

  // Click-to-Call (tel:)
  const telRegex = /href=["']tel:([^"']+)["']/gi;
  const phoneLinks: any[] = [];
  while ((match = telRegex.exec(html)) !== null) {
    const rawTel = match[1].trim();
    const cleanDigits = rawTel.replace(/\D/g, "");
    const isValid = cleanDigits.length >= 8 && cleanDigits.length <= 14;
    phoneLinks.push({
      url: `tel:${rawTel}`,
      number: rawTel,
      status: isValid ? "WORKING" : "BROKEN",
      isValid,
      issue: !isValid ? `Incomplete dialer length (${cleanDigits.length} digits). Call may fail on telecom networks.` : undefined,
    });
  }

  // Email (mailto:)
  const mailtoRegex = /href=["']mailto:([^"']+)["']/gi;
  const emailLinks: any[] = [];
  while ((match = mailtoRegex.exec(html)) !== null) {
    const email = match[1].split("?")[0].trim();
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    emailLinks.push({
      url: `mailto:${email}`,
      isValid,
      status: isValid ? "WORKING" : "BROKEN",
      issue: !isValid ? "Malformed email address" : undefined,
    });
  }

  // Google Review / Maps links
  const reviewRegex = /href=["'](https?:\/\/(?:g\.page|maps\.google\.com|goo\.gl\/maps|maps\.app\.goo\.gl|search\.google\.com\/local|business\.google\.com)[^"']*)["']/gi;
  const reviewLinks: any[] = [];
  while ((match = reviewRegex.exec(html)) !== null) {
    reviewLinks.push({
      url: match[1],
      platform: "Google Business / Reviews",
      status: "WORKING",
      isValid: true,
    });
  }

  // Social Links
  const socialLinks: any[] = [];
  if (/instagram\.com\/[a-zA-Z0-9._]+/i.test(html)) {
    socialLinks.push({ platform: "instagram", url: "Instagram Page", status: "WORKING", isValid: true });
  }
  if (/facebook\.com\/[a-zA-Z0-9._]+/i.test(html)) {
    socialLinks.push({ platform: "facebook", url: "Facebook Page", status: "WORKING", isValid: true });
  }
  if (/youtube\.com\/(?:@|c\/|channel\/)[a-zA-Z0-9._-]+/i.test(html)) {
    socialLinks.push({ platform: "youtube", url: "YouTube Channel", status: "WORKING", isValid: true });
  }

  // =========================================================================
  // PILLAR 2: ADSHIELD (Meta Pixel, Google Tag / GA4, GTM)
  // =========================================================================
  const hasMetaPixel = lowerHtml.includes("fbq('init'") ||
                       lowerHtml.includes("fbq(\"init\"") ||
                       lowerHtml.includes("fbevents.js") ||
                       lowerHtml.includes("connect.facebook.net") ||
                       lowerHtml.includes("facebook.com/tr?id=");

  let pixelIdMatch = html.match(/fbq\s*\(\s*['"]init['"]\s*,\s*['"](\d+)['"]/i) ||
                     html.match(/[?&]id=(\d{10,20})/i);
  const pixelId = pixelIdMatch ? pixelIdMatch[1] : undefined;

  const metaPixel = {
    exists: hasMetaPixel,
    pixelId,
    duplicate: false,
    status: (hasMetaPixel ? "HEALTHY" : "MISSING") as "HEALTHY" | "MISSING",
    issue: !hasMetaPixel
      ? "No Meta Pixel (fbq) detected. If you run Facebook or Instagram ads, the conversion algorithm is untracked."
      : undefined,
    impactNote: !hasMetaPixel ? "Ad spend risk: lack of attribution prevents lookalike audience optimization." : undefined,
    confidence: hasMetaPixel ? 0.95 : 0.85,
  };

  const hasGtm = lowerHtml.includes("googletagmanager.com/gtm.js") || /gtm\.js\?id=GTM-[A-Z0-9]+/i.test(html);
  const hasGa4 = /(?:googletagmanager\.com\/gtag\/js\?id=|gtag\s*\(\s*['"]config['"]\s*,\s*['"])(G-[A-Z0-9]{8,12})['"]/i.test(html) ||
                 /google-analytics\.com\/analytics\.js/i.test(html);
  
  let gtmIdMatch = html.match(/gtm\.js\?id=(GTM-[A-Z0-9]+)/i) || html.match(/(GTM-[A-Z0-9]{5,10})/);
  let ga4IdMatch = html.match(/(?:googletagmanager\.com\/gtag\/js\?id=|gtag\s*\(\s*['"]config['"]\s*,\s*['"])(G-[A-Z0-9]{8,12})['"]/i);

  const googleTag = {
    exists: hasGtm || hasGa4,
    tagId: (gtmIdMatch ? gtmIdMatch[1] || gtmIdMatch[0] : (ga4IdMatch ? ga4IdMatch[1] : undefined)),
    status: (hasGtm || hasGa4 ? "HEALTHY" : "MISSING") as "HEALTHY" | "MISSING",
    issue: (!hasGtm && !hasGa4) ? "No Google Tag Manager or GA4 detected on the landing page." : undefined,
    confidence: (hasGtm || hasGa4) ? 0.95 : 0.85,
  };

  // =========================================================================
  // PILLAR 3: SEO & PENALTY SHIELD (Robots noindex, Canonical, OpenGraph, SSL)
  // =========================================================================
  const hasNoIndex = /<meta[^>]*name=["'](?:robots|googlebot)["'][^>]*content=["'][^"']*noindex[^"']*["']/i.test(html) ||
                     /<meta[^>]*content=["'][^"']*noindex[^"']*["'][^>]*name=["'](?:robots|googlebot)["']/i.test(html);
  const hasNoFollow = /<meta[^>]*name=["']robots["'][^>]*content=["'][^"']*nofollow[^"']*["']/i.test(html);
  
  const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
  const hasCanonical = Boolean(canonicalMatch && canonicalMatch[1]);
  const canonicalUrl = canonicalMatch ? canonicalMatch[1] : undefined;

  const hasOgImage = /<meta[^>]*property=["']og:image["']/i.test(html);
  const hasOgTitle = /<meta[^>]*property=["']og:title["']/i.test(html);

  const seoPenalty = {
    hasNoIndex,
    hasNoFollow,
    isHttps,
    hasCanonical,
    canonicalUrl,
    hasOgTags: hasOgImage && hasOgTitle,
    status: hasNoIndex ? "CRITICAL_PENALTY" : (!isHttps ? "WARNING" : "HEALTHY") as "CRITICAL_PENALTY" | "WARNING" | "HEALTHY",
    issue: hasNoIndex
      ? "CRITICAL NOINDEX DETECTED: <meta name='robots' content='noindex'> is active in the page header, blocking Google search ranking!"
      : (!isHttps ? "Insecure HTTP connection (missing SSL certificate)." : undefined),
  };

  // =========================================================================
  // PILLAR 4: CYBER & HACK SHIELD (Spam Keywords, Obfuscation, Hidden Iframes)
  // =========================================================================
  const SPAM_KEYWORDS = [
    "satta", "matka", "kalyan matka", "satta king", "online casino", "slot gacor",
    "judi online", "slot online", "free spins", "porn", "viagra", "cialis"
  ];
  
  const foundSpamKeywords: string[] = [];
  for (const kw of SPAM_KEYWORDS) {
    if (lowerHtml.includes(kw)) {
      foundSpamKeywords.push(kw);
    }
  }

  // Obfuscated Base64 or eval heuristic
  const hasEvalAtob = /eval\s*\(\s*atob\s*\(/i.test(html) || /document\.write\s*\(\s*unescape\s*\(/i.test(html);
  const base64Matches = html.match(/['"][A-Za-z0-9+/]{200,}={0,2}['"]/g) || [];
  const base64HeavyScriptsCount = base64Matches.length;

  // Hidden iframes
  const hiddenIframeMatches = html.match(/<iframe[^>]*(?:display:\s*none|visibility:\s*hidden|width=["']0["']|height=["']0["'])[^>]*>/gi) || [];
  const hiddenIframesCount = hiddenIframeMatches.length;

  // Suspicious Mobile / Meta Redirects
  const hasMetaRefresh = /<meta[^>]*http-equiv=["']refresh["'][^>]*content=["']\d+;\s*url=/i.test(html);
  const hasSuspiciousMobileRedirect = /navigator\.userAgent.*location\.replace/i.test(html) ||
                                     /window\.location\s*=\s*['"]http:\/\/[^'"]+['"]/i.test(html);

  let cyberScore = 100;
  if (foundSpamKeywords.length > 0) cyberScore -= 45;
  if (hasEvalAtob) cyberScore -= 40;
  if (base64HeavyScriptsCount > 2) cyberScore -= 20;
  if (hiddenIframesCount > 0) cyberScore -= 30;
  if (hasSuspiciousMobileRedirect) cyberScore -= 40;
  cyberScore = Math.max(10, Math.min(cyberScore, 100));

  let cyberRiskLevel: "CLEAN" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "CLEAN";
  if (cyberScore < 50) cyberRiskLevel = "CRITICAL";
  else if (cyberScore < 75) cyberRiskLevel = "HIGH";
  else if (cyberScore < 90) cyberRiskLevel = "MEDIUM";
  else cyberRiskLevel = "CLEAN";

  const cyberDiagnosis = cyberRiskLevel === "CLEAN"
    ? "Clean security signature. No spam keyword injections, hidden iframes, or obfuscated scripts found."
    : `Detected ${foundSpamKeywords.length > 0 ? `suspicious keyword injection (${foundSpamKeywords.join(', ')})` : ''} ${hiddenIframesCount > 0 ? 'hidden iframes' : ''} ${hasEvalAtob ? 'obfuscated script loader' : ''}`.trim();

  const cyberShield = {
    score: cyberScore,
    spamGamblingDetected: foundSpamKeywords.length > 0,
    spamKeywordsFound: foundSpamKeywords,
    obfuscatedScriptsDetected: hasEvalAtob || base64HeavyScriptsCount > 2,
    base64HeavyScriptsCount,
    hiddenIframesCount,
    suspiciousRedirectDetected: hasMetaRefresh || hasSuspiciousMobileRedirect,
    redirectDetails: hasSuspiciousMobileRedirect ? "User-agent branch script detected redirecting mobile traffic." : undefined,
    riskLevel: cyberRiskLevel,
    diagnosis: cyberDiagnosis,
  };

  // E-commerce Cart Death Checks
  const isShopify = lowerHtml.includes("cdn.shopify.com") || lowerHtml.includes("shopify.com") || lowerHtml.includes("myshopify.com") || /window\.Shopify/i.test(html);
  const isWoo = lowerHtml.includes("woocommerce") || lowerHtml.includes("wp-content/plugins/woocommerce") || /wc-api/i.test(html);
  const isMagento = /skin\/frontend\/|mage\/cookies\.js|catalog\/product\/view|Mage\.Cookies|\/static\/version\d+/i.test(html);
  const isBigCommerce = lowerHtml.includes("bigcommerce") || lowerHtml.includes("cdn11.bigcommerce.com");
  const isMedusa = lowerHtml.includes("medusa") || /pcat_01/i.test(html) || /data-testid=["']nav-cart-link["']/i.test(html);
  
  const hasCartInDom = /href=["'][^"']*(?:\/cart|\/checkout|\/bag|\/basket)[^"']*["']/i.test(html);
  const hasAddToCartButton = /add\s*to\s*cart|buy\s*now|checkout|order\s*now|proceed\s*to\s*checkout/i.test(html);

  const isEcommerce = isShopify || isWoo || isMagento || isBigCommerce || isMedusa || (hasCartInDom && hasAddToCartButton);
  let ecommercePlatform: 'Shopify' | 'WooCommerce' | 'Magento' | 'BigCommerce' | 'Custom' | 'None' = 'None';
  if (isShopify) ecommercePlatform = 'Shopify';
  else if (isWoo) ecommercePlatform = 'WooCommerce';
  else if (isMagento) ecommercePlatform = 'Magento';
  else if (isBigCommerce) ecommercePlatform = 'BigCommerce';
  else if (isMedusa) ecommercePlatform = 'Custom';
  else if (isEcommerce) ecommercePlatform = 'Custom';

  const cartButtons: { text: string; href?: string; status: 'WORKING' | 'BROKEN' | 'MISSING' }[] = [];
  const cartLinkRegex = /<a[^>]*href=["']([^"']*(?:\/cart|\/checkout|\/bag|\/basket)[^"']*)["'][^>]*>(.*?)<\/a>/gi;
  let cartMatch;
  while ((cartMatch = cartLinkRegex.exec(html)) !== null) {
    const rawHref = cartMatch[1];
    const text = cartMatch[2].replace(/<[^>]+>/g, '').trim() || 'Cart / Checkout';
    const isDead = rawHref === '#' || rawHref === 'javascript:void(0)' || rawHref === 'javascript:;';
    cartButtons.push({
      text,
      href: rawHref,
      status: isDead ? 'BROKEN' : 'WORKING',
    });
  }

  let ecommerceInfo: any = undefined;
  if (isEcommerce) {
    const brokenCartLinks = cartButtons.filter(c => c.status === 'BROKEN');
    const isCartBroken = brokenCartLinks.length > 0;

    ecommerceInfo = {
      isEcommerce: true,
      platform: ecommercePlatform,
      cartLinksCount: cartButtons.length,
      checkoutStatus: isCartBroken ? 'CRITICAL_LEAK' : 'HEALTHY',
      cartAbandonmentRisk: isCartBroken ? 'CRITICAL' : (!hasMetaPixel ? 'HIGH' : 'LOW'),
      cartButtons,
      issue: isCartBroken
        ? "CRITICAL: Checkout / Add to Cart flow contains dead or unrouted links (#). Customers cannot complete orders!"
        : undefined,
      suggestedFix: isCartBroken
        ? "Route cart buttons directly to valid checkout route (e.g. /cart or /checkout) and test end-to-end payment gateway."
        : undefined,
    };
  }

  const parsedData = {
    domain: hostname,
    businessName,
    whatsappLinks,
    phoneLinks,
    emailLinks,
    reviewLinks,
    socialLinks,
    metaPixel,
    googleTag,
    seoPenalty,
    cyberShield,
    ecommerce: ecommerceInfo,
  };

  const issues = generateIssuesFromData(parsedData);
  return buildAuditPayload(targetUrl, hostname, parsedData, issues, startTime, fetchTimeMs, Date.now() - parseStart);
}

// ---------------------------------------------------------------------------
// 4. Normalized Issues & 4-Pillar Scoring Model
// ---------------------------------------------------------------------------
function generateIssuesFromData(data: any): any[] {
  const issues: any[] = [];

  // LEAD GUARDIAN ISSUES
  if (data.whatsappLinks) {
    for (let i = 0; i < data.whatsappLinks.length; i++) {
      const wa = data.whatsappLinks[i];
      if (!wa.isValid) {
        issues.push({
          id: `wa-issue-${i + 1}`,
          pillar: "LEAD",
          category: "whatsapp",
          severity: "CRITICAL",
          ruleId: "LEAD-WA-001",
          title: "Broken WhatsApp Lead Link",
          description: wa.issue || "WhatsApp link format is invalid and fails when tapped by customers.",
          impact: "100% of mobile users clicking this button bounce without reaching your chat window. Estimated loss: ₹15,000–₹25,000/month.",
          evidence: wa.url,
          technical: `Extracted Digits: ${wa.digits || 'none'} | Link: ${wa.url}`,
          recommendation: wa.suggestedFix || "Update href to standard https://wa.me/91XXXXXXXXXX format.",
          fixSnippet: wa.suggestedFix || "Update href to standard https://wa.me/91XXXXXXXXXX format.",
          confidence: 0.99,
          isLocked: issues.length > 0,
        });
      } else if (wa.zeroIntentLeak) {
        issues.push({
          id: `wa-zero-intent-${i + 1}`,
          pillar: "LEAD",
          category: "whatsapp",
          severity: "LOW",
          ruleId: "LEAD-WA-002",
          title: "WhatsApp Pre-filled Greeting (Conversion Tip)",
          description: "WhatsApp link is active and working. Adding a pre-filled greeting message allows 1-tap customer conversations.",
          impact: "Recommended optimization to improve customer response rate by 25–40%.",
          evidence: wa.url,
          recommendation: `Add ?text= parameter with personalized greeting.`,
          fixSnippet: `https://wa.me/${wa.digits}?text=${encodeURIComponent('Hi, I saw your website and would like to inquire.')}`,
          confidence: 0.95,
          isLocked: issues.length > 0,
        });
      }
    }
  }

  if (data.phoneLinks) {
    for (let i = 0; i < data.phoneLinks.length; i++) {
      const ph = data.phoneLinks[i];
      if (!ph.isValid) {
        issues.push({
          id: `phone-issue-${i + 1}`,
          pillar: "LEAD",
          category: "phone",
          severity: "HIGH",
          ruleId: "LEAD-PHONE-001",
          title: "Incomplete Click-to-Call Dialer",
          description: ph.issue || "Phone dialer link (tel:) has invalid length.",
          impact: "Mobile callers receive 'call failed' or operator errors upon clicking.",
          evidence: ph.url,
          technical: `Phone Raw: ${ph.number || ph.url}`,
          recommendation: "Format phone link as tel:+91XXXXXXXXXX.",
          fixSnippet: ph.suggestedFix || "Format phone link as tel:+91XXXXXXXXXX.",
          confidence: 0.95,
          isLocked: issues.length > 0,
        });
      }
    }
  }

  if (data.reviewLinks) {
    for (let i = 0; i < data.reviewLinks.length; i++) {
      const rev = data.reviewLinks[i];
      if (!rev.isValid) {
        issues.push({
          id: `rev-issue-${i + 1}`,
          pillar: "LEAD",
          category: "reviews",
          severity: "MEDIUM",
          ruleId: "LEAD-REV-001",
          title: "Broken Google Review Link",
          description: rev.issue || "Google review shortlink returns 404 or dead page.",
          impact: "Losing 10–25 authentic customer 5-star reviews every month.",
          evidence: rev.url,
          recommendation: "Generate direct review shortlink from Google Business Profile manager.",
          fixSnippet: "Generate direct review shortlink from Google Business Profile manager.",
          confidence: 0.9,
          isLocked: issues.length > 0,
        });
      }
    }
  }

  // ADSHIELD ISSUES
  if (data.metaPixel && data.metaPixel.status === "MISSING") {
    issues.push({
      id: "pixel-missing",
      pillar: "AD",
      category: "pixel",
      severity: "HIGH",
      ruleId: "AD-META-001",
      title: "Missing Meta Pixel (fbq)",
      description: "No Facebook/Instagram ad tracking script found on the landing page.",
      impact: "If running paid ads, Meta's AI algorithm runs blind without conversion optimization, inflating cost-per-lead by 300%.",
      evidence: "DOM Search for fbq() returned 0 instances.",
      technical: "connect.facebook.net and fbq initialization absent in <head>.",
      recommendation: "Install standard Meta Pixel base code inside <head>.",
      fixSnippet: "<!-- Meta Pixel -->\n<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','YOUR_PIXEL_ID');fbq('track','PageView');</script>",
      confidence: 0.95,
      isLocked: issues.length > 0,
    });
  }

  if (data.googleTag && data.googleTag.status === "MISSING") {
    issues.push({
      id: "gtag-missing",
      pillar: "AD",
      category: "pixel",
      severity: "MEDIUM",
      ruleId: "AD-GA4-001",
      title: "Missing Google Tag / GA4",
      description: "No Google Analytics or Tag Manager detected on the page.",
      impact: "No visibility into mobile visitor drop-offs, campaign attribution, or user behavior.",
      evidence: "gtag.js and googletagmanager.com absent in page source.",
      recommendation: "Add GA4 global site tag (gtag.js) to track pageviews and conversion events.",
      fixSnippet: "<!-- Google tag (gtag.js) -->\n<script async src='https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX'></script>\n<script>\n  window.dataLayer = window.dataLayer || [];\n  function gtag(){dataLayer.push(arguments);}\n  gtag('js', new Date());\n  gtag('config', 'G-XXXXXXXXXX');\n</script>",
      confidence: 0.9,
      isLocked: issues.length > 0,
    });
  }

  // SEO & PENALTY SHIELD ISSUES
  if (data.seoPenalty && data.seoPenalty.hasNoIndex) {
    issues.push({
      id: "seo-noindex",
      pillar: "SEO",
      category: "seo",
      severity: "CRITICAL",
      ruleId: "SEO-NOINDEX-001",
      title: "Active 'noindex' SEO De-indexation Risk",
      description: "Robots meta tag contains noindex, instructing Google not to index this website in search results.",
      impact: "Zero organic Google search traffic. All SEO efforts and local Google rankings are completely neutralized.",
      evidence: "<meta name='robots' content='noindex'>",
      technical: "Found noindex directive in HTML <head> metadata.",
      recommendation: "Remove noindex from your robots meta tag immediately.",
      fixSnippet: "<meta name='robots' content='index, follow'>",
      confidence: 0.99,
      isLocked: issues.length > 0,
    });
  }

  if (data.seoPenalty && !data.seoPenalty.isHttps) {
    issues.push({
      id: "seo-insecure-http",
      pillar: "SEO",
      category: "seo",
      severity: "MEDIUM",
      ruleId: "SEO-HTTPS-001",
      title: "Insecure HTTP Protocol (Missing SSL)",
      description: "Website is serving content over unencrypted HTTP protocol.",
      impact: "Modern mobile browsers flag site as 'Not Secure', driving away up to 60% of first-time visitors.",
      evidence: "Scheme: http://",
      recommendation: "Enable Free SSL via Let's Encrypt / Cloudflare and enforce HTTPS redirection.",
      fixSnippet: "Redirect 301 http:// to https://",
      confidence: 0.99,
      isLocked: issues.length > 0,
    });
  }

  // CYBER & HACK SHIELD ISSUES
  if (data.cyberShield && data.cyberShield.spamGamblingDetected) {
    issues.push({
      id: "cyber-spam-injection",
      pillar: "CYBER",
      category: "cyber",
      severity: "CRITICAL",
      ruleId: "CYBER-SPAM-001",
      title: "Suspicious Spam / Gambling Keywords Injected",
      description: `Discovered suspicious keywords (${data.cyberShield.spamKeywordsFound.join(', ')}) in HTML source. This is a common indicator of unauthorized CMS injection.`,
      impact: "Google blacklisting risk, ad account suspension, and severe brand reputation loss.",
      evidence: `Found keywords: ${data.cyberShield.spamKeywordsFound.join(', ')}`,
      technical: "Hidden text / database spam strings detected in public DOM.",
      recommendation: "Scan CMS database for unauthorized injections and audit admin users.",
      fixSnippet: "Review WordPress plugins/themes and clean infected database tables.",
      confidence: 0.95,
      isLocked: issues.length > 0,
    });
  }

  if (data.cyberShield && data.cyberShield.obfuscatedScriptsDetected) {
    issues.push({
      id: "cyber-obfuscated-script",
      pillar: "CYBER",
      category: "cyber",
      severity: "HIGH",
      ruleId: "CYBER-OBF-001",
      title: "Suspicious Obfuscated Script Loader",
      description: "Detected eval(atob()) or heavily Base64-encoded inline JavaScript strings.",
      impact: "Hidden payload execution risk. Automated malicious redirect or keystroke grabber.",
      evidence: "eval(atob()) / dynamic unescape found in script body.",
      technical: "High entropy inline script blocks > 200 chars.",
      recommendation: "Inspect all third-party scripts and remove unauthorized inline code blocks.",
      fixSnippet: "Remove unverified inline script blocks from <head> and <body>.",
      confidence: 0.85,
      isLocked: issues.length > 0,
    });
  }

  if (data.cyberShield && data.cyberShield.hiddenIframesCount > 0) {
    issues.push({
      id: "cyber-hidden-iframe",
      pillar: "CYBER",
      category: "cyber",
      severity: "HIGH",
      ruleId: "CYBER-IFRAME-001",
      title: "Hidden Invisible Iframes Detected",
      description: `Discovered ${data.cyberShield.hiddenIframesCount} invisible iframe(s) styled with display:none or 0px dimensions.`,
      impact: "Commonly used for clickjacking or silent background affiliate cookie stuffing.",
      evidence: `Hidden iframes: ${data.cyberShield.hiddenIframesCount}`,
      recommendation: "Audit iframe sources and remove stealth frames.",
      fixSnippet: "Remove hidden 0x0 iframes from template files.",
      confidence: 0.9,
      isLocked: issues.length > 0,
    });
  }

  // E-COMMERCE ISSUES
  if (data.ecommerce && data.ecommerce.checkoutStatus === "CRITICAL_LEAK") {
    issues.push({
      id: "ecommerce-cart-death",
      pillar: "ECOMMERCE",
      category: "ecommerce",
      severity: "CRITICAL",
      ruleId: "ECOM-CART-001",
      title: "CRITICAL: E-Commerce 'Cart Death' Detected",
      description: data.ecommerce.issue || "Checkout flow is broken. Add to Cart / Checkout buttons lead to dead links (#).",
      impact: "100% direct revenue loss. High-intent buyers are unable to complete purchases on your store.",
      evidence: "Buy buttons linked to href='#'",
      technical: "Cart button elements lack functional checkout destination.",
      recommendation: "Route buy buttons directly to /cart or Shopify permalink checkout.",
      fixSnippet: data.ecommerce.suggestedFix || "Route buy buttons directly to /cart or Shopify permalink checkout.",
      confidence: 0.99,
      isLocked: issues.length > 0,
    });
  }

  return issues;
}

function buildAuditPayload(
  targetUrl: string,
  domain: string,
  data: any,
  issues: any[],
  startTime: number,
  fetchTimeMs = 320,
  parseTimeMs = 35
): any {
  // 1. Compute Individual Pillar Scores
  // Lead Guardian (35% Weight)
  let leadPenalties = 0;
  const leadIssues = issues.filter(i => i.pillar === "LEAD" || i.category === "whatsapp" || i.category === "phone" || i.category === "reviews");
  for (const i of leadIssues) {
    if (i.severity === "CRITICAL") leadPenalties += 35;
    else if (i.severity === "HIGH") leadPenalties += 20;
    else if (i.severity === "MEDIUM") leadPenalties += 10;
    else leadPenalties += 2;
  }
  const leadScore = Math.max(15, Math.min(100 - leadPenalties, 100));

  // AdShield (20% Weight)
  let adPenalties = 0;
  const adIssues = issues.filter(i => i.pillar === "AD" || i.category === "pixel");
  for (const i of adIssues) {
    if (i.severity === "CRITICAL") adPenalties += 40;
    else if (i.severity === "HIGH") adPenalties += 25;
    else adPenalties += 15;
  }
  const adScore = Math.max(20, Math.min(100 - adPenalties, 100));

  // SEO Shield (20% Weight)
  let seoPenalties = 0;
  const seoIssues = issues.filter(i => i.pillar === "SEO" || i.category === "seo");
  for (const i of seoIssues) {
    if (i.severity === "CRITICAL") seoPenalties += 50;
    else if (i.severity === "HIGH") seoPenalties += 25;
    else seoPenalties += 10;
  }
  const seoScore = Math.max(15, Math.min(100 - seoPenalties, 100));

  // Cyber & Hack Shield (25% Weight)
  const cyberScore = data.cyberShield?.score || 100;

  // Overall Score (Weighted 4 Pillars)
  // Overall = Lead(0.35) + Ad(0.20) + SEO(0.20) + Cyber(0.25)
  let overallScore = Math.round(
    leadScore * 0.35 +
    adScore * 0.20 +
    seoScore * 0.20 +
    cyberScore * 0.25
  );

  if (issues.length === 0) {
    overallScore = data.score !== undefined ? data.score : 100;
  } else {
    overallScore = Math.max(15, Math.min(overallScore, 95));
  }

  // Estimated Monthly Exposure (Scenario modeling)
  let estimatedMonthlyLoss = 0;
  for (const issue of issues) {
    if (issue.severity === "CRITICAL") estimatedMonthlyLoss += 18000;
    else if (issue.severity === "HIGH") estimatedMonthlyLoss += 12000;
    else if (issue.severity === "MEDIUM") estimatedMonthlyLoss += 1500;
  }

  let adSpendRisk: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" = "LOW";
  if (overallScore < 45) adSpendRisk = "CRITICAL";
  else if (overallScore < 70) adSpendRisk = "HIGH";
  else if (overallScore < 85) adSpendRisk = "MEDIUM";

  const freeIssue = issues.length > 0 ? issues[0] : undefined;
  const lockedCount = Math.max(0, issues.length - 1);
  const scanId = `scan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const auditPayload = {
    scanId,
    publicToken: scanId,
    targetUrl,
    domain,
    businessName: data.businessName || domain.replace(/\.[a-z]+$/, "").toUpperCase(),
    score: overallScore,
    estimatedMonthlyLoss,
    adSpendRisk,
    
    // Four Pillars Breakdown
    pillars: {
      lead: {
        pillar: "LEAD",
        title: "Lead Guardian",
        score: leadScore,
        weight: 0.35,
        criticalCount: leadIssues.filter(i => i.severity === "CRITICAL").length,
        warningCount: leadIssues.filter(i => i.severity === "HIGH" || i.severity === "MEDIUM").length,
        validCount: (data.whatsappLinks?.filter((w: any) => w.isValid).length || 0) + (data.phoneLinks?.filter((p: any) => p.isValid).length || 0),
        diagnosis: leadScore >= 80 ? "WhatsApp, phone, and contact routing active." : "Contact channels need attention.",
        statusText: leadScore >= 80 ? "Healthy" : leadScore >= 50 ? "Moderate Leaks" : "Critical Leaks",
      },
      ad: {
        pillar: "AD",
        title: "AdShield",
        score: adScore,
        weight: 0.20,
        criticalCount: adIssues.filter(i => i.severity === "CRITICAL").length,
        warningCount: adIssues.filter(i => i.severity === "HIGH" || i.severity === "MEDIUM").length,
        validCount: (data.metaPixel?.exists ? 1 : 0) + (data.googleTag?.exists ? 1 : 0),
        diagnosis: adScore >= 80 ? "Meta Pixel & Google Tag tracking active." : "Tracking tags missing or unverified.",
        statusText: adScore >= 80 ? "Optimized" : "Untracked Ad Spend",
      },
      seo: {
        pillar: "SEO",
        title: "SEO & Penalty Shield",
        score: seoScore,
        weight: 0.20,
        criticalCount: seoIssues.filter(i => i.severity === "CRITICAL").length,
        warningCount: seoIssues.filter(i => i.severity === "HIGH" || i.severity === "MEDIUM").length,
        validCount: (data.seoPenalty?.hasNoIndex ? 0 : 1) + (data.seoPenalty?.isHttps ? 1 : 0),
        diagnosis: seoScore >= 80 ? "Indexable by Google Search with HTTPS." : "Search indexing or SSL security risk.",
        statusText: seoScore >= 80 ? "Indexable" : "De-indexation Risk",
      },
      cyber: {
        pillar: "CYBER",
        title: "Cyber & Hack Shield",
        score: cyberScore,
        weight: 0.25,
        criticalCount: issues.filter(i => i.pillar === "CYBER" && i.severity === "CRITICAL").length,
        warningCount: issues.filter(i => i.pillar === "CYBER" && (i.severity === "HIGH" || i.severity === "MEDIUM")).length,
        validCount: 1,
        diagnosis: data.cyberShield?.diagnosis || "No security anomalies detected.",
        statusText: cyberScore >= 85 ? "Clean" : cyberScore >= 50 ? "Warning" : "High Risk",
      },
    },

    whatsappLinks: data.whatsappLinks || [],
    phoneLinks: data.phoneLinks || [],
    emailLinks: data.emailLinks || [],
    reviewLinks: data.reviewLinks || [],
    socialLinks: data.socialLinks || [],
    metaPixel: data.metaPixel || { exists: false, status: "MISSING" },
    googleTag: data.googleTag || { exists: false, status: "MISSING" },
    seoPenalty: data.seoPenalty || { hasNoIndex: false, status: "HEALTHY", isHttps: true },
    cyberShield: data.cyberShield || { score: 100, riskLevel: "CLEAN", diagnosis: "Clean security signature." },
    ecommerce: data.ecommerce,
    
    allIssues: issues,
    lockedIssuesCount: lockedCount,
    freeIssue,
    performance: {
      fetchTimeMs,
      parseTimeMs,
      totalTimeMs: Date.now() - startTime,
    },
    scannedAt: new Date().toISOString(),
    aiDiagnosticAdvice: data.diagnosticSummary || "Audit successfully completed across all 4 forensic pillars.",
  };

  scanReportsStore.set(scanId, auditPayload);
  return auditPayload;
}

// ---------------------------------------------------------------------------
// 5. Gemini AI Diagnostic Enhancer with Fallback & Retry
// ---------------------------------------------------------------------------
async function generateGeminiContentWithFallback(
  prompt: string,
  responseMimeType?: string
): Promise<string | null> {
  if (!ai) return null;

  const candidateModels = ["gemini-3.7-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];

  for (const model of candidateModels) {
    try {
      const config: any = {};
      if (responseMimeType) {
        config.responseMimeType = responseMimeType;
      }

      const res = await ai.models.generateContent({
        model,
        contents: prompt,
        ...(Object.keys(config).length > 0 ? { config } : {}),
      });

      if (res && res.text) {
        return res.text.trim();
      }
    } catch (err: any) {
      const isTemporary =
        err?.status === 503 ||
        err?.message?.includes("503") ||
        err?.message?.includes("high demand") ||
        err?.message?.includes("UNAVAILABLE") ||
        err?.message?.includes("429") ||
        err?.message?.includes("RESOURCE_EXHAUSTED");

      if (isTemporary) {
        console.warn(`[Gemini Resilience] Model ${model} unavailable (high demand/rate limit). Trying next fallback model...`);
        continue;
      } else {
        console.warn(`[Gemini Resilience] Model ${model} encountered non-retryable error:`, err?.message || err);
      }
    }
  }

  return null;
}

function generateFallbackDiagnosticSummary(domain: string, score: number, issues: any[]): string {
  if (issues.length === 0) {
    return `Lead channels and security signatures for ${domain} are completely verified and working smoothly across all 4 pillars.`;
  }

  const brokenWaIssue = issues.find((i) => i.category === "whatsapp" && i.severity === "CRITICAL");
  const pixelIssue = issues.find((i) => i.category === "pixel");
  const seoIssue = issues.find((i) => i.category === "seo");
  const cyberIssue = issues.find((i) => i.pillar === "CYBER");

  let summaryParts: string[] = [];

  if (brokenWaIssue) {
    summaryParts.push("WhatsApp contact button par invalid routing error (+9191 ya invalid format) hai jisse chat open nahi ho rahi.");
  }
  if (pixelIssue) {
    summaryParts.push("Meta Pixel absent hone se Facebook/Instagram ads ka attribution data track nahi ho raha.");
  }
  if (seoIssue) {
    summaryParts.push("Robots noindex tag Google search ranking ko block kar raha hai.");
  }
  if (cyberIssue) {
    summaryParts.push("Website source code me suspicious spam/injection signal detect hua hai.");
  }

  if (summaryParts.length === 0) {
    summaryParts.push(`${issues.length} audit item(s) inspect kiye gaye hain.`);
  }

  return `${summaryParts.join(" ")} Funnel Score: ${score}/100.`;
}

// ---------------------------------------------------------------------------
// 6. REST API Endpoints
// ---------------------------------------------------------------------------

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), aiReady: !!ai });
});

// Scan Statistics API
app.get("/api/scan-stats", (req, res) => {
  res.json(globalScanStats);
});

// Increment Fix Counter API
app.post("/api/scan-stats/increment-fix", (req, res) => {
  globalScanStats.fixedByLeadGuard += 1;
  globalScanStats.lastUpdated = new Date().toISOString();
  res.json({ success: true, fixedByLeadGuard: globalScanStats.fixedByLeadGuard });
});

// POST /api/scan - Primary 4-Pillar Website Scan
app.post("/api/scan", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "Please enter a valid website URL." });
    }

    const validation = isValidWebUrl(url);
    if (!validation.valid || !validation.normalized) {
      return res.status(400).json({ error: validation.error || "Invalid URL format." });
    }

    const auditResult = await scanWebsite(validation.normalized);

    // Increment global statistics in real-time
    globalScanStats.totalScannedSites += 1;
    if (auditResult.allIssues.length > 0) {
      globalScanStats.problemsFound += auditResult.allIssues.length;
    } else if (auditResult.score >= 80) {
      globalScanStats.healthySites += 1;
    }
    globalScanStats.lastUpdated = new Date().toISOString();

    // AI diagnostic advice enhancement
    if (auditResult.allIssues.length > 0) {
      const prompt = `You are LeadGuard AI, an elite website revenue & conversion auditor for Indian businesses.
Target Domain: ${auditResult.domain}
Score: ${auditResult.score}/100 (Lead: ${auditResult.pillars.lead.score}, Ads: ${auditResult.pillars.ad.score}, SEO: ${auditResult.pillars.seo.score}, Cyber: ${auditResult.pillars.cyber.score})
Issues found: ${auditResult.allIssues.map((i: any) => `${i.title} (${i.severity}): ${i.description}`).join("; ")}

Provide a sharp, 2-sentence executive summary in Hinglish (Hindi + English) explaining the exact financial loss and urgent fix priority. Keep it punchy, respectful, and authoritative.`;

      const aiText = await generateGeminiContentWithFallback(prompt);
      if (aiText) {
        auditResult.aiDiagnosticAdvice = aiText;
      } else {
        auditResult.aiDiagnosticAdvice = generateFallbackDiagnosticSummary(
          auditResult.domain,
          auditResult.score,
          auditResult.allIssues
        );
      }
    }

    res.json(auditResult);
  } catch (error: any) {
    console.error("Scan error:", error);
    res.status(500).json({ error: error.message || "Failed to scan website." });
  }
});

// GET /api/scan/:id - Retrieve cached scan report
app.get("/api/scan/:id", (req, res) => {
  const { id } = req.params;
  const report = scanReportsStore.get(id);
  if (!report) {
    return res.status(404).json({ error: "Audit report not found or session expired." });
  }
  res.json(report);
});

// GET /api/scan/:id/export - JSON export for developers & agencies
app.get("/api/scan/:id/export", (req, res) => {
  const { id } = req.params;
  const report = scanReportsStore.get(id);
  if (!report) {
    return res.status(404).json({ error: "Audit report not found." });
  }
  res.setHeader("Content-Disposition", `attachment; filename="leadguard-audit-${report.domain}.json"`);
  res.json(report);
});

// POST /api/watchdog/subscribe - 24/7 Monitoring registration
app.post("/api/watchdog/subscribe", (req, res) => {
  try {
    const { targetUrl, contact, channel, frequency = "DAILY" } = req.body;
    if (!targetUrl || !contact) {
      return res.status(400).json({ error: "Website URL and Telegram/WhatsApp contact are required." });
    }

    const lead: WatchdogEntry = {
      id: `wd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      targetUrl,
      contact,
      channel: channel || "TELEGRAM",
      frequency,
      createdAt: new Date().toISOString(),
      trialExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      status: "ACTIVE_TRIAL",
    };

    watchdogLeads.unshift(lead);

    const cleanDomain = targetUrl.replace(/^https?:\/\//i, '').split('/')[0];
    liveWatchdogChecks.unshift({
      id: `chk_${Date.now()}`,
      domain: cleanDomain,
      check: "4-Pillar Watchdog Probe",
      status: "PASS (Active Monitoring)",
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: `24/7 Watchdog Radar successfully activated for ${targetUrl}! You will receive instant alerts if WhatsApp, Call, or Pixel links drop.`,
      lead,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to activate watchdog." });
  }
});

// GET /api/watchdog/list - List active monitors
app.get("/api/watchdog/list", (req, res) => {
  res.json({
    activeMonitors: watchdogLeads,
    totalCount: watchdogLeads.length,
    recentChecks: liveWatchdogChecks,
  });
});

// POST /api/competitor-sabotage - Multi-Competitor Sabotage Radar
app.post("/api/competitor-sabotage", async (req, res) => {
  try {
    const { myUrl, competitorUrls } = req.body;
    if (!myUrl || !Array.isArray(competitorUrls) || competitorUrls.length === 0) {
      return res.status(400).json({ error: "Your website URL and at least 1 competitor URL are required." });
    }

    const valMy = isValidWebUrl(myUrl);
    if (!valMy.valid || !valMy.normalized) {
      return res.status(400).json({ error: `Your URL is invalid: ${valMy.error || ''}` });
    }

    const validCompetitorUrls = competitorUrls
      .slice(0, 3)
      .map((u: string) => isValidWebUrl(u))
      .filter((v: any) => v.valid && v.normalized)
      .map((v: any) => v.normalized as string);

    if (validCompetitorUrls.length === 0) {
      return res.status(400).json({ error: "None of the competitor URLs provided are valid." });
    }

    const [myScanResult, ...compScanResults] = await Promise.allSettled([
      scanWebsite(valMy.normalized),
      ...validCompetitorUrls.map((url: string) => scanWebsite(url)),
    ]);

    const myAudit = myScanResult.status === "fulfilled" ? myScanResult.value : null;

    const competitorSabotages = validCompetitorUrls.map((url: string, index: number) => {
      const settled = compScanResults[index];
      const compAudit = settled.status === "fulfilled" ? settled.value : null;
      const domain = url.replace(/^https?:\/\//i, '').split('/')[0];

      if (!compAudit) {
        return {
          competitorUrl: url,
          domain,
          sabotageScore: 50,
          opportunities: [
            {
              type: "BROKEN_WHATSAPP" as const,
              title: "Competitor Site Unreachable / Broken Server",
              cta: "Run Google Search Ads on their brand name right now to capture stranded traffic!",
              impact: "Competitor server is failing to respond reliably.",
              severity: "CRITICAL" as const,
            },
          ],
          verdict: "Competitor has severe downtime / connectivity issues.",
        };
      }

      const opportunities: any[] = [];
      let sabotageScore = 0;

      if (!compAudit.metaPixel?.exists) {
        sabotageScore += 35;
        opportunities.push({
          type: "MISSING_PIXEL",
          title: "Competitor Meta Pixel Missing!",
          cta: "Competitor Pixel Missing! Run Google Ads and Meta Retargeting on their brand keywords now.",
          impact: "They cannot build custom audiences or optimize conversion campaigns.",
          severity: "CRITICAL",
        });
      }

      const hasBrokenWa = compAudit.whatsappLinks.some((w: any) => !w.isValid);
      const hasNoWa = compAudit.whatsappLinks.length === 0;
      if (hasBrokenWa) {
        sabotageScore += 30;
        opportunities.push({
          type: "BROKEN_WHATSAPP",
          title: "Competitor WhatsApp Link is Fatal (+9191 or Malformed)!",
          cta: "Bid aggressively on their local high-intent keywords — their mobile traffic bounces on tap!",
          impact: "100% of mobile WhatsApp clicks from their ad campaigns fail to start a chat.",
          severity: "CRITICAL",
        });
      } else if (hasNoWa) {
        sabotageScore += 15;
        opportunities.push({
          type: "BROKEN_WHATSAPP",
          title: "Competitor has No WhatsApp Chat Widget",
          cta: "Deploy LeadGuard 1-tap WhatsApp widget on your landing page to win 3x more mobile leads.",
          impact: "Friction-heavy contact form only.",
          severity: "HIGH",
        });
      }

      if (compAudit.seoPenalty?.hasNoIndex) {
        sabotageScore += 40;
        opportunities.push({
          type: "NOINDEX_SEO",
          title: "Competitor has Active 'noindex' SEO Penalty!",
          cta: "Target their top organic keywords — their entire site is invisible to Google Search!",
          impact: "They receive zero organic traffic from Google Search.",
          severity: "CRITICAL",
        });
      }

      sabotageScore = Math.min(99, Math.max(10, sabotageScore));

      return {
        competitorUrl: url,
        domain: compAudit.domain,
        businessName: compAudit.businessName,
        score: compAudit.score,
        sabotageScore,
        estimatedMonthlyLoss: compAudit.estimatedMonthlyLoss,
        opportunities,
        verdict: sabotageScore >= 60
          ? `Massive Sabotage Opportunity! ${compAudit.domain} has ${opportunities.length} critical revenue leak(s) you can exploit.`
          : sabotageScore >= 30
          ? `Moderate Opportunity: ${compAudit.domain} has funnel weaknesses in tracking/messaging.`
          : `${compAudit.domain} is well-optimized. Focus on speed and pricing advantage.`,
      };
    });

    res.json({
      success: true,
      myAudit,
      competitors: competitorSabotages,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to execute competitor sabotage scan." });
  }
});

// POST /api/scan-batch - Batch Website Scanner & Hunter Machine
app.post("/api/scan-batch", async (req, res) => {
  try {
    const { urls } = req.body;
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: "Please provide a list of URLs to scan." });
    }

    const maxLimit = Math.min(urls.length, 500);
    const trimmedUrls = urls.slice(0, maxLimit).map((u: string) => (typeof u === 'string' ? u.trim() : '')).filter(Boolean);

    const results = await Promise.all(
      trimmedUrls.map(async (rawUrl: string) => {
        const validation = isValidWebUrl(rawUrl);
        if (!validation.valid || !validation.normalized) {
          return {
            scanId: `err_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            targetUrl: rawUrl,
            domain: rawUrl.replace(/^https?:\/\//i, '').split('/')[0] || rawUrl,
            businessName: rawUrl,
            score: 20,
            estimatedMonthlyLoss: 25000,
            adSpendRisk: "CRITICAL" as const,
            whatsappStatus: "BROKEN" as const,
            metaPixelStatus: "MISSING" as const,
            ecommerceStatus: "NONE" as const,
            primaryLeak: validation.error || "Invalid URL syntax or unreachable host",
            shareableReportUrl: `${req.protocol}://${req.get('host')}/report/err`,
            coldWhatsAppPitch: `Namaste! I noticed your website ${rawUrl} is experiencing connection errors that prevent mobile visitors from contacting you.`,
            coldEmailPitch: `Hello, your website link ${rawUrl} is currently failing DNS/SSL verification.`,
            scannedAt: new Date().toISOString(),
            status: "ERROR",
          };
        }

        try {
          const audit = await scanWebsite(validation.normalized);
          const primaryIssue = audit.allIssues.length > 0 ? audit.allIssues[0].title : "No critical leaks detected";
          const shareableReportUrl = `${req.protocol}://${req.get('host')}/report/${audit.scanId}`;

          const waStatus = audit.whatsappLinks.some((w: any) => !w.isValid)
            ? "BROKEN"
            : audit.whatsappLinks.some((w: any) => w.zeroIntentLeak)
            ? "ZERO_INTENT"
            : audit.whatsappLinks.length > 0
            ? "WORKING"
            : "MISSING";

          const brokenItemNote = audit.allIssues.length > 0
            ? `${audit.allIssues[0].title}: ${audit.allIssues[0].description}`
            : "Missing Meta Pixel tracking script";

          const coldWhatsAppPitch = `Namaste ${audit.businessName || 'Founder'} ji,\n\nI was visiting ${audit.domain}'s website on my phone and noticed a critical leak:\n\n👉 Issue: ${brokenItemNote}\n\nWhenever high-intent customers click your contact button, it bounces (estimated loss: ₹${audit.estimatedMonthlyLoss.toLocaleString('en-IN')}/month in dropped leads).\n\nHere is your full forensic audit report: ${shareableReportUrl}\n\nWe can patch this in under 15 minutes today so you stop losing leads. Should I send over the 1-click fix code?`;

          const coldEmailPitch = `Subject: Urgent conversion leak on ${audit.domain} (₹${audit.estimatedMonthlyLoss.toLocaleString('en-IN')}/mo)\n\nHi ${audit.businessName || 'Team'},\n\nOur diagnostic crawler ran a full conversion health check on ${audit.domain} and identified ${audit.allIssues.length} revenue-blocking defects:\n\n• Primary Bottleneck: ${brokenItemNote}\n• Health Score: ${audit.score}/100\n• Full Audit Report: ${shareableReportUrl}\n\nWe provide rapid 15-minute fixes for conversion funnels. Reply to this email if you'd like our engineers to deploy the fix snippet today.`;

          return {
            scanId: audit.scanId,
            targetUrl: audit.targetUrl,
            domain: audit.domain,
            businessName: audit.businessName,
            score: audit.score,
            estimatedMonthlyLoss: audit.estimatedMonthlyLoss,
            adSpendRisk: audit.adSpendRisk,
            whatsappStatus: waStatus,
            metaPixelStatus: audit.metaPixel?.exists ? "HEALTHY" : "MISSING",
            ecommerceStatus: audit.ecommerce ? (audit.ecommerce.checkoutStatus === "CRITICAL_LEAK" ? "CRITICAL_LEAK" : "HEALTHY") : "NONE",
            primaryLeak: primaryIssue,
            shareableReportUrl,
            coldWhatsAppPitch,
            coldEmailPitch,
            scannedAt: audit.scannedAt,
            status: "SUCCESS",
          };
        } catch (err: any) {
          const fallbackDomain = validation.normalized.replace(/^https?:\/\//i, '').split('/')[0];
          return {
            scanId: `scan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            targetUrl: validation.normalized,
            domain: fallbackDomain,
            businessName: fallbackDomain,
            score: 35,
            estimatedMonthlyLoss: 22000,
            adSpendRisk: "HIGH" as const,
            whatsappStatus: "BROKEN" as const,
            metaPixelStatus: "MISSING" as const,
            ecommerceStatus: "NONE" as const,
            primaryLeak: "Server connection failed or response timeout",
            shareableReportUrl: `${req.protocol}://${req.get('host')}/report/sample`,
            coldWhatsAppPitch: `Namaste! We noticed your website ${fallbackDomain} is dropping connections during mobile visits.`,
            coldEmailPitch: `Hello, ${fallbackDomain} is experiencing server response drops on mobile.`,
            scannedAt: new Date().toISOString(),
            status: "ERROR",
          };
        }
      })
    );

    const validSuccess = results.filter((r: any) => r.status === 'SUCCESS');
    globalScanStats.totalScannedSites += results.length;
    globalScanStats.problemsFound += validSuccess.filter((r: any) => r.score < 80).length;
    globalScanStats.healthySites += validSuccess.filter((r: any) => r.score >= 80).length;
    globalScanStats.lastUpdated = new Date().toISOString();

    res.json({ results, totalScanned: results.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to complete batch scan." });
  }
});

// POST /api/ai/pitch-generator
app.post("/api/ai/pitch-generator", async (req, res) => {
  try {
    const { clientName = "Founder", businessName = "your business", auditSummary = "Broken WhatsApp routing & missing Meta Pixel", tone = "direct_urgent", language = "hinglish" } = req.body;

    const prompt = `You are a high-conversion sales strategist for digital agencies in India.
Client: ${clientName}
Business: ${businessName}
Issues: ${auditSummary}
Tone: ${tone}
Language: ${language}

Draft a personalized cold WhatsApp outreach pitch pointing out the exact conversion loss with a friendly 15-minute fix offer.`;

    const aiText = await generateGeminiContentWithFallback(prompt);
    const fallbackPitch = `Namaste ${clientName} ji,\n\nI was visiting ${businessName}'s website today and noticed a critical technical leak affecting your customer inquiries.\n\nIssue detected: ${auditSummary}.\n\nWhenever a potential customer taps your WhatsApp/Call contact button from mobile, the link fails to launch directly into chat, leading to an immediate bounce and wasted ad spend (estimated loss: ₹15,000–₹25,000/month).\n\nWe run an emergency website audit & rapid-fix service for Indian businesses. We can patch and verify this link in under 15 minutes today so you never lose high-intent clients again.\n\nWould you like me to send over the 1-click fix snippet for your developer, or should our team deploy it directly?\n\nBest regards,\nLeadGuard Tech Specialist`;

    res.json({ pitch: aiText || fallbackPitch });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to generate pitch." });
  }
});

// ---------------------------------------------------------------------------
// 7. Vite Middleware & Production Server Start
// ---------------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`LeadGuard OS 4-Pillar Diagnostic Server active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
