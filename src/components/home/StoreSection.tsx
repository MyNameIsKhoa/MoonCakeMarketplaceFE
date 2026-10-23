import React, { useState, useMemo } from 'react';
import { Store as StoreIcon, Sparkles, Building2, ShieldCheck, ArrowRight } from 'lucide-react';
import { Store, Product } from '../../types';
import { StoreCard } from './StoreCard';
import { StoreFilter, StoreCategoryKey } from './StoreFilter';

interface StoreSectionProps {
  stores: Store[];
  products: Product[];
  onSelectStore: (store: Store) => void;
  onSelectProduct: (product: Product) => void;
  onViewAllStores?: () => void;
  /** Stores are still being fetched from the API Gateway. */
  loading?: boolean;
}

export const StoreSection: React.FC<StoreSectionProps> = ({
  stores,
  products,
  loading = false,
  onSelectStore,
  onSelectProduct,
  onViewAllStores
}) => {
  const [activeCategory, setActiveCategory] = useState<StoreCategoryKey>('all');
  const [searchFilter, setSearchFilter] = useState('');

  // Map products by storeId
  const productsByStore = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const p of products) {
      if (!map.has(p.storeId)) {
        map.set(p.storeId, []);
      }
      map.get(p.storeId)!.push(p);
    }
    return map;
  }, [products]);

  // Filter stores
  const filteredStores = useMemo(() => {
    return stores.filter((store) => {
      // Category filter
      if (activeCategory !== 'all') {
        if (store.categoryType !== activeCategory) {
          return false;
        }
      }

      // Text search filter
      if (searchFilter.trim()) {
        const query = searchFilter.toLowerCase();
        const matchesName = store.name.toLowerCase().includes(query);
        const matchesDesc = store.description.toLowerCase().includes(query);
        const matchesCategory = store.categoryLabel?.toLowerCase().includes(query);
        const matchesTags = store.featuredTags?.some((t) => t.toLowerCase().includes(query));
        if (!matchesName && !matchesDesc && !matchesCategory && !matchesTags) {
          return false;
        }
      }

      return true;
    });
  }, [stores, activeCategory, searchFilter]);

  return (
    <section id="stores-section" className="mss-container space-y-6 scroll-mt-24">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 bg-accent-100 text-primary-900 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            <StoreIcon className="w-3.5 h-3.5 text-primary-700" />
            <span>Sàn Thương Mại Đa Gian Hàng</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
            Khám Phá Gian Hàng & Thương Hiệu Đối Tác
          </h2>
          <p className="text-gray-600 text-sm mt-1 max-w-2xl">
            Chọn gian hàng bạn yêu thích để xem đầy đủ menu bánh Trung Thu, chính sách khuyến mãi riêng và đặt mua trực tiếp từ nhà sản xuất.
          </p>
        </div>

        {onViewAllStores && (
          <button
            onClick={onViewAllStores}
            className="text-primary-700 hover:text-primary-800 text-sm font-bold flex items-center gap-1 hover:underline shrink-0"
          >
            <span>Tất cả thương hiệu</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Component */}
      <StoreFilter
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        searchFilter={searchFilter}
        onSearchChange={setSearchFilter}
        totalStores={filteredStores.length}
      />

      {/* Store Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-80 rounded-2xl border border-accent-200/60 bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : filteredStores.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 space-y-3">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto" />
          <h3 className="text-base font-bold text-gray-800">Không tìm thấy gian hàng phù hợp</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Vui lòng thử tìm với từ khóa khác hoặc chọn xem "Tất Cả Gian Hàng".
          </p>
          <button
            onClick={() => {
              setActiveCategory('all');
              setSearchFilter('');
            }}
            className="mt-2 text-xs font-bold text-primary-700 bg-primary-50 px-4 py-2 rounded-xl hover:bg-primary-100 transition"
          >
            Đặt lại bộ lọc
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStores.map((store) => (
            <StoreCard
              key={store.storeId}
              store={store}
              onSelectStore={onSelectStore}
              storeProducts={productsByStore.get(store.storeId) || []}
              onSelectProduct={onSelectProduct}
            />
          ))}
        </div>
      )}
    </section>
  );
};
