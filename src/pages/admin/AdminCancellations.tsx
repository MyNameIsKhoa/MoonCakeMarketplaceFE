import { ORDER_SOURCE } from '../../utils/status';
import { formatDateTime, formatVnd } from '../../utils/format';
import { Fragment, useEffect, useState } from 'react';
import { ApiError, http } from '../../services/api/http';
import { paymentApi, type FinanceSummary } from '../../features/payment-settlement/paymentApi';
import RefundTransfer from '../../features/payment-settlement/RefundTransfer';

/**
 * refundedAmount: refunds confirmed with transfer proof; pendingRefundAmount: refunds waiting for the transfer;
 * retainedAmount: deposit kept for the supplier because the buyer cancelled after preparation started.
 */
type Case = { cancellationId: number; sellerOrderId: number; sellerOrderNo: string;
  customerOrderNo: string; sourceType: string; paidAmount: number; refundedAmount: number;
  pendingRefundAmount: number; retainedAmount: number; activePaymentId: number | null; reason: string;
  requestedAt: string | null };

const ERRORS: Record<string, string> = {
  CANCELLATION_REFUND_STARTED: 'Đã hoàn tiền cho yêu cầu này nên không thể từ chối. Hãy hoàn tất hoàn tiền rồi chấp nhận hủy.',
  PAID_CANCELLATION_REQUIRES_REFUND_REVIEW: 'Phải hoàn đủ số tiền phải hoàn (đã xác nhận chuyển khoản) trước khi chấp nhận hủy.',
  CANCEL_UNPAID_LINKS_FIRST: 'Đơn còn link PayOS đang mở. Hãy hủy link trước.',
  CANCELLATION_NOT_PENDING: 'Yêu cầu này đã được xử lý. Hãy tải lại trang.',
  RECIPIENT_ACCOUNT_MISSING: 'Người mua chưa khai báo tài khoản nhận tiền (Hồ sơ → Tài khoản nhận tiền).',
  REFUND_EXCEEDS_AVAILABLE_AMOUNT: 'Số tiền hoàn vượt số còn có thể hoàn. Hãy tải lại trang.',
  PAYMENT_NOT_REFUNDABLE: 'Giao dịch chưa ở trạng thái có thể hoàn tiền.',
  DISPUTE_REFUND_LINK_REQUIRED: 'Đơn đang có khiếu nại. Hãy hoàn tiền trong mục Khiếu nại.',
};

function message(error: unknown, fallback: string) {
  if (error instanceof ApiError && ERRORS[error.code]) return ERRORS[error.code];
  return error instanceof Error ? error.message : fallback;
}

export default function AdminCancellations() {
  const [cases, setCases] = useState<Case[] | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const [refunding, setRefunding] = useState<number | null>(null);

  useEffect(() => {
    let current = true;
    setError('');
    http.get<Case[]>('/api/admin/commerce/cancellations')
      .then(({ data }) => { if (current) setCases(data); })
      .catch(() => { if (current) setError('Không tải được yêu cầu hủy.'); });
    return () => { current = false; };
  }, [reload]);

  const decide = async (item: Case, approve: boolean) => {
    const suggested = !approve || item.paidAmount === 0 ? ''
      : item.refundedAmount >= item.paidAmount ? 'Đã hoàn 100% số tiền đã thu cho người mua'
        : `Người mua hủy khi nhà bán đã bắt đầu chuẩn bị: giữ cọc ${formatVnd(item.retainedAmount)} cho nhà bán, hoàn phần còn lại`;
    const reason = window.prompt(`${approve ? 'Lý do chấp nhận' : 'Lý do từ chối'} hủy đơn ${item.sellerOrderNo}:`, suggested);
    if (!reason?.trim()) return;
    setBusy(true); setError('');
    try {
      await http.post(`/api/payments/orders/${item.sellerOrderId}/cancellations/${item.cancellationId}/decision`,
        { approve, reason: reason.trim() }, { headers: { 'Idempotency-Key': crypto.randomUUID() } });
      setReload(n => n + 1);
    } catch (e) { setError(message(e, 'Không xử lý được yêu cầu.')); }
    finally { setBusy(false); }
  };

  const cancelLink = async (item: Case) => {
    if (!item.activePaymentId || !window.confirm(`Hủy link PayOS của đơn ${item.sellerOrderNo}?`)) return;
    setBusy(true); setError('');
    try { await http.post(`/api/payments/${item.activePaymentId}/cancel-link`); setReload(n => n + 1); }
    catch (e) { setError(e instanceof Error ? e.message : 'Chưa đối soát được link PayOS.'); }
    finally { setBusy(false); }
  };

  return <div className="max-w-6xl mx-auto">
    <h2 className="text-2xl font-bold text-blue-950">Yêu cầu hủy đơn</h2>
    <p className="text-slate-500 mb-5">Yêu cầu đang chờ xử lý từ các đơn nhà bán.</p>
    <div className="bg-blue-50 text-blue-900 rounded-xl p-4 mb-5 text-sm space-y-1">
      <p><strong>Chưa thu tiền:</strong> hủy link PayOS (nếu có) rồi chấp nhận hủy.</p>
      <p><strong>Đã thu tiền</strong> (đã cọc hoặc đã trả đủ): bấm <strong>Hoàn tiền</strong>, chuyển khoản theo QR rồi xác nhận mã giao dịch và chứng từ. Hoàn đủ số phải hoàn mới chấp nhận hủy được, và khi đã bắt đầu hoàn tiền thì không từ chối yêu cầu được nữa.</p>
      <p><strong>Giữ cọc:</strong> người mua hủy khi nhà bán đã bắt đầu chuẩn bị hàng thì tiền cọc thuộc về nhà bán, chỉ hoàn phần đã trả thêm. Nếu lỗi do nhà bán, bấm <strong>Hoàn cả tiền cọc</strong>. Sau khi chấp nhận hủy, giải ngân tiền cọc ở tab <strong>Đối soát &amp; giải ngân</strong> (nhập mã đơn nhà bán).</p>
      <p>Đơn mua lẻ được hoàn kho khi chấp nhận hủy.</p>
    </div>
    {error && <p role="alert" className="text-red-700 mb-4">{error}</p>}
    {!cases && !error && <p>Đang tải…</p>}
    {cases?.length === 0 && <p>Không có yêu cầu đang chờ.</p>}
    {cases && cases.length > 0 && <div className="overflow-x-auto bg-white rounded-2xl border border-blue-100"><table className="w-full text-left text-sm"><thead className="bg-blue-50 text-blue-950"><tr><th className="p-4">Đơn</th><th className="p-4">Đơn nhà bán</th><th className="p-4">Lý do khách</th><th className="p-4">Gửi lúc</th><th className="p-4">Thao tác</th></tr></thead><tbody>{cases.map(item => {
      // outstanding: what must still be refunded before approving; a kept deposit is not refunded.
      const outstanding = item.paidAmount - item.refundedAmount - item.retainedAmount;
      const canRefundDeposit = item.retainedAmount > 0 && item.paidAmount > item.refundedAmount;
      const canApprove = !item.activePaymentId && outstanding <= 0 && (item.sourceType === 'RFQ' || item.paidAmount > 0);
      const refundStarted = item.pendingRefundAmount > 0 || item.refundedAmount > 0;
      const open = refunding === item.cancellationId && (outstanding > 0 || canRefundDeposit);
      return <Fragment key={item.cancellationId}>
        <tr className="border-t border-blue-50">
          <td className="p-4">{item.customerOrderNo}</td>
          <td className="p-4">{item.sellerOrderNo}<span className="block text-slate-500">{ORDER_SOURCE[item.sourceType]?.label ?? "Chưa xác định"} · đã thu {formatVnd(item.paidAmount)}{item.refundedAmount > 0 && ` · đã hoàn ${formatVnd(item.refundedAmount)}`}{item.pendingRefundAmount > 0 && ` · chờ chuyển ${formatVnd(item.pendingRefundAmount)}`}{item.retainedAmount > 0 && ` · giữ cọc ${formatVnd(item.retainedAmount)} cho nhà bán`}</span></td>
          <td className="p-4">{item.reason}</td>
          <td className="p-4">{formatDateTime(item.requestedAt ?? undefined)}</td>
          <td className="p-4"><div className="flex flex-wrap gap-2">
            {item.activePaymentId && <button disabled={busy} onClick={() => void cancelLink(item)} className="text-blue-700 border border-blue-200 rounded-lg px-3 py-1 disabled:opacity-40">Hủy link PayOS</button>}
            {(outstanding > 0 || canRefundDeposit) && <button disabled={busy} onClick={() => setRefunding(open ? null : item.cancellationId)} className="text-amber-800 border border-amber-300 rounded-lg px-3 py-1 disabled:opacity-40">{open ? 'Đóng hoàn tiền' : outstanding > 0 ? 'Hoàn tiền' : 'Hoàn cả tiền cọc'}</button>}
            {canApprove && <button disabled={busy} onClick={() => void decide(item, true)} className="text-white bg-blue-700 rounded-lg px-3 py-1 disabled:opacity-40">Chấp nhận hủy</button>}
            {!refundStarted && <button disabled={busy} onClick={() => void decide(item, false)} className="text-red-700 border border-red-200 rounded-lg px-3 py-1 disabled:opacity-40">Từ chối</button>}
          </div></td>
        </tr>
        {open && <tr className="bg-slate-50"><td colSpan={5} className="p-4">
          <CancellationRefund item={item} onChanged={() => setReload(n => n + 1)} />
        </td></tr>}
      </Fragment>;
    })}</tbody></table></div>}
  </div>;
}

/**
 * Returns what the buyer is owed: everything collected, minus a deposit kept for the supplier (unless the admin
 * returns that too). One refund per collected payment, each sent by bank transfer and confirmed with proof.
 */
function CancellationRefund({ item, onChanged }: { item: Case; onChanged: () => void }) {
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loads, setLoads] = useState(0);

  useEffect(() => {
    let current = true;
    paymentApi.summary(item.sellerOrderId)
      .then(data => { if (current) setSummary(data); })
      .catch(e => { if (current) setError(message(e, 'Không tải được giao dịch của đơn.')); });
    return () => { current = false; };
  }, [item.sellerOrderId, loads]);

  const updated = (data: FinanceSummary) => { setSummary(data); onChanged(); };
  // The deposit payment is refunded last, so a kept deposit is the part left untouched.
  const refundable = (summary?.payments.filter(p => (p.refundableAmount ?? 0) > 0) ?? [])
    .sort((a, b) => Number(a.paymentType === 'DEPOSIT') - Number(b.paymentType === 'DEPOSIT'));
  const refundableTotal = refundable.reduce((sum, p) => sum + (p.refundableAmount ?? 0), 0);
  const waiting = summary?.refunds.filter(r => r.status === 'MANUAL_REVIEW') ?? [];
  const owed = Math.min(refundableTotal,
    Math.max(0, item.paidAmount - item.refundedAmount - item.pendingRefundAmount - item.retainedAmount));

  const createRefunds = async (target: number) => {
    const keep = target < refundableTotal && item.retainedAmount > 0;
    if (!window.confirm(`Tạo khoản hoàn ${formatVnd(target)} cho người mua của đơn ${item.sellerOrderNo}?`
      + (keep ? ` Tiền cọc ${formatVnd(item.retainedAmount)} được giữ cho nhà bán.` : ''))) return;
    const policy = keep
      ? `Chính sách hủy đơn: người mua hủy khi nhà bán đã bắt đầu chuẩn bị, giữ cọc ${item.retainedAmount} đ cho nhà bán, hoàn phần còn lại.`
      : item.retainedAmount > 0 ? 'Chính sách hủy đơn: admin hoàn cả tiền cọc cho người mua (lỗi do nhà bán).'
        : 'Chính sách hủy đơn: hoàn 100% số tiền đã thu cho người mua.';
    setBusy(true); setError('');
    try {
      let latest: FinanceSummary | null = null;
      let left = target;
      for (const payment of refundable) {
        const amount = Math.min(payment.refundableAmount ?? 0, left);
        if (amount <= 0) break;
        left -= amount;
        latest = await paymentApi.command(item.sellerOrderId, 'refunds', {
          paymentId: payment.paymentId, amount,
          reason: `Hủy đơn theo yêu cầu #${item.cancellationId}`,
          policySnapshot: `${policy} Yêu cầu hủy #${item.cancellationId}, lý do khách: ${item.reason}`.slice(0, 2000),
        }, crypto.randomUUID());
      }
      if (latest) updated(latest);
    } catch (e) {
      // Refunds created before the failure stay; reload so the remaining amount is offered again.
      setError(message(e, 'Không tạo được khoản hoàn.'));
      setLoads(n => n + 1); onChanged();
    } finally { setBusy(false); }
  };

  const rejectRefund = async (refundId: number, reason: string) => {
    setBusy(true); setError('');
    try {
      updated(await paymentApi.command(item.sellerOrderId, `refunds/${refundId}/reject`, { reason }, crypto.randomUUID()));
      return true;
    } catch (e) { setError(message(e, 'Không từ chối được khoản hoàn.')); return false; }
    finally { setBusy(false); }
  };

  if (!summary) return error ? <p role="alert" className="text-red-700">{error}</p> : <p role="status">Đang tải giao dịch…</p>;
  return <div className="space-y-3 text-sm">
    <p>{item.retainedAmount > 0
      ? <>Đã thu {formatVnd(item.paidAmount)}. Nhà bán đã bắt đầu chuẩn bị nên <strong>giữ cọc {formatVnd(item.retainedAmount)}</strong> cho nhà bán, chỉ hoàn phần còn lại.</>
      : <>Hoàn <strong>100%</strong> số đã thu ({formatVnd(item.paidAmount)}).</>}
      {' '}Tiền hoàn vào tài khoản nhận tiền người mua đã khai báo trong Hồ sơ; mỗi giao dịch đã thu (cọc, phần còn lại) là một lần chuyển khoản riêng.</p>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <div className="flex flex-wrap gap-2">
      {owed > 0 && <button type="button" disabled={busy} onClick={() => void createRefunds(owed)}
        className="text-white bg-amber-600 rounded-lg px-3 py-1 disabled:opacity-40">Tạo khoản hoàn {formatVnd(owed)}</button>}
      {item.retainedAmount > 0 && refundableTotal > owed && <button type="button" disabled={busy}
        onClick={() => void createRefunds(refundableTotal)}
        className="text-amber-800 border border-amber-300 rounded-lg px-3 py-1 disabled:opacity-40">Hoàn cả tiền cọc ({formatVnd(refundableTotal)}) – lỗi do nhà bán</button>}
    </div>
    {waiting.map(refund => <RefundTransfer key={refund.id} orderId={item.sellerOrderId} refund={refund} busy={busy}
      onUpdated={updated} onReject={reason => rejectRefund(refund.id, reason)} />)}
    {owed === 0 && waiting.length === 0 && <p>Không còn khoản nào phải hoàn. Tải lại trang để chấp nhận hủy.</p>}
  </div>;
}
