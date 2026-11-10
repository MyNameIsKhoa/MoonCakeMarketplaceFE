/** Customer-facing facts checked against checkout, RFQ, finance and fulfillment code. */
export const marketplacePolicies = [
  {
    id: 'policy-checkout', title: 'Mua hàng và khuyến mãi', url: '/cart',
    keywords: 'gio hang thanh toan checkout khuyen mai mua tang uu dai giam gia',
    content: 'Chọn những dòng muốn mua trong giỏ hàng rồi thanh toán. Server kiểm tra lại giá, tồn có thể bán, phí giao hàng và khuyến mãi khi checkout. Với ưu đãi mua X tặng Y cùng biến thể, phải thêm đủ X+Y sản phẩm vào giỏ; hệ thống giảm tiền cho phần được tặng. Không tự cộng thêm hàng ngoài số lượng khách chọn.'
  },
  {
    id: 'policy-payments', title: 'Thanh toán và tiền cọc', url: '/orders',
    keywords: 'payos thanh toan tien coc dat coc con lai tra tien chuyen khoan',
    content: 'Mua lẻ thanh toán qua PayOS theo tổng đơn. Đơn RFQ thanh toán theo tiền cọc và phần còn lại trong báo giá được chấp nhận; hạn phần còn lại là trước ngày giao 3 ngày theo giờ Việt Nam. Trở lại từ trang PayOS không có nghĩa đã thanh toán: phải đợi webhook hoặc bấm đối soát để server xác minh. Nếu đã chuyển tiền mà chưa ghi nhận, không thanh toán thêm.'
  },
  {
    id: 'policy-rfq', title: 'Yêu cầu báo giá', url: '/b2b',
    keywords: 'rfq bao gia thuong luong doanh nghiep so luong lon dat rieng nha cung cap supplier',
    content: 'Người mua tạo yêu cầu báo giá và xem yêu cầu của mình. Nhà cung cấp gửi báo giá gồm sản phẩm, số lượng, đơn giá thỏa thuận, giảm giá, phí vận chuyển, tiền cọc và thời hạn. Chỉ nhà cung cấp đã xác minh được gửi báo giá. Chấp nhận một phiên bản báo giá sẽ tạo đơn theo nội dung phiên bản đó; giá mua lẻ không bắt buộc là giá thỏa thuận RFQ.'
  },
  {
    id: 'policy-shipping', title: 'Giao hàng', url: '/orders',
    keywords: 'giao hang van chuyen ship phi ship phi giao van don theo doi',
    content: 'Phí mua lẻ do từng gian hàng cấu hình; phí RFQ theo báo giá đã chấp nhận. Phí được cộng vào tổng đơn người mua thanh toán. Nhà bán tổ chức giao hàng và nhập thông tin vận đơn; sàn hiện không tự đặt dịch vụ của hãng vận chuyển. Theo dõi ngày dự kiến và mã vận đơn tại chi tiết đơn hàng.'
  },
  {
    id: 'policy-cancellation', title: 'Hủy đơn', url: '/orders',
    keywords: 'huy don huy thanh toan cancel',
    content: 'Chi tiết đơn chỉ mở thao tác hủy khi đủ điều kiện. Đơn chưa trả tiền có thể hủy trực tiếp nếu server cho phép. Đơn RFQ chưa thanh toán sẽ tự hủy sau 48 giờ. Đơn đã trả tiền cần gửi yêu cầu hủy để xét theo trạng thái đơn và điều khoản; gửi yêu cầu không đồng nghĩa đơn đã hủy hoặc tiền đã được hoàn.'
  },
  {
    id: 'policy-dispute', title: 'Khiếu nại và hoàn tiền', url: '/orders',
    keywords: 'khieu nai hoan tien thieu hang sai hang loi hu hong tra hang refund',
    content: 'Mở chi tiết đơn nhà bán để kiểm tra quyền khiếu nại, gửi lý do và bằng chứng. Khi đã giao hàng, cửa sổ khiếu nại là 7 ngày; trường hợp giao trễ được server xét theo lịch giao. Admin xét hồ sơ và quyết định khoản hoàn. Quyết định hoàn chưa chuyển tiền: admin tạo khoản hoàn, chuyển khoản thủ công đến tài khoản nhận tiền đã lưu và xác nhận chứng từ. Tiền nhận thực tế và trạng thái hoàn được theo dõi trong đơn.'
  },
  {
    id: 'policy-account', title: 'Tài khoản và thông tin nhận tiền', url: '/profile',
    keywords: 'tai khoan dang nhap dang ky email mat khau ngan hang nhan tien nguoi ban',
    content: 'Đăng ký bằng email cần xác minh bằng liên kết gửi đến email trước khi đăng nhập. Quên mật khẩu dùng mã OTP gửi qua email. Lưu thông tin tài khoản ngân hàng nhận tiền trong hồ sơ để phục vụ hoàn tiền; nhà cung cấp lưu tài khoản nhận giải ngân. Trợ lý không xem hay sửa dữ liệu tài khoản hoặc đơn riêng tư.'
  }
];
