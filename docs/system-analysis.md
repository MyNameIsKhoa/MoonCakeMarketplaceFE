# System Analysis — MSS Mooncake Marketplace (Web & Backend → Flutter Mobile)

## 1. Tổng quan Kiến trúc Hệ thống (System Architecture Overview)

Dự án **MSS Mooncake Marketplace (MooncakeHub)** là sàn thương mại điện tử đa gian hàng (Multi-vendor B2C & B2B Marketplace) chuyên biệt cho bánh Trung thu, được thiết kế theo kiến trúc **Microservices qua API Gateway**:

| Thành phần | Port mặc định | Công nghệ | Cơ sở dữ liệu | Trách nhiệm cốt lõi |
|---|---:|---|---|---|
| **API Gateway** | `8080` | Spring Boot, Spring Cloud Gateway WebMVC, Spring WebSocket Proxy | Stateless | Điểm truy cập duy nhất cho client (`/api/**` và `/ws/chat`), xác thực chữ ký JWT (`HS256`), phân quyền route mức sơ bộ (`ROLE_CUSTOMER`, `ROLE_SUPPLIER`, `ROLE_ADMIN`), CORS. |
| **Identity Service (TV1)** | `8081` | Spring Boot, Spring Data JPA, Flyway, Spring Mail, Google Auth | SQL Server (`mss_identity`) | Đăng ký, đăng nhập (Email/Password & Google ID Token), xác minh email, đặt lại mật khẩu, hồ sơ cá nhân (`customer_profile`), sổ địa chỉ (`address`), đăng ký & xét duyệt nhà cung cấp (`supplier_profile`), thông báo in-app (`notification`). |
| **Catalog & Store Service (TV2)** | `8082` | Spring Boot, Spring Data JPA, Flyway | SQL Server (`mss_catalog_store`) | Quản lý gian hàng (`store`), chi nhánh (`store_branch`), cây danh mục (`category`), sản phẩm (`product`), biến thể & tồn kho (`product_variant`), giữ/hoàn kho (`stock_reservation`), chương trình khuyến mãi & bộ tính giá (`promotion`, `promotion_rule`). |
| **Commerce Service (TV3, TV5, TV6)** | `8083` | Spring Boot, Spring Data JPA + JDBC, Flyway, PayOS SDK | SQL Server (`mss_commerce`) | Giỏ hàng (`cart`, `cart_item`), tính giá giỏ hàng, đặt hàng mua lẻ (`checkout_attempt`, `customer_order`, `seller_order`), chuyển đổi đơn từ báo giá B2B, thanh toán PayOS (`customer_payment`, `payment`), hủy đơn (`cancellation`), khiếu nại (`dispute`), hoàn tiền (`refund`), đối soát & giải ngân (`settlement`), vận đơn nhiều đợt (`shipment`, `shipment_line`), nghiệm thu & đánh giá (`review`). |
| **RFQ & Negotiation Service (TV4)** | `8084` | Spring Boot, Spring Data JPA, Flyway, Spring WebSocket STOMP | SQL Server (`mss_rfq_negotiation`) | Yêu cầu báo giá B2B (`rfq`, `rfq_target_store`), báo giá nhiều phiên bản (`quotation`, `quotation_item`), chấp nhận báo giá & đồng bộ tạo đơn (`quotation_conversion`), hội thoại & chat thời gian thực (`conversation`, `message`, `conversation_read_state`). |
| **Frontend Web (`MoonCakeMarketplaceFE`)** | `3000` / `5173` | React 19, TypeScript, Vite, Tailwind CSS v4, Axios, Fetch, Native STOMP 1.2 | LocalStorage / SessionStorage | Giao diện người mua (Storefront, B2B RFQ, Đơn hàng, Tài khoản), Kênh Người Bán (Seller Center) và Quản trị sàn (Admin Center). Kèm Express proxy `server.ts` cho tính năng tùy chọn `/api/gemini/recommend`. |

---

## 2. Cơ chế Xác thực, Phân quyền & Phiên làm việc (Authentication & Authorization)

### 2.1. Cơ chế JWT (Stateless Bearer Token)
- **Không dùng Cookie/Session cho xác thực API**: Toàn bộ API xác thực qua header `Authorization: Bearer <accessToken>`.
- **Cấu trúc JWT Claims** (ký bằng `HS256` tại Identity Service):
  - `sub`: Email người dùng
  - `userId`: `Long` (ID tài khoản trong `app_user`)
  - `customerId`: `Long | null` (ID hồ sơ người mua trong `customer_profile`)
  - `roles`: `List<String>` gồm:
    - `ROLE_CUSTOMER`: Mọi tài khoản đều có.
    - `ROLE_SUPPLIER`: Chỉ cấp trong JWT khi tài khoản có `supplier_profile.verification_status == 'VERIFIED'` tại thời điểm đăng nhập.
    - `ROLE_ADMIN`: Cấp khi `userId` nằm trong biến môi trường `ADMIN_USER_IDS` của Identity Service.
  - `exp`: Thời điểm hết hạn (epoch seconds).
- **Quy tắc quan trọng khi thay đổi trạng thái Nhà cung cấp**:
  - Vì `roles` được đóng gói lúc cấp JWT, nếu một tài khoản được Admin duyệt lên `VERIFIED` sau khi đã đăng nhập, người dùng cần **đăng nhập lại** để nhận JWT mới có `ROLE_SUPPLIER`.
  - Đồng thời, các service nghiệp vụ (Catalog, Commerce, RFQ) luôn gọi nội bộ sang Identity Service để kiểm tra trạng thái `VERIFIED` trực tiếp trước khi cho phép thao tác ghi của Supplier.
- **Xử lý hết hạn / từ chối token**:
  - API Gateway trả `403` (hoặc `401` từ service) khi token hết hạn hoặc không hợp lệ.
  - Client kiểm tra `status === 401 || (status === 403 && (!token || isTokenExpired(token)))`: nếu đúng thì xóa token lưu trữ và đưa người dùng về màn hình Đăng nhập.

---

## 3. Phân tích Kỹ thuật Frontend Web (`MoonCakeMarketplaceFE`)

### 3.1. Cấu trúc điều hướng (Navigation)
- Web sử dụng điều hướng theo `activeTab` tại `src/App.tsx` kết hợp hai路徑 URL đặc biệt từ email link:
  - `/verify-email?token=...` → `VerifyEmail`
  - `/reset-password?token=...` → `ResetPassword`
  - Query `?finance=return|cancel` kết hợp `sessionStorage` (`financeCustomerOrderId` hoặc `financeSellerPaymentId`) → tự động mở `OrderTracking` và gọi API đối soát PayOS (`reconcileCustomer` / `reconcile`).
- Ba không gian giao diện tách biệt:
  1. **Storefront & Customer Portal** (có `Navbar` + `Footer` + `CartDrawer` + `AIAssistantModal`):
     - `home`, `stores`, `store-detail`, `products`, `detail`, `checkout`, `orders`, `b2b`, `profile`, `wishlist`, `payment-settlement`, `login`, `register`, `forgot-password`, `verify-email`, `reset-password`.
  2. **Seller Center (`seller-center`)**:
     - Nếu chưa là `ROLE_SUPPLIER` (`isSupplier === false`), hiển thị cổng `SupplierOnboarding` (đăng ký MST/tên công ty, xem trạng thái chờ duyệt/từ chối/tạm khóa, gửi lại hồ sơ).
     - Nếu đã là `ROLE_SUPPLIER`, mở giao diện quản lý riêng gồm 10 sub-tabs:
       - `tong-quan` (Dashboard KPI & 5 đơn mới nhất)
       - `ho-so-gian-hang` (Thông tin pháp lý, `StoreSettings`, `BranchManager`)
       - `san-pham` (`ProductManager` + `ProductDetailPanel` quản lý biến thể)
       - `khuyen-mai` (`PromotionManager` + `PromotionRulesEditor`)
       - `don-hang` & `van-chuyen` (Danh sách đơn, `SellerOrderDetail`, `SupplierShipmentManager`, `DisputePanel`)
       - `yeu-cau-bao-gia` (`RfqList` + `RfqDetail`)
       - `bao-gia-cua-toi` (`MyQuotations` + `RfqDetail`)
       - `tin-nhan` (`ConversationsView` + `ChatPanel` qua STOMP WebSocket)
       - `doanh-thu` (`SellerPayouts`)
  3. **Admin Center (`admin`)**:
     - Dành riêng cho `ROLE_ADMIN`, gồm 8 tabs:
       - `dashboard` (Metrics từ Identity, Commerce, RFQ)
       - `users` (Tra cứu/lọc tài khoản người dùng)
       - `suppliers` (`AdminSupplierReview`: duyệt/từ chối/tạm khóa/mở khóa supplier)
       - `stores` (`AdminCatalog kind="stores"`: chuyển trạng thái gian hàng, bao gồm `SUSPENDED`)
       - `categories` (`AdminCatalog kind="categories"`: cây danh mục, tạo mới, ẩn/hiện)
       - `cancellations` (`AdminCancellations`: xử lý yêu cầu hủy đơn, hủy link PayOS)
       - `disputes` (`AdminDisputes`: phân xử khiếu nại, tạo/xác nhận khoản hoàn tiền thủ công)
       - `finance` (`SellerPaymentSettlement`: tra cứu & xử lý tài chính/giải ngân theo mã đơn nhà bán)

### 3.2. Quản lý trạng thái & Lưu trữ cục bộ trên Web
- **AuthContext**: Lưu JWT trong `localStorage['mooncake.accessToken']`, tải `/api/users/me` và `/api/supplier-profile` khi khởi động.
- **CatalogContext**: Tải song song `/api/stores`, `/api/products`, `/api/categories` khi mở app, lọc sản phẩm có `minPrice !== null` và trạng thái `ACTIVE | OUT_OF_STOCK` thuộc gian hàng `ACTIVE`.
- **Wishlist**: Chưa có API backend; lưu cục bộ theo từng user tại `mooncake.wishlist.<userId>`.
- **Supplier Draft**: Khi người dùng chọn " Nhà cung cấp" lúc đăng ký tài khoản, lưu nháp `{ email, companyName, taxCode, autoSubmit }` vào `mooncake.supplierDraft` để sau khi xác minh email và đăng nhập lần đầu, màn hình `SupplierOnboarding` tự động gửi `POST /api/supplier-profile`.
- **Idempotency Keys**:
  - Checkout: giữ một `UUID` cho mỗi tổ hợp giỏ hàng + địa chỉ.
  - PayOS Initiate: giữ `UUID` trong `sessionStorage` theo `customer:<orderId>:<paymentId>` hoặc `seller:<paymentId>:<status>` để nếu mạng chập chờn thì gọi lại không tạo giao dịch trùng.
  - RFQ Quotation / Accept / Finance Commands: giữ `UUID` theo payload.

### 3.3. Thiết kế Giao diện & Design Tokens (`src/styles/global.css`)
- **Màu sắc chủ đạo (Festive Mid-Autumn Palette)**:
  - Primary (Brand Red): `#B91C1C` (`primary-700`), `#991B1B` (`primary-800`), `#7F1D1D` (`primary-900`), `#450A0A` (`primary-950`), `#FEF2F2` (`primary-50`).
  - Accent (Mid-Autumn Gold): `#F59E0B` (`accent-500`), `#FBBF24` (`accent-400`), `#D97706` (`accent-600`), `#92400E` (`accent-800`), `#FFFBEB` (`accent-50`).
  - Admin Theme Override: `#1D4ED8` (`blue-700`), `#1E3A8A` (`blue-950`).
  - Nền & Bề mặt: Background `#FFFBF7`, Surface `#FFFFFF`, Text `#1F1A17`, Muted `#5F5853`, Border `#EADFD4`.
  - Semantic Status Colors:
    - Success: `#1E7A46` / nền `#E6F4EC`
    - Warning: `#8A5A00` / nền `#FDF3DC`
    - Danger: `#B42318` / nền `#FDECEA`
    - Info: `#1D4ED8` / nền `#EFF6FF`
- **Typography & Spacing**:
  - Font: `Inter` / System Sans-serif.
  - Cỡ chữ: `12px` (`xs`), `14px` (`sm`), `16px` (`md`), `18px` (`lg`), `22px` (`xl`), `28px` (`2xl`).
  - Bo góc: `8px` (`sm`), `12px` (`md`), `16px` (`lg`). Chiều cao control chuẩn: `44px`.

---

## 4. Các Đặc điểm Kỹ thuật Quan trọng khi Chuyển sang Flutter Mobile

1. **Định dạng ID và Tiền tệ giữa các Service**:
   - `Identity`, `Catalog`, `Commerce`: dùng kiểu số (`number` / `int` / `double` nguyên VND).
   - `RFQ & Negotiation`: dùng chuỗi thập phân (`string`) cho cả ID (`rfqId`, `quotationId`, `conversationId`, `messageId`) và tiền (`totalAmount`, `unitPrice`, `shippingFee`, `depositPercent`).
   - Flutter Data Layer phải parse an toàn cả `int`/`String` và `num`/`String` cho các DTO liên quan.
2. **Định dạng Thời gian (Date/Time)**:
   - Backend lưu và trả `LocalDateTime` ở múi giờ **UTC** nhưng `Identity`, `Catalog`, `Commerce` serialize không có hậu tố `Z` (ví dụ `"2026-10-10T09:15:00"`), trong khi `RFQ` có hậu tố `Z`.
   - Quy tắc chuẩn: Chuỗi có `T` mà không có offset (`Z` hoặc `±HH:mm`) phải được nối `Z` trước khi `DateTime.parse(...)` rồi `.toLocal()` để hiển thị đúng giờ Việt Nam (`UTC+7`). Chuỗi chỉ có ngày (`YYYY-MM-DD`) giữ nguyên ngày lịch.
3. **Hình ảnh Sản phẩm & Gian hàng**:
   - Dữ liệu seed trong DB dùng đường dẫn tương đối `/images/demo/...` (vốn nằm trong `MoonCakeMarketplaceFE/public/images/demo/...`), còn dữ liệu người bán nhập mới là URL `https://...`.
   - Giải pháp trên Flutter Mobile: Đóng gói bộ ảnh `public/images/demo/**` vào `assets/images/demo/**` của Flutter; tạo widget `MssImage` tự động dùng `Image.asset` khi path bắt đầu bằng `/images/demo/` và dùng `Image.network` khi là `http(s)://`, kèm ảnh fallback khi lỗi.
4. **WebSocket Chat (`ws://<gateway>/ws/chat`)**:
   - Sử dụng giao thức **STOMP 1.2** qua WebSocket thuần (không dùng SockJS).
   - Xác thực qua frame `CONNECT` với header `Authorization: Bearer <token>` (tuyệt đối không truyền token trên query string vì Gateway sẽ chặn với `400 Bad Request`).
   - Khi kết nối từ Flutter Mobile, truyền header `Origin` hợp lệ (khớp cấu hình `CORS_ALLOWED_ORIGINS` của Gateway, mặc định `http://localhost:5173`) trong HTTP Upgrade request để vượt qua `OriginHandshakeInterceptor` của Gateway và RFQService mà không cần sửa Backend.
5. **Thanh toán PayOS trên Mobile**:
   - Không bao giờ coi việc mở trình duyệt hoặc redirect về là đã thanh toán thành công.
   - Trên Mobile: hiển thị mã QR (từ `qrCode` hoặc mở `checkoutUrl` bằng In-App Browser / External Browser qua `url_launcher`), và khi người dùng quay lại ứng dụng (`AppLifecycleState.resumed`) hoặc bấm nút **"Đối soát PayOS / Tôi đã thanh toán"**, ứng dụng gọi API `reconcileCustomer` (đơn lẻ) hoặc `reconcile` (đơn RFQ) để xác nhận trạng thái thực tế từ PayOS.
6. **Upload File / Minh chứng (Evidence & Images)**:
   - Backend hiện **không dùng multipart file upload**; toàn bộ ảnh (logo, banner, biến thể) và bằng chứng khiếu nại/hoàn tiền/giải ngân (`evidenceUrl`) đều nhận chuỗi URL (`https://...` hoặc đường dẫn ảnh). Mobile giữ đúng contract URL input kèm kiểm tra định dạng `https://`.
