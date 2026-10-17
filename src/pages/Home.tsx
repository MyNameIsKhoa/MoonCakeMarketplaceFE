import React, { useState, useEffect } from 'react';
import { Sparkles, Star, ArrowRight, ShieldCheck, Gift, Clock, Flame, Cookie, Leaf, ChevronRight, Heart } from 'lucide-react';
import { Product, Brand } from '../types';
import { PRODUCTS, BRANDS, CATEGORIES, FESTIVE_BLOGS } from '../data/mockData';

interface HomeProps {
  setActiveTab: (tab: string) => void;
  setSelectedProduct: (p: Product) => void;
  setSelectedBrand: (b: Brand) => void;
  onAddToCart: (p: Product) => void;
  wishlistIds: string[];
  onToggleWishlist: (productId: string) => void;
  onOpenAI: () => void;
}

export default function Home({
  setActiveTab,
  setSelectedProduct,
  setSelectedBrand,
  onAddToCart,
  wishlistIds,
  onToggleWishlist,
  onOpenAI
}: HomeProps) {
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

  return (
    <div className="space-y-12 pb-12">
      {/* Hero Banner Section */}
      <div className="bg-gradient-to-r from-primary-950 via-primary-900 to-accent-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(var(--color-accent-300)_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="mss-container py-12 md:py-12 relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 bg-accent-400/20 border border-accent-400/40 text-accent-300 px-4 py-2 rounded-full text-sm font-semibold backdrop-blur-sm">
              <Sparkles className="w-4 h-4 text-accent-400 animate-spin" />
              <span>Mùa Trăng Viên Mãn 2026 • Sàn Chính Hãng</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold leading-tight">
              Tinh Hoa Bánh Trung Thu <span className="text-accent-400">Chính Hãng</span>
            </h1>
            <p className="text-gray-200 text-sm md:text-base leading-relaxed">
              Kết nối trực tiếp với các thương hiệu danh tiếng: Kinh Đô, Như Lan, Madame Hương, Brodard, Givral. Hộp quà biếu cao cấp, giao hàng hỏa tốc tận nhà.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <button
                onClick={() => setActiveTab('products')}
                className="px-6 py-4 bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 text-primary-950 font-bold rounded-xl shadow-xl flex items-center gap-2 transition transform active:scale-95"
              >
                <span>Khám Phá Sưu Tập 2026</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={onOpenAI}
                className="px-6 py-4 bg-white/10 hover:bg-white/20 text-white border border-white/30 font-semibold rounded-xl backdrop-blur-sm flex items-center gap-2 transition"
              >
                <Sparkles className="w-5 h-5 text-accent-300" />
                <span>AI Tư Vấn Quà Biếu</span>
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="relative mx-auto max-w-md rounded-2xl overflow-hidden shadow-2xl border-4 border-accent-500/40">
              <img
                src="https://images.unsplash.com/photo-1549488344-cbb6c34cf08b?auto=format&fit=crop&q=80&w=800"
                alt="Hộp Quà Trung Thu Cao Cấp"
                className="w-full h-80 md:h-96 object-cover transform hover:scale-105 transition duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex flex-col justify-end p-6">
                <span className="text-accent-300 text-sm font-bold uppercase tracking-wider">Bộ Sưu Tập Độc Quyền</span>
                <h3 className="text-white text-xl font-bold mt-1">Trăng Vàng Hoàng Kim 2026</h3>
                <p className="text-gray-300 text-sm mt-1">Ưu đãi giảm đến 15% + Miễn phí thiệp chúc mừng</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Pills Grid */}
      <div className="mss-container">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Danh Mục Bánh & Hộp Quà</h2>
          <p className="text-gray-500 text-sm mt-1">Lựa chọn hương vị yêu thích cho mùa đoàn viên</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {CATEGORIES.map((cat) => (
            <div
              key={cat.id}
              onClick={() => setActiveTab('products')}
              className="bg-white p-5 rounded-2xl border border-accent-200/60 shadow-sm hover:shadow-md hover:border-primary-700 text-center cursor-pointer transition group flex flex-col items-center"
            >
              <div className="w-14 h-14 bg-accent-50 text-primary-700 rounded-2xl flex items-center justify-center text-2xl mb-3 group-hover:bg-primary-700 group-hover:text-white transition">
                {cat.id === 'truyen-thong' && '🥮'}
                {cat.id === 'cao-cap' && '🎁'}
                {cat.id === 'hiện-đại' && '🔥'}
                {cat.id === 'chay' && '🌿'}
                {cat.id === 'thieu-nhi' && '🏮'}
                {cat.id === 'all' && '✨'}
              </div>
              <h3 className="font-semibold text-gray-800 text-sm group-hover:text-primary-700 transition">{cat.name}</h3>
            </div>
          ))}
        </div>
      </div>

      {/* Flash Sale Section */}
      <div className="mss-container">
        <div className="bg-gradient-to-r from-primary-800 to-accent-700 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-accent-400 text-primary-900 rounded-xl">
                <Flame className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Giờ Vàng Săn Deal - Flash Sale</h2>
                <p className="text-accent-200 text-sm">Giá tốt nhất mùa trăng, số lượng có hạn</p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-black/30 px-4 py-2 rounded-xl text-accent-300 font-mono text-sm font-bold">
              <Clock className="w-4 h-4" />
              <span>{String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {flashSaleProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white text-gray-900 rounded-xl overflow-hidden shadow-lg border border-accent-200/60 flex flex-col group hover:shadow-2xl transition"
              >
                <div className="relative overflow-hidden cursor-pointer" onClick={() => { setSelectedProduct(product); setActiveTab('detail'); }}>
                  <img src={product.image} alt={product.name} className="w-full aspect-square object-cover group-hover:scale-105 transition duration-500" />
                  <span className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-md shadow">
                    GIẢM {Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)}%
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleWishlist(product.id); }}
                    className={`absolute top-2 right-2 p-2 rounded-full backdrop-blur-sm transition ${
                      wishlistIds.includes(product.id) ? 'bg-red-600 text-white' : 'bg-white/80 text-gray-700 hover:bg-white'
                    }`}
                  >
                    <Heart className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-xs text-accent-700 font-semibold">{product.brandName}</span>
                    <h3 
                      onClick={() => { setSelectedProduct(product); setActiveTab('detail'); }}
                      className="font-bold text-gray-900 text-sm line-clamp-2 hover:text-primary-700 cursor-pointer transition mt-1"
                    >
                      {product.name}
                    </h3>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-sm text-accent-500 mb-2">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span className="font-bold text-gray-700">{product.rating}</span>
                      <span className="text-gray-500">({product.reviewCount})</span>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-primary-700 font-bold text-base">{product.price.toLocaleString()}đ</span>
                        {product.originalPrice && (
                          <span className="text-gray-500 text-sm line-through ml-2">{product.originalPrice.toLocaleString()}đ</span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => onAddToCart(product)}
                      className="w-full mt-3 py-2 bg-primary-700 hover:bg-primary-800 text-white text-sm font-semibold rounded-lg shadow transition flex items-center justify-center gap-2"
                    >
                      <span>Thêm Vào Giỏ</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Brands Official Stores Grid */}
      <div className="mss-container">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Thương Hiệu & Gian Hàng Chính Hãng</h2>
            <p className="text-gray-500 text-sm mt-1">Đảm bảo 100% chính hãng từ các nhà sản xuất bánh kẹo hàng đầu</p>
          </div>
          <button 
            onClick={() => setActiveTab('brands')}
            className="text-primary-700 font-semibold text-sm hover:underline flex items-center gap-1"
          >
            <span>Xem tất cả</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {BRANDS.map((brand) => (
            <div
              key={brand.id}
              onClick={() => { setSelectedBrand(brand); setActiveTab('brand-store'); }}
              className="bg-white border border-accent-200/70 rounded-2xl p-5 shadow-sm hover:shadow-lg hover:border-primary-700 cursor-pointer transition text-center group"
            >
              <img src={brand.logo} alt={brand.name} className="w-16 h-16 object-cover rounded-2xl mx-auto mb-3 shadow border border-accent-100 group-hover:scale-105 transition" />
              <h3 className="font-bold text-gray-900 text-sm group-hover:text-primary-700 transition truncate">{brand.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{brand.productCount} sản phẩm</p>
              
              <div className="mt-3 inline-flex items-center gap-1 bg-accent-50 text-accent-800 text-xs font-semibold px-3 py-1 rounded-full">
                <Star className="w-3 h-3 fill-current text-accent-500" />
                <span>{brand.rating}</span>
                <span className="text-gray-500">({brand.responseRate})</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Best Sellers Section */}
      <div className="mss-container">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Sản Phẩm Bán Chạy Nhất</h2>
            <p className="text-gray-500 text-sm mt-1">Được hàng nghìn khách hàng và doanh nghiệp tin chọn mùa trăng này</p>
          </div>
          <button 
            onClick={() => setActiveTab('products')}
            className="text-primary-700 font-semibold text-sm hover:underline flex items-center gap-1"
          >
            <span>Xem tất cả</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {bestSellers.map((product) => (
            <div
              key={product.id}
              className="bg-white text-gray-900 rounded-2xl overflow-hidden shadow-md border border-accent-200/60 flex flex-col group hover:shadow-xl hover:border-primary-700 transition"
            >
              <div className="relative overflow-hidden cursor-pointer" onClick={() => { setSelectedProduct(product); setActiveTab('detail'); }}>
                <img src={product.image} alt={product.name} className="w-full aspect-square object-cover group-hover:scale-105 transition duration-500" />
                <span className="absolute top-2 left-2 bg-accent-500 text-primary-950 text-xs font-bold px-3 py-1 rounded-md shadow">
                  BÁN CHẠY
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleWishlist(product.id); }}
                  className={`absolute top-2 right-2 p-2 rounded-full backdrop-blur-sm transition ${
                    wishlistIds.includes(product.id) ? 'bg-red-600 text-white' : 'bg-white/80 text-gray-700 hover:bg-white'
                  }`}
                >
                  <Heart className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <span className="text-sm text-accent-700 font-semibold">{product.brandName}</span>
                  <h3 
                    onClick={() => { setSelectedProduct(product); setActiveTab('detail'); }}
                    className="font-bold text-gray-900 text-sm line-clamp-2 hover:text-primary-700 cursor-pointer transition mt-1"
                  >
                    {product.name}
                  </h3>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-sm text-accent-500 mb-2">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span className="font-bold text-gray-700">{product.rating}</span>
                    <span className="text-gray-500">({product.reviewCount} đánh giá)</span>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-primary-700 font-bold text-lg">{product.price.toLocaleString()}đ</span>
                      {product.originalPrice && (
                        <span className="text-gray-500 text-sm line-through ml-2">{product.originalPrice.toLocaleString()}đ</span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => onAddToCart(product)}
                    className="w-full mt-4 py-3 bg-primary-700 hover:bg-primary-800 text-white text-sm font-semibold rounded-xl shadow transition flex items-center justify-center gap-2"
                  >
                    <span>Thêm Vào Giỏ Hàng</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Festive Blog & Cultural Guides */}
      <div className="mss-container">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Góc Văn Hóa & Bí Quyết Thưởng Trăng</h2>
          <p className="text-gray-500 text-sm mt-1">Cẩm nang chọn quà biếu, pha trà và tìm hiểu truyền thống tết trung thu</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FESTIVE_BLOGS.map((blog) => (
            <div key={blog.id} className="bg-white rounded-2xl overflow-hidden shadow-md border border-accent-200/60 group hover:shadow-xl transition">
              <div className="relative overflow-hidden h-48">
                <img src={blog.image} alt={blog.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                <span className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-3 py-1 rounded-md backdrop-blur-sm">
                  {blog.readTime}
                </span>
              </div>
              <div className="p-5 space-y-2">
                <span className="text-sm text-accent-700 font-medium">{blog.date}</span>
                <h3 className="font-bold text-gray-900 text-base leading-snug group-hover:text-primary-700 transition">
                  {blog.title}
                </h3>
                <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">{blog.excerpt}</p>
                <button className="text-primary-700 text-sm font-bold pt-2 flex items-center gap-1 hover:underline">
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
