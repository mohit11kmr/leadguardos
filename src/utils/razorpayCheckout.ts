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

/**
 * Opens Razorpay Standard Checkout modal for a given plan.
 *
 * @returns Promise resolving with payment result
 */
export async function openRazorpayCheckout(options: RazorpayCheckoutOptions): Promise<CheckoutResult> {
  // Step 1: Create order on server (server calculates price — never trust client)
  const orderResponse = await fetch('/api/monetization/order', {
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
      orderId: orderData.order?.id,
      error: 'Razorpay order not created. Payment provider may not be configured.',
    };
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
          const verifyResponse = await fetch('/api/monetization/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: orderData.order.id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              razorpaySignature: response.razorpay_signature,
            }),
          });

          if (verifyResponse.ok) {
            resolve({
              success: true,
              orderId: orderData.order.id,
              paymentId: response.razorpay_payment_id,
            });
          } else {
            const verifyErr = await verifyResponse.json().catch(() => ({}));
            resolve({
              success: false,
              orderId: orderData.order.id,
              error: verifyErr?.error?.message || 'Payment verification failed',
            });
          }
        } catch (verifyErr: any) {
          resolve({
            success: false,
            orderId: orderData.order.id,
            error: verifyErr?.message || 'Network error during verification',
          });
        }
      },

      // User dismissed the modal
      modal: {
        ondismiss: () => {
          resolve({
            success: false,
            orderId: orderData.order?.id,
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
        orderId: orderData.order?.id,
        error: response?.error?.description || 'Payment failed',
      });
    });

    rzp.open();
  });
}
