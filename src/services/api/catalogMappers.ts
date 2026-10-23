/**
 * Catalog DTO → UI view model. Pages keep rendering `Store` / `Product` / `Promotion` from ../../types;
 * fields the backend does not have yet (rating, salesCount, flavor...) get neutral defaults.
 */
import type { Product, Promotion, Store, StoreBranch } from '../../types';
import type {
  CategoryResponse, ProductResponse, ProductSummaryResponse, PromotionResponse,
  StoreBranchResponse, StoreResponse
} from './catalogTypes';
import { IMAGE_FALLBACK } from '../../utils/imageFallback';

/** UI category option; `id` is the category slug ('all' = no filter). */
export interface CategoryOption {
  id: string;
  name: string;
}

/** Backend IDs are numeric; mock data uses slugs ('kinh-do', 'prod-1'). */
export const isApiId = (id: string) => /^\d+$/.test(id);

export function toStore(store: StoreResponse): Store {
  return {
    storeId: String(store.storeId),
    storeCode: store.storeCode,
    name: store.name,
    slug: store.slug,
    supplierIdRef: String(store.supplierIdRef),
    supplierName: '',
    logoUrl: store.logoUrl || IMAGE_FALLBACK,
    bannerUrl: store.bannerUrl || IMAGE_FALLBACK,
    description: store.description ?? ''
  };
}

export function toStoreBranch(branch: StoreBranchResponse): StoreBranch {
  return {
    branchId: String(branch.branchId),
    name: branch.name,
    addressLine: branch.addressLine,
    ward: branch.ward ?? undefined,
    district: branch.district ?? undefined,
    city: branch.city,
    phone: branch.phone ?? undefined,
    openingHours: branch.openingHours ?? undefined,
    primary: branch.primary
  };
}

export function toCategoryOption(category: CategoryResponse): CategoryOption {
  return { id: category.slug, name: category.name };
}

export function toProduct(
  product: ProductSummaryResponse,
  storesById: Map<string, Store>,
  categorySlugById: Map<number, string>
): Product {
  return {
    id: String(product.productId),
    name: product.name,
    storeId: String(product.storeId),
    storeName: storesById.get(String(product.storeId))?.name ?? '',
    price: product.minPrice ?? 0,
    rating: 0,
    reviewCount: 0,
    image: product.imageUrl || IMAGE_FALLBACK,
    gallery: [],
    category: categorySlugById.get(product.categoryId) ?? '',
    flavor: '',
    weight: '',
    ingredients: [],
    sugarLevel: 'Tiêu chuẩn',
    description: '',
    salesCount: 0,
    inStock: product.status !== 'OUT_OF_STOCK'
  };
}

/** Fills a list item with GET /api/products/{id} (description, variant images, stock). */
export function withProductDetail(product: Product, detail: ProductResponse): Product {
  const images = detail.variants.map((v) => v.imageUrl).filter((url): url is string => !!url);
  return {
    ...product,
    name: detail.name,
    description: detail.description ?? '',
    gallery: images.filter((url) => url !== product.image),
    inStock: detail.variants.some((v) => v.stockQuantity > 0)
  };
}

export function toPromotion(promotion: PromotionResponse): Promotion {
  return {
    promotionId: String(promotion.promotionId),
    storeId: String(promotion.storeId),
    name: promotion.name,
    startAt: promotion.startAt,
    endAt: promotion.endAt,
    status: promotion.status,
    rules: promotion.rules.map((rule) => ({
      promotionRuleId: String(rule.promotionRuleId),
      ruleType: rule.ruleType,
      minQuantity: rule.minQuantity ?? undefined,
      discountPercent: rule.discountPercent ?? undefined,
      discountAmount: rule.discountAmount ?? undefined,
      rewardQuantity: rule.rewardQuantity ?? undefined
    }))
  };
}
