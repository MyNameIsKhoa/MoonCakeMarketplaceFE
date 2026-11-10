import { useCallback, useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import AIAssistantModal from './components/AIAssistantModal';

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
import { cartApi, catalogApi, isApiId } from './services/api';

/** Shown on the login screen when a guest opens a protected tab. */
const LOGIN_NOTICES: Record<string, string> = {
  checkout: 'Vui lòng đăng nhập rồi thêm sản phẩm để thanh toán.',
  orders: 'Vui lòng đăng nhập để xem đơn hàng của bạn.',
  profile: 'Vui lòng đăng nhập để xem tài khoản.',
  wishlist: 'Vui lòng đăng nhập để xem danh sách yêu thích.',
  b2b: 'Vui lòng đăng nhập để gửi yêu cầu báo giá doanh nghiệp.',
  'payment-settlement': 'Vui lòng đăng nhập để xem thanh toán của bạn.',
  'seller-center': 'Đăng nhập bằng tài khoản nhà cung cấp để vào Kênh Người Bán.',
  admin: 'Đăng nhập bằng tài khoản quản trị viên.'
};

export default function App() {
  const { stores, products, source } = useCatalog();
  const auth = useAuth();
  const [paymentReturnOrderId, setPaymentReturnOrderId] = useState<string | null>(() => {
    const params = new URLSearchParams(location.search);
    const orderId = sessionStorage.getItem('financeCustomerOrderId');
    return ['return', 'cancel'].includes(params.get('finance') || '') && orderId && /^\d+$/.test(orderId) ? orderId : null;
  });
  const [paymentReturnSellerPaymentId, setPaymentReturnSellerPaymentId] = useState<string | null>(() => {
    const params = new URLSearchParams(location.search);
    const paymentId = sessionStorage.getItem('financeSellerPaymentId');
    return ['return', 'cancel'].includes(params.get('finance') || '') && paymentId && /^\d+$/.test(paymentId) ? paymentId : null;
  });
  const [activeTab, setActiveTab] = useState<string>(() => {
    const params = new URLSearchParams(location.search);
    // Identity email verification route; password reset now uses an in-app code form.
    return location.pathname === '/verify-email' ? 'verify-email'
      : location.pathname === '/reset-password' ? 'forgot-password'
      : paymentReturnOrderId || paymentReturnSellerPaymentId ? 'orders' : params.has('finance') ? 'payment-settlement' : 'home';
  });
  /** Protected tab to return to after login/register. */
  const [returnTab, setReturnTab] = useState<string | null>(null);
  /** The navbar chat icon opens the B2B portal on "Tin nhắn"; the key remounts it when already open. */
  const [b2bEntry, setB2bEntry] = useState<{ key: number; tab?: 'messages' }>({ key: 0 });
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartError, setCartError] = useState('');

  // No wishlist API exists yet: each account keeps its favourite product IDs in this browser.
  const [wishlist, setWishlist] = useState<{ key: string | null; ids: string[] }>({ key: null, ids: [] });
  const wishlistKey = auth.user ? `mooncake.wishlist.${auth.user.userId}` : null;
  const wishlistIds = wishlist.key === wishlistKey ? wishlist.ids : [];
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const handlePaymentReturnHandled = useCallback(() => {
    setPaymentReturnOrderId(null);
    setPaymentReturnSellerPaymentId(null);
  }, []);

  useEffect(() => {
    if (!paymentReturnOrderId && !paymentReturnSellerPaymentId) return;
    window.history.replaceState({}, '', window.location.pathname);
    sessionStorage.removeItem('financeCustomerOrderId');
    sessionStorage.removeItem('financeSellerPaymentId');
  }, [paymentReturnOrderId, paymentReturnSellerPaymentId]);

  useEffect(() => {
    let cancelled = false;
    setCartItems([]);
    setCartError('');
    if (auth.isAuthenticated) cartApi.list()
      .then(items => { if (!cancelled) setCartItems(items); })
      .catch((err: unknown) => { if (!cancelled) setCartError(err instanceof Error ? err.message : 'Không tải được giỏ hàng.'); });
    return () => { cancelled = true; };
  }, [auth.isAuthenticated, auth.user?.userId]);

  const refreshCart = async () => setCartItems(await cartApi.list());
  const handleAddToCart = async (product: Product, quantity = 1, _option: string = product.sugarLevel, openCart = true) => {
    if (!auth.isAuthenticated) { setActiveTab('login'); return false; }
    try {
      setCartError('');
      if (source !== 'api' || !isApiId(product.id) || !products.some(p => p.id === product.id)) {
        throw new Error('Sản phẩm hiện không khả dụng để đặt mua.');
      }
      const detail = await catalogApi.products.get(Number(product.id));
      if (detail.status !== 'ACTIVE') throw new Error('Sản phẩm hiện không bán.');
      const variant = product.variantId
        ? detail.variants.find(v => String(v.variantId) === product.variantId)
        : detail.variants.find(v => v.status === 'ACTIVE' && v.stockQuantity > 0);
      const variantId = variant ? String(variant.variantId) : '';
      if (!variant || variant.status !== 'ACTIVE' || variant.stockQuantity < quantity || !isApiId(variantId)) {
        throw new Error('Phân loại sản phẩm đã hết hàng hoặc không đủ số lượng tồn kho.');
      }
      await cartApi.add(variantId, quantity);
      await refreshCart();
      if (openCart) setIsCartOpen(true);
      return true;
    } catch (err) {
      setCartError(err instanceof Error ? err.message : 'Không thêm được vào giỏ hàng.');
      setIsCartOpen(true);
      return false;
    }
  };

  const handleUpdateQuantity = async (id: string, delta: number) => {
    try {
      setCartError('');
      const item = cartItems.find((line) => line.id === id);
      if (!item) return;
      if (item.quantity + delta <= 0) await cartApi.remove(id);
      else await cartApi.update(id, item.quantity + delta);
      await refreshCart();
    } catch (err) { setCartError(err instanceof Error ? err.message : 'Không cập nhật được giỏ hàng.'); }
  };

  const handleRemoveItem = async (id: string) => {
    try { setCartError(''); await cartApi.remove(id); await refreshCart(); }
    catch (err) { setCartError(err instanceof Error ? err.message : 'Không xóa được sản phẩm.'); }
  };

  const handleBuyNow = async (product: Product, quantity = 1, option: string = product.sugarLevel) => {
    if (await handleAddToCart(product, quantity, option, false)) setActiveTab('checkout');
  };

  useEffect(() => {
    if (!wishlistKey) { setWishlist({ key: wishlistKey, ids: [] }); return; }
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(wishlistKey) ?? '[]');
      setWishlist({ key: wishlistKey, ids: Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string') : [] });
    } catch {
      setWishlist({ key: wishlistKey, ids: [] });
    }
  }, [wishlistKey]);

  const handleToggleWishlist = (productId: string) => {
    if (!isApiId(productId)) return;
    if (!wishlistKey) { setActiveTab('login'); return; }
    const next = wishlistIds.includes(productId)
      ? wishlistIds.filter(id => id !== productId) : [...wishlistIds, productId];
    setWishlist({ key: wishlistKey, ids: next });
    try { localStorage.setItem(wishlistKey, JSON.stringify(next)); } catch { /* storage blocked: keep it for this visit */ }
  };

  // Order totals, snapshots and statuses come from the backend (services/api);
  // the app only clears the cart once an order has been placed.
  const handleOrderPlaced = () => setCartItems([]);

  // Access control: a protected tab renders a gate (login / supplier onboarding / 403) instead of the page.
  const accessLevel = accessLevelOf(activeTab);
  const isAllowed = canAccess(accessLevel, auth);
  const isSellerCenter = activeTab === 'seller-center' && isAllowed;
  const isAdminCenter = activeTab === 'admin' && isAllowed;

  const goToAuth = (mode: 'login' | 'register' | 'forgot-password') => {
    setReturnTab(accessLevel !== 'public' ? activeTab : returnTab);
    setActiveTab(mode);
  };

  const finishAuth = (fallbackTab = 'home') => {
    setActiveTab(returnTab ?? fallbackTab);
    setReturnTab(null);
  };

  const handleLogout = () => {
    auth.logout();
    setReturnTab(null);
    setActiveTab('home');
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    // Opening "Doanh Nghiệp" from the menu later starts on the RFQ feed again.
    if (activeTab !== 'b2b') setB2bEntry((entry) => (entry.tab ? { key: entry.key } : entry));
  }, [activeTab]);

  const openMessages = () => {
    setB2bEntry((entry) => ({ key: entry.key + 1, tab: 'messages' }));
    setActiveTab('b2b');
  };

  const renderGate = () => {
    if (auth.status === 'loading') {
      return <div className="mss-container mss-page"><p className="text-sm text-gray-500">Đang kiểm tra phiên đăng nhập…</p></div>;
    }
    if (!auth.isAuthenticated) {
      return (
        <Login
          notice={LOGIN_NOTICES[activeTab]}
          onSuccess={() => setReturnTab(null)}
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
          wishlistCount={wishlistIds.length}
          onOpenCart={() => setIsCartOpen(true)}
          onOpenMessages={openMessages}
          onOpenAI={() => setIsAIOpen(true)}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          setSelectedStore={setSelectedStore}
          setSelectedProduct={setSelectedProduct}
          onLogin={() => goToAuth('login')}
          onRegister={() => goToAuth('register')}
          onLogout={handleLogout}
        />
      )}

      <main className="mss-main">
        {activeTab === 'verify-email' && <VerifyEmail
          token={new URLSearchParams(location.search).get('token') ?? ''}
          onLogin={() => { window.history.replaceState({}, '', '/'); setActiveTab('login'); }}
        />}
        {['home', 'products', 'stores', 'detail', 'store-detail', 'profile', 'wishlist'].includes(activeTab) && <div className="mss-container pt-4"><CatalogNotice /></div>}
        {((activeTab === 'detail' && !selectedProduct) || (activeTab === 'store-detail' && !selectedStore)) && <EmptyState title="Chưa chọn sản phẩm hoặc gian hàng" />}
        {activeTab === 'stores' && source === 'api' && stores.length === 0 && <EmptyState title="Chưa có gian hàng" />}
        {!isAllowed ? renderGate() : <>
        {activeTab === 'login' && (
          <Login
            onSuccess={() => finishAuth()}
            onSwitchToRegister={() => setActiveTab('register')}
            onForgotPassword={() => setActiveTab('forgot-password')}
          />
        )}
        {activeTab === 'forgot-password' && <ForgotPassword onBackToLogin={() => setActiveTab('login')} />}

        {activeTab === 'register' && (
          <Register
            onSuccess={() => { setReturnTab(null); setActiveTab('registration-complete'); }}
            onGoogleLogin={() => finishAuth()}
            onSwitchToLogin={() => setActiveTab('login')}
            defaultAccountType={returnTab === 'seller-center' ? 'supplier' : 'customer'}
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
            setSelectedProduct={setSelectedProduct}
            setSelectedStore={setSelectedStore}
            onAddToCart={(p) => handleAddToCart(p, 1, p.sugarLevel)}
            wishlistIds={wishlistIds}
            onToggleWishlist={handleToggleWishlist}
            onOpenAI={() => setIsAIOpen(true)}
          />
        )}

        {activeTab === 'products' && (
          <ProductList
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            setSelectedProduct={(p) => {
              setSelectedProduct(p);
              setActiveTab('detail');
            }}
            setActiveTab={setActiveTab}
            onAddToCart={(p) => handleAddToCart(p, 1, p.sugarLevel)}
            wishlistIds={wishlistIds}
            onToggleWishlist={handleToggleWishlist}
          />
        )}

        {activeTab === 'detail' && selectedProduct && (
          <ProductDetail
            key={selectedProduct.id}
            product={selectedProduct}
            onAddToCart={(p, qty, sugar) => handleAddToCart(p, qty, sugar)}
            onBuyNow={(p, qty, sugar) => handleBuyNow(p, qty, sugar)}
            wishlistIds={wishlistIds}
            onToggleWishlist={handleToggleWishlist}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'stores' && (
          <div className="mss-container mss-page">
            <header className="mss-page-header">
              <h1 className="mss-page-title">Tất cả thương hiệu chính hãng</h1>
            </header>
            <div className="mss-grid-3">
              {stores.map(store => (
                <div
                  key={store.storeId}
                  onClick={() => {
                    setSelectedStore(store);
                    setActiveTab('store-detail');
                  }}
                  className="mss-card hover:border-primary-700 cursor-pointer transition flex items-center gap-4"
                >
                  <img src={store.logoUrl} alt={store.name} className="w-20 h-20 aspect-square rounded-xl object-contain bg-white p-1 border border-gray-200" />
                  <div className="min-w-0">
                    <h3 className="mss-card-title">{store.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{store.categoryLabel || 'Thương hiệu chính hãng'}</p>
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
            setSelectedProduct={(p) => {
              setSelectedProduct(p);
              setActiveTab('detail');
            }}
            setActiveTab={setActiveTab}
            onAddToCart={(p) => handleAddToCart(p, 1, p.sugarLevel)}
            wishlistIds={wishlistIds}
            onToggleWishlist={handleToggleWishlist}
          />
        )}

        {activeTab === 'checkout' && (
          <Checkout
            items={cartItems}
            onOrderPlaced={handleOrderPlaced}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'orders' && (
          <OrderTracking
            setActiveTab={setActiveTab}
            paymentReturnOrderId={paymentReturnOrderId}
            paymentReturnSellerPaymentId={paymentReturnSellerPaymentId}
            onPaymentReturnHandled={handlePaymentReturnHandled}
          />
        )}

        {activeTab === 'b2b' && <B2BPortal key={b2bEntry.key} initialTab={b2bEntry.tab} />}
        {activeTab === 'payment-settlement' && <PaymentSettlement />}

        {activeTab === 'seller-center' && (
          <SellerCenter onBackToShop={() => setActiveTab('home')} />
        )}

        {(activeTab === 'profile' || activeTab === 'wishlist') && (
          <UserProfile
            key={`${activeTab}:${auth.user?.userId}`}
            initialTab={activeTab === 'wishlist' ? 'wishlist' : 'info'}
            wishlistIds={wishlistIds}
            onToggleWishlist={handleToggleWishlist}
            setSelectedProduct={(p) => {
              setSelectedProduct(p);
              setActiveTab('detail');
            }}
            setSelectedStore={(s) => {
              setSelectedStore(s);
              setActiveTab('store-detail');
            }}
            setActiveTab={setActiveTab}
          />
        )}
        </>}
      </main>

      {!isSellerCenter && !isAdminCenter && <Footer />}

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        error={cartError}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onProceedCheckout={() => setActiveTab('checkout')}
      />

      <AIAssistantModal
        isOpen={isAIOpen}
        onClose={() => setIsAIOpen(false)}
      />
    </div>
  );
}
