# Role & Permission Matrix — MSS Mooncake Marketplace (Phạm vi Mobile Customer App)

Theo yêu cầu của dự án, ứng dụng **Flutter Mobile** chỉ xây dựng phân hệ **Khách hàng (`Guest` & `Customer`)**, không bao gồm giao diện Quản trị viên (`Admin Center`) và Kênh Người Bán (`Seller Center`).

---

## 1. Các Vai trò trong Phạm vi Ứng dụng Mobile

| Vai trò trên Mobile | Trạng thái Xác thực | Quyền hạn trên ứng dụng Flutter Mobile |
|---|---|---|
| **Khách vãng lai (`Guest`)** | Chưa đăng nhập (`accessToken == null`) | - Xem Trang chủ, Danh sách & Chi tiết Gian hàng (kèm chi nhánh, khuyến mãi, đánh giá).<br>- Xem Danh sách & Chi tiết Sản phẩm (chọn biến thể, xem tồn kho, xem đánh giá).<br>- Tìm kiếm, lọc sản phẩm theo danh mục, gian hàng, mức giá.<br>- Thực hiện Đăng ký, Đăng nhập (Email/Password & Google), Xác minh Email, Quên/Đặt lại mật khẩu.<br>- Khi bấm *Thêm vào giỏ*, *Mua ngay*, *Yêu thích*, *Đơn hàng*, *B2B RFQ*, *Tài khoản*: chuyển sang màn hình Đăng nhập và quay lại đúng màn hình đích sau khi đăng nhập thành công (`returnRoute`). |
| **Khách hàng (`Customer` - `ROLE_CUSTOMER`)** | Đã đăng nhập & xác minh email (`emailVerified == true`) | Toàn bộ quyền của `Guest` cộng với:<br>- Quản lý Giỏ hàng (`Cart`), xem bảng tính giá & khuyến mãi tự động theo từng gian hàng.<br>- Đặt hàng mua lẻ (`Checkout`), thanh toán tổng đơn qua PayOS (`initiate`, `reconcile`, `cancel-link`), hủy ngay đơn chưa thanh toán (`cancel-unpaid`).<br>- Theo dõi Đơn hàng (`OrderTracking`), xem tiến độ giao hàng nhiều đợt (`shipments` & `shipment_line`).<br>- Thanh toán từng đợt (`DEPOSIT`, `REMAINING`, `FULL`) cho đơn B2B chuyển từ Báo giá.<br>- Xác nhận Nghiệm thu đơn hàng (`accept`) khi đơn đã `DELIVERED`.<br>- Đánh giá sản phẩm 1–5 sao (`reviews`) sau khi nhận hàng.<br>- Gửi Yêu cầu hủy đơn đã thanh toán (`cancellations`), Mở khiếu nại (`disputes`), đính kèm bằng chứng (`evidence`), yêu cầu Admin phân xử (`escalate`).<br>- Tạo & Quản lý Yêu cầu báo giá doanh nghiệp (`RFQ`), xem/so sánh báo giá từ các gian hàng, Từ chối hoặc Chấp nhận báo giá để tạo đơn hàng.<br>- Nhắn tin thương lượng thời gian thực với Gian hàng qua STOMP WebSocket (`/ws/chat`).<br>- Quản lý Hồ sơ cá nhân, Sổ địa chỉ nhận hàng, Danh sách Yêu thích, Xem ưu đãi gian hàng, và Thông báo In-App. |

---

## 2. Ma trận Phân quyền Chi tiết theo Tính năng & Màn hình

| Nhóm | Tính năng / Hành động | Guest | Customer (`ROLE_CUSTOMER`) | Ràng buộc Nghiệp vụ & Sở hữu tại Backend |
|---|---|:---:|:---:|---|
| **Auth** | Đăng ký, Đăng nhập, Google Sign-In, Xác minh Email, Quên mật khẩu | ✅ | ✅ | Tài khoản phải `emailVerified = true` và `status = ACTIVE` mới nhận được JWT. |
| **Catalog** | Duyệt Trang chủ, Gian hàng, Chi nhánh, Sản phẩm, Biến thể, Khuyến mãi, Đánh giá | ✅ | ✅ | Chỉ hiển thị gian hàng `ACTIVE` và sản phẩm `ACTIVE \| OUT_OF_STOCK` có ít nhất 1 biến thể `ACTIVE`. |
| **Wishlist** | Thêm / Xóa / Xem danh sách sản phẩm yêu thích | 🔒 *(Chuyển tới Login)* | ✅ | Lưu cục bộ theo khóa `mooncake.wishlist.<userId>` (đồng nhất với Web). |
| **Cart** | Xem giỏ hàng, thêm biến thể, tăng/giảm số lượng, xóa dòng hàng, xem tạm tính | 🔒 | ✅ | Giỏ hàng gắn với `customerId` trong JWT. Kiểm tra tồn kho thực tế của biến thể. |
| **Checkout** | Chọn địa chỉ, xem khuyến mãi áp dụng, đặt hàng mua lẻ (`POST /api/checkout`) | 🔒 | ✅ | Địa chỉ phải thuộc `userId`. Chặn tự mua sản phẩm thuộc gian hàng của chính mình (`SELF_PURCHASE_NOT_ALLOWED`). Giữ kho 15 phút. |
| **Retail Payment** | Tạo link PayOS, Đối soát PayOS, Hủy link, Hủy đơn chưa thanh toán | 🔒 | ✅ | Chỉ chủ sở hữu `customer_order` (`customerId` khớp JWT) mới được thao tác. `cancel-unpaid` chỉ hợp lệ khi chưa có khoản thanh toán nào `SUCCEEDED`. |
| **Orders & Shipments** | Xem danh sách đơn, chi tiết từng `seller_order`, danh sách kiện hàng & dòng sản phẩm trong kiện | 🔒 | ✅ | Chỉ xem được đơn hàng của chính `customerId` trong JWT. |
| **Order Acceptance** | Xác nhận đã nhận hàng & nghiệm thu (`POST /api/seller-orders/{id}/accept`) | 🔒 | ✅ | Chỉ chủ đơn mới được nghiệm thu và chỉ khi `sellerOrder.status == 'DELIVERED'`. |
| **Product Review** | Gửi đánh giá 1–5 sao & nhận xét (`POST /api/reviews`) | 🔒 | ✅ | Chỉ chủ đơn mới được đánh giá khi `sellerOrder.status` thuộc `DELIVERED \| ACCEPTED \| SETTLED`; mỗi `orderItemId` chỉ đánh giá 1 lần. |
| **Cancellation & Dispute** | Yêu cầu hủy đơn đã thanh toán; Mở khiếu nại; Bổ sung bằng chứng; Yêu cầu Admin phân xử | 🔒 | ✅ | Khiếu nại chỉ mở được khi đã có thanh toán `SUCCEEDED` và trong vòng 7 ngày sau khi giao (hoặc khi đã quá ngày giao cam kết). Yêu cầu phân xử mở sau khi nhà bán phản hồi hoặc sau 48 giờ. |
| **B2B RFQ (Buyer)** | Xem sàn RFQ, Tạo RFQ mới, Sửa RFQ, Đóng nhận báo giá, Hủy RFQ | 🔒 | ✅ | Mọi Customer đều tạo được RFQ. Chỉ chủ sở hữu RFQ (`customerId == userId`) mới được sửa, đóng, hủy hoặc xem danh sách báo giá của RFQ đó. |
| **B2B Quotation (Buyer)** | Xem & So sánh báo giá, Từ chối báo giá, Chấp nhận báo giá tạo đơn hàng | 🔒 | ✅ | Chỉ chủ sở hữu RFQ mới được `reject` hoặc `accept` báo giá đang ở trạng thái `SUBMITTED` và chưa hết hạn `validUntil`. |
| **B2B Chat** | Mở hội thoại với Gian hàng, xem danh sách hội thoại, gửi/nhận tin nhắn realtime | 🔒 | ✅ | Chỉ `buyerUserId` hoặc `supplierUserId` của hội thoại mới truy cập và gửi tin nhắn được trong `conversationId`. |
| **Profile & Addresses** | Sửa họ tên/SĐT; Thêm/Sửa/Xóa/Đặt mặc định địa chỉ; Xem & Đánh dấu đã đọc thông báo | 🔒 | ✅ | Dữ liệu cô lập hoàn toàn theo `userId` trong JWT. |

---

## 3. Các Phân hệ Ngoài Phạm vi Mobile (Out of Scope theo yêu cầu)

| Phân hệ | Lý do loại khỏi Mobile App |
|---|---|
| **Seller Center (`ROLE_SUPPLIER`)** | Theo yêu cầu chỉ xây dựng phân hệ `Customer` trên Mobile; các nghiệp vụ quản lý gian hàng, sản phẩm, khuyến mãi, tạo vận đơn, gửi báo giá và đối soát doanh thu của Nhà bán tiếp tục vận hành trên Web. |
| **Admin Center (`ROLE_ADMIN`)** | Theo yêu cầu không làm phân hệ Admin trên Mobile; các nghiệp vụ duyệt nhà cung cấp, quản trị danh mục, duyệt hủy đơn, phân xử khiếu nại và giải ngân tiếp tục vận hành trên Web. |
