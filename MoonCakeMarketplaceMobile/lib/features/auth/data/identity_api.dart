import '../../../core/network/dio_client.dart';
import '../../../core/utils/formatters.dart';
import 'auth_models.dart';

class IdentityApi {
  final DioClient _client;

  IdentityApi(this._client);

  Future<UserProfile> register({
    required String email,
    required String password,
    required String fullName,
    String? phoneNumber,
  }) async {
    final payload = <String, dynamic>{
      'email': email.trim(),
      'password': password,
      'fullName': fullName.trim(),
      if (phoneNumber != null && phoneNumber.trim().isNotEmpty)
        'phoneNumber': phoneNumber.trim(),
    };
    final res = await _client.post(
      '/api/auth/register',
      data: payload,
      skipAuth: true,
    );
    return UserProfile.fromJson((res as Map).cast<String, dynamic>());
  }

  Future<AuthResponse> login({
    required String email,
    required String password,
  }) async {
    final res = await _client.post(
      '/api/auth/login',
      data: {
        'email': email.trim(),
        'password': password,
      },
      skipAuth: true,
    );
    return AuthResponse.fromJson((res as Map).cast<String, dynamic>());
  }

  Future<AuthResponse> loginWithGoogle(String idToken) async {
    final res = await _client.post(
      '/api/auth/google',
      data: {'idToken': idToken.trim()},
      skipAuth: true,
    );
    return AuthResponse.fromJson((res as Map).cast<String, dynamic>());
  }

  Future<String> requestEmailVerification(String email) async {
    final res = await _client.post(
      '/api/auth/email/verification-requests',
      data: {'email': email.trim()},
      skipAuth: true,
    );
    if (res is Map && res['message'] != null) {
      return res['message'].toString();
    }
    return 'Đã gửi lại liên kết xác minh vào hộp thư của bạn.';
  }

  Future<String> verifyEmail(String token) async {
    final res = await _client.post(
      '/api/auth/email/verify',
      data: {'token': token.trim()},
      skipAuth: true,
    );
    if (res is Map && res['message'] != null) {
      return res['message'].toString();
    }
    return 'Email đã được xác minh thành công.';
  }

  Future<String> requestPasswordReset(String email) async {
    final res = await _client.post(
      '/api/auth/password-reset-requests',
      data: {'email': email.trim()},
      skipAuth: true,
    );
    if (res is Map && res['message'] != null) {
      return res['message'].toString();
    }
    return 'Nếu tài khoản tồn tại, liên kết đặt lại mật khẩu đã được gửi qua email.';
  }

  Future<String> resetPassword({
    required String token,
    required String newPassword,
  }) async {
    final res = await _client.post(
      '/api/auth/password-resets',
      data: {
        'token': token.trim(),
        'newPassword': newPassword,
      },
      skipAuth: true,
    );
    if (res is Map && res['message'] != null) {
      return res['message'].toString();
    }
    return 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập ngay.';
  }

  Future<UserProfile> getMe() async {
    final res = await _client.get('/api/users/me');
    return UserProfile.fromJson((res as Map).cast<String, dynamic>());
  }

  Future<UserProfile> updateMe({
    String? fullName,
    String? phoneNumber,
  }) async {
    final res = await _client.patch(
      '/api/users/me',
      data: {
        if (fullName != null) 'fullName': fullName.trim(),
        if (phoneNumber != null) 'phoneNumber': phoneNumber.trim(),
      },
    );
    return UserProfile.fromJson((res as Map).cast<String, dynamic>());
  }

  Future<List<AddressModel>> listAddresses() async {
    final res = await _client.get('/api/addresses');
    if (res is List) {
      return res
          .whereType<Map>()
          .map((e) => AddressModel.fromJson(e.cast<String, dynamic>()))
          .toList();
    }
    return const [];
  }

  Future<AddressModel> createAddress({
    required String recipientName,
    required String phone,
    required String province,
    required String district,
    required String ward,
    required String streetAddress,
    bool? isDefault,
  }) async {
    final res = await _client.post(
      '/api/addresses',
      data: {
        'recipientName': recipientName.trim(),
        'phone': phone.trim(),
        'province': province.trim(),
        'district': district.trim(),
        'ward': ward.trim(),
        'streetAddress': streetAddress.trim(),
        if (isDefault != null) 'isDefault': isDefault,
      },
    );
    return AddressModel.fromJson((res as Map).cast<String, dynamic>());
  }

  Future<AddressModel> updateAddress(
    int addressId, {
    String? recipientName,
    String? phone,
    String? province,
    String? district,
    String? ward,
    String? streetAddress,
    bool? isDefault,
  }) async {
    final res = await _client.patch(
      '/api/addresses/$addressId',
      data: {
        if (recipientName != null) 'recipientName': recipientName.trim(),
        if (phone != null) 'phone': phone.trim(),
        if (province != null) 'province': province.trim(),
        if (district != null) 'district': district.trim(),
        if (ward != null) 'ward': ward.trim(),
        if (streetAddress != null) 'streetAddress': streetAddress.trim(),
        if (isDefault != null) 'isDefault': isDefault,
      },
    );
    return AddressModel.fromJson((res as Map).cast<String, dynamic>());
  }

  Future<void> deleteAddress(int addressId) async {
    await _client.delete('/api/addresses/$addressId');
  }

  Future<NotificationPage> listNotifications({int page = 0, int size = 20}) async {
    final res = await _client.get(
      '/api/notifications',
      queryParameters: {'page': page, 'size': size},
    );
    return NotificationPage.fromJson((res as Map).cast<String, dynamic>());
  }

  Future<int> getUnreadNotificationCount() async {
    final res = await _client.get('/api/notifications/unread-count');
    if (res is Map) {
      return Formatters.parseInt(res['unreadCount']);
    }
    return 0;
  }

  Future<NotificationItem> markNotificationRead(int notificationId) async {
    final res = await _client.post('/api/notifications/$notificationId/read');
    return NotificationItem.fromJson((res as Map).cast<String, dynamic>());
  }

  Future<int> markAllNotificationsRead() async {
    final res = await _client.post('/api/notifications/read-all');
    if (res is Map) {
      return Formatters.parseInt(res['markedReadCount']);
    }
    return 0;
  }
}
