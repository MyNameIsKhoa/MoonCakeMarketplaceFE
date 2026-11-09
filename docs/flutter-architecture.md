# Flutter Mobile Architecture — MSS Mooncake Marketplace (`MoonCakeMarketplaceMobile`)

Tài liệu kiến trúc kỹ thuật của ứng dụng Flutter Mobile dành cho phân hệ **Khách hàng (`Guest` & `Customer`)** kết nối chung Backend (`MoonCakeMarketplaceBE`) và cơ sở dữ liệu với phiên bản Web (`MoonCakeMarketplaceFE`).

---

## 1. Kiến trúc Phân lớp (Feature-First + Clean Architecture)

Dự án tại `MoonCakeMarketplaceMobile/` được tổ chức theo cấu trúc **Feature-First** kết hợp tách bạch giữa Core Infrastructure, Data Layer và Presentation Layer:

```text
MoonCakeMarketplaceMobile/
├── assets/
│   └── images/demo/                      # Bộ ảnh sản phẩm & gian hàng đồng bộ với Web
├── lib/
│   ├── main.dart                         # Điểm khởi chạy ứng dụng với ProviderScope
│   ├── app.dart                          # Shell 5 tabs + AppBar (Notification Bell & Cart Badge) + Auth Gate
│   ├── core/
│   │   ├── config/app_env.dart           # Quản lý API_BASE_URL, WS_URL, Origin Header và cấu hình động
│   │   ├── network/
│   │   │   ├── api_exception.dart        # Chuẩn hóa lỗi API & dịch mã lỗi nghiệp vụ sang tiếng Việt
│   │   │   └── dio_client.dart           # Dio HTTP Client + Bearer JWT Interceptor + 401/403 Expiry Handler
│   │   ├── storage/token_storage.dart    # FlutterSecureStorage (JWT) + SharedPreferences (Wishlist, Server URL)
│   │   ├── theme/mss_theme.dart          # Design System Đỏ Son (#B91C1C) & Vàng Thu (#F59E0B) đồng bộ Web
│   │   ├── utils/formatters.dart         # Định dạng tiền VND, chuẩn hóa UTC->VN DateTime, kiểm tra SĐT & JWT
│   │   └── widgets/mss_widgets.dart      # MssImage (Asset/Network), MssBadge, MssEmptyState, MssSectionHeader
│   └── features/
│       ├── auth/                         # Đăng nhập, Đăng ký, Xác minh Email, Quên/Đặt lại mật khẩu
│       │   ├── data/
│       │   │   ├── auth_models.dart
│       │   │   └── identity_api.dart
│       │   └── presentation/
│       │       ├── auth_controller.dart
│       │       └── auth_screens.dart
│       ├── catalog/                      # Trang chủ, Thương hiệu, Chi tiết Gian hàng, Sản phẩm, Khuyến mãi, Đánh giá
│       │   ├── data/
│       │   │   ├── catalog_models.dart
│       │   │   └── catalog_api.dart
│       │   └── presentation/
│       │       ├── catalog_controller.dart
│       │       └── catalog_screens.dart
│       ├── commerce/                     # Giỏ hàng, Tính giá khuyến mãi, Đặt hàng, PayOS QR, Đơn hàng, Vận đơn, Khiếu nại
│       │   ├── data/
│       │   │   ├── commerce_models.dart
│       │   │   └── commerce_api.dart
│       │   └── presentation/
│       │       ├── cart_controller.dart
│       │       └── commerce_screens.dart
│       ├── b2b_rfq/                      # Sàn B2B RFQ, Tạo/Đóng/Hủy RFQ, So sánh & Chốt Báo giá, Chat STOMP 1.2
│       │   ├── data/
│       │   │   ├── rfq_models.dart
│       │   │   ├── rfq_api.dart
│       │   │   └── stomp_chat_client.dart
│       │   └── presentation/
│       │       └── b2b_screens.dart
│       └── profile/                      # Hồ sơ cá nhân, Sổ địa chỉ nhận hàng, Yêu thích, Ưu đãi, Thông báo
│           └── presentation/
│               └── profile_screens.dart
└── test/
    └── widget_test.dart                  # Unit & Widget tests kiểm tra định dạng, quy tắc nghiệp vụ và UI
```

---

## 2. Quản lý Trạng thái & Luồng Dữ liệu (State Management & Data Flow)

1. **`authControllerProvider` (`StateNotifierProvider<AuthController, AuthState>`)**:
   - Khởi tạo lúc mở app: đọc JWT từ `FlutterSecureStorage`, kiểm tra hạn `exp`, gọi `GET /api/users/me` và `GET /api/notifications/unread-count`.
   - Khi `DioClient` gặp lỗi `401` hoặc `403` (khi token hết hạn), callback `onUnauthorized` tự động xóa token và chuyển trạng thái về `AuthStatus.guest`.
2. **`catalogControllerProvider` (`StateNotifierProvider<CatalogController, CatalogState>`)**:
   - Tải song song `/api/stores`, `/api/categories`, `/api/products`, lọc các gian hàng `ACTIVE` và các sản phẩm `ACTIVE | OUT_OF_STOCK` có `minPrice != null`.
3. **`cartControllerProvider` (`StateNotifierProvider<CartController, CartState>`)**:
   - Tự động tải `GET /api/cart` khi người dùng đã đăng nhập; kiểm tra tồn kho biến thể trước khi thêm vào giỏ (`POST /api/cart/items`), cập nhật số lượng (`PATCH`), xóa (`DELETE`) và làm trống giỏ sau khi đặt hàng thành công.
4. **Thanh toán PayOS & Tự động Đối soát (`OrderDetailScreen`)**:
   - Hiển thị trực tiếp mã **VietQR** (`qr_flutter`) từ trường `qrCode` của PayOS kèm nút mở trang thanh toán PayOS (`url_launcher`).
   - Lắng nghe `AppLifecycleState.resumed`: khi người dùng chuyển từ ứng dụng Ngân hàng / Trình duyệt quay lại ứng dụng Mobile, tự động gọi API `reconcileCustomerOrderPayment` (đơn mua lẻ) hoặc `reconcileSellerPayment` (đơn B2B RFQ) để đồng bộ trạng thái thanh toán thực tế từ PayOS.
5. **Chat Thương lượng Thời gian thực (`StompChatClient`)**:
   - Kết nối trực tiếp tới `ws://<gateway>:8080/ws/chat` bằng giao thức STOMP 1.2, gửi kèm header `Origin: http://localhost:5173` lúc bắt tay WebSocket và `Authorization: Bearer <token>` trong frame `CONNECT`, đăng ký kênh `/topic/conversations/{id}` và gửi tin nhắn qua `/app/conversations/{id}/messages` kèm `clientMessageId` chống trùng lặp.

---

## 3. Hướng dẫn Chạy Ứng dụng

```bash
cd MoonCakeMarketplaceMobile
flutter pub get
flutter analyze
flutter test
flutter run
```

- **Mặc định địa chỉ API Gateway**:
  - Trên **Android Emulator**: tự động dùng `http://10.0.2.2:8080`
  - Trên **Windows / iOS Simulator / macOS**: tự động dùng `http://localhost:8080`
  - Có thể đổi trực tiếp địa chỉ máy chủ ngay trong ứng dụng tại biểu tượng **Cấu hình máy chủ API** (ở màn hình Đăng nhập hoặc tab Tài khoản) khi chạy trên điện thoại thật qua mạng LAN (`http://<IP-LAN>:8080`).
