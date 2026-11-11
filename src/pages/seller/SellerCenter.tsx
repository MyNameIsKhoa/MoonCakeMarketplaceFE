import React, { useEffect, useState } from 'react';
import { sellerOrderApi, storeApi, type SellerOrderSummary, type StoreResponse } from '../../services/api';
import { errorMessage } from '../../services/api/http';
import { formatDate, formatVnd, parseApiDate } from '../../utils/format';
import { ORDER_STATUS, SUPPLIER_VERIFICATION } from '../../utils/status';
import StatusBadge from '../../components/ui/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import ConversationsView from '../../features/chat/ConversationsView';
import { paymentApi, type FinanceSummary } from '../../features/payment-settlement/paymentApi';
import PayoutAccountForm from '../../components/PayoutAccountForm';
import { rfqApi } from '../../features/rfq/api';
import MyQuotations from '../../features/rfq/components/MyQuotations';
import RfqDetail from '../../features/rfq/components/RfqDetail';
import RfqList from '../../features/rfq/components/RfqList';
import { SupplierShipmentManager } from '../../features/fulfillment/components/SupplierShipmentManager';
import DisputePanel from '../../features/payment-settlement/DisputePanel';
import StoreSettings from '../../features/seller/StoreSettings';
import BranchManager from '../../features/seller/BranchManager';
import PromotionManager from '../../features/seller/PromotionManager';
import ProductManager from '../../features/seller/ProductManager';
import SellerOrderDetail from '../../features/seller/SellerOrderDetail';
import SellerPayouts from '../../features/seller/SellerPayouts';
import {
  LayoutDashboard, Store, Package, Tag, Receipt, Truck,
  FileText, DollarSign, MessageSquare, ShieldCheck, Wallet
} from 'lucide-react';

interface SellerCenterProps {
  onBackToShop: () => void;
}

// Seller order statuses grouped for the dashboard tiles.
const NEEDS_ACTION = ['PENDING_CONFIRMATION', 'READY_FOR_FULFILLMENT', 'PREPARING'];
const AWAITING_BUYER_PAYMENT = ['PENDING_STOCK', 'AWAITING_PAYMENT', 'AWAITING_DEPOSIT'];

export default function SellerCenter({ onBackToShop }: SellerCenterProps) {
  const [currentSubTab, setCurrentSubTab] = useState<string>('tong-quan');
  const { user, supplierProfile } = useAuth();
  // TV4: RFQ opened from the RFQ feed, "Báo giá của tôi" or a conversation; null shows the list.
  const [rfqView, setRfqView] = useState<{ rfqId: string; quotationId?: string | null } | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [stores, setStores] = useState<StoreResponse[] | null>(null);
  const [storesError, setStoresError] = useState('');
  const [openRfqCount, setOpenRfqCount] = useState<number | null>(null);
  const [sellerOrders, setSellerOrders] = useState<SellerOrderSummary[] | null>(null);
  const [sellerOrderError, setSellerOrderError] = useState('');
  const [shipmentOrderId, setShipmentOrderId] = useState<number | null>(null);
  const [shipmentFinance, setShipmentFinance] = useState<FinanceSummary | null>(null);

  useEffect(() => {
    setShipmentFinance(null);
    if (shipmentOrderId === null) return;
    paymentApi.summary(shipmentOrderId).then(setShipmentFinance).catch(() => setShipmentFinance(null));
  }, [shipmentOrderId]);

  useEffect(() => {
    storeApi.list({ mine: true })
      .then(setStores)
      .catch((err: unknown) => setStoresError(errorMessage(err)));
  }, []);

  useEffect(() => {
    if (currentSubTab !== 'don-hang' && currentSubTab !== 'van-chuyen' && currentSubTab !== 'tong-quan') return;
    setSellerOrderError('');
    sellerOrderApi.list().then(setSellerOrders)
      .catch((err: unknown) => setSellerOrderError(err instanceof Error ? err.message : 'Không tải được đơn hàng.'));
  }, [currentSubTab]);

  useEffect(() => {
    if (currentSubTab !== 'tong-quan') return;
    rfqApi.list({ mine: false, status: 'OPEN', page: 0 })
      .then((page) => setOpenRfqCount(page.totalElements))
      .catch(() => setOpenRfqCount(null));
  }, [currentSubTab]);

  const displayName = stores?.[0]?.name ?? supplierProfile?.companyName ?? user?.fullName ?? 'Gian hàng của bạn';
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const countOrders = (statuses: string[]) => sellerOrders?.filter((o) => statuses.includes(o.status)).length;
  const latestOrders = [...(sellerOrders ?? [])].sort((a, b) => b.sellerOrderId - a.sellerOrderId).slice(0, 5);

  const financeContext = shipmentFinance?.context;
  const remainingDue = parseApiDate(financeContext?.remainingDueAt);
  const remainingOverdue = !!financeContext && !!remainingDue && financeContext.paidAmount < financeContext.totalAmount
    && remainingDue.getTime() < Date.now();

  const goTab = (id: string) => {
    setCurrentSubTab(id);
    setRfqView(null);
  };

  const rfqDetail = rfqView && (
    <RfqDetail
      key={rfqView.rfqId}
      rfqId={rfqView.rfqId}
      supplier={supplierProfile}
      initialQuotationId={rfqView.quotationId}
      onBack={() => setRfqView(null)}
      onOpenConversation={(id) => {
        setConversationId(id);
        goTab('tin-nhan');
      }}
    />
  );

  const navItems = [
    { id: 'tong-quan', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'ho-so-gian-hang', label: 'Hồ sơ gian hàng', icon: Store },
    { id: 'san-pham', label: 'Sản phẩm', icon: Package },
    { id: 'khuyen-mai', label: 'Khuyến mãi', icon: Tag },
    { id: 'don-hang', label: 'Đơn hàng', icon: Receipt },
    { id: 'van-chuyen', label: 'Vận chuyển', icon: Truck },
    { id: 'yeu-cau-bao-gia', label: 'Yêu cầu báo giá (RFQ)', icon: FileText, badge: 'RFQ' },
    { id: 'bao-gia-cua-toi', label: 'Báo giá của tôi', icon: DollarSign },
    { id: 'tin-nhan', label: 'Tin nhắn', icon: MessageSquare },
    { id: 'doanh-thu', label: 'Doanh thu & giải ngân', icon: Wallet },
  ];

  return (
    <div className="min-h-screen bg-[var(--mss-bg)] flex text-[var(--mss-text)] font-sans">
      {/* Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-dvh w-64 bg-white z-50 flex-col shadow-md">
        <div className="h-16 shrink-0 px-6 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary-900 text-white flex items-center justify-center font-bold">
              🥮
            </div>
            <div>
              <span className="font-bold text-primary-900 text-sm block leading-tight">Bánh Trung Thu</span>
              <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Kênh Người Bán</span>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentSubTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => goTab(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition ${
                  isActive
                    ? 'bg-primary-800 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-green-100 text-green-800'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="shrink-0 p-4 bg-gray-50 border-t border-gray-100">
          <button
            onClick={onBackToShop}
            className="w-full py-3 bg-accent-500 hover:bg-accent-600 text-primary-950 font-bold rounded-xl text-sm shadow transition flex items-center justify-center gap-2"
          >
            <span>Quay lại gian hàng</span>
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="lg:pl-64 flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 h-16 bg-white/90 backdrop-blur-md z-40 shadow-sm flex items-center justify-between gap-3 px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <span className="px-3 py-1 rounded-full bg-gray-100 text-sm font-semibold text-gray-800">Kênh Người Bán (Seller Center)</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary-900 text-white flex items-center justify-center font-bold text-sm">
                {initials}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-gray-900 leading-none">{displayName}</span>
                {supplierProfile && (
                  <span className="mt-1">
                    <StatusBadge map={SUPPLIER_VERIFICATION} status={supplierProfile.verificationStatus} />
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Body Content */}
        <main className="p-4 lg:p-6 flex-1 flex flex-col gap-6 min-w-0">
          {/* Mobile navigation (sidebar is desktop-only) */}
          <div className="lg:hidden flex flex-col gap-2">
            <select
              className="mss-select"
              value={currentSubTab}
              onChange={(e) => goTab(e.target.value)}
              aria-label="Chọn mục quản lý"
            >
              {navItems.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
            <button onClick={onBackToShop} className="mss-button mss-button--secondary mss-button--sm self-start">Quay lại gian hàng</button>
          </div>
          {/* TAB 1: TỔNG QUAN (DASHBOARD) */}
          {currentSubTab === 'tong-quan' && (
            <div className="space-y-6 animate-fadeIn">
              {supplierProfile && supplierProfile.verificationStatus !== 'VERIFIED' && (
                <div className="rounded-xl bg-accent-100/70 border border-accent-300 p-4 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent-200 text-accent-900 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">
                      Hồ sơ nhà cung cấp: {SUPPLIER_VERIFICATION[supplierProfile.verificationStatus]?.label ?? supplierProfile.verificationStatus}
                    </h3>
                    <p className="text-gray-600 text-sm mt-1">
                      {supplierProfile.verificationStatus === 'PENDING'
                        ? 'Quản trị viên sàn đang xét duyệt hồ sơ của bạn.'
                        : 'Liên hệ quản trị viên sàn để biết lý do và cách xử lý.'}
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h1 className="text-xl font-bold text-gray-900">Xin chào, {displayName} 👋</h1>
                <p className="text-gray-500 text-sm mt-1">Tình hình đơn hàng và yêu cầu báo giá của gian hàng</p>
              </div>

              {/* KPI Tiles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {[
                  { label: 'Đơn cần xử lý', value: countOrders(NEEDS_ACTION), icon: Package, tab: 'don-hang' },
                  { label: 'Đơn đang giao', value: countOrders(['SHIPPING']), icon: Truck, tab: 'don-hang' },
                  { label: 'Đơn chờ khách thanh toán', value: countOrders(AWAITING_BUYER_PAYMENT), icon: Receipt, tab: 'don-hang' },
                  { label: 'RFQ đang mở trên sàn', value: openRfqCount ?? undefined, icon: FileText, tab: 'yeu-cau-bao-gia' }
                ].map(({ label, value, icon: Icon, tab }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => goTab(tab)}
                    className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-start text-left hover:border-primary-200 transition"
                  >
                    <div>
                      <span className="text-sm text-gray-500 uppercase font-semibold">{label}</span>
                      <h3 className="text-2xl font-bold text-gray-900 mt-1">{value ?? '—'}</h3>
                    </div>
                    <div className="p-3 bg-primary-50 text-primary-700 rounded-xl"><Icon className="w-5 h-5" /></div>
                  </button>
                ))}
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <h3 className="font-bold text-gray-900 text-base">Đơn hàng mới nhất</h3>
                {sellerOrderError && <p role="alert" className="text-red-700 text-sm">{sellerOrderError}</p>}
                {!sellerOrders && !sellerOrderError && <p className="text-sm text-gray-500">Đang tải đơn hàng…</p>}
                {sellerOrders?.length === 0 && <p className="text-sm text-gray-500">Chưa có đơn hàng.</p>}
                {latestOrders.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-gray-500 uppercase">
                          <th className="py-3 px-3 font-semibold">Mã đơn</th>
                          <th className="py-3 px-3 font-semibold">Gian hàng</th>
                          <th className="py-3 px-3 font-semibold text-right">Tổng tiền</th>
                          <th className="py-3 px-3 font-semibold text-center">Trạng thái</th>
                          <th className="py-3 px-3 font-semibold text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {latestOrders.map((order) => (
                          <tr key={order.sellerOrderId}>
                            <td className="py-3 px-3 font-mono font-bold text-gray-900">{order.sellerOrderNo}</td>
                            <td className="py-3 px-3 text-gray-600">{order.storeNameSnapshot}</td>
                            <td className="py-3 px-3 text-right font-bold text-primary-700">{formatVnd(order.totalAmount)}</td>
                            <td className="py-3 px-3 text-center"><StatusBadge map={ORDER_STATUS} status={order.status} /></td>
                            <td className="py-3 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  goTab('don-hang');
                                  setShipmentOrderId(Number(order.sellerOrderId));
                                }}
                                className="px-3 py-1 bg-primary-700 text-white rounded font-semibold hover:bg-primary-800"
                              >
                                Xem
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: HỒ SƠ GIAN HÀNG (STORE PROFILE) */}
          {currentSubTab === 'ho-so-gian-hang' && (
            <div className="space-y-6 animate-fadeIn max-w-4xl mx-auto">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Hồ Sơ Gian Hàng</h1>
                <p className="text-gray-500 text-sm mt-1">Thông tin pháp lý của nhà cung cấp, gian hàng, phí vận chuyển và chi nhánh</p>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <h3 className="font-bold text-gray-900 text-base border-b border-gray-100 pb-3">Thông tin pháp lý doanh nghiệp</h3>
                {supplierProfile ? (
                  <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <dt className="text-gray-500">Tên công ty</dt>
                      <dd className="font-semibold text-gray-900 mt-1">{supplierProfile.companyName}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Mã số thuế</dt>
                      <dd className="font-mono font-semibold text-gray-900 mt-1">{supplierProfile.taxCode}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Trạng thái xác minh</dt>
                      <dd className="mt-1"><StatusBadge map={SUPPLIER_VERIFICATION} status={supplierProfile.verificationStatus} /></dd>
                    </div>
                  </dl>
                ) : (
                  <p className="text-sm text-gray-500">Chưa có hồ sơ nhà cung cấp.</p>
                )}
              </div>

              <StoreSettings onStoresChanged={setStores} />

              {stores?.map((store) => (
                <section key={store.storeId} className="space-y-2" aria-label={`Chi nhánh của ${store.name}`}>
                  <h3 className="font-bold text-gray-900 text-base">Chi nhánh · {store.name}</h3>
                  <BranchManager storeId={store.storeId} />
                </section>
              ))}
            </div>
          )}

          {/* TAB 3: SẢN PHẨM */}
          {currentSubTab === 'san-pham' && (
            <div className="space-y-6 animate-fadeIn">
              <ProductManager stores={stores ?? []} />
            </div>
          )}

          {/* TAB 4: ĐƠN HÀNG & VẬN CHUYỂN (ORDERS & COLD-CHAIN) */}
          {(currentSubTab === 'don-hang' || currentSubTab === 'van-chuyen') && (
            <div className="space-y-6 animate-fadeIn">
              <h1 className="text-2xl font-bold text-gray-900">Đơn hàng của gian hàng</h1>
              {sellerOrderError && <p role="alert" className="text-red-700">{sellerOrderError}</p>}
              {!sellerOrders && !sellerOrderError && <p>Đang tải đơn hàng…</p>}
              {sellerOrders?.length === 0 && <p>Chưa có đơn hàng.</p>}
              {sellerOrders && sellerOrders.length > 0 && <div className="bg-white rounded-2xl border border-gray-100 p-6 overflow-x-auto">
                <table className="w-full text-left text-sm"><thead><tr>
                  <th className="p-3">Mã đơn</th><th className="p-3">Gian hàng</th>
                  <th className="p-3">Trạng thái</th><th className="p-3 text-right">Tổng tiền</th>
                  <th className="p-3">Vận chuyển</th>
                </tr></thead><tbody>{sellerOrders.map((order) => <tr key={order.sellerOrderId} className={`border-t ${shipmentOrderId === Number(order.sellerOrderId) ? 'bg-amber-50/40' : ''}`}>
                  <td className="p-3 font-medium text-gray-900">{order.sellerOrderNo}</td><td className="p-3">{order.storeNameSnapshot}</td>
                  <td className="p-3"><StatusBadge map={ORDER_STATUS} status={order.cancellationPending ? 'CANCEL_REQUESTED' : order.status} /></td><td className="p-3 text-right font-semibold">{formatVnd(order.totalAmount)}</td>
                  <td className="p-3"><button type="button"
                    className={`mss-button mss-button--sm whitespace-nowrap ${shipmentOrderId === Number(order.sellerOrderId) ? 'mss-button--primary' : 'mss-button--secondary'}`}
                    onClick={() => setShipmentOrderId(Number(order.sellerOrderId))}>Vận đơn / Khiếu nại</button></td>
                </tr>)}</tbody></table>
              </div>}
              {shipmentOrderId !== null && <SellerOrderDetail key={`detail-${shipmentOrderId}`} sellerOrderId={shipmentOrderId} />}
              {shipmentOrderId !== null && remainingOverdue && (
                <p role="alert" className="mss-alert mss-alert--danger m-0">
                  Khách đã quá hạn thanh toán phần còn lại (hạn {formatDate(financeContext?.remainingDueAt ?? undefined)}).
                  Chưa giao hàng được cho tới khi đơn được thanh toán đủ.
                </p>
              )}
              {shipmentOrderId !== null && <SupplierShipmentManager key={shipmentOrderId}
                sellerOrderId={shipmentOrderId}
                sellerOrder={sellerOrders?.find((o) => Number(o.sellerOrderId) === shipmentOrderId) ?? null}
                onShipmentUpdated={() => {
                  sellerOrderApi.list().then(setSellerOrders)
                    .catch(() => setSellerOrderError('Không tải lại được trạng thái đơn hàng.'));
                }} />}
              {shipmentOrderId !== null && <DisputePanel key={`dispute-${shipmentOrderId}`} sellerOrderId={shipmentOrderId} role="seller" />}
            </div>
          )}

          {/* TAB 5: KHUYẾN MÃI (PROMOTIONS) */}
          {currentSubTab === 'khuyen-mai' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Khuyến Mãi Của Gian Hàng</h1>
                <p className="text-gray-500 text-sm mt-1">Tạo, chỉnh sửa, bật/tắt chương trình khuyến mãi và điều kiện giảm giá</p>
              </div>
              {storesError && <p role="alert" className="text-red-700 text-sm">{storesError}</p>}
              {stores ? <PromotionManager stores={stores} /> : !storesError && <p className="text-sm text-gray-500">Đang tải gian hàng…</p>}
            </div>
          )}

          {/* TAB 6: YÊU CẦU BÁO GIÁ (RFQ) & BÁO GIÁ CỦA TÔI — TV4 RFQ Service */}
          {currentSubTab === 'yeu-cau-bao-gia' && (
            <div className="space-y-6 animate-fadeIn min-w-0">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Yêu Cầu Báo Giá (RFQ)</h1>
                <p className="text-gray-500 text-sm mt-1">RFQ đang mở trên sàn và RFQ người mua gửi riêng cho cửa hàng của bạn</p>
              </div>
              {rfqDetail ?? <RfqList mine={false} onOpen={(rfqId) => setRfqView({ rfqId })} />}
            </div>
          )}

          {currentSubTab === 'bao-gia-cua-toi' && (
            <div className="space-y-6 animate-fadeIn min-w-0">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Báo Giá Của Tôi</h1>
                <p className="text-gray-500 text-sm mt-1">Các báo giá đã gửi, phiên bản và phản hồi của người mua</p>
              </div>
              {rfqDetail ?? <MyQuotations onOpen={(rfqId, quotationId) => setRfqView({ rfqId, quotationId })} />}
            </div>
          )}

          {/* TAB: TIN NHẮN — TV4 chat; RFQ/chat DTOs carry IDs as strings, Identity's profile uses numbers */}
          {currentSubTab === 'tin-nhan' && user && (
            <div className="space-y-6 animate-fadeIn min-w-0">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Tin Nhắn</h1>
                <p className="text-gray-500 text-sm mt-1">Trao đổi với người mua theo từng yêu cầu báo giá</p>
              </div>
              <ConversationsView
                myUserId={String(user.userId)}
                myCustomerId={user.customerId == null ? null : String(user.customerId)}
                selectedId={conversationId}
                onSelect={setConversationId}
                onOpenRfq={(rfqId) => {
                  goTab('yeu-cau-bao-gia');
                  setRfqView({ rfqId });
                }}
              />
            </div>
          )}
          {/* TAB 7: DOANH THU & GIẢI NGÂN — tiền từng đơn: đã thu, hoàn, phí sàn, thực nhận, trạng thái giải ngân */}
          {currentSubTab === 'doanh-thu' && (
            <div className="space-y-6 animate-fadeIn min-w-0">
              <PayoutAccountForm kind="SUPPLIER" />
              <SellerPayouts />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
