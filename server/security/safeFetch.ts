import dns from 'dns';
import net from 'net';
import http from 'http';
import https from 'https';
import { URL } from 'url';
import { isPrivateOrBlockedIP, validateUrlSyntax } from '../ssrfGuard';

export interface SafeFetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string | Buffer;
  timeoutMs?: number;
  maxRedirects?: number;
  maxResponseSizeBytes?: number;
}

export interface SafeFetchResponse {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  text: () => Promise<string>;
  json: <T = any>() => Promise<T>;
  url: string;
}

export async function safeFetch(
  rawUrl: string,
  options: SafeFetchOptions = {}
): Promise<SafeFetchResponse> {
  const {
    method = 'GET',
    headers = {},
    body,
    timeoutMs = 10000,
    maxRedirects = 3,
    maxResponseSizeBytes = 5 * 1024 * 1024, // 5MB limit
  } = options;

  let currentUrlStr = rawUrl;
  let redirectCount = 0;

  while (redirectCount <= maxRedirects) {
    const syntax = validateUrlSyntax(currentUrlStr);
    if (!syntax.valid || !syntax.normalized || !syntax.hostname) {
      throw new Error(`[SafeFetch SSRF Guard]: Blocked URL syntax or host '${currentUrlStr}': ${syntax.error}`);
    }

    const parsedUrl = new URL(syntax.normalized);
    const hostname = syntax.hostname;

    // DNS pre-resolution verification
    let targetIp = hostname;
    if (!net.isIP(hostname)) {
      const lookupEntries = await dns.promises.lookup(hostname, { all: true });
      if (!lookupEntries || lookupEntries.length === 0) {
        throw new Error(`[SafeFetch SSRF Guard]: Could not resolve DNS for hostname '${hostname}'`);
      }
      for (const entry of lookupEntries) {
        if (isPrivateOrBlockedIP(entry.address)) {
          throw new Error(`[SafeFetch SSRF Guard]: Domain '${hostname}' resolved to blocked private/restricted IP (${entry.address})`);
        }
      }
      targetIp = lookupEntries[0].address;
    } else {
      if (isPrivateOrBlockedIP(hostname)) {
        throw new Error(`[SafeFetch SSRF Guard]: Target IP '${hostname}' is within blocked private/restricted range.`);
      }
    }

    // Perform HTTP/HTTPS request pinning host header to target domain
    const isHttps = parsedUrl.protocol === 'https:';
    const requestModule = isHttps ? https : http;

    const reqHeaders: Record<string, string> = {
      'User-Agent': 'LeadGuard-OS-SecurityScanner/2.0 (+https://leadguard.os)',
      Accept: 'text/html,application/xhtml+xml,application/json,*/*',
      Host: parsedUrl.host,
      ...headers,
    };

    const reqOptions: http.RequestOptions & { servername?: string } = {
      hostname: targetIp,
      port: parsedUrl.port ? parseInt(parsedUrl.port, 10) : isHttps ? 443 : 80,
      path: parsedUrl.pathname + parsedUrl.search,
      method: method.toUpperCase(),
      headers: reqHeaders,
      timeout: timeoutMs,
      // For HTTPS server name indication (SNI)
      servername: net.isIP(hostname) ? undefined : hostname,
    };

    const response = await new Promise<SafeFetchResponse>((resolve, reject) => {
      let isSettled = false;
      const req = requestModule.request(reqOptions, (res) => {
        const statusCode = res.statusCode || 500;

        // Check Redirects
        if ([301, 302, 303, 307, 308].includes(statusCode) && res.headers.location) {
          const redirectLocation = new URL(res.headers.location, currentUrlStr).toString();
          res.resume(); // consume response stream
          if (isSettled) return;
          isSettled = true;
          redirectCount++;
          if (redirectCount > maxRedirects) {
            return reject(new Error(`[SafeFetch SSRF Guard]: Exceeded maximum redirect limit (${maxRedirects})`));
          }
          currentUrlStr = redirectLocation;
          return resolve({
            isRedirect: true,
            nextUrl: redirectLocation,
          } as any);
        }

        // Buffer response with size limit guard
        const chunks: Buffer[] = [];
        let totalBytes = 0;

        res.on('data', (chunk: Buffer) => {
          totalBytes += chunk.length;
          if (totalBytes > maxResponseSizeBytes) {
            req.destroy(new Error(`[SafeFetch Limit]: Response size exceeded max limit of ${maxResponseSizeBytes} bytes`));
          } else {
            chunks.push(chunk);
          }
        });

        res.on('end', () => {
          if (isSettled) return;
          isSettled = true;
          const bodyBuffer = Buffer.concat(chunks);
          const responseHeaders: Record<string, string> = {};
          for (const [k, v] of Object.entries(res.headers)) {
            if (v) responseHeaders[k.toLowerCase()] = Array.isArray(v) ? v.join(', ') : v;
          }

          resolve({
            ok: statusCode >= 200 && statusCode < 300,
            status: statusCode,
            statusText: res.statusMessage || '',
            headers: responseHeaders,
            url: currentUrlStr,
            text: async () => bodyBuffer.toString('utf-8'),
            json: async <T>() => JSON.parse(bodyBuffer.toString('utf-8')) as T,
          });
        });

        res.on('error', (err) => {
          if (isSettled) return;
          isSettled = true;
          reject(err);
        });
      });

      req.on('timeout', () => {
        req.destroy(new Error(`[SafeFetch Timeout]: Connection timed out after ${timeoutMs}ms`));
      });

      req.on('error', (err) => {
        if (isSettled) return;
        isSettled = true;
        reject(err);
      });

      if (body) {
        req.write(body);
      }
      req.end();
    });

    if ((response as any).isRedirect) {
      currentUrlStr = (response as any).nextUrl;
      continue;
    }

    return response;
  }

  throw new Error(`[SafeFetch SSRF Guard]: Redirect loop or threshold exceeded.`);
}
