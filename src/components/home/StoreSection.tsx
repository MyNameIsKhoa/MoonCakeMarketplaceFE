import React, { useState, useMemo } from 'react';
import { Store, Sparkles, Building2, ShieldCheck, ArrowRight } from 'lucide-react';
import { Brand, Product } from '../../types';
import { StoreCard } from './StoreCard';
import { StoreFilter, StoreCategoryKey } from './StoreFilter';

interface StoreSectionProps {
  brands: Brand[];
  products: Product[];
  onSelectBrand: (brand: Brand) => void;
  onSelectProduct: (product: Product) => void;
  onViewAllBrands?: () => void;
}

export const StoreSection: React.FC<StoreSectionProps> = ({
  brands,
  products,
  onSelectBrand,
  onSelectProduct,
  onViewAllBrands
}) => {
  const [activeCategory, setActiveCategory] = useState<StoreCategoryKey>('all');
  const [searchFilter, setSearchFilter] = useState('');

  // Map products by brandId
  const productsByBrand = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const p of products) {
      if (!map.has(p.brandId)) {
        map.set(p.brandId, []);
      }
      map.get(p.brandId)!.push(p);
    }
    return map;
  }, [products]);

  // Filter stores
  const filteredBrands = useMemo(() => {
    return brands.filter((brand) => {
      // Category filter
      if (activeCategory !== 'all') {
        if (brand.categoryType !== activeCategory) {
          return false;
        }
      }

      // Text search filter
      if (searchFilter.trim()) {
        const query = searchFilter.toLowerCase();
        const matchesName = brand.name.toLowerCase().includes(query);
        const matchesDesc = brand.description.toLowerCase().includes(query);
        const matchesCategory = brand.categoryLabel?.toLowerCase().includes(query);
        const matchesTags = brand.featuredTags?.some((t) => t.toLowerCase().includes(query));
        if (!matchesName && !matchesDesc && !matchesCategory && !matchesTags) {
          return false;
        }
      }

      return true;
    });
  }, [brands, activeCategory, searchFilter]);

  return (
    <section id="stores-section" className="mss-container space-y-6 scroll-mt-24">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 bg-accent-100 text-primary-900 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            <Store className="w-3.5 h-3.5 text-primary-700" />
            <span>Sàn Thương Mại Đa Gian Hàng</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
            Khám Phá Gian Hàng & Thương Hiệu Đối Tác
          </h2>
          <p className="text-gray-600 text-sm mt-1 max-w-2xl">
            Chọn gian hàng bạn yêu thích để xem đầy đủ menu bánh Trung Thu, chính sách khuyến mãi riêng và đặt mua trực tiếp từ nhà sản xuất.
          </p>
        </div>

        {onViewAllBrands && (
          <button
            onClick={onViewAllBrands}
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
        totalStores={filteredBrands.length}
      />

      {/* Store Cards Grid */}
      {filteredBrands.length === 0 ? (
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
          {filteredBrands.map((brand) => (
            <StoreCard
              key={brand.id}
              brand={brand}
              onSelectBrand={onSelectBrand}
              storeProducts={productsByBrand.get(brand.id) || []}
              onSelectProduct={onSelectProduct}
            />
          ))}
        </div>
      )}
    </section>
  );
};
