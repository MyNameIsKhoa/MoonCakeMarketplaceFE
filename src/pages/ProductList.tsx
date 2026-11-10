import { useMemo } from 'react';
import { Star, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { Product } from '../types';
import { useCatalog } from '../context/CatalogContext';

interface ProductListProps {
  filters: URLSearchParams;
  onFiltersChange: (patch: Record<string, string>) => void;
  onOpenProduct: (product: Product) => void;
  onAddToCart: (p: Product) => void;
}

export default function ProductList({
  filters,
  onFiltersChange,
  onOpenProduct,
  onAddToCart,
}: ProductListProps) {
  const { stores, products, categories } = useCatalog();
  const searchQuery = filters.get('q') ?? '';
  const selectedCategory = filters.get('category') ?? 'all';
  const selectedStoreId = filters.get('store') ?? 'all';
  const priceRange = filters.get('price') ?? 'all';
  const sortBy = filters.get('sort') ?? 'default';

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // Search query match
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = product.name.toLowerCase().includes(q);
        const matchStore = product.storeName.toLowerCase().includes(q);
        const matchFlavor = product.flavor.toLowerCase().includes(q);
        if (!matchName && !matchStore && !matchFlavor) return false;
      }

      // Category match
      if (selectedCategory !== 'all' && product.category !== selectedCategory) {
        return false;
      }

      // Store match
      if (selectedStoreId !== 'all' && product.storeId !== selectedStoreId) {
        return false;
      }

      // Price range
      if (priceRange !== 'all' && product.inStock === false) return false;
      if (priceRange === 'under-200' && product.price >= 200000) return false;
      if (priceRange === '200-500' && (product.price < 200000 || product.price > 500000)) return false;
      if (priceRange === '500-1000' && (product.price < 500000 || product.price > 1000000)) return false;
      if (priceRange === 'over-1000' && product.price <= 1000000) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      return 0;
    });
  }, [products, searchQuery, selectedCategory, selectedStoreId, priceRange, sortBy]);

  return (
    <div className="mss-container py-8 space-y-8">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Sản phẩm &amp; hộp quà Trung thu</h1>
          <p className="text-gray-500 text-sm mt-1">{products.length} sản phẩm từ các gian hàng đối tác</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-500">Sắp xếp theo:</span>
          <select
            value={sortBy}
            onChange={(e) => onFiltersChange({ sort: e.target.value })}
            className="p-3 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-800 focus:ring-2 focus:ring-primary-700 outline-none shadow-sm"
          >
            <option value="default">Mặc định</option>
            <option value="price-asc">Giá: Thấp đến cao</option>
            <option value="price-desc">Giá: Cao đến thấp</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <div className="space-y-6 bg-white p-6 rounded-2xl border border-accent-200/60 shadow-sm h-fit">
          <div className="flex items-center justify-between border-b border-gray-200 pb-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-primary-700" />
              <span>Bộ Lọc Tìm Kiếm</span>
            </h3>
            <button
              onClick={() => onFiltersChange({ category: "", store: "", price: "", q: "" })}
              className="text-sm text-primary-700 font-semibold hover:underline"
            >
              Đặt lại
            </button>
          </div>

          {/* Categories */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-gray-700 uppercase tracking-wider">Danh Mục</h4>
            <div className="space-y-1">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => onFiltersChange({ category: cat.id })}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition flex items-center justify-between ${
                    selectedCategory === cat.id ? 'bg-primary-50 text-primary-700 font-semibold border border-primary-200' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span>{cat.name}</span>
                  {selectedCategory === cat.id && <ChevronRight className="w-3.5 h-3.5 text-primary-700" />}
                </button>
              ))}
            </div>
          </div>

          {/* Stores */}
          <div className="space-y-2 pt-4 border-t border-gray-200">
            <h4 className="font-semibold text-sm text-gray-700 uppercase tracking-wider">Gian Hàng</h4>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              <button
                onClick={() => onFiltersChange({ store: 'all' })}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition ${
                  selectedStoreId === 'all' ? 'bg-primary-50 text-primary-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Tất cả gian hàng
              </button>
              {stores.map((store) => (
                <button
                  key={store.storeId}
                  onClick={() => onFiltersChange({ store: store.storeId })}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition ${
                    selectedStoreId === store.storeId ? 'bg-primary-50 text-primary-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {store.name}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div className="space-y-2 pt-4 border-t border-gray-200">
            <h4 className="font-semibold text-sm text-gray-700 uppercase tracking-wider">Khoảng Giá</h4>
            <div className="space-y-2 text-sm text-gray-600">
              {[
                { id: 'all', label: 'Tất cả mức giá' },
                { id: 'under-200', label: 'Dưới 200.000đ' },
                { id: '200-500', label: '200.000đ - 500.000đ' },
                { id: '500-1000', label: '500.000đ - 1.000.000đ' },
                { id: 'over-1000', label: 'Trên 1.000.000đ (Cao cấp)' },
              ].map((item) => (
                <label key={item.id} className="flex items-center gap-2 cursor-pointer hover:text-gray-900">
                  <input
                    type="radio"
                    name="price"
                    checked={priceRange === item.id}
                    onChange={() => onFiltersChange({ price: item.id })}
                    className="text-primary-700 focus:ring-primary-600"
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Product Grid */}
        <div className="lg:col-span-3 space-y-6">
          {searchQuery && (
            <div className="bg-accent-50 border border-accent-200 p-4 rounded-xl flex items-center justify-between text-sm text-accent-900">
              <span>Kết quả tìm kiếm cho từ khóa: <strong>"{searchQuery}"</strong> ({filteredProducts.length} sản phẩm)</span>
              <button onClick={() => onFiltersChange({ q: '' })} className="font-bold text-primary-700 hover:underline">Xóa tìm kiếm</button>
            </div>
          )}

          {filteredProducts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 space-y-3">
              <div className="text-4xl">🥮</div>
              <h3 className="font-bold text-gray-800 text-base">Không tìm thấy sản phẩm phù hợp</h3>
              <p className="text-gray-500 text-sm">Hãy thử thay đổi bộ lọc hoặc từ khóa tìm kiếm khác nhé.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl overflow-hidden shadow-md border border-accent-200/60 flex flex-col group hover:shadow-xl hover:border-primary-700 transition"
                >
                  <div className="relative overflow-hidden cursor-pointer" onClick={() => onOpenProduct(product)}>
                    <img src={product.image} alt={product.name} className="w-full aspect-square object-cover group-hover:scale-105 transition duration-500" />
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <span className="text-sm text-accent-700 font-semibold">{product.storeName}</span>
                      <h3
                        onClick={() => onOpenProduct(product)}
                        className="font-bold text-gray-900 text-sm line-clamp-2 hover:text-primary-700 cursor-pointer transition mt-1"
                      >
                        {product.name}
                      </h3>
                      {product.weight && <p className="text-xs text-gray-500 mt-1">{product.weight}</p>}
                    </div>

                    <div>
                      {product.reviewCount > 0 && (
                        <div className="flex items-center gap-2 text-sm text-accent-500 mb-2">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span className="font-bold text-gray-700">{product.rating}</span>
                          <span className="text-gray-500">({product.reviewCount})</span>
                        </div>
                      )}

                      <div className="flex items-baseline justify-between">
                        <div>
                          <span className="text-primary-700 font-bold text-base">{product.inStock === false ? "Hết hàng" : "Từ " + product.price.toLocaleString("vi-VN") + " đ"}</span>
                          {product.originalPrice && (
                            <span className="text-gray-500 text-sm line-through ml-2">{product.originalPrice.toLocaleString()}đ</span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          if (product.inStock === undefined) onOpenProduct(product);
                          else onAddToCart(product);
                        }}
                        disabled={product.inStock === false}
                        className="w-full mt-3 py-3 bg-primary-700 hover:bg-primary-800 disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl shadow transition flex items-center justify-center gap-2"
                      >
                        <span>{product.inStock === false ? 'Hết hàng' : product.inStock ? 'Thêm vào giỏ' : 'Xem sản phẩm'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
