import { getAccessToken, readTokenPayload } from '../../services/api/http';

export const endedPayment = (status: string) => ['CANCELLED', 'EXPIRED', 'FAILED'].includes(status);

export function safeCheckoutUrl(value: string | null | undefined): string | undefined {
  try { const url = new URL(value || ''); return url.protocol === 'https:' ? url.href : undefined; }
  catch { return undefined; }
}

export function usableCheckout(payment: { status: string; checkoutUrl: string | null; expiresAt: string | null }) {
  return payment.status === 'PENDING' && (!payment.expiresAt || Date.parse(payment.expiresAt) > Date.now())
    ? safeCheckoutUrl(payment.checkoutUrl) : undefined;
}

const memoryKeys = new Map<string, string>();
// Keep the same attempt across timeouts, reloads, and both payment entry points.
export function initiationKey(scope: string): string {
  const token = getAccessToken();
  const actor = token ? readTokenPayload(token)?.userId ?? 'unknown' : 'guest';
  const storageKey = `mooncake.payment-attempt.${actor}.${scope}`;
  let key = memoryKeys.get(storageKey);
  try { key ||= sessionStorage.getItem(storageKey) || undefined; } catch { /* blocked storage */ }
  key ||= crypto.randomUUID();
  memoryKeys.set(storageKey, key);
  try { sessionStorage.setItem(storageKey, key); } catch { /* retain in memory */ }
  return key;
}

// A finished PayOS link is a new attempt; an uncertain response is still the same attempt.
export function sellerInitiationKey(payment: { paymentId: number; status: string }): string {
  const scope = `seller:${payment.paymentId}${endedPayment(payment.status) ? ':retry' : ''}`;
  return initiationKey(scope);
}
