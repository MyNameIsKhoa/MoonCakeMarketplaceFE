import { AlertTriangle, RotateCw } from 'lucide-react';

export function ErrorAlert({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="mss-alert mss-alert--danger flex flex-wrap items-center justify-between gap-3">
      <span className="flex items-start gap-2 min-w-0">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
        <span className="break-words">{message}</span>
      </span>
      {onRetry && (
        <button type="button" className="mss-button mss-button--secondary mss-button--sm" onClick={onRetry}>
          <RotateCw className="w-4 h-4" aria-hidden />
          Thử lại
        </button>
      )}
    </div>
  );
}

export function LoadingText({ label }: { label: string }) {
  return <p role="status" className="text-sm text-gray-500">{label}</p>;
}

/** Success feedback after a save; announced politely to screen readers. */
export function SuccessText({ message }: { message: string }) {
  return message ? <p role="status" className="text-sm font-medium text-green-700">{message}</p> : null;
}
