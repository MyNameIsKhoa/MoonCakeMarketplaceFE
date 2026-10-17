import React from 'react';
import { Star, ShieldCheck, Tag, ShoppingBag, Heart, ChevronRight } from 'lucide-react';
import { Brand, Product } from '../types';
import { PRODUCTS, PROMOTIONS } from '../data/mockData';
import { formatDate } from '../utils/format';
import { PROMOTION_RULE, getStatusMeta } from '../utils/status';

interface BrandStoreProps {
  brand: Brand;
  setSelectedProduct: (p: Product) => void;
  setActiveTab: (tab: string) => void;
  onAddToCart: (p: Product) => void;
  wishlistIds: string[];
  onToggleWishlist: (productId: string) => void;
}

export default function BrandStore({
  brand,
  setSelectedProduct,
  setActiveTab,
  onAddToCart,
  wishlistIds,
  onToggleWishlist
}: BrandStoreProps) {
  const brandProducts = PRODUCTS.filter(p => p.brandId === brand.id);
  const storePromotions = PROMOTIONS.filter(p => p.storeId === brand.id && p.status === 'ACTIVE');

  return (
    <div className="space-y-8 pb-12">
      {/* Brand Banner */}
      <div className="relative bg-primary-950 text-white">
        <div className="h-48 md:h-64 w-full overflow-hidden relative">
          <img src={brand.banner} alt={brand.name} className="w-full h-full object-cover opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-t from-primary-950 via-primary-950/40 to-transparent"></div>
        </div>

        <div className="mss-container relative -mt-16 pb-6">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
            <img src={brand.logo} alt={brand.name} className="w-28 h-28 rounded-2xl object-cover border-4 border-white shadow-xl bg-white" />
            <div className="flex-1 text-center md:text-left space-y-2">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <h1 className="text-2xl md:text-3xl font-bold">{brand.name}</h1>
                <span className="bg-accent-400 text-primary-950 text-sm font-bold px-3 py-1 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Chính Hãng 100%</span>
                </span>
              </div>
              <p className="text-gray-300 text-sm md:text-sm max-w-2xl">{brand.description}</p>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-accent-300 pt-1">
                <span>⭐ Đánh giá: {brand.rating} / 5.0</span>
                <span>•</span>
                <span>📦 {brand.productCount} sản phẩm</span>
                <span>•</span>
                <span>💬 Tỷ lệ phản hồi: {brand.responseRate}</span>
                <span>•</span>
                <span>🏛️ Thành lập: {brand.joinedYear}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Store promotions (promotion + promotion_rule), applied automatically at checkout */}
      {storePromotions.length > 0 && (
        <section className="mss-container mss-section">
          <h2 className="mss-section-title flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary-700" />
            Khuyến mãi của gian hàng
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {storePromotions.map((promo) => (
              <div key={promo.promotionId} className="mss-card flex flex-col gap-2">
                <h3 className="font-semibold text-gray-900">{promo.name}</h3>
                <div className="flex flex-wrap gap-2">
                  {promo.rules.map((rule) => (
                    <span key={rule.promotionRuleId} className="mss-badge mss-badge--info">
                      {getStatusMeta(PROMOTION_RULE, rule.ruleType).label}
                      {rule.minQuantity ? ` · từ ${rule.minQuantity} sản phẩm` : ''}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-gray-500">
                  Hiệu lực {formatDate(promo.startAt)} – {formatDate(promo.endAt)} · Tự động áp dụng khi thanh toán
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Products Grid */}
      <div className="mss-container">
        <h3 className="font-bold text-gray-900 text-lg mb-6 border-b border-gray-200 pb-3">Sản Phẩm Của {brand.name}</h3>

        {brandProducts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
            <p className="text-gray-500 text-sm">Đang cập nhật sản phẩm mới cho mùa trung thu 2026.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {brandProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-2xl overflow-hidden shadow-md border border-accent-200/60 flex flex-col group hover:shadow-xl hover:border-primary-700 transition"
              >
                <div className="relative overflow-hidden cursor-pointer" onClick={() => { setSelectedProduct(product); setActiveTab('detail'); }}>
                  <img src={product.image} alt={product.name} className="w-full aspect-square object-cover group-hover:scale-105 transition duration-500" />
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
                    <h3
                      onClick={() => { setSelectedProduct(product); setActiveTab('detail'); }}
                      className="font-bold text-gray-900 text-sm line-clamp-2 hover:text-primary-700 cursor-pointer transition"
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
                      <span className="text-primary-700 font-bold text-base">{product.price.toLocaleString()}đ</span>
                    </div>

                    <button
                      onClick={() => onAddToCart(product)}
                      className="w-full mt-3 py-3 bg-primary-700 hover:bg-primary-800 text-white text-sm font-semibold rounded-xl shadow transition flex items-center justify-center gap-2"
                    >
                      <span>Thêm Vào Giỏ</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
