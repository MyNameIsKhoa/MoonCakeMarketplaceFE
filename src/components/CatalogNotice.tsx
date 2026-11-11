import { useCatalog } from '../context/CatalogContext';

export default function CatalogNotice() {
  const { source, error, reload } = useCatalog();
  if (source === 'loading') return <p role="status">Đang tải danh mục…</p>;
  if (!error) return null;
  return <div role="alert" className="mss-alert mss-alert--danger">
    {error} <button className="mss-button mss-button--secondary mss-button--sm ml-2" onClick={reload}>Thử lại</button>
  </div>;
}
