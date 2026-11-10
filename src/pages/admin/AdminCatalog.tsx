import { STORE_STATUS } from '../../utils/status';
import { useEffect, useMemo, useState } from 'react';
import { categoryApi, storeApi } from '../../services/api';
import { adminCatalogApi } from '../../services/api/adminCatalogApi';
import type { CategoryResponse, StoreResponse, StoreStatus } from '../../services/api/catalogTypes';

const transitions: Record<StoreStatus, StoreStatus[]> = {
  DRAFT: ['ACTIVE', 'INACTIVE'], ACTIVE: ['INACTIVE', 'SUSPENDED'],
  INACTIVE: ['ACTIVE', 'SUSPENDED'], SUSPENDED: ['ACTIVE', 'INACTIVE'],
};

interface CategoryRow { category: CategoryResponse; depth: number }

/** Cây danh mục theo parentCategoryId (cha trước, con thụt lề); danh mục mồ côi/chu trình xếp ở gốc. */
function toTreeRows(categories: CategoryResponse[]): CategoryRow[] {
  const ids = new Set(categories.map(c => c.categoryId));
  const children = new Map<number | null, CategoryResponse[]>();
  for (const c of categories) {
    const parent = c.parentCategoryId != null && ids.has(c.parentCategoryId) ? c.parentCategoryId : null;
    children.set(parent, [...(children.get(parent) ?? []), c]);
  }
  const rows: CategoryRow[] = [];
  const visited = new Set<number>();
  const visit = (parent: number | null, depth: number) => {
    for (const c of children.get(parent) ?? []) {
      if (visited.has(c.categoryId)) continue;
      visited.add(c.categoryId);
      rows.push({ category: c, depth });
      visit(c.categoryId, depth + 1);
    }
  };
  visit(null, 0);
  for (const c of categories) if (!visited.has(c.categoryId)) rows.push({ category: c, depth: 0 });
  return rows;
}

export default function AdminCatalog({ kind }: { kind: 'stores' | 'categories' }) {
  const [stores, setStores] = useState<StoreResponse[] | null>(null);
  const [categories, setCategories] = useState<CategoryResponse[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [parentId, setParentId] = useState('');

  useEffect(() => {
    let current = true;
    setError('');
    if (kind === 'stores') {
      adminCatalogApi.stores()
        .then(data => { if (current) setStores(data); })
        .catch(() => { if (current) setError('Không tải được gian hàng.'); });
    } else {
      adminCatalogApi.categories()
        .then(data => { if (current) setCategories(data); })
        .catch(() => { if (current) setError('Không tải được danh mục.'); });
    }
    return () => { current = false; };
  }, [kind, reload]);

  const rows = useMemo(() => toTreeRows(categories ?? []), [categories]);
  const byId = useMemo(() => new Map((categories ?? []).map(c => [c.categoryId, c])), [categories]);
  // Backend chỉ nhận danh mục cha đang ACTIVE.
  const parentOptions = rows.filter(r => r.category.status === 'ACTIVE');

  const updateStore = async (store: StoreResponse, status: StoreStatus) => {
    if (!window.confirm(`Chuyển ${store.name} sang trạng thái “${STORE_STATUS[status].label}”?`)) return;
    setBusy(true); setError('');
    try { await storeApi.update(store.storeId, { status }); setReload(n => n + 1); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không cập nhật được gian hàng.'); }
    finally { setBusy(false); }
  };

  const createCategory = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      await categoryApi.create({ name: name.trim(), slug: slug.trim(), parentCategoryId: parentId ? Number(parentId) : undefined });
      setName(''); setSlug(''); setParentId(''); setReload(n => n + 1);
    }
    catch (e) { setError(e instanceof Error ? e.message : 'Không tạo được danh mục.'); }
    finally { setBusy(false); }
  };

  const toggleCategory = async (category: CategoryResponse) => {
    const next = category.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (next === 'INACTIVE' && !window.confirm(`Ẩn danh mục ${category.name}? Sản phẩm thuộc danh mục này sẽ không còn hiển thị công khai.`)) return;
    setBusy(true); setError('');
    try { await categoryApi.update(category.categoryId, { status: next }); setReload(n => n + 1); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không cập nhật được danh mục.'); }
    finally { setBusy(false); }
  };

  return <div className="max-w-6xl mx-auto">
    <h2 className="text-2xl font-bold text-blue-950 mb-1">{kind === 'stores' ? 'Quản lý gian hàng' : 'Quản lý danh mục'}</h2>
    <p className="text-slate-500 mb-6">{kind === 'stores' ? 'Xem mọi gian hàng và kiểm soát trạng thái công bố.' : 'Danh mục dùng chung trên sàn, gồm cả danh mục đang ẩn.'}</p>
    {error && <p role="alert" className="text-red-700 mb-4">{error}</p>}
    {kind === 'stores' ? <div className="overflow-x-auto bg-white rounded-2xl border border-blue-100"><table className="w-full text-left text-sm"><thead className="bg-blue-50 text-blue-950"><tr><th className="p-4">Gian hàng</th><th className="p-4">Nhà cung cấp</th><th className="p-4">Trạng thái</th><th className="p-4">Thao tác</th></tr></thead><tbody>{stores?.map(store => <tr key={store.storeId} className="border-t border-blue-50"><td className="p-4 font-medium">{store.name}<span className="block text-slate-500">#{store.storeId}</span></td><td className="p-4">#{store.supplierIdRef}</td><td className="p-4">{STORE_STATUS[store.status]?.label ?? "Chưa xác định"}</td><td className="p-4"><div className="flex flex-wrap gap-2">{transitions[store.status].map(next => <button key={next} disabled={busy} onClick={() => void updateStore(store, next)} className="text-blue-700 border border-blue-200 rounded-lg px-3 py-1 hover:bg-blue-50 disabled:opacity-40">{{ ACTIVE: "Công bố", INACTIVE: "Ẩn gian hàng", SUSPENDED: "Tạm đình chỉ", DRAFT: "Đưa về nháp" }[next]}</button>)}</div></td></tr>)}</tbody></table>{stores?.length === 0 && <p className="p-4">Chưa có gian hàng.</p>}{!stores && !error && <p className="p-4">Đang tải…</p>}</div>
      : <>
        <form onSubmit={e => void createCategory(e)} className="flex flex-wrap gap-3 bg-white rounded-2xl border border-blue-100 p-4 mb-5">
          <input required maxLength={255} value={name} onChange={e => setName(e.target.value)} placeholder="Tên danh mục" aria-label="Tên danh mục" className="border rounded-lg px-3 py-2"/>
          <input required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={slug} onChange={e => setSlug(e.target.value)} placeholder="slug-danh-muc" aria-label="Slug danh mục" className="border rounded-lg px-3 py-2"/>
          <select value={parentId} onChange={e => setParentId(e.target.value)} aria-label="Danh mục cha" className="border rounded-lg px-3 py-2">
            <option value="">— Danh mục gốc —</option>
            {parentOptions.map(({ category: c, depth }) => <option key={c.categoryId} value={c.categoryId}>{`${'— '.repeat(depth)}${c.name}`}</option>)}
          </select>
          <button disabled={busy} className="bg-blue-700 text-white rounded-lg px-4 py-2 disabled:opacity-40">Tạo danh mục</button>
        </form>
        <div className="bg-white rounded-2xl border border-blue-100 divide-y">
          {rows.map(({ category: c, depth }) => {
            const parent = c.parentCategoryId != null ? byId.get(c.parentCategoryId) : undefined;
            const active = c.status === 'ACTIVE';
            return <div key={c.categoryId} className="p-4 flex flex-wrap justify-between items-center gap-3" style={{ paddingLeft: `${1 + depth * 1.5}rem` }}>
              <div>
                <b className={active ? '' : 'text-slate-500'}>{c.name}</b>
                <span className={`ml-2 text-xs rounded-full px-2 py-0.5 ${active ? 'bg-green-50 text-green-800' : 'bg-slate-100 text-slate-600'}`}>{active ? 'Đang hiển thị' : 'Đang ẩn'}</span>
                <span className="block text-sm text-slate-500">
                  {c.slug} · {parent ? `Thuộc: ${parent.name}` : 'Danh mục gốc'}
                  {active && parent?.status === 'INACTIVE' && ' (danh mục cha đang ẩn)'}
                </span>
              </div>
              <button disabled={busy} className="text-blue-700 border border-blue-200 rounded-lg px-3 py-1 hover:bg-blue-50 disabled:opacity-40" onClick={() => void toggleCategory(c)}>
                {active ? 'Ẩn' : 'Kích hoạt lại'}
              </button>
            </div>;
          })}
          {categories?.length === 0 && <p className="p-4">Chưa có danh mục.</p>}
          {!categories && !error && <p className="p-4">Đang tải…</p>}
        </div>
      </>}
  </div>;
}
