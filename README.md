# MoonCake Market Frontend

React/Vite frontend của MSS Mooncake Marketplace. Yêu cầu Node.js 22+.

```powershell
npm install
npm run dev
```

API mặc định đi qua Gateway `http://localhost:8080`; có thể đặt `VITE_API_BASE_URL` trong `.env.local`. Chạy Identity, Catalog, Commerce và Gateway trước khi thử giỏ hàng/checkout. `npm run lint` kiểm tra TypeScript; `npm run build` tạo bản production.

Catalog, sản phẩm, giỏ hàng, địa chỉ, checkout và đơn hàng TV3 dùng API thật. Khi Catalog lỗi, giao diện báo và hiển thị mẫu, nhưng sản phẩm mẫu không thể checkout. B2B/RFQ và vài tab người bán vẫn là mock.

Checkout lấy toàn bộ giỏ trên server và phí giao hàng cố định theo store. “Đã tạo đơn” chưa phải “đã thanh toán”; mỗi seller order có khoản PayOS riêng. Nếu request bị gián đoạn, thử lại trên cùng màn hình để giữ `Idempotency-Key`.
