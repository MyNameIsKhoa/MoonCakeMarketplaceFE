import { useState } from 'react';
import { formatVnd } from '../../utils/format';
import type { FinanceCase, FinanceSummary } from './paymentApi';
import TransferInstructions from './TransferInstructions';

interface Props {
  orderId: number;
  refund: FinanceCase;
  busy: boolean;
  onUpdated: (summary: FinanceSummary) => void;
  onReject: (reason: string) => Promise<boolean>;
}

export default function RefundTransfer({ orderId, refund, busy, onUpdated, onReject }: Props) {
  const [rejecting, setRejecting] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [reason, setReason] = useState('');
  const label = { MANUAL_REVIEW: 'Chờ chuyển khoản', SUCCESS: 'Đã hoàn tiền', REJECTED: 'Đã từ chối' }[refund.status]
    ?? 'Đang xử lý';
  return <article className='border rounded-lg p-3 space-y-3'>
    <p><strong>Khoản hoàn #{refund.id} · {formatVnd(refund.amount)}</strong> · {label}</p>
    {refund.status === 'MANUAL_REVIEW' && <>
      {!rejecting && <TransferInstructions orderId={orderId} kind='REFUND' transferId={refund.id}
        onUpdated={onUpdated} onBusyChange={setTransferring} />}
      {rejecting ? <form className='mss-stack' onSubmit={async event => {
        event.preventDefault();
        if (reason.trim() && await onReject(reason.trim())) setRejecting(false);
      }}>
        <label className='mss-field'>Lý do từ chối
          <textarea className='mss-textarea' maxLength={500} required value={reason} onChange={e => setReason(e.target.value)} />
        </label>
        <p className='text-sm text-amber-800'>Chỉ từ chối khi bạn đã kiểm tra và chưa chuyển tiền cho khoản này.</p>
        <div className='flex flex-wrap gap-2'>
          <button disabled={busy || !reason.trim()} className='mss-button mss-button--danger'>Xác nhận từ chối</button>
          <button type='button' className='mss-button mss-button--secondary' onClick={() => setRejecting(false)}>Quay lại</button>
        </div>
      </form> : <button type='button' className='mss-button mss-button--secondary mss-button--sm' disabled={busy || transferring}
        onClick={() => setRejecting(true)}>Từ chối khoản hoàn</button>}
    </>}
  </article>;
}
