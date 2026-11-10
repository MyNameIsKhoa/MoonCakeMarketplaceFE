import { useEffect, useState } from 'react';
import { Building2, FileText, Inbox, Store, UserRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SUPPLIER_VERIFICATION } from '../../utils/status';
import { openConversationChat } from '../chat/chatWidgetEvents';
import MyQuotations from './components/MyQuotations';
import RfqCreateForm from './components/RfqCreateForm';
import RfqDetail from './components/RfqDetail';
import RfqList from './components/RfqList';

type Tab = 'feed' | 'mine' | 'quotations';
type InitialTab = Tab | 'messages';

type View =
  | { kind: 'list' }
  | { kind: 'create' }
  | { kind: 'detail'; rfqId: string; quotationId?: string | null };

const TABS: { id: Tab; label: string; icon: typeof FileText; supplier: boolean }[] = [
  { id: 'feed', label: 'Sàn yêu cầu báo giá', icon: Inbox, supplier: true },
  { id: 'mine', label: 'Yêu cầu báo giá của tôi', icon: FileText, supplier: false },
  { id: 'quotations', label: 'Báo giá của tôi', icon: Store, supplier: true }
];

export default function RfqPortal({ initialTab = 'feed', initialRfqId }: { initialTab?: InitialTab; initialRfqId?: string }) {
  const auth = useAuth();
  if (!auth.user) return null;
  // Clear open RFQs and drafts before rendering a different account or B2B mode.
  return <RfqPortalContent key={`${auth.user.userId}:${auth.user.customerId}:${auth.supplierProfile?.supplierId}:${auth.supplierProfile?.verificationStatus}:${initialTab}:${initialRfqId}`} initialTab={initialTab} initialRfqId={initialRfqId} />;
}

function RfqPortalContent({ initialTab, initialRfqId }: { initialTab: InitialTab; initialRfqId?: string }) {
  const { user, supplierProfile: supplier } = useAuth();
  const visibleTabs = TABS.filter((t) => t.supplier === !!supplier);
  const [tab, setTab] = useState<Tab>(initialTab !== 'messages' && visibleTabs.some((t) => t.id === initialTab) ? initialTab : visibleTabs[0].id);
  const [view, setView] = useState<View>(() => initialRfqId && /^\d+$/.test(initialRfqId)
    ? { kind: 'detail', rfqId: initialRfqId }
    : { kind: 'list' });

  useEffect(() => {
    if (initialTab === 'messages') openConversationChat();
  }, [initialTab]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab, view.kind]);

  if (!user) return null;

  // Only a VERIFIED supplier may quote; PENDING/REJECTED/SUSPENDED profiles get 403 from the API.
  const verifiedSupplier = supplier?.verificationStatus === 'VERIFIED';

  const goTab = (next: Tab) => {
    setTab(next);
    setView({ kind: 'list' });
  };

  const openRfq = (rfqId: string, quotationId?: string | null) => {
    setView({ kind: 'detail', rfqId, quotationId });
  };

  const openConversation = (id: string) => {
    openConversationChat(id);
  };

  const create = () => setView({ kind: 'create' });

  const content = () => {
    if (view.kind === 'create' && !supplier) {
      return <RfqCreateForm onCancel={() => setView({ kind: 'list' })} onCreated={(rfq) => openRfq(rfq.rfqId)} />;
    }
    if (view.kind === 'detail') {
      return (
        <RfqDetail
          key={view.rfqId}
          rfqId={view.rfqId}
          supplier={supplier}
          initialQuotationId={view.quotationId}
          onBack={() => setView({ kind: 'list' })}
          onOpenConversation={openConversation}
        />
      );
    }
    switch (tab) {
      case 'mine':
        return <RfqList key="mine" mine onOpen={(id) => openRfq(id)} onCreate={create} />;
      case 'quotations':
        return <MyQuotations onOpen={(rfqId, quotationId) => openRfq(rfqId, quotationId)} />;
      default:
        return <RfqList key="feed" mine={false} onOpen={(id) => openRfq(id)} />;
    }
  };

  return (
    <div className="mss-container mss-page">
      <header className="mss-page-header">
        <div className="min-w-0">
          <p className="mss-badge mss-badge--info mb-2">
            <Building2 className="h-3 w-3" aria-hidden />
            Doanh nghiệp &amp; B2B
          </p>
          <h1 className="mss-page-title">Yêu cầu báo giá &amp; thương lượng</h1>
          <p className="mss-page-description">
            Đăng nhu cầu đặt hàng số lượng lớn, so sánh báo giá từ nhà cung cấp đã xác minh, trao đổi trực tiếp và chốt đơn theo đúng phiên
            bản đã thương lượng.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex min-w-0 items-center gap-2 text-sm text-gray-700">
            <UserRound className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate font-semibold">{user.fullName ?? user.email}</span>
            {supplier && (
              <span className={`mss-badge ${supplier.verificationStatus === 'VERIFIED' ? 'mss-badge--success' : 'mss-badge--warning'}`}>
                Nhà cung cấp: {SUPPLIER_VERIFICATION[supplier.verificationStatus]?.label ?? supplier.verificationStatus}
              </span>
            )}
          </span>
        </div>
      </header>

      {supplier && !verifiedSupplier && (
        <p className="mss-alert mss-alert--warning m-0" role="status">
          Hồ sơ nhà cung cấp chưa được xác minh. Bạn có thể xem yêu cầu và báo giá của mình; cần được xác minh để gửi báo giá hoặc tạo phiên bản mới.
        </p>
      )}

      <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Khu vực RFQ">
        {visibleTabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            aria-current={tab === id ? 'page' : undefined}
            onClick={() => goTab(id)}
            className={`mss-button mss-button--sm whitespace-nowrap ${tab === id ? 'mss-button--primary' : 'mss-button--secondary'}`}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </button>
        ))}
      </nav>

      <div className="min-w-0">{content()}</div>
    </div>
  );
}
