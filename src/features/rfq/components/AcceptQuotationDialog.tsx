import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, MapPin, Plus } from 'lucide-react';
import StatusBadge from '../../../components/ui/StatusBadge';
import { ApiError, errorMessage } from '../../../services/api/http';
import { formatAddress, formatDate, formatDateTime } from '../../../utils/format';
import { QUOTATION_CONVERSION_STATUS } from '../../../utils/status';
import { idempotencyKeyFor, lookupApi, quotationApi } from '../api';
import { formatMoney, formatPercent } from '../format';
import type { BuyerAddress, Quotation, QuotationAccepted } from '../types';
import { Dialog, ErrorBlock } from './ui';

interface AcceptQuotationDialogProps {
  quotation: Quotation;
  storeName: string;
  onClose: () => void;
  /** Called when the quotation changed underneath (new version, expired…) or after a confirmed order. */
  onChanged: () => void;
}

const STALE_CODES = new Set(['QUOTATION_VERSION_CONFLICT', 'QUOTATION_NOT_ACCEPTABLE', 'RFQ_NOT_ACCEPTABLE']);
const POLL_ATTEMPTS = 10;

export default function AcceptQuotationDialog({ quotation, storeName, onClose, onChanged }: AcceptQuotationDialogProps) {
  const [addresses, setAddresses] = useState<BuyerAddress[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [addressId, setAddressId] = useState('');
  const [adding, setAdding] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<QuotationAccepted | null>(null);
  const keySlot = useRef<{ payload?: string; key?: string }>({});

  const loadAddresses = useCallback(() => {
    setLoadError('');
    lookupApi
      .myAddresses()
      .then((list) => {
        setAddresses(list);
        const preferred = list.find((a) => a.isDefault) ?? list[0];
        if (preferred) setAddressId((current) => current || String(preferred.addressId));
        setAdding(list.length === 0);
      })
      .catch((e) => setLoadError(errorMessage(e)));
  }, []);

  useEffect(loadAddresses, [loadAddresses]);

  // 202 PENDING: Commerce has the durable intent but has not confirmed yet; poll the order link briefly.
  useEffect(() => {
    if (result?.conversionStatus !== 'PENDING') return;
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      quotationApi
        .orderLink(quotation.quotationId)
        .then((link) => {
          if (link.conversionStatus !== 'PENDING') {
            setResult(link);
            onChanged();
          }
        })
        .catch(() => undefined);
      if (attempts >= POLL_ATTEMPTS) window.clearInterval(timer);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [result?.conversionStatus, quotation.quotationId, onChanged]);

  const confirm = async () => {
    setError('');
    const payload = { quotationVersion: quotation.version, addressId };
    setSubmitting(true);
    try {
      const accepted = await quotationApi.accept(quotation.quotationId, payload, idempotencyKeyFor(keySlot.current, payload));
      setResult(accepted);
      if (accepted.conversionStatus === 'COMPLETED') onChanged();
    } catch (e) {
      setError(errorMessage(e));
      if (e instanceof ApiError && (STALE_CODES.has(e.code) || e.code === 'QUOTATION_CONVERSION_FAILED')) onChanged();
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    const done = result.conversionStatus === 'COMPLETED';
    return (
      <Dialog
        title={done ? 'Đã tạo đơn hàng' : 'Đang xác nhận đơn hàng'}
        onClose={onClose}
        footer={
          <button type="button" className="mss-button mss-button--primary" onClick={onClose}>
            Đóng
          </button>
        }
      >
        <div className="mss-stack" role="status" aria-live="polite">
          <p className="m-0 flex items-center gap-2">
            {done ? (
              <CheckCircle2 className="h-5 w-5 text-[var(--mss-success)]" aria-hidden />
            ) : (
              <Loader2 className="h-5 w-5 motion-safe:animate-spin" aria-hidden />
            )}
            <StatusBadge map={QUOTATION_CONVERSION_STATUS} status={result.conversionStatus} />
          </p>
          {done ? (
            <p className="m-0">
              Đơn hàng <strong>#{result.orderId}</strong> (đơn nhà bán <strong>#{result.sellerOrderId}</strong>) đã được tạo với khoản
              đặt cọc chờ thanh toán. Theo dõi tại mục <strong>Đơn hàng của tôi</strong>.
            </p>
          ) : (
            <p className="m-0">
              Yêu cầu chấp nhận đã được ghi nhận; hệ thống đơn hàng đang xác nhận. Bạn có thể đóng cửa sổ — trạng thái sẽ cập nhật ở
              trang báo giá, không cần chấp nhận lại.
            </p>
          )}
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog
      title={`Chấp nhận báo giá phiên bản ${quotation.version}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="mss-button mss-button--secondary" onClick={onClose} disabled={submitting}>
            Để sau
          </button>
          <button type="button" className="mss-button mss-button--primary" onClick={confirm} disabled={submitting || !addressId || adding}>
            {submitting && <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden />}
            Xác nhận chấp nhận
          </button>
        </>
      }
    >
      <div className="mss-stack">
        <dl className="m-0 grid gap-3 rounded-[var(--mss-radius-md)] bg-[var(--mss-bg)] p-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-gray-500">Nhà cung cấp</dt>
            <dd className="m-0 font-semibold">{storeName}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Tổng giá trị</dt>
            <dd className="m-0 mss-price">{formatMoney(quotation.totalAmount)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Đặt cọc</dt>
            <dd className="m-0 font-semibold">{formatPercent(quotation.depositPercent)} tổng giá trị</dd>
          </div>
          <div>
            <dt className="text-gray-500">Ngày giao dự kiến</dt>
            <dd className="m-0 font-semibold">{formatDate(quotation.proposedDeliveryDate)}</dd>
          </div>
          <div className="sm:col-span-2 text-xs text-gray-500">
            Báo giá còn hiệu lực đến {formatDateTime(quotation.validUntil)}. Sau khi chấp nhận, đơn hàng được tạo theo đúng giá và điều khoản
            của phiên bản này.
          </div>
        </dl>

        <fieldset className="m-0 mss-stack border-0 p-0">
          <legend className="mss-label mb-2">Địa chỉ nhận hàng</legend>
          {loadError && <ErrorBlock message={loadError} onRetry={loadAddresses} />}
          {!addresses && !loadError && <p className="m-0 text-sm text-gray-500">Đang tải sổ địa chỉ…</p>}
          {addresses?.map((a) => (
            <label
              key={a.addressId}
              className={`flex cursor-pointer gap-3 rounded-[var(--mss-radius-md)] border p-3 ${
                addressId === String(a.addressId) ? 'border-[var(--mss-primary)] bg-[var(--mss-primary-soft)]' : 'border-[var(--mss-border)]'
              }`}
            >
              <input type="radio" name="accept-address" className="mt-1" checked={addressId === String(a.addressId)} onChange={() => setAddressId(String(a.addressId))} />
              <span className="min-w-0 text-sm">
                <span className="block font-semibold">
                  {a.recipientName} · {a.recipientPhone}
                  {a.isDefault && <span className="mss-badge mss-badge--info ml-2">Mặc định</span>}
                </span>
                <span className="block text-gray-600">{formatAddress({ ...a, ward: a.ward ?? undefined, district: a.district ?? undefined })}</span>
              </span>
            </label>
          ))}
          {addresses && !adding && (
            <button type="button" className="mss-button mss-button--secondary mss-button--sm self-start" onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4" aria-hidden />
              Thêm địa chỉ mới
            </button>
          )}
          {addresses && adding && (
            <NewAddressForm
              canCancel={addresses.length > 0}
              onCancel={() => setAdding(false)}
              onCreated={(created) => {
                setAddresses((list) => [...(list ?? []), created]);
                setAddressId(String(created.addressId));
                setAdding(false);
              }}
            />
          )}
        </fieldset>

        {error && (
          <p className="mss-alert mss-alert--danger m-0" role="alert">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}

function NewAddressForm({ canCancel, onCancel, onCreated }: { canCancel: boolean; onCancel: () => void; onCreated: (a: BuyerAddress) => void }) {
  const [v, setV] = useState({ recipientName: '', recipientPhone: '', addressLine: '', ward: '', district: '', city: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (key: keyof typeof v) => (e: { target: { value: string } }) => setV((prev) => ({ ...prev, [key]: e.target.value }));

  const save = async () => {
    if (!v.recipientName.trim() || !v.recipientPhone.trim() || !v.addressLine.trim() || !v.city.trim()) {
      setError('Nhập tên người nhận, số điện thoại, địa chỉ và tỉnh/thành.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      onCreated(
        await lookupApi.createAddress({
          recipientName: v.recipientName.trim(),
          recipientPhone: v.recipientPhone.trim(),
          addressLine: v.addressLine.trim(),
          ward: v.ward.trim() || null,
          district: v.district.trim() || null,
          city: v.city.trim(),
          isDefault: !canCancel
        })
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const input = (key: keyof typeof v, label: string, type = 'text', autoComplete?: string) => (
    <div className="mss-field">
      <label className="mss-label" htmlFor={`addr-${key}`}>
        {label}
      </label>
      <input id={`addr-${key}`} className="mss-input" type={type} autoComplete={autoComplete} value={v[key]} onChange={set(key)} />
    </div>
  );

  return (
    <div className="mss-stack rounded-[var(--mss-radius-md)] border border-dashed border-[var(--mss-border)] p-3">
      <p className="m-0 flex items-center gap-2 text-sm font-semibold">
        <MapPin className="h-4 w-4" aria-hidden /> Địa chỉ mới
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {input('recipientName', 'Người nhận *', 'text', 'name')}
        {input('recipientPhone', 'Số điện thoại *', 'tel', 'tel')}
        <div className="sm:col-span-2">{input('addressLine', 'Số nhà, đường *', 'text', 'street-address')}</div>
        {input('ward', 'Phường/Xã')}
        {input('district', 'Quận/Huyện')}
        {input('city', 'Tỉnh/Thành phố *', 'text', 'address-level1')}
      </div>
      {error && (
        <p className="mss-field-error m-0" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        {canCancel && (
          <button type="button" className="mss-button mss-button--secondary mss-button--sm" onClick={onCancel} disabled={saving}>
            Hủy
          </button>
        )}
        <button type="button" className="mss-button mss-button--primary mss-button--sm" onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden />}
          Lưu địa chỉ
        </button>
      </div>
    </div>
  );
}
