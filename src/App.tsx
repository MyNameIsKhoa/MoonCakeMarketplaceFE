import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useNavigationType, type Location } from 'react-router-dom';
import { pagePaths, storefrontPage, useStorefrontScroll } from './utils/storefrontRoutes';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import AIChatWidget from './components/AIChatWidget';
import FloatingChatWidget from './features/chat/FloatingChatWidget';
import { OPEN_CONVERSATION_CHAT_EVENT, openConversationChat, type OpenConversationChatDetail } from './features/chat/chatWidgetEvents';

import Home from './pages/Home';
import ProductList from './pages/ProductList';
import ProductDetail from './pages/ProductDetail';
import StoreDetail from './pages/StoreDetail';
import Checkout from './pages/Checkout';
import OrderTracking from './pages/OrderTracking';
import B2BPortal from './pages/B2BPortal';
import UserProfile from './pages/UserProfile';
import SellerCenter from './pages/seller/SellerCenter';
import PaymentSettlement from './features/payment-settlement/PaymentSettlement';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import VerifyEmail from './pages/auth/VerifyEmail';
import ForgotPassword from './pages/auth/ForgotPassword';
import SupplierOnboarding from './pages/seller/SupplierOnboarding';
import AdminCenter from './pages/admin/AdminCenter';
import EmptyState from './components/ui/EmptyState';

import { Product, Store, CartItem } from './types';
import CatalogNotice from './components/CatalogNotice';
import { useCatalog } from './context/CatalogContext';
import { useAuth } from './context/AuthContext';
import { accessLevelOf, canAccess } from './utils/permissions';
import { cartApi, catalogApi, isApiId, variantAvailableQuantity } from './services/api';
import type { CheckoutSelection } from './services/api/commerceApi';
import { loadCheckoutAttempt } from './services/api/checkoutAttempt';

/** Shown on the login screen when a guest opens a protected tab. */
const LOGIN_NOTICES: Record<string, string> = {
  checkout: 'Vui lòng đăng nhập rồi thêm sản phẩm để thanh toán.',
  orders: 'Vui lòng đăng nhập để xem đơn hàng của bạn.',
  profile: 'Vui lòng đăng nhập để xem tài khoản.',
  b2b: 'Vui lòng đăng nhập để gửi yêu cầu báo giá doanh nghiệp.',
  'payment-settlement': 'Vui lòng đăng nhập để xem thanh toán của bạn.',
  'seller-center': 'Đăng nhập bằng tài khoản nhà cung cấp để vào Kênh Người Bán.',
  admin: 'Đăng nhập bằng tài khoản quản trị viên.'
};

type NavigationState = {
  background?: Location;
  returnTo?: Location;
  checkout?: { userId: string; selection: CheckoutSelection };
};

export default function App() {
  const { stores, products, source } = useCatalog();
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const state = (location.state ?? {}) as NavigationState;
  const isCartOpen = storefrontPage(location.pathname).page === 'cart';
  const pageLocation = isCartOpen
    ? state.background ?? { ...location, pathname: '/', search: '', state: null }
    : location;
  const route = storefrontPage(pageLocation.pathname);
  const activeTab = route.page;
  const params = new URLSearchParams(pageLocation.search);
  const selectedProduct = activeTab === 'detail' ? products.find(p => p.id === route.id) : undefined;
  const selectedStore = activeTab === 'store-detail'
    ? stores.find(s => s.storeId === route.id || s.slug === route.id) : undefined;
  const returnTo = (pageLocation.state as NavigationState | null)?.returnTo;
  const checkout = (pageLocation.state as NavigationState | null)?.checkout;
  const userId = auth.user ? String(auth.user.userId) : '';
  const checkoutSelection = checkout && checkout.userId === userId ? checkout.selection : null;

  const finance = params.get('finance');
  const fromPayment = finance === 'return' || finance === 'cancel';
  const customerPayment = fromPayment ? sessionStorage.getItem('financeCustomerOrderId') : null;
  const sellerPayment = fromPayment ? sessionStorage.getItem('financeSellerPaymentId') : null;
  const paymentReturnOrderId = customerPayment && /^\d+$/.test(customerPayment) ? customerPayment : null;
  const paymentReturnSellerPaymentId = sellerPayment && /^\d+$/.test(sellerPayment) ? sellerPayment : null;
  const returnDetailId = fromPayment && paymentReturnSellerPaymentId &&
    sessionStorage.getItem('financeDetailPaymentId') === paymentReturnSellerPaymentId
    ? sessionStorage.getItem('financeOrderDetailId') : null;
  const paymentDestination = returnDetailId && /^[1-9]\d*$/.test(returnDetailId)
    ? '/orders/' + returnDetailId : paymentReturnOrderId ? '/orders/' + paymentReturnOrderId
    : paymentReturnSellerPaymentId ? pagePaths.orders : pagePaths['payment-settlement'];

  useEffect(() => {
    if (fromPayment && location.pathname !== paymentDestination) {
      navigate(paymentDestination + location.search, { replace: true });
    }
  }, [fromPayment, location.pathname, location.search, navigate, paymentDestination]);

  useStorefrontScroll(pageLocation, navigationType, activeTab !== 'products' || source !== 'loading', activeTab !== 'orders');

  const [searchDraft, setSearchDraft] = useState('');
  const searchQuery = activeTab === 'products' ? params.get('q') ?? '' : searchDraft;

  const go = (target: string, nextState?: NavigationState) => {
    if (location.pathname + location.search !== target || nextState) navigate(target, { state: nextState });
  };
  const setActiveTab = (page: string) => {
    const path = pagePaths[page];
    if (!path || (page === 'products' && location.pathname === path)) return;
    if (page === 'products' && searchQuery.trim()) {
      go(path + '?' + new URLSearchParams({ q: searchQuery.trim() }));
    } else {
      go(path);
    }
  };
  const onOpenProduct = (product: Product) => go('/products/' + encodeURIComponent(product.id));
  const onOpenStore = (store: Store) => go('/stores/' + encodeURIComponent(store.storeId));
  const openCart = () => { if (!isCartOpen) go(pagePaths.cart, { background: location }); };
  const closeCart = () => { if (state.background) navigate(-1); else go(pagePaths.home); };

  const changeProductFilters = (patch: Record<string, string>) => {
    if (patch.q !== undefined) setSearchDraft(patch.q);
    const next = new URLSearchParams(pageLocation.search);
    for (const [name, value] of Object.entries(patch)) {
      if (value && value !== 'all' && value !== 'default') next.set(name, value);
      else next.delete(name);
    }
    const search = next.size ? '?' + next.toString() : '';
    if (search !== pageLocation.search) navigate(pagePaths.products + search, { replace: true });
  };
  const setSearchQuery = (query: string) => {
    setSearchDraft(query);
    if (activeTab === 'products') changeProductFilters({ q: query });
  };

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartError, setCartError] = useState('');
  const [cartBusy, setCartBusy] = useState(false);
  const openCheckout = (selection: CheckoutSelection) => {
    go(pagePaths.checkout, { checkout: { userId, selection } });
  };

  const [isAIOpen, setIsAIOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatConversationId, setChatConversationId] = useState<string | null>(null);
  const closeChat = useCallback(() => setChatOpen(false), []);
  const closeAI = useCallback(() => setIsAIOpen(false), []);
  useEffect(() => {
    setChatOpen(false); setChatConversationId(null); setIsAIOpen(false);
  }, [userId]);
  useEffect(() => {
    const open = (event: Event) => {
      if (!userId) { navigate(pagePaths.login); return; }
      setChatConversationId((event as CustomEvent<OpenConversationChatDetail>).detail?.conversationId ?? null);
      setIsAIOpen(false); setChatOpen(true);
    };
    window.addEventListener(OPEN_CONVERSATION_CHAT_EVENT, open);
    return () => window.removeEventListener(OPEN_CONVERSATION_CHAT_EVENT, open);
  }, [userId, navigate]);
  useEffect(() => {
    if (userId && activeTab === 'b2b' && new URLSearchParams(pageLocation.search).get('tab') === 'messages') {
      setChatConversationId(null); setIsAIOpen(false); setChatOpen(true);
    }
  }, [userId, activeTab, pageLocation.key]);
  const [aiEnabled, setAiEnabled] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/gemini/status", { signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then(data => { if (!controller.signal.aborted) setAiEnabled(data?.enabled === true); })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (userId && activeTab === 'home' && loadCheckoutAttempt(userId)) {
      navigate(pagePaths.checkout, { replace: true });
    }
  }, [userId]);

  const handlePaymentReturnHandled = useCallback(() => {
    sessionStorage.removeItem('financeCustomerOrderId');
    sessionStorage.removeItem('financeSellerPaymentId');
    sessionStorage.removeItem('financeOrderDetailId');
    sessionStorage.removeItem('financeDetailPaymentId');
    navigate(location.pathname.startsWith('/orders/') ? location.pathname : pagePaths.orders, { replace: true });
  }, [navigate, location.pathname]);

  useEffect(() => {
    let cancelled = false;
    setCartItems([]);
    setCartError('');
    if (auth.isAuthenticated) cartApi.list()
      .then(items => { if (!cancelled) setCartItems(items); })
      .catch((err: unknown) => { if (!cancelled) setCartError(err instanceof Error ? err.message : 'Không tải được giỏ hàng.'); });
    return () => { cancelled = true; };
  }, [auth.isAuthenticated, auth.user?.userId]);

  const refreshCart = async () => {
    const items = await cartApi.list();
    setCartItems(items);
    return items;
  };
  const handleAddToCart = async (product: Product, quantity = 1, _option: string = product.sugarLevel, buyNow = false) => {
    if (!auth.isAuthenticated) { setActiveTab('login'); return false; }
    if (cartBusy) return false;
    setCartBusy(true);
    try {
      setCartError('');
      if (source !== 'api' || !isApiId(product.id) || !products.some(p => p.id === product.id)) {
        throw new Error('Sản phẩm hiện không khả dụng để đặt mua.');
      }
      const detail = await catalogApi.products.get(Number(product.id));
      if (detail.status !== 'ACTIVE') throw new Error('Sản phẩm hiện không bán.');
      const available = detail.variants.filter(v => variantAvailableQuantity(v) >= quantity);
      if (!product.variantId && available.length > 1) {
        onOpenProduct(product);
        return false;
      }
      const variant = product.variantId
        ? available.find(v => String(v.variantId) === product.variantId) : available[0];
      const variantId = variant ? String(variant.variantId) : '';
      if (!variant || !isApiId(variantId)) {
        throw new Error('Phân loại sản phẩm đã hết hàng hoặc không đủ số lượng tồn kho.');
      }
      if (buyNow) {
        const current = (await cartApi.get()).items.find(item => String(item.variantId) === variantId);
        const line = current && current.quantity >= quantity
          ? current : await cartApi.add(variantId, quantity - (current?.quantity ?? 0));
        openCheckout({ cartItemIds: [line.cartItemId], quantity });
        void refreshCart().catch(() => setCartError("Chưa tải lại được giỏ hàng."));
        return true;
      }
      await cartApi.add(variantId, quantity);
      await refreshCart();
      openCart();
      return true;
    } catch (err) {
      setCartError(err instanceof Error ? err.message : 'Không thêm được vào giỏ hàng.');
      openCart();
      return false;
    } finally { setCartBusy(false); }
  };

  const handleUpdateQuantity = async (id: string, delta: number) => {
    if (cartBusy) return;
    setCartBusy(true);
    try {
      setCartError('');
      const item = cartItems.find((line) => line.id === id);
      if (!item) return;
      if (item.quantity + delta <= 0) await cartApi.remove(id);
      else await cartApi.update(id, delta < 0 && item.availableQuantity != null
        ? Math.min(item.quantity + delta, item.availableQuantity) : item.quantity + delta);
      await refreshCart();
    } catch (err) { setCartError(err instanceof Error ? err.message : 'Không cập nhật được giỏ hàng.'); }
    finally { setCartBusy(false); }
  };

  const handleRemoveItem = async (id: string) => {
    if (cartBusy) return;
    setCartBusy(true);
    try { setCartError(''); await cartApi.remove(id); await refreshCart(); }
    catch (err) { setCartError(err instanceof Error ? err.message : 'Không xóa được sản phẩm.'); }
    finally { setCartBusy(false); }
  };

  const handleBuyNow = async (product: Product, quantity = 1, option: string = product.sugarLevel) => {
    await handleAddToCart(product, quantity, option, true);
  };

  const handleCartSelection = async (ids: number[]) => {
    if (cartBusy) return;
    setCartBusy(true);
    setCartError('');
    try {
      await cartApi.select(ids);
      const selected = new Set(ids);
      setCartItems(items => items.map(item => ({ ...item, selected: selected.has(Number(item.id)) })));
    }
    catch (err) { setCartError(err instanceof Error ? err.message : 'Không lưu được lựa chọn.'); }
    finally { setCartBusy(false); }
  };

  const handleOrderPlaced = () => {
    void refreshCart().catch(() => setCartError('Chưa tải lại được giỏ hàng.'));
  };

  // Access control: a protected tab renders a gate (login / supplier onboarding / 403) instead of the page.
  const accessLevel = accessLevelOf(activeTab);
  const isAllowed = canAccess(accessLevel, auth);
  const isSellerCenter = activeTab === 'seller-center' && isAllowed;
  const isAdminCenter = activeTab === 'admin' && isAllowed;

  const goToAuth = (mode: 'login' | 'register' | 'forgot-password') => {
    const destination = accessLevel !== 'public' ? pageLocation : returnTo;
    go(pagePaths[mode], destination ? { returnTo: destination } : undefined);
  };

  const finishAuth = () => {
    if (returnTo) navigate(returnTo.pathname + returnTo.search, { state: returnTo.state });
    else go(pagePaths.home);
  };

  const handleLogout = () => {
    auth.logout();
    setActiveTab('home');
  };

  const openMessages = () => openConversationChat();

  const renderGate = () => {
    if (auth.status === 'loading') {
      return <div className="mss-container mss-page"><p className="text-sm text-gray-500">Đang kiểm tra phiên đăng nhập…</p></div>;
    }
    if (!auth.isAuthenticated) {
      return (
        <Login
          notice={LOGIN_NOTICES[activeTab]}
          onSuccess={() => { /* Login unlocks the current protected route. */ }}
          onSwitchToRegister={() => goToAuth('register')}
          onForgotPassword={() => goToAuth('forgot-password')}
        />
      );
    }
    if (accessLevel === 'supplier') {
      return (
        <SupplierOnboarding
          onBackToShop={() => setActiveTab('home')}
          onRelogin={() => {
            // A new token is needed to carry ROLE_SUPPLIER; staying on this tab shows the login gate
            // and reopens the seller center once logged in.
            auth.logout();
          }}
        />
      );
    }
    return (
      <div className="mss-container mss-page">
        <EmptyState
          title="Bạn không có quyền truy cập trang này"
          description="Trang này chỉ dành cho quản trị viên của sàn."
          action={<button className="mss-button mss-button--primary" onClick={() => setActiveTab('home')}>Về trang chủ</button>}
        />
      </div>
    );
  };

  return (
    <div className="mss-app selection:bg-accent-200 selection:text-primary-950">
      {!isSellerCenter && !isAdminCenter && (
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          cartItemsCount={cartItems.reduce((sum, i) => sum + i.quantity, 0)}
          onOpenCart={openCart}
          onOpenMessages={openMessages}
          onOpenAI={aiEnabled ? () => { setChatOpen(false); setIsAIOpen(true); } : undefined}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onOpenStore={onOpenStore}
          onOpenProduct={onOpenProduct}
          onLogin={() => goToAuth('login')}
          onRegister={() => goToAuth('register')}
          onLogout={handleLogout}
        />
      )}

      <main className="mss-main">
        {activeTab === 'verify-email' && <VerifyEmail
          token={params.get('token') ?? ''}
          onLogin={() => navigate(pagePaths.login, { replace: true })}
        />}
        {['home', 'products', 'stores', 'detail', 'store-detail', 'profile'].includes(activeTab) && <div className="mss-container pt-4"><CatalogNotice /></div>}
        {(activeTab === "not-found" || (source === "api" && ((activeTab === "detail" && !selectedProduct) || (activeTab === "store-detail" && !selectedStore)))) && (
          <EmptyState title="Không tìm thấy trang, sản phẩm hoặc gian hàng" />
        )}
        {activeTab === 'stores' && source === 'api' && stores.length === 0 && <EmptyState title="Chưa có gian hàng" />}
        {!isAllowed ? renderGate() : <>
        {activeTab === 'login' && (
          <Login
            onSuccess={() => finishAuth()}
            onSwitchToRegister={() => goToAuth('register')}
            onForgotPassword={() => goToAuth('forgot-password')}
          />
        )}
        {activeTab === 'forgot-password' && <ForgotPassword onBackToLogin={() => goToAuth('login')} />}

        {activeTab === 'register' && (
          <Register
            onSuccess={() => setActiveTab('registration-complete')}
            onGoogleLogin={() => finishAuth()}
            onSwitchToLogin={() => goToAuth('login')}
            defaultAccountType={returnTo?.pathname === pagePaths['seller-center'] ? 'supplier' : 'customer'}
          />
        )}
        {activeTab === 'registration-complete' && (
          <div className="mss-container mss-page"><section className="mss-card mss-stack">
            <h1 className="mss-page-title">Kiểm tra email của bạn</h1>
            <p>Tài khoản đã được tạo. Mở email xác minh rồi bấm liên kết để kích hoạt trước khi đăng nhập.</p>
            <button className="mss-button mss-button--primary" onClick={() => setActiveTab('login')}>Đi tới đăng nhập</button>
          </section></div>
        )}

        {activeTab === 'admin' && <AdminCenter onBackToShop={() => setActiveTab('home')} />}

        {activeTab === 'home' && (
          <Home
            setActiveTab={setActiveTab}
            onOpenProduct={onOpenProduct}
            onOpenStore={onOpenStore}
            onAddToCart={(p) => handleAddToCart(p, 1, p.sugarLevel)}
            onOpenAI={aiEnabled ? () => setIsAIOpen(true) : undefined}
          />
        )}

        {activeTab === 'products' && (
          <ProductList
            filters={params}
            onFiltersChange={changeProductFilters}
            onOpenProduct={onOpenProduct}
            onAddToCart={(p) => handleAddToCart(p, 1, p.sugarLevel)}
          />
        )}

        {activeTab === 'detail' && selectedProduct && (
          <ProductDetail
            key={selectedProduct.id}
            product={selectedProduct}
            onAddToCart={(p, qty, sugar) => handleAddToCart(p, qty, sugar)}
            onBuyNow={(p, qty, sugar) => handleBuyNow(p, qty, sugar)}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'stores' && (
          <div className="mss-container mss-page">
            <header className="mss-page-header">
              <h1 className="mss-page-title">Tất cả gian hàng</h1>
            </header>
            <div className="mss-grid-3">
              {stores.map(store => (
                <div
                  key={store.storeId}
                  onClick={() => onOpenStore(store)}
                  className="mss-card hover:border-primary-700 cursor-pointer transition flex items-center gap-4"
                >
                  <img src={store.logoUrl} alt={store.name} className="w-20 h-20 aspect-square rounded-xl object-contain bg-white p-1 border border-gray-200" />
                  <div className="min-w-0">
                    <h3 className="mss-card-title">{store.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{store.categoryLabel || 'Gian hàng'}</p>
                    <span className="inline-block mt-2 text-sm font-semibold text-primary-700">Khám phá gian hàng →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'store-detail' && selectedStore && (
          <StoreDetail
            key={selectedStore.storeId}
            store={selectedStore}
            onOpenProduct={onOpenProduct}
            setActiveTab={setActiveTab}
            onAddToCart={(p) => handleAddToCart(p, 1, p.sugarLevel)}
          />
        )}

        {activeTab === 'checkout' && (
          <Checkout
            key={pageLocation.key + ":" + userId}
            userId={String(auth.user?.userId)}
            selection={checkoutSelection}
            onOrderPlaced={handleOrderPlaced}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'orders' && (
          <OrderTracking
            key={userId}
            orderId={route.id}
            setActiveTab={setActiveTab}
            paymentReturnOrderId={paymentReturnOrderId}
            paymentReturnSellerPaymentId={paymentReturnSellerPaymentId}
            onPaymentReturnHandled={handlePaymentReturnHandled}
          />
        )}

        {activeTab === "b2b" && <B2BPortal key={pageLocation.key} initialTab={params.get("tab") === "messages" ? "messages" : undefined}
          initialRfqId={params.get('rfq') ?? undefined} />}
        {activeTab === 'payment-settlement' && <PaymentSettlement onOrders={() => setActiveTab('orders')} />}

        {activeTab === 'seller-center' && (
          <SellerCenter onBackToShop={() => setActiveTab('home')} />
        )}

        {activeTab === 'profile' && (
          <UserProfile
            key={`${activeTab}:${auth.user?.userId}`}
            onOpenStore={onOpenStore}
            setActiveTab={setActiveTab}
          />
        )}
        </>}
      </main>

      {!isSellerCenter && !isAdminCenter && <Footer />}

      <CartDrawer
        isOpen={isCartOpen}
        onClose={closeCart}
        items={cartItems}
        error={cartError}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        busy={cartBusy}
        onSelectionChange={handleCartSelection}
        onProceedCheckout={cartItemIds => openCheckout({ cartItemIds })}
      />

      <FloatingChatWidget open={chatOpen} onClose={closeChat} conversationId={chatConversationId}
        onSelectConversation={setChatConversationId} onOpenRfq={id => { setChatOpen(false); go('/b2b?rfq=' + encodeURIComponent(id)); }} />
      <AIChatWidget key={userId || 'guest'} open={isAIOpen} enabled={aiEnabled}
        onOpen={() => { setChatOpen(false); setIsAIOpen(true); }} onClose={closeAI} onNavigate={url => go(url)} />
    </div>
  );
}
