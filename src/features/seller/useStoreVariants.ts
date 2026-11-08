import { useCallback, useRef, useState } from 'react';
import { productApi, variantApi, type ProductStatus } from '../../services/api';
import { errorMessage } from '../../services/api/http';
import type { Money } from '../../types';

/** A variant of one of the seller's products, flattened for promotion pickers and rule labels. */
export interface VariantOption {
  variantId: number;
  productId: number;
  productName: string;
  variantName: string;
  sku: string;
  basePrice: Money;
  status: ProductStatus;
}

/** Every variant (any status) of the store's products; pickers filter ACTIVE, labels need all. */
async function loadStoreVariants(storeId: number): Promise<VariantOption[]> {
  const products = await productApi.all({ mine: true, storeId });
  const perProduct = await Promise.all(products.map(async (product) => {
    const page = await variantApi.list(product.productId, { size: 100 });
    return page.items.map((v): VariantOption => ({
      variantId: v.variantId,
      productId: product.productId,
      productName: product.name,
      variantName: v.variantName,
      sku: v.sku,
      basePrice: v.basePrice,
      status: v.status
    }));
  }));
  return perProduct.flat();
}

/** Lazily loads and caches each store's variants; `ensure` is safe to call repeatedly. */
export function useStoreVariants() {
  const [byStore, setByStore] = useState<Record<number, VariantOption[]>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});
  const requested = useRef(new Set<number>());

  const ensure = useCallback((storeId: number) => {
    if (requested.current.has(storeId)) return;
    requested.current.add(storeId);
    loadStoreVariants(storeId)
      .then((list) => {
        setByStore((all) => ({ ...all, [storeId]: list }));
        setErrors((all) => {
          const rest = { ...all };
          delete rest[storeId];
          return rest;
        });
      })
      .catch((err: unknown) => {
        requested.current.delete(storeId);
        setErrors((all) => ({ ...all, [storeId]: errorMessage(err) }));
      });
  }, []);

  return { byStore, errors, ensure };
}
