/**
 * Razorpay Standard Checkout integration hook for LeadGuard OS.
 *
 * Flow:
 *   1. Frontend calls POST /api/monetization/order (server creates Razorpay order)
 *   2. Server returns razorpay.orderId + razorpay.keyId
 *   3. This hook opens the Razorpay modal with the order
 *   4. On success, sends (razorpay_payment_id, razorpay_order_id, razorpay_signature)
 *      to POST /api/monetization/verify-payment
 *   5. Server verifies HMAC signature and marks order PAID
 *
 * KEY_SECRET NEVER reaches the frontend.
 */

import { apiFetch } from '../api/client';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export interface RazorpayCheckoutOptions {
  tierId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  domain?: string;
}

export interface CheckoutResult {
  success: boolean;
  orderId?: string;
  paymentId?: string;
  error?: string;
}

/** Loads the Razorpay checkout script on demand (idempotent). */
function ensureCheckoutScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src*="checkout.razorpay.com"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Razorpay checkout script failed to load')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Razorpay checkout script failed to load'));
    document.head.appendChild(script);
  });
}

/**
 * Opens Razorpay Standard Checkout modal for a given plan.
 *
 * @returns Promise resolving with payment result
 */
export async function openRazorpayCheckout(options: RazorpayCheckoutOptions): Promise<CheckoutResult> {
  // Step 1: Create order on server (server calculates price — never trust client)
  const orderResponse = await apiFetch('/api/monetization/order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tierId: options.tierId,
      paymentMethod: 'RAZORPAY',
      customerName: options.customerName,
      customerEmail: options.customerEmail,
      customerPhone: options.customerPhone,
      domain: options.domain,
    }),
  });

  if (!orderResponse.ok) {
    const err = await orderResponse.json().catch(() => ({ error: { message: 'Failed to create order' } }));
    return { success: false, error: err?.error?.message || 'Order creation failed' };
  }

  const orderData = await orderResponse.json();

  if (!orderData.razorpay?.orderId) {
    return {
      success: false,
      orderId: orderData.order?.orderId,
      error: 'Razorpay order not created. Payment provider may not be configured.',
    };
  }

  // Ensure the checkout SDK is available even if the index.html script
  // has not finished loading (loaded async there as well).
  try {
    await ensureCheckoutScript();
  } catch (err: any) {
    return { success: false, orderId: orderData.order?.orderId, error: err?.message || 'Checkout unavailable' };
  }

  // Step 2: Open Razorpay checkout modal
  if (!window.Razorpay) {
    return { success: false, error: 'Razorpay checkout script not loaded. Please refresh and try again.' };
  }

  return new Promise<CheckoutResult>((resolve) => {
    const rzpOptions = {
      key: orderData.razorpay.keyId, // Public key from server
      amount: orderData.razorpay.amount,
      currency: orderData.razorpay.currency,
      name: 'LeadGuard OS',
      description: orderData.order?.tierName || 'LeadGuard Service',
      order_id: orderData.razorpay.orderId,
      prefill: {
        name: options.customerName || '',
        email: options.customerEmail || '',
        contact: options.customerPhone || '',
      },
      notes: {
        orderId: orderData.order?.orderId || '',
        domain: options.domain || '',
      },
      theme: {
        color: '#e11d48', // Rose-600 — matches LeadGuard branding
        backdrop_color: 'rgba(2, 6, 23, 0.9)', // slate-950
      },

      // Step 3: On successful payment
      handler: async (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) => {
        try {
          // Step 4: Verify signature on server
          const verifyResponse = await apiFetch('/api/monetization/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: orderData.order.orderId,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              razorpaySignature: response.razorpay_signature,
            }),
          });

          if (verifyResponse.ok) {
            resolve({
              success: true,
              orderId: orderData.order.orderId,
              paymentId: response.razorpay_payment_id,
            });
          } else {
            const verifyErr = await verifyResponse.json().catch(() => ({}));
            resolve({
              success: false,
              orderId: orderData.order.orderId,
              error: verifyErr?.error?.message || 'Payment verification failed',
            });
          }
        } catch (verifyErr: any) {
          resolve({
            success: false,
            orderId: orderData.order.orderId,
            error: verifyErr?.message || 'Network error during verification',
          });
        }
      },

      // User dismissed the modal
      modal: {
        ondismiss: () => {
          resolve({
            success: false,
            orderId: orderData.order?.orderId,
            error: 'Payment cancelled by user',
          });
        },
      },
    };

    const rzp = new window.Razorpay(rzpOptions);

    // Handle payment failure events
    rzp.on('payment.failed', (response: any) => {
      resolve({
        success: false,
        orderId: orderData.order?.orderId,
        error: response?.error?.description || 'Payment failed',
      });
    });

    rzp.open();
  });
}
