import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Loader2, MessageSquare, PenLine, Undo2, XCircle } from 'lucide-react';
import StatusBadge from '../../../components/ui/StatusBadge';
import { errorMessage } from '../../../services/api/http';
import { formatDate, formatDateTime } from '../../../utils/format';
import { QUOTATION_CONVERSION_STATUS, QUOTATION_STATUS } from '../../../utils/status';
import { quotationApi } from '../api';
import { formatMoney, formatPercent } from '../format';
import type { Quotation, QuotationAccepted } from '../types';
import AcceptQuotationDialog from './AcceptQuotationDialog';
import DecisionDialog from './DecisionDialog';
import { ErrorBlock, InfoRow, LoadingRows } from './ui';

interface QuotationDetailProps {
  quotationId: string;
  viewer: 'buyer' | 'supplier';
  storeName: string;
  /** Whether this version is the newest one of its store (supplier may only revise the newest). */
  isLatest: boolean;
  onChanged: () => void;
  onRevise?: (quotation: Quotation) => void;
  onOpenChat: () => Promise<void>;
}

type Pending = 'accept' | 'reject' | 'withdraw' | null;

export default function QuotationDetail({ quotationId, viewer, storeName, isLatest, onChanged, onRevise, onOpenChat }: QuotationDetailProps) {
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [link, setLink] = useState<QuotationAccepted | null>(null);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState<Pending>(null);
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState('');

  /** `silent` keeps the current content (and any open dialog) on screen while refreshing. */
  const load = useCallback((silent = false) => {
    setError('');
    if (!silent) {
      setQuotation(null);
      setLink(null);
    }
    quotationApi
      .get(quotationId)
      .then(setQuotation)
      .catch((e) => setError(errorMessage(e)));
    // 404 simply means nobody accepted this version yet; the link is informational either way.
    quotationApi
      .orderLink(quotationId)
      .then(setLink)
      .catch(() => setLink(null));
  }, [quotationId]);

  useEffect(() => load(), [load]);

  const changed = useCallback(() => {
    load(true);
    onChanged();
  }, [load, onChanged]);

  const openChat = async () => {
    setChatBusy(true);
    setChatError('');
    try {
      await onOpenChat();
    } catch (e) {
      setChatError(errorMessage(e));
    } finally {
      setChatBusy(false);
    }
  };

  if (error) return <ErrorBlock message={error} onRetry={() => load()} />;
  if (!quotation) return <LoadingRows rows={1} label="Đang tải báo giá…" />;

  const submitted = quotation.status === 'SUBMITTED';
  const locked = link !== null && link.conversionStatus !== 'FAILED';

  return (
    <article className="mss-card mss-stack" aria-labelledby={`q-${quotation.quotationId}-title`}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id={`q-${quotation.quotationId}-title`} className="mss-card-title">
            {storeName} · Phiên bản {quotation.version}
          </h3>
          <p className="mss-card-meta">
            Gửi lúc {formatDateTime(quotation.submittedAt)} · Hiệu lực đến {formatDateTime(quotation.validUntil)}
          </p>
        </div>
        <StatusBadge map={QUOTATION_STATUS} status={quotation.status} />
      </header>

      <div className="mss-table-scroll">
        <table className="mss-table">
          <caption className="sr-only">Mục hàng của báo giá</caption>
          <thead>
            <tr>
              <th scope="col">Mục hàng</th>
              <th scope="col">SKU</th>
              <th scope="col" className="text-right">SL</th>
              <th scope="col" className="text-right">Đơn giá</th>
              <th scope="col" className="text-right">Giảm</th>
              <th scope="col" className="text-right">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {quotation.items.map((item) => (
              <tr key={item.quotationItemId}>
                <td className="min-w-[180px]">
                  <span className="font-semibold">{item.itemNameSnapshot}</span>
                  {item.customizationNote && <span className="block text-gray-500">{item.customizationNote}</span>}
                  {item.variantId && <span className="mss-badge mt-1">Sản phẩm catalog</span>}
                </td>
                <td>{item.skuSnapshot ?? '—'}</td>
                <td className="text-right tabular-nums">{item.quantity.toLocaleString('vi-VN')}</td>
                <td className="text-right tabular-nums">{formatMoney(item.unitPrice)}</td>
                <td className="text-right tabular-nums">{Number(item.discountAmount) ? formatMoney(item.discountAmount) : '—'}</td>
                <td className="text-right font-semibold tabular-nums">{formatMoney(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="m-0 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoRow label="Tổng giá trị">
          <span className="mss-price">{formatMoney(quotation.totalAmount)}</span>
        </InfoRow>
        <InfoRow label="Phí vận chuyển">{formatMoney(quotation.shippingFee)}</InfoRow>
        <InfoRow label="Đặt cọc">{formatPercent(quotation.depositPercent)}</InfoRow>
        <InfoRow label="Ngày giao dự kiến">{formatDate(quotation.proposedDeliveryDate)}</InfoRow>
        <InfoRow label="Thời gian chuẩn bị">{quotation.leadTimeDays != null ? `${quotation.leadTimeDays} ngày` : '—'}</InfoRow>
        <InfoRow label="Phương thức giao">{quotation.shippingMethod ?? '—'}</InfoRow>
        <div className="sm:col-span-2">
          <InfoRow label="Điều khoản thanh toán">
            <span className="whitespace-pre-wrap font-normal">{quotation.paymentTerms ?? '—'}</span>
          </InfoRow>
        </div>
        {quotation.decisionReason && (
          <div className="sm:col-span-2 lg:col-span-4">
            <InfoRow label="Lý do">
              <span className="font-normal">{quotation.decisionReason}</span>
            </InfoRow>
          </div>
        )}
      </dl>

      {link && (
        <div className={`mss-alert ${link.conversionStatus === 'FAILED' ? 'mss-alert--danger' : ''} flex flex-wrap items-center gap-2`} role="status">
          <StatusBadge map={QUOTATION_CONVERSION_STATUS} status={link.conversionStatus} />
          {link.conversionStatus === 'COMPLETED' && (
            <span>
              Đơn hàng #{link.orderId} · đơn nhà bán #{link.sellerOrderId}
            </span>
          )}
          {link.conversionStatus === 'PENDING' && <span>Hệ thống đơn hàng đang xác nhận; trang sẽ cập nhật khi hoàn tất.</span>}
          {link.conversionStatus === 'FAILED' && (
            <span>Hệ thống đơn hàng đã từ chối tạo đơn cho phiên bản này. Nhà cung cấp cần gửi phiên bản mới.</span>
          )}
          {link.conversionStatus === 'PENDING' && (
            <button type="button" className="mss-button mss-button--secondary mss-button--sm" onClick={() => load(true)}>
              Kiểm tra lại
            </button>
          )}
        </div>
      )}

      {quotation.status === 'EXPIRED' && (
        <p className="mss-alert mss-alert--warning m-0">
          Báo giá đã hết hiệu lực nên không thể chấp nhận.{' '}
          {viewer === 'buyer' ? 'Hãy nhắn nhà cung cấp gửi phiên bản mới.' : 'Bạn có thể tạo phiên bản mới với thời hạn mới.'}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        {viewer === 'buyer' && submitted && !locked && (
          <>
            <button type="button" className="mss-button mss-button--primary" onClick={() => setDialog('accept')}>
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              Chấp nhận báo giá
            </button>
            <button type="button" className="mss-button mss-button--danger" onClick={() => setDialog('reject')}>
              <XCircle className="h-4 w-4" aria-hidden />
              Từ chối
            </button>
          </>
        )}
        {viewer === 'supplier' && isLatest && (submitted || quotation.status === 'EXPIRED') && !locked && onRevise && (
          <button type="button" className="mss-button mss-button--primary" onClick={() => onRevise(quotation)}>
            <PenLine className="h-4 w-4" aria-hidden />
            Tạo phiên bản mới
          </button>
        )}
        {viewer === 'supplier' && submitted && !locked && (
          <button type="button" className="mss-button mss-button--danger" onClick={() => setDialog('withdraw')}>
            <Undo2 className="h-4 w-4" aria-hidden />
            Rút báo giá
          </button>
        )}
        <button type="button" className="mss-button mss-button--secondary" onClick={openChat} disabled={chatBusy}>
          {chatBusy ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden /> : <MessageSquare className="h-4 w-4" aria-hidden />}
          {viewer === 'buyer' ? 'Nhắn tin với nhà cung cấp' : 'Nhắn tin với người mua'}
        </button>
      </div>
      {chatError && (
        <p className="mss-alert mss-alert--danger m-0" role="alert">
          {chatError}
        </p>
      )}

      {dialog === 'accept' && (
        <AcceptQuotationDialog quotation={quotation} storeName={storeName} onClose={() => setDialog(null)} onChanged={changed} />
      )}
      {dialog === 'reject' && (
        <DecisionDialog
          title={`Từ chối phiên bản ${quotation.version}?`}
          description="Nhà cung cấp sẽ thấy báo giá bị từ chối. Bạn vẫn có thể nhận phiên bản mới từ họ."
          confirmLabel="Từ chối báo giá"
          danger
          withReason
          onConfirm={(reason) => quotationApi.reject(quotation.quotationId, reason).then(changed)}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'withdraw' && (
        <DecisionDialog
          title={`Rút phiên bản ${quotation.version}?`}
          description="Người mua sẽ không thể chấp nhận phiên bản này nữa."
          confirmLabel="Rút báo giá"
          danger
          withReason
          onConfirm={(reason) => quotationApi.withdraw(quotation.quotationId, reason).then(changed)}
          onClose={() => setDialog(null)}
        />
      )}
    </article>
  );
}
