import { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="mss-empty">
      <p className="text-lg font-semibold text-gray-900">{title}</p>
      {description && <p className="text-sm">{description}</p>}
      {action}
    </div>
  );
}
