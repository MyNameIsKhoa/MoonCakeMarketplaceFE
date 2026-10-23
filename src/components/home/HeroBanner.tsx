import React from 'react';
import { Sparkles, ArrowDown, ShieldCheck, Truck, Gift, Building2, Store } from 'lucide-react';

interface HeroBannerProps {
  onExploreStores: () => void;
  onExploreProducts: () => void;
  onOpenAI: () => void;
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
            <span>Mùa Trăng Viên Mãn 2026 • Sàn Đa Gian Hàng Chính Hãng</span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black leading-tight tracking-tight text-white drop-shadow-md">
            Quy Tụ Các Thương Hiệu <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-300 via-accent-400 to-yellow-200">
              Bánh Trung Thu Danh Tiếng
            </span>
          </h1>

          {/* Description */}
          <p className="text-gray-200 text-sm md:text-base leading-relaxed max-w-xl">
            Sàn thương mại điện tử kết nối trực tiếp đến các gian hàng chính hãng: 
            <strong className="text-accent-300 font-semibold"> Kinh Đô, Như Lan, Madame Hương, Brodard, Givral</strong>... 
            Thưởng ngoạn trọn vẹn tinh hoa ẩm thực mùa trăng, chiết khấu doanh nghiệp B2B tới 30% và hỗ trợ giao hỏa tốc tận nhà.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={onExploreStores}
              className="px-6 py-3.5 bg-gradient-to-r from-accent-400 to-accent-500 hover:from-accent-500 hover:to-accent-600 text-primary-950 font-bold rounded-xl shadow-lg hover:shadow-xl flex items-center gap-2 transition-all transform active:scale-95"
            >
              <Store className="w-5 h-5 text-primary-950" />
              <span>Khám Phá Gian Hàng Đối Tác</span>
              <ArrowDown className="w-4 h-4 animate-bounce" />
            </button>

            <button
              onClick={onExploreProducts}
              className="px-5 py-3.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold rounded-xl backdrop-blur-sm flex items-center gap-2 transition"
            >
              <span>Xem Tất Cả Sản Phẩm</span>
            </button>

            <button
              onClick={onOpenAI}
              className="px-4 py-3.5 bg-primary-800/80 hover:bg-primary-800 text-accent-200 border border-accent-400/30 text-xs sm:text-sm font-semibold rounded-xl backdrop-blur-sm flex items-center gap-1.5 transition"
            >
              <Sparkles className="w-4 h-4 text-accent-400" />
              <span>AI Tư Vấn Quà Biếu</span>
            </button>
          </div>

          {/* Multi-Vendor Trust Metrics Grid */}
          <div className="pt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-white/10 rounded-lg text-accent-400 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-white">100% Chính Hãng</p>
                <p className="text-[11px] text-gray-300">Từ nhà sản xuất</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-white/10 rounded-lg text-accent-400 shrink-0">
                <Truck className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-white">Giao Hỏa Tốc</p>
                <p className="text-[11px] text-gray-300">Nội thành trong 2H</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-white/10 rounded-lg text-accent-400 shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-white">Chiết Khấu B2B</p>
                <p className="text-[11px] text-gray-300">Lên đến 30%</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-white/10 rounded-lg text-accent-400 shrink-0">
                <Gift className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-white">Hộp Quà Nghệ Thuật</p>
                <p className="text-[11px] text-gray-300">Tặng thiệp viết tay</p>
              </div>
            </div>
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
                <span>🏮 Đêm Hội Trăng Rằm 2026</span>
              </div>
              <h3 className="text-white text-xl font-bold">
                Tinh Hoa Ẩm Thực Trăng Rằm Việt Nam
              </h3>
              <p className="text-gray-200 text-xs mt-1">
                Kết nối trực tiếp hàng chục xưởng bánh và nghệ nhân truyền thống hàng đầu
              </p>
            </div>

            {/* Floating Trust Card */}
            <div className="absolute top-4 left-4 bg-primary-900/90 backdrop-blur-md border border-accent-400/40 rounded-xl px-3 py-2 shadow-lg flex items-center gap-2">
              <span className="text-xl">🥮</span>
              <div>
                <p className="text-xs font-bold text-white">5+ Gian hàng chính hãng</p>
                <p className="text-[10px] text-accent-300">150+ dòng bánh đặc sắc</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
