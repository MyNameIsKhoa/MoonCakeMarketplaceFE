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
  CreateStoreBranchRequest,
  CreateStoreRequest,
  CreateVariantRequest,
  PageQuery,
  PageResponse,
  ProductQuery,
  ProductResponse,
  ProductSummaryResponse,
  PromotionQuery,
  PromotionResponse,
  PromotionRuleRequest,
  StoreBranchResponse,
  StoreQuery,
  StoreResponse,
  UpdateCategoryRequest,
  UpdateProductRequest,
  UpdatePromotionRequest,
  UpdateStoreBranchRequest,
  UpdateStoreRequest,
  UpdateVariantRequest,
  VariantResponse
} from './catalogTypes';

export const storeApi = {
  /** Public: ACTIVE stores; `mine: true` lists the supplier's own stores (login required). */
  list: async (query: StoreQuery = {}) =>
    (await http.get<StoreResponse[]>('/api/stores', { params: cleanParams(query) })).data,
  /** Accepts storeId or slug. Non-ACTIVE stores are visible to the owner only. */
  get: async (idOrSlug: number | string) =>
    (await http.get<StoreResponse>(`/api/stores/${idOrSlug}`)).data,
  /** Verified supplier only. */
  create: async (body: CreateStoreRequest) =>
    (await http.post<StoreResponse>('/api/stores', body)).data,
  /** Store owner (or admin). */
  update: async (storeId: number, body: UpdateStoreRequest) =>
    (await http.patch<StoreResponse>(`/api/stores/${storeId}`, body)).data
};

export const storeBranchApi = {
  /** Public for ACTIVE stores (ACTIVE branches only); the owner sees every branch. */
  list: async (storeId: number) =>
    (await http.get<StoreBranchResponse[]>(`/api/stores/${storeId}/branches`)).data,
  /** Store owner. */
  create: async (storeId: number, body: CreateStoreBranchRequest) =>
    (await http.post<StoreBranchResponse>(`/api/stores/${storeId}/branches`, body)).data,
  /** Store owner. */
  update: async (storeId: number, branchId: number, body: UpdateStoreBranchRequest) =>
    (await http.patch<StoreBranchResponse>(`/api/stores/${storeId}/branches/${branchId}`, body)).data,
  /** Store owner. */
  remove: async (storeId: number, branchId: number) => {
    await http.delete(`/api/stores/${storeId}/branches/${branchId}`);
  }
};

export const categoryApi = {
  /** CA01 — public, ACTIVE only. */
  list: async (query: CategoryQuery = {}) =>
    (await http.get<PageResponse<CategoryResponse>>('/api/categories', { params: cleanParams(query) })).data,
  all: async (): Promise<CategoryResponse[]> => {
    const first = await categoryApi.list({ size: 100 });
    const rest = await Promise.all(Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, i) =>
      categoryApi.list({ page: i + 1, size: 100 })));
    return [first, ...rest].flatMap((page) => page.items);
  },
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
  all: async (query: ProductQuery = {}): Promise<ProductSummaryResponse[]> => {
    const first = await productApi.search({ ...query, page: 0, size: 100 });
    const rest = await Promise.all(Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, i) =>
      productApi.search({ ...query, page: i + 1, size: 100 })));
    return [first, ...rest].flatMap((page) => page.items);
  },
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
  stores: storeApi,
  storeBranches: storeBranchApi,
  categories: categoryApi,
  products: productApi,
  variants: variantApi,
  promotions: promotionApi
};
