# MoonCakeMarketplaceMobile — Ứng dụng Flutter Mobile (Phân hệ Khách hàng)

Ứng dụng di động **MooncakeHub** xây dựng bằng **Flutter & Riverpod**, dùng chung Backend API Gateway (`MoonCakeMarketplaceBE` - cổng `8080`) và cơ sở dữ liệu với phiên bản Web (`MoonCakeMarketplaceFE`).

## Tính năng chính (Phân hệ Khách hàng B2C & B2B)

- **Xác thực & Tài khoản**: Đăng nhập, Đăng ký, Xác minh Email, Quên/Đặt lại mật khẩu, Cập nhật hồ sơ cá nhân, Sổ địa chỉ nhận hàng (CRUD + đặt mặc định), Sản phẩm yêu thích, Tra cứu ưu đãi toàn sàn, Trung tâm thông báo.
- **Khám phá Sàn & Sản phẩm**: Trang chủ Trung thu, Danh sách & Chi tiết Gian hàng (kèm chương trình khuyến mãi đang áp dụng, hệ thống chi nhánh, đánh giá thực tế), Danh sách & Bộ lọc Sản phẩm, Chi tiết Sản phẩm (chọn phân loại, kiểm tra tồn kho thực tế, xem đánh giá theo phân loại).
- **Giỏ hàng, Đặt hàng & Thanh toán PayOS**: Giỏ hàng nhóm theo từng gian hàng, tự động tính khuyến mãi (`/api/cart/pricing`), Đặt hàng mua lẻ kèm `Idempotency-Key`, hiển thị mã **VietQR PayOS** & tự động đối soát trạng thái thanh toán khi quay lại ứng dụng.
- **Đơn hàng, Kiện hàng nhiều đợt, Nghiệm thu, Đánh giá & Khiếu nại**: Theo dõi chi tiết từng `seller_order`, các đợt thanh toán (`FULL`, `DEPOSIT`, `REMAINING`), danh sách kiện hàng (`shipments` & `shipment_line`), Xác nhận nghiệm thu đơn hàng, Đánh giá 1–5 sao, Hủy đơn và Mở/Theo dõi khiếu nại.
- **Cổng Doanh nghiệp B2B & Chat STOMP Realtime**: Xem và đăng Yêu cầu báo giá (`RFQ`), so sánh & Chấp nhận/Từ chối báo giá để tạo đơn hàng B2B, nhắn tin thương lượng trực tiếp với gian hàng qua WebSocket STOMP 1.2 (`/ws/chat`).

## Cách chạy ứng dụng

```bash
cd MoonCakeMarketplaceMobile
flutter pub get
flutter analyze
flutter test
flutter run
```
