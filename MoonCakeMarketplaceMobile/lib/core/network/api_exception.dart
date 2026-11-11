class ApiException implements Exception {
  final int status;
  final String code;
  final String message;
  final Map<String, String> details;

  const ApiException({
    required this.status,
    required this.code,
    required this.message,
    this.details = const {},
  });

  /// Translates backend error codes into user-friendly Vietnamese copy matching Web.
  String get localizedMessage {
    switch (code) {
      case 'INVALID_CREDENTIALS':
        return 'Email hoặc mật khẩu không chính xác.';
      case 'EMAIL_NOT_VERIFIED':
        return 'Email của bạn chưa được xác minh. Vui lòng kiểm tra hộp thư hoặc yêu cầu gửi lại email xác minh.';
      case 'ACCOUNT_NOT_ACTIVE':
        return 'Tài khoản của bạn hiện đang bị tạm khóa hoặc chưa kích hoạt.';
      case 'EMAIL_ALREADY_EXISTS':
        return 'Địa chỉ email này đã được đăng ký trên hệ thống.';
      case 'INVALID_VERIFICATION_TOKEN':
        return 'Mã xác minh email không hợp lệ.';
      case 'VERIFICATION_TOKEN_EXPIRED':
        return 'Liên kết xác minh email đã hết hạn. Vui lòng yêu cầu gửi lại.';
      case 'VERIFICATION_TOKEN_USED':
        return 'Liên kết xác minh email này đã được sử dụng trước đó.';
      case 'INVALID_PASSWORD_RESET_TOKEN':
        return 'Mã đặt lại mật khẩu không hợp lệ.';
      case 'PASSWORD_RESET_TOKEN_EXPIRED':
        return 'Liên kết đặt lại mật khẩu đã hết hạn. Vui lòng yêu cầu liên kết mới.';
      case 'PASSWORD_RESET_TOKEN_USED':
        return 'Liên kết đặt lại mật khẩu này đã được sử dụng.';
      case 'CANNOT_UNSET_DEFAULT_ADDRESS':
        return 'Không thể bỏ chọn địa chỉ mặc định trực tiếp. Hãy chọn một địa chỉ khác làm mặc định.';
      case 'INSUFFICIENT_STOCK':
        return 'Số lượng tồn kho không đủ đáp ứng. Vui lòng giảm số lượng hoặc chọn phân loại khác.';
      case 'PRODUCT_INACTIVE':
      case 'VARIANT_NOT_FOUND':
        return 'Sản phẩm hoặc phân loại này hiện đã ngừng kinh doanh.';
      case 'CART_EMPTY':
        return 'Giỏ hàng của bạn đang trống.';
      case 'CART_HAS_UNAVAILABLE_ITEMS':
        return 'Giỏ hàng có sản phẩm ngừng bán hoặc hết hàng. Vui lòng xóa các sản phẩm đó trước khi đặt hàng.';
      case 'SELF_PURCHASE_NOT_ALLOWED':
        return 'Bạn không thể tự đặt mua sản phẩm thuộc gian hàng của chính mình.';
      case 'ADDRESS_NOT_FOUND':
        return 'Không tìm thấy địa chỉ nhận hàng đã chọn.';
      case 'REVIEW_ALREADY_EXISTS':
        return 'Bạn đã đánh giá sản phẩm này trong đơn hàng rồi.';
      case 'FORBIDDEN':
        return 'Bạn không có quyền thực hiện thao tác này trên đơn hàng.';
      case 'BAD_REQUEST':
        return message.isNotEmpty ? message : 'Yêu cầu không hợp lệ.';
      case 'CONFLICT':
        return message.isNotEmpty
            ? message
            : 'Trạng thái đơn hàng vừa thay đổi. Hãy tải lại rồi thử lại.';
      case 'CANCELLATION_IN_PROGRESS':
        return 'Yêu cầu hủy đơn đang được xử lý. Hãy tải lại trạng thái trước khi thử lại.';
      case 'CANCELLATION_ALREADY_EXISTS':
        return 'Đơn hàng đã có yêu cầu hủy đang chờ xử lý.';
      case 'CANCELLATION_NOT_PENDING':
        return 'Yêu cầu hủy này đã được xử lý. Hãy tải lại chi tiết đơn hàng.';
      case 'ORDER_CANNOT_BE_CANCELLED':
        return 'Đơn hàng đã giao hoặc không còn ở trạng thái được phép hủy.';
      case 'CANNOT_REVIEW_ORDER':
      case 'ORDER_NOT_ELIGIBLE_FOR_REVIEW':
        return 'Chỉ có thể đánh giá sản phẩm sau khi đơn hàng đã được giao.';
      case 'CANNOT_ACCEPT_ORDER':
      case 'ORDER_NOT_DELIVERED':
        return 'Chỉ có thể nghiệm thu sau khi tất cả kiện hàng đã được giao.';
      case 'NOTHING_LEFT_TO_SHIP':
        return 'Tất cả sản phẩm đã được xếp vào kiện hàng; không còn số lượng để tạo kiện mới.';
      case 'INSUFFICIENT_REMAINING_QUANTITY':
        return 'Số lượng vượt quá phần sản phẩm chưa được xếp vào kiện hàng.';
      case 'SHIPMENT_NOT_READY':
        return 'Kiện hàng chưa ở trạng thái sẵn sàng để gửi.';
      case 'SHIPMENT_NOT_SHIPPED':
        return 'Chỉ xác nhận giao được kiện đang vận chuyển.';
      case 'UNPAID_ORDER_CANNOT_SHIP':
        return 'Đơn phải được thanh toán đủ trước khi xuất kho.';
      case 'CANCELLATION_OR_DISPUTE_PENDING':
        return 'Đơn đang có yêu cầu hủy hoặc khiếu nại chưa xử lý; tạm dừng vận chuyển.';
      case 'QUOTATION_EXPIRED':
        return 'Báo giá này đã hết thời hạn hiệu lực.';
      case 'NETWORK_ERROR':
        return message.isNotEmpty
            ? message
            : 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra mạng hoặc cấu hình địa chỉ API Gateway.';
      default:
        if (details.isNotEmpty) {
          return details.values.first;
        }
        return message.isNotEmpty
            ? message
            : 'Đã xảy ra lỗi không xác định ($status).';
    }
  }

  @override
  String toString() => localizedMessage;
}
