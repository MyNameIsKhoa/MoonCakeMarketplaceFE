# API Contract — MSS Mooncake Marketplace (Phạm vi Mobile Customer App)

Tài liệu đặc tả toàn bộ API từ `API-Gateway` (`http://localhost:8080` hoặc `http://10.0.2.2:8080` trên Android Emulator) phục vụ phân hệ **Khách hàng (`Guest` & `ROLE_CUSTOMER`)** trên ứng dụng Flutter Mobile.

---

## 1. Quy ước Chung (Global Conventions)

### 1.1. Base URL & Headers
- **Base URL**: `API_BASE_URL` (mặc định `http://10.0.2.2:8080` cho Android Emulator, `http://localhost:8080` cho iOS Simulator / Desktop).
- **Content-Type**: `application/json`
- **Authorization**: `Authorization: Bearer <accessToken>` (bắt buộc với các route `Customer`).
- **Idempotency-Key**: `Idempotency-Key: <UUID-v4>` (bắt buộc cho các lệnh đặt hàng, thanh toán, hủy đơn, mở khiếu nại, chấp nhận báo giá).

### 1.2. Cấu trúc Phản hồi Lỗi Chuẩn (`ApiErrorResponse`)
```json
{
  "timestamp": "2026-10-10T09:15:00",
  "status": 400,
  "error": "Bad Request",
  "code": "INSUFFICIENT_STOCK",
  "message": "Thông báo lỗi từ server",
  "path": "/api/checkout",
  "details": {
    "field": "Chi tiết lỗi từng trường (nếu có)"
  }
}
```

---

## 2. Identity Service APIs (`/api/auth`, `/api/users`, `/api/addresses`, `/api/notifications`)

### 2.1. Xác thực (`Public`)

| Method | Endpoint | Request Body | Response (`200`/`201`) | Mã lỗi nghiệp vụ chính |
|---|---|---|---|---|
| `POST` | `/api/auth/register` | `{ email, password, fullName, phoneNumber? }` | `UserProfile`: `{ userId, customerId, email, status, emailVerified, fullName, phoneNumber, createdAt, roles }` | `EMAIL_ALREADY_EXISTS`, `VALIDATION_ERROR` |
| `POST` | `/api/auth/login` | `{ email, password }` | `AuthResponse`: `{ accessToken, tokenType, expiresInSeconds, user: UserProfile }` | `INVALID_CREDENTIALS`, `EMAIL_NOT_VERIFIED` (`403`), `ACCOUNT_NOT_ACTIVE` (`403`) |
| `POST` | `/api/auth/google` | `{ idToken }` | `AuthResponse` | `GOOGLE_AUTH_NOT_CONFIGURED`, `INVALID_GOOGLE_TOKEN` |
| `POST` | `/api/auth/email/verification-requests` | `{ email }` | `{ message }` | `VALIDATION_ERROR` |
| `POST` | `/api/auth/email/verify` | `{ token }` | `{ message }` | `INVALID_VERIFICATION_TOKEN`, `VERIFICATION_TOKEN_EXPIRED`, `VERIFICATION_TOKEN_USED` |
| `POST` | `/api/auth/password-reset-requests` | `{ email }` | `{ message }` | `VALIDATION_ERROR` |
| `POST` | `/api/auth/password-resets` | `{ email, code, newPassword }` | `204 No Content` | `400` invalid input; `401` invalid, expired, used code or five failed attempts |

### 2.2. Hồ sơ Cá nhân & Sổ Địa chỉ (`ROLE_CUSTOMER`)

| Method | Endpoint | Request Body | Response | Ghi chú |
|---|---|---|---|---|
| `GET` | `/api/users/me` | — | `UserProfile` | Lấy thông tin tài khoản hiện tại |
| `PATCH` | `/api/users/me` | `{ fullName?, phoneNumber? }` | `UserProfile` | SĐT khớp regex `^\+?[0-9][0-9 .-]{6,28}[0-9]$` |
| `GET` | `/api/addresses` | — | `List<Address>` | Sắp xếp địa chỉ mặc định lên đầu |
| `POST` | `/api/addresses` | `{ recipientName, phone, province, district, ward, streetAddress, isDefault? }` | `Address` (`201`) | Địa chỉ đầu tiên tự động là mặc định |
| `PATCH` | `/api/addresses/{addressId}` | `{ recipientName?, phone?, province?, district?, ward?, streetAddress?, isDefault? }` | `Address` | Không cho phép truyền `isDefault: false` trực tiếp (`CANNOT_UNSET_DEFAULT_ADDRESS`) |
| `DELETE` | `/api/addresses/{addressId}` | — | `204 No Content` | Nếu xóa địa chỉ mặc định, tự động chuyển mặc định sang địa chỉ còn lại |

**Cấu trúc `Address`**:
```json
{
  "addressId": 10,
  "recipientName": "Nguyễn Văn A",
  "phone": "0901234567",
  "province": "TP. Hồ Chí Minh",
  "district": "Quận 1",
  "ward": "Phường Bến Nghé",
  "streetAddress": "123 Lê Lợi",
  "isDefault": true,
  "createdAt": "2026-10-01T08:00:00",
  "updatedAt": "2026-10-01T08:00:00"
}
```

### 2.3. Thông báo In-App (`ROLE_CUSTOMER`)

| Method | Endpoint | Query / Body | Response |
|---|---|---|---|
| `GET` | `/api/notifications` | `?page=0&size=15` | `{ items: List<NotificationItem>, page, size, totalElements, totalPages }` |
| `GET` | `/api/notifications/unread-count` | — | `{ unreadCount: number }` |
| `POST` | `/api/notifications/{notificationId}/read` | — | `NotificationItem` |
| `POST` | `/api/notifications/read-all` | — | `{ markedReadCount: number }` |

---

## 3. Catalog & Store Service APIs (`/api/stores`, `/api/categories`, `/api/products`, `/api/promotions`)

Toàn bộ API đọc danh mục dưới đây là `Public` (không bắt buộc đăng nhập):

| Method | Endpoint | Query Params | Response |
|---|---|---|---|
| `GET` | `/api/stores` | — | `List<StoreDto>`: `{ storeId, supplierUserId, name, slug, description, logoUrl, bannerUrl, shippingFee, status, createdAt, updatedAt }` |
| `GET` | `/api/stores/{storeId}` | — | `StoreDto` |
| `GET` | `/api/stores/{storeId}/branches` | — | `List<StoreBranchDto>`: `{ branchId, storeId, branchName, province, district, ward, streetAddress, phone, openingHours, isPrimary, status }` |
| `GET` | `/api/categories` | `?tree=false` (hoặc `true`) | `List<CategoryDto>`: `{ categoryId, parentCategoryId, name, slug, status, children }` |
| `GET` | `/api/products` | `?storeId=&categoryId=&q=` | `List<ProductSummaryDto>`: `{ productId, storeId, categoryId, categoryName, name, slug, description, status, minPrice, maxPrice, totalStock, imageUrl }` |
| `GET` | `/api/products/{productId}` | — | `ProductDetailDto`: kế thừa `ProductSummaryDto` + `variants: List<ProductVariantDto>` (`{ variantId, productId, sku, variantName, basePrice, stockQuantity, imageUrl, status }`) |
| `GET` | `/api/promotions` | `?storeId=` (tùy chọn) | `List<PromotionDto>`: `{ promotionId, storeId, name, status, startAt, endAt, rules: List<PromotionRuleDto> }` (`{ ruleId, ruleType, discountValue, minOrderAmount, buyQuantity, freeQuantity }`) |

---

## 4. Commerce Service APIs (`/api/cart`, `/api/checkout`, `/api/orders`, `/api/seller-orders`, `/api/shipments`, `/api/reviews`, `/api/payments`)

### 4.1. Giỏ hàng & Đặt hàng Mua lẻ (`ROLE_CUSTOMER`)

| Method | Endpoint | Headers / Body | Response | Mã lỗi nghiệp vụ chính |
|---|---|---|---|---|
| `GET` | `/api/cart` | — | `CartResponse`: `{ cartId, customerId, items: List<CartItemDto>, unavailableItems: List<UnavailableCartItemDto>, subtotal }` | — |
| `POST` | `/api/cart/items` | `{ variantId: number, quantity: number }` | `CartResponse` | `VARIANT_NOT_FOUND`, `PRODUCT_INACTIVE`, `INSUFFICIENT_STOCK` |
| `PATCH` | `/api/cart/items/{cartItemId}` | `{ quantity: number }` | `CartResponse` | `CART_ITEM_NOT_FOUND`, `INSUFFICIENT_STOCK` |
| `DELETE` | `/api/cart/items/{cartItemId}` | — | `CartResponse` | `CART_ITEM_NOT_FOUND` |
| `POST` | `/api/cart/pricing` | `{}` | `CartPricingPreviewResponse`: `{ customerId, groups: List<StoreGroup>, unavailableItems, subtotal, discountTotal, shippingTotal, grandTotal }` | `CART_EMPTY`, `CART_HAS_UNAVAILABLE_ITEMS` |
| `POST` | `/api/checkout` | Header `Idempotency-Key` + Body `{ addressId: number }` | `CustomerOrderResponse` | `ADDRESS_NOT_FOUND`, `SELF_PURCHASE_NOT_ALLOWED`, `INSUFFICIENT_STOCK`, `IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD` |

### 4.2. Đơn hàng, Vận đơn, Nghiệm thu & Đánh giá

| Method | Endpoint | Quyền | Request / Query | Response |
|---|---|---|---|---|
| `GET` | `/api/orders` | `ROLE_CUSTOMER` | — | `List<CustomerOrderResponse>` |
| `GET` | `/api/orders/{customerOrderId}` | `ROLE_CUSTOMER` | — | `CustomerOrderResponse` (gồm `addressSnapshot`, `totalAmount`, `status`, `sellerOrders: List<SellerOrderResponse>`) |
| `POST` | `/api/seller-orders/{sellerOrderId}/accept` | `ROLE_CUSTOMER` | — | `SellerOrderResponse` (chuyển `DELIVERED → ACCEPTED`) |
| `GET` | `/api/shipments` | `ROLE_CUSTOMER` | `?sellerOrderId=...` | `List<ShipmentResponse>` (kèm `lines: List<ShipmentLineResponse>`) |
| `GET` | `/api/reviews` | `Public` | `?storeId=&variantId=&orderId=` | `List<ReviewResponse>` (`{ reviewId, orderItemId, customerId, storeId, variantId, rating, comment, createdAt }`) |
| `POST` | `/api/reviews` | `ROLE_CUSTOMER` | `{ orderItemId, rating (1..5), comment }` | `ReviewResponse` (`201`, lỗi `REVIEW_ALREADY_EXISTS`, `ORDER_NOT_ELIGIBLE_FOR_REVIEW`) |

### 4.3. Thanh toán PayOS, Hủy đơn & Khiếu nại (`ROLE_CUSTOMER`)

| Method | Endpoint | Headers / Body | Response | Mô tả |
|---|---|---|---|---|
| `GET` | `/api/payments/customer-orders/{customerOrderId}` | — | `CustomerPaymentSnapshot` | Xem trạng thái thanh toán tổng đơn mua lẻ (`payment`, `allocations`) |
| `POST` | `/api/payments/customer-orders/{customerOrderId}/initiate` | `Idempotency-Key` | `CustomerPaymentRecord` | Tạo link PayOS (`checkoutUrl`, `qrCode`, `expiresAt`) cho tổng đơn mua lẻ |
| `POST` | `/api/payments/customer-orders/{customerOrderId}/reconcile` | — | `CustomerPaymentRecord` | Đối soát trạng thái thanh toán thực tế với PayOS |
| `POST` | `/api/payments/customer-orders/{customerOrderId}/cancel-link` | `{ reason? }` | `CustomerPaymentRecord` | Hủy link PayOS đang chờ của tổng đơn |
| `POST` | `/api/payments/customer-orders/{customerOrderId}/cancel-unpaid` | `{ reason? }` | `CustomerPaymentSnapshot` | Hủy ngay đơn chưa có khoản thanh toán nào thành công & hoàn kho giữ chỗ |
| `GET` | `/api/payments/orders/{sellerOrderId}` | — | `SellerOrderFinanceSnapshot` | Xem toàn bộ `payments`, `cancellations`, `disputes`, `refunds`, `settlements` của 1 `seller_order` |
| `POST` | `/api/payments/{paymentId}/initiate` | `Idempotency-Key` | `PaymentRecord` | Tạo link PayOS cho từng đợt thanh toán (`DEPOSIT`, `REMAINING`, `FULL`) của đơn B2B RFQ |
| `POST` | `/api/payments/{paymentId}/reconcile` | — | `PaymentRecord` | Đối soát đợt thanh toán đơn B2B RFQ với PayOS |
| `POST` | `/api/payments/{paymentId}/cancel-link` | `{ reason? }` | `PaymentRecord` | Hủy link PayOS của đợt thanh toán đơn B2B RFQ |
| `POST` | `/api/payments/orders/{sellerOrderId}/cancellations` | `Idempotency-Key` + `{ reason }` | `CancellationRecord` | Gửi yêu cầu hủy đơn đã thanh toán (chờ Admin duyệt) |
| `POST` | `/api/payments/orders/{sellerOrderId}/disputes` | `Idempotency-Key` + `{ reason, description, evidenceUrl? }` | `DisputeRecord` | Mở khiếu nại đơn hàng (trong 7 ngày sau khi giao hoặc khi trễ hạn giao) |
| `POST` | `/api/payments/orders/{sellerOrderId}/disputes/{disputeId}/evidence` | `{ evidenceUrl, note? }` | `DisputeRecord` | Bổ sung bằng chứng HTTPS cho khiếu nại đang mở |
| `POST` | `/api/payments/orders/{sellerOrderId}/disputes/{disputeId}/escalate` | `{ note? }` | `DisputeRecord` | Chuyển khiếu nại lên Admin phân xử (sau khi nhà bán phản hồi hoặc sau 48h) |

---

## 5. RFQ & Negotiation Service APIs (`/api/rfqs`, `/api/quotations`, `/api/conversations`, `/ws/chat`)

### 5.1. Yêu cầu Báo giá (RFQ) & Báo giá (Quotation) cho Khách hàng (`ROLE_CUSTOMER`)

| Method | Endpoint | Headers / Query / Body | Response |
|---|---|---|---|
| `GET` | `/api/rfqs` | `?mine=true|false&status=OPEN|CLOSED|CANCELLED&q=&page=0&size=12` | `PageResponse<RfqSummary>` |
| `POST` | `/api/rfqs` | `{ title, quantity, budgetAmount?, preferredDeliveryDate?, deliveryLocation?, customizationNotes?, expiresAt?, targetType: "ALL"|"SELECTED_STORES", targetStoreIds? }` | `RfqDetail` (`201`) |
| `GET` | `/api/rfqs/{rfqId}` | — | `RfqDetail` |
| `PATCH` | `/api/rfqs/{rfqId}` | Các trường cập nhật (khi RFQ đang `OPEN` và chưa có báo giá gửi) | `RfqDetail` |
| `POST` | `/api/rfqs/{rfqId}/close` | — | `RfqDetail` |
| `POST` | `/api/rfqs/{rfqId}/cancel` | — | `RfqDetail` |
| `GET` | `/api/rfqs/{rfqId}/quotations` | `?page=0&size=20` | `PageResponse<QuotationSummary>` (danh sách báo giá của các nhà bán cho RFQ của mình) |
| `GET` | `/api/quotations/{quotationId}` | — | `QuotationDetail` (kèm `items: List<QuotationItem>`) |
| `POST` | `/api/quotations/{quotationId}/reject` | — | `QuotationDetail` |
| `POST` | `/api/quotations/{quotationId}/accept` | Header `Idempotency-Key` + Body `{ quotationVersion: number, addressId: string }` | `AcceptQuotationResult`: `{ quotationId, quotationVersion, rfqStatus, commerceCustomerOrderId, commerceSellerOrderId, status, convertedAt }` |
| `GET` | `/api/quotations/{quotationId}/order` | — | `AcceptQuotationResult` |

### 5.2. Hội thoại & Chat Thương lượng (`ROLE_CUSTOMER`)

| Method | Endpoint | Query / Body | Response |
|---|---|---|---|
| `POST` | `/api/rfqs/{rfqId}/conversations` | `{ storeId: string }` | `ConversationSummary` (Mở hoặc lấy hội thoại giữa khách và gian hàng cho RFQ) |
| `GET` | `/api/conversations` | `?rfqId=&page=0&size=20` | `PageResponse<ConversationSummary>` |
| `GET` | `/api/conversations/unread-count` | — | `{ unreadCount: number }` |
| `POST` | `/api/conversations/{conversationId}/read` | `{ lastReadMessageId?: string }` | `ConversationSummary` |
| `GET` | `/api/conversations/{conversationId}/messages` | `?beforeMessageId=&afterMessageId=&size=30` | `MessageSlice`: `{ items: List<ChatMessage>, hasMore }` |

### 5.3. Giao thức WebSocket STOMP 1.2 (`ws://<gateway>/ws/chat`)
- **URL kết nối**: `ws://<host>:8080/ws/chat` (hoặc `wss://...`). Không truyền query string.
- **HTTP Handshake Header**: `Origin: http://localhost:5173` (để tương thích `OriginHandshakeInterceptor` hiện hành của Gateway/RFQService).
- **STOMP Frame `CONNECT`**:
  ```text
  CONNECT
  accept-version:1.2
  heart-beat:10000,10000
  Authorization:Bearer <accessToken>

  \0
  ```
- **STOMP Frame `SUBSCRIBE`**:
  - `destination:/topic/conversations/{conversationId}`
- **STOMP Frame `SEND`**:
  - `destination:/app/conversations/{conversationId}/messages`
  - `content-type:application/json`
  - Payload: `{"messageText":"...","clientMessageId":"<uuid>"}`
