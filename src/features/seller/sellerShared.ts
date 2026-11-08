/**
 * Helpers shared by the seller management components (StoreSettings, BranchManager, PromotionManager).
 * Status labels mirror CatalogStoreService enums; date helpers follow the backend convention that
 * LocalDateTime values are UTC and serialized without a zone suffix.
 */
import type { StatusMeta } from '../../utils/status';

export const CARD = 'bg-white rounded-2xl shadow-sm border border-gray-100 p-6';

export const STORE_STATUS: Record<string, StatusMeta> = {
  DRAFT: { label: 'Nháp – chưa mở bán', variant: 'neutral' },
  ACTIVE: { label: 'Đang mở bán', variant: 'success' },
  INACTIVE: { label: 'Tạm ngừng bán', variant: 'warning' },
  SUSPENDED: { label: 'Bị quản trị viên khóa', variant: 'danger' }
};

export const BRANCH_STATUS: Record<string, StatusMeta> = {
  ACTIVE: { label: 'Đang hoạt động', variant: 'success' },
  INACTIVE: { label: 'Tạm đóng', variant: 'neutral' }
};

export const PROMOTION_STATUS: Record<string, StatusMeta> = {
  DRAFT: { label: 'Nháp', variant: 'neutral' },
  ACTIVE: { label: 'Đang bật', variant: 'success' },
  DISABLED: { label: 'Đã tắt', variant: 'neutral' },
  EXPIRED: { label: 'Hết hạn', variant: 'warning' }
};

/** Backend date-time without an offset is UTC; values that carry a zone are parsed as-is. */
export function parseUtc(value?: string | null): Date | null {
  if (!value) return null;
  const hasZone = /([zZ]|[+-]\d\d:?\d\d)$/.test(value);
  const date = new Date(hasZone ? value : `${value}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatUtcDateTime(value?: string | null): string {
  const date = parseUtc(value);
  return date
    ? date.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—';
}

/** Backend UTC value → `<input type="datetime-local">` value in the viewer's time zone. */
export function utcToLocalInput(value?: string | null): string {
  const date = parseUtc(value);
  if (!date) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * `<input type="datetime-local">` value → UTC ISO string. The promotion DTO uses LocalDateTime (UTC);
 * Jackson accepts the trailing "Z" and stores the UTC wall time (verified against the running stack).
 */
export function localInputToUtc(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Whole, non-negative number typed by the seller (VND amount, quantity); null when blank or invalid. */
export function parseWholeNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return Number.isSafeInteger(n) ? n : null;
}
