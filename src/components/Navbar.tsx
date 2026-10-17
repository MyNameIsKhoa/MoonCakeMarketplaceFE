import React, { useState } from 'react';
import { Search, ShoppingBag, Heart, Sparkles, Package, Building2, User, Menu, X, PhoneCall } from 'lucide-react';
import { CartItem } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  cartItemsCount: number;
  wishlistCount: number;
  onOpenCart: () => void;
  onOpenAI: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export default function Navbar({
  activeTab,
  setActiveTab,
  cartItemsCount,
  wishlistCount,
  onOpenCart,
  onOpenAI,
  searchQuery,
  setSearchQuery
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white shadow-md">
      {/* Top Announcement Bar */}
      <div className="bg-gradient-to-r from-primary-900 via-accent-800 to-primary-900 text-accent-100 text-sm py-2">
        <div className="mss-container flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="bg-accent-400 text-primary-900 font-bold px-2 py-1 rounded text-xs uppercase tracking-wide">Mùa Trăng 2026</span>
            <span>Miễn phí giao hàng toàn quốc cho đơn từ 500.000đ • Tặng kèm hộp quà nghệ thuật & thiệp</span>
          </div>
          <div className="flex items-center gap-4 text-accent-200">
            <a href="tel:19001509" className="flex items-center gap-1 hover:text-white transition">
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Hotline Doanh Nghiệp: 1900 1509</span>
            </a>
            <button 
              onClick={onOpenAI}
              className="flex items-center gap-1 bg-accent-400 text-primary-900 font-semibold px-3 py-1 rounded-full hover:bg-accent-300 transition shadow-sm"
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
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-12 h-12 bg-gradient-to-br from-primary-700 to-accent-600 text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-105 transition">
            <span className="text-2xl">🥮</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-primary-800 tracking-tight leading-none">Bánh Trung Thu</h1>
            <p className="text-sm text-accent-700 font-medium tracking-widest mt-1">SÀN CHÍNH HÃNG 2026</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-xl hidden md:block">
          <div className="relative">
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (activeTab !== 'products') setActiveTab('products');
              }}
              placeholder="Tìm kiếm bánh Kinh Đô, Như Lan, Madame Hương, hộp quà cao cấp..."
              className="w-full pl-12 pr-4 py-3 border border-accent-200 rounded-full bg-accent-50/40 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-700 focus:bg-white transition"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => setActiveTab('b2b')}
            className={`hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition ${
              activeTab === 'b2b' ? 'bg-primary-50 text-primary-700 border border-primary-200' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Building2 className="w-4 h-4 text-accent-700" />
            <span>Doanh Nghiệp / B2B</span>
          </button>

          <button
            onClick={() => setActiveTab('seller-center')}
            className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold bg-primary-900 text-accent-200 hover:bg-primary-800 transition shadow-sm"
          >
            <span className="text-accent-400 font-bold">🏪</span>
            <span>Kênh Người Bán & Quản Trị</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition ${
              activeTab === 'orders' ? 'bg-primary-50 text-primary-700 border border-primary-200' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Package className="w-4 h-4 text-accent-700" />
            <span className="hidden sm:inline">Đơn Hàng</span>
          </button>

          <button
            onClick={() => setActiveTab('wishlist')}
            className="p-3 text-gray-700 hover:bg-gray-100 rounded-full relative transition"
            title="Yêu thích"
          >
            <Heart className="w-5 h-5" />
            {wishlistCount > 0 && (
              <span className="absolute top-1 right-1 bg-red-600 text-white text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {wishlistCount}
              </span>
            )}
          </button>

          <button
            onClick={onOpenCart}
            className="p-3 bg-primary-700 hover:bg-primary-800 text-white rounded-full relative shadow transition flex items-center gap-1 px-4"
            title="Giỏ hàng"
          >
            <ShoppingBag className="w-5 h-5 text-accent-300" />
            <span className="text-sm font-bold hidden sm:inline">Giỏ Hàng</span>
            {cartItemsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-accent-400 text-primary-900 text-sm font-black w-5 h-5 rounded-full flex items-center justify-center shadow">
                {cartItemsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`p-3 rounded-full transition ${
              activeTab === 'profile' ? 'bg-primary-100 text-primary-700' : 'text-gray-700 hover:bg-gray-100'
            }`}
            title="Tài khoản"
          >
            <User className="w-5 h-5" />
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-3 text-gray-700 hover:bg-gray-100 rounded-full"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Navigation Links Bar */}
      <nav className="border-t border-gray-100 bg-white hidden md:block">
        <div className="mss-container flex items-center justify-between text-sm font-medium">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('home')}
              className={`px-4 py-3 border-b-2 transition ${
                activeTab === 'home' ? 'border-primary-700 text-primary-700 font-semibold' : 'border-transparent text-gray-700 hover:text-primary-700'
              }`}
            >
              Trang Chủ
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`px-4 py-3 border-b-2 transition ${
                activeTab === 'products' ? 'border-primary-700 text-primary-700 font-semibold' : 'border-transparent text-gray-700 hover:text-primary-700'
              }`}
            >
              Tất Cả Sản Phẩm & Hộp Quà
            </button>
            <button
              onClick={() => setActiveTab('brands')}
              className={`px-4 py-3 border-b-2 transition ${
                activeTab === 'brands' ? 'border-primary-700 text-primary-700 font-semibold' : 'border-transparent text-gray-700 hover:text-primary-700'
              }`}
            >
              Thương Hiệu Nổi Bật (Kinh Đô, Như Lan...)
            </button>
            <button
              onClick={() => setActiveTab('b2b')}
              className={`px-4 py-3 border-b-2 transition ${
                activeTab === 'b2b' ? 'border-primary-700 text-primary-700 font-semibold' : 'border-transparent text-gray-700 hover:text-primary-700'
              }`}
            >
              Cổng Doanh Nghiệp & B2B
            </button>
          </div>

          <div className="flex items-center gap-3 text-sm text-primary-800 font-semibold bg-primary-50 px-3 py-2 rounded-lg border border-primary-100">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
            <span>Ưu đãi doanh nghiệp chiết khấu lên đến 30%</span>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200 p-4 space-y-3 animate-fadeIn">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (activeTab !== 'products') setActiveTab('products');
              }}
              placeholder="Tìm kiếm bánh trung thu..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div className="flex flex-col space-y-1 text-sm font-medium">
            <button onClick={() => { setActiveTab('home'); setMobileMenuOpen(false); }} className="p-2 text-left hover:bg-gray-50 rounded">Trang Chủ</button>
            <button onClick={() => { setActiveTab('products'); setMobileMenuOpen(false); }} className="p-2 text-left hover:bg-gray-50 rounded">Tất Cả Sản Phẩm</button>
            <button onClick={() => { setActiveTab('brands'); setMobileMenuOpen(false); }} className="p-2 text-left hover:bg-gray-50 rounded">Thương Hiệu</button>
            <button onClick={() => { setActiveTab('b2b'); setMobileMenuOpen(false); }} className="p-2 text-left hover:bg-gray-50 rounded">Doanh Nghiệp / B2B</button>
            <button onClick={() => { setActiveTab('orders'); setMobileMenuOpen(false); }} className="p-2 text-left hover:bg-gray-50 rounded">Đơn Hàng Của Tôi</button>
            <button onClick={() => { setActiveTab('profile'); setMobileMenuOpen(false); }} className="p-2 text-left hover:bg-gray-50 rounded">Tài Khoản</button>
          </div>
        </div>
      )}
    </header>
  );
}
