import { useEffect, useState } from 'react';
import { productApi, type ProductSummaryResponse, type VariantResponse } from '../../../services/api';
import { errorMessage } from '../../../services/api/http';
import { formatVnd } from '../../../utils/format';

interface Props {
  storeId: string;
  onSelect: (product: ProductSummaryResponse, variant: VariantResponse) => void;
}

export default function QuotationCatalogPicker({ storeId, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [products, setProducts] = useState<ProductSummaryResponse[]>([]);
  const [product, setProduct] = useState<ProductSummaryResponse | null>(null);
  const [variants, setVariants] = useState<VariantResponse[] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeId || product) return;
    let current = true;
    const timer = window.setTimeout(() => {
      productApi.search({ storeId: Number(storeId), q: query.trim(), page, size: 12, sort: 'name,asc' })
        .then(result => {
          if (!current) return;
          setProducts(previous => page === 0 ? result.items : [...previous, ...result.items]);
          setTotalPages(result.totalPages);
        })
        .catch(e => { if (current) setError(errorMessage(e)); })
        .finally(() => { if (current) setLoading(false); });
    }, page === 0 ? 250 : 0);
    return () => { current = false; window.clearTimeout(timer); };
  }, [page, product, query, storeId]);

  useEffect(() => {
    if (!product) return;
    let current = true;
    productApi.get(product.productId).then(detail => {
      if (!current) return;
      setVariants(detail.status === 'ACTIVE' ? detail.variants.filter(v => v.status === 'ACTIVE') : []);
    }).catch(e => { if (current) { setError(errorMessage(e)); setVariants([]); } });
    return () => { current = false; };
  }, [product]);

  if (!storeId) return <p className='text-sm text-gray-600'>Chọn gian hàng gửi báo giá trước.</p>;

  return <div className='mss-stack mb-4'>
    {error && <p role='alert' className='mss-field-error'>{error}</p>}
    {product ? <>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <strong>{product.name}</strong>
        <button type='button' className='mss-button mss-button--secondary mss-button--sm'
          onClick={() => { setProduct(null); setError(''); setPage(0); setLoading(true); }}>Đổi sản phẩm</button>
      </div>
      <p className='m-0 text-sm text-gray-600'>Chọn biến thể sản phẩm</p>
      {!variants ? <p role='status'>Đang tải biến thể…</p> : variants.length === 0 ?
        <p>Không có biến thể đang bán.</p> : <ul className='space-y-2 max-h-56 overflow-y-auto'>
          {variants.map(v => <li key={v.variantId}><button type='button'
            className='w-full text-left rounded-lg border border-gray-200 px-3 py-2 hover:border-primary-600'
            onClick={() => onSelect(product, v)}>
            <span className='block font-medium'>{v.variantName}</span>
            <span className='text-sm text-gray-600'>{v.sku} · Giá niêm yết {formatVnd(v.basePrice)}</span>
          </button></li>)}
        </ul>}
    </> : <>
      <p className='m-0 text-sm text-gray-600'>Chọn biến thể sản phẩm</p>
      <label className='mss-field'>Tìm sản phẩm trong gian hàng
        <input type='search' className='mss-input' value={query} onChange={event => {
          setQuery(event.target.value); setPage(0); setProducts([]); setError(''); setLoading(true);
        }} />
      </label>
      <ul className='space-y-2 max-h-56 overflow-y-auto'>
        {products.map(item => <li key={item.productId}><button type='button'
          className='flex w-full items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-left hover:border-primary-600'
          onClick={() => { setProduct(item); setVariants(null); setError(''); }}>
          {item.imageUrl && <img src={item.imageUrl} alt='' className='h-9 w-9 rounded object-cover' />}
          {item.name}
        </button></li>)}
      </ul>
      {loading ? <p role='status'>Đang tải sản phẩm…</p> : !error && products.length === 0 ?
        <p>Không tìm thấy sản phẩm đang bán.</p> : null}
      {page + 1 < totalPages && <button type='button' disabled={loading}
        className='mss-button mss-button--secondary mss-button--sm self-start'
        onClick={() => { setError(''); setLoading(true); setPage(n => n + 1); }}>Xem thêm sản phẩm</button>}
    </>}
  </div>;
}
