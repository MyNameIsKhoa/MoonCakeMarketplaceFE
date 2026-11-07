import { useCatalog } from '../context/CatalogContext';

export default function CatalogNotice() {
  const { source, error, reload } = useCatalog();
  if (source === 'mock') return <p role="status" className="mss-alert">Chế độ demo — dữ liệu sản phẩm, gian hàng và thống kê mẫu.</p>;
  if (source === 'loading') return <p role="status">Đang tải danh mục…</p>;
  if (!error) return null;
  return <div role="alert" className="mss-alert mss-alert--danger">
    {error} <button className="underline" onClick={reload}>Thử lại</button>
  </div>;
}
