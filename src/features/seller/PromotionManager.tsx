import { useEffect, useState, type FormEvent } from 'react';
import { CalendarClock, Pencil, Plus, Tag } from 'lucide-react';
import {
  promotionApi,
  type PromotionResponse, type PromotionStatus, type StoreResponse, type UpdatePromotionRequest
} from '../../services/api';
import { errorMessage } from '../../services/api/http';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import { CARD, PROMOTION_STATUS, formatUtcDateTime, localInputToUtc, parseUtc, utcToLocalInput } from './sellerShared';
import { ErrorAlert, LoadingText, SuccessText } from './SellerUi';
import PromotionRulesEditor from './PromotionRulesEditor';
import { describeRule, newRuleDraft, ruleToDraft, toRuleRequests, type RuleDraft } from './promotionRules';
import { useStoreVariants, type VariantOption } from './useStoreVariants';

interface PromotionManagerProps {
  /** The supplier's own stores (e.g. from StoreSettings' onStoresChanged). */
  stores: StoreResponse[];
}

type VariantsState = ReturnType<typeof useStoreVariants>;

/**
 * Owner status changes (PromotionServiceImpl.validateStatusTransition): DRAFT → ACTIVE/DISABLED,
 * ACTIVE ↔ DISABLED, never back to DRAFT; EXPIRED is never set by hand; an ended promotion cannot be activated.
 */
const STATUS_ACTIONS: Record<PromotionStatus, { next: 'ACTIVE' | 'DISABLED'; label: string }[]> = {
  DRAFT: [{ next: 'ACTIVE', label: 'Kích hoạt' }, { next: 'DISABLED', label: 'Tắt' }],
  ACTIVE: [{ next: 'DISABLED', label: 'Tắt khuyến mãi' }],
  DISABLED: [{ next: 'ACTIVE', label: 'Bật lại' }],
  EXPIRED: []
};

async function loadAllPromotions(): Promise<PromotionResponse[]> {
  const first = await promotionApi.list({ mine: true, size: 100 });
  const rest = await Promise.all(Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, i) =>
    promotionApi.list({ mine: true, size: 100, page: i + 1 })));
  return [first, ...rest].flatMap((page) => page.items);
}

function variantLabeler(variants: VariantOption[] | undefined) {
  return (variantId: number) => {
    const v = variants?.find((x) => x.variantId === variantId);
    return v ? `${v.productName} – ${v.variantName}` : `biến thể #${variantId}`;
  };
}

/** Validates a local date-time window and converts it to UTC; returns an error message when invalid. */
function toUtcWindow(startLocal: string, endLocal: string): { startAt: string; endAt: string } | string {
  const startAt = localInputToUtc(startLocal);
  const endAt = localInputToUtc(endLocal);
  if (!startAt || !endAt) return 'Vui lòng nhập thời gian bắt đầu và kết thúc.';
  if (new Date(startAt) >= new Date(endAt)) return 'Thời gian bắt đầu phải trước thời gian kết thúc.';
  return { startAt, endAt };
}

export default function PromotionManager({ stores }: PromotionManagerProps) {
  const [promotions, setPromotions] = useState<PromotionResponse[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState('');
  // "Now" for the started/ended hints, captured whenever the list changes (render must stay pure).
  const [now, setNow] = useState(() => Date.now());
  const variants = useStoreVariants();
  const { ensure } = variants;

  useEffect(() => {
    let cancelled = false;
    loadAllPromotions()
      .then((list) => {
        if (cancelled) return;
        setNow(Date.now());
        setPromotions(list);
      })
      .catch((err: unknown) => { if (!cancelled) setLoadError(errorMessage(err)); });
    return () => { cancelled = true; };
  }, [reloadKey]);

  // Variant names for the rule summaries of every store that has promotions.
  useEffect(() => {
    new Set((promotions ?? []).map((p) => p.storeId)).forEach(ensure);
  }, [promotions, ensure]);

  const retry = () => {
    setLoadError('');
    setPromotions(null);
    setReloadKey((k) => k + 1);
  };

  const storeName = (storeId: number) => stores.find((s) => s.storeId === storeId)?.name ?? `Gian hàng #${storeId}`;
  const replace = (saved: PromotionResponse) => {
    setNow(Date.now());
    setPromotions((list) => list?.map((p) => (p.promotionId === saved.promotionId ? saved : p)) ?? [saved]);
  };

  return (
    <div className="space-y-6">
      <div className={`${CARD} flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3`}>
        <p className="text-sm text-gray-600 m-0">
          Khuyến mãi mới ở trạng thái Nháp. Chỉ khuyến mãi <strong>Đang bật</strong>, trong thời gian hiệu lực và thuộc gian hàng
          đang mở bán mới được áp dụng khi khách thanh toán. Thời gian hiển thị theo giờ máy của bạn.
        </p>
        {stores.length > 0 && !creating && (
          <button type="button" className="mss-button mss-button--primary shrink-0" onClick={() => { setCreating(true); setNotice(''); }}>
            <Plus className="w-4 h-4" aria-hidden />
            Tạo khuyến mãi
          </button>
        )}
      </div>

      <SuccessText message={notice} />
      {creating && (
        <CreatePromotionForm
          stores={stores}
          variants={variants}
          onCancel={() => setCreating(false)}
          onCreated={(created) => {
            setNow(Date.now());
            setPromotions((list) => [created, ...(list ?? [])]);
            setCreating(false);
            setNotice(`Đã tạo khuyến mãi "${created.name}" ở trạng thái Nháp. Kích hoạt khi bạn sẵn sàng.`);
          }}
        />
      )}

      {loadError && <ErrorAlert message={loadError} onRetry={retry} />}
      {!promotions && !loadError && <LoadingText label="Đang tải khuyến mãi…" />}
      {promotions?.length === 0 && !creating && (
        <EmptyState
          title="Chưa có khuyến mãi"
          description={stores.length === 0
            ? 'Bạn cần tạo gian hàng trước khi tạo khuyến mãi.'
            : 'Tạo chương trình giảm giá hoặc “Mua X tặng Y” cho sản phẩm của gian hàng.'}
        />
      )}
      {promotions && promotions.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
          {promotions.map((promotion) => (
            <PromotionCard
              key={promotion.promotionId}
              promotion={promotion}
              storeName={storeName(promotion.storeId)}
              now={now}
              variants={variants}
              onSaved={replace}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

interface CreatePromotionFormProps {
  stores: StoreResponse[];
  variants: VariantsState;
  onCreated: (promotion: PromotionResponse) => void;
  onCancel: () => void;
}

function CreatePromotionForm({ stores, variants, onCreated, onCancel }: CreatePromotionFormProps) {
  // A suspended store rejects every promotion change (403), so it cannot be chosen.
  const usable = stores.filter((s) => s.status !== 'SUSPENDED');
  const [storeId, setStoreId] = useState<number | null>(usable[0]?.storeId ?? null);
  const [name, setName] = useState('');
  const [startLocal, setStartLocal] = useState('');
  const [endLocal, setEndLocal] = useState('');
  const [rules, setRules] = useState<RuleDraft[]>(() => [newRuleDraft()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { ensure } = variants;

  useEffect(() => {
    if (storeId !== null) ensure(storeId);
  }, [storeId, ensure]);

  const changeStore = (next: number) => {
    setStoreId(next);
    // Variants belong to one store; the backend rejects rules pointing at another store's variants.
    setRules((list) => list.map((r) => ({ ...r, targetVariantId: '', rewardVariantId: '' })));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (storeId === null) return setError('Chọn gian hàng áp dụng.');
    if (!name.trim()) return setError('Tên khuyến mãi không được để trống.');
    const period = toUtcWindow(startLocal, endLocal);
    if (typeof period === 'string') return setError(period);
    const ruleRequests = toRuleRequests(rules);
    if (typeof ruleRequests === 'string') return setError(ruleRequests);
    setSubmitting(true);
    setError('');
    try {
      onCreated(await promotionApi.create({ storeId, name: name.trim(), ...period, rules: ruleRequests }));
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className={`${CARD} space-y-4`} aria-labelledby="create-promotion-title" noValidate>
      <h3 id="create-promotion-title" className="font-bold text-gray-900 text-base m-0">Tạo khuyến mãi</h3>
      {usable.length === 0 ? (
        <p className="mss-alert mss-alert--warning m-0">Mọi gian hàng của bạn đang bị quản trị viên khóa nên chưa thể tạo khuyến mãi.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="mss-field">
              <span className="mss-label">Gian hàng *</span>
              <select className="mss-select" value={storeId ?? ''} onChange={(e) => changeStore(Number(e.target.value))}>
                {usable.map((s) => <option key={s.storeId} value={s.storeId}>{s.name}</option>)}
              </select>
            </label>
            <label className="mss-field">
              <span className="mss-label">Tên khuyến mãi *</span>
              <input className="mss-input" required maxLength={255} value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="mss-field">
              <span className="mss-label">Bắt đầu *</span>
              <input className="mss-input" type="datetime-local" value={startLocal} onChange={(e) => setStartLocal(e.target.value)} />
            </label>
            <label className="mss-field">
              <span className="mss-label">Kết thúc *</span>
              <input className="mss-input" type="datetime-local" value={endLocal} onChange={(e) => setEndLocal(e.target.value)} />
            </label>
          </div>
          {storeId !== null && (
            <PromotionRulesEditor
              idPrefix="create-promotion"
              rules={rules}
              onChange={setRules}
              variants={variants.byStore[storeId]}
              variantsError={variants.errors[storeId]}
              onRetryVariants={() => ensure(storeId)}
            />
          )}
        </>
      )}
      {error && <ErrorAlert message={error} />}
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" className="mss-button mss-button--secondary" onClick={onCancel} disabled={submitting}>Hủy</button>
        <button type="submit" className="mss-button mss-button--primary" disabled={submitting || usable.length === 0}>
          {submitting ? 'Đang tạo…' : 'Tạo khuyến mãi'}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// One promotion: view, edit name/window, edit rules, change status
// ---------------------------------------------------------------------------

interface PromotionCardProps {
  promotion: PromotionResponse;
  storeName: string;
  /** Epoch ms used for the started/ended hints. */
  now: number;
  variants: VariantsState;
  onSaved: (promotion: PromotionResponse) => void;
}

function PromotionCard({ promotion, storeName, now, variants, onSaved }: PromotionCardProps) {
  const [mode, setMode] = useState<'view' | 'info' | 'rules'>('view');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const storeVariants = variants.byStore[promotion.storeId];
  const label = variantLabeler(storeVariants);
  const titleId = `promotion-${promotion.promotionId}-title`;

  const start = parseUtc(promotion.startAt);
  const end = parseUtc(promotion.endAt);
  const ended = !!end && end.getTime() <= now;
  const phase = ended ? 'Đã kết thúc' : start && start.getTime() > now ? 'Chưa bắt đầu' : 'Đang trong thời gian hiệu lực';

  const open = (next: typeof mode) => {
    setMode(next);
    setError('');
    setNotice('');
  };

  const saved = (result: PromotionResponse, message: string) => {
    onSaved(result);
    setMode('view');
    setError('');
    setNotice(message);
  };

  const changeStatus = async (next: 'ACTIVE' | 'DISABLED') => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      saved(await promotionApi.update(promotion.promotionId, { status: next }),
        next === 'ACTIVE' ? 'Đã kích hoạt khuyến mãi.' : 'Đã tắt khuyến mãi.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={`${CARD} space-y-3 min-w-0`} aria-labelledby={titleId}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StatusBadge map={PROMOTION_STATUS} status={promotion.status} />
        <span className="text-sm text-gray-500 truncate">{storeName}</span>
      </div>
      <h3 id={titleId} className="font-bold text-gray-900 text-base m-0 flex items-start gap-2">
        <Tag className="w-4 h-4 shrink-0 mt-1 text-primary-700" aria-hidden />
        <span className="break-words">{promotion.name}</span>
      </h3>
      <p className="text-sm text-gray-600 m-0 flex items-start gap-2">
        <CalendarClock className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
        <span>
          {formatUtcDateTime(promotion.startAt)} – {formatUtcDateTime(promotion.endAt)}
          <span className={`block text-xs ${ended ? 'text-amber-700' : 'text-gray-500'}`}>{phase}</span>
        </span>
      </p>

      {mode === 'view' && (
        <ul className="m-0 p-0 pt-3 list-none text-sm text-gray-700 space-y-1 border-t border-gray-100">
          {promotion.rules.length === 0 && <li className="text-gray-500">Chưa có điều kiện khuyến mãi.</li>}
          {promotion.rules.map((rule) => <li key={rule.promotionRuleId}>• {describeRule(rule, label)}</li>)}
        </ul>
      )}
      {mode === 'info' && (
        <PromotionInfoForm promotion={promotion} onCancel={() => open('view')}
          onSaved={(result) => saved(result, 'Đã lưu thông tin khuyến mãi.')} />
      )}
      {mode === 'rules' && (
        <PromotionRulesForm promotion={promotion} variants={variants} onCancel={() => open('view')}
          onSaved={(result) => saved(result, 'Đã cập nhật điều kiện khuyến mãi.')} />
      )}

      {error && <ErrorAlert message={error} />}
      <SuccessText message={notice} />

      {mode === 'view' && (
        <div className="border-t border-gray-100 pt-3 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button type="button" className="mss-button mss-button--secondary mss-button--sm" disabled={busy} onClick={() => open('info')}>
              <Pencil className="w-4 h-4" aria-hidden />
              Sửa tên &amp; thời gian
            </button>
            <button type="button" className="mss-button mss-button--secondary mss-button--sm" disabled={busy} onClick={() => open('rules')}>
              <Pencil className="w-4 h-4" aria-hidden />
              Sửa điều kiện
            </button>
            {(STATUS_ACTIONS[promotion.status] ?? []).map((action) => (
              <button
                key={action.next}
                type="button"
                className={`mss-button mss-button--sm ${action.next === 'ACTIVE' ? 'mss-button--primary' : 'mss-button--secondary'}`}
                disabled={busy || (action.next === 'ACTIVE' && ended)}
                onClick={() => changeStatus(action.next)}
              >
                {busy ? 'Đang cập nhật…' : action.label}
              </button>
            ))}
          </div>
          {ended && promotion.status !== 'ACTIVE' && promotion.status !== 'EXPIRED' && (
            <p className="text-xs text-gray-500 m-0">
              Khuyến mãi đã kết thúc nên không thể kích hoạt; hãy lùi thời gian kết thúc nếu muốn chạy lại.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function PromotionInfoForm({ promotion, onSaved, onCancel }: {
  promotion: PromotionResponse;
  onSaved: (promotion: PromotionResponse) => void;
  onCancel: () => void;
}) {
  const initialStart = utcToLocalInput(promotion.startAt);
  const initialEnd = utcToLocalInput(promotion.endAt);
  const [name, setName] = useState(promotion.name);
  const [startLocal, setStartLocal] = useState(initialStart);
  const [endLocal, setEndLocal] = useState(initialEnd);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Tên khuyến mãi không được để trống.');
    const period = toUtcWindow(startLocal, endLocal);
    if (typeof period === 'string') return setError(period);
    // Unchanged times are omitted so the stored seconds are not rounded off by the minute-precision input.
    const body: UpdatePromotionRequest = {};
    if (name.trim() !== promotion.name) body.name = name.trim();
    if (startLocal !== initialStart) body.startAt = period.startAt;
    if (endLocal !== initialEnd) body.endAt = period.endAt;
    if (Object.keys(body).length === 0) {
      onCancel();
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      onSaved(await promotionApi.update(promotion.promotionId, body));
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="border-t border-gray-100 pt-3 space-y-3" noValidate>
      <label className="mss-field">
        <span className="mss-label">Tên khuyến mãi *</span>
        <input className="mss-input" required maxLength={255} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="mss-field">
          <span className="mss-label">Bắt đầu *</span>
          <input className="mss-input" type="datetime-local" value={startLocal} onChange={(e) => setStartLocal(e.target.value)} />
        </label>
        <label className="mss-field">
          <span className="mss-label">Kết thúc *</span>
          <input className="mss-input" type="datetime-local" value={endLocal} onChange={(e) => setEndLocal(e.target.value)} />
        </label>
      </div>
      {error && <ErrorAlert message={error} />}
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" className="mss-button mss-button--secondary mss-button--sm" onClick={onCancel} disabled={submitting}>Hủy</button>
        <button type="submit" className="mss-button mss-button--primary mss-button--sm" disabled={submitting}>
          {submitting ? 'Đang lưu…' : 'Lưu'}
        </button>
      </div>
    </form>
  );
}

function PromotionRulesForm({ promotion, variants, onSaved, onCancel }: {
  promotion: PromotionResponse;
  variants: VariantsState;
  onSaved: (promotion: PromotionResponse) => void;
  onCancel: () => void;
}) {
  const [rules, setRules] = useState<RuleDraft[]>(() =>
    (promotion.rules.length > 0 ? promotion.rules.map(ruleToDraft) : [newRuleDraft()]));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { ensure } = variants;

  useEffect(() => {
    ensure(promotion.storeId);
  }, [promotion.storeId, ensure]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const requests = toRuleRequests(rules);
    if (typeof requests === 'string') return setError(requests);
    setSubmitting(true);
    setError('');
    try {
      onSaved(await promotionApi.replaceRules(promotion.promotionId, requests));
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="border-t border-gray-100 pt-3 space-y-3" noValidate>
      <p className="text-xs text-gray-500 m-0">Lưu sẽ thay toàn bộ điều kiện cũ bằng danh sách dưới đây.</p>
      <PromotionRulesEditor
        idPrefix={`promotion-${promotion.promotionId}`}
        rules={rules}
        onChange={setRules}
        variants={variants.byStore[promotion.storeId]}
        variantsError={variants.errors[promotion.storeId]}
        onRetryVariants={() => ensure(promotion.storeId)}
      />
      {error && <ErrorAlert message={error} />}
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" className="mss-button mss-button--secondary mss-button--sm" onClick={onCancel} disabled={submitting}>Hủy</button>
        <button type="submit" className="mss-button mss-button--primary mss-button--sm" disabled={submitting}>
          {submitting ? 'Đang lưu…' : 'Lưu điều kiện'}
        </button>
      </div>
    </form>
  );
}
