import { formatVnd } from '../../utils/format';

/** Display-only formatting of backend decimal strings; never feed the result back into calculations. */
export function formatMoney(value?: string | null): string {
  return value == null || value === '' ? '—' : formatVnd(Number(value));
}

export function formatPercent(value?: string | null): string {
  return value == null ? '—' : `${Number(value).toLocaleString('vi-VN')}%`;
}

/** `<input type="datetime-local">` value → UTC ISO accepted by OffsetDateTime fields. */
export function localDateTimeToIso(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function isoToLocalDateTime(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function todayIsoDate(offsetDays = 0): string {
  const date = new Date(Date.now() + offsetDays * 86400000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const MONEY_PATTERN = /^\d{1,16}(\.\d{1,2})?$/;

export function isMoney(value: string): boolean {
  return MONEY_PATTERN.test(value.trim());
}

/** Whole cents for the composer's preview only; the server recalculates every total. */
export function toCents(value: string): number {
  return isMoney(value) ? Math.round(Number(value) * 100) : 0;
}

export function centsToVnd(cents: number): string {
  return formatVnd(cents / 100);
}
