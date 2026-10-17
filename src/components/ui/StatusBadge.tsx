import { getStatusMeta, StatusMeta } from '../../utils/status';

interface StatusBadgeProps {
  map: Record<string, StatusMeta>;
  status: string | undefined;
}

export default function StatusBadge({ map, status }: StatusBadgeProps) {
  const meta = getStatusMeta(map, status);
  const variantClass = meta.variant === 'neutral' ? '' : ` mss-badge--${meta.variant}`;
  return <span className={`mss-badge${variantClass}`}>{meta.label}</span>;
}
