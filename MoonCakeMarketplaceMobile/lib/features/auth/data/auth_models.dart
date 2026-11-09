import '../../../core/utils/formatters.dart';

class UserProfile {
  final int userId;
  final int? customerId;
  final String email;
  final String status;
  final bool emailVerified;
  final String fullName;
  final String? phoneNumber;
  final String createdAt;
  final List<String> roles;

  const UserProfile({
    required this.userId,
    this.customerId,
    required this.email,
    required this.status,
    required this.emailVerified,
    required this.fullName,
    this.phoneNumber,
    required this.createdAt,
    required this.roles,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    final rawRoles = json['roles'];
    return UserProfile(
      userId: Formatters.parseInt(json['userId']),
      customerId: json['customerId'] != null
          ? Formatters.parseInt(json['customerId'])
          : null,
      email: (json['email'] ?? '').toString(),
      status: (json['status'] ?? 'ACTIVE').toString(),
      emailVerified: json['emailVerified'] == true,
      fullName: (json['fullName'] ?? '').toString(),
      phoneNumber: json['phoneNumber']?.toString(),
      createdAt: (json['createdAt'] ?? '').toString(),
      roles: rawRoles is List
          ? rawRoles.map((e) => e.toString()).toList()
          : const ['ROLE_CUSTOMER'],
    );
  }

  UserProfile copyWith({
    String? fullName,
    String? phoneNumber,
  }) {
    return UserProfile(
      userId: userId,
      customerId: customerId,
      email: email,
      status: status,
      emailVerified: emailVerified,
      fullName: fullName ?? this.fullName,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      createdAt: createdAt,
      roles: roles,
    );
  }
}

class AuthResponse {
  final String accessToken;
  final String tokenType;
  final int expiresInSeconds;
  final UserProfile user;

  const AuthResponse({
    required this.accessToken,
    required this.tokenType,
    required this.expiresInSeconds,
    required this.user,
  });

  factory AuthResponse.fromJson(Map<String, dynamic> json) {
    return AuthResponse(
      accessToken: (json['accessToken'] ?? '').toString(),
      tokenType: (json['tokenType'] ?? 'Bearer').toString(),
      expiresInSeconds: Formatters.parseInt(json['expiresInSeconds'], 3600),
      user: UserProfile.fromJson(
        (json['user'] as Map?)?.cast<String, dynamic>() ?? const {},
      ),
    );
  }
}

class AddressModel {
  final int addressId;
  final String recipientName;
  final String phone;
  final String province;
  final String district;
  final String ward;
  final String streetAddress;
  final bool isDefault;
  final String createdAt;
  final String updatedAt;

  const AddressModel({
    required this.addressId,
    required this.recipientName,
    required this.phone,
    required this.province,
    required this.district,
    required this.ward,
    required this.streetAddress,
    required this.isDefault,
    required this.createdAt,
    required this.updatedAt,
  });

  String get fullAddress =>
      '$streetAddress, $ward, $district, $province';

  factory AddressModel.fromJson(Map<String, dynamic> json) {
    return AddressModel(
      addressId: Formatters.parseInt(json['addressId']),
      recipientName: (json['recipientName'] ?? '').toString(),
      phone: (json['phone'] ?? '').toString(),
      province: (json['province'] ?? '').toString(),
      district: (json['district'] ?? '').toString(),
      ward: (json['ward'] ?? '').toString(),
      streetAddress: (json['streetAddress'] ?? '').toString(),
      isDefault: json['isDefault'] == true,
      createdAt: (json['createdAt'] ?? '').toString(),
      updatedAt: (json['updatedAt'] ?? '').toString(),
    );
  }
}

class NotificationTarget {
  final String kind;
  final String role;
  final String? rfqId;
  final String? quotationId;
  final String? conversationId;
  final String? orderId;

  const NotificationTarget({
    required this.kind,
    required this.role,
    this.rfqId,
    this.quotationId,
    this.conversationId,
    this.orderId,
  });

  factory NotificationTarget.fromJson(Map<String, dynamic> json) {
    return NotificationTarget(
      kind: (json['kind'] ?? 'NONE').toString(),
      role: (json['role'] ?? 'CUSTOMER').toString(),
      rfqId: json['rfqId']?.toString(),
      quotationId: json['quotationId']?.toString(),
      conversationId: json['conversationId']?.toString(),
      orderId: json['orderId']?.toString(),
    );
  }
}

class NotificationItem {
  final int notificationId;
  final String type;
  final String title;
  final String body;
  final bool read;
  final String createdAt;
  final String? readAt;
  final NotificationTarget target;

  const NotificationItem({
    required this.notificationId,
    required this.type,
    required this.title,
    required this.body,
    required this.read,
    required this.createdAt,
    this.readAt,
    required this.target,
  });

  factory NotificationItem.fromJson(Map<String, dynamic> json) {
    return NotificationItem(
      notificationId: Formatters.parseInt(json['notificationId']),
      type: (json['type'] ?? '').toString(),
      title: (json['title'] ?? '').toString(),
      body: (json['body'] ?? '').toString(),
      read: json['read'] == true,
      createdAt: (json['createdAt'] ?? '').toString(),
      readAt: json['readAt']?.toString(),
      target: NotificationTarget.fromJson(
        (json['target'] as Map?)?.cast<String, dynamic>() ?? const {},
      ),
    );
  }
}

class NotificationPage {
  final List<NotificationItem> items;
  final int page;
  final int size;
  final int totalElements;
  final int totalPages;

  const NotificationPage({
    required this.items,
    required this.page,
    required this.size,
    required this.totalElements,
    required this.totalPages,
  });

  factory NotificationPage.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'];
    return NotificationPage(
      items: rawItems is List
          ? rawItems
              .whereType<Map>()
              .map((e) => NotificationItem.fromJson(e.cast<String, dynamic>()))
              .toList()
          : const [],
      page: Formatters.parseInt(json['page']),
      size: Formatters.parseInt(json['size'], 15),
      totalElements: Formatters.parseInt(json['totalElements']),
      totalPages: Formatters.parseInt(json['totalPages']),
    );
  }
}
