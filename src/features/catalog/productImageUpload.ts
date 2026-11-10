import { http } from '../../services/api/http';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export interface ProductImageResponse {
  url: string;
  contentType: string;
  width: number;
  height: number;
  size: number;
}

export async function uploadProductImage(productId: number | null | undefined, file: File, signal?: AbortSignal) {
  if (!productId || !Number.isSafeInteger(productId) || productId < 1)
    throw new Error('Tạo sản phẩm trước khi tải ảnh cho biến thể.');
  if (!['image/jpeg', 'image/png'].includes(file.type))
    throw new Error('Chọn ảnh JPEG hoặc PNG. Không hỗ trợ SVG.');
  if (file.size === 0 || file.size > MAX_IMAGE_BYTES)
    throw new Error('Ảnh phải có dung lượng từ 1 byte đến 5 MiB.');
  const body = new FormData();
  body.append('file', file);
  return (await http.post<ProductImageResponse>(`/api/products/${productId}/images`, body, {
    // Let the browser supply the multipart boundary instead of the shared JSON default.
    headers: { 'Content-Type': undefined }, signal
  })).data;
}
