import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AlertTriangle, Plus, Save, Store as StoreIcon } from 'lucide-react';
import {
  storeApi,
  type CreateStoreRequest, type StoreResponse, type StoreStatus, type UpdateStoreRequest
} from '../../services/api';
import { errorMessage } from '../../services/api/http';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/ui/StatusBadge';
import { formatVnd } from '../../utils/format';
import { CARD, STORE_STATUS, parseWholeNumber } from './sellerShared';
import { ErrorAlert, LoadingText, SuccessText } from './SellerUi';

interface StoreSettingsProps {
  /** Called with the full store list after it loads and after every create/update. */
  onStoresChanged?: (stores: StoreResponse[]) => void;
}

interface StatusAction {
  next: StoreStatus;
  label: string;
  confirm?: string;
}

/**
 * Status changes the owner may make (CatalogStoreService StoreServiceImpl.validateStatusTransition):
 * DRAFT → ACTIVE/INACTIVE, ACTIVE ↔ INACTIVE. Publishing needs no admin approval;
 * only an administrator can suspend a store or lift a suspension. Nothing returns to DRAFT.
 */
const STATUS_ACTIONS: Record<StoreStatus, StatusAction[]> = {
  DRAFT: [{ next: 'ACTIVE', label: 'Mở bán gian hàng' }],
  ACTIVE: [{
    next: 'INACTIVE',
    label: 'Tạm ngừng bán',
    confirm: 'Tạm ngừng bán? Gian hàng, sản phẩm và khuyến mãi sẽ bị ẩn khỏi sàn cho tới khi bạn mở bán lại.'
  }],
  INACTIVE: [{ next: 'ACTIVE', label: 'Mở bán lại' }],
  SUSPENDED: []
};

const STATUS_HELP: Record<StoreStatus, string> = {
  DRAFT: 'Gian hàng nháp chưa hiển thị trên sàn. Bạn tự mở bán khi đã sẵn sàng, không cần quản trị viên duyệt.',
  ACTIVE: 'Gian hàng đang hiển thị công khai; khách xem và đặt được sản phẩm đang bán.',
  INACTIVE: 'Gian hàng đang ẩn khỏi sàn; khách không xem hay đặt hàng được.',
  SUSPENDED: 'Gian hàng bị quản trị viên tạm khóa. Chỉ quản trị viên mới mở khóa được; trong thời gian này bạn không thể '
    + 'quản lý chi nhánh, sản phẩm hay khuyến mãi. Vui lòng liên hệ quản trị viên sàn.'
};

interface StoreDraft {
  name: string;
  description: string;
  logoUrl: string;
  bannerUrl: string;
  shippingFee: string;
}

function toDraft(store: StoreResponse): StoreDraft {
  return {
    name: store.name,
    description: store.description ?? '',
    logoUrl: store.logoUrl ?? '',
    bannerUrl: store.bannerUrl ?? '',
    shippingFee: store.shippingFee == null ? '' : String(store.shippingFee)
  };
}

export default function StoreSettings({ onStoresChanged }: StoreSettingsProps) {
  const { supplierProfile } = useAuth();
  const [stores, setStores] = useState<StoreResponse[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const onChangedRef = useRef(onStoresChanged);

  useEffect(() => {
    onChangedRef.current = onStoresChanged;
  });

  useEffect(() => {
    let cancelled = false;
    storeApi.list({ mine: true })
      .then((list) => { if (!cancelled) setStores(list); })
      .catch((err: unknown) => { if (!cancelled) setLoadError(errorMessage(err)); });
    return () => { cancelled = true; };
  }, [reloadKey]);

  useEffect(() => {
    if (stores) onChangedRef.current?.(stores);
  }, [stores]);

  const retry = () => {
    setLoadError('');
    setStores(null);
    setReloadKey((k) => k + 1);
  };

  const replaceStore = (saved: StoreResponse) =>
    setStores((list) => list?.map((s) => (s.storeId === saved.storeId ? saved : s)) ?? [saved]);

  const notVerified = supplierProfile && supplierProfile.verificationStatus !== 'VERIFIED';

  return (
    <div className="space-y-6">
      {notVerified && (
        <p role="status" className="mss-alert mss-alert--warning m-0">
          Hồ sơ nhà cung cấp chưa được xác minh (đang chờ quản trị viên duyệt hoặc bị từ chối). Bạn chỉ tạo và chỉnh sửa
          gian hàng được sau khi hồ sơ được quản trị viên xác minh.
        </p>
      )}
      {loadError && <ErrorAlert message={loadError} onRetry={retry} />}
      {!stores && !loadError && <LoadingText label="Đang tải gian hàng…" />}
      {stores?.length === 0 && <CreateStoreForm onCreated={(store) => setStores([store])} />}
      {stores?.map((store) => <StoreCard key={store.storeId} store={store} onSaved={replaceStore} />)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create (only shown while the supplier has no store)
// ---------------------------------------------------------------------------

function CreateStoreForm({ onCreated }: { onCreated: (store: StoreResponse) => void }) {
  const [form, setForm] = useState({ name: '', description: '', logoUrl: '', bannerUrl: '', themeKey: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setError('Tên gian hàng không được để trống.');
      return;
    }
    const body: CreateStoreRequest = { name };
    if (form.description.trim()) body.description = form.description.trim();
    if (form.logoUrl.trim()) body.logoUrl = form.logoUrl.trim();
    if (form.bannerUrl.trim()) body.bannerUrl = form.bannerUrl.trim();
    if (form.themeKey.trim()) body.themeKey = form.themeKey.trim();
    setSubmitting(true);
    setError('');
    try {
      onCreated(await storeApi.create(body));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className={`${CARD} space-y-4`} aria-labelledby="create-store-title" noValidate>
      <div>
        <h3 id="create-store-title" className="font-bold text-gray-900 text-base">Tạo gian hàng</h3>
        <p className="text-sm text-gray-500 mt-1">
          Bạn chưa có gian hàng. Gian hàng mới ở trạng thái Nháp; sau khi tạo, hãy cấu hình phí vận chuyển rồi mở bán.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="mss-field sm:col-span-2">
          <span className="mss-label">Tên gian hàng *</span>
          <input className="mss-input" required maxLength={255} value={form.name} onChange={(e) => set({ name: e.target.value })} />
        </label>
        <label className="mss-field">
          <span className="mss-label">URL logo</span>
          <input className="mss-input" maxLength={500} value={form.logoUrl} onChange={(e) => set({ logoUrl: e.target.value })}
            placeholder="https://…" />
        </label>
        <label className="mss-field">
          <span className="mss-label">URL ảnh bìa (banner)</span>
          <input className="mss-input" maxLength={500} value={form.bannerUrl} onChange={(e) => set({ bannerUrl: e.target.value })}
            placeholder="https://…" />
        </label>
        <label className="mss-field">
          <span className="mss-label">Mã giao diện (theme key)</span>
          <input className="mss-input" maxLength={100} value={form.themeKey} onChange={(e) => set({ themeKey: e.target.value })} />
          <span className="text-xs text-gray-500">Tùy chọn; để trống nếu chưa được sàn cấp mã giao diện.</span>
        </label>
        <label className="mss-field sm:col-span-2">
          <span className="mss-label">Mô tả gian hàng</span>
          <textarea className="mss-textarea" maxLength={2000} rows={3} value={form.description}
            onChange={(e) => set({ description: e.target.value })} />
        </label>
      </div>
      {error && <ErrorAlert message={error} />}
      <div className="flex justify-end">
        <button type="submit" className="mss-button mss-button--primary" disabled={submitting}>
          <Plus className="w-4 h-4" aria-hidden />
          {submitting ? 'Đang tạo…' : 'Tạo gian hàng'}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Edit one store
// ---------------------------------------------------------------------------

function StoreCard({ store, onSaved }: { store: StoreResponse; onSaved: (store: StoreResponse) => void }) {
  const [draft, setDraft] = useState<StoreDraft>(() => toDraft(store));
  const [busy, setBusy] = useState<'save' | 'status' | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const set = (patch: Partial<StoreDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setNotice('');
  };
  const titleId = `store-${store.storeId}-title`;
  const feeId = `store-${store.storeId}-fee`;
  const typedFee = parseWholeNumber(draft.shippingFee);

  const apply = async (body: UpdateStoreRequest, kind: 'save' | 'status', successMessage: string) => {
    setBusy(kind);
    setError('');
    setNotice('');
    try {
      const saved = await storeApi.update(store.storeId, body);
      onSaved(saved);
      setDraft(toDraft(saved));
      setNotice(successMessage);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const fail = (message: string) => {
    setNotice('');
    setError(message);
  };

  const save = (e: FormEvent) => {
    e.preventDefault();
    const name = draft.name.trim();
    if (!name) {
      fail('Tên gian hàng không được để trống.');
      return;
    }
    // Send only changed fields; omitted fields keep their current value on the server.
    const body: UpdateStoreRequest = {};
    if (name !== store.name) body.name = name;
    if (draft.description.trim() !== (store.description ?? '')) body.description = draft.description.trim();
    if (draft.logoUrl.trim() !== (store.logoUrl ?? '')) body.logoUrl = draft.logoUrl.trim();
    if (draft.bannerUrl.trim() !== (store.bannerUrl ?? '')) body.bannerUrl = draft.bannerUrl.trim();
    if (draft.shippingFee.trim() !== toDraft(store).shippingFee) {
      if (!draft.shippingFee.trim()) {
        fail('Không thể xóa phí vận chuyển đã cấu hình. Nhập 0 nếu gian hàng miễn phí vận chuyển.');
        return;
      }
      if (typedFee === null) {
        fail('Phí vận chuyển phải là số nguyên VND không âm, ví dụ 30000.');
        return;
      }
      body.shippingFee = typedFee;
    }
    if (Object.keys(body).length === 0) {
      setError('');
      setNotice('Không có thay đổi để lưu.');
      return;
    }
    void apply(body, 'save', 'Đã lưu thông tin gian hàng.');
  };

  const changeStatus = (action: StatusAction) => {
    const confirmText = action.next === 'ACTIVE' && store.shippingFee == null
      ? 'Gian hàng chưa có phí vận chuyển nên khách chưa thể đặt hàng. Vẫn mở bán?'
      : action.confirm;
    if (confirmText && !window.confirm(confirmText)) return;
    void apply({ status: action.next }, 'status', `Đã chuyển gian hàng sang trạng thái "${STORE_STATUS[action.next].label}".`);
  };

  return (
    <section className={`${CARD} space-y-4`} aria-labelledby={titleId}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
        <h3 id={titleId} className="font-bold text-gray-900 text-base flex items-center gap-2 min-w-0">
          <StoreIcon className="w-5 h-5 text-primary-700 shrink-0" aria-hidden />
          <span className="truncate">{store.name}</span>
          <span className="font-mono text-sm font-normal text-gray-500">{store.storeCode}</span>
        </h3>
        <StatusBadge map={STORE_STATUS} status={store.status} />
      </div>

      {store.shippingFee == null && (
        <p className="mss-alert mss-alert--warning m-0 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
          <span>
            Chưa cấu hình phí vận chuyển. Khách <strong>không thể thanh toán</strong> đơn hàng của gian hàng này cho tới khi
            bạn nhập phí vận chuyển (nhập 0 nếu miễn phí).
          </span>
        </p>
      )}

      <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-4" noValidate>
        <label className="mss-field">
          <span className="mss-label">Tên hiển thị trên sàn *</span>
          <input className="mss-input" required maxLength={255} value={draft.name} onChange={(e) => set({ name: e.target.value })} />
        </label>
        <div className="mss-field">
          <label className="mss-label" htmlFor={feeId}>Phí vận chuyển cố định (VND / đơn)</label>
          <input
            id={feeId}
            className="mss-input"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={draft.shippingFee}
            onChange={(e) => set({ shippingFee: e.target.value })}
            placeholder="Ví dụ 30000"
            aria-describedby={`${feeId}-help`}
          />
          <span id={`${feeId}-help`} className="text-xs text-gray-500">
            {typedFee !== null ? `= ${formatVnd(typedFee)}. ` : ''}Số nguyên VND, áp dụng một lần cho mỗi đơn của gian hàng.
          </span>
        </div>
        <label className="mss-field">
          <span className="mss-label">URL logo</span>
          <input className="mss-input" maxLength={500} value={draft.logoUrl} onChange={(e) => set({ logoUrl: e.target.value })}
            placeholder="https://…" />
        </label>
        <label className="mss-field">
          <span className="mss-label">URL ảnh bìa (banner)</span>
          <input className="mss-input" maxLength={500} value={draft.bannerUrl} onChange={(e) => set({ bannerUrl: e.target.value })}
            placeholder="https://…" />
        </label>
        <label className="mss-field sm:col-span-2">
          <span className="mss-label">Mô tả gian hàng</span>
          <textarea className="mss-textarea" maxLength={2000} rows={3} value={draft.description}
            onChange={(e) => set({ description: e.target.value })} />
        </label>
        <div className="sm:col-span-2 space-y-3">
          {error && <ErrorAlert message={error} />}
          <SuccessText message={notice} />
          <div className="flex justify-end">
            <button type="submit" className="mss-button mss-button--primary" disabled={busy !== null}>
              <Save className="w-4 h-4" aria-hidden />
              {busy === 'save' ? 'Đang lưu…' : 'Lưu thay đổi'}
            </button>
          </div>
        </div>
      </form>

      <div className="border-t border-gray-100 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-gray-600 m-0">{STATUS_HELP[store.status] ?? ''}</p>
        <div className="flex flex-wrap gap-2 shrink-0">
          {(STATUS_ACTIONS[store.status] ?? []).map((action) => (
            <button
              key={action.next}
              type="button"
              className={`mss-button mss-button--sm ${action.next === 'ACTIVE' ? 'mss-button--primary' : 'mss-button--secondary'}`}
              disabled={busy !== null}
              onClick={() => changeStatus(action)}
            >
              {busy === 'status' ? 'Đang cập nhật…' : action.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
