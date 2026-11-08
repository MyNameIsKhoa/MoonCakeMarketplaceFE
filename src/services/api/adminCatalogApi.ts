/**
 * Catalog admin APIs (ROLE_ADMIN) through the API Gateway route /api/admin/catalog/**.
 * Writes still use the shared endpoints: storeApi.update (status), categoryApi.create / categoryApi.update.
 */
import { http } from './http';
import type { CategoryResponse, StoreResponse } from './catalogTypes';

export const adminCatalogApi = {
  /** Every store in every status (DRAFT/ACTIVE/INACTIVE/SUSPENDED), ordered by id. */
  stores: async () => (await http.get<StoreResponse[]>('/api/admin/catalog/stores')).data,
  /**
   * Every category in every status (ACTIVE and INACTIVE), as a flat list ordered by name then id;
   * build the tree with parentCategoryId. Public GET /api/categories only returns ACTIVE ones.
   */
  categories: async () => (await http.get<CategoryResponse[]>('/api/admin/catalog/categories')).data
};
