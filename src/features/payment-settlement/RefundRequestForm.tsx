import { useState } from 'react';
import { formatVnd } from '../../utils/format';
import { PAYMENT_TYPE } from '../../utils/status';
import type { Payment } from './paymentApi';

interface Props {
  payments: Payment[];
  maximum?: number;
  decision?: string;
  busy: boolean;
  onSubmit: (body: { paymentId: number; amount: number; reason: string; policySnapshot: string }) => Promise<boolean>;
}

export default function RefundRequestForm({ payments, maximum = Infinity, decision, busy, onSubmit }: Props) {
  const [paymentId, setPaymentId] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [policy, setPolicy] = useState('');
  const eligible = payments.filter(payment => (payment.refundableAmount ?? 0) > 0);
  const selected = eligible.find(payment => payment.paymentId === paymentId);
  const limit = Math.min(maximum, selected?.refundableAmount ?? 0);

  if (eligible.length === 0) return <p className='text-sm text-gray-600'>Không còn giao dịch đủ điều kiện hoàn tiền.</p>;

  return <form className='mss-stack' onSubmit={async event => {
    event.preventDefault();
    if (!selected || !reason.trim() || !Number.isSafeInteger(Number(amount)) || Number(amount) < 1 || Number(amount) > limit) return;
    const policySnapshot = decision ?? policy.trim();
    if (!policySnapshot) return;
    if (await onSubmit({ paymentId: selected.paymentId, amount: Number(amount), reason: reason.trim(), policySnapshot })) {
      setPaymentId(null); setAmount(''); setReason(''); setPolicy('');
    }
  }}>
    <fieldset className='space-y-2'>
      <legend className='font-semibold'>Giao dịch dùng để ghi nhận khoản hoàn</legend>
      {eligible.map(payment => <label key={payment.paymentId} className='flex items-center gap-2 rounded-lg border p-2'>
        <input type='radio' name='refund-payment' required checked={paymentId === payment.paymentId} disabled={busy}
          onChange={() => {
            setPaymentId(payment.paymentId);
            setAmount(String(Math.min(maximum, payment.refundableAmount ?? 0)));
          }} />
        <span>#{payment.paymentId} · {PAYMENT_TYPE[payment.paymentType]?.label ?? 'Thanh toán'} · Còn có thể hoàn {formatVnd(payment.refundableAmount)}</span>
      </label>)}
    </fieldset>
    <label className='mss-field'>Số tiền hoàn từ giao dịch đã chọn
      <input className='mss-input' type='number' min={1} max={limit} step={1} required disabled={!selected || busy}
        value={amount} onChange={event => setAmount(event.target.value)} />
    </label>
    <label className='mss-field'>Lý do hoàn tiền
      <textarea className='mss-textarea' required maxLength={500} value={reason} onChange={event => setReason(event.target.value)} />
    </label>
    {!decision && <label className='mss-field'>Căn cứ duyệt hoàn tiền
      <textarea className='mss-textarea' required maxLength={2000} value={policy} onChange={event => setPolicy(event.target.value)} />
    </label>}
    <button className='mss-button mss-button--secondary self-start'
      disabled={busy || !selected || Number(amount) < 1 || Number(amount) > limit || !reason.trim() || (!decision && !policy.trim())}>
      Tạo khoản hoàn thủ công
    </button>
  </form>;
}
