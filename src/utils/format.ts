import { Money } from '../types';

const vnd = new Intl.NumberFormat('vi-VN');

/** Formats a backend-provided amount. Never use the result for further math. */
export function formatVnd(amount: Money | undefined | null): string {
  if (amount === undefined || amount === null) return '—';
  return `${vnd.format(amount)} ₫`;
}

// DATETIME2(0) carries no timezone; until the API contract pins one,
// parse as-is (no appended "Z") and display in the viewer's locale.
function parse(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
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
