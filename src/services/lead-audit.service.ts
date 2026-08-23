import * as cheerio from 'cheerio';
import { safeFetch } from '../../server/security/safeFetch';

export interface LeadFormAudit {
  action: string;
  resolvedAction: string;
  isInternal: boolean;
  method: string;
  inputCount: number;
  fields: string[];
}

export interface AnalyticsAudit {
  gtag: boolean;
  googleTagManager: boolean;
  fbq: boolean;
  detected: string[];
}

export interface BrokenLinkAudit {
  url: string;
  status?: number;
  broken: boolean;
  error?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const PHONE_PATTERN = /(?:\+?91[\s.-]?)?[6-9]\d{9}\b/g;

function load(html: string) {
  return cheerio.load(html || '');
}

export function extractEmails(html: string): string[] {
  const $ = load(html);
  const values = new Set<string>();

  $('a[href^="mailto:"]').each((_index, element) => {
    const raw = $(element).attr('href')?.slice(7).split('?')[0] || '';
    let decoded = raw;
    try {
      decoded = decodeURIComponent(raw);
    } catch {
      return;
    }
    decoded = decoded.trim().toLowerCase();
    if (EMAIL_PATTERN.test(decoded)) values.add(decoded);
  });

  for (const match of (html || '').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []) {
    const value = match.toLowerCase();
    if (EMAIL_PATTERN.test(value)) values.add(value);
  }
  return [...values].sort();
}

export function extractPhones(html: string): string[] {
  const $ = load(html);
  const values = new Set<string>();
  const candidates = `${$('body').text()} ${$('a[href^="tel:"]').map((_i, el) => $(el).attr('href') || '').get().join(' ')}`;

  for (const match of candidates.match(PHONE_PATTERN) || []) {
    const digits = match.replace(/\D/g, '');
    const national = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
    if (/^[6-9]\d{9}$/.test(national)) values.add(`+91${national}`);
  }
  return [...values].sort();
}

export function extractWhatsApp(html: string): string[] {
  const $ = load(html);
  const values = new Set<string>();
  $('a[href]').each((_index, element) => {
    const href = $(element).attr('href') || '';
    if (!/^(?:https?:\/\/)?(?:www\.)?(?:wa\.me|api\.whatsapp\.com)(?:[/?#]|$)/i.test(href)) return;
    try {
      const normalized = new URL(/^https?:\/\//i.test(href) ? href : `https://${href}`).toString();
      values.add(normalized);
    } catch {
      // Malformed attacker-controlled hrefs are not lead data.
    }
  });
  return [...values].sort();
}

export function analyzeForms(html: string, baseUrl: string): LeadFormAudit[] {
  const $ = load(html);
  const base = new URL(baseUrl);
  const forms: LeadFormAudit[] = [];
  $('form').each((_index, element) => {
    const action = $(element).attr('action')?.trim() || baseUrl;
    let resolvedAction = action;
    try {
      resolvedAction = new URL(action, base).toString();
    } catch {
      resolvedAction = '';
    }
    const fields = $(element).find('input, select, textarea').map((_i, field) => $(field).attr('name') || $(field).attr('type') || 'unnamed').get();
    forms.push({
      action,
      resolvedAction,
      isInternal: Boolean(resolvedAction) && new URL(resolvedAction).hostname === base.hostname,
      method: ($(element).attr('method') || 'get').toUpperCase(),
      inputCount: fields.length,
      fields: fields.slice(0, 20),
    });
  });
  return forms;
}

export function detectAnalytics(html: string): AnalyticsAudit {
  const source = html || '';
  const result: AnalyticsAudit = {
    gtag: /\bgtag\s*\(/i.test(source),
    googleTagManager: /(?:googletagmanager\.com|\bGTM-[A-Z0-9]+)/i.test(source),
    fbq: /\bfbq\s*\(/i.test(source),
    detected: [],
  };
  if (result.gtag) result.detected.push('gtag');
  if (result.googleTagManager) result.detected.push('gtm');
  if (result.fbq) result.detected.push('fbq');
  return result;
}

function linkCandidates(html: string, baseUrl: string): string[] {
  const $ = load(html);
  const values = new Set<string>();
  $('a[href]').each((_index, element) => {
    const href = ($(element).attr('href') || '').trim();
    if (!href || href.startsWith('#') || /^(mailto|tel|javascript):/i.test(href)) return;
    try {
      const parsed = new URL(href, baseUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) return;
      values.add(parsed.toString());
    } catch {
      // Ignore malformed links.
    }
  });
  return [...values].slice(0, 30);
}

export async function checkBrokenLinks(html: string, baseUrl: string, timeout = 2000): Promise<BrokenLinkAudit[]> {
  const urls = linkCandidates(html, baseUrl);
  const results: BrokenLinkAudit[] = [];
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < urls.length) {
      const url = urls[nextIndex++];
      try {
        const response = await safeFetch(url, { method: 'HEAD', timeoutMs: timeout, maxRedirects: 3 });
        results.push({ url, status: response.status, broken: !response.ok });
      } catch (error: any) {
        results.push({ url, broken: true, error: error?.message || 'Request failed' });
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(5, urls.length) }, () => worker()));
  return results.sort((a, b) => a.url.localeCompare(b.url));
}
