import { useCallback, useEffect, useRef, useState } from 'react';
import { paymentApi, type FinanceSummary } from './paymentApi';
import { ApiError } from '../../services/api/http';
import { formatVnd } from '../../utils/format';
import { PAYMENT_TYPE } from '../../utils/status';

type Role = 'buyer' | 'seller' | 'admin';
const statusText: Record<string, string> = {
  OPEN: 'Chờ nhà bán phản hồi', ADMIN_REVIEW: 'Chờ admin phân xử',
  REFUND_PENDING: 'Chờ hoàn tiền', RESOLVED: 'Đã xử lý',
};
const errors: Record<string, string> = {
  DISPUTE_WINDOW_CLOSED: 'Đã hết 7 ngày kể từ khi giao hàng.',
  DELIVERY_NOT_OVERDUE: 'Chưa đến hạn giao hàng.',
  DISPUTE_REQUIRES_PAYMENT: 'Đơn chưa có thanh toán thành công.',
  DISPUTE_ALREADY_OPEN: 'Đơn này đã có khiếu nại đang xử lý.',
  DISPUTE_DUPLICATE: 'Vấn đề này đã có hồ sơ khiếu nại. Vui lòng xem lại kết quả hoặc liên hệ hỗ trợ.',
  SELLER_RESPONSE_WINDOW_OPEN: 'Vui lòng đợi nhà bán phản hồi hoặc đủ 48 giờ.',
  SETTLEMENT_ALREADY_CREATED: 'Đơn đã tạo khoản giải ngân; vui lòng liên hệ hỗ trợ để xử lý thủ công.',
  PAYOUT_ALREADY_RESERVED: 'Khoản giải ngân đã chuyển hoặc đang chuyển. Vui lòng liên hệ hỗ trợ.',
  DISPUTE_AUTHORITY_NOT_CONFIGURED: 'Quyền phân xử admin chưa được bật trong cấu hình Commerce.',
};
function message(error: unknown) {
  if (error instanceof ApiError) return errors[error.code] || error.message;
  return error instanceof Error ? error.message : 'Không kết nối được Commerce. Vui lòng tải lại trạng thái.';
}
function evidenceUrl(value: string | null) {
  try { return value && new URL(value).protocol === 'https:' ? value : null; }
  catch { return null; }
}

export default function DisputePanel({ sellerOrderId, role, initialSummary }: {
  sellerOrderId: number; role: Role; initialSummary?: FinanceSummary;
}) {
  const [summary, setSummary] = useState<FinanceSummary | null>(initialSummary ?? null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');
  const [evidence, setEvidence] = useState('');
  const [additionalEvidence, setAdditionalEvidence] = useState('');
  const [decision, setDecision] = useState('REJECT');
  const [amount, setAmount] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [reference, setReference] = useState('');
  const keys = useRef<Record<string, string>>({});
  const load = useCallback(() => paymentApi.summary(sellerOrderId).then(setSummary).catch(e => setError(message(e))), [sellerOrderId]);
  useEffect(() => { if (!initialSummary) void load(); }, [initialSummary, load]);
  useEffect(() => { if (initialSummary) setSummary(initialSummary); }, [initialSummary]);

  async function act(command: string, body?: unknown) {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    const signature = `${command}:${JSON.stringify(body)}`;
    keys.current[signature] ||= crypto.randomUUID();
    try {
      const result = await paymentApi.command(sellerOrderId, command, body, keys.current[signature]);
      setSummary(result);
      delete keys.current[signature];
      setReason(''); setEvidence(''); setAmount(''); setReference('');
      setAdditionalEvidence('');
      setNotice('Đã cập nhật hồ sơ khiếu nại.');
    } catch (e) { setError(message(e)); }
    finally { setBusy(false); }
  }

  if (!summary) return <div className="rounded-xl border p-4 text-sm">{error || 'Đang tải khiếu nại…'}</div>;
  const active = summary.disputes.find(d => d.status !== 'RESOLVED');
  const allocatedRefund = active ? summary.refunds.filter(r => r.disputeId === active.id && r.status !== 'REJECTED')
    .reduce((total, r) => total + (r.amount ?? 0), 0) : 0;
  const awardToAllocate = Math.max(0, (active?.amount ?? 0) - allocatedRefund);
  return <section className="rounded-xl border border-blue-100 bg-white p-4 space-y-4 text-sm">
    <div className="flex justify-between gap-3"><h4 className="font-bold text-blue-950">Khiếu nại đơn nhà bán #{sellerOrderId}</h4>
      <button type="button" className="text-blue-700 underline" onClick={() => void load()}>Tải lại</button></div>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {notice && <p role="status" className="text-green-700">{notice}</p>}
    {summary.disputes.map(d => <div key={d.id} className="border-t pt-3 space-y-2">
      <p><strong>Hồ sơ #{d.id}</strong> · {statusText[d.status] || d.status}</p>
      <p>Lý do: {d.reason}</p>
      {evidenceUrl(d.evidenceUrl) && <a className="text-blue-700 underline" href={evidenceUrl(d.evidenceUrl) || undefined} target="_blank" rel="noreferrer">Bằng chứng người mua</a>}
      {summary.history.filter(h => h.eventType === 'DISPUTE_EVIDENCE_ADDED' && h.resourceId === d.id && evidenceUrl(h.detail))
        .map(h => <a key={h.auditId} className="block text-blue-700 underline" href={evidenceUrl(h.detail) || undefined} target="_blank" rel="noreferrer">Bằng chứng bổ sung · {h.actor}</a>)}
      {d.sellerResponse && <p>Nhà bán phản hồi: {d.sellerResponse}</p>}
      {d.decisionType && <p>Quyết định: {d.decisionType === 'REJECT' ? 'Không hoàn tiền' : `Hoàn ${formatVnd(d.amount ?? 0)}`}</p>}
      {d.resolution && <p>Căn cứ xử lý: {d.resolution}</p>}
      {d.status !== 'RESOLVED' && <form className="flex flex-wrap gap-2" onSubmit={e => { e.preventDefault(); void act(`disputes/${d.id}/evidence`, { evidenceUrl: additionalEvidence }); }}>
        <input className="mss-input flex-1" type="url" pattern="https://.*" required placeholder="Link HTTPS bằng chứng bổ sung" value={additionalEvidence} onChange={e => setAdditionalEvidence(e.target.value)} />
        <button disabled={busy || !additionalEvidence} className="mss-button mss-button--secondary mss-button--sm">Thêm bằng chứng</button>
      </form>}
      {d.status === 'OPEN' && (role === 'buyer' || role === 'admin') && <button disabled={busy} className="mss-button mss-button--secondary mss-button--sm"
        onClick={() => void act(`disputes/${d.id}/escalate`)}>{role === 'admin' ? 'Chuyển sang phân xử' : 'Yêu cầu admin phân xử'}</button>}
      {d.status === 'OPEN' && role === 'seller' && !d.respondedAt && <form className="space-y-2" onSubmit={e => { e.preventDefault(); void act(`disputes/${d.id}/respond`, { reason: reason.trim() }); }}>
        <label className="block">Phản hồi cho người mua<textarea className="mss-textarea" required maxLength={500} value={reason} onChange={e => setReason(e.target.value)} /></label>
        <button disabled={busy || !reason.trim()} className="mss-button mss-button--primary mss-button--sm">Gửi phản hồi</button>
      </form>}
      {d.status === 'ADMIN_REVIEW' && role === 'admin' && <form className="space-y-2" onSubmit={e => { e.preventDefault(); void act(`disputes/${d.id}/decision`, {
        decision, amount: decision === 'REFUND' ? Number(amount) : null, reason: reason.trim(),
      }); }}>
        <select className="mss-select" value={decision} onChange={e => setDecision(e.target.value)}><option value="REJECT">Từ chối hoàn tiền</option><option value="REFUND">Chấp thuận hoàn tiền</option></select>
        {decision === 'REFUND' && <label className="block">Số tiền hoàn (đ)<input className="mss-input" type="number" min="1" max={summary.context.paidAmount} required value={amount} onChange={e => setAmount(e.target.value)} /></label>}
        <label className="block">Lý do quyết định<textarea className="mss-textarea" required maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} /></label>
        <button disabled={busy || !reason.trim()} className="mss-button mss-button--primary mss-button--sm">Ghi quyết định</button>
      </form>}
      {d.status === 'REFUND_PENDING' && role === 'admin' && <div className="space-y-3">
        <p>Đã duyệt hoàn {formatVnd(d.amount ?? 0)} · Chưa tạo khoản hoàn cho {formatVnd(awardToAllocate)}.</p>
        <p>Chọn một giao dịch đã thu để ghi nhận tiền hoàn. Không cần chia đều; chỉ dùng giao dịch khác nếu giao dịch đã chọn không đủ tiền.</p>
        {summary.refunds.filter(r => r.disputeId === d.id).map(r => <div key={r.id} className="border rounded p-2 space-y-2">
          <p>Khoản hoàn #{r.id}: {formatVnd(r.amount ?? 0)} · {r.status}</p>
          {r.status === 'MANUAL_REVIEW' && <form className="space-y-2" onSubmit={e => { e.preventDefault(); void act(`refunds/${r.id}/confirm`, { reference, evidenceUrl: evidence }); }}>
            <input className="mss-input" required maxLength={255} placeholder="Mã chuyển khoản thành công" value={reference} onChange={e => setReference(e.target.value)} />
            <input className="mss-input" required type="url" pattern="https://.*" placeholder="Link HTTPS chứng từ chuyển khoản" value={evidence} onChange={e => setEvidence(e.target.value)} />
            <button disabled={busy} className="mss-button mss-button--primary mss-button--sm">Xác nhận đã hoàn tiền</button>
          </form>}
        </div>)}
        {awardToAllocate > 0 ? <form className="space-y-2" onSubmit={e => { e.preventDefault(); void act('refunds', {
          paymentId: Number(paymentId), amount: Number(amount), disputeId: d.id,
          reason: reason.trim(), policySnapshot: `DISPUTE-${d.id}: ${d.resolution || reason.trim()}`,
        }); }}>
          <fieldset className="space-y-2"><legend className="font-medium">Giao dịch dùng để ghi nhận khoản hoàn</legend>
            {summary.payments.filter(p => p.status === 'SUCCESS' && p.holdStatus === 'HELD').map(p =>
              <label key={p.paymentId} className="flex cursor-pointer items-center gap-3 rounded-lg border border-blue-200 p-3">
                <input type="radio" name={`refund-payment-${d.id}`} required disabled={busy}
                  checked={paymentId === String(p.paymentId)} onChange={() => {
                    setPaymentId(String(p.paymentId)); setAmount(String(Math.min(awardToAllocate, p.amount)));
                  }} />
                <span>#{p.paymentId} · {PAYMENT_TYPE[p.paymentType]?.label || p.paymentType} · {formatVnd(p.amount)}</span>
              </label>
            )}
          </fieldset>
          <label className="block">Số tiền ghi nhận từ giao dịch đã chọn
            <input className="mss-input" type="number" min="1" max={Math.min(awardToAllocate,
              summary.payments.find(p => String(p.paymentId) === paymentId)?.amount ?? awardToAllocate)}
              required value={amount} onChange={e => setAmount(e.target.value)} />
          </label>
          <textarea className="mss-textarea" required maxLength={500} placeholder="Lý do hoàn tiền" value={reason} onChange={e => setReason(e.target.value)} />
          <button disabled={busy || !paymentId || !reason.trim()} className="mss-button mss-button--secondary mss-button--sm">Tạo khoản hoàn thủ công</button>
        </form> : <p>Đã tạo đủ khoản hoàn được duyệt. Chờ xác nhận các khoản hoàn sau khi chuyển tiền thực tế.</p>}
      </div>}
    </div>)}
    {role === 'buyer' && !active && (!summary.context.disputeDeadlineAt || Date.now() <= Date.parse(summary.context.disputeDeadlineAt))
      && !summary.settlements.some(s => ['PROCESSING', 'SUCCESS'].includes(s.status)) && <form className="space-y-2" onSubmit={e => { e.preventDefault(); void act('disputes', { reason: reason.trim(), evidenceUrl: evidence || null }); }}>
      <p className="text-gray-600">Đã thanh toán: có thể báo thiếu, sai, hỏng hàng trong 7 ngày từ khi giao; hoặc báo chưa nhận khi quá ngày giao hẹn. Trước khi thanh toán, dùng yêu cầu hủy đơn.</p>
      <label className="block">Nội dung khiếu nại<textarea className="mss-textarea" required maxLength={500} value={reason} onChange={e => setReason(e.target.value)} /></label>
      <label className="block">Link bằng chứng HTTPS (nếu có)<input className="mss-input" type="url" pattern="https://.*" value={evidence} onChange={e => setEvidence(e.target.value)} /></label>
      <button disabled={busy || !reason.trim()} className="mss-button mss-button--secondary mss-button--sm">Gửi khiếu nại</button>
    </form>}
    {role === 'buyer' && summary.context.disputeDeadlineAt && <p className="text-gray-600">Hạn gửi khiếu nại: {new Date(summary.context.disputeDeadlineAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}.</p>}
    {role === 'buyer' && summary.settlements.some(s => ['PROCESSING', 'SUCCESS'].includes(s.status)) && <p className="text-gray-600">Đơn đang hoặc đã giải ngân. Liên hệ hỗ trợ để xử lý trường hợp phát sinh.</p>}
    {!summary.disputes.length && role !== 'buyer' && <p className="text-gray-500">Chưa có khiếu nại.</p>}
  </section>;
}
