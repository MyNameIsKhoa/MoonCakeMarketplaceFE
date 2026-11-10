# Feature Inventory — MSS Mooncake Marketplace

Danh mục đầy đủ toàn bộ tính năng hiện có trên hệ thống Web (`MoonCakeMarketplaceFE`) và Backend (`MoonCakeMarketplaceBE`), phân loại theo phân hệ nghiệp vụ.

---

## 1. Xác thực & Quản lý Tài khoản (Identity — TV1)

| Mã | Tính năng | Mô tả chi tiết & Quy tắc nghiệp vụ | Role |
|---|---|---|---|
| **F-AUTH-01** | Đăng ký tài khoản | Đăng ký bằng Họ tên, Email, SĐT (tùy chọn), Mật khẩu (6–100 ký tự). Có tùy chọn loại tài khoản "Khách hàng" hoặc "Nhà cung cấp" (nếu chọn Nhà cung cấp thì nhập kèm Tên công ty & Mã số thuế, lưu nháp cục bộ để tự động gửi sau khi xác minh email & đăng nhập). Sau khi đăng ký, tài khoản ở trạng thái `emailVerified = false` và hệ thống gửi email xác minh. | Guest |
| **F-AUTH-02** | Xác minh Email & Gửi lại liên kết | Xác nhận token từ email (`POST /api/auth/email/verify`) hoặc yêu cầu gửi lại email xác minh (`POST /api/auth/email/verification-requests`) khi đăng nhập gặp lỗi `EMAIL_NOT_VERIFIED`. | Guest |
| **F-AUTH-03** | Đăng nhập Email / Mật khẩu | Đăng nhập nhận `accessToken` (JWT). Nếu tài khoản chưa xác minh email (`403 EMAIL_NOT_VERIFIED`), hiển thị nút gửi lại email xác minh ngay trên màn hình đăng nhập. Nếu bị khóa (`403 ACCOUNT_NOT_ACTIVE`), thông báo liên hệ quản trị. | Guest |
| **F-AUTH-04** | Đăng nhập bằng Google | Nhận Google ID Token (`idToken`), gửi `POST /api/auth/google`. Tự động tạo tài khoản khách hàng đã xác minh trong lần đầu tiên. | Guest |
| **F-AUTH-05** | Quên mật khẩu & Đặt lại mật khẩu | Yêu cầu gửi mã OTP 6 chữ số qua email (`POST /api/auth/password-reset-requests`, giới hạn 1 phút/lần, mã hết hạn sau 10 phút) và đặt mật khẩu mới bằng mã một lần (`POST /api/auth/password-resets`). | Guest |
| **F-AUTH-06** | Hồ sơ cá nhân | Xem và cập nhật Họ tên, Số điện thoại (`GET/PATCH /api/users/me`). Kiểm tra định dạng SĐT (`^\+?[0-9][0-9 .-]{6,28}[0-9]$`). Email không thể thay đổi. | Customer, Supplier, Admin |
| **F-AUTH-07** | Sổ địa chỉ nhận hàng | Danh sách địa chỉ, thêm mới, chỉnh sửa, xóa, đặt làm mặc định (`GET/POST/PATCH/DELETE /api/addresses`). Không cho phép bỏ chọn mặc định trực tiếp (phải chọn địa chỉ khác làm mặc định). Khi xóa địa chỉ mặc định, hệ thống tự chuyển mặc định sang địa chỉ cũ nhất còn lại. | Customer |
| **F-AUTH-08** | Đăng ký & Theo dõi Hồ sơ Nhà cung cấp (Supplier Onboarding) | Gửi hồ sơ công ty + mã số thuế (`POST /api/supplier-profile`). Xem trạng thái (`PENDING`, `VERIFIED`, `REJECTED`, `SUSPENDED`) và lý do quyết định của Admin. Nếu bị `REJECTED`, cho phép sửa và gửi lại (`PATCH /api/supplier-profile` đưa về `PENDING`). Nếu đã `VERIFIED` nhưng JWT chưa có `ROLE_SUPPLIER`, yêu cầu đăng nhập lại. | Customer (chưa là Supplier) |
| **F-AUTH-09** | Thông báo In-App (Notification Bell) | Hiển thị số thông báo chưa đọc (`/api/notifications/unread-count`, polling 30s), danh sách thông báo phân trang (`/api/notifications`), đánh dấu đã đọc từng thông báo hoặc tất cả (`/read`, `/read-all`), và điều hướng tới màn hình đích (`orders`, `b2b`, `messages`, `seller-center`) theo `target.kind` và `target.role`. | Customer, Supplier, Admin |

---

## 2. Khám phá Sàn, Gian hàng, Sản phẩm & Khuyến mãi (Storefront — TV2)

| Mã | Tính năng | Mô tả chi tiết & Quy tắc nghiệp vụ | Role |
|---|---|---|---|
| **F-CAT-01** | Trang chủ (Home) | Hero Banner, Danh mục Gian hàng đối tác (kèm lọc theo nhóm truyền thống / cao cấp / hiện đại / chay và tìm kiếm nhanh tên gian hàng), प्रत्येक thẻ gian hàng hiển thị tối đa 3 sản phẩm tiêu biểu, và lưới Danh mục bánh. | Public |
| **F-CAT-02** | Tìm kiếm nhanh & Danh sách Gian hàng | Tìm kiếm tức thì gian hàng & sản phẩm gợi ý trên thanh tìm kiếm; xem danh sách toàn bộ gian hàng đối tác đang `ACTIVE`. | Public |
| **F-CAT-03** | Chi tiết Gian hàng (`StoreDetail`) | Xem ảnh bìa, logo, mô tả, chương trình khuyến mãi đang hiệu lực của gian hàng, danh sách chi nhánh (`store_branch` với địa chỉ, SĐT, giờ mở cửa, chi nhánh chính), danh sách sản phẩm trong gian hàng (lọc theo danh mục, tìm từ khóa, sắp xếp giá tăng/giảm), và danh sách đánh giá của khách hàng về gian hàng (`GET /api/reviews?storeId=...`). | Public |
| **F-CAT-04** | Danh sách & Bộ lọc Sản phẩm (`ProductList`) | Duyệt toàn bộ sản phẩm đang bán, lọc theo từ khóa tìm kiếm, danh mục (`category`), gian hàng (`store`), khoảng giá (dưới 200k, 200k–500k, 500k–1tr, trên 1tr), sắp xếp theo mặc định / giá tăng dần / giá giảm dần. | Public |
| **F-CAT-05** | Chi tiết Sản phẩm (`ProductDetail`) | Xem bộ ảnh sản phẩm & biến thể, mô tả, chọn phân loại (`product_variant`), xem giá và trạng thái tồn kho theo từng phân loại, chọn số lượng, Thêm vào giỏ hàng, Mua ngay, chuyển sang Yêu cầu báo giá B2B, và xem danh sách đánh giá thực tế theo đúng `variantId` đang chọn (`GET /api/reviews?variantId=...`). | Public |
| **F-CAT-06** | Sản phẩm Yêu thích (Wishlist) | Lưu/bỏ lưu sản phẩm yêu thích theo từng `userId` trên thiết bị. Xem danh sách sản phẩm yêu thích trong Hồ sơ cá nhân. (Nếu chưa đăng nhập thì chuyển sang màn hình Đăng nhập). | Customer |
| **F-CAT-07** | Tra cứu Ưu đãi Gian hàng | Xem tất cả chương trình khuyến mãi đang hiệu lực trên sàn trong Hồ sơ cá nhân, hiển thị rõ quy tắc giảm (`Giảm X%`, `Giảm Y ₫`, `Mua X tặng Y`), thời hạn áp dụng, và bấm vào để mở gian hàng tương ứng. | Customer |
| **F-CAT-08** | Trợ lý AI Tư vấn Bánh & Trà | Nhập người nhận, khẩu vị, ngân sách, chế độ ăn để nhận gợi ý bánh, trà thưởng thức và lời chúc thiệp. *(Lưu ý: gọi `/api/gemini/recommend` trên Express server của Web)*. | Public |

---

## 3. Giỏ hàng, Đặt hàng Mua lẻ & Thanh toán PayOS (Commerce & Finance — TV3, TV5)

| Mã | Tính năng | Mô tả chi tiết & Quy tắc nghiệp vụ | Role |
|---|---|---|---|
| **F-COM-01** | Giỏ hàng (`CartDrawer`) | Xem các biến thể trong giỏ được nhóm theo từng gian hàng (`POST /api/cart/pricing`), tăng/giảm số lượng (`PATCH /api/cart/items/{id}`), xóa dòng hàng (`DELETE /api/cart/items/{id}`). Hiển thị riêng các dòng hàng ngừng bán (`unavailableItems`) để khách xóa trước khi thanh toán. Kiểm tra tồn kho thực tế khi thêm/cập nhật. | Customer |
| **F-COM-02** | Xem trước & Đặt hàng Mua lẻ (`Checkout`) | Chọn địa chỉ giao hàng từ sổ địa chỉ; xem chi tiết đơn tách theo từng nhà bán (tạm tính, chương trình khuyến mãi tự động áp dụng, phí vận chuyển cố định của từng gian hàng, tổng thanh toán). Chặn tự mua hàng của chính gian hàng mình (`SELF_PURCHASE_NOT_ALLOWED`). Gửi `POST /api/checkout` kèm `Idempotency-Key` để giữ kho (15 phút) và tạo `customer_order` + các `seller_order`. | Customer |
| **F-COM-03** | Thanh toán Tổng đơn Mua lẻ (Customer Order PayOS) | Khởi tạo link thanh toán PayOS cho toàn bộ `customer_order` (`POST /api/payments/customer-orders/{orderId}/initiate`), đối soát trạng thái (`reconcile`), hủy link (`cancel-link`). Tự động phân bổ tiền về các `seller_order` con khi thanh toán thành công. | Customer |
| **F-COM-04** | Hủy ngay Đơn chưa thanh toán | Cho phép khách hủy ngay đơn mua lẻ hoặc đơn RFQ khi chưa có khoản thanh toán nào thành công (`POST /api/payments/customer-orders/{orderId}/cancel-unpaid`), tự động hủy link PayOS (nếu có) và hoàn trả tồn kho đã giữ. | Customer |
| **F-COM-05** | Yêu cầu Hủy đơn đã thanh toán | Gửi yêu cầu hủy cho từng `seller_order` (`POST /api/payments/orders/{sellerOrderId}/cancellations` kèm lý do và `Idempotency-Key`) khi đơn chưa giao hàng. | Customer |

---

## 4. Theo dõi Đơn hàng, Giao nhận, Nghiệm thu, Đánh giá & Khiếu nại (Fulfillment & Dispute — TV5, TV6)

| Mã | Tính năng | Mô tả chi tiết & Quy tắc nghiệp vụ | Role |
|---|---|---|---|
| **F-FUL-01** | Danh sách & Chi tiết Đơn hàng của tôi (`OrderTracking`) | Lọc đơn theo trạng thái (`Tất cả`, `Đang xử lý`, `Đã giao / Hoàn tất`, `Hủy / Khiếu nại`). Xem địa chỉ snapshot, danh sách `seller_order`, các đợt thanh toán (`FULL`, `DEPOSIT`, `REMAINING`), danh sách kiện hàng (`shipments`) và chi tiết số lượng sản phẩm trong từng kiện (`shipment_line`). | Customer |
| **F-FUL-02** | Thanh toán Đơn từ Báo giá RFQ (Seller Order PayOS) | Với đơn `RFQ`, thanh toán từng đợt (`DEPOSIT` rồi đến `REMAINING`, hoặc `FULL` nếu cọc 0%) qua `POST /api/payments/{paymentId}/initiate` và đối soát qua `POST /api/payments/{paymentId}/reconcile`. Cảnh báo khi quá hạn thanh toán phần còn lại (`remainingDueAt`). | Customer |
| **F-FUL-03** | Nghiệm thu Đơn hàng (`OrderAcceptance`) | Khi `seller_order.status === 'DELIVERED'`, khách hàng xác nhận nghiệm thu (`POST /api/seller-orders/{sellerOrderId}/accept`). Ngoài ra hệ thống có job tự động nghiệm thu sau 7 ngày kể từ lúc giao nếu không có khiếu nại. | Customer |
| **F-FUL-04** | Đánh giá Sản phẩm (`ReviewModal`) | Sau khi đơn ở trạng thái `DELIVERED`, `ACCEPTED` hoặc `SETTLED`, khách được đánh giá 1–5 sao kèm nhận xét cho từng `orderItemId` (`POST /api/reviews`). Mỗi dòng đơn hàng đánh giá tối đa 1 lần. | Customer |
| **F-FUL-05** | Khiếu nại Đơn hàng (`DisputePanel`) | Khi đơn đã có thanh toán thành công và còn trong thời hạn khiếu nại (7 ngày sau khi giao hoặc khi quá hạn ngày giao hẹn), khách mở khiếu nại (`POST /api/payments/orders/{sellerOrderId}/disputes`), đính kèm link bằng chứng `https://`, bổ sung bằng chứng (`/evidence`), và yêu cầu Admin phân xử (`/escalate`) sau 48h hoặc sau khi nhà bán đã phản hồi. | Customer |

---

## 5. Cổng Doanh nghiệp B2B — RFQ, Báo giá & Thương lượng Thời gian thực (RFQ & Chat — TV4)

| Mã | Tính năng | Mô tả chi tiết & Quy tắc nghiệp vụ | Role |
|---|---|---|---|
| **F-RFQ-01** | Sàn Yêu cầu Báo giá & RFQ của tôi (`RfqList`) | Xem danh sách RFQ công khai (`mine=false`) hoặc RFQ do chính mình tạo (`mine=true`), lọc theo từ khóa `q` và trạng thái (`OPEN`, `CLOSED`, `CANCELLED`). | Customer, Supplier |
| **F-RFQ-02** | Đăng Yêu cầu Báo giá mới (`RfqCreateForm`) | Nhập tiêu đề, số lượng (1 – 1.000.000), ngân sách dự kiến, ngày giao mong muốn, địa điểm giao, yêu cầu in logo/tùy chỉnh, hạn nhận báo giá, và chọn phạm vi gửi: **Tất cả gian hàng** (`ALL`) hoặc **Chọn tối đa 20 gian hàng cụ thể** (`SELECTED_STORES`). | Customer |
| **F-RFQ-03** | Quản lý trạng thái RFQ (`RfqDetail`) | Chủ RFQ có thể Đóng nhận báo giá (`POST /api/rfqs/{id}/close`) hoặc Hủy RFQ (`POST /api/rfqs/{id}/cancel`) khi chưa có báo giá được chấp nhận. | Customer (Owner) |
| **F-RFQ-04** | So sánh & Phản hồi Báo giá (`QuotationCompare`, `QuotationDetail`) | Chủ RFQ xem và so sánh các báo giá từ các nhà cung cấp, xem chi tiết từng dòng hàng, tỷ lệ cọc, phí giao, hạn hiệu lực; Từ chối báo giá (`POST /api/quotations/{id}/reject`) hoặc Chấp nhận báo giá (`POST /api/quotations/{id}/accept` kèm `quotationVersion`, `addressId` và `Idempotency-Key`) để tự động chuyển thành đơn hàng bên Commerce. | Customer (Owner) |
| **F-RFQ-05** | Gửi Báo giá, Cập nhật Phiên bản & Rút Báo giá (`QuotationForm`, `MyQuotations`) | Nhà cung cấp đã `VERIFIED` chọn gian hàng `ACTIVE` của mình để gửi báo giá (`POST /api/rfqs/{rfqId}/quotations`), phát hành phiên bản báo giá mới (`POST /api/quotations/{id}/revisions` kèm `expectedVersion`) hoặc rút lại báo giá (`POST /api/quotations/{id}/cancel`). Kiểm tra quy tắc ngày giao phải cách hiện tại tối thiểu 4 ngày nếu có phần thanh toán còn lại (`depositPercent < 100`). | Supplier (`VERIFIED`) |
| **F-RFQ-06** | Hội thoại & Chat Thương lượng Thời gian thực (`ConversationsView`, `ChatPanel`) | Mở hoặc lấy hội thoại giữa Buyer và Supplier theo RFQ (`POST /api/rfqs/{rfqId}/conversations`), xem danh sách hội thoại (`/api/conversations`), đếm tin chưa đọc (`/api/conversations/unread-count`), đánh dấu đã đọc (`/read`), tải lịch sử tin nhắn theo cursor (`beforeMessageId` / `afterMessageId`), và gửi/nhận tin nhắn realtime qua STOMP WebSocket (`/ws/chat`: subscribe `/topic/conversations/{id}`, send `/app/conversations/{id}/messages` kèm `clientMessageId` chống trùng). | Customer, Supplier |

---

## 6. Kênh Người Bán (Seller Center — TV1, TV2, TV4, TV5, TV6)

| Mã | Tính năng | Mô tả chi tiết & Quy tắc nghiệp vụ | Role |
|---|---|---|---|
| **F-SEL-01** | Tổng quan Gian hàng (Seller Dashboard) | Thống kê số đơn cần xử lý, đơn đang giao, đơn chờ khách thanh toán, số RFQ đang mở trên sàn, và bảng 5 đơn hàng mới nhất. | Supplier (`VERIFIED`) |
| **F-SEL-02** | Quản lý Gian hàng (`StoreSettings`) | Tạo gian hàng mới (`POST /api/stores`, bắt đầu ở `DRAFT`), cập nhật tên, mô tả, logo URL, banner URL, phí vận chuyển cố định (`shippingFee`), và chuyển trạng thái `DRAFT → ACTIVE`, `ACTIVE ↔ INACTIVE`. | Supplier (`VERIFIED`) |
| **F-SEL-03** | Quản lý Chi nhánh (`BranchManager`) | Xem, thêm mới, sửa, xóa, đặt chi nhánh chính và bật/tắt trạng thái (`ACTIVE`/`INACTIVE`) cho các chi nhánh vật lý của từng gian hàng (`/api/stores/{storeId}/branches`). | Supplier (`VERIFIED`) |
| **F-SEL-04** | Quản lý Sản phẩm & Biến thể (`ProductManager`, `ProductDetailPanel`) | Tìm kiếm, tạo sản phẩm mới (`DRAFT`), sửa thông tin/danh mục, thêm và sửa biến thể (`sku`, `variantName`, `basePrice`, `stockQuantity`, `imageUrl`, `status`). Hướng dẫn quy trình 3 bước mở bán: Thêm biến thể → Chuyển biến thể sang `ACTIVE` → Chuyển sản phẩm sang `ACTIVE`. | Supplier (`VERIFIED`) |
| **F-SEL-05** | Quản lý Chương trình Khuyến mãi (`PromotionManager`, `PromotionRulesEditor`) | Xem, tạo mới, chỉnh sửa thời gian/tên, bật/tắt (`DRAFT → ACTIVE/DISABLED`, `ACTIVE ↔ DISABLED`) và cập nhật bộ điều kiện khuyến mãi (`PERCENT_DISCOUNT`, `FIXED_DISCOUNT`, `BUY_X_GET_Y`, tối đa 20 điều kiện/khuyến mãi). | Supplier (`VERIFIED`) |
| **F-SEL-06** | Quản lý Đơn hàng & Vận đơn nhiều đợt (`SellerOrderDetail`, `SupplierShipmentManager`) | Xem chi tiết đơn nhà bán, bảng tiến độ giao theo từng sản phẩm (`ordered`, `allocated`, `shipped`, `delivered`, `remaining`), tạo kiện hàng mới theo từng đợt/sản phẩm (`POST /api/shipments`), sửa vận đơn (`PATCH`), xác nhận đã gửi hàng (`/ship` — chỉ cho phép khi đã thu đủ tổng tiền đơn), hủy kiện chưa gửi (`/cancel`), xác nhận đã giao (`/delivered`). | Supplier (`VERIFIED`) |
| **F-SEL-07** | Phản hồi Khiếu nại của Khách (`DisputePanel` — role `seller`) | Xem hồ sơ khiếu nại của đơn hàng, gửi phản hồi chính thức cho người mua (`POST /api/payments/orders/{orderId}/disputes/{id}/respond`) và đính kèm link bằng chứng bổ sung (`/evidence`). | Supplier (`VERIFIED`) |
| **F-SEL-08** | Doanh thu & Giải ngân (`SellerPayouts`) | Xem tổng tiền đang chờ đủ điều kiện (`pendingAmount`), sẵn sàng giải ngân (`readyAmount`), đã giải ngân (`paidAmount`), và bảng chi tiết từng đơn hàng (đã thu, hoàn tiền, phí sàn, thực nhận, trạng thái giải ngân và lý do chặn giải ngân nếu có) qua `GET /api/payments/settlements/mine`. | Supplier (`VERIFIED`) |

---

## 7. Quản trị Sàn (Admin Center — Role `ROLE_ADMIN`)

| Mã | Tính năng | Mô tả chi tiết & Quy tắc nghiệp vụ | Role |
|---|---|---|---|
| **F-ADM-01** | Tổng quan Quản trị (Admin Dashboard) | Thống kê tổng số người dùng (`/api/admin/identity/metrics`), tổng số đơn hàng & doanh thu đã thu trong tháng (`/api/admin/commerce/metrics`), tổng số RFQ (`/api/admin/rfq/metrics`). | Admin |
| **F-ADM-02** | Quản lý Người dùng (`AdminCenter` — tab `users`) | Tra cứu danh sách người dùng theo email và lọc theo trạng thái (`PENDING`, `ACTIVE`, `INACTIVE`, `SUSPENDED`) có phân trang (`GET /api/admin/identity/users`). | Admin |
| **F-ADM-03** | Xét duyệt Hồ sơ Nhà cung cấp (`AdminSupplierReview`) | Xem danh sách hồ sơ theo trạng thái (`PENDING`, `VERIFIED`, `REJECTED`, `SUSPENDED`), thực hiện Duyệt (`VERIFIED`), Từ chối (`REJECTED`), Tạm khóa (`SUSPENDED`) hoặc Mở khóa (`VERIFIED`) kèm lý do bắt buộc (`POST /api/suppliers/{id}/verification`). | Admin |
| **F-ADM-04** | Quản lý Gian hàng toàn sàn (`AdminCatalog kind="stores"`) | Xem tất cả gian hàng ở mọi trạng thái (`GET /api/admin/catalog/stores`) và chuyển trạng thái (`ACTIVE`, `INACTIVE`, `SUSPENDED`) qua `PATCH /api/stores/{id}`. | Admin |
| **F-ADM-05** | Quản lý Cây Danh mục (`AdminCatalog kind="categories"`) | Xem toàn bộ cây danh mục gồm cả danh mục đang ẩn (`GET /api/admin/catalog/categories`), tạo danh mục gốc/con mới (`POST /api/categories`), ẩn hoặc kích hoạt lại danh mục (`PATCH /api/categories/{id}`). | Admin |
| **F-ADM-06** | Xử lý Yêu cầu Hủy đơn (`AdminCancellations`) | Xem danh sách yêu cầu hủy đang chờ (`GET /api/admin/commerce/cancellations`), hủy link PayOS đang treo, Chấp nhận hoặc Từ chối yêu cầu hủy (`POST /api/payments/orders/{orderId}/cancellations/{id}/decision`). | Admin |
| **F-ADM-07** | Phân xử Khiếu nại & Hoàn tiền (`AdminDisputes`) | Xem hàng đợi đơn có khiếu nại (`GET /api/admin/commerce/disputes`), chuyển sang phân xử (`/escalate`), ra quyết định Từ chối hoặc Chấp thuận hoàn tiền (`/decision`), tạo khoản hoàn thủ công từ giao dịch đang giữ (`/refunds`), và xác nhận đã chuyển khoản hoàn tiền kèm mã tham chiếu & chứng từ HTTPS (`/refunds/{id}/confirm`). | Admin |
| **F-ADM-08** | Đối soát & Giải ngân Nhà bán (`SellerPaymentSettlement`) | Tra cứu hồ sơ tài chính theo mã đơn nhà bán, tạo bản ghi đối soát giải ngân (`/settlements`), bắt đầu chuyển khoản (`/settlements/{id}/payout`), và xác nhận đã giải ngân kèm mã giao dịch & chứng từ HTTPS (`/settlements/{id}/confirm`). | Admin |
