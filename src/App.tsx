import { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import AIAssistantModal from './components/AIAssistantModal';

import Home from './pages/Home';
import ProductList from './pages/ProductList';
import ProductDetail from './pages/ProductDetail';
import BrandStore from './pages/BrandStore';
import Checkout from './pages/Checkout';
import OrderTracking from './pages/OrderTracking';
import B2BPortal from './pages/B2BPortal';
import UserProfile from './pages/UserProfile';
import SellerCenter from './pages/seller/SellerCenter';

import { Product, Brand, CartItem } from './types';
import { PRODUCTS, BRANDS } from './data/mockData';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('home');
  const [selectedProduct, setSelectedProduct] = useState<Product>(PRODUCTS[0]);
  const [selectedBrand, setSelectedBrand] = useState<Brand>(BRANDS[0]);

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

  const isSellerCenter = activeTab === 'seller-center';

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);

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
        />
      )}

      <main className="mss-main">
        {activeTab === 'home' && (
          <Home
            setActiveTab={setActiveTab}
            setSelectedProduct={setSelectedProduct}
            setSelectedBrand={setSelectedBrand}
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

        {activeTab === 'brands' && (
          <div className="mss-container mss-page">
            <header className="mss-page-header">
              <h1 className="mss-page-title">Tất cả thương hiệu chính hãng</h1>
            </header>
            <div className="mss-grid-3">
              {BRANDS.map(brand => (
                <div
                  key={brand.id}
                  onClick={() => {
                    setSelectedBrand(brand);
                    setActiveTab('brand-store');
                  }}
                  className="mss-card hover:border-primary-700 cursor-pointer transition flex items-center gap-4"
                >
                  <img src={brand.logo} alt={brand.name} className="w-20 h-20 aspect-square rounded-xl object-cover border border-gray-200" />
                  <div className="min-w-0">
                    <h3 className="mss-card-title">{brand.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{brand.productCount} sản phẩm • Đánh giá {brand.rating} ⭐</p>
                    <span className="inline-block mt-2 text-sm font-semibold text-primary-700">Khám phá gian hàng →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'brand-store' && (
          <BrandStore
            brand={selectedBrand}
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
