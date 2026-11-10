import { useCallback, useEffect, useRef, useState } from 'react';
import { paymentApi, type FinanceSummary } from './paymentApi';
import { ApiError } from '../../services/api/http';
import { formatVnd } from '../../utils/format';
import RefundRequestForm from './RefundRequestForm';
import RefundTransfer from './RefundTransfer';

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
  const keys = useRef<Record<string, string>>({});
  const load = useCallback(() => paymentApi.summary(sellerOrderId).then(setSummary).catch(e => setError(message(e))), [sellerOrderId]);
  useEffect(() => { if (!initialSummary) void load(); }, [initialSummary, load]);
  useEffect(() => { if (initialSummary) setSummary(initialSummary); }, [initialSummary]);

  async function act(command: string, body?: unknown) {
    if (busy) return false;
    setBusy(true); setError(''); setNotice('');
    const signature = `${command}:${JSON.stringify(body)}`;
    keys.current[signature] ||= crypto.randomUUID();
    try {
      const result = await paymentApi.command(sellerOrderId, command, body, keys.current[signature]);
      setSummary(result);
      delete keys.current[signature];
      setReason(''); setEvidence(''); setAmount('');
      setAdditionalEvidence('');
      setNotice('Đã cập nhật hồ sơ khiếu nại.');
      return true;
    } catch (e) { setError(message(e)); return false; }
    finally { setBusy(false); }
  }

  if (!summary) return <div className="rounded-xl border p-4 text-sm">{error || 'Đang tải khiếu nại…'}</div>;
  const active = summary.disputes.find(d => d.status !== 'RESOLVED');
  return <section className="rounded-xl border border-blue-100 bg-white p-4 space-y-4 text-sm">
    <div className="flex justify-between gap-3"><h4 className="font-bold text-blue-950">Khiếu nại đơn nhà bán #{sellerOrderId}</h4>
      <button type="button" className="text-blue-700 underline" onClick={() => void load()}>Tải lại</button></div>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {notice && <p role="status" className="text-green-700">{notice}</p>}
    {summary.disputes.map(d => {
      const refunds = summary.refunds.filter(r => r.disputeId === d.id);
      const allocated = refunds.filter(r => r.status !== "REJECTED").reduce((sum, r) => sum + (r.amount ?? 0), 0);
      const paid = refunds.filter(r => r.status === "SUCCESS").reduce((sum, r) => sum + (r.amount ?? 0), 0);
      const award = d.amount ?? 0;
      const toAllocate = Math.max(0, award - allocated);
      return <div key={d.id} className="border-t pt-3 space-y-2">
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
      {role === 'admin' && (d.status === 'REFUND_PENDING' || refunds.length > 0) && <div className="space-y-3">
        <p>Đã duyệt {formatVnd(award)} · Đã chuyển {formatVnd(paid)} · Còn phải chuyển {formatVnd(Math.max(0, award - paid))}.</p>
        {refunds.map(refund => <RefundTransfer key={refund.id} orderId={sellerOrderId} refund={refund} busy={busy}
          onUpdated={setSummary} onReject={reason => act("refunds/" + refund.id + "/reject", { reason })} />)}
        {d.status === 'REFUND_PENDING' && toAllocate > 0 && <>
          <p>Còn {formatVnd(toAllocate)} chưa được gắn vào giao dịch để hoàn.</p>
          <RefundRequestForm payments={summary.payments} maximum={toAllocate} busy={busy}
            decision={"Khiếu nại #" + d.id + " · " + (d.resolution ?? "Quyết định hoàn tiền")}
            onSubmit={body => act("refunds", { ...body, disputeId: d.id })} />
        </>}
      </div>}
    </div>;
    })}
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
