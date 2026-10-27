import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { errorMessage } from '../../../services/api/http';
import { lookupApi } from '../api';
import type { StoreInfo } from '../types';
import { ErrorBlock, LoadingRows } from './ui';

/** Backend limit (CreateRfqRequest.targetStoreIds). */
export const MAX_TARGET_STORES = 20;

interface TargetStorePickerProps {
  selected: string[];
  onChange: (storeIds: string[]) => void;
  error?: string;
}

/** Checklist of ACTIVE stores the buyer sends a private RFQ to. */
export default function TargetStorePicker({ selected, onChange, error }: TargetStorePickerProps) {
  const [stores, setStores] = useState<StoreInfo[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');

  const load = () => {
    setLoadError('');
    lookupApi
      .activeStores()
      .then(setStores)
      .catch((e) => setLoadError(errorMessage(e)));
  };
  useEffect(load, []);

  const toggle = (storeId: string) =>
    onChange(selected.includes(storeId) ? selected.filter((id) => id !== storeId) : [...selected, storeId]);

  const term = query.trim().toLowerCase();
  const visible = (stores ?? []).filter((s) => !term || s.name.toLowerCase().includes(term));
  const full = selected.length >= MAX_TARGET_STORES;

  return (
    <div className="mss-stack" aria-describedby={error ? 'rfq-targets-error' : undefined}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Tìm cửa hàng</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
          <input className="mss-input pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm cửa hàng…" />
        </label>
        <span className="text-sm text-gray-600" aria-live="polite">
          Đã chọn {selected.length}/{MAX_TARGET_STORES}
        </span>
      </div>
      {loadError ? (
        <ErrorBlock message={loadError} onRetry={load} />
      ) : !stores ? (
        <LoadingRows rows={3} label="Đang tải danh sách cửa hàng…" />
      ) : visible.length === 0 ? (
        <p className="m-0 text-sm text-gray-500">Không có cửa hàng phù hợp.</p>
      ) : (
        <ul className="m-0 max-h-64 list-none divide-y divide-[var(--mss-border)] overflow-y-auto rounded-xl border border-[var(--mss-border)] p-0">
          {visible.map((store) => {
            const id = String(store.storeId);
            const checked = selected.includes(id);
            return (
              <li key={id}>
                <label className={`flex items-center gap-3 px-3 py-2 ${!checked && full ? 'opacity-50' : 'cursor-pointer'}`}>
                  <input type="checkbox" checked={checked} disabled={!checked && full} onChange={() => toggle(id)} />
                  <span className="min-w-0 truncate">{store.name}</span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
      {error && (
        <p className="mss-field-error m-0" id="rfq-targets-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
