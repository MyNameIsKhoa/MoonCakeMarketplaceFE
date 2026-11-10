import { FormEvent, useCallback, useEffect, useId, useState } from 'react';
import { Loader2, Plus, Search } from 'lucide-react';
import { productApi, type ProductSummaryResponse, type StoreResponse } from '../../services/api';
import { errorMessage } from '../../services/api/http';
import { formatVnd } from '../../utils/format';
import StatusBadge from '../../components/ui/StatusBadge';
import ProductDetailPanel from './ProductDetailPanel';
import {
  loadCategoryChoices, PRODUCT_STATUS, productFormErrors, type CategoryChoice, type FieldErrors, type ProductForm
} from './productCatalog';

interface ProductManagerProps {
  /** The supplier's own stores (storeApi.list({ mine: true })). */
  stores: StoreResponse[];
}

const CARD = 'bg-white rounded-2xl shadow-sm border border-gray-100 p-6';

/** Seller Center "Sản phẩm" tab: every product of the supplier (any status), create and open for editing. */
export default function ProductManager({ stores }: ProductManagerProps) {
  const [products, setProducts] = useState<ProductSummaryResponse[] | null>(null);
  const [listError, setListError] = useState('');
  const [categories, setCategories] = useState<CategoryChoice[] | null>(null);
  const [categoryError, setCategoryError] = useState('');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [openProductId, setOpenProductId] = useState<number | null>(null);

  const loadProducts = useCallback(() => productApi.all({ mine: true })
    .then((list) => {
      setProducts(list);
      setListError('');
    })
    .catch((err: unknown) => setListError(errorMessage(err))), []);

  useEffect(() => {
    void loadProducts();
    loadCategoryChoices().then(setCategories).catch((err: unknown) => setCategoryError(errorMessage(err)));
  }, [loadProducts]);

  const storeNames = new Map(stores.map((s) => [s.storeId, s.name]));
  const categoryNames = new Map((categories ?? []).map((c) => [c.categoryId, c.label]));
  const term = search.trim().toLowerCase();
  const visible = (products ?? []).filter((p) =>
    !term || p.name.toLowerCase().includes(term) || p.productCode.toLowerCase().includes(term));

  if (openProductId !== null) {
    return (
      <ProductDetailPanel
        key={openProductId}
        productId={openProductId}
        stores={stores}
        categories={categories}
        onBack={() => setOpenProductId(null)}
        onChanged={() => void loadProducts()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sản Phẩm Của Gian Hàng</h1>
          <p className="text-gray-500 text-sm mt-1">Mọi sản phẩm của bạn ở mọi trạng thái; mở một sản phẩm để sửa thông tin và biến thể</p>
        </div>
        {!creating && (
          <button type="button" className="mss-button mss-button--primary" onClick={() => setCreating(true)}>
            <Plus className="w-4 h-4" /> Thêm sản phẩm
          </button>
        )}
      </div>

      {categoryError && <p role="alert" className="mss-alert mss-alert--danger m-0">Không tải được danh mục: {categoryError}</p>}

      {creating && (
        <CreateProductForm
          stores={stores}
          categories={categories}
          onCancel={() => setCreating(false)}
          onCreated={(productId) => {
            setCreating(false);
            void loadProducts();
            setOpenProductId(productId);
          }}
        />
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-bold text-gray-900 text-sm">Danh sách sản phẩm {products ? `(${products.length})` : ''}</h3>
          <label className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="search"
              className="mss-input pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên hoặc mã sản phẩm…"
              aria-label="Tìm sản phẩm"
            />
          </label>
        </div>
        {listError && <p role="alert" className="p-4 m-0 text-red-700 text-sm">{listError}</p>}
        {!products && !listError && <p className="p-4 m-0 text-sm text-gray-500">Đang tải sản phẩm…</p>}
        {products && visible.length === 0 && (
          <p className="p-4 m-0 text-sm text-gray-500">
            {products.length === 0 ? 'Bạn chưa có sản phẩm nào. Bấm "Thêm sản phẩm" để bắt đầu.' : 'Không có sản phẩm phù hợp.'}
          </p>
        )}
        {visible.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 uppercase">
                  <th className="py-3 px-4 font-semibold">Sản phẩm</th>
                  <th className="py-3 px-4 font-semibold">Gian hàng</th>
                  <th className="py-3 px-4 font-semibold">Danh mục</th>
                  <th className="py-3 px-4 font-semibold text-right">Giá từ</th>
                  <th className="py-3 px-4 font-semibold text-center">Trạng thái</th>
                  <th className="py-3 px-4 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visible.map((p) => (
                  <tr key={p.productId}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {p.imageUrl
                          ? <img src={p.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                          : <span className="w-10 h-10 rounded-lg bg-gray-100 shrink-0" aria-hidden="true" />}
                        <span className="font-bold text-gray-900">
                          {p.name}
                          <span className="block text-xs text-gray-500 font-mono font-normal">{p.productCode}</span>
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{storeNames.get(p.storeId) ?? `#${p.storeId}`}</td>
                    <td className="py-3 px-4 text-gray-600">{categoryNames.get(p.categoryId) ?? `#${p.categoryId}`}</td>
                    <td className="py-3 px-4 text-right font-bold text-primary-700">
                      {p.minPrice === null ? <span className="font-normal text-gray-500">Chưa có biến thể đang bán</span> : formatVnd(p.minPrice)}
                    </td>
                    <td className="py-3 px-4 text-center"><StatusBadge map={PRODUCT_STATUS} status={p.status} /></td>
                    <td className="py-3 px-4 text-right">
                      <button type="button" className="mss-button mss-button--secondary mss-button--sm" onClick={() => setOpenProductId(p.productId)}>
                        Quản lý
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

interface CreateProductFormProps {
  stores: StoreResponse[];
  categories: CategoryChoice[] | null;
  onCancel: () => void;
  onCreated: (productId: number) => void;
}

function CreateProductForm({ stores, categories, onCancel, onCreated }: CreateProductFormProps) {
  const id = useId();
  // A SUSPENDED store cannot change its catalog (server answers 403).
  const usableStores = stores.filter((s) => s.status !== 'SUSPENDED');
  const [storeChoice, setStoreId] = useState('');
  const storeId = storeChoice || String(usableStores[0]?.storeId ?? '');
  const [form, setForm] = useState<ProductForm>({ name: '', categoryId: '', description: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found = productFormErrors(form);
    if (!storeId) found.storeId = 'Chọn gian hàng.';
    setErrors(found);
    setError('');
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    try {
      const created = await productApi.create({
        storeId: Number(storeId),
        categoryId: Number(form.categoryId),
        name: form.name.trim(),
        description: form.description.trim() || undefined
      });
      onCreated(created.productId);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className={`${CARD} space-y-4`} onSubmit={submit} noValidate>
      <div>
        <h3 className="font-bold text-gray-900 text-base m-0">Thêm sản phẩm mới</h3>
        <p className="text-sm text-gray-500 mt-1 mb-0">
          Sản phẩm mới ở trạng thái Nháp, chưa hiển thị với khách. Sau khi tạo, thêm biến thể để nhập giá, tồn kho và tải ảnh hoặc nhập đường dẫn ảnh.
        </p>
      </div>
      {usableStores.length === 0 && (
        <p role="alert" className="mss-alert mss-alert--warning m-0">
          Bạn chưa có gian hàng nào có thể thêm sản phẩm (gian hàng bị khóa không chỉnh sửa được danh mục).
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="mss-field">
          <label className="mss-label" htmlFor={`${id}-store`}>Gian hàng *</label>
          <select id={`${id}-store`} className="mss-select" value={storeId} onChange={(e) => setStoreId(e.target.value)}>
            {usableStores.length === 0 && <option value="">—</option>}
            {usableStores.map((s) => <option key={s.storeId} value={s.storeId}>{s.name}</option>)}
          </select>
          {errors.storeId && <p className="mss-field-error m-0">{errors.storeId}</p>}
        </div>
        <div className="mss-field">
          <label className="mss-label" htmlFor={`${id}-category`}>Danh mục *</label>
          <select
            id={`${id}-category`}
            className="mss-select"
            value={form.categoryId}
            disabled={!categories}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          >
            <option value="">{categories ? '— Chọn danh mục —' : 'Đang tải danh mục…'}</option>
            {categories?.map((c) => <option key={c.categoryId} value={c.categoryId}>{c.label}</option>)}
          </select>
          {errors.categoryId && <p className="mss-field-error m-0">{errors.categoryId}</p>}
        </div>
        <div className="mss-field md:col-span-2">
          <label className="mss-label" htmlFor={`${id}-name`}>Tên sản phẩm *</label>
          <input
            id={`${id}-name`}
            className="mss-input"
            maxLength={255}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          {errors.name && <p className="mss-field-error m-0">{errors.name}</p>}
        </div>
        <div className="mss-field md:col-span-2">
          <label className="mss-label" htmlFor={`${id}-description`}>Mô tả</label>
          <textarea
            id={`${id}-description`}
            className="mss-textarea"
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
      </div>
      {error && <p role="alert" className="mss-alert mss-alert--danger m-0">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className="mss-button mss-button--secondary" onClick={onCancel} disabled={saving}>Hủy</button>
        <button type="submit" className="mss-button mss-button--primary" disabled={saving || usableStores.length === 0}>
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} Tạo sản phẩm
        </button>
      </div>
    </form>
  );
}
