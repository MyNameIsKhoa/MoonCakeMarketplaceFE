import React from 'react';
import { ChevronRight, Layers } from 'lucide-react';
import { Product, Store } from '../types';
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
  onOpenAI
}: HomeProps) {
  const { stores, products, categories, source } = useCatalog();

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
      <StoreSection
        stores={stores}
        products={products}
        loading={source === 'loading'}
        onSelectStore={handleSelectStore}
        onSelectProduct={handleSelectProduct}
        onViewAllStores={() => setActiveTab('stores')}
      />

      {/* 3. Category / Flavor Navigation (Explore by Taste) */}
      <div className="mss-container">
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs text-accent-800 font-bold uppercase tracking-wider mb-1">
              <Layers className="w-3.5 h-3.5 text-accent-700" />
              <span>Đa Dạng Hương Vị</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Danh Mục &amp; Phân Loại Bánh</h2>
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
    </div>
  );
}
