import { FormEvent, useEffect, useId, useState } from 'react';
import { ArrowLeft, CheckCircle2, Circle, Loader2, Pencil, Plus } from 'lucide-react';
import {
  productApi, variantApi,
  type ProductResponse, type ProductStatus, type StoreResponse, type UpdateProductRequest, type UpdateVariantRequest,
  type VariantResponse
} from '../../services/api';
import { errorMessage } from '../../services/api/http';
import { formatVnd } from '../../utils/format';
import StatusBadge from '../../components/ui/StatusBadge';
import VariantImageField from '../catalog/VariantImageField';
import { formatUtcDateTime } from './displayFormat';
import {
  PRODUCT_STATUS, productFormErrors, statusChoices, variantFormErrors,
  type CategoryChoice, type FieldErrors, type ProductForm, type VariantForm
} from './productCatalog';

type EditableStatus = Exclude<ProductStatus, 'OUT_OF_STOCK'>;

interface ProductDetailPanelProps {
  productId: number;
  stores: StoreResponse[];
  categories: CategoryChoice[] | null;
  onBack: () => void;
  /** After any successful write, so the product list can refresh (status, lowest price…). */
  onChanged: () => void;
}

const CARD = 'bg-white rounded-2xl shadow-sm border border-gray-100 p-6';

function statusLabel(status: ProductStatus, current: ProductStatus): string {
  const label = PRODUCT_STATUS[status]?.label ?? status;
  return status === current ? `${label} (hiện tại)` : label;
}

/** One product as its owner sees it (drafts and every variant): edit product fields/status and variants. */
export default function ProductDetailPanel({ productId, stores, categories, onBack, onChanged }: ProductDetailPanelProps) {
  const [product, setProduct] = useState<ProductResponse | null>(null);
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing] = useState<{ variant: VariantResponse | null } | null>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    productApi.get(productId).then(setProduct).catch((err: unknown) => setLoadError(errorMessage(err)));
  }, [productId]);

  const back = (
    <button type="button" className="mss-button mss-button--secondary mss-button--sm" onClick={onBack}>
      <ArrowLeft className="w-4 h-4" /> Danh sách sản phẩm
    </button>
  );

  if (!product) {
    return (
      <div className="space-y-4">
        {back}
        {loadError
          ? <p role="alert" className="mss-alert mss-alert--danger m-0">{loadError}</p>
          : <p className="text-sm text-gray-500">Đang tải sản phẩm…</p>}
      </div>
    );
  }

  const store = stores.find((s) => s.storeId === product.storeId);
  // The server rejects every catalog write of a SUSPENDED store (403).
  const locked = store?.status === 'SUSPENDED';
  const hasVariant = product.variants.length > 0;
  const hasActiveVariant = product.variants.some((v) => v.status === 'ACTIVE');

  const variantSaved = (saved: VariantResponse, created: boolean) => {
    setProduct({
      ...product,
      variants: created
        ? [...product.variants, saved]
        : product.variants.map((v) => (v.variantId === saved.variantId ? saved : v))
    });
    setEditing(null);
    setNotice(created
      ? `Đã thêm biến thể ${saved.sku} (trạng thái Nháp). Sửa biến thể để chuyển sang Đang bán.`
      : `Đã lưu biến thể ${saved.sku}.`);
    onChanged();
  };

  return (
    <div className="space-y-6">
      {back}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 m-0">{product.name}</h1>
          <p className="text-gray-500 text-sm mt-1 mb-0">
            <span className="font-mono">{product.productCode}</span> · {store?.name ?? `Gian hàng #${product.storeId}`}
            {' '}· Tạo {formatUtcDateTime(product.createdAt)} · Cập nhật {formatUtcDateTime(product.updatedAt)}
          </p>
        </div>
        <StatusBadge map={PRODUCT_STATUS} status={product.status} />
      </div>

      {notice && <p role="status" className="mss-alert m-0">{notice}</p>}
      {locked && (
        <p role="alert" className="mss-alert mss-alert--danger m-0">
          Gian hàng đang bị tạm khóa nên không thể chỉnh sửa sản phẩm và biến thể.
        </p>
      )}
      {!locked && store && store.status !== 'ACTIVE' && (
        <p className="mss-alert mss-alert--warning m-0">
          Gian hàng chưa hoạt động, nên sản phẩm chưa hiển thị với khách kể cả khi ở trạng thái Đang bán.
        </p>
      )}

      {product.status === 'DRAFT' && (
        <div className={`${CARD} space-y-2`}>
          <h3 className="font-bold text-gray-900 text-base m-0">Các bước để mở bán</h3>
          <ol className="m-0 p-0 list-none space-y-1 text-sm text-gray-700">
            {[
              { done: hasVariant, text: 'Thêm ít nhất một biến thể (SKU, giá, tồn kho).' },
              { done: hasActiveVariant, text: 'Sửa biến thể, chuyển trạng thái sang Đang bán.' },
              { done: false, text: 'Chuyển trạng thái sản phẩm sang Đang bán và lưu.' }
            ].map((step) => (
              <li key={step.text} className="flex items-center gap-2">
                {step.done
                  ? <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" aria-label="Đã xong" />
                  : <Circle className="w-4 h-4 text-gray-400 shrink-0" aria-label="Chưa xong" />}
                {step.text}
              </li>
            ))}
          </ol>
        </div>
      )}

      <ProductInfoForm
        key={product.updatedAt}
        product={product}
        categories={categories}
        locked={locked}
        onSaved={(saved) => {
          setProduct(saved);
          setNotice('Đã lưu thông tin sản phẩm.');
          onChanged();
        }}
      />

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-bold text-gray-900 text-sm m-0">Biến thể ({product.variants.length})</h3>
          <button
            type="button"
            className="mss-button mss-button--primary mss-button--sm"
            disabled={locked}
            onClick={() => {
              setNotice('');
              setEditing({ variant: null });
            }}
          >
            <Plus className="w-4 h-4" /> Thêm biến thể
          </button>
        </div>
        {!hasVariant && <p className="p-4 m-0 text-sm text-gray-500">Sản phẩm chưa có biến thể nào.</p>}
        {hasVariant && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 uppercase">
                  <th className="py-3 px-4 font-semibold">Biến thể</th>
                  <th className="py-3 px-4 font-semibold">SKU</th>
                  <th className="py-3 px-4 font-semibold text-right">Giá bán</th>
                  <th className="py-3 px-4 font-semibold text-right">Tồn kho</th>
                  <th className="py-3 px-4 font-semibold text-center">Trạng thái</th>
                  <th className="py-3 px-4 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {product.variants.map((v) => (
                  <tr key={v.variantId} className={editing?.variant?.variantId === v.variantId ? 'bg-amber-50/40' : ''}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {v.imageUrl
                          ? <img src={v.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                          : <span className="w-10 h-10 rounded-lg bg-gray-100 shrink-0" aria-hidden="true" />}
                        <span className="font-semibold text-gray-900">{v.variantName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-700">{v.sku}</td>
                    <td className="py-3 px-4 text-right font-bold text-primary-700">{formatVnd(v.basePrice)}</td>
                    <td className="py-3 px-4 text-right">{v.stockQuantity.toLocaleString('vi-VN')}</td>
                    <td className="py-3 px-4 text-center"><StatusBadge map={PRODUCT_STATUS} status={v.status} /></td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        className="mss-button mss-button--secondary mss-button--sm"
                        disabled={locked}
                        onClick={() => {
                          setNotice('');
                          setEditing({ variant: v });
                        }}
                      >
                        <Pencil className="w-4 h-4" /> Sửa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <VariantEditor
          key={editing.variant?.variantId ?? 'new'}
          product={product}
          variant={editing.variant}
          onCancel={() => setEditing(null)}
          onSaved={variantSaved}
        />
      )}
    </div>
  );
}

interface ProductInfoFormProps {
  product: ProductResponse;
  categories: CategoryChoice[] | null;
  locked: boolean;
  onSaved: (product: ProductResponse) => void;
}

function ProductInfoForm({ product, categories, locked, onSaved }: ProductInfoFormProps) {
  const id = useId();
  const [form, setForm] = useState<ProductForm>({
    name: product.name, categoryId: String(product.categoryId), description: product.description ?? ''
  });
  const [status, setStatus] = useState<ProductStatus>(product.status);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const hasActiveVariant = product.variants.some((v) => v.status === 'ACTIVE');
  // The product may sit in a category that has since been deactivated; keep it selectable as "no change".
  const currentCategoryListed = categories?.some((c) => c.categoryId === product.categoryId);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found = productFormErrors(form);
    if (status === 'ACTIVE' && product.status !== 'ACTIVE' && !hasActiveVariant)
      found.status = 'Cần ít nhất một biến thể Đang bán trước khi mở bán sản phẩm.';
    setErrors(found);
    setError('');
    if (Object.keys(found).length > 0) return;

    const body: UpdateProductRequest = {};
    if (form.name.trim() !== product.name) body.name = form.name.trim();
    if (Number(form.categoryId) !== product.categoryId) body.categoryId = Number(form.categoryId);
    if (form.description !== (product.description ?? '')) body.description = form.description.trim();
    if (status !== product.status) body.status = status as EditableStatus;
    if (Object.keys(body).length === 0) {
      setError('Không có thay đổi nào để lưu.');
      return;
    }
    setSaving(true);
    try {
      onSaved(await productApi.update(product.productId, body));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className={`${CARD} space-y-4`} onSubmit={submit} noValidate>
      <h3 className="font-bold text-gray-900 text-base m-0">Thông tin sản phẩm</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="mss-field md:col-span-2">
          <label className="mss-label" htmlFor={`${id}-name`}>Tên sản phẩm *</label>
          <input
            id={`${id}-name`}
            className="mss-input"
            maxLength={255}
            value={form.name}
            disabled={locked}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          {errors.name && <p className="mss-field-error m-0">{errors.name}</p>}
        </div>
        <div className="mss-field">
          <label className="mss-label" htmlFor={`${id}-category`}>Danh mục *</label>
          <select
            id={`${id}-category`}
            className="mss-select"
            value={form.categoryId}
            disabled={locked || !categories}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          >
            {!currentCategoryListed && (
              <option value={product.categoryId}>
                {categories ? `Danh mục #${product.categoryId} (không còn hoạt động)` : 'Đang tải danh mục…'}
              </option>
            )}
            {categories?.map((c) => <option key={c.categoryId} value={c.categoryId}>{c.label}</option>)}
          </select>
          {errors.categoryId && <p className="mss-field-error m-0">{errors.categoryId}</p>}
        </div>
        <div className="mss-field">
          <label className="mss-label" htmlFor={`${id}-status`}>Trạng thái</label>
          <select
            id={`${id}-status`}
            className="mss-select"
            value={status}
            disabled={locked}
            onChange={(e) => setStatus(e.target.value as ProductStatus)}
          >
            {statusChoices(product.status).map((s) => <option key={s} value={s}>{statusLabel(s, product.status)}</option>)}
          </select>
          {errors.status
            ? <p className="mss-field-error m-0">{errors.status}</p>
            : <p className="text-xs text-gray-500 m-0">Đang bán: khách thấy sản phẩm. Tạm ẩn: ẩn khỏi sàn. Không thể quay lại Nháp.</p>}
        </div>
        <div className="mss-field md:col-span-2">
          <label className="mss-label" htmlFor={`${id}-description`}>Mô tả</label>
          <textarea
            id={`${id}-description`}
            className="mss-textarea"
            rows={4}
            value={form.description}
            disabled={locked}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
      </div>
      {error && <p role="alert" className="mss-alert mss-alert--danger m-0">{error}</p>}
      <div className="flex justify-end">
        <button type="submit" className="mss-button mss-button--primary" disabled={saving || locked}>
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} Lưu sản phẩm
        </button>
      </div>
    </form>
  );
}

interface VariantEditorProps {
  product: ProductResponse;
  /** null = create a new variant. */
  variant: VariantResponse | null;
  onCancel: () => void;
  onSaved: (variant: VariantResponse, created: boolean) => void;
}

function VariantEditor({ product, variant, onCancel, onSaved }: VariantEditorProps) {
  const id = useId();
  const original: VariantForm | null = variant && {
    sku: variant.sku,
    variantName: variant.variantName,
    basePrice: String(variant.basePrice),
    stockQuantity: String(variant.stockQuantity),
    imageUrl: variant.imageUrl ?? ''
  };
  const [form, setForm] = useState<VariantForm>(original ?? {
    sku: '', variantName: '', basePrice: '', stockQuantity: '0', imageUrl: ''
  });
  const [status, setStatus] = useState<ProductStatus | null>(variant?.status ?? null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const changed = (field: keyof VariantForm) => !original || form[field].trim() !== original[field];
  const set = (field: keyof VariantForm) => (e: { target: { value: string } }) => setForm({ ...form, [field]: e.target.value });
  const priceText = form.basePrice.trim();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (uploading || saving) return;
    const found = variantFormErrors(form, original ? changed : undefined);
    const lastActiveOfActiveProduct = variant?.status === 'ACTIVE' && product.status === 'ACTIVE'
      && !product.variants.some((v) => v.variantId !== variant.variantId && v.status === 'ACTIVE');
    if (variant && status !== variant.status && lastActiveOfActiveProduct)
      found.status = 'Đây là biến thể đang bán cuối cùng của sản phẩm đang mở bán. Hãy chuyển sản phẩm sang Tạm ẩn trước.';
    setErrors(found);
    setError('');
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      if (!variant) {
        const created = await variantApi.create(product.productId, {
          sku: form.sku.trim(),
          variantName: form.variantName.trim(),
          imageUrl: form.imageUrl.trim() || undefined,
          basePrice: Number(priceText),
          stockQuantity: Number(form.stockQuantity.trim())
        });
        onSaved(created, true);
        return;
      }
      const body: UpdateVariantRequest = {};
      if (changed('sku')) body.sku = form.sku.trim();
      if (changed('variantName')) body.variantName = form.variantName.trim();
      if (changed('basePrice')) body.basePrice = Number(priceText);
      if (changed('stockQuantity')) body.stockQuantity = Number(form.stockQuantity.trim());
      // "" clears the image (null would mean "keep").
      if (changed('imageUrl')) body.imageUrl = form.imageUrl.trim();
      if (status && status !== variant.status) body.status = status as EditableStatus;
      if (Object.keys(body).length === 0) {
        setError('Không có thay đổi nào để lưu.');
        return;
      }
      onSaved(await variantApi.update(product.productId, variant.variantId, body), false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className={`${CARD} space-y-4`} onSubmit={submit} noValidate>
      <div>
        <h3 className="font-bold text-gray-900 text-base m-0">
          {variant ? <>Sửa biến thể <span className="font-mono">{variant.sku}</span></> : 'Thêm biến thể'}
        </h3>
        {!variant && (
          <p className="text-sm text-gray-500 mt-1 mb-0">Biến thể mới ở trạng thái Nháp. SKU là duy nhất trên toàn sàn.</p>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="mss-field">
          <label className="mss-label" htmlFor={`${id}-sku`}>SKU *</label>
          <input id={`${id}-sku`} className="mss-input font-mono" maxLength={100} value={form.sku} onChange={set('sku')} />
          {errors.sku && <p className="mss-field-error m-0">{errors.sku}</p>}
        </div>
        <div className="mss-field">
          <label className="mss-label" htmlFor={`${id}-name`}>Tên biến thể *</label>
          <input
            id={`${id}-name`}
            className="mss-input"
            maxLength={255}
            placeholder="Hộp 4 bánh 150g…"
            value={form.variantName}
            onChange={set('variantName')}
          />
          {errors.variantName && <p className="mss-field-error m-0">{errors.variantName}</p>}
        </div>
        <div className="mss-field">
          <label className="mss-label" htmlFor={`${id}-price`}>Giá bán (VND) *</label>
          <input id={`${id}-price`} className="mss-input" inputMode="numeric" value={form.basePrice} onChange={set('basePrice')} />
          {errors.basePrice
            ? <p className="mss-field-error m-0">{errors.basePrice}</p>
            : /^\d{1,16}$/.test(priceText) && <p className="text-xs text-gray-500 m-0">= {formatVnd(Number(priceText))}</p>}
        </div>
        <div className="mss-field">
          <label className="mss-label" htmlFor={`${id}-stock`}>Tồn kho *</label>
          <input id={`${id}-stock`} className="mss-input" inputMode="numeric" value={form.stockQuantity} onChange={set('stockQuantity')} />
          {errors.stockQuantity
            ? <p className="mss-field-error m-0">{errors.stockQuantity}</p>
            : variant && <p className="text-xs text-gray-500 m-0">Không thể đặt thấp hơn số lượng khách đang giữ khi thanh toán.</p>}
        </div>
        <VariantImageField
          productId={product.productId}
          value={form.imageUrl}
          onChange={(imageUrl) => setForm((current) => ({ ...current, imageUrl }))}
          onUploadingChange={setUploading}
          error={errors.imageUrl}
          disabled={saving}
        />
        {variant && status && (
          <div className="mss-field">
            <label className="mss-label" htmlFor={`${id}-status`}>Trạng thái</label>
            <select
              id={`${id}-status`}
              className="mss-select"
              value={status}
              onChange={(e) => setStatus(e.target.value as ProductStatus)}
            >
              {statusChoices(variant.status).map((s) => <option key={s} value={s}>{statusLabel(s, variant.status)}</option>)}
            </select>
            {errors.status
              ? <p className="mss-field-error m-0">{errors.status}</p>
              : <p className="text-xs text-gray-500 m-0">Chỉ biến thể Đang bán mới được khách đặt mua. Không thể quay lại Nháp.</p>}
          </div>
        )}
      </div>
      {error && <p role="alert" className="mss-alert mss-alert--danger m-0">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className="mss-button mss-button--secondary" onClick={onCancel} disabled={saving || uploading}>Hủy</button>
        <button type="submit" className="mss-button mss-button--primary" disabled={saving || uploading}>
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} {variant ? 'Lưu biến thể' : 'Thêm biến thể'}
        </button>
      </div>
    </form>
  );
}
