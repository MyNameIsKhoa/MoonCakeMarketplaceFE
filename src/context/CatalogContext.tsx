/**
 * Storefront catalog (stores, products, categories) loaded once from the API Gateway and shared by
 * Home, Navbar, ProductList and the store directory.
 *
 * Falls back to data/mockData when the Gateway is unreachable, or always when VITE_USE_MOCK_CATALOG=true,
 * so the FE can still be demoed without the backend. `source` tells the UI which one it is showing.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Product, Store } from '../types';
import { CATEGORIES, PRODUCTS, STORES } from '../data/mockData';
import {
  catalogApi, toCategoryOption, toProduct, toStore, type CategoryOption
} from '../services/api';

export type CatalogSource = 'loading' | 'api' | 'mock';

interface CatalogState {
  stores: Store[];
  products: Product[];
  /** First option is always { id: 'all' }. */
  categories: CategoryOption[];
  source: CatalogSource;
  /** Why the API could not be used (only when source === 'mock' after a failed request). */
  error: string | null;
  reload: () => void;
  /** Looks up live stores first, then mock stores (mock flash-sale products point at those). */
  findStore: (storeId: string) => Store | undefined;
}

const USE_MOCK_CATALOG = import.meta.env?.VITE_USE_MOCK_CATALOG === 'true';
const ALL_CATEGORIES: CategoryOption = { id: 'all', name: 'Tất cả sản phẩm' };

const MOCK_STATE = {
  stores: STORES,
  products: PRODUCTS,
  categories: CATEGORIES.map(({ id, name }) => ({ id, name }))
};

const CatalogContext = createContext<CatalogState | null>(null);

async function loadFromApi() {
  const [stores, productItems, categoryItems] = await Promise.all([
    catalogApi.stores.list(),
    catalogApi.products.all(),
    catalogApi.categories.all()
  ]);
  const mappedStores = stores.map(toStore);
  const storesById = new Map(mappedStores.map((s) => [s.storeId, s]));
  const categorySlugById = new Map(categoryItems.map((c) => [c.categoryId, c.slug]));
  const products = productItems
      // No ACTIVE variant → no price, nothing to buy.
      .filter((p) => p.minPrice !== null)
      .map((p) => toProduct(p, storesById, categorySlugById));

  return {
    stores: mappedStores,
    products,
    categories: [ALL_CATEGORIES, ...categoryItems.filter((c) => c.status === 'ACTIVE').map(toCategoryOption)]
  };
}

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Pick<CatalogState, 'stores' | 'products' | 'categories'>>(
    USE_MOCK_CATALOG ? MOCK_STATE : { stores: [], products: [], categories: [ALL_CATEGORIES] }
  );
  const [source, setSource] = useState<CatalogSource>(USE_MOCK_CATALOG ? 'mock' : 'loading');
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (USE_MOCK_CATALOG) return;
    let cancelled = false;
    setSource('loading');
    loadFromApi()
      .then((loaded) => {
        if (cancelled) return;
        setData(loaded);
        setError(null);
        setSource('api');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setData(MOCK_STATE);
        setError(err instanceof Error ? err.message : 'Không tải được dữ liệu gian hàng.');
        setSource('mock');
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const value = useMemo<CatalogState>(() => {
    const storesById = new Map(data.stores.map((s) => [s.storeId, s]));
    const mockStoresById = new Map(STORES.map((s) => [s.storeId, s]));
    return {
      ...data,
      source,
      error,
      reload,
      findStore: (storeId) => storesById.get(storeId) ?? mockStoresById.get(storeId)
    };
  }, [data, source, error, reload]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogState {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog must be used inside <CatalogProvider>');
  return ctx;
}
