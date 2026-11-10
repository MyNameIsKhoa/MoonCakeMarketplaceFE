import { useEffect, useState, type ReactNode } from 'react';
import { Banknote, ChevronLeft, ChevronRight, Clock, Wallet } from 'lucide-react';
import { ApiError, errorMessage } from '../../services/api/http';
import { sellerPayoutApi, type SellerPayoutPage, type SellerPayoutRow } from '../../services/api/sellerPayoutApi';
import { formatDateTime, formatVnd } from '../../utils/format';
import { FINANCE_STATUS, ORDER_STATUS } from '../../utils/status';
import StatusBadge from '../../components/ui/StatusBadge';
import { ErrorAlert, LoadingText } from './SellerUi';

const PAGE_SIZE = 20;

/** FINANCE_STATUS has every payout state except a seller order with nothing to pay out. */
const PAYOUT_STATUS = {
  ...FINANCE_STATUS,
  NO_PAYOUT: { label: 'Không có khoản giải ngân', variant: 'neutral' as const }
};

const BLOCKING_REASONS: Record<string, string> = {
  OPEN_DISPUTE: 'Có khiếu nại đang mở',
  CANCELLATION: 'Có yêu cầu hủy đang xử lý',
  REFUND: 'Có khoản hoàn tiền chờ xử lý',
  FULLY_REFUNDED: 'Đã hoàn toàn bộ tiền đơn',
  DISPUTE_WINDOW_OPEN: 'Chưa hết 7 ngày khiếu nại kể từ khi giao',
  ORDER_NOT_ACCEPTED: 'Đơn chưa được chấp nhận',
  NOT_FULLY_PAID: 'Chưa thu đủ tiền',
  DELIVERY_ACCEPTANCE_REQUIRED: 'Chờ giao hàng và khách nghiệm thu',
  FEE_BASIS_NOT_AGREED: 'Sàn chưa chốt cơ sở tính phí',
  ROUNDING_NOT_AGREED: 'Sàn chưa chốt quy tắc làm tròn',
  PAYMENT_RECONCILIATION_REQUIRED: 'Có giao dịch cần đối soát'
};

const CARD = 'bg-white rounded-2xl shadow-sm border border-gray-100 p-5';

function TotalCard({ icon, label, amount, hint }: { icon: ReactNode; label: string; amount: number; hint: string }) {
  return (
    <div className={CARD}>
      <p className="m-0 flex items-center gap-2 text-sm text-gray-500">{icon}{label}</p>
      <p className="m-0 mt-1 text-xl font-bold text-gray-900">{formatVnd(amount)}</p>
      <p className="m-0 mt-1 text-xs text-gray-500">{hint}</p>
    </div>
  );
}

function PayoutCell({ row }: { row: SellerPayoutRow }) {
  const reasons = row.payoutStatus === 'BLOCKED' ? row.blockingReasons : [];
  return (
    <div className="flex flex-col gap-1">
      <StatusBadge map={PAYOUT_STATUS} status={row.payoutStatus} />
      {reasons.length > 0 && (
        <ul className="m-0 pl-4 list-disc text-xs text-gray-500">
          {reasons.map((code) => <li key={code}>{BLOCKING_REASONS[code] ?? code}</li>)}
        </ul>
      )}
    </div>
  );
}

/**
 * Seller Center tab "Doanh thu & giải ngân": per seller order the money collected, refunds, platform fee, net payout
 * and payout state, plus pending / ready / paid totals. Self-contained (no props).
 */
export default function SellerPayouts() {
  const [page, setPage] = useState(0);
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState<{ key: string; data?: SellerPayoutPage; error?: string } | null>(null);
  const key = `${page}:${reload}`;

  useEffect(() => {
    let current = true;
    sellerPayoutApi.list(page, PAGE_SIZE)
      .then((data) => current && setResult({ key, data }))
      .catch((err: unknown) => current && setResult({
        key,
        error: err instanceof ApiError && err.status === 403
          ? 'Chỉ nhà bán đã được xác minh mới xem được doanh thu và giải ngân.'
          : errorMessage(err)
      }));
    return () => {
      current = false;
    };
  }, [page, key]);

  const loaded = result?.key === key ? result : null;
  const data = loaded?.data;

  return (
    <section className="flex flex-col gap-4" aria-labelledby="seller-payouts-title">
      <div>
        <h2 id="seller-payouts-title" className="m-0 text-lg font-bold text-gray-900">Doanh thu &amp; giải ngân</h2>
        <p className="m-0 mt-1 text-sm text-gray-500">
          Tiền khách đã thanh toán được sàn giữ cho tới khi đơn được giao, khách nghiệm thu và hết 7 ngày khiếu nại;
          sau đó sàn trừ phí và chuyển khoản phần thực nhận cho bạn.
        </p>
      </div>

      {!loaded && <LoadingText label="Đang tải doanh thu…" />}
      {loaded?.error && <ErrorAlert message={loaded.error} onRetry={() => setReload((n) => n + 1)} />}

      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <TotalCard icon={<Clock className="w-4 h-4" aria-hidden />} label="Đang chờ đủ điều kiện"
              amount={data.totals.pendingAmount} hint="Chưa giao/nghiệm thu, còn trong hạn khiếu nại hoặc tạm giữ" />
            <TotalCard icon={<Wallet className="w-4 h-4" aria-hidden />} label="Đủ điều kiện giải ngân"
              amount={data.totals.readyAmount} hint="Chờ sàn thực hiện chuyển khoản" />
            <TotalCard icon={<Wallet className="w-4 h-4" aria-hidden />} label="Đang chuyển khoản"
              amount={data.totals.processingAmount} hint="Sàn đang xử lý chi trả" />
            <TotalCard icon={<Banknote className="w-4 h-4" aria-hidden />} label="Đã giải ngân"
              amount={data.totals.paidAmount} hint="Đã chuyển khoản thành công" />
          </div>

          {data.content.length === 0 ? (
            <p className="text-sm text-gray-500">Chưa có đơn hàng nào phát sinh doanh thu.</p>
          ) : (
            <div className="mss-table-scroll">
              <table className="mss-table">
                <thead>
                  <tr>
                    <th>Đơn hàng</th>
                    <th>Trạng thái đơn</th>
                    <th className="text-right">Đã thu</th>
                    <th className="text-right">Hoàn tiền</th>
                    <th className="text-right">Phí sàn</th>
                    <th className="text-right">Thực nhận</th>
                    <th>Giải ngân</th>
                    <th>Ngày giải ngân</th>
                  </tr>
                </thead>
                <tbody>
                  {data.content.map((row) => (
                    <tr key={row.sellerOrderId}>
                      <td>
                        <span className="font-semibold text-gray-900">{row.sellerOrderNo}</span>
                        <p className="m-0 text-xs text-gray-500">Đơn {row.orderNo}</p>
                        {row.placedAt && <p className="m-0 text-xs text-gray-500">{formatDateTime(row.placedAt)}</p>}
                      </td>
                      <td><StatusBadge map={ORDER_STATUS} status={row.orderStatus} /></td>
                      <td className="text-right whitespace-nowrap">{formatVnd(row.grossCollected)}</td>
                      <td className="text-right whitespace-nowrap">
                        {row.refundedAmount > 0 ? `-${formatVnd(row.refundedAmount)}` : formatVnd(0)}
                      </td>
                      <td className="text-right whitespace-nowrap">
                        {row.platformFee === null ? '—' : row.platformFee > 0 ? `-${formatVnd(row.platformFee)}` : formatVnd(0)}
                        {row.feeEstimated && row.platformFee !== null && row.platformFee > 0 &&
                          <p className="m-0 text-xs text-gray-500">tạm tính</p>}
                      </td>
                      <td className="text-right whitespace-nowrap font-semibold text-gray-900">
                        {formatVnd(row.netPayout)}
                        {row.feeEstimated && row.netPayout !== null && row.netPayout > 0 &&
                          <p className="m-0 text-xs font-normal text-gray-500">tạm tính</p>}
                      </td>
                      <td><PayoutCell row={row} /></td>
                      <td className="whitespace-nowrap">
                        {row.paidAt ? formatDateTime(row.paidAt) : '—'}
                        {row.paidAt && row.payoutReference &&
                          <p className="m-0 text-xs text-gray-500">Mã CK: {row.payoutReference}</p>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data.totalPages > 1 && (
            <nav className="flex items-center justify-end gap-2 text-sm" aria-label="Phân trang doanh thu">
              <button type="button" className="mss-button mss-button--secondary mss-button--sm"
                disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                <ChevronLeft className="w-4 h-4" aria-hidden /> Trước
              </button>
              <span className="text-gray-600">Trang {data.page + 1} / {data.totalPages}</span>
              <button type="button" className="mss-button mss-button--secondary mss-button--sm"
                disabled={page + 1 >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
                Sau <ChevronRight className="w-4 h-4" aria-hidden />
              </button>
            </nav>
          )}

          <p className="m-0 text-xs text-gray-500">
            “Tạm tính” là ước tính theo quy tắc tính phí hiện hành cho tới khi sàn
            chốt quyết toán; số tiền giải ngân chính thức là số trong quyết toán.
          </p>
        </>
      )}
    </section>
  );
}
