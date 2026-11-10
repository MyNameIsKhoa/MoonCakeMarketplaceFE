import type { CheckoutSelection } from './commerceApi';

export interface CheckoutAttempt {
  addressId: string;
  selection: CheckoutSelection;
  quote: string;
  key: string;
  startedAt: number;
}

const keyFor = (userId: string) => 'mooncake.checkoutAttempt.' + userId;

export function loadCheckoutAttempt(userId: string): CheckoutAttempt | null {
  try {
    const entry = JSON.parse(sessionStorage.getItem(keyFor(userId)) ?? 'null') as CheckoutAttempt | null;
    return entry?.key && entry.selection?.cartItemIds?.length && Number.isFinite(entry.startedAt) ? entry : null;
  } catch { return null; }
}

export function saveCheckoutAttempt(userId: string, attempt: CheckoutAttempt | null) {
  try {
    if (attempt) sessionStorage.setItem(keyFor(userId), JSON.stringify(attempt));
    else sessionStorage.removeItem(keyFor(userId));
  } catch { /* The current checkout keeps the retry in memory if storage is unavailable. */ }
}

export const checkoutAttemptExpired = (attempt: CheckoutAttempt) => Date.now() - attempt.startedAt >= 30 * 60_000;
