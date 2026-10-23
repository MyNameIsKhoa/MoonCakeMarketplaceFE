import { useEffect, useState } from 'react';
import { lookupApi } from './api';

/** Resolves store display names (cached per store) for quotation lists. */
export function useStoreNames(storeIds: string[]): Record<string, string> {
  const [names, setNames] = useState<Record<string, string>>({});
  const key = [...new Set(storeIds)].sort().join(',');

  useEffect(() => {
    let active = true;
    key
      .split(',')
      .filter(Boolean)
      .forEach((id) => {
        lookupApi.store(id).then((store) => {
          if (active) setNames((prev) => (prev[id] ? prev : { ...prev, [id]: store?.name ?? `Cửa hàng #${id}` }));
        });
      });
    return () => {
      active = false;
    };
  }, [key]);

  return names;
}

export function storeLabel(names: Record<string, string>, storeId: string): string {
  return names[storeId] ?? `Cửa hàng #${storeId}`;
}
