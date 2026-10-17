import React, { useState } from 'react';
import { Star, ShieldCheck, Truck, RefreshCw, Heart, ShoppingBag, Plus, Minus, MessageSquare, CheckCircle2, Sparkles, Building2 } from 'lucide-react';
import { Product, Review } from '../types';
import { REVIEWS } from '../data/mockData';

interface ProductDetailProps {
  product: Product;
  onAddToCart: (product: Product, quantity: number, sugarLevel: string) => void;
  onBuyNow: (product: Product, quantity: number, sugarLevel: string) => void;
  wishlistIds: string[];
  onToggleWishlist: (productId: string) => void;
  setActiveTab: (tab: string) => void;
}

export default function ProductDetail({
  product,
  onAddToCart,
  onBuyNow,
  wishlistIds,
  onToggleWishlist,
  setActiveTab
}: ProductDetailProps) {
  const [activeImage, setActiveImage] = useState(product.image);
  const [quantity, setQuantity] = useState(1);
  const [sugarLevel, setSugarLevel] = useState<string>(product.sugarLevel);
  const [selectedBoxOption, setSelectedBoxOption] = useState('Hộp quà tiêu chuẩn mạ vàng');

  const productReviews = REVIEWS.filter(r => r.productId === product.id || r.productId === 'prod-1');

  return (
    <div className="mss-container py-8 space-y-12">
      {/* Breadcrumb */}
      <div className="text-sm text-gray-500 flex items-center gap-2">
        <button onClick={() => setActiveTab('home')} className="hover:text-primary-700">Trang chủ</button>
        <span>/</span>
        <button onClick={() => setActiveTab('products')} className="hover:text-primary-700">Sản phẩm</button>
        <span>/</span>
        <span className="text-gray-800 font-semibold truncate">{product.name}</span>
      </div>

      {/* Main product view */}
      <div className="bg-white rounded-2xl border border-accent-200/70 p-6 md:p-8 shadow-sm grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Gallery */}
        <div className="space-y-4">
          <div className="rounded-2xl overflow-hidden border border-accent-200 bg-accent-50/30 aspect-square shadow-md">
            <img src={activeImage} alt={product.name} className="w-full h-full object-cover" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[product.image, ...(product.gallery || [])].slice(0, 3).map((img, idx) => (
              <div
                key={idx}
                onClick={() => setActiveImage(img)}
                className={`rounded-xl overflow-hidden border-2 cursor-pointer aspect-square transition ${
                  activeImage === img ? 'border-primary-700 shadow-md' : 'border-gray-200 opacity-70 hover:opacity-100'
                }`}
              >
                <img src={img} alt="Thumbnail" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-accent-700 bg-accent-100 px-3 py-1 rounded-full">{product.brandName}</span>
              <button
                onClick={() => onToggleWishlist(product.id)}
                className={`p-3 rounded-full transition ${
                  wishlistIds.includes(product.id) ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Heart className="w-5 h-5" />
              </button>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mt-3">{product.name}</h1>
            
            <div className="flex items-center gap-3 mt-3">
              <div className="flex items-center gap-1 text-accent-500">
                <Star className="w-4 h-4 fill-current" />
                <span className="font-bold text-gray-800 text-sm">{product.rating}</span>
              </div>
              <span className="text-gray-300">|</span>
              <span className="text-sm text-gray-500">{product.reviewCount} Đánh giá</span>
              <span className="text-gray-300">|</span>
              <span className="text-sm text-green-700 font-semibold">Đã bán {product.salesCount}+</span>
            </div>
          </div>

          <div className="bg-accent-50/70 border border-accent-200 p-4 rounded-xl flex items-baseline gap-4">
            <span className="text-3xl font-bold text-primary-700">{product.price.toLocaleString()}đ</span>
            {product.originalPrice && (
              <span className="text-gray-500 text-base line-through">{product.originalPrice.toLocaleString()}đ</span>
            )}
            <span className="bg-primary-100 text-primary-700 text-sm font-bold px-3 py-1 rounded">Chính hãng 100%</span>
          </div>

          <p className="text-sm md:text-sm text-gray-600 leading-relaxed">{product.description}</p>

          <div className="space-y-4 pt-2 border-t border-gray-200">
            {/* Sugar level option */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2">Lựa chọn độ ngọt:</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  'Ít ngọt (Giảm 30%)',
                  'Tiêu chuẩn',
                  'Không đường (Dành cho người ăn kiêng)'
                ].map((level) => (
                  <button
                    key={level}
                    onClick={() => setSugarLevel(level)}
                    className={`p-3 text-sm font-semibold rounded-xl border text-center transition ${
                      sugarLevel === level ? 'bg-primary-50 border-primary-700 text-primary-700 shadow-sm' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Box Option */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2">Quy cách hộp quà:</label>
              <select
                value={selectedBoxOption}
                onChange={(e) => setSelectedBoxOption(e.target.value)}
                className="w-full p-3 bg-white border border-gray-300 rounded-xl text-sm font-medium text-gray-800 focus:ring-2 focus:ring-primary-700 outline-none"
              >
                <option value="Hộp quà tiêu chuẩn mạ vàng">Hộp quà tiêu chuẩn mạ vàng (Tặng kèm túi xách)</option>
                <option value="Hộp sơn mài cao cấp biếu sếp (+150K)">Hộp sơn mài cao cấp biếu sếp (+150.000đ)</option>
                <option value="Hộp quà doanh nghiệp in logo (+50K/hộp)">Hộp quà doanh nghiệp in logo (Đơn từ 10 hộp)</option>
              </select>
            </div>

            {/* Quantity */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Số lượng:</span>
              <div className="flex items-center border border-gray-300 rounded-xl bg-white">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-l-xl transition"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-4 text-sm font-bold">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-r-xl transition"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              onClick={() => onAddToCart(product, quantity, sugarLevel)}
              className="flex-1 py-4 bg-accent-500 hover:bg-accent-600 text-primary-950 font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition"
            >
              <ShoppingBag className="w-5 h-5" />
              <span>Thêm Vào Giỏ Hàng</span>
            </button>
            <button
              onClick={() => onBuyNow(product, quantity, sugarLevel)}
              className="flex-1 py-4 bg-gradient-to-r from-primary-700 to-accent-700 hover:from-primary-800 hover:to-accent-800 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition"
            >
              <span>Mua Ngay (Thanh Toán Nhanh)</span>
            </button>
          </div>

          <div className="bg-accent-50 border border-accent-200 p-4 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-accent-900">
              <Building2 className="w-4 h-4 text-primary-700" />
              <span>Bạn cần mua số lượng lớn cho công ty hoặc chiết khấu doanh nghiệp?</span>
            </div>
            <button
              onClick={() => setActiveTab('b2b')}
              className="px-3 py-2 bg-primary-700 hover:bg-primary-800 text-white text-sm font-semibold rounded-lg shadow transition shrink-0"
            >
              Yêu Cầu Báo Giá B2B
            </button>
          </div>
        </div>
      </div>

      {/* Specifications & Ingredients */}
      <div className="bg-white rounded-2xl border border-accent-200/70 p-6 md:p-8 shadow-sm space-y-6">
        <h3 className="text-xl font-bold text-gray-900 border-b border-gray-200 pb-4">Thành Phần & Thông Tin Dinh Dưỡng</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-700">
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Thành phần nguyên liệu cao cấp:</h4>
            <ul className="list-disc pl-5 space-y-1">
              {product.ingredients.map((ing, idx) => (
                <li key={idx}>{ing}</li>
              ))}
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-gray-900 mb-2">Quy cách & Bảo quản:</h4>
            <p>• Trọng lượng: {product.weight}</p>
            <p>• Hạn sử dụng: 75 ngày kể từ ngày sản xuất (In trên bao bì)</p>
            <p>• Bảo quản nơi khô ráo, thoáng mát, tránh ánh nắng trực tiếp.</p>
          </div>
        </div>
      </div>

      {/* Customer Reviews */}
      <div className="bg-white rounded-2xl border border-accent-200/70 p-6 md:p-8 shadow-sm space-y-6">
        <h3 className="text-xl font-bold text-gray-900 border-b border-gray-200 pb-4">Đánh Giá Từ Khách Hàng ({product.reviewCount})</h3>

        <div className="space-y-6">
          {productReviews.map((rev) => (
            <div key={rev.id} className="border-b border-gray-100 pb-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={rev.userAvatar} alt={rev.userName} className="w-10 h-10 rounded-full object-cover shadow" />
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">{rev.userName}</h4>
                    <span className="text-sm text-gray-500">{rev.date} • Phân loại: {rev.sugarLevelOption}</span>
                  </div>
                </div>
                <div className="flex items-center text-accent-500">
                  {[...Array(rev.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
              </div>
              <p className="text-sm text-gray-700 pl-12">{rev.comment}</p>
              {rev.photos && rev.photos.length > 0 && (
                <div className="flex gap-2 pl-12 pt-1">
                  {rev.photos.map((p, idx) => (
                    <img key={idx} src={p} alt="Review photo" className="w-20 h-20 object-cover rounded-lg border border-gray-200 shadow-sm" />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
