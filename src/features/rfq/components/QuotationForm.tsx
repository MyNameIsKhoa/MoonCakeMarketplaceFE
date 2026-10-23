import { FormEvent, useRef, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { errorMessage } from '../../../services/api/http';
import { idempotencyKeyFor, quotationApi } from '../api';
import { centsToVnd, isMoney, isoToLocalDateTime, localDateTimeToIso, toCents, todayIsoDate } from '../format';
import type { Quotation, QuotationItemInput, QuotationTermsInput, Rfq, StoreInfo } from '../types';

type Mode = { kind: 'create'; stores: StoreInfo[] } | { kind: 'revise'; quotation: Quotation };

interface QuotationFormProps {
  rfq: Rfq;
  mode: Mode;
  onSaved: (quotation: Quotation) => void;
  onCancel: () => void;
}

interface ItemRow {
  key: string;
  catalog: boolean;
  productId: string;
  variantId: string;
  itemNameSnapshot: string;
  skuSnapshot: string;
  quantity: string;
  unitPrice: string;
  discountAmount: string;
  customizationNote: string;
}

const MAX_ITEMS = 50;
const ID = /^[1-9]\d{0,17}$/;
const INT = /^\d{1,9}$/;

function blankRow(quantity = ''): ItemRow {
  return {
    key: crypto.randomUUID(),
    catalog: false,
    productId: '',
    variantId: '',
    itemNameSnapshot: '',
    skuSnapshot: '',
    quantity,
    unitPrice: '',
    discountAmount: '',
    customizationNote: ''
  };
}

function rowError(row: ItemRow): string | null {
  if (row.catalog) {
    if (!ID.test(row.productId) || !ID.test(row.variantId)) return 'Nhập mã sản phẩm và mã biến thể (số) của catalog.';
  } else if (!row.itemNameSnapshot.trim()) {
    return 'Nhập tên mục hàng.';
  }
  if (!/^[1-9]\d{0,8}$/.test(row.quantity)) return 'Số lượng là số nguyên lớn hơn 0.';
  if (!isMoney(row.unitPrice)) return 'Đơn giá là số, tối đa 2 chữ số thập phân.';
  if (row.discountAmount && !isMoney(row.discountAmount)) return 'Giảm giá là số, tối đa 2 chữ số thập phân.';
  if (toCents(row.discountAmount) > toCents(row.unitPrice) * Number(row.quantity)) return 'Giảm giá không được vượt giá trị mục hàng.';
  return null;
}

export default function QuotationForm({ rfq, mode, onSaved, onCancel }: QuotationFormProps) {
  const base = mode.kind === 'revise' ? mode.quotation : null;
  const activeStores = mode.kind === 'create' ? mode.stores.filter((s) => s.status === 'ACTIVE') : [];
  const [storeId, setStoreId] = useState(activeStores.length === 1 ? String(activeStores[0].storeId) : '');
  const [depositPercent, setDepositPercent] = useState(base ? String(Number(base.depositPercent)) : '30');
  const [validUntil, setValidUntil] = useState(isoToLocalDateTime(base?.validUntil) || isoToLocalDateTime(new Date(Date.now() + 7 * 86400000).toISOString()));
  const [deliveryDate, setDeliveryDate] = useState(base?.proposedDeliveryDate ?? rfq.requestedDeliveryDate ?? todayIsoDate(14));
  const [leadTimeDays, setLeadTimeDays] = useState(base?.leadTimeDays != null ? String(base.leadTimeDays) : '');
  const [shippingMethod, setShippingMethod] = useState(base?.shippingMethod ?? '');
  const [shippingFee, setShippingFee] = useState(base ? String(Number(base.shippingFee)) : '0');
  const [paymentTerms, setPaymentTerms] = useState(base?.paymentTerms ?? '');
  const [rows, setRows] = useState<ItemRow[]>(
    base
      ? base.items.map((item) => ({
          ...blankRow(String(item.quantity)),
          // The response carries variantId only: the supplier re-enters productId for catalog lines.
          catalog: !!item.variantId,
          variantId: item.variantId ?? '',
          itemNameSnapshot: item.variantId ? '' : item.itemNameSnapshot,
          skuSnapshot: item.variantId ? '' : item.skuSnapshot ?? '',
          unitPrice: String(Number(item.unitPrice)),
          discountAmount: Number(item.discountAmount) ? String(Number(item.discountAmount)) : '',
          customizationNote: item.customizationNote ?? ''
        }))
      : [blankRow(String(rfq.quantity))]
  );
  const [showErrors, setShowErrors] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const keySlot = useRef<{ payload?: string; key?: string }>({});

  const updateRow = (key: string, patch: Partial<ItemRow>) => setRows((list) => list.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const termErrors: string[] = [];
  if (mode.kind === 'create' && !storeId) termErrors.push('Chọn cửa hàng gửi báo giá.');
  if (!isMoney(depositPercent) || Number(depositPercent) > 100) termErrors.push('Tỷ lệ đặt cọc từ 0 đến 100%.');
  const validIso = localDateTimeToIso(validUntil);
  if (!validIso || new Date(validIso).getTime() <= Date.now()) termErrors.push('Hiệu lực báo giá phải ở tương lai.');
  if (!deliveryDate || deliveryDate < todayIsoDate()) termErrors.push('Ngày giao dự kiến không được ở quá khứ.');
  if (leadTimeDays && !INT.test(leadTimeDays)) termErrors.push('Thời gian chuẩn bị là số ngày (số nguyên).');
  if (!isMoney(shippingFee)) termErrors.push('Phí vận chuyển là số, tối đa 2 chữ số thập phân.');
  const itemErrors = rows.map(rowError);
  const valid = termErrors.length === 0 && itemErrors.every((e) => e === null) && rows.length > 0;

  const subtotalCents = rows.reduce(
    (sum, r) => sum + Math.max(0, toCents(r.unitPrice) * (Number(r.quantity) || 0) - toCents(r.discountAmount)),
    0
  );
  const totalCents = subtotalCents + toCents(shippingFee);
  const depositCents = Math.round((totalCents * (Number(depositPercent) || 0)) / 100);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError('');
    if (!valid) {
      setShowErrors(true);
      return;
    }
    const items: QuotationItemInput[] = rows.map((r) => ({
      ...(r.catalog
        ? { productId: r.productId, variantId: r.variantId }
        : { itemNameSnapshot: r.itemNameSnapshot.trim(), skuSnapshot: r.skuSnapshot.trim() || undefined }),
      quantity: Number(r.quantity),
      unitPrice: r.unitPrice.trim(),
      discountAmount: r.discountAmount.trim() || undefined,
      customizationNote: r.customizationNote.trim() || undefined
    }));
    const terms: QuotationTermsInput = {
      depositPercent: depositPercent.trim(),
      validUntil: validIso!,
      leadTimeDays: leadTimeDays ? Number(leadTimeDays) : undefined,
      proposedDeliveryDate: deliveryDate,
      shippingMethod: shippingMethod.trim() || undefined,
      shippingFee: shippingFee.trim(),
      paymentTerms: paymentTerms.trim() || undefined,
      items
    };
    setSubmitting(true);
    try {
      const saved =
        mode.kind === 'create'
          ? await quotationApi.create(rfq.rfqId, { ...terms, storeId }, idempotencyKeyFor(keySlot.current, { ...terms, storeId }))
          : await quotationApi.revise(
              mode.quotation.quotationId,
              { ...terms, expectedVersion: mode.quotation.version },
              idempotencyKeyFor(keySlot.current, { ...terms, v: mode.quotation.version })
            );
      onSaved(saved);
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const title = mode.kind === 'create' ? 'Gửi báo giá' : `Tạo phiên bản ${mode.quotation.version + 1}`;

  return (
    <form onSubmit={submit} className="mss-card mss-stack" noValidate aria-labelledby="quotation-form-title">
      <div>
        <h3 id="quotation-form-title" className="mss-section-title">
          {title}
        </h3>
        <p className="mss-card-meta">
          {mode.kind === 'create'
            ? 'Giá và điều khoản bạn gửi được giữ nguyên trong phiên bản này; muốn sửa sau đó hãy tạo phiên bản mới.'
            : 'Phiên bản cũ vẫn được lưu nguyên giá và điều khoản để người mua so sánh.'}
        </p>
      </div>

      <fieldset className="m-0 grid gap-4 border-0 p-0 md:grid-cols-2">
        <legend className="sr-only">Điều khoản báo giá</legend>
        {mode.kind === 'create' && (
          <div className="mss-field md:col-span-2">
            <label className="mss-label" htmlFor="q-store">
              Cửa hàng *
            </label>
            <select id="q-store" className="mss-select" value={storeId} onChange={(e) => setStoreId(e.target.value)}>
              <option value="">— Chọn cửa hàng đang hoạt động —</option>
              {activeStores.map((s) => (
                <option key={s.storeId} value={s.storeId}>
                  {s.name}
                </option>
              ))}
            </select>
            {activeStores.length === 0 && (
              <p className="mss-field-error m-0">Bạn chưa có cửa hàng ACTIVE. Kích hoạt cửa hàng trong Kênh người bán trước khi báo giá.</p>
            )}
          </div>
        )}
        <div className="mss-field">
          <label className="mss-label" htmlFor="q-deposit">
            Đặt cọc (%) *
          </label>
          <input id="q-deposit" className="mss-input" inputMode="decimal" value={depositPercent} onChange={(e) => setDepositPercent(e.target.value)} />
        </div>
        <div className="mss-field">
          <label className="mss-label" htmlFor="q-valid">
            Hiệu lực báo giá đến *
          </label>
          <input id="q-valid" className="mss-input" type="datetime-local" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
        </div>
        <div className="mss-field">
          <label className="mss-label" htmlFor="q-delivery">
            Ngày giao dự kiến *
          </label>
          <input id="q-delivery" className="mss-input" type="date" min={todayIsoDate()} value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
        </div>
        <div className="mss-field">
          <label className="mss-label" htmlFor="q-lead">
            Thời gian chuẩn bị (ngày)
          </label>
          <input id="q-lead" className="mss-input" inputMode="numeric" value={leadTimeDays} onChange={(e) => setLeadTimeDays(e.target.value)} />
        </div>
        <div className="mss-field">
          <label className="mss-label" htmlFor="q-ship-method">
            Phương thức giao
          </label>
          <input id="q-ship-method" className="mss-input" maxLength={100} value={shippingMethod} onChange={(e) => setShippingMethod(e.target.value)} placeholder="Xe lạnh, giao tận nơi…" />
        </div>
        <div className="mss-field">
          <label className="mss-label" htmlFor="q-ship-fee">
            Phí vận chuyển (₫) *
          </label>
          <input id="q-ship-fee" className="mss-input" inputMode="decimal" value={shippingFee} onChange={(e) => setShippingFee(e.target.value)} />
        </div>
        <div className="mss-field md:col-span-2">
          <label className="mss-label" htmlFor="q-terms">
            Điều khoản thanh toán
          </label>
          <textarea id="q-terms" className="mss-textarea" maxLength={10000} value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
        </div>
      </fieldset>

      <fieldset className="m-0 mss-stack border-0 p-0">
        <legend className="mss-label mb-2">Mục hàng ({rows.length}/{MAX_ITEMS})</legend>
        {rows.map((row, index) => {
          const error = showErrors ? itemErrors[index] : null;
          return (
            <div key={row.key} className="rounded-[var(--mss-radius-md)] border border-[var(--mss-border)] p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold">Mục {index + 1}</span>
                <div className="flex items-center gap-3">
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input type="checkbox" checked={row.catalog} onChange={(e) => updateRow(row.key, { catalog: e.target.checked })} />
                    Sản phẩm trong catalog
                  </label>
                  <button
                    type="button"
                    className="mss-button mss-button--danger mss-button--sm"
                    onClick={() => setRows((list) => list.filter((r) => r.key !== row.key))}
                    disabled={rows.length === 1}
                    aria-label={`Xóa mục ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {row.catalog ? (
                  <>
                    <div className="mss-field">
                      <label className="mss-label" htmlFor={`${row.key}-product`}>Mã sản phẩm *</label>
                      <input id={`${row.key}-product`} className="mss-input" inputMode="numeric" value={row.productId} onChange={(e) => updateRow(row.key, { productId: e.target.value.trim() })} />
                    </div>
                    <div className="mss-field">
                      <label className="mss-label" htmlFor={`${row.key}-variant`}>Mã biến thể *</label>
                      <input id={`${row.key}-variant`} className="mss-input" inputMode="numeric" value={row.variantId} onChange={(e) => updateRow(row.key, { variantId: e.target.value.trim() })} />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mss-field sm:col-span-2 lg:col-span-1">
                      <label className="mss-label" htmlFor={`${row.key}-name`}>Tên mục hàng *</label>
                      <input id={`${row.key}-name`} className="mss-input" maxLength={255} value={row.itemNameSnapshot} onChange={(e) => updateRow(row.key, { itemNameSnapshot: e.target.value })} />
                    </div>
                    <div className="mss-field">
                      <label className="mss-label" htmlFor={`${row.key}-sku`}>SKU</label>
                      <input id={`${row.key}-sku`} className="mss-input" maxLength={100} value={row.skuSnapshot} onChange={(e) => updateRow(row.key, { skuSnapshot: e.target.value })} />
                    </div>
                  </>
                )}
                <div className="mss-field">
                  <label className="mss-label" htmlFor={`${row.key}-qty`}>Số lượng *</label>
                  <input id={`${row.key}-qty`} className="mss-input" inputMode="numeric" value={row.quantity} onChange={(e) => updateRow(row.key, { quantity: e.target.value.trim() })} />
                </div>
                <div className="mss-field">
                  <label className="mss-label" htmlFor={`${row.key}-price`}>Đơn giá (₫) *</label>
                  <input id={`${row.key}-price`} className="mss-input" inputMode="decimal" value={row.unitPrice} onChange={(e) => updateRow(row.key, { unitPrice: e.target.value.trim() })} />
                </div>
                <div className="mss-field">
                  <label className="mss-label" htmlFor={`${row.key}-discount`}>Giảm giá (₫)</label>
                  <input id={`${row.key}-discount`} className="mss-input" inputMode="decimal" value={row.discountAmount} onChange={(e) => updateRow(row.key, { discountAmount: e.target.value.trim() })} />
                </div>
                <div className="mss-field sm:col-span-2 lg:col-span-3">
                  <label className="mss-label" htmlFor={`${row.key}-note`}>Ghi chú tùy chỉnh</label>
                  <input id={`${row.key}-note`} className="mss-input" maxLength={10000} value={row.customizationNote} onChange={(e) => updateRow(row.key, { customizationNote: e.target.value })} />
                </div>
              </div>
              {row.catalog && <p className="m-0 mt-2 text-sm text-gray-500">Tên và SKU lấy từ catalog; giá là giá thương lượng bạn nhập.</p>}
              {error && <p className="mss-field-error m-0 mt-2" role="alert">{error}</p>}
            </div>
          );
        })}
        <button
          type="button"
          className="mss-button mss-button--secondary self-start"
          onClick={() => setRows((list) => [...list, blankRow()])}
          disabled={rows.length >= MAX_ITEMS}
        >
          <Plus className="h-4 w-4" aria-hidden />
          Thêm mục hàng
        </button>
      </fieldset>

      <dl className="m-0 grid gap-2 rounded-[var(--mss-radius-md)] bg-[var(--mss-bg)] p-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-gray-500">Tạm tính hàng hóa</dt>
          <dd className="m-0 font-semibold tabular-nums">{centsToVnd(subtotalCents)}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Tổng (gồm vận chuyển)</dt>
          <dd className="m-0 mss-price">{centsToVnd(totalCents)}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Tiền cọc dự kiến</dt>
          <dd className="m-0 font-semibold tabular-nums">{centsToVnd(depositCents)}</dd>
        </div>
        <div className="text-xs text-gray-500 sm:col-span-3">Số liệu tạm tính để tham khảo; tổng chính thức do hệ thống tính khi lưu.</div>
      </dl>

      {showErrors && termErrors.length > 0 && (
        <ul className="mss-alert mss-alert--danger m-0 list-disc pl-8" role="alert">
          {termErrors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      {formError && (
        <p className="mss-alert mss-alert--danger m-0" role="alert">
          {formError}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" className="mss-button mss-button--secondary" onClick={onCancel} disabled={submitting}>
          Hủy
        </button>
        <button type="submit" className="mss-button mss-button--primary" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden />}
          {mode.kind === 'create' ? 'Gửi báo giá' : 'Gửi phiên bản mới'}
        </button>
      </div>
    </form>
  );
}
