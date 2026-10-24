import React, { useState, useRef, useEffect } from 'react';
import {
  Search, ShoppingBag, Heart, Sparkles, Package, Building2, Menu, X,
  PhoneCall, ChevronDown, Store as StoreIcon, ArrowRight, ShieldCheck, Star
} from 'lucide-react';
import { Store, Product } from '../types';
import { useCatalog } from '../context/CatalogContext';
import { useAuth } from '../context/AuthContext';
import UserMenu from './UserMenu';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  cartItemsCount: number;
  wishlistCount: number;
  onOpenCart: () => void;
  onOpenAI: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  setSelectedStore?: (store: Store) => void;
  setSelectedProduct?: (product: Product) => void;
  onLogin: () => void;
  onRegister: () => void;
  onLogout: () => void;
}

export default function Navbar({
  activeTab,
  setActiveTab,
  cartItemsCount,
  wishlistCount,
  onOpenCart,
  onOpenAI,
  searchQuery,
  setSearchQuery,
  setSelectedStore,
  setSelectedProduct,
  onLogin,
  onRegister,
  onLogout
}: NavbarProps) {
  const { stores, products } = useCatalog();
  const { isAuthenticated, isAdmin } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const storeDropdownRef = useRef<HTMLDivElement>(null);

  // Close search popover & dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
      if (storeDropdownRef.current && !storeDropdownRef.current.contains(event.target as Node)) {
        setStoreDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter stores matching query
  const matchingStores = searchQuery.trim()
    ? stores.filter(b =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.categoryLabel?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.featuredTags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    : stores;

  // Filter products matching query
  const matchingProducts = searchQuery.trim()
    ? products.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.flavor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.storeName.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 3)
    : [];

  const handleSelectStore = (store: Store) => {
    if (setSelectedStore) setSelectedStore(store);
    setActiveTab('store-detail');
    setIsSearchFocused(false);
    setStoreDropdownOpen(false);
    setMobileMenuOpen(false);
  };

  const handleSelectProduct = (product: Product) => {
    if (setSelectedProduct) setSelectedProduct(product);
    setActiveTab('detail');
    setIsSearchFocused(false);
    setMobileMenuOpen(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setActiveTab('products');
      setIsSearchFocused(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white shadow-md">
      {/* Top Announcement Bar */}
      <div className="bg-gradient-to-r from-primary-950 via-primary-900 to-accent-950 text-accent-100 text-xs sm:text-sm py-2">
        <div className="mss-container flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="bg-accent-400 text-primary-950 font-black px-2 py-0.5 rounded text-[11px] uppercase tracking-wider">
              Mùa Trăng 2026
            </span>
            <span className="truncate max-w-[280px] sm:max-w-none text-gray-200">
              Sàn quy tụ các thương hiệu chính hãng • Chiết khấu B2B đến 30% • Giao hỏa tốc 2H
            </span>
          </div>

          <div className="flex items-center gap-4 text-accent-200 text-xs">
            <a href="tel:19001509" className="flex items-center gap-1 hover:text-white transition">
              <PhoneCall className="w-3.5 h-3.5 text-accent-400" />
              <span>Hotline Tư Vấn: 1900 1509</span>
            </a>
            <button
              onClick={onOpenAI}
              className="flex items-center gap-1 bg-accent-400 text-primary-950 font-bold px-2.5 py-1 rounded-full hover:bg-accent-300 transition shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Tư Vấn Bánh & Trà</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="mss-container py-3 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div
          onClick={() => setActiveTab('home')}
          className="flex items-center gap-3 cursor-pointer group shrink-0"
        >
          <div className="w-11 h-11 bg-gradient-to-br from-primary-700 to-accent-600 text-white rounded-2xl flex items-center justify-center shadow-md group-hover:scale-105 transition">
            <span className="text-2xl">🥮</span>
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-primary-900 tracking-tight leading-none">
              Mooncake<span className="text-accent-700">Hub</span>
            </h1>
            <p className="text-[10px] sm:text-xs text-accent-800 font-bold tracking-widest mt-0.5 uppercase">
              SÀN ĐA GIAN HÀNG CHÍNH HÃNG
            </p>
          </div>
        </div>

        {/* Elongated Search Bar with Instant Suggestions */}
        <div ref={searchContainerRef} className="flex-1 max-w-2xl relative hidden md:block">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="absolute left-4 top-3.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchFocused(true);
              }}
              placeholder="Tìm gian hàng, thương hiệu bánh..."
              className="w-full pl-11 pr-10 py-2.5 border border-accent-300/70 rounded-full bg-accent-50/30 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-700 focus:bg-white focus:border-transparent transition shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-3 text-xs text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            )}
          </form>

          {/* Quick Suggestions Popover */}
          {isSearchFocused && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-accent-200 shadow-2xl z-50 overflow-hidden divide-y divide-gray-100 animate-in fade-in zoom-in-95 duration-150">
              {/* Stores Suggestions Section */}
              <div className="p-3">
                <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase tracking-wider px-2 mb-2">
                  <span className="flex items-center gap-1.5 text-primary-800">
                    <StoreIcon className="w-3.5 h-3.5 text-primary-700" />
                    <span>Gian hàng</span>
                  </span>
                  {matchingStores.length > 0 && (
                    <span className="text-[11px] text-gray-400">({matchingStores.length} gian hàng)</span>
                  )}
                </div>

                {matchingStores.length === 0 ? (
                  <p className="text-xs text-gray-500 px-2 py-1">Không có gian hàng nào khớp từ khóa "{searchQuery}"</p>
                ) : (
                  <div className="space-y-1">
                    {matchingStores.slice(0, 4).map((store) => (
                      <div
                        key={store.storeId}
                        onClick={() => handleSelectStore(store)}
                        className="flex items-center justify-between p-2 rounded-xl hover:bg-accent-50 cursor-pointer transition group"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={store.logoUrl}
                            alt={store.name}
                            className="w-9 h-9 rounded-lg object-contain bg-white border border-gray-200 group-hover:scale-105 transition"
                          />
                          <div>
                            <p className="text-xs font-bold text-gray-900 group-hover:text-primary-700 flex items-center gap-1">
                              <span>{store.name}</span>
                              <ShieldCheck className="w-3 h-3 text-accent-600" />
                            </p>
                            <p className="text-[11px] text-gray-500">
                              {store.categoryLabel || 'Chính hãng'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <span className="text-xs text-primary-700 font-bold group-hover:translate-x-1 transition-transform">
                            →
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Products Suggestions (if typing) */}
              {matchingProducts.length > 0 && (
                <div className="p-3 bg-gray-50/50">
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wider px-2 mb-2">
                    Bánh gợi ý
                  </div>
                  <div className="space-y-1">
                    {matchingProducts.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => handleSelectProduct(p)}
                        className="flex items-center justify-between p-2 rounded-xl hover:bg-white cursor-pointer transition group"
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-8 h-8 rounded-lg object-cover border border-gray-200"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-gray-900 group-hover:text-primary-700 truncate max-w-xs">
                              {p.name}
                            </p>
                            <p className="text-[11px] text-gray-500">{p.storeName}</p>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-primary-700 shrink-0">
                          {p.price.toLocaleString()}đ
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* View All Search Results Footer */}
              <div className="p-2.5 bg-gray-50 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('products');
                    setIsSearchFocused(false);
                  }}
                  className="text-xs font-bold text-primary-700 hover:text-primary-900 hover:underline flex items-center justify-center gap-1 w-full"
                >
                  <span>Xem tất cả kết quả cho "{searchQuery || 'bánh trung thu'}"</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Actions Hierarchy */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Seller Center: Restyled as discreet, elegant outline text-button */}
          <button
            onClick={() => setActiveTab('seller-center')}
            className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-gray-200 text-gray-600 hover:text-primary-700 hover:border-primary-300 hover:bg-primary-50/60 transition"
            title="Dành cho đối tác xưởng bánh & người bán"
          >
            <span>🏪</span>
            <span>Kênh Người Bán</span>
          </button>

          {/* Orders link */}
          <button
            onClick={() => setActiveTab('orders')}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${activeTab === 'orders'
              ? 'bg-primary-50 text-primary-700 border border-primary-200'
              : 'text-gray-700 hover:bg-gray-100'
              }`}
          >
            <Package className="w-4 h-4 text-accent-700" />
            <span>Đơn Hàng</span>
          </button>

          {/* Wishlist */}
          <button
            onClick={() => setActiveTab('wishlist')}
            className="p-2.5 text-gray-700 hover:bg-gray-100 rounded-full relative transition"
            title="Danh sách yêu thích"
          >
            <Heart className="w-5 h-5" />
            {wishlistCount > 0 && (
              <span className="absolute top-1 right-1 bg-red-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {wishlistCount}
              </span>
            )}
          </button>

          {/* High-priority Cart Button */}
          <button
            onClick={onOpenCart}
            className="relative bg-gradient-to-r from-primary-700 via-primary-800 to-primary-900 hover:from-primary-800 hover:to-primary-950 text-white font-bold px-4 py-2.5 rounded-full shadow-md hover:shadow-lg transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-95"
            title="Giỏ hàng"
          >
            <ShoppingBag className="w-4 h-4 text-accent-300" />
            <span className="text-xs sm:text-sm font-bold hidden sm:inline">Giỏ Hàng</span>
            {cartItemsCount > 0 && (
              <span className="bg-accent-400 text-primary-950 text-xs font-black px-1.5 py-0.2 rounded-full shadow ring-2 ring-white">
                {cartItemsCount}
              </span>
            )}
          </button>

          {/* Account: login/register or user menu (role-based links) */}
          <UserMenu
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onLogin={onLogin}
            onRegister={onRegister}
            onLogout={onLogout}
          />

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <nav className="border-t border-gray-100 bg-white hidden md:block">
        <div className="mss-container flex items-center justify-between text-xs sm:text-sm font-medium">
          <div className="flex items-center gap-1">
            {/* Home link */}
            <button
              onClick={() => setActiveTab('home')}
              className={`px-4 py-3 border-b-2 transition ${activeTab === 'home'
                ? 'border-primary-700 text-primary-700 font-bold'
                : 'border-transparent text-gray-700 hover:text-primary-700'
                }`}
            >
              Trang Chủ
            </button>

            {/* Stores with dropdown */}
            <div ref={storeDropdownRef} className="relative">
              <button
                onClick={() => setStoreDropdownOpen(!storeDropdownOpen)}
                className={`px-4 py-3 border-b-2 flex items-center gap-1.5 transition ${activeTab === 'stores' || activeTab === 'store-detail'
                  ? 'border-primary-700 text-primary-700 font-bold'
                  : 'border-transparent text-gray-700 hover:text-primary-700'
                  }`}
              >
                <StoreIcon className="w-4 h-4 text-accent-700" />
                <span>Gian Hàng</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${storeDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Stores Dropdown Menu */}
              {storeDropdownOpen && (
                <div className="absolute top-full left-0 w-80 bg-white rounded-2xl border border-accent-200 shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-2 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Gian Hàng Đối Tác Tuyển Chọn</span>
                    <span className="text-primary-700 font-semibold">{stores.length} thương hiệu</span>
                  </div>

                  <div className="py-1">
                    {stores.map((store) => (
                      <div
                        key={store.storeId}
                        onClick={() => handleSelectStore(store)}
                        className="px-4 py-2.5 hover:bg-accent-50/70 cursor-pointer transition flex items-center gap-3 group"
                      >
                        <img
                          src={store.logoUrl}
                          alt={store.name}
                          className="w-9 h-9 rounded-xl object-contain bg-white border border-gray-200 group-hover:scale-105 transition"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-900 group-hover:text-primary-700 truncate">
                            {store.name}
                          </p>
                          <p className="text-[11px] text-gray-500 truncate">
                            {store.categoryLabel || 'Thương hiệu chính hãng'}
                          </p>
                        </div>
                        <span className="text-xs text-primary-700 font-bold group-hover:translate-x-1 transition-transform">
                          →
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 px-4 pb-2 border-t border-gray-100">
                    <button
                      onClick={() => {
                        setActiveTab('stores');
                        setStoreDropdownOpen(false);
                      }}
                      className="w-full text-center py-2 text-xs font-bold text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-xl transition flex items-center justify-center gap-1"
                    >
                      <span>Xem danh mục tất cả gian hàng</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* All Products */}
            <button
              onClick={() => setActiveTab('products')}
              className={`px-4 py-3 border-b-2 transition ${activeTab === 'products'
                ? 'border-primary-700 text-primary-700 font-bold'
                : 'border-transparent text-gray-700 hover:text-primary-700'
                }`}
            >
              Sản phẩm
            </button>

            {/* Corporate B2B */}
            <button
              onClick={() => setActiveTab('b2b')}
              className={`px-4 py-3 border-b-2 transition ${activeTab === 'b2b'
                ? 'border-primary-700 text-primary-700 font-bold'
                : 'border-transparent text-gray-700 hover:text-primary-700'
                }`}
            >
              Doanh Nghiệp
            </button>

            {/* Fulfillment */}
            <button
              onClick={() => setActiveTab('fulfillment')}
              className={`px-4 py-3 border-b-2 transition ${activeTab === 'fulfillment'
                ? 'border-primary-700 text-primary-700 font-bold'
                : 'border-transparent text-gray-700 hover:text-primary-700'
                }`}
            >
              Vận Chuyển
            </button>

            {/* Checkout */}
            <button
              onClick={() => setActiveTab('checkout')}
              className={`px-4 py-3 border-b-2 transition ${activeTab === 'checkout'
                ? 'border-primary-700 text-primary-700 font-bold'
                : 'border-transparent text-gray-700 hover:text-primary-700'
                }`}
            >
              Thanh Toán
            </button>
          </div>

          {/* Right Highlight Badge */}
          <div className="flex items-center gap-2 text-xs text-primary-900 font-bold bg-accent-100/70 border border-accent-300/60 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
            <span>Chiết khấu doanh nghiệp B2B lên đến 30%</span>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200 p-4 space-y-4 animate-in fade-in duration-150">
          {/* Mobile Search */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm gian hàng, loại bánh..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-xs"
            />
          </form>

          {/* Mobile Nav Links */}
          <div className="flex flex-col space-y-1 text-sm font-semibold text-gray-800">
            <button
              onClick={() => { setActiveTab('home'); setMobileMenuOpen(false); }}
              className="p-2 text-left hover:bg-accent-50 rounded-lg flex items-center gap-2"
            >
              <span>🏠</span>
              <span>Trang Chủ</span>
            </button>

            <button
              onClick={() => { setActiveTab('stores'); setMobileMenuOpen(false); }}
              className="p-2 text-left hover:bg-accent-50 rounded-lg flex items-center gap-2 text-primary-700"
            >
              <span>🏪</span>
              <span>Gian Hàng / Thương Hiệu</span>
            </button>

            <button
              onClick={() => { setActiveTab('products'); setMobileMenuOpen(false); }}
              className="p-2 text-left hover:bg-accent-50 rounded-lg flex items-center gap-2"
            >
              <span>🥮</span>
              <span>Tất Cả Bánh & Hộp Quà</span>
            </button>

            <button
              onClick={() => { setActiveTab('b2b'); setMobileMenuOpen(false); }}
              className="p-2 text-left hover:bg-accent-50 rounded-lg flex items-center gap-2"
            >
              <span>💼</span>
              <span>Doanh Nghiệp / B2B</span>
            </button>

            <button
              onClick={() => { setActiveTab('orders'); setMobileMenuOpen(false); }}
              className="p-2 text-left hover:bg-accent-50 rounded-lg flex items-center gap-2"
            >
              <span>📦</span>
              <span>Đơn Hàng Của Tôi</span>
            </button>

            <button
              onClick={() => { setActiveTab('seller-center'); setMobileMenuOpen(false); }}
              className="p-2 text-left hover:bg-accent-50 rounded-lg flex items-center gap-2 text-accent-800"
            >
              <span>🏪</span>
              <span>Kênh Người Bán</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => { setActiveTab('admin'); setMobileMenuOpen(false); }}
                className="p-2 text-left hover:bg-accent-50 rounded-lg flex items-center gap-2 text-accent-800"
              >
                <span>🛡️</span>
                <span>Duyệt nhà cung cấp</span>
              </button>
            )}

            {isAuthenticated ? (
              <button
                onClick={() => { onLogout(); setMobileMenuOpen(false); }}
                className="p-2 text-left hover:bg-red-50 rounded-lg flex items-center gap-2 text-red-700"
              >
                <span>↩</span>
                <span>Đăng xuất</span>
              </button>
            ) : (
              <button
                onClick={() => { onRegister(); setMobileMenuOpen(false); }}
                className="p-2 text-left hover:bg-accent-50 rounded-lg flex items-center gap-2 text-primary-700"
              >
                <span>✍️</span>
                <span>Đăng ký tài khoản</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
