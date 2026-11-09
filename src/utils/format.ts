import { Money, PromotionRule } from '../types';

const vnd = new Intl.NumberFormat('vi-VN');

/** Formats a backend-provided amount. Never use the result for further math. */
export function formatVnd(amount: Money | undefined | null): string {
  if (amount === undefined || amount === null) return '—';
  return `${vnd.format(amount)} ₫`;
}

export function formatPromotionRule(rule: PromotionRule): string {
  const minQty = rule.minQuantity && rule.minQuantity > 1 ? ` · từ ${rule.minQuantity} sản phẩm` : '';
  if (rule.ruleType === 'PERCENT_DISCOUNT' && rule.discountPercent != null) {
    return `Giảm ${vnd.format(rule.discountPercent)}%${minQty}`;
  }
  if (rule.ruleType === 'FIXED_DISCOUNT' && rule.discountAmount != null) {
    return `Giảm ${formatVnd(rule.discountAmount)}${minQty}`;
  }
  if (rule.ruleType === 'BUY_X_GET_Y') {
    return `Mua ${rule.minQuantity ?? 1} tặng ${rule.rewardQuantity ?? 1}`;
  }
  return 'Ưu đãi gian hàng';
}

/**
 * Backend DATETIME2 values are UTC. Identity, Catalog and Commerce serialize them without a zone
 * suffix (RFQ adds "Z"), so a date-time without an offset is read as UTC. Date-only values
 * (YYYY-MM-DD) stay calendar dates.
 */
export function parseApiDate(value?: string | null): Date | null {
  if (!value) return null;
  const hasZone = /([zZ]|[+-]\d\d:?\d\d)$/.test(value);
  const date = new Date(value.includes('T') && !hasZone ? `${value}Z` : value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const parse = parseApiDate;

/** Value for an `<input type="datetime-local">` in the viewer's time zone. */
export function toLocalDateTimeInput(value?: string | null): string {
  const date = parseApiDate(value);
  if (!date) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export function formatDate(value?: string): string {
  const date = parse(value);
  return date ? date.toLocaleDateString('vi-VN') : '—';
}

export function formatDateTime(value?: string): string {
  const date = parse(value);
  return date
    ? date.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—';
}

export function formatAddress(parts: { addressLine: string; ward?: string; district?: string; city: string }): string {
  return [parts.addressLine, parts.ward, parts.district, parts.city].filter(Boolean).join(', ');
}
