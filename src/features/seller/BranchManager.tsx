import { useEffect, useState, type FormEvent } from 'react';
import { AlertTriangle, Clock, MapPin, Pencil, Phone, Plus, Star, Trash2 } from 'lucide-react';
import {
  storeBranchApi,
  type CreateStoreBranchRequest, type StoreBranchResponse, type StoreBranchStatus, type UpdateStoreBranchRequest
} from '../../services/api';
import { errorMessage } from '../../services/api/http';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import { BRANCH_STATUS, CARD } from './sellerShared';
import { ErrorAlert, LoadingText, SuccessText } from './SellerUi';

interface BranchManagerProps {
  storeId: number;
}

interface BranchDraft {
  name: string;
  addressLine: string;
  ward: string;
  district: string;
  city: string;
  phone: string;
  openingHours: string;
  primary: boolean;
  status: StoreBranchStatus;
}

const EMPTY_DRAFT: BranchDraft = {
  name: '', addressLine: '', ward: '', district: '', city: '', phone: '', openingHours: '', primary: false, status: 'ACTIVE'
};

function toDraft(branch: StoreBranchResponse): BranchDraft {
  return {
    name: branch.name,
    addressLine: branch.addressLine,
    ward: branch.ward ?? '',
    district: branch.district ?? '',
    city: branch.city,
    phone: branch.phone ?? '',
    openingHours: branch.openingHours ?? '',
    primary: branch.primary,
    status: branch.status
  };
}

function toCreateRequest(d: BranchDraft): CreateStoreBranchRequest {
  const optional = (value: string) => value.trim() || undefined;
  return {
    name: d.name.trim(),
    addressLine: d.addressLine.trim(),
    city: d.city.trim(),
    ward: optional(d.ward),
    district: optional(d.district),
    phone: optional(d.phone),
    openingHours: optional(d.openingHours),
    primary: d.primary || undefined
  };
}

/** Optional fields are sent as "" to clear them (null would keep the old value). */
function toUpdateRequest(d: BranchDraft, branch: StoreBranchResponse): UpdateStoreBranchRequest {
  return {
    name: d.name.trim(),
    addressLine: d.addressLine.trim(),
    city: d.city.trim(),
    ward: d.ward.trim(),
    district: d.district.trim(),
    phone: d.phone.trim(),
    openingHours: d.openingHours.trim(),
    status: d.status,
    // primary=false on the primary branch would leave the store without one; the flag only moves forward.
    primary: d.primary && !branch.primary ? true : undefined
  };
}

function formatBranchAddress(b: StoreBranchResponse): string {
  return [b.addressLine, b.ward, b.district, b.city].filter(Boolean).join(', ');
}

type Mode = { kind: 'create' } | { kind: 'edit'; branchId: number } | null;

export default function BranchManager({ storeId }: BranchManagerProps) {
  const [data, setData] = useState<{ storeId: number; list: StoreBranchResponse[] } | null>(null);
  const [loadError, setLoadError] = useState<{ storeId: number; message: string } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [mode, setMode] = useState<Mode>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let cancelled = false;
    storeBranchApi.list(storeId)
      .then((list) => { if (!cancelled) setData({ storeId, list }); })
      .catch((err: unknown) => { if (!cancelled) setLoadError({ storeId, message: errorMessage(err) }); });
    return () => { cancelled = true; };
  }, [storeId, reloadKey]);

  // Results of a previous storeId are ignored until the new store's list arrives.
  const branches = data?.storeId === storeId ? data.list : null;
  const error = loadError?.storeId === storeId ? loadError.message : '';

  const retry = () => {
    setLoadError(null);
    setData(null);
    setReloadKey((k) => k + 1);
  };

  /**
   * After a successful write: the primary flag can move between branches, so the whole list is reloaded.
   * A failed reload must not look like a failed write (the user would submit again).
   */
  const afterWrite = async (successMessage: string) => {
    setMode(null);
    setNotice(successMessage);
    try {
      setData({ storeId, list: await storeBranchApi.list(storeId) });
    } catch (err) {
      setActionError(`Không tải lại được danh sách chi nhánh: ${errorMessage(err)}`);
    }
  };

  const run = async (branchId: number, action: () => Promise<unknown>, successMessage: string) => {
    setBusyId(branchId);
    setActionError('');
    setNotice('');
    try {
      await action();
    } catch (err) {
      setActionError(errorMessage(err));
      setBusyId(null);
      return;
    }
    await afterWrite(successMessage);
    setBusyId(null);
  };

  // Errors from these two propagate to BranchForm, which shows them and keeps the draft.
  const create = async (draft: BranchDraft) => {
    await storeBranchApi.create(storeId, toCreateRequest(draft));
    await afterWrite(`Đã thêm chi nhánh "${draft.name.trim()}".`);
  };

  const update = async (branch: StoreBranchResponse, draft: BranchDraft) => {
    await storeBranchApi.update(storeId, branch.branchId, toUpdateRequest(draft, branch));
    await afterWrite(`Đã lưu chi nhánh "${draft.name.trim()}".`);
  };

  const remove = (branch: StoreBranchResponse) => {
    const othersLeft = (branches?.length ?? 0) > 1;
    const warning = branch.primary && othersLeft
      ? '\nĐây là chi nhánh chính: sau khi xóa, gian hàng sẽ không còn chi nhánh chính cho tới khi bạn đặt chi nhánh khác làm chính.'
      : '';
    if (!window.confirm(`Xóa chi nhánh "${branch.name}"? Thao tác này không thể hoàn tác.${warning}`)) return;
    void run(branch.branchId, () => storeBranchApi.remove(storeId, branch.branchId), `Đã xóa chi nhánh "${branch.name}".`);
  };

  const makePrimary = (branch: StoreBranchResponse) =>
    void run(branch.branchId, () => storeBranchApi.update(storeId, branch.branchId, { primary: true }),
      `"${branch.name}" là chi nhánh chính.`);

  const openMode = (next: Mode) => {
    setMode(next);
    setActionError('');
    setNotice('');
  };

  const noPrimary = !!branches && branches.length > 0 && !branches.some((b) => b.primary);

  return (
    <section className={`${CARD} space-y-4`} aria-labelledby={`branches-${storeId}-title`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
        <div>
          <h3 id={`branches-${storeId}-title`} className="font-bold text-gray-900 text-base">Chi nhánh cửa hàng</h3>
          <p className="text-sm text-gray-500 mt-1">Khách chỉ thấy các chi nhánh đang hoạt động; chi nhánh chính hiển thị đầu tiên.</p>
        </div>
        {branches && branches.length > 0 && mode?.kind !== 'create' && (
          <button type="button" className="mss-button mss-button--primary mss-button--sm" onClick={() => openMode({ kind: 'create' })}>
            <Plus className="w-4 h-4" aria-hidden />
            Thêm chi nhánh
          </button>
        )}
      </div>

      {error && <ErrorAlert message={error} onRetry={retry} />}
      {!branches && !error && <LoadingText label="Đang tải chi nhánh…" />}
      {actionError && <ErrorAlert message={actionError} />}
      <SuccessText message={notice} />
      {noPrimary && (
        <p className="mss-alert mss-alert--warning m-0 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
          Gian hàng chưa có chi nhánh chính. Hãy đặt một chi nhánh làm chi nhánh chính.
        </p>
      )}

      {mode?.kind === 'create' && branches && (
        <BranchForm
          title="Thêm chi nhánh"
          initial={{ ...EMPTY_DRAFT, primary: branches.length === 0 }}
          isNew
          firstBranch={branches.length === 0}
          currentlyPrimary={false}
          submitLabel="Thêm chi nhánh"
          onSubmit={create}
          onCancel={() => openMode(null)}
        />
      )}

      {branches?.length === 0 && mode?.kind !== 'create' && (
        <EmptyState
          title="Chưa có chi nhánh"
          description="Thêm địa chỉ cửa hàng vật lý để khách biết nơi mua trực tiếp."
          action={(
            <button type="button" className="mss-button mss-button--primary" onClick={() => openMode({ kind: 'create' })}>
              <Plus className="w-4 h-4" aria-hidden />
              Thêm chi nhánh đầu tiên
            </button>
          )}
        />
      )}

      {branches && branches.length > 0 && (
        <ul className="m-0 p-0 list-none space-y-3">
          {branches.map((branch) => (
            <li key={branch.branchId}>
              {mode?.kind === 'edit' && mode.branchId === branch.branchId ? (
                <BranchForm
                  title={`Sửa chi nhánh "${branch.name}"`}
                  initial={toDraft(branch)}
                  isNew={false}
                  firstBranch={false}
                  currentlyPrimary={branch.primary}
                  submitLabel="Lưu chi nhánh"
                  onSubmit={(draft) => update(branch, draft)}
                  onCancel={() => openMode(null)}
                />
              ) : (
                <div className="border border-gray-100 rounded-xl p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="min-w-0 space-y-1 text-sm">
                    <p className="font-semibold text-gray-900 text-base flex flex-wrap items-center gap-2 m-0">
                      <span className="break-words">{branch.name}</span>
                      {branch.primary && <span className="mss-badge mss-badge--info">Chi nhánh chính</span>}
                      <StatusBadge map={BRANCH_STATUS} status={branch.status} />
                    </p>
                    <p className="text-gray-600 flex items-start gap-2 m-0">
                      <MapPin className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
                      <span className="break-words">{formatBranchAddress(branch)}</span>
                    </p>
                    {branch.phone && (
                      <p className="text-gray-600 flex items-center gap-2 m-0">
                        <Phone className="w-4 h-4 shrink-0" aria-hidden />
                        {branch.phone}
                      </p>
                    )}
                    {branch.openingHours && (
                      <p className="text-gray-600 flex items-center gap-2 m-0">
                        <Clock className="w-4 h-4 shrink-0" aria-hidden />
                        {branch.openingHours}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    {!branch.primary && (
                      <button type="button" className="mss-button mss-button--secondary mss-button--sm"
                        disabled={busyId !== null} onClick={() => makePrimary(branch)}>
                        <Star className="w-4 h-4" aria-hidden />
                        Đặt làm chính
                      </button>
                    )}
                    <button type="button" className="mss-button mss-button--secondary mss-button--sm"
                      disabled={busyId !== null} onClick={() => openMode({ kind: 'edit', branchId: branch.branchId })}>
                      <Pencil className="w-4 h-4" aria-hidden />
                      Sửa
                    </button>
                    <button type="button" className="mss-button mss-button--danger mss-button--sm"
                      disabled={busyId !== null} onClick={() => remove(branch)}>
                      <Trash2 className="w-4 h-4" aria-hidden />
                      {busyId === branch.branchId ? 'Đang xử lý…' : 'Xóa'}
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Create / edit form
// ---------------------------------------------------------------------------

interface BranchFormProps {
  title: string;
  initial: BranchDraft;
  isNew: boolean;
  firstBranch: boolean;
  currentlyPrimary: boolean;
  submitLabel: string;
  onSubmit: (draft: BranchDraft) => Promise<void>;
  onCancel: () => void;
}

function BranchForm({ title, initial, isNew, firstBranch, currentlyPrimary, submitLabel, onSubmit, onCancel }: BranchFormProps) {
  const [draft, setDraft] = useState<BranchDraft>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const set = (patch: Partial<BranchDraft>) => setDraft((d) => ({ ...d, ...patch }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim() || !draft.addressLine.trim() || !draft.city.trim()) {
      setError('Vui lòng nhập tên chi nhánh, địa chỉ và tỉnh/thành phố.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onSubmit(draft);
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  };

  const primaryLocked = firstBranch || currentlyPrimary;
  const primaryHelp = firstBranch
    ? 'Chi nhánh đầu tiên luôn là chi nhánh chính.'
    : currentlyPrimary
      ? 'Để đổi chi nhánh chính, hãy đặt một chi nhánh khác làm chính.'
      : 'Chọn để chuyển cờ chi nhánh chính sang chi nhánh này.';

  return (
    <form onSubmit={submit} className="border border-primary-100 bg-gray-50 rounded-xl p-4 space-y-4" noValidate>
      <h4 className="font-semibold text-gray-900 text-base m-0">{title}</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="mss-field">
          <span className="mss-label">Tên chi nhánh *</span>
          <input className="mss-input" required maxLength={255} value={draft.name} onChange={(e) => set({ name: e.target.value })} />
        </label>
        <label className="mss-field">
          <span className="mss-label">Số điện thoại</span>
          <input className="mss-input" type="tel" maxLength={30} value={draft.phone} onChange={(e) => set({ phone: e.target.value })} />
        </label>
        <label className="mss-field sm:col-span-2">
          <span className="mss-label">Địa chỉ (số nhà, đường) *</span>
          <input className="mss-input" required maxLength={500} value={draft.addressLine}
            onChange={(e) => set({ addressLine: e.target.value })} />
        </label>
        <label className="mss-field">
          <span className="mss-label">Phường/xã</span>
          <input className="mss-input" maxLength={100} value={draft.ward} onChange={(e) => set({ ward: e.target.value })} />
        </label>
        <label className="mss-field">
          <span className="mss-label">Quận/huyện</span>
          <input className="mss-input" maxLength={100} value={draft.district} onChange={(e) => set({ district: e.target.value })} />
        </label>
        <label className="mss-field">
          <span className="mss-label">Tỉnh/thành phố *</span>
          <input className="mss-input" required maxLength={100} value={draft.city} onChange={(e) => set({ city: e.target.value })} />
        </label>
        <label className="mss-field">
          <span className="mss-label">Giờ mở cửa</span>
          <input className="mss-input" maxLength={255} value={draft.openingHours} placeholder="Ví dụ 08:00–21:00"
            onChange={(e) => set({ openingHours: e.target.value })} />
        </label>
        {!isNew && (
          <label className="mss-field">
            <span className="mss-label">Trạng thái</span>
            <select className="mss-select" value={draft.status} onChange={(e) => set({ status: e.target.value as StoreBranchStatus })}>
              <option value="ACTIVE">{BRANCH_STATUS.ACTIVE.label}</option>
              <option value="INACTIVE">{BRANCH_STATUS.INACTIVE.label}</option>
            </select>
          </label>
        )}
        <div className="mss-field sm:col-span-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
            <input type="checkbox" className="w-4 h-4" checked={primaryLocked || draft.primary} disabled={primaryLocked}
              onChange={(e) => set({ primary: e.target.checked })} />
            Chi nhánh chính
          </label>
          <span className="text-xs text-gray-500">{primaryHelp}</span>
        </div>
      </div>
      {error && <ErrorAlert message={error} />}
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" className="mss-button mss-button--secondary" onClick={onCancel} disabled={submitting}>Hủy</button>
        <button type="submit" className="mss-button mss-button--primary" disabled={submitting}>
          {submitting ? 'Đang lưu…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
