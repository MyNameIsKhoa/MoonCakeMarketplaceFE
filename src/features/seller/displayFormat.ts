const HAS_OFFSET = /(Z|[+-]\d{2}:?\d{2})$/i;

/** Backend LocalDateTime values are UTC without a zone suffix: read them as UTC, show local 24h time. */
export function formatUtcDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(HAS_OFFSET.test(value) ? value : `${value}Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN', {
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23', day: '2-digit', month: '2-digit', year: 'numeric'
  });
}

/** Date-only values (YYYY-MM-DD) are calendar dates: shown as DD/MM/YYYY without any time zone shift. */
export function formatPlainDate(value: string | null | undefined): string {
  const match = value ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null;
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value || '—';
}
