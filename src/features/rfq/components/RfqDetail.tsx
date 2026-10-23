import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Ban, Lock, LogIn, MessageSquare, Send } from 'lucide-react';
import StatusBadge from '../../../components/ui/StatusBadge';
import { errorMessage } from '../../../services/api/http';
import type { Session } from '../../../services/api/session';
import { formatDate, formatDateTime } from '../../../utils/format';
import { QUOTATION_STATUS, RFQ_STATUS } from '../../../utils/status';
import { conversationApi } from '../../chat/api';
import { lookupApi, quotationApi, rfqApi } from '../api';
import { formatMoney } from '../format';
import type { Quotation, QuotationSummary, Rfq, StoreInfo, SupplierProfile } from '../types';
import { storeLabel, useStoreNames } from '../useStoreNames';
import DecisionDialog from './DecisionDialog';
import QuotationCompare from './QuotationCompare';
import QuotationDetail from './QuotationDetail';
import QuotationForm from './QuotationForm';
import { isIntakeExpired } from './RfqList';
import { ErrorBlock, InfoRow, LoadingRows } from './ui';

interface RfqDetailProps {
  rfqId: string;
  session: Session | null;
  supplier: SupplierProfile | null;
  initialQuotationId?: string | null;
  onBack: () => void;
  onOpenConversation: (conversationId: string) => void;
  onRequireSignIn: () => void;
}

type Composer = { kind: 'create'; stores: StoreInfo[] } | { kind: 'revise'; quotation: Quotation } | null;

/** Newest version per store: only it may be revised, and a store with one pending must revise instead of creating. */
function latestByStore(quotations: QuotationSummary[]): Map<string, QuotationSummary> {
  const latest = new Map<string, QuotationSummary>();
  quotations.forEach((q) => {
    const current = latest.get(q.storeId);
    if (!current || q.version > current.version) latest.set(q.storeId, q);
  });
  return latest;
}

export default function RfqDetail({ rfqId, session, supplier, initialQuotationId, onBack, onOpenConversation, onRequireSignIn }: RfqDetailProps) {
  const [rfq, setRfq] = useState<Rfq | null>(null);
  const [error, setError] = useState('');
  const [quotations, setQuotations] = useState<QuotationSummary[] | null>(null);
  const [quotationsError, setQuotationsError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(initialQuotationId ?? null);
  const [showHistory, setShowHistory] = useState(false);
  const [composer, setComposer] = useState<Composer>(null);
  const [composerError, setComposerError] = useState('');
  const [rfqDialog, setRfqDialog] = useState<'close' | 'cancel' | null>(null);
  const [chatError, setChatError] = useState('');
  const detailRef = useRef<HTMLDivElement>(null);

  const owner = !!rfq?.customerId;
  const isSupplier = !!session && !!supplier && !owner;
  const verified = supplier?.verificationStatus === 'VERIFIED';

  const loadRfq = useCallback(() => {
    setError('');
    rfqApi
      .get(rfqId)
      .then(setRfq)
      .catch((e) => setError(errorMessage(e)));
  }, [rfqId]);

  const loadQuotations = useCallback(() => {
    setQuotationsError('');
    quotationApi
      .listForRfq(rfqId)
      .then((page) => setQuotations(page.items))
      .catch((e) => setQuotationsError(errorMessage(e)));
  }, [rfqId]);

  useEffect(loadRfq, [loadRfq, session?.user.userId]);
  // Reset only when the viewer changes; refreshes keep the list (and the open detail/dialog) on screen.
  useEffect(() => setQuotations(null), [session?.user.userId]);
  useEffect(() => {
    if (session && rfq && (owner || isSupplier)) loadQuotations();
  }, [session, rfq, owner, isSupplier, loadQuotations]);

  const storeNames = useStoreNames((quotations ?? []).map((q) => q.storeId));
  const latest = useMemo(() => latestByStore(quotations ?? []), [quotations]);
  const selected = quotations?.find((q) => q.quotationId === selectedId) ?? null;

  const select = (quotationId: string) => {
    setSelectedId(quotationId);
    setComposer(null);
    requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  // A new RFQ object re-runs the quotations effect, so reloading the RFQ refreshes both.
  const refresh = loadRfq;

  const openChat = async (supplierId?: string) => {
    setChatError('');
    const conversation = await conversationApi.open(rfqId, supplierId);
    onOpenConversation(conversation.conversationId);
  };

  const startCreate = async () => {
    setComposerError('');
    try {
      const busyStores = new Set(
        [...latest.values()].filter((q) => q.status === 'SUBMITTED' || q.status === 'EXPIRED').map((q) => q.storeId)
      );
      const active = (await lookupApi.myStores()).filter((s) => s.status === 'ACTIVE');
      const stores = active.filter((s) => !busyStores.has(String(s.storeId)));
      if (active.length === 0) {
        setComposerError('Bạn chưa có cửa hàng đang hoạt động. Kích hoạt cửa hàng trong Kênh người bán trước khi báo giá.');
        return;
      }
      if (stores.length === 0) {
        setComposerError('Mỗi cửa hàng của bạn đã có báo giá đang chờ cho yêu cầu này. Hãy mở báo giá đó và tạo phiên bản mới.');
        return;
      }
      setSelectedId(null);
      setComposer({ kind: 'create', stores });
    } catch (e) {
      setComposerError(errorMessage(e));
    }
  };

  if (error) {
    return (
      <div className="mss-stack">
        <BackButton onBack={onBack} />
        <ErrorBlock message={error} onRetry={loadRfq} />
      </div>
    );
  }
  if (!rfq) return <LoadingRows rows={2} label="Đang tải yêu cầu báo giá…" />;

  const intakeOpen = rfq.status === 'OPEN' && !isIntakeExpired(rfq);

  return (
    <div className="mss-stack">
      <BackButton onBack={onBack} />

      <section className="mss-card mss-stack" aria-labelledby="rfq-detail-title">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="mss-card-meta">{rfq.rfqCode}</p>
            <h2 id="rfq-detail-title" className="mss-section-title break-words">
              {rfq.title}
            </h2>
          </div>
          <div className="flex flex-wrap gap-1">
            <StatusBadge map={RFQ_STATUS} status={rfq.status} />
            {isIntakeExpired(rfq) && <span className="mss-badge mss-badge--warning">Hết hạn nhận báo giá</span>}
          </div>
        </header>

        <dl className="m-0 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoRow label="Số lượng">{rfq.quantity.toLocaleString('vi-VN')} sản phẩm</InfoRow>
          <InfoRow label="Ngân sách dự kiến">{rfq.budgetAmount ? formatMoney(rfq.budgetAmount) : 'Thỏa thuận'}</InfoRow>
          <InfoRow label="Ngày cần giao">{rfq.requestedDeliveryDate ? formatDate(rfq.requestedDeliveryDate) : 'Chưa chốt'}</InfoRow>
          <InfoRow label="Nhận báo giá đến">{rfq.expiresAt ? formatDateTime(rfq.expiresAt) : 'Không giới hạn'}</InfoRow>
          {owner && (
            <>
              <div className="sm:col-span-2">
                <InfoRow label="Địa điểm giao (chỉ bạn thấy)">{rfq.deliveryLocation ?? '—'}</InfoRow>
              </div>
              <div className="sm:col-span-2">
                <InfoRow label="Yêu cầu tùy chỉnh (chỉ bạn thấy)">
                  <span className="whitespace-pre-wrap font-normal">{rfq.customizationRequirements ?? '—'}</span>
                </InfoRow>
              </div>
            </>
          )}
        </dl>
        {rfq.description && <p className="m-0 whitespace-pre-wrap text-gray-700">{rfq.description}</p>}

        {owner && (rfq.status === 'OPEN' || rfq.status === 'CLOSED') && (
          <div className="flex flex-wrap gap-3 border-t border-[var(--mss-border)] pt-4">
            {rfq.status === 'OPEN' && (
              <button type="button" className="mss-button mss-button--secondary" onClick={() => setRfqDialog('close')}>
                <Lock className="h-4 w-4" aria-hidden />
                Ngừng nhận báo giá
              </button>
            )}
            <button type="button" className="mss-button mss-button--danger" onClick={() => setRfqDialog('cancel')}>
              <Ban className="h-4 w-4" aria-hidden />
              Hủy yêu cầu
            </button>
          </div>
        )}
      </section>

      {/* Buyer: compare every supplier's offers */}
      {owner && (
        <section className="mss-section" aria-labelledby="compare-title">
          <h2 id="compare-title" className="mss-section-title">
            Báo giá nhận được
          </h2>
          {quotationsError && <ErrorBlock message={quotationsError} onRetry={loadQuotations} />}
          {!quotations && !quotationsError && <LoadingRows rows={2} />}
          {quotations && (
            <QuotationCompare
              quotations={quotations}
              storeNames={storeNames}
              selectedId={selectedId}
              showHistory={showHistory}
              onToggleHistory={setShowHistory}
              onSelect={select}
            />
          )}
        </section>
      )}

      {/* Supplier: own versions for this RFQ */}
      {isSupplier && (
        <section className="mss-section" aria-labelledby="mine-title">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="mine-title" className="mss-section-title">
              Báo giá của bạn
            </h2>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="mss-button mss-button--secondary"
                onClick={() => openChat().catch((e) => setChatError(errorMessage(e)))}
              >
                <MessageSquare className="h-4 w-4" aria-hidden />
                Nhắn tin với người mua
              </button>
              {verified && intakeOpen && (
                <button type="button" className="mss-button mss-button--primary" onClick={startCreate}>
                  <Send className="h-4 w-4" aria-hidden />
                  Gửi báo giá
                </button>
              )}
            </div>
          </div>
          {!verified && (
            <p className="mss-alert mss-alert--warning m-0">
              Hồ sơ nhà cung cấp của bạn chưa được xác minh (trạng thái: {supplier?.verificationStatus}). Bạn cần được xác minh để gửi báo
              giá và mở hội thoại mới.
            </p>
          )}
          {verified && !intakeOpen && (
            <p className="mss-alert m-0">Yêu cầu này đã ngừng nhận báo giá mới. Báo giá đang chờ vẫn có thể được người mua chấp nhận.</p>
          )}
          {chatError && <ErrorBlock message={chatError} />}
          {composerError && <ErrorBlock message={composerError} />}
          {quotationsError && <ErrorBlock message={quotationsError} onRetry={loadQuotations} />}
          {!quotations && !quotationsError && <LoadingRows rows={1} />}
          {quotations && quotations.length === 0 && !composer && (
            <p className="m-0 text-gray-600">Bạn chưa gửi báo giá cho yêu cầu này.</p>
          )}
          {quotations && quotations.length > 0 && (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {quotations.map((q) => (
                <li key={q.quotationId}>
                  <button
                    type="button"
                    onClick={() => select(q.quotationId)}
                    aria-pressed={q.quotationId === selectedId}
                    className={`mss-card flex w-full cursor-pointer flex-wrap items-center justify-between gap-3 p-4 text-left ${
                      q.quotationId === selectedId ? 'border-[var(--mss-primary)] bg-[var(--mss-primary-soft)]' : ''
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block font-semibold">
                        {storeLabel(storeNames, q.storeId)} · Phiên bản {q.version}
                      </span>
                      <span className="block text-sm text-gray-500">Gửi {formatDateTime(q.submittedAt)}</span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="mss-price">{formatMoney(q.totalAmount)}</span>
                      <StatusBadge map={QUOTATION_STATUS} status={q.status} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {!session && (
        <section className="mss-card flex flex-wrap items-center justify-between gap-3">
          <p className="m-0 text-gray-700">Đăng nhập để gửi báo giá (nhà cung cấp) hoặc quản lý yêu cầu của bạn.</p>
          <button type="button" className="mss-button mss-button--primary" onClick={onRequireSignIn}>
            <LogIn className="h-4 w-4" aria-hidden />
            Đăng nhập
          </button>
        </section>
      )}
      {session && !owner && !supplier && (
        <p className="mss-alert m-0">Chỉ nhà cung cấp đã được xác minh mới có thể gửi báo giá cho yêu cầu này.</p>
      )}

      <div ref={detailRef} className="scroll-mt-4">
        {composer && (
          <QuotationForm
            key={composer.kind === 'revise' ? composer.quotation.quotationId : 'create'}
            rfq={rfq}
            mode={composer}
            onCancel={() => setComposer(null)}
            onSaved={(saved) => {
              setComposer(null);
              setSelectedId(saved.quotationId);
              loadQuotations();
            }}
          />
        )}
        {!composer && selected && (owner || isSupplier) && (
          <QuotationDetail
            key={selected.quotationId}
            quotationId={selected.quotationId}
            viewer={owner ? 'buyer' : 'supplier'}
            storeName={storeLabel(storeNames, selected.storeId)}
            isLatest={latest.get(selected.storeId)?.quotationId === selected.quotationId}
            onChanged={refresh}
            onRevise={(quotation) => setComposer({ kind: 'revise', quotation })}
            onOpenChat={() => openChat(owner ? selected.supplierId : undefined)}
          />
        )}
      </div>

      {rfqDialog === 'close' && (
        <DecisionDialog
          title="Ngừng nhận báo giá mới?"
          description="Nhà cung cấp không gửi thêm báo giá mới được. Những báo giá đang chờ vẫn còn hiệu lực để bạn chấp nhận."
          confirmLabel="Ngừng nhận"
          onConfirm={() => rfqApi.close(rfq.rfqId).then(setRfq)}
          onClose={() => setRfqDialog(null)}
        />
      )}
      {rfqDialog === 'cancel' && (
        <DecisionDialog
          title="Hủy yêu cầu báo giá?"
          description="Không thể chấp nhận thêm báo giá nào sau khi hủy. Đơn hàng đã tạo từ báo giá trước đó không bị ảnh hưởng."
          confirmLabel="Hủy yêu cầu"
          danger
          onConfirm={() => rfqApi.cancel(rfq.rfqId).then(setRfq)}
          onClose={() => setRfqDialog(null)}
        />
      )}
    </div>
  );
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button type="button" className="mss-button mss-button--secondary mss-button--sm self-start" onClick={onBack}>
      <ArrowLeft className="h-4 w-4" aria-hidden />
      Quay lại danh sách
    </button>
  );
}
