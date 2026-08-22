export interface BrowserRuntimeResult {
  networkPings: {
    metaPixel: boolean;
    ga4: boolean;
    gtm: boolean;
  };
  renderedDomHtml?: string;
  consoleErrors: string[];
  runtimeRedirectUrl?: string;
}

export class BrowserScanner {
  private static activeBrowserCount = 0;
  private static readonly MAX_BROWSER_INSTANCES = 3;

  public static async scanRuntime(url: string, timeoutMs = 15000): Promise<BrowserRuntimeResult> {
    const networkPings = { metaPixel: false, ga4: false, gtm: false };
    const consoleErrors: string[] = [];

    // Attempt to load playwright dynamically if installed
    try {
      // @ts-ignore
      const playwright = await import('playwright').catch(() => null);
      if (!playwright) {
        return { networkPings, consoleErrors };
      }

      if (this.activeBrowserCount >= this.MAX_BROWSER_INSTANCES) {
        console.warn('[BrowserScanner] Concurrency limit reached, skipping runtime browser stage.');
        return { networkPings, consoleErrors };
      }

      this.activeBrowserCount++;
      let browser: any = null;
      let context: any = null;
      let page: any = null;

      try {
        browser = await playwright.chromium.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        });
        context = await browser.newContext({
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 LeadGuard-RuntimeScanner/2.0',
          viewport: { width: 390, height: 844 }, // Mobile Viewport
        });
        page = await context.newPage();

        page.setDefaultTimeout(timeoutMs);
        page.setDefaultNavigationTimeout(timeoutMs);

        // Network Request Interception
        page.on('request', (req: any) => {
          const reqUrl = req.url().toLowerCase();
          if (reqUrl.includes('connect.facebook.net') || reqUrl.includes('facebook.com/tr/')) {
            networkPings.metaPixel = true;
          }
          if (reqUrl.includes('google-analytics.com') || reqUrl.includes('analytics.google.com') || reqUrl.includes('/g/collect')) {
            networkPings.ga4 = true;
          }
          if (reqUrl.includes('googletagmanager.com/gtm.js')) {
            networkPings.gtm = true;
          }
        });

        // Console Error Interception
        page.on('console', (msg: any) => {
          if (msg.type() === 'error') {
            consoleErrors.push(msg.text().slice(0, 200));
          }
        });

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
        const renderedDomHtml = await page.content();
        const runtimeRedirectUrl = page.url();

        return {
          networkPings,
          renderedDomHtml,
          consoleErrors,
          runtimeRedirectUrl,
        };
      } finally {
        if (page) await page.close().catch(() => {});
        if (context) await context.close().catch(() => {});
        if (browser) await browser.close().catch(() => {});
        this.activeBrowserCount = Math.max(0, this.activeBrowserCount - 1);
      }
    } catch (err: any) {
      console.warn('[BrowserScanner Runtime Fallback]:', err?.message || err);
      return { networkPings, consoleErrors };
    }
  }
}
