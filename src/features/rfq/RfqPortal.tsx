import { useEffect, useState } from 'react';
import { Building2, FileText, Inbox, LogOut, MessageSquare, Store, UserRound } from 'lucide-react';
import { clearSession, useSession } from '../../services/api/session';
import ConversationsView from '../chat/ConversationsView';
import { lookupApi } from './api';
import MyQuotations from './components/MyQuotations';
import RfqCreateForm from './components/RfqCreateForm';
import RfqDetail from './components/RfqDetail';
import RfqList from './components/RfqList';
import SignInCard from './components/SignInCard';
import type { SupplierProfile } from './types';

type Tab = 'feed' | 'mine' | 'quotations' | 'messages';

type View =
  | { kind: 'list' }
  | { kind: 'create' }
  | { kind: 'detail'; rfqId: string; quotationId?: string | null }
  | { kind: 'signin'; back: View };

const TABS: { id: Tab; label: string; icon: typeof FileText; needs?: 'session' | 'supplier' }[] = [
  { id: 'feed', label: 'Sàn yêu cầu báo giá', icon: Inbox },
  { id: 'mine', label: 'RFQ của tôi', icon: FileText, needs: 'session' },
  { id: 'quotations', label: 'Báo giá của tôi', icon: Store, needs: 'supplier' },
  { id: 'messages', label: 'Tin nhắn', icon: MessageSquare, needs: 'session' }
];

/** TV4 — public RFQ feed, buyer RFQs + quotation comparison, supplier quotations and negotiation chat. */
export default function RfqPortal() {
  const session = useSession();
  const [supplier, setSupplier] = useState<SupplierProfile | null>(null);
  const [tab, setTab] = useState<Tab>('feed');
  const [view, setView] = useState<View>({ kind: 'list' });
  const [conversationId, setConversationId] = useState<string | null>(null);

  useEffect(() => {
    setSupplier(null);
    if (!session) {
      setTab((current) => (current === 'feed' ? current : 'feed'));
      return;
    }
    // Return to whatever the visitor was doing before signing in.
    setView((current) => (current.kind === 'signin' ? current.back : current));
    lookupApi
      .mySupplierProfile()
      .then(setSupplier)
      .catch(() => setSupplier(null));
  }, [session?.user.userId]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab, view.kind]);

  const visibleTabs = TABS.filter((t) => !t.needs || (t.needs === 'session' ? !!session : !!supplier));

  const goTab = (next: Tab) => {
    setTab(next);
    setView({ kind: 'list' });
  };

  const openRfq = (rfqId: string, quotationId?: string | null) => {
    if (tab === 'messages') setTab(supplier ? 'quotations' : 'mine');
    setView({ kind: 'detail', rfqId, quotationId });
  };

  const openConversation = (id: string) => {
    setConversationId(id);
    setTab('messages');
    setView({ kind: 'list' });
  };

  const requireSignIn = () => setView((current) => (current.kind === 'signin' ? current : { kind: 'signin', back: current }));
  const create = () => (session ? setView({ kind: 'create' }) : requireSignIn());

  const content = () => {
    if (view.kind === 'signin' && !session) return <SignInCard onCancel={() => setView(view.back)} />;
    if (view.kind === 'create' && session) {
      return <RfqCreateForm onCancel={() => setView({ kind: 'list' })} onCreated={(rfq) => openRfq(rfq.rfqId)} />;
    }
    if (view.kind === 'detail') {
      return (
        <RfqDetail
          key={view.rfqId}
          rfqId={view.rfqId}
          session={session}
          supplier={supplier}
          initialQuotationId={view.quotationId}
          onBack={() => setView({ kind: 'list' })}
          onOpenConversation={openConversation}
          onRequireSignIn={requireSignIn}
        />
      );
    }
    switch (tab) {
      case 'mine':
        return <RfqList key="mine" mine onOpen={(id) => openRfq(id)} onCreate={create} />;
      case 'quotations':
        return <MyQuotations onOpen={(rfqId, quotationId) => openRfq(rfqId, quotationId)} />;
      case 'messages':
        return session ? (
          <ConversationsView
            myUserId={session.user.userId}
            myCustomerId={session.user.customerId}
            selectedId={conversationId}
            onSelect={setConversationId}
            onOpenRfq={(rfqId) => openRfq(rfqId)}
          />
        ) : null;
      default:
        return <RfqList key="feed" mine={false} onOpen={(id) => openRfq(id)} onCreate={create} />;
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
          {session ? (
            <>
              <span className="flex min-w-0 items-center gap-2 text-sm text-gray-700">
                <UserRound className="h-4 w-4 shrink-0" aria-hidden />
                <span className="truncate font-semibold">{session.user.fullName}</span>
                {supplier && (
                  <span className={`mss-badge ${supplier.verificationStatus === 'VERIFIED' ? 'mss-badge--success' : 'mss-badge--warning'}`}>
                    {supplier.verificationStatus === 'VERIFIED' ? 'Nhà cung cấp đã xác minh' : 'Nhà cung cấp chờ xác minh'}
                  </span>
                )}
              </span>
              <button type="button" className="mss-button mss-button--secondary mss-button--sm" onClick={clearSession}>
                <LogOut className="h-4 w-4" aria-hidden />
                Đăng xuất
              </button>
            </>
          ) : (
            view.kind !== 'signin' && (
              <button type="button" className="mss-button mss-button--primary mss-button--sm" onClick={requireSignIn}>
                Đăng nhập
              </button>
            )
          )}
        </div>
      </header>

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
