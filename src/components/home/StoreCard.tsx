import React from 'react';
import { ShieldCheck, Zap, ChevronRight, Store } from 'lucide-react';
import { Brand, Product } from '../../types';

interface StoreCardProps {
  brand: Brand;
  onSelectBrand: (brand: Brand) => void;
  storeProducts: Product[];
  onSelectProduct?: (product: Product) => void;
}

export const StoreCard: React.FC<StoreCardProps> = ({
  brand,
  onSelectBrand,
  storeProducts,
  onSelectProduct
}) => {
  // Take up to 3 characteristic products for preview
  const previewProducts = storeProducts.slice(0, 3);

  return (
    <div 
      onClick={() => onSelectBrand(brand)}
      className="bg-white rounded-2xl border border-accent-200/80 shadow-sm hover:shadow-xl hover:border-primary-600 transition-all duration-300 overflow-hidden flex flex-col group cursor-pointer"
    >
      {/* Cover Banner Header */}
      <div className="h-28 w-full relative overflow-hidden bg-primary-950">
        <img 
          src={brand.banner} 
          alt={brand.name} 
          className="w-full h-full object-cover opacity-60 group-hover:scale-105 group-hover:opacity-75 transition-all duration-700" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>

        {/* Top Badges */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 flex-wrap justify-end">
          <span className="bg-accent-400 text-primary-950 text-xs font-bold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1 backdrop-blur-sm">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Chính hãng</span>
          </span>
          <span className="bg-primary-900/90 text-accent-200 border border-accent-400/30 text-xs font-medium px-2 py-1 rounded-full shadow-sm flex items-center gap-1">
            <Zap className="w-3 h-3 text-accent-400" />
            <span>Giao hỏa tốc</span>
          </span>
        </div>

        {/* Store Logo overlapping bottom */}
        <div className="absolute -bottom-6 left-5 z-10">
          <div className="relative">
            <img 
              src={brand.logo} 
              alt={brand.name} 
              className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-lg bg-white ring-2 ring-primary-100" 
            />
            <span className="absolute -bottom-1 -right-1 bg-green-500 w-3.5 h-3.5 rounded-full border-2 border-white" title="Gian hàng đang mở"></span>
          </div>
        </div>
      </div>

      {/* Main Content Info */}
      <div className="pt-8 px-5 pb-5 flex-1 flex flex-col justify-between space-y-4">
        {/* Brand identity */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-bold text-gray-900 text-lg group-hover:text-primary-700 transition flex items-center gap-1.5">
                <span>{brand.name}</span>
              </h3>
              <p className="text-xs text-accent-800 font-semibold mt-0.5">
                {brand.categoryLabel || 'Thương hiệu đối tác'}
              </p>
            </div>
          </div>

          <p className="text-xs text-gray-600 line-clamp-2 mt-2 leading-relaxed">
            {brand.description}
          </p>

          {/* Price Range Bar */}
          <div className="mt-3 flex items-center justify-between text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
            <span className="text-gray-600 font-medium">Khoảng giá tham khảo:</span>
            <span className="text-primary-700 font-bold">{brand.priceRange || '65.000đ - 2.500.000đ'}</span>
          </div>
        </div>

        {/* 2-3 Characteristic Products Showcase */}
        {previewProducts.length > 0 && (
          <div>
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
              <span className="font-medium">Bánh tiêu biểu của shop:</span>
              <span className="text-primary-700 font-semibold group-hover:underline">Xem thêm</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {previewProducts.map((p) => (
                <div 
                  key={p.id}
                  onClick={(e) => {
                    if (onSelectProduct) {
                      e.stopPropagation();
                      onSelectProduct(p);
                    }
                  }}
                  className="bg-accent-50/40 hover:bg-accent-100/50 p-1.5 rounded-xl border border-accent-200/40 transition group/item text-left"
                  title={p.name}
                >
                  <img 
                    src={p.image} 
                    alt={p.name} 
                    className="w-full aspect-square object-cover rounded-lg group-hover/item:scale-105 transition" 
                  />
                  <p className="text-[11px] font-semibold text-gray-800 truncate mt-1 group-hover/item:text-primary-700">
                    {p.name.replace(` - ${brand.name.split(' ')[0]}`, '')}
                  </p>
                  <p className="text-[11px] font-bold text-primary-700">
                    {p.price.toLocaleString()}đ
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer CTA */}
        <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Store className="w-3.5 h-3.5 text-primary-700" />
            <span className="text-gray-600 font-medium">Gian hàng chính hãng</span>
          </div>

          <button 
            type="button"
            className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-primary-50 text-primary-700 group-hover:bg-primary-700 group-hover:text-white transition duration-200"
          >
            <span>Khám phá gian hàng</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};
