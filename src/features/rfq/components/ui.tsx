import { ReactNode, useEffect, useId, useRef } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, RotateCw, X } from 'lucide-react';

export function LoadingRows({ rows = 3, label = 'Đang tải…' }: { rows?: number; label?: string }) {
  return (
    <div className="mss-stack" role="status" aria-label={label}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="mss-card motion-safe:animate-pulse">
          <div className="h-4 w-2/3 rounded bg-gray-100" />
          <div className="mt-3 h-3 w-1/2 rounded bg-gray-100" />
        </div>
      ))}
    </div>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="mss-alert mss-alert--danger flex flex-wrap items-center justify-between gap-3" role="alert">
      <span className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
        {message}
      </span>
      {onRetry && (
        <button type="button" className="mss-button mss-button--secondary mss-button--sm" onClick={onRetry}>
          <RotateCw className="h-4 w-4" aria-hidden />
          Thử lại
        </button>
      )}
    </div>
  );
}

export function Pager({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <nav className="flex items-center justify-center gap-3" aria-label="Phân trang">
      <button
        type="button"
        className="mss-button mss-button--secondary mss-button--sm"
        disabled={page === 0}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Trước
      </button>
      <span className="text-sm text-gray-600">
        Trang {page + 1}/{totalPages}
      </span>
      <button
        type="button"
        className="mss-button mss-button--secondary mss-button--sm"
        disabled={page + 1 >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        Sau
        <ChevronRight className="h-4 w-4" aria-hidden />
      </button>
    </nav>
  );
}

interface DialogProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

/** Modal with Escape/backdrop close and focus moved inside; content scrolls, never the page behind. */
export function Dialog({ title, onClose, children, footer }: DialogProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center" onClick={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="mss-card flex max-h-[90dvh] w-full max-w-lg flex-col gap-4 outline-none"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="mss-card-title">
            {title}
          </h2>
          <button type="button" className="mss-button mss-button--secondary mss-button--sm" onClick={onClose} aria-label="Đóng">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
}

export function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="m-0 font-semibold text-gray-900 break-words">{children}</dd>
    </div>
  );
}
