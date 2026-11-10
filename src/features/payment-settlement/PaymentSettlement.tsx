import { type FormEvent, useRef, useState } from 'react';
import { Wallet } from 'lucide-react';
import { ApiError } from '../../services/api/http';
import { paymentApi, type FinanceSummary } from './paymentApi';
import StatusBadge from '../../components/ui/StatusBadge';
import { FINANCE_STATUS, PAYMENT_STATUS, PAYMENT_TYPE } from '../../utils/status';
import { formatDate, formatDateTime, formatVnd } from '../../utils/format';
import CustomerOrderPayment from './CustomerOrderPayment';
import TransferInstructions from './TransferInstructions';
import RefundRequestForm from './RefundRequestForm';
import RefundTransfer from './RefundTransfer';

const blockingReasons: Record<string, string> = {
  OPEN_DISPUTE: 'Khiếu nại đang xử lý', CANCELLATION: 'Yêu cầu hủy đang xử lý',
  REFUND: 'Còn khoản hoàn tiền cần xử lý', FULLY_REFUNDED: 'Đã hoàn toàn bộ tiền đơn',
  DISPUTE_WINDOW_OPEN: 'Chưa hết 7 ngày kể từ khi giao hàng', ORDER_NOT_ACCEPTED: 'Đơn chưa được chấp nhận',
  NOT_FULLY_PAID: 'Chưa thu đủ tiền', DELIVERY_ACCEPTANCE_REQUIRED: 'Chờ giao hàng và xác nhận nhận hàng',
  FEE_BASIS_NOT_AGREED: 'Chờ chốt cơ sở tính phí', ROUNDING_NOT_AGREED: 'Chờ chốt quy tắc làm tròn',
  PAYMENT_RECONCILIATION_REQUIRED: 'Có giao dịch cần kiểm tra trạng thái',
};

function message(error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === 'SELLER_ORDER_NOT_FOUND') return 'Không tìm thấy mã đơn nhà bán này.';
    if (error.code === 'RECIPIENT_ACCOUNT_MISSING') return 'Người nhận chưa khai báo tài khoản nhận tiền.';
    if (error.status === 403) return 'Bạn không có quyền xử lý tài chính.';
  }
  return error instanceof Error ? error.message : 'Không xử lý được giao dịch. Vui lòng thử lại.';
}

const auditLabel: Record<string, string> = {
  PAYMENT_COLLECTED: 'Đã ghi nhận thanh toán', PAYMENT_RECONCILED: 'Đã kiểm tra thanh toán',
  REFUND_REVIEW_REQUESTED: 'Đã tạo khoản hoàn tiền', REFUND_SUCCESS: 'Đã xác nhận hoàn tiền',
  REFUND_REJECTED: 'Đã từ chối khoản hoàn', SETTLEMENT_READY: 'Đã tạo khoản giải ngân',
  PAYOUT_MANUAL_PROCESSING: 'Đã chốt khoản giải ngân', PAYOUT_SUCCESS: 'Đã xác nhận giải ngân',
};
export default function PaymentSettlement({ onOrders }: { onOrders: () => void }) {
  const customerOrderId = Number(sessionStorage.getItem('financeCustomerOrderId'));
  if (Number.isSafeInteger(customerOrderId) && customerOrderId > 0) {
    return <CustomerOrderPayment key={customerOrderId} orderId={customerOrderId} />;
  }
  return <section className='mss-container mss-page mss-stack'>
    <h1 className='mss-page-title'>Thanh toán đơn hàng</h1>
    <p>Mở đơn hàng để thanh toán hoặc kiểm tra giao dịch của bạn.</p>
    <button type='button' className='mss-button mss-button--primary self-start' onClick={onOrders}>Xem đơn hàng</button>
  </section>;
}

export function AdminPaymentSettlement() {
  const [input, setInput] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [data, setData] = useState<FinanceSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showRefundForm, setShowRefundForm] = useState(false);
  const keys = useRef(new Map<string, string>());

  async function load(event: FormEvent) {
    event.preventDefault();
    const number = input.trim();
    if (busy || !number) return;
    setBusy(true); setError(''); setData(null); setShowRefundForm(false);
    try {
      setData(await paymentApi.summaryByNumber(number));
      setOrderNumber(number);
    } catch (e) { setError(message(e)); }
    finally { setBusy(false); }
  }

  async function run(command: string, body?: unknown) {
    if (busy || !data) return false;
    const orderId = data.context.sellerOrderId;
    const signature = JSON.stringify([orderId, command, body]);
    const key = keys.current.get(signature) ?? crypto.randomUUID();
    keys.current.set(signature, key);
    setBusy(true); setError('');
    try {
      setData(await paymentApi.command(orderId, command, body, key));
      keys.current.delete(signature);
      return true;
    } catch (e) { setError(message(e)); return false; }
    finally { setBusy(false); }
  }

  async function reconcile(paymentId: number) {
    if (!data || busy) return;
    setBusy(true); setError("");
    try {
      await paymentApi.reconcile(paymentId);
      setData(await paymentApi.summary(data.context.sellerOrderId));
    } catch (e) { setError(message(e)); }
    finally { setBusy(false); }
  }

  const updateTransferSummary = (updated: FinanceSummary) => setData(current =>
    current?.context.sellerOrderId === updated.context.sellerOrderId ? updated : current);

  const hasOpenDispute = data?.disputes.some(dispute => dispute.status !== 'RESOLVED');
  const payoutStarted = data?.settlements.some(settlement => ['PROCESSING', 'SUCCESS'].includes(settlement.status));
  const manualRefunds = data?.refunds.filter(refund => refund.disputeId == null) ?? [];

  return <div className='mss-container mss-page mss-stack'>
    <header className='mss-page-header'><div>
      <h1 className='mss-page-title flex items-center gap-3'><Wallet /> Đối soát và giải ngân</h1>
      <p className='mt-2 text-gray-600'>Tra cứu thanh toán, khoản hoàn và chi trả theo đơn nhà bán.</p>
    </div></header>
    <form onSubmit={load} className='mss-card flex flex-wrap items-end gap-3'>
      <label className='mss-field flex-1'>Mã đơn nhà bán
        <input className='mss-input' value={input} onChange={e => setInput(e.target.value)} required
          maxLength={100} placeholder='Nhập mã hiển thị trên đơn' />
      </label>
      <button className='mss-button mss-button--primary' disabled={busy || !input.trim()}>Tải giao dịch</button>
    </form>
    {error && <p role='alert' className='mss-card text-red-800'>{error}</p>}
    {busy && !data && <p role='status'>Đang tải giao dịch…</p>}
    {data && <>
      <section className='mss-card mss-stack'>
        <h2 className='mss-section-title'>Đơn {orderNumber}</h2>
        <div className='mss-grid mss-grid-3'>
          <p>Tổng giá trị<br /><strong>{formatVnd(data.context.totalAmount)}</strong></p>
          <p>Đã thu<br /><strong>{formatVnd(data.context.paidAmount)}</strong></p>
          <p>Ngày giao dự kiến<br /><strong>{data.context.deliveryDate ? formatDate(data.context.deliveryDate) : 'Chưa xác định'}</strong></p>
        </div>
      </section>
      <section className='mss-card mss-stack'>
        <h2 className='mss-section-title'>Giao dịch thanh toán</h2>
        {!data.payments.length && <p>Chưa có giao dịch.</p>}
        {data.payments.map(payment => <div className='border-b pb-3' key={payment.paymentId}>
          <p><strong>{PAYMENT_TYPE[payment.paymentType]?.label ?? 'Thanh toán'} #{payment.paymentId}</strong>
            {' · '}{formatVnd(payment.amount)} <StatusBadge map={PAYMENT_STATUS} status={payment.status} /></p>
          {payment.dueAt && <p>Hạn thanh toán {formatDateTime(payment.dueAt)}</p>}
          {(payment.expiresAt || ["CREATING", "RECONCILING", "CANCELLING"].includes(payment.status))
            && !["SUCCESS", "CANCELLED", "EXPIRED", "FAILED"].includes(payment.status) &&
            <button type="button" className="text-primary-700 underline" disabled={busy}
              onClick={() => void reconcile(payment.paymentId)}>Kiểm tra trạng thái</button>}
        </div>)}
      </section>
      {(manualRefunds.length > 0 || (!hasOpenDispute && !payoutStarted
        && data.payments.some(payment => (payment.refundableAmount ?? 0) > 0))) && <section className='mss-card mss-stack'>
        <h2 className='mss-section-title'>Hoàn tiền ngoài hồ sơ khiếu nại</h2>
        {manualRefunds.map(refund => <RefundTransfer key={refund.id} orderId={data.context.sellerOrderId}
          refund={refund} busy={busy} onUpdated={updateTransferSummary}
          onReject={reason => run('refunds/' + refund.id + '/reject', { reason })} />)}
        {!hasOpenDispute && !payoutStarted && data.payments.some(payment => (payment.refundableAmount ?? 0) > 0) && <>
          <button type='button' className='mss-button mss-button--secondary self-start'
            aria-expanded={showRefundForm} onClick={() => setShowRefundForm(open => !open)}>
            {showRefundForm ? 'Đóng biểu mẫu' : 'Tạo khoản hoàn tiền'}
          </button>
          {showRefundForm && <RefundRequestForm payments={data.payments} busy={busy} onSubmit={body => run('refunds', body)} />}
        </>}
      </section>}
      <section className='mss-card mss-stack'>
        <h2 className='mss-section-title'>Giải ngân cho nhà bán</h2>
        {data.eligibility.blockingReasons.map(code => <p className='text-sm text-amber-800' key={code}>
          {blockingReasons[code] ?? 'Cần kiểm tra thêm trước khi giải ngân'}</p>)}
        {data.eligibility.eligible && (data.settlements.length === 0 || data.settlements.every(s => s.status === 'ON_HOLD')) &&
          <button type='button' disabled={busy} className='mss-button mss-button--primary self-start'
            onClick={() => void run('settlements')}>Tạo khoản giải ngân</button>}
        {data.settlements.map(settlement => <div className='border-t border-gray-200 pt-3 space-y-2' key={settlement.settlementId}>
          <p>Khoản giải ngân #{settlement.settlementId} <StatusBadge map={FINANCE_STATUS}
            status={settlement.status === 'SUCCESS' ? 'PAID' : settlement.status} /></p>
          <p>Đã hoàn {formatVnd(settlement.refundedAmount)} · Phí sàn {formatVnd(settlement.feeAmount)}
            {' · '}Thực nhận {formatVnd(settlement.supplierPayoutAmount)}</p>
          {settlement.status === 'READY' && data.eligibility.eligible &&
            <button type='button' disabled={busy} className='mss-button mss-button--secondary self-start'
              onClick={() => void run('settlements/' + settlement.settlementId + '/payout')}>Chốt tài khoản và tạo QR</button>}
          {settlement.status === 'PROCESSING' && <TransferInstructions orderId={data.context.sellerOrderId}
            kind='PAYOUT' transferId={settlement.settlementId} onUpdated={updateTransferSummary} />}
        </div>)}
      </section>
      {data.history.length > 0 && <details className="mss-card">
        <summary className="cursor-pointer font-semibold">Lịch sử xử lý</summary>
        <ul className="mt-3 space-y-2">
          {data.history.map(event => <li key={event.auditId} className="border-b pb-2">
            <p>{auditLabel[event.eventType] ?? "Cập nhật giao dịch"} · {formatDateTime(event.createdAt)}</p>
            {event.detail && <p className="text-sm text-gray-600">{event.detail}</p>}
          </li>)}
        </ul>
      </details>}
    </>}
  </div>;
}
