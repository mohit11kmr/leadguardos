import { auditRepository } from '../repositories/auditRepository';

/**
 * Payment order statuses.
 * Single authoritative state transition function.
 */
export type PaymentOrderStatus =
  | 'CREATED'
  | 'PAYMENT_PENDING'
  | 'PENDING'
  | 'PAID'
  | 'FAILED'
  | 'REFUNDED'
  | 'CANCELLED';

/**
 * Allowed state transitions for payment orders.
 * Any transition not in this map is rejected.
 */
const ALLOWED_TRANSITIONS: Record<PaymentOrderStatus, PaymentOrderStatus[]> = {
  CREATED: ['PAYMENT_PENDING', 'PENDING', 'CANCELLED'],
  PAYMENT_PENDING: ['PAID', 'FAILED', 'CANCELLED'],
  PENDING: ['PAYMENT_PENDING', 'PAID', 'FAILED', 'CANCELLED'],
  PAID: ['REFUNDED'],
  FAILED: ['CANCELLED'], // FAILED → PAID requires provider override (not in normal flow)
  REFUNDED: [],
  CANCELLED: [],
};

export interface PaymentTransitionEvent {
  orderId: string;
  fromStatus: PaymentOrderStatus;
  toStatus: PaymentOrderStatus;
  reason?: string;
  provider?: string;
  providerEventId?: string;
  userId?: string;
  timestamp: string;
}

/**
 * Validates and executes a payment state transition.
 * Rejects all illegal transitions. The client cannot directly change payment status.
 *
 * @throws Error if transition is not allowed
 */
export function validatePaymentTransition(
  currentStatus: PaymentOrderStatus,
  newStatus: PaymentOrderStatus,
  orderId: string,
): void {
  const allowed = ALLOWED_TRANSITIONS[currentStatus];
  if (!allowed || !allowed.includes(newStatus)) {
    throw new Error(
      `INVALID_PAYMENT_STATE_TRANSITION: Cannot transition order ${orderId} from ${currentStatus} to ${newStatus}. ` +
      `Allowed transitions from ${currentStatus}: [${(allowed || []).join(', ')}]`
    );
  }
}

/**
 * Single authoritative state transition function for payment orders.
 * Validates the transition, logs the event, and returns the transition record.
 */
export async function transitionPaymentState(
  orderId: string,
  currentStatus: PaymentOrderStatus,
  newStatus: PaymentOrderStatus,
  event: Partial<PaymentTransitionEvent> = {},
): Promise<PaymentTransitionEvent> {
  validatePaymentTransition(currentStatus, newStatus, orderId);

  const transitionEvent: PaymentTransitionEvent = {
    orderId,
    fromStatus: currentStatus,
    toStatus: newStatus,
    reason: event.reason,
    provider: event.provider,
    providerEventId: event.providerEventId,
    userId: event.userId,
    timestamp: new Date().toISOString(),
  };

  // Audit log every state transition
  await auditRepository.logEvent({
    action: 'PAYMENT_STATE_TRANSITION',
    userId: event.userId,
    details: transitionEvent,
    timestamp: transitionEvent.timestamp,
  });

  return transitionEvent;
}

/**
 * Verify payment amount and currency against server-authoritative pricing catalog.
 * Rejects mismatches to prevent amount tampering.
 */
export function verifyPaymentAmount(
  expectedAmountINR: number,
  actualAmountINR: number,
  expectedCurrency: string,
  actualCurrency: string,
  orderId: string,
): void {
  if (expectedCurrency.toUpperCase() !== actualCurrency.toUpperCase()) {
    throw new Error(
      `CURRENCY_MISMATCH: Order ${orderId} expects ${expectedCurrency} but received ${actualCurrency}`
    );
  }

  // Allow 1 paisa tolerance for floating point
  if (Math.abs(expectedAmountINR - actualAmountINR) > 0.01) {
    throw new Error(
      `AMOUNT_MISMATCH: Order ${orderId} expects ₹${expectedAmountINR} but received ₹${actualAmountINR}`
    );
  }
}
