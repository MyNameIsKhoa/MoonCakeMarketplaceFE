import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { errorMessage } from '../../../services/api/http';
import { Dialog } from './ui';

interface DecisionDialogProps {
  title: string;
  description: string;
  confirmLabel: string;
  /** Destructive decisions use the danger button style. */
  danger?: boolean;
  withReason?: boolean;
  onConfirm: (reason: string) => Promise<unknown>;
  onClose: () => void;
}

export default function DecisionDialog({ title, description, confirmLabel, danger, withReason, onConfirm, onClose }: DecisionDialogProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      await onConfirm(reason.trim());
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      title={title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="mss-button mss-button--secondary" onClick={onClose} disabled={busy}>
            Không
          </button>
          <button type="button" className={`mss-button ${danger ? 'mss-button--danger' : 'mss-button--primary'}`} onClick={confirm} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="mss-stack">
        <p className="m-0 text-gray-700">{description}</p>
        {withReason && (
          <div className="mss-field">
            <label className="mss-label" htmlFor="decision-reason">
              Lý do (không bắt buộc)
            </label>
            <textarea id="decision-reason" className="mss-textarea" maxLength={2000} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        )}
        {error && (
          <p className="mss-alert mss-alert--danger m-0" role="alert">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}
