import { useEffect, useState } from 'react';
import { categoryApi, storeApi } from '../../services/api';
import { http } from '../../services/api/http';
import type { CategoryResponse, StoreResponse, StoreStatus } from '../../services/api/catalogTypes';

const transitions: Record<StoreStatus, StoreStatus[]> = {
  DRAFT: ['ACTIVE', 'INACTIVE'], ACTIVE: ['INACTIVE', 'SUSPENDED'],
  INACTIVE: ['ACTIVE', 'SUSPENDED'], SUSPENDED: ['ACTIVE', 'INACTIVE'],
};

export default function AdminCatalog({ kind }: { kind: 'stores' | 'categories' }) {
  const [stores, setStores] = useState<StoreResponse[] | null>(null);
  const [categories, setCategories] = useState<CategoryResponse[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');

  useEffect(() => {
    let current = true;
    setError('');
    if (kind === 'stores') {
      http.get<StoreResponse[]>('/api/admin/catalog/stores')
        .then(({ data }) => { if (current) setStores(data); })
        .catch(() => { if (current) setError('Không tải được gian hàng.'); });
    } else {
      categoryApi.all().then(data => { if (current) setCategories(data); })
        .catch(() => { if (current) setError('Không tải được danh mục.'); });
    }
    return () => { current = false; };
  }, [kind, reload]);

  const updateStore = async (store: StoreResponse, status: StoreStatus) => {
    if (!window.confirm(`Chuyển ${store.name} sang ${status}?`)) return;
    setBusy(true); setError('');
    try { await storeApi.update(store.storeId, { status }); setReload(n => n + 1); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không cập nhật được gian hàng.'); }
    finally { setBusy(false); }
  };

  const createCategory = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try { await categoryApi.create({ name: name.trim(), slug: slug.trim() }); setName(''); setSlug(''); setReload(n => n + 1); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không tạo được danh mục.'); }
    finally { setBusy(false); }
  };

  return <div className="max-w-6xl mx-auto">
    <h2 className="text-2xl font-bold text-blue-950 mb-1">{kind === 'stores' ? 'Quản lý gian hàng' : 'Quản lý danh mục'}</h2>
    <p className="text-slate-500 mb-6">{kind === 'stores' ? 'Xem mọi gian hàng và kiểm soát trạng thái công bố.' : 'Danh mục dùng chung trên sàn.'}</p>
    {error && <p role="alert" className="text-red-700 mb-4">{error}</p>}
    {kind === 'stores' ? <div className="overflow-x-auto bg-white rounded-2xl border border-blue-100"><table className="w-full text-left text-sm"><thead className="bg-blue-50 text-blue-950"><tr><th className="p-4">Gian hàng</th><th className="p-4">Nhà cung cấp</th><th className="p-4">Trạng thái</th><th className="p-4">Thao tác</th></tr></thead><tbody>{stores?.map(store => <tr key={store.storeId} className="border-t border-blue-50"><td className="p-4 font-medium">{store.name}<span className="block text-slate-500">#{store.storeId}</span></td><td className="p-4">#{store.supplierIdRef}</td><td className="p-4">{store.status}</td><td className="p-4"><div className="flex flex-wrap gap-2">{transitions[store.status].map(next => <button key={next} disabled={busy} onClick={() => void updateStore(store, next)} className="text-blue-700 border border-blue-200 rounded-lg px-3 py-1 hover:bg-blue-50 disabled:opacity-40">{next}</button>)}</div></td></tr>)}</tbody></table>{stores?.length === 0 && <p className="p-4">Chưa có gian hàng.</p>}{!stores && !error && <p className="p-4">Đang tải…</p>}</div>
      : <><form onSubmit={e => void createCategory(e)} className="flex flex-wrap gap-3 bg-white rounded-2xl border border-blue-100 p-4 mb-5"><input required maxLength={255} value={name} onChange={e => setName(e.target.value)} placeholder="Tên danh mục" aria-label="Tên danh mục" className="border rounded-lg px-3 py-2"/><input required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={slug} onChange={e => setSlug(e.target.value)} placeholder="slug-danh-muc" aria-label="Slug danh mục" className="border rounded-lg px-3 py-2"/><button disabled={busy} className="bg-blue-700 text-white rounded-lg px-4 py-2 disabled:opacity-40">Tạo danh mục</button></form><div className="bg-white rounded-2xl border border-blue-100 divide-y">{categories?.map(c => <div key={c.categoryId} className="p-4 flex flex-wrap justify-between gap-3"><div><b>{c.name}</b><span className="text-slate-500 ml-2">{c.slug} · {c.status}</span></div><button disabled={busy} className="text-blue-700 disabled:opacity-40" onClick={() => { setBusy(true); setError(''); void categoryApi.update(c.categoryId, { status: c.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }).then(() => setReload(n => n + 1)).catch(e => setError(e instanceof Error ? e.message : 'Không cập nhật được danh mục.')).finally(() => setBusy(false)); }}>{c.status === 'ACTIVE' ? 'Ẩn' : 'Hiện'}</button></div>)}{!categories && !error && <p className="p-4">Đang tải…</p>}</div></>}
  </div>;
}
