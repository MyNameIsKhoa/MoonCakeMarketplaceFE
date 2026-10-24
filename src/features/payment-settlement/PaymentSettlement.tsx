import { FormEvent, useEffect, useRef, useState } from 'react';
import { RefreshCw, Wallet, ShieldCheck, ExternalLink } from 'lucide-react';
import { ApiError } from '../../services/api/http';
import { paymentApi, FinanceSummary, Payment } from './paymentApi';
import StatusBadge from '../../components/ui/StatusBadge';
import { FINANCE_STATUS, PAYMENT_TYPE } from '../../utils/status';
import { formatVnd } from '../../utils/format';
import CustomerOrderPayment from './CustomerOrderPayment';

const messages: Record<string, string> = {
  PAYMENT_CONTEXT_NOT_READY: 'Chưa có dữ liệu đơn hàng từ bộ phận xử lý đơn. Vui lòng thử lại sau.',
  ORDER_NOT_ACCEPTED: 'Đơn hàng chưa được chấp nhận. Chưa thể thanh toán.',
  FINANCE_ACCESS_DENIED: 'Bạn không có quyền truy cập giao dịch của đơn này.',
  HTTP_403: 'Bạn chưa đăng nhập hoặc không có quyền thực hiện thao tác này.',
  FINANCE_ADMIN_REQUIRED: 'Thao tác này cần tài khoản quản trị được cấp quyền xử lý tài chính.',
  PAYMENT_BLOCKED_BY_CASE: 'Đơn đang có yêu cầu hủy, hoàn tiền hoặc tranh chấp. Chưa thể tạo thanh toán mới.',
  DEPOSIT_REQUIRED: 'Vui lòng thanh toán đủ tiền cọc trước.',
  DELIVERY_DATE_REQUIRED: 'Đơn hàng chưa có ngày giao được xác nhận.',
  PAYMENT_DEADLINE_PASSED: 'Đã quá hạn thanh toán. Vui lòng liên hệ để cập nhật lịch giao.',
  ACTIVE_PAYMENT_EXISTS: 'Đơn có giao dịch đang chờ. Hãy kiểm tra hoặc đối soát giao dịch đó.',
  PAYOS_NOT_CONFIGURED: 'Kênh thanh toán đang được cấu hình.',
  PAYOS_RECONCILIATION_UNAVAILABLE: 'Chưa liên hệ được payOS. Giữ nguyên giao dịch và thử đối soát lại.',
  SETTLEMENT_NOT_ELIGIBLE: 'Đơn chưa đủ điều kiện giải ngân.',
  DISPUTE_AUTHORITY_NOT_CONFIGURED: 'Quyền phân xử chưa được cấu hình.',
  PAYOUT_ALREADY_RESERVED: 'Khoản giải ngân đang được xử lý hoặc đã hoàn tất.',
};
function errorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Vui lòng đăng nhập bằng tài khoản có quyền xem đơn hàng.';
    return messages[error.code] || `Không thực hiện được yêu cầu (${error.code}).`;
  }
  return 'Chưa nhận được phản hồi. Kiểm tra lại trạng thái trước khi thử tiếp; không chuyển tiền thêm.';
}
function date(value: string | null) {
  return value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value)) : 'Chưa xác định';
}
function safeUrl(value: string | null) {
  try { const url = new URL(value || ''); return url.protocol === 'https:' ? url.href : undefined; } catch { return undefined; }
}

export default function PaymentSettlement() {
  const customerOrderId = Number(sessionStorage.getItem('financeCustomerOrderId'));
  if (Number.isSafeInteger(customerOrderId) && customerOrderId > 0) {
    return <CustomerOrderPayment orderId={customerOrderId} />;
  }
  return <SellerPaymentSettlement />;
}

function SellerPaymentSettlement() {
  const [orderInput, setOrderInput] = useState(() => sessionStorage.getItem('financeOrderId') || '');
  const [orderId, setOrderId] = useState<number | null>(null);
  const [data, setData] = useState<FinanceSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(() => ['return', 'cancel'].includes(new URLSearchParams(location.search).get('finance') || '')
    ? 'Đã trở về từ payOS. Hãy tải đơn và kiểm tra trạng thái; kết quả thanh toán được xác nhận qua webhook hoặc đối soát.' : '');
  const [reason, setReason] = useState('');
  const [evidence, setEvidence] = useState('');
  const [action, setAction] = useState('cancellations');
  const [resourceId, setResourceId] = useState('');
  const [amount, setAmount] = useState('');
  const [policy, setPolicy] = useState('');
  const [reference, setReference] = useState('');
  const keys = useRef<Record<string, string>>({});
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  async function load(event?: FormEvent) {
    event?.preventDefault();
    const id = Number(orderInput);
    if (!Number.isSafeInteger(id) || id <= 0) { setError('Nhập mã đơn nhà bán dạng số nguyên dương.'); return; }
    setBusy(true); setError(''); setNotice(''); setData(null); setOrderId(null);
    setReason(''); setEvidence(''); setResourceId(''); setAmount(''); setPolicy(''); setReference('');
    try {
      const result = await paymentApi.summary(id);
      if (!mounted.current) return;
      setData(result); setOrderId(id); sessionStorage.setItem('financeOrderId', String(id));
    } catch (e) { if (mounted.current) setError(errorMessage(e)); }
    finally { if (mounted.current) setBusy(false); }
  }

  async function run(operation: string, fn: (key: string) => Promise<unknown>) {
    if (busy || !orderId) return;
    setBusy(true); setError(''); setNotice('');
    const signature = `${orderId}:${operation}`;
    keys.current[signature] ||= crypto.randomUUID();
    try {
      await fn(keys.current[signature]);
      const result = await paymentApi.summary(orderId);
      if (!mounted.current) return;
      setData(result); delete keys.current[signature];
      setNotice('Đã cập nhật trạng thái từ máy chủ.');
    } catch (e) { if (mounted.current) setError(errorMessage(e)); }
    finally { if (mounted.current) setBusy(false); }
  }

  function submitCase(event: FormEvent) {
    event.preventDefault();
    if (!orderId) return;
    const id = Number(resourceId);
    let command = action;
    let body: unknown = { reason };
    if (action === 'disputes') body = { reason, evidenceUrl: evidence || null };
    if (action === 'refunds') body = { paymentId: id, amount: Number(amount), reason, policySnapshot: policy };
    if (action.includes('{id}')) {
      if (!Number.isSafeInteger(id) || id <= 0) { setError('Nhập mã yêu cầu hợp lệ.'); return; }
      command = action.replace('{id}', String(id));
      if (action.includes('confirm')) body = { reference, evidenceUrl: evidence };
      if (action.includes('decision')) body = { approve: policy === 'APPROVE', reason };
      if (action.includes('/evidence')) body = { evidenceUrl: evidence };
      if (action.includes('/payout')) body = undefined;
    }
    void run(`${command}:${JSON.stringify(body)}`, key => paymentApi.command(orderId, command, body, key));
  }

  const needsId = action.includes('{id}') || action === 'refunds';
  const proof = action.includes('confirm');
  const noReason = proof || action.includes('/payout') || action.includes('/evidence') || action === 'settlements';

  function paymentCard(p: Payment) {
    const expired = p.expiresAt !== null && new Date(p.expiresAt).getTime() <= Date.now() && p.status !== 'SUCCESS';
    const uncertain = ['CREATING', 'RECONCILING'].includes(p.status);
    return <article className="mss-card mss-stack" key={p.paymentId}>
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div><h3 className="mss-card-title">{PAYMENT_TYPE[p.paymentType]?.label || p.paymentType}</h3><p className="text-sm text-gray-500">Giao dịch #{p.paymentId}</p></div>
        <StatusBadge map={FINANCE_STATUS} status={p.status} />
      </div>
      <p className="text-2xl font-bold">{formatVnd(p.amount)}</p>
      {p.dueAt && <p>Hạn nghĩa vụ: {date(p.dueAt)} (giờ Việt Nam)</p>}
      {p.expiresAt && <p className="text-sm">Link hết hạn: {date(p.expiresAt)}</p>}
      {p.holdStatus && <p className="text-sm">Phân bổ sổ cái: {p.holdStatus === 'HELD' ? 'Đã thu, chờ giải ngân' : 'Đã giải ngân'}</p>}
      {uncertain && <p role="status" className="text-amber-800">Đang đối soát. Vui lòng kiểm tra trước khi thanh toán tiếp.</p>}
      {expired && <p className="text-amber-800">Link đã quá thời hạn hiển thị. Đối soát để xác nhận trạng thái.</p>}
      <div className="flex flex-wrap gap-2">
        {!p.checkoutUrl && !uncertain && p.status === 'PENDING' && !p.expiresAt && <button disabled={busy} className="mss-button mss-button--primary" onClick={() => void run(`initiate:${p.paymentId}`, key => paymentApi.initiate(p.paymentId, key))}>Tạo link thanh toán</button>}
        {safeUrl(p.checkoutUrl) && p.status === 'PENDING' && !expired && <a className="mss-button mss-button--primary" href={safeUrl(p.checkoutUrl)} target="_blank" rel="noreferrer">Mở QR / thanh toán payOS <ExternalLink size={16} /></a>}
        {p.expiresAt && p.status !== 'SUCCESS' && <>
          <button disabled={busy} className="mss-button mss-button--secondary" onClick={() => void run(`reconcile:${p.paymentId}`, () => paymentApi.reconcile(p.paymentId))}>Đối soát</button>
          <button disabled={busy} className="mss-button mss-button--secondary" onClick={() => void run(`cancel-link:${p.paymentId}`, () => paymentApi.cancelLink(p.paymentId))}>Hủy link chưa trả</button>
        </>}
        {['CANCELLED', 'EXPIRED', 'FAILED'].includes(p.status) && <button disabled={busy} className="mss-button mss-button--primary" onClick={() => void run(`retry:${p.paymentId}`, key => paymentApi.initiate(p.paymentId, key))}>Tạo link mới</button>}
      </div>
    </article>;
  }

  return <div className="mss-container mss-page mss-stack">
    <header className="mss-page-header"><div><h1 className="mss-page-title flex items-center gap-3"><Wallet /> Thanh toán & đối soát</h1><p className="mt-2 text-gray-600">Theo dõi tiền cọc, khoản còn lại và xử lý giao dịch của từng đơn nhà bán.</p></div></header>
    <form onSubmit={load} className="mss-card flex flex-wrap items-end gap-3">
      <label className="mss-field flex-1">Mã đơn nhà bán<input className="mss-input" inputMode="numeric" value={orderInput} onChange={e => setOrderInput(e.target.value)} required placeholder="Nhập mã đơn nhà bán" /></label>
      <button className="mss-button mss-button--primary" disabled={busy}><RefreshCw size={16} /> {busy ? 'Đang xử lý…' : 'Tải giao dịch'}</button>
    </form>
    {error && <p role="alert" className="mss-card text-red-800">{error}</p>}
    {notice && <p role="status" className="mss-card text-primary-800">{notice}</p>}
    {!data && !busy && !error && <p className="mss-card text-gray-600">Nhập mã đơn để xem nghĩa vụ và lịch sử thanh toán.</p>}
    {data && <>
      <section className="mss-card mss-stack"><h2 className="mss-section-title">Đơn nhà bán #{data.context.sellerOrderId}</h2>
        <div className="mss-grid mss-grid-3"><p>Tổng giá trị<br /><strong>{formatVnd(data.context.totalAmount)}</strong></p><p>Đã thu thành công<br /><strong>{formatVnd(data.context.paidAmount)}</strong></p><p>Ngày giao<br /><strong>{data.context.deliveryDate || 'Chưa xác định'}</strong></p></div>
        {!data.context.accepted && <p>Đang chờ chấp nhận đơn hàng, chưa phát sinh nghĩa vụ thanh toán.</p>}
        <p className="text-sm text-gray-500 flex gap-2"><ShieldCheck size={18} /> Thanh toán chỉ được xác nhận khi máy chủ kiểm tra payOS.</p>
      </section>
      <section className="mss-grid mss-grid-3">{data.payments.length ? data.payments.map(paymentCard) : <p>Chưa có nghĩa vụ thanh toán.</p>}</section>
      <section className="mss-card mss-stack"><h2 className="mss-section-title">Hủy, hoàn tiền & tranh chấp</h2>
        {[...data.cancellations.map(c => ({ ...c, kind: 'Hủy đơn' })), ...data.refunds.map(c => ({ ...c, kind: 'Hoàn tiền' })), ...data.disputes.map(c => ({ ...c, kind: 'Tranh chấp' }))].map(c => <div className="border-b border-gray-200 pb-3" key={`${c.kind}:${c.id}`}>
          <div className="flex gap-3 flex-wrap"><strong>{c.kind} #{c.id}</strong><StatusBadge map={FINANCE_STATUS} status={c.status} /></div><p>{c.reason}</p>{c.amount !== null && <p>{formatVnd(c.amount)}</p>}{c.resolution && <p>{c.resolution}</p>}{safeUrl(c.evidenceUrl) && <a className="underline" href={safeUrl(c.evidenceUrl)} target="_blank" rel="noreferrer">Xem bằng chứng</a>}
        </div>)}
        {!data.cancellations.length && !data.refunds.length && !data.disputes.length && <p className="text-gray-500">Chưa có yêu cầu.</p>}
        <form onSubmit={submitCase} className="mss-stack">
          <label className="mss-field">Thao tác<select className="mss-select" value={action} onChange={e => setAction(e.target.value)}>
            <option value="cancellations">Gửi yêu cầu hủy đơn</option><option value="disputes">Mở tranh chấp</option><option value="disputes/{id}/evidence">Bổ sung bằng chứng tranh chấp</option>
            <optgroup label="Dành cho người xử lý được cấp quyền"><option value="cancellations/{id}/decision">Duyệt / từ chối hủy</option><option value="refunds">Đề xuất hoàn tiền thủ công</option><option value="refunds/{id}/reject">Từ chối hoàn tiền</option><option value="refunds/{id}/confirm">Xác nhận đã hoàn tiền</option><option value="disputes/{id}/resolve">Ghi kết quả phân xử</option><option value="settlements">Tạo khoản giải ngân</option><option value="settlements/{id}/payout">Bắt đầu giải ngân thủ công</option><option value="settlements/{id}/confirm">Xác nhận đã giải ngân</option></optgroup>
          </select></label>
          {needsId && <label className="mss-field">{action === 'refunds' ? 'Mã giao dịch thanh toán' : 'Mã yêu cầu / khoản giải ngân'}<input className="mss-input" type="number" min="1" step="1" required value={resourceId} onChange={e => setResourceId(e.target.value)} /></label>}
          {!noReason && <label className="mss-field">Lý do / kết quả xử lý<textarea className="mss-textarea" required maxLength={500} value={reason} onChange={e => setReason(e.target.value)} /></label>}
          {action === 'refunds' && <><label className="mss-field">Số tiền đề xuất (VND)<input className="mss-input" type="number" min="1" step="1" required value={amount} onChange={e => setAmount(e.target.value)} /></label><label className="mss-field">Phiên bản policy & căn cứ phê duyệt<textarea className="mss-textarea" required maxLength={2000} value={policy} onChange={e => setPolicy(e.target.value)} /></label></>}
          {action.includes('decision') && <label className="mss-field">Quyết định<select className="mss-select" required value={policy} onChange={e => setPolicy(e.target.value)}><option value="">Chọn quyết định</option><option value="APPROVE">Phê duyệt</option><option value="REJECT">Từ chối</option></select></label>}
          {(proof || action === 'disputes' || action.includes('/evidence')) && <label className="mss-field">Link bằng chứng (HTTPS)<input className="mss-input" type="url" pattern="https://.*" maxLength={1000} required={proof || action.includes('/evidence')} value={evidence} onChange={e => setEvidence(e.target.value)} /></label>}
          {proof && <label className="mss-field">Mã chuyển tiền thành công<input className="mss-input" required maxLength={255} value={reference} onChange={e => setReference(e.target.value)} /></label>}
          <p className="text-sm text-gray-500">Hoàn tiền và giải ngân cần người xử lý có quyền cùng bằng chứng chuyển tiền thành công.</p>
          <button disabled={busy} className="mss-button mss-button--primary">Gửi yêu cầu</button>
        </form>
      </section>
      <section className="mss-card mss-stack"><h2 className="mss-section-title">Giải ngân</h2><p>{data.eligibility.eligible ? 'Đã đủ điều kiện xem xét giải ngân.' : 'Chưa đủ điều kiện giải ngân.'}</p>
        {data.eligibility.blockingReasons.map(code => <p className="text-sm text-amber-800" key={code}>{({ OPEN_DISPUTE: 'Có tranh chấp đang mở', CANCELLATION: 'Có yêu cầu hủy đang chặn', REFUND: 'Có khoản hoàn tiền cần xử lý', ORDER_NOT_ACCEPTED: 'Đơn chưa được chấp nhận', NOT_FULLY_PAID: 'Chưa thu đủ tiền', DELIVERY_ACCEPTANCE_REQUIRED: 'Chờ giao hàng và nghiệm thu', FEE_BASIS_NOT_AGREED: 'Chờ chốt cơ sở tính phí', ROUNDING_NOT_AGREED: 'Chờ chốt quy tắc làm tròn', PAYMENT_RECONCILIATION_REQUIRED: 'Có giao dịch cần đối soát' } as Record<string, string>)[code] || code}</p>)}
        {data.settlements.map(s => <div className="border-t border-gray-200 pt-3" key={s.settlementId}><p>Giải ngân #{s.settlementId} <StatusBadge map={FINANCE_STATUS} status={s.status} /></p><p>Phí 5%: {formatVnd(s.feeAmount)} · Thực nhận: {formatVnd(s.supplierPayoutAmount)}</p></div>)}
      </section>
      <section className="mss-card mss-stack"><h2 className="mss-section-title">Lịch sử giao dịch</h2>{data.history.length ? data.history.map(h => <div className="border-b border-gray-200 pb-3" key={h.auditId}><p><strong>{h.eventType}</strong> · {date(h.createdAt)}</p><p className="text-sm text-gray-600">{h.detail}</p></div>) : <p>Chưa có lịch sử.</p>}</section>
    </>}
  </div>;
}
