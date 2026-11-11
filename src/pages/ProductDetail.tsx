import React, { useState, useEffect } from 'react';
import { ShoppingBag, Plus, Minus, Building2 } from 'lucide-react';
import { Product } from '../types';
import { catalogApi, isApiId, withProductDetail, variantAvailableQuantity, type ProductResponse, type PromotionResponse } from '../services/api';
import { parseApiDate } from '../utils/format';
import { ReviewList } from '../features/fulfillment/components/ReviewList';

interface ProductDetailProps {
  product: Product;
  onAddToCart: (product: Product, quantity: number, sugarLevel: string) => void;
  onBuyNow: (product: Product, quantity: number, sugarLevel: string) => void;
  setActiveTab: (tab: string) => void;
}

export default function ProductDetail({
  product,
  onAddToCart,
  onBuyNow,
  setActiveTab
}: ProductDetailProps) {
  const [activeImage, setActiveImage] = useState(product.image);
  const [quantity, setQuantity] = useState(1);
  const [promotions, setPromotions] = useState<PromotionResponse[]>([]);

  const isLive = isApiId(product.id);
  const [detail, setDetail] = useState<ProductResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [variantId, setVariantId] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!isLive) return;
    let cancelled = false;
    setDetail(null); setLoadError(null); setVariantId(null);
    catalogApi.products.get(Number(product.id))
      .then((loaded) => {
        if (cancelled) return;
        if (!['ACTIVE', 'OUT_OF_STOCK'].includes(loaded.status)) throw new Error('Sản phẩm hiện không còn công khai.');
        loaded = { ...loaded, variants: loaded.variants.filter(v => v.status === 'ACTIVE') };
        const firstVariant = loaded.variants.find((v) => variantAvailableQuantity(v) > 0) ?? loaded.variants[0];
        setDetail(loaded);
        setVariantId(firstVariant?.variantId ?? null);
        if (firstVariant?.imageUrl) setActiveImage(firstVariant.imageUrl);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Không tải được chi tiết sản phẩm.');
      });
    return () => {
      cancelled = true;
    };
  }, [isLive, product.id, reloadKey]);

  useEffect(() => {
    if (!isLive || !isApiId(product.storeId ?? "")) return;
    let active = true;
    catalogApi.promotions.list({ storeId: Number(product.storeId), size: 100 })
      .then(result => { if (active) setPromotions(result.items); })
      .catch(() => { if (active) setPromotions([]); });
    return () => { active = false; };
  }, [isLive, product.storeId]);

  const view = detail ? withProductDetail(product, detail) : product;
  const variants = detail?.variants ?? [];
  const selectedVariant = variants.find((v) => v.variantId === variantId);
  // What goes into the cart: the chosen variant's price/image; the variant name is the cart option.
  const cartProduct: Product = selectedVariant
    ? { ...view, variantId: String(selectedVariant.variantId), price: selectedVariant.basePrice, image: selectedVariant.imageUrl || view.image, inStock: detail?.status === 'ACTIVE' && variantAvailableQuantity(selectedVariant) > 0 }
    : view;
  const cartOption = selectedVariant?.variantName ?? product.sugarLevel;
  const available = selectedVariant ? variantAvailableQuantity(selectedVariant) : 0;
  const canPurchase = isLive && detail?.status === 'ACTIVE' && !loadError && available >= quantity;
  const now = Date.now();
  const giftRules = promotions.filter(p => p.status === 'ACTIVE'
    && (parseApiDate(p.startAt)?.getTime() ?? Infinity) <= now
    && (parseApiDate(p.endAt)?.getTime() ?? 0) > now)
    .flatMap(p => p.rules).filter(rule => rule.ruleType === 'BUY_X_GET_Y'
      && rule.targetVariantId === selectedVariant?.variantId && rule.minQuantity && rule.rewardQuantity);
  const giftOffers = Array.from(new Map(giftRules.map(rule => [
    [rule.minQuantity, rule.rewardQuantity, rule.rewardVariantId].join(':'), rule,
  ])).values());

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
            {[view.image, ...(view.gallery || [])].slice(0, 3).map((img, idx) => (
              <div
                key={idx}
                onClick={() => setActiveImage(img)}
                className={`rounded-xl overflow-hidden border-2 cursor-pointer aspect-square transition ${
                  activeImage === img ? 'border-primary-700 shadow-md' : 'border-gray-200 opacity-70 hover:opacity-100'
                }`}
              >
                <img src={img} alt="Ảnh sản phẩm" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-accent-700 bg-accent-100 px-3 py-1 rounded-full">{product.storeName}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mt-3">{view.name}</h1>
          </div>

          <div className="bg-accent-50/70 border border-accent-200 p-4 rounded-xl flex items-baseline gap-4">
            <span className="text-3xl font-bold text-primary-700">{cartProduct.inStock !== false || selectedVariant ? cartProduct.price.toLocaleString("vi-VN") + " đ" : "Hết hàng"}</span>
            {product.originalPrice && (
              <span className="text-gray-500 text-base line-through">{product.originalPrice.toLocaleString()}đ</span>
            )}
          </div>

          {giftOffers.length > 0 && <section className="rounded-xl border border-accent-200 bg-accent-50 p-3 text-sm">
            <h2 className="font-semibold text-primary-800">Ưu đãi mua tặng</h2>
            <ul className="mt-1 space-y-1">
              {giftOffers.map(rule => <li key={rule.promotionRuleId}>
                <strong>Mua {rule.minQuantity} tặng {rule.rewardQuantity}</strong>
                {rule.rewardVariantId === rule.targetVariantId
                  ? " · Thêm " + ((rule.minQuantity ?? 0) + (rule.rewardQuantity ?? 0)) + " sản phẩm cùng loại vào giỏ để nhận ưu đãi."
                  : " · Thêm sản phẩm được tặng vào giỏ cùng với sản phẩm mua."}
              </li>)}
            </ul>
          </section>}

          <p className="text-sm md:text-sm text-gray-600 leading-relaxed">
            {isLive && !detail && !loadError ? 'Đang tải thông tin sản phẩm...' : view.description}
          </p>
          {loadError && <p role="alert" className="text-sm text-red-600">{loadError} <button className="mss-button mss-button--secondary mss-button--sm ml-2" onClick={() => setReloadKey(k => k + 1)}>Thử lại</button></p>}

          <div className="space-y-4 pt-2 border-t border-gray-200">
            {variants.length > 0 && (
              /* Variant option (product_variant from Catalog) */
              <div>
                <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2">Phân loại:</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {variants.map((variant) => (
                    <button
                      key={variant.variantId}
                      onClick={() => {
                        setVariantId(variant.variantId);
                        setQuantity(current => Math.max(1, Math.min(current, variantAvailableQuantity(variant))));
                        if (variant.imageUrl) setActiveImage(variant.imageUrl);
                      }}
                      disabled={variantAvailableQuantity(variant) <= 0}
                      className={`p-3 text-sm font-semibold rounded-xl border text-center transition disabled:opacity-40 disabled:cursor-not-allowed ${
                        variantId === variant.variantId ? 'bg-primary-50 border-primary-700 text-primary-700 shadow-sm' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="block">{variant.variantName}</span>
                      <span className="block text-xs font-normal">
                        {variantAvailableQuantity(variant) > 0 ? `${variant.basePrice.toLocaleString()}đ` : 'Hết hàng'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Số lượng:</span>
              <div className="flex items-center border border-gray-300 rounded-xl bg-white">
                <button
                  type="button" aria-label="Giảm số lượng" disabled={quantity <= 1}
                  onClick={() => setQuantity(current => Math.max(1, current - 1))}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-l-xl transition"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-4 text-sm font-bold">{quantity}</span>
                <button
                  type="button" aria-label="Tăng số lượng" disabled={quantity >= available}
                  onClick={() => setQuantity(current => Math.min(current + 1, available))}
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
              onClick={() => onAddToCart(cartProduct, quantity, cartOption)}
              disabled={!canPurchase}
              className="flex-1 py-4 bg-accent-500 hover:bg-accent-600 text-primary-950 font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingBag className="w-5 h-5" />
              <span>{cartProduct.inStock === false ? 'Tạm hết hàng' : 'Thêm vào giỏ hàng'}</span>
            </button>
            <button
              onClick={() => onBuyNow(cartProduct, quantity, cartOption)}
              disabled={!canPurchase}
              className="flex-1 py-4 bg-gradient-to-r from-primary-700 to-accent-700 hover:from-primary-800 hover:to-accent-800 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Mua ngay</span>
            </button>
          </div>

          <div className="bg-accent-50 border border-accent-200 p-4 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-accent-900">
              <Building2 className="w-4 h-4 text-primary-700 shrink-0" />
              <span>Bạn cần đặt số lượng lớn hoặc đặt bánh theo yêu cầu?</span>
            </div>
            <button
              onClick={() => setActiveTab('b2b')}
              className="px-3 py-2 bg-primary-700 hover:bg-primary-800 text-white text-sm font-semibold rounded-lg shadow transition shrink-0"
            >
              Yêu cầu báo giá B2B
            </button>
          </div>
        </div>
      </div>

      {/* Customer Reviews */}
      {isLive && variantId !== null && <ReviewList key={variantId} variantId={variantId} />}
    </div>
  );
}
