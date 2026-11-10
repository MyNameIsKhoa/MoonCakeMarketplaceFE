import { useEffect, useRef, useState } from 'react';
import { paymentApi, type FinanceSummary, type TransferInstruction } from './paymentApi';
import { formatVnd } from '../../utils/format';

interface Props {
  orderId: number;
  kind: TransferInstruction['kind'];
  transferId: number;
  onUpdated: (summary: FinanceSummary) => void;
  onBusyChange?: (busy: boolean) => void;
}

export default function TransferInstructions({ orderId, kind, transferId, onUpdated, onBusyChange }: Props) {
  const [transfer, setTransfer] = useState<TransferInstruction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reference, setReference] = useState('');
  const [evidence, setEvidence] = useState('');
  const prepareKey = useRef<string | null>(null);
  const confirmAttempt = useRef<{ payload: string; key: string } | null>(null);
  const action = kind === 'REFUND' ? 'hoàn tiền' : 'giải ngân';

  useEffect(() => {
    let active = true;
    paymentApi.transfers(orderId).then(result => {
      if (active) setTransfer(result.transfers.find(t => t.kind === kind && t.id === transferId) ?? null);
    }).catch(() => { if (active) setError('Không tải được hướng dẫn chuyển khoản.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [orderId, kind, transferId]);

  async function prepare() {
    setBusy(true); onBusyChange?.(true); setError('');
    try {
      prepareKey.current ??= crypto.randomUUID();
      const result = await paymentApi.prepareTransfer(orderId, kind, transferId, prepareKey.current);
      setTransfer(result.transfers.find(t => t.kind === kind && t.id === transferId) ?? null);
    } catch (e) {
      const message = e instanceof Error ? e.message : '';
      setError(message.includes('RECIPIENT_ACCOUNT_MISSING')
        ? 'Người nhận chưa khai báo tài khoản nhận tiền.' : 'Không chuẩn bị được QR. Vui lòng thử lại.');
    } finally { setBusy(false); onBusyChange?.(false); }
  }

  async function confirm(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !transfer?.qrImageUrl || !reference.trim()) return;
    setBusy(true); onBusyChange?.(true); setError('');
    const body = { reference: reference.trim(), evidenceUrl: evidence.trim() };
    const payload = JSON.stringify(body);
    if (confirmAttempt.current?.payload !== payload) confirmAttempt.current = { payload, key: crypto.randomUUID() };
    try {
      const resource = kind === 'REFUND' ? 'refunds' : 'settlements';
      onUpdated(await paymentApi.command(orderId, resource + '/' + transferId + '/confirm', body, confirmAttempt.current.key));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không xác nhận được chuyển khoản.');
    } finally { setBusy(false); onBusyChange?.(false); }
  }

  if (loading) return <p role='status'>Đang tải thông tin chuyển khoản…</p>;
  return <section className='rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3 text-sm'>
    {error && <p role='alert' className='text-red-700'>{error}</p>}
    {!transfer && !error && <p>Khoản chuyển này không còn chờ xử lý. Hãy tải lại đơn hàng.</p>}
    {transfer && <>
      <p>Số tiền phải chuyển <strong>{formatVnd(transfer.amount)}</strong> · Nội dung <strong>{transfer.memo}</strong></p>
      {transfer.qrImageUrl ? <>
        <p>Người nhận <strong>{transfer.accountHolder}</strong> · {transfer.bankName} · {transfer.accountNumber}</p>
        <img src={transfer.qrImageUrl} alt='Mã QR chuyển khoản' width={270} height={320} className='max-w-full' />
        <p>Đối chiếu người nhận và số tiền trong ứng dụng ngân hàng. Xác nhận bên dưới sau khi giao dịch thành công.</p>
        <form className='mss-stack' onSubmit={confirm}>
          <label className='mss-field'>Mã giao dịch chuyển khoản
            <input className='mss-input' required maxLength={255} value={reference} onChange={e => setReference(e.target.value)} />
          </label>
          <label className='mss-field'>Liên kết HTTPS tới chứng từ
            <input className='mss-input' type='url' pattern='https://.+' required maxLength={1000}
              value={evidence} onChange={e => setEvidence(e.target.value)} />
          </label>
          <button className='mss-button mss-button--primary mss-button--sm self-start' disabled={busy || !reference.trim()}>
            Xác nhận đã {action}
          </button>
        </form>
      </> : <button type='button' disabled={busy} onClick={() => void prepare()}
        className='mss-button mss-button--secondary mss-button--sm'>Chốt tài khoản và tạo QR</button>}
    </>}
  </section>;
}
