/**
 * Catalog & Store API (TV2) over the API Gateway. Components import `catalogApi`
 * from `services/api/index.ts`, not from this file.
 *
 * Errors are thrown as ApiError (see ./http): 400 validation/business rule, 401 not logged in,
 * 403 not the store owner / not admin, 404 not found or not published, 409 duplicate/conflict.
 */
import { cleanParams, http } from './http';
import type {
  CategoryQuery,
  CategoryResponse,
  CreateCategoryRequest,
  CreateProductRequest,
  CreatePromotionRequest,
  CreateVariantRequest,
  PageQuery,
  PageResponse,
  ProductQuery,
  ProductResponse,
  ProductSummaryResponse,
  PromotionQuery,
  PromotionResponse,
  PromotionRuleRequest,
  UpdateCategoryRequest,
  UpdateProductRequest,
  UpdatePromotionRequest,
  UpdateVariantRequest,
  VariantResponse
} from './catalogTypes';

export const categoryApi = {
  /** CA01 — public, ACTIVE only. */
  list: async (query: CategoryQuery = {}) =>
    (await http.get<PageResponse<CategoryResponse>>('/api/categories', { params: cleanParams(query) })).data,
  /** CA02 — public. */
  get: async (categoryId: number) =>
    (await http.get<CategoryResponse>(`/api/categories/${categoryId}`)).data,
  /** CA03 — admin only. */
  create: async (body: CreateCategoryRequest) =>
    (await http.post<CategoryResponse>('/api/categories', body)).data,
  /** CA04 — admin only. */
  update: async (categoryId: number, body: UpdateCategoryRequest) =>
    (await http.patch<CategoryResponse>(`/api/categories/${categoryId}`, body)).data
};

export const productApi = {
  /** CA06 — public search; `mine: true` lists the supplier's own products (login required). */
  search: async (query: ProductQuery = {}) =>
    (await http.get<PageResponse<ProductSummaryResponse>>('/api/products', { params: cleanParams(query) })).data,
  /** CA07 — public for published products; the owner also sees drafts and all variants. */
  get: async (productId: number) =>
    (await http.get<ProductResponse>(`/api/products/${productId}`)).data,
  /** CA08 — store owner. */
  create: async (body: CreateProductRequest) =>
    (await http.post<ProductResponse>('/api/products', body)).data,
  /** CA09 — store owner. */
  update: async (productId: number, body: UpdateProductRequest) =>
    (await http.patch<ProductResponse>(`/api/products/${productId}`, body)).data
};

export const variantApi = {
  /** CA11 — sort fields: basePrice, variantName, id. */
  list: async (productId: number, query: PageQuery = {}) =>
    (await http.get<PageResponse<VariantResponse>>(`/api/products/${productId}/variants`,
      { params: cleanParams(query) })).data,
  /** CA12 */
  get: async (productId: number, variantId: number) =>
    (await http.get<VariantResponse>(`/api/products/${productId}/variants/${variantId}`)).data,
  /** CA13 — store owner. */
  create: async (productId: number, body: CreateVariantRequest) =>
    (await http.post<VariantResponse>(`/api/products/${productId}/variants`, body)).data,
  /** CA14 — store owner. */
  update: async (productId: number, variantId: number, body: UpdateVariantRequest) =>
    (await http.patch<VariantResponse>(`/api/products/${productId}/variants/${variantId}`, body)).data
};

export const promotionApi = {
  /** CA16 — public: ACTIVE, not ended, store ACTIVE; `mine: true` for the supplier (login required). */
  list: async (query: PromotionQuery = {}) =>
    (await http.get<PageResponse<PromotionResponse>>('/api/promotions', { params: cleanParams(query) })).data,
  /** CA17 */
  get: async (promotionId: number) =>
    (await http.get<PromotionResponse>(`/api/promotions/${promotionId}`)).data,
  /** CA18 — store owner. */
  create: async (body: CreatePromotionRequest) =>
    (await http.post<PromotionResponse>('/api/promotions', body)).data,
  /** CA19 — store owner. */
  update: async (promotionId: number, body: UpdatePromotionRequest) =>
    (await http.patch<PromotionResponse>(`/api/promotions/${promotionId}`, body)).data,
  /** CA20 — store owner; replaces every rule atomically. */
  replaceRules: async (promotionId: number, rules: PromotionRuleRequest[]) =>
    (await http.put<PromotionResponse>(`/api/promotions/${promotionId}/rules`, rules)).data
};

export const catalogApi = {
  categories: categoryApi,
  products: productApi,
  variants: variantApi,
  promotions: promotionApi
};
