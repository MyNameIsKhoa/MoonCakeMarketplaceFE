import React, { useState, useMemo, useEffect } from 'react';
import {
  Star, ShieldCheck, Tag, ShoppingBag, Heart, ChevronRight,
  ArrowLeft, Search, Filter, Phone, MapPin, Store as StoreIcon, Clock
} from 'lucide-react';
import { Store, Product, Promotion, StoreBranch } from '../types';
import { PRODUCTS, PROMOTIONS } from '../data/mockData';
import { useCatalog } from '../context/CatalogContext';
import { catalogApi, isApiId, toProduct, toPromotion, toStoreBranch } from '../services/api';
import { formatDate } from '../utils/format';
import { PROMOTION_RULE, getStatusMeta } from '../utils/status';

/** Category tabs of the mock stores (mock product.category values). */
const MOCK_CATEGORY_TABS = [
  { id: 'truyen-thong', name: 'Bánh Truyền Thống' },
  { id: 'cao-cap', name: 'Hộp Quà Cao Cấp' },
  { id: 'hiện-đại', name: 'Lava & Hiện Đại' },
  { id: 'chay', name: 'Ăn Kiêng / Chay' }
];

/** Backend PageQuery.MAX_SIZE. */
const PAGE_SIZE = 100;

interface LiveStoreData {
  products: Product[];
  promotions: Promotion[];
  branches: StoreBranch[];
}

interface StoreDetailProps {
  store: Store;
  setSelectedProduct: (p: Product) => void;
  setActiveTab: (tab: string) => void;
  onAddToCart: (p: Product) => void;
  wishlistIds: string[];
  onToggleWishlist: (productId: string) => void;
}

export default function StoreDetail({
  store,
  setSelectedProduct,
  setActiveTab,
  onAddToCart,
  wishlistIds,
  onToggleWishlist
}: StoreDetailProps) {
  const [internalSearch, setInternalSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc'>('default');

  // Stores from the API Gateway have numeric IDs; mock stores keep reading data/mockData.
  const isLive = isApiId(store.storeId);
  const { categories } = useCatalog();
  const [live, setLive] = useState<LiveStoreData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!isLive) return;
    let cancelled = false;
    const storeId = Number(store.storeId);
    setLoadError(null);
    setLive(null);
    // Promotions and branches are extras: a failure there should not hide the menu.
    Promise.allSettled([
      catalogApi.products.all({ storeId }),
      catalogApi.promotions.list({ storeId, size: PAGE_SIZE }),
      catalogApi.storeBranches.list(storeId),
      catalogApi.categories.all()
    ]).then(([productsResult, promotionsResult, branchesResult, categoriesResult]) => {
      if (cancelled) return;
      if (productsResult.status === 'rejected') {
        setLoadError(productsResult.reason instanceof Error ? productsResult.reason.message : 'Không tải được sản phẩm.');
        return;
      }
      const storesById = new Map([[store.storeId, store]]);
      const categorySlugById = new Map(
        (categoriesResult.status === 'fulfilled' ? categoriesResult.value : []).map((c) => [c.categoryId, c.slug])
      );
      setLive({
        products: productsResult.value
          .filter((p) => p.minPrice !== null)
          .map((p) => toProduct(p, storesById, categorySlugById)),
        promotions: promotionsResult.status === 'fulfilled' ? promotionsResult.value.items.map(toPromotion) : [],
        branches: branchesResult.status === 'fulfilled' ? branchesResult.value.map(toStoreBranch) : []
      });
    });
    return () => {
      cancelled = true;
    };
  }, [isLive, store, reloadKey]);

  const loading = isLive && !live && !loadError;
  const storeProducts = useMemo(
    () => (isLive ? live?.products ?? [] : PRODUCTS.filter(p => p.storeId === store.storeId)),
    [isLive, live, store.storeId]
  );
  const storePromotions = (isLive ? live?.promotions ?? [] : PROMOTIONS.filter(p => p.storeId === store.storeId))
    .filter(p => p.status === 'ACTIVE');
  const storeBranches = isLive ? live?.branches ?? [] : store.branches ?? [];

  const categoryTabs = useMemo(() => {
    if (!isLive) return MOCK_CATEGORY_TABS;
    const slugs = new Set(storeProducts.map(p => p.category).filter(Boolean));
    return categories.filter(c => slugs.has(c.id));
  }, [isLive, storeProducts, categories]);

  // Filter products belonging to this store
  const filteredProducts = useMemo(() => {
    let list = storeProducts;

    // Internal search
    if (internalSearch.trim()) {
      const q = internalSearch.toLowerCase();
      list = list.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.flavor.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      list = list.filter(p => p.category === selectedCategory);
    }

    // Sorting
    if (sortBy === 'price-asc') {
      list = [...list].sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      list = [...list].sort((a, b) => b.price - a.price);
    }

    return list;
  }, [storeProducts, internalSearch, selectedCategory, sortBy]);

  return (
    <div className="space-y-8 pb-16">
      {/* Top Breadcrumb & Back Bar */}
      <div className="bg-primary-950/95 text-white/80 py-2.5 border-b border-white/10">
        <div className="mss-container flex items-center justify-between text-xs">
          <button
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-1.5 text-accent-300 hover:text-white font-semibold transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại trang chủ / Sàn gian hàng</span>
          </button>

          <div className="flex items-center gap-2 text-gray-300">
            <span>Sàn Đa Gian Hàng</span>
            <span>/</span>
            <span className="text-white font-bold">{store.name}</span>
          </div>
        </div>
      </div>

      {/* Store Header & Hero Presentation */}
      <div className="relative bg-primary-950 text-white">
        <div className="h-52 md:h-72 w-full overflow-hidden relative">
          <img 
            src={store.bannerUrl} 
            alt={store.name} 
            className="w-full h-full object-cover opacity-50" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary-950 via-primary-950/50 to-transparent"></div>
        </div>

        <div className="mss-container relative -mt-20 pb-6">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
            <div className="relative">
              <img 
                src={store.logoUrl} 
                alt={store.name} 
                className="w-28 h-28 md:w-32 md:h-32 rounded-2xl object-contain p-1.5 border-4 border-white shadow-2xl bg-white" 
              />
              <span className="absolute bottom-2 right-2 w-4 h-4 rounded-full bg-green-500 border-2 border-white" title="Gian hàng chính hãng hoạt động"></span>
            </div>

            <div className="flex-1 text-center md:text-left space-y-2">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <h1 className="text-2xl md:text-3xl font-black">{store.name}</h1>
                <span className="bg-accent-400 text-primary-950 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Gian Hàng Chính Hãng 100%</span>
                </span>
              </div>

              <p className="text-gray-300 text-xs md:text-sm max-w-2xl leading-relaxed">
                {store.description}
              </p>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 sm:gap-5 text-xs text-accent-300 pt-1">
                {store.categoryLabel && (
                  <span>🏷️ <strong className="text-white">{store.categoryLabel}</strong></span>
                )}
                {store.location && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-accent-400" />
                      <span>{store.location}</span>
                    </span>
                  </>
                )}
                {store.priceRange && (
                  <>
                    <span>•</span>
                    <span>Khoảng giá: <strong className="text-white">{store.priceRange}</strong></span>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2">
              <a
                href="tel:19001509"
                className="w-full sm:w-auto px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 transition flex items-center justify-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5 text-accent-300" />
                <span>Liên hệ shop</span>
              </a>
              <button
                onClick={() => {
                  const el = document.getElementById('store-products-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-accent-400 hover:bg-accent-500 text-primary-950 rounded-xl text-xs font-black shadow-lg transition flex items-center justify-center gap-1.5"
              >
                <span>Xem menu bánh ({filteredProducts.length})</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Store Promotions */}
      {storePromotions.length > 0 && (
        <section className="mss-container">
          <div className="bg-accent-50/80 border border-accent-200/80 rounded-2xl p-4 sm:p-5">
            <h2 className="text-sm font-bold text-primary-900 flex items-center gap-1.5 mb-3">
              <Tag className="w-4 h-4 text-primary-700" />
              <span>Chương Trình Khuyến Mãi Đang Áp Dụng Của {store.name}</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {storePromotions.map((promo) => (
                <div key={promo.promotionId} className="bg-white p-3.5 rounded-xl border border-accent-200/60 shadow-sm space-y-1.5">
                  <h3 className="font-bold text-xs sm:text-sm text-gray-900">{promo.name}</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {promo.rules.map((rule) => (
                      <span key={rule.promotionRuleId} className="bg-red-50 text-red-700 border border-red-200 text-[11px] font-bold px-2 py-0.5 rounded-md">
                        {getStatusMeta(PROMOTION_RULE, rule.ruleType).label}
                        {rule.minQuantity ? ` · từ ${rule.minQuantity} bánh` : ''}
                      </span>
                    ))}
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Áp dụng từ {formatDate(promo.startAt)} đến {formatDate(promo.endAt)} · Tự động trừ tiền khi thanh toán
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Store Branches */}
      {storeBranches.length > 0 && (
        <section className="mss-container">
          <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-sm">
            <h2 className="text-sm font-bold text-primary-900 flex items-center gap-1.5 mb-3">
              <StoreIcon className="w-4 h-4 text-primary-700" />
              <span>Hệ Thống Chi Nhánh ({storeBranches.length})</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {storeBranches.map((branch) => (
                <div key={branch.branchId} className="p-3.5 rounded-xl border border-gray-200 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-xs sm:text-sm text-gray-900">{branch.name}</h3>
                    {branch.primary && (
                      <span className="bg-accent-100 text-primary-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
                        Chi nhánh chính
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] sm:text-xs text-gray-600 flex items-start gap-1">
                    <MapPin className="w-3 h-3 mt-0.5 shrink-0 text-primary-600" />
                    <span>{[branch.addressLine, branch.ward, branch.district, branch.city].filter(Boolean).join(', ')}</span>
                  </p>
                  {branch.phone && (
                    <a href={`tel:${branch.phone.replace(/\s/g, '')}`} className="text-[11px] sm:text-xs text-gray-600 hover:text-primary-700 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-primary-600" />
                      <span>{branch.phone}</span>
                    </a>
                  )}
                  {branch.openingHours && (
                    <p className="text-[11px] sm:text-xs text-gray-600 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-primary-600" />
                      <span>{branch.openingHours}</span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Internal Store Filter & Products Directory */}
      <section id="store-products-section" className="mss-container space-y-6 scroll-mt-24">
        {/* Filter controls */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Category tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  selectedCategory === 'all'
                    ? 'bg-primary-700 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Tất cả ({storeProducts.length})
              </button>
              {categoryTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCategory(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                    selectedCategory === tab.id
                      ? 'bg-primary-700 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </div>

            {/* Internal Search & Sort */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-56">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={internalSearch}
                  onChange={(e) => setInternalSearch(e.target.value)}
                  placeholder="Tìm bánh trong shop..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-700 focus:bg-white"
                />
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-xs bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary-700"
              >
                <option value="default">Sắp xếp: Phổ biến</option>
                <option value="price-asc">Giá: Thấp đến cao</option>
                <option value="price-desc">Giá: Cao đến thấp</option>
              </select>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" aria-busy="true">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-80 rounded-2xl border border-accent-200/60 bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : loadError ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 space-y-3">
            <StoreIcon className="w-12 h-12 text-gray-300 mx-auto" />
            <h3 className="font-bold text-gray-800 text-sm">Không tải được menu của gian hàng</h3>
            <p className="text-xs text-gray-500">{loadError}</p>
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              className="text-xs font-bold text-primary-700 bg-primary-50 px-4 py-2 rounded-xl hover:bg-primary-100 transition"
            >
              Thử lại
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 space-y-3">
            <StoreIcon className="w-12 h-12 text-gray-300 mx-auto" />
            <h3 className="font-bold text-gray-800 text-sm">Không tìm thấy sản phẩm phù hợp trong gian hàng này</h3>
            <p className="text-xs text-gray-500">Vui lòng thử tìm từ khóa khác hoặc chọn danh mục khác.</p>
            <button
              onClick={() => {
                setInternalSearch('');
                setSelectedCategory('all');
                setSortBy('default');
              }}
              className="text-xs font-bold text-primary-700 bg-primary-50 px-4 py-2 rounded-xl hover:bg-primary-100 transition"
            >
              Xem tất cả sản phẩm của shop
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-accent-200/60 flex flex-col group hover:shadow-xl hover:border-primary-700 transition duration-300"
              >
                <div 
                  className="relative overflow-hidden cursor-pointer" 
                  onClick={() => { setSelectedProduct(product); setActiveTab('detail'); }}
                >
                  <img 
                    src={product.image} 
                    alt={product.name} 
                    className="w-full aspect-square object-cover group-hover:scale-105 transition duration-500" 
                  />
                  {product.originalPrice && (
                    <span className="absolute top-2 left-2 bg-red-600 text-white text-[11px] font-bold px-2 py-0.5 rounded shadow">
                      GIẢM {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
                    </span>
                  )}
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
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{product.flavor}</p>
                  </div>

                  <div>
                    {product.reviewCount > 0 && (
                      <div className="flex items-center gap-2 text-xs text-accent-600 mb-2">
                        <Star className="w-3.5 h-3.5 fill-current text-accent-500" />
                        <span className="font-bold text-gray-800">{product.rating}</span>
                        <span className="text-gray-400">({product.reviewCount})</span>
                      </div>
                    )}

                    <div className="flex items-baseline justify-between">
                      <span className="text-primary-700 font-bold text-base">{product.price.toLocaleString()}đ</span>
                      {product.originalPrice && (
                        <span className="text-gray-400 text-xs line-through">{product.originalPrice.toLocaleString()}đ</span>
                      )}
                    </div>

                    <button
                      onClick={() => onAddToCart(product)}
                      className="w-full mt-3 py-2.5 bg-primary-700 hover:bg-primary-800 text-white text-xs font-bold rounded-xl shadow transition flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Thêm Vào Giỏ</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
