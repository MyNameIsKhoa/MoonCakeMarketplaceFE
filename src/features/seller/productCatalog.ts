/**
 * Product/variant rules for the supplier catalog screens, mirroring CatalogStoreService
 * (ProductServiceImpl / ProductVariantServiceImpl and the Create/Update*Request DTOs).
 */
import { categoryApi, type CategoryResponse, type ProductStatus } from '../../services/api';
import type { StatusMeta } from '../../utils/status';

export const PRODUCT_STATUS: Record<string, StatusMeta> = {
  DRAFT: { label: 'Nháp', variant: 'neutral' },
  ACTIVE: { label: 'Đang bán', variant: 'success' },
  INACTIVE: { label: 'Tạm ẩn', variant: 'neutral' },
  OUT_OF_STOCK: { label: 'Hết hàng', variant: 'warning' }
};

/**
 * Statuses a product or variant can be given from `current` (current first, it means "no change").
 * Server rule for both: DRAFT → ACTIVE/INACTIVE, ACTIVE ↔ INACTIVE, never back to DRAFT,
 * OUT_OF_STOCK is never set by hand.
 */
export function statusChoices(current: ProductStatus): ProductStatus[] {
  return current === 'ACTIVE' || current === 'INACTIVE' ? ['ACTIVE', 'INACTIVE'] : [current, 'ACTIVE', 'INACTIVE'];
}

export interface CategoryChoice {
  categoryId: number;
  /** Full path, e.g. "Bánh truyền thống › Bánh nướng". */
  label: string;
}

async function listChildren(parentCategoryId?: number): Promise<CategoryResponse[]> {
  const first = await categoryApi.list({ parentCategoryId, page: 0, size: 100 });
  const rest = await Promise.all(Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, i) =>
    categoryApi.list({ parentCategoryId, page: i + 1, size: 100 })));
  return [first, ...rest].flatMap((page) => page.items);
}

/** Every ACTIVE category (roots and their children), parents first. Products need an ACTIVE category. */
export async function loadCategoryChoices(): Promise<CategoryChoice[]> {
  const seen = new Set<number>();
  const walk = async (parentId: number | undefined, prefix: string): Promise<CategoryChoice[]> => {
    const children = (await listChildren(parentId)).filter((c) => !seen.has(c.categoryId));
    children.forEach((c) => seen.add(c.categoryId));
    const branches = await Promise.all(children.map(async (c) => {
      const label = prefix ? `${prefix} › ${c.name}` : c.name;
      return [{ categoryId: c.categoryId, label }, ...await walk(c.categoryId, label)];
    }));
    return branches.flat();
  };
  return walk(undefined, '');
}

// ---------------------------------------------------------------------------
// Form validation (Vietnamese messages; the server answers English Bean Validation text)
// ---------------------------------------------------------------------------

export type FieldErrors = Record<string, string>;

export interface ProductForm {
  name: string;
  categoryId: string;
  description: string;
}

export function productFormErrors(form: ProductForm): FieldErrors {
  const errors: FieldErrors = {};
  const name = form.name.trim();
  if (!name) errors.name = 'Nhập tên sản phẩm.';
  else if (name.length > 255) errors.name = 'Tên sản phẩm tối đa 255 ký tự.';
  if (!form.categoryId) errors.categoryId = 'Chọn danh mục.';
  return errors;
}

export interface VariantForm {
  sku: string;
  variantName: string;
  basePrice: string;
  stockQuantity: string;
  imageUrl: string;
}

const MAX_INT = 2_147_483_647;

/** `changed` limits the checks to the fields being sent (edit sends only what changed). */
export function variantFormErrors(form: VariantForm, changed?: (field: keyof VariantForm) => boolean): FieldErrors {
  const check = (field: keyof VariantForm) => !changed || changed(field);
  const errors: FieldErrors = {};
  const sku = form.sku.trim();
  if (check('sku')) {
    if (!sku) errors.sku = 'Nhập mã SKU.';
    else if (sku.length > 100) errors.sku = 'SKU tối đa 100 ký tự.';
  }
  const name = form.variantName.trim();
  if (check('variantName')) {
    if (!name) errors.variantName = 'Nhập tên biến thể.';
    else if (name.length > 255) errors.variantName = 'Tên biến thể tối đa 255 ký tự.';
  }
  if (check('basePrice') && !/^\d{1,16}$/.test(form.basePrice.trim()))
    errors.basePrice = 'Giá bán là số nguyên đồng (VND) ≥ 0, không dùng dấu chấm hoặc phẩy.';
  const stock = form.stockQuantity.trim();
  if (check('stockQuantity') && (!/^\d{1,10}$/.test(stock) || Number(stock) > MAX_INT))
    errors.stockQuantity = 'Tồn kho là số nguyên ≥ 0.';
  const imageUrl = form.imageUrl.trim();
  if (check('imageUrl') && imageUrl) {
    if (imageUrl.length > 500) errors.imageUrl = 'Đường dẫn ảnh tối đa 500 ký tự.';
    else if (!/^(https?:\/\/|\/)\S+$/i.test(imageUrl))
      errors.imageUrl = 'Đường dẫn ảnh phải bắt đầu bằng http://, https:// hoặc /.';
  }
  return errors;
}
