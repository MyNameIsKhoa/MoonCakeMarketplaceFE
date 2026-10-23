import React, { useState, useEffect } from 'react';
import {
  Sparkles, Star, ArrowRight, ShieldCheck, Gift, Clock, Flame,
  Cookie, Leaf, ChevronRight, Heart, Store as StoreIcon, Layers
} from 'lucide-react';
import { Product, Store } from '../types';
// Flash sale, best sellers and blogs stay on mock data (the backend has no field for them yet).
import { PRODUCTS, FESTIVE_BLOGS } from '../data/mockData';
import { useCatalog } from '../context/CatalogContext';
import { HeroBanner } from '../components/home/HeroBanner';
import { StoreSection } from '../components/home/StoreSection';

const CATEGORY_ICONS: Record<string, string> = {
  'all': '✨', 'truyen-thong': '🥮', 'cao-cap': '🎁', 'hiện-đại': '🔥', 'hien-dai': '🔥', 'chay': '🌿', 'thieu-nhi': '🏮'
};

interface HomeProps {
  setActiveTab: (tab: string) => void;
  setSelectedProduct: (p: Product) => void;
  setSelectedStore: (b: Store) => void;
  onAddToCart: (p: Product) => void;
  wishlistIds: string[];
  onToggleWishlist: (productId: string) => void;
  onOpenAI: () => void;
}

export default function Home({
  setActiveTab,
  setSelectedProduct,
  setSelectedStore,
  onAddToCart,
  wishlistIds,
  onToggleWishlist,
  onOpenAI
}: HomeProps) {
  const { stores, products, categories, source, error, reload, findStore } = useCatalog();

  // Flash sale countdown timer (e.g. 12 hours left)
  const [timeLeft, setTimeLeft] = useState({ hours: 11, minutes: 45, seconds: 30 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 12, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const flashSaleProducts = PRODUCTS.filter(p => p.isFlashSale);
  const bestSellers = PRODUCTS.filter(p => p.isBestSeller);

  // Smooth scroll helper to stores section
  const handleScrollToStores = () => {
    const el = document.getElementById('stores-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSelectStore = (store: Store) => {
    setSelectedStore(store);
    setActiveTab('store-detail');
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setActiveTab('detail');
  };

  return (
    <div className="space-y-12 pb-16">
      {/* 1. Hero Banner: Multi-Vendor Focus with Authentic Festive Banquet Visual */}
      <HeroBanner
        onExploreStores={handleScrollToStores}
        onExploreProducts={() => setActiveTab('products')}
        onOpenAI={onOpenAI}
      />

      {/* 2. Core Section: Multi-vendor Partner Stores Directory (Store Cards + Filters) */}
      {source === 'mock' && error && (
        <div className="mss-container">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm rounded-xl px-4 py-3">
            <span>{error} Đang hiển thị dữ liệu gian hàng mẫu.</span>
            <button onClick={reload} className="font-bold text-primary-700 hover:underline shrink-0">Thử lại</button>
          </div>
        </div>
      )}
      <StoreSection
        stores={stores}
        products={products}
        loading={source === 'loading'}
        onSelectStore={handleSelectStore}
        onSelectProduct={handleSelectProduct}
        onViewAllStores={() => setActiveTab('stores')}
      />

      {/* 3. Flash Sale Section across stores */}
      {source === 'mock' && <div className="mss-container">
        <div className="bg-gradient-to-r from-primary-900 via-accent-900 to-primary-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-accent-400/30">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-accent-400 text-primary-950 rounded-2xl shadow-lg">
                <Flame className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs text-accent-300 font-bold uppercase tracking-wider">
                  <span>⚡ Ưu Đãi Giới Hạn Toàn Sàn</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white">Giờ Vàng Săn Deal - Flash Sale</h2>
                <p className="text-accent-200 text-xs sm:text-sm">Trợ giá độc quyền từ các gian hàng chính hãng</p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-2xl text-accent-300 font-mono text-sm font-bold border border-accent-400/20 backdrop-blur-sm">
              <Clock className="w-4 h-4 text-accent-400" />
              <span>{String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {flashSaleProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white text-gray-900 rounded-2xl overflow-hidden shadow-lg border border-accent-200/60 flex flex-col group hover:shadow-2xl transition duration-300"
              >
                <div
                  className="relative overflow-hidden cursor-pointer"
                  onClick={() => handleSelectProduct(product)}
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full aspect-square object-cover group-hover:scale-105 transition duration-500"
                  />
                  <span className="absolute top-2 left-2 bg-red-600 text-white text-xs font-black px-2.5 py-1 rounded-lg shadow-md">
                    GIẢM {Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)}%
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleWishlist(product.id); }}
                    className={`absolute top-2 right-2 p-2 rounded-full backdrop-blur-md transition ${wishlistIds.includes(product.id) ? 'bg-red-600 text-white' : 'bg-white/80 text-gray-700 hover:bg-white'
                      }`}
                  >
                    <Heart className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        const foundStore = findStore(product.storeId);
                        if (foundStore) handleSelectStore(foundStore);
                      }}
                      className="text-xs text-accent-800 font-bold hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <StoreIcon className="w-3 h-3 text-accent-700" />
                      <span>{product.storeName}</span>
                    </span>

                    <h3
                      onClick={() => handleSelectProduct(product)}
                      className="font-bold text-gray-900 text-sm line-clamp-2 hover:text-primary-700 cursor-pointer transition mt-1"
                    >
                      {product.name}
                    </h3>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-xs text-accent-600 mb-2">
                      <Star className="w-3.5 h-3.5 fill-current text-accent-500" />
                      <span className="font-bold text-gray-800">{product.rating}</span>
                      <span className="text-gray-400">({product.reviewCount})</span>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-primary-700 font-black text-base">{product.price.toLocaleString()}đ</span>
                        {product.originalPrice && (
                          <span className="text-gray-400 text-xs line-through ml-2">{product.originalPrice.toLocaleString()}đ</span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => onAddToCart(product)}
                      className="w-full mt-3 py-2.5 bg-primary-700 hover:bg-primary-800 text-white text-xs font-bold rounded-xl shadow transition flex items-center justify-center gap-2 active:scale-95"
                    >
                      <span>Thêm Vào Giỏ</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>}

      {/* 4. Category / Flavor Navigation (Explore by Taste) */}
      <div className="mss-container">
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs text-accent-800 font-bold uppercase tracking-wider mb-1">
              <Layers className="w-3.5 h-3.5 text-accent-700" />
              <span>Đa Dạng Hương Vị</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Danh Mục & Phân Loại Bánh</h2>
            <p className="text-gray-500 text-xs sm:text-sm mt-0.5">Khám phá dòng bánh phù hợp khẩu vị của bạn và gia đình</p>
          </div>

          <button
            onClick={() => setActiveTab('products')}
            className="text-xs sm:text-sm font-bold text-primary-700 hover:underline flex items-center gap-1"
          >
            <span>Xem tất cả ({products.length})</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              onClick={() => setActiveTab('products')}
              className="bg-white p-4 rounded-2xl border border-accent-200/60 shadow-sm hover:shadow-md hover:border-primary-700 text-center cursor-pointer transition group flex flex-col items-center"
            >
              <div className="w-12 h-12 bg-accent-50 text-primary-700 rounded-2xl flex items-center justify-center text-2xl mb-2 group-hover:bg-primary-700 group-hover:text-white transition">
                {CATEGORY_ICONS[cat.id] ?? '🥮'}
              </div>
              <h3 className="font-semibold text-gray-800 text-xs sm:text-sm group-hover:text-primary-700 transition">
                {cat.name}
              </h3>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Best Sellers Section */}
      {source === 'mock' && <div className="mss-container">
        <div className="flex justify-between items-end mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs text-accent-800 font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5 text-accent-600" />
              <span>Tuyển Chọn Mùa Trăng</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Bánh & Hộp Quà Bán Chạy Nhất</h2>
            <p className="text-gray-500 text-xs sm:text-sm mt-0.5">Được hàng nghìn khách hàng và doanh nghiệp tin chọn đặt trước</p>
          </div>
          <button
            onClick={() => setActiveTab('products')}
            className="text-primary-700 font-bold text-xs sm:text-sm hover:underline flex items-center gap-1"
          >
            <span>Xem tất cả</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {bestSellers.map((product) => (
            <div
              key={product.id}
              className="bg-white text-gray-900 rounded-2xl overflow-hidden shadow-sm border border-accent-200/60 flex flex-col group hover:shadow-xl hover:border-primary-700 transition duration-300"
            >
              <div
                className="relative overflow-hidden cursor-pointer"
                onClick={() => handleSelectProduct(product)}
              >
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full aspect-square object-cover group-hover:scale-105 transition duration-500"
                />
                <span className="absolute top-2 left-2 bg-accent-500 text-primary-950 text-xs font-black px-2.5 py-1 rounded-lg shadow">
                  BÁN CHẠY
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleWishlist(product.id); }}
                  className={`absolute top-2 right-2 p-2 rounded-full backdrop-blur-md transition ${wishlistIds.includes(product.id) ? 'bg-red-600 text-white' : 'bg-white/80 text-gray-700 hover:bg-white'
                    }`}
                >
                  <Heart className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      const foundStore = findStore(product.storeId);
                      if (foundStore) handleSelectStore(foundStore);
                    }}
                    className="text-xs text-accent-800 font-bold hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <StoreIcon className="w-3 h-3 text-accent-700" />
                    <span>{product.storeName}</span>
                  </span>

                  <h3
                    onClick={() => handleSelectProduct(product)}
                    className="font-bold text-gray-900 text-sm line-clamp-2 hover:text-primary-700 cursor-pointer transition mt-1"
                  >
                    {product.name}
                  </h3>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-xs text-accent-600 mb-2">
                    <Star className="w-3.5 h-3.5 fill-current text-accent-500" />
                    <span className="font-bold text-gray-800">{product.rating}</span>
                    <span className="text-gray-400">({product.reviewCount} đánh giá)</span>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-primary-700 font-black text-lg">{product.price.toLocaleString()}đ</span>
                      {product.originalPrice && (
                        <span className="text-gray-400 text-xs line-through ml-2">{product.originalPrice.toLocaleString()}đ</span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => onAddToCart(product)}
                    className="w-full mt-4 py-2.5 bg-primary-700 hover:bg-primary-800 text-white text-xs font-bold rounded-xl shadow transition flex items-center justify-center gap-2 active:scale-95"
                  >
                    <span>Thêm Vào Giỏ Hàng</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>}

      {/* 6. Festive Blog & Cultural Guides */}
      <div className="mss-container">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 text-xs text-accent-800 font-bold uppercase tracking-wider mb-1">
            <span>🏮 Văn Hóa Dân Tộc</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Góc Văn Hóa & Bí Quyết Thưởng Trăng</h2>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5">Cẩm nang chọn quà biếu, pha trà và tìm hiểu truyền thống tết trung thu</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FESTIVE_BLOGS.map((blog) => (
            <div key={blog.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-accent-200/60 group hover:shadow-xl transition">
              <div className="relative overflow-hidden h-48">
                <img src={blog.image} alt={blog.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                <span className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-3 py-1 rounded-md backdrop-blur-sm">
                  {blog.readTime}
                </span>
              </div>
              <div className="p-5 space-y-2">
                <span className="text-xs text-accent-700 font-semibold">{blog.date}</span>
                <h3 className="font-bold text-gray-900 text-sm sm:text-base leading-snug group-hover:text-primary-700 transition">
                  {blog.title}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 leading-relaxed">{blog.excerpt}</p>
                <button className="text-primary-700 text-xs sm:text-sm font-bold pt-2 flex items-center gap-1 hover:underline">
                  <span>Đọc bài viết</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
