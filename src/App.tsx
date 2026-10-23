import { useEffect, useState } from 'react';
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
import { FulfillmentDemoPage } from './features/fulfillment/pages/FulfillmentDemoPage';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import SupplierOnboarding from './pages/seller/SupplierOnboarding';
import AdminSupplierReview from './pages/admin/AdminSupplierReview';
import EmptyState from './components/ui/EmptyState';

import { Product, Store, CartItem } from './types';
import { PRODUCTS, STORES } from './data/mockData';
import { useCatalog } from './context/CatalogContext';
import { useAuth } from './context/AuthContext';
import { accessLevelOf, canAccess } from './utils/permissions';

/** Shown on the login screen when a guest opens a protected tab. */
const LOGIN_NOTICES: Record<string, string> = {
  checkout: 'Vui lòng đăng nhập để thanh toán. Giỏ hàng của bạn vẫn được giữ nguyên.',
  orders: 'Vui lòng đăng nhập để xem đơn hàng của bạn.',
  profile: 'Vui lòng đăng nhập để xem tài khoản.',
  wishlist: 'Vui lòng đăng nhập để xem danh sách yêu thích.',
  b2b: 'Vui lòng đăng nhập để gửi yêu cầu báo giá doanh nghiệp.',
  'payment-settlement': 'Vui lòng đăng nhập để xem thanh toán của bạn.',
  'seller-center': 'Đăng nhập bằng tài khoản nhà cung cấp để vào Kênh Người Bán.',
  admin: 'Đăng nhập bằng tài khoản quản trị viên.'
};

export default function App() {
  const { stores } = useCatalog();
  const auth = useAuth();
  const [activeTab, setActiveTab] = useState<string>(() => new URLSearchParams(location.search).has('finance') ? 'payment-settlement' : 'home');
  /** Protected tab to return to after login/register. */
  const [returnTab, setReturnTab] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product>(PRODUCTS[0]);
  const [selectedStore, setSelectedStore] = useState<Store>(STORES[0]);

  const [cartItems, setCartItems] = useState<CartItem[]>([
    {
      id: 'cart-1',
      productId: PRODUCTS[0].id,
      product: PRODUCTS[0],
      quantity: 1,
      sugarLevel: 'Ít ngọt (Giảm 30%)'
    }
  ]);

  const [wishlistIds, setWishlistIds] = useState<string[]>(['prod-1', 'prod-3']);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Cart actions
  const handleAddToCart = (product: Product, quantity = 1, sugarLevel: string = product.sugarLevel, openCart = true) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.productId === product.id && item.sugarLevel === sugarLevel);
      if (existing) {
        return prev.map(item =>
          item.id === existing.id ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [
        ...prev,
        {
          id: 'cart-' + Date.now(),
          productId: product.id,
          product,
          quantity,
          sugarLevel
        }
      ];
    });
    if (openCart) setIsCartOpen(true);
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    setCartItems(prev =>
      prev.map(item => {
        if (item.id === id) {
          const newQ = item.quantity + delta;
          return newQ > 0 ? { ...item, quantity: newQ } : item;
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const handleBuyNow = (product: Product, quantity = 1, sugarLevel: string = product.sugarLevel) => {
    handleAddToCart(product, quantity, sugarLevel, false);
    setActiveTab('checkout');
  };

  const handleToggleWishlist = (productId: string) => {
    setWishlistIds(prev =>
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
  };

  // Order totals, snapshots and statuses come from the backend (services/api);
  // the app only clears the cart once an order has been placed.
  const handleOrderPlaced = () => setCartItems([]);

  // Access control: a protected tab renders a gate (login / supplier onboarding / 403) instead of the page.
  const accessLevel = accessLevelOf(activeTab);
  const isAllowed = canAccess(accessLevel, auth);
  const isSellerCenter = activeTab === 'seller-center' && isAllowed;

  const goToAuth = (mode: 'login' | 'register') => {
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
  }, [activeTab]);

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
      {!isSellerCenter && (
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          cartItemsCount={cartItems.reduce((sum, i) => sum + i.quantity, 0)}
          wishlistCount={wishlistIds.length}
          onOpenCart={() => setIsCartOpen(true)}
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
        {!isAllowed ? renderGate() : <>
        {activeTab === 'login' && (
          <Login
            onSuccess={() => finishAuth()}
            onSwitchToRegister={() => setActiveTab('register')}
          />
        )}

        {activeTab === 'register' && (
          <Register
            onSuccess={(accountType) => finishAuth(accountType === 'supplier' ? 'seller-center' : 'home')}
            onSwitchToLogin={() => setActiveTab('login')}
            defaultAccountType={returnTab === 'seller-center' ? 'supplier' : 'customer'}
          />
        )}

        {activeTab === 'admin' && <AdminSupplierReview />}

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

        {activeTab === 'detail' && (
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

        {activeTab === 'store-detail' && (
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
          <OrderTracking setActiveTab={setActiveTab} />
        )}

        {activeTab === 'b2b' && <B2BPortal />}
        {activeTab === 'payment-settlement' && <PaymentSettlement />}

        {activeTab === 'seller-center' && (
          <SellerCenter onBackToShop={() => setActiveTab('home')} />
        )}

        {(activeTab === 'profile' || activeTab === 'wishlist') && (
          <UserProfile
            key={activeTab}
            initialTab={activeTab === 'wishlist' ? 'wishlist' : 'info'}
            wishlistIds={wishlistIds}
            onToggleWishlist={handleToggleWishlist}
            setSelectedProduct={(p) => {
              setSelectedProduct(p);
              setActiveTab('detail');
            }}
            setActiveTab={setActiveTab}
          />
        )}
        </>}
      </main>

      {!isSellerCenter && <Footer />}

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
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
