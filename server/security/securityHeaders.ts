import { Request, Response, NextFunction } from 'express';

/**
 * Production security headers.
 * CSP is intentionally strict; documented exceptions:
 *  - 'unsafe-inline' styles: Tailwind-in-JS runtime injection + Razorpay modal styling
 *  - script-src includes https://checkout.razorpay.com (payment gateway SDK)
 *  - connect-src includes api.razorpay.com / *.googleapis.com (payments, legacy auth transition)
 */
export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  const isProd = process.env.NODE_ENV === 'production';

  // HSTS only over HTTPS in production
  if (isProd) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(self "https://checkout.razorpay.com")');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');

  const csp = [
    "default-src 'self'",
    // Styles: inline required by Vite dev + Razorpay checkout modal
    `style-src 'self' 'unsafe-inline'`,
    // Scripts: self + inline for Vite dev runtime; Razorpay checkout in all modes
    `script-src 'self' 'unsafe-inline'${isProd ? '' : " 'unsafe-eval'"} https://checkout.razorpay.com`,
    "img-src 'self' data: blob: https://*.razorpay.com",
    "font-src 'self' data:",
    "connect-src 'self' https://api.razorpay.com https://checkout.razorpay.com https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com",
    "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    ...(isProd ? ["upgrade-insecure-requests"] : []),
  ].join('; ');
  res.setHeader('Content-Security-Policy', csp);

  next();
}
