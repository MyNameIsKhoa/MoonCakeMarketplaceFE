import React from 'react';
import { Sparkles, ArrowDown, Store } from 'lucide-react';

interface HeroBannerProps {
  onExploreStores: () => void;
  onExploreProducts: () => void;
  onOpenAI?: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  onExploreStores,
  onExploreProducts,
  onOpenAI
}) => {
  return (
    <div className="relative bg-gradient-to-br from-primary-950 via-primary-900 to-accent-950 text-white overflow-hidden shadow-2xl border-b border-accent-500/20">
      {/* Decorative background glow & traditional pattern */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(var(--color-accent-300)_1.5px,transparent_1.5px)] [background-size:20px_20px] pointer-events-none"></div>
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-primary-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="mss-container py-12 md:py-16 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Column: Marketplace Messaging */}
        <div className="lg:col-span-7 space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-accent-400/20 border border-accent-400/40 text-accent-300 px-4 py-1.5 rounded-full text-xs md:text-sm font-semibold backdrop-blur-md shadow-sm">
            <Sparkles className="w-4 h-4 text-accent-400 animate-pulse" />
            <span>Mùa Trung Thu</span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black leading-tight tracking-tight text-white drop-shadow-md">
            Tìm bánh trung thu <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-300 via-accent-400 to-yellow-200">
              từ nhiều gian hàng
            </span>
          </h1>

          {/* Description */}
          <p className="text-gray-200 text-sm md:text-base leading-relaxed max-w-xl">
            Chọn bánh theo sở thích, xem ưu đãi từng gian hàng hoặc gửi yêu cầu báo giá cho đơn số lượng lớn.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={onExploreStores}
              className="px-6 py-3.5 bg-gradient-to-r from-accent-400 to-accent-500 hover:from-accent-500 hover:to-accent-600 text-primary-950 font-bold rounded-xl shadow-lg hover:shadow-xl flex items-center gap-2 transition-all transform active:scale-95"
            >
              <Store className="w-5 h-5 text-primary-950" />
              <span>Khám phá gian hàng</span>
              <ArrowDown className="w-4 h-4 animate-bounce" />
            </button>

            <button
              onClick={onExploreProducts}
              className="px-5 py-3.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold rounded-xl backdrop-blur-sm flex items-center gap-2 transition"
            >
              <span>Xem sản phẩm</span>
            </button>

{onOpenAI &&             <button
              onClick={onOpenAI}
              className="px-4 py-3.5 bg-primary-800/80 hover:bg-primary-800 text-accent-200 border border-accent-400/30 text-xs sm:text-sm font-semibold rounded-xl backdrop-blur-sm flex items-center gap-1.5 transition"
            >
              <Sparkles className="w-4 h-4 text-accent-400" />
              <span>Gợi ý quà biếu</span>
            </button>}
          </div>

        </div>

        {/* Right Column: Hero Visual Presentation */}
        <div className="lg:col-span-5 relative">
          <div className="relative mx-auto max-w-lg rounded-3xl overflow-hidden shadow-2xl border-4 border-accent-400/40 group">
            <img
              src="/hero-banner.jpg"
              alt="Mâm cỗ Bánh Trung Thu Hoàng Gia Đêm Trăng"
              className="w-full h-80 sm:h-96 md:h-[420px] object-cover transform group-hover:scale-105 transition duration-700"
            />
            
            {/* Visual Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-primary-950/90 via-transparent to-transparent flex flex-col justify-end p-6">
              <div className="inline-flex items-center gap-1.5 bg-accent-400 text-primary-950 text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md w-fit mb-2">
                <span>🏮 Mùa trăng rằm</span>
              </div>
              <h3 className="text-white text-xl font-bold">
                Tinh Hoa Ẩm Thực Trăng Rằm Việt Nam
              </h3>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
