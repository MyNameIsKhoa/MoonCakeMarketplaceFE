import { X, ShoppingBag, Trash2, Plus, Minus, ArrowRight, Store } from 'lucide-react';
import { CartItem } from '../types';
import { formatVnd } from '../utils/format';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onProceedCheckout: () => void;
}

export default function CartDrawer({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onProceedCheckout
}: CartDrawerProps) {
  if (!isOpen) return null;

  // Listed-price estimate only; promotions and shipping are priced by the backend at checkout.
  const estimatedSubtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const groups = items.reduce<Record<string, { storeName: string; items: CartItem[] }>>((acc, item) => {
    const key = item.product.brandId;
    acc[key] ??= { storeName: item.product.brandName, items: [] };
    acc[key].items.push(item);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 bg-black/50 animate-fadeIn" onClick={onClose}>
      <aside
        className="absolute inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
        aria-label="Giỏ hàng"
      >
        <div className="bg-primary-800 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-accent-300" />
            <h2 className="text-lg font-bold">Giỏ hàng ({items.length})</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition" aria-label="Đóng giỏ hàng">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          {items.length === 0 ? (
            <div className="mss-empty">
              <p className="text-lg font-semibold text-gray-900">Giỏ hàng đang trống</p>
              <p className="text-sm">Hãy chọn những hộp bánh trung thu bạn yêu thích.</p>
              <button onClick={onClose} className="mss-button mss-button--primary">
                Khám phá sản phẩm
              </button>
            </div>
          ) : (
            Object.entries(groups).map(([storeId, group]) => (
              <section key={storeId} className="flex flex-col gap-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Store className="w-4 h-4 text-primary-700" />
                  {group.storeName}
                </h3>
                {group.items.map((item) => (
                  <div key={item.id} className="flex gap-3 p-3 border border-gray-200 rounded-xl">
                    <img src={item.product.image} alt={item.product.name} className="w-20 h-20 aspect-square object-cover rounded-lg" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 text-sm line-clamp-2">{item.product.name}</h4>
                      <p className="text-sm text-gray-500 mt-1">{item.sugarLevel}</p>
                      <p className="mss-price text-sm mt-1">{formatVnd(item.product.price * item.quantity)}</p>

                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center border border-gray-300 rounded-lg">
                          <button
                            onClick={() => onUpdateQuantity(item.id, -1)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-l-lg"
                            aria-label="Giảm số lượng"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="px-3 text-sm font-semibold">{item.quantity}</span>
                          <button
                            onClick={() => onUpdateQuantity(item.id, 1)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-r-lg"
                            aria-label="Tăng số lượng"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <button
                          onClick={() => onRemoveItem(item.id)}
                          className="p-2 text-gray-500 hover:text-red-600 transition"
                          aria-label="Xóa khỏi giỏ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </section>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-gray-200 p-5 bg-gray-50 flex flex-col gap-3">
            <div className="flex justify-between text-base">
              <span className="text-gray-700">Tạm tính (giá niêm yết)</span>
              <span className="mss-price">{formatVnd(estimatedSubtotal)}</span>
            </div>
            <p className="text-sm text-gray-500">
              Khuyến mãi của gian hàng và phí vận chuyển được hệ thống tính ở bước thanh toán.
            </p>
            <button
              onClick={() => {
                onProceedCheckout();
                onClose();
              }}
              className="mss-button mss-button--primary mss-button--full"
            >
              Tiến hành thanh toán
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
