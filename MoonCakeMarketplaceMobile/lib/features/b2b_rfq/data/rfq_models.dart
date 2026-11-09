import '../../../core/utils/formatters.dart';

class RfqSummaryModel {
  final String rfqId;
  final String customerId;
  final String title;
  final int quantity;
  final double? budgetAmount;
  final String? preferredDeliveryDate;
  final String? deliveryLocation;
  final String targetType;
  final String status;
  final String? expiresAt;
  final String createdAt;
  final int quotationCount;

  const RfqSummaryModel({
    required this.rfqId,
    required this.customerId,
    required this.title,
    required this.quantity,
    this.budgetAmount,
    this.preferredDeliveryDate,
    this.deliveryLocation,
    required this.targetType,
    required this.status,
    this.expiresAt,
    required this.createdAt,
    this.quotationCount = 0,
  });

  static String statusLabelVi(String status) {
    switch (status) {
      case 'OPEN':
        return 'Đang nhận báo giá';
      case 'CLOSED':
        return 'Đã đóng / Chốt báo giá';
      case 'CANCELLED':
        return 'Đã hủy';
      default:
        return status;
    }
  }

  factory RfqSummaryModel.fromJson(Map<String, dynamic> json) {
    return RfqSummaryModel(
      rfqId: (json['rfqId'] ?? '').toString(),
      customerId: (json['customerId'] ?? '').toString(),
      title: (json['title'] ?? '').toString(),
      quantity: Formatters.parseInt(json['quantity'], 1),
      budgetAmount: json['budgetAmount'] != null
          ? Formatters.parseDouble(json['budgetAmount'])
          : null,
      preferredDeliveryDate: json['preferredDeliveryDate']?.toString(),
      deliveryLocation: json['deliveryLocation']?.toString(),
      targetType: (json['targetType'] ?? 'ALL').toString(),
      status: (json['status'] ?? 'OPEN').toString(),
      expiresAt: json['expiresAt']?.toString(),
      createdAt: (json['createdAt'] ?? '').toString(),
      quotationCount: Formatters.parseInt(json['quotationCount']),
    );
  }
}

class RfqDetailModel extends RfqSummaryModel {
  final String? customizationNotes;
  final List<String> targetStoreIds;
  final String updatedAt;

  const RfqDetailModel({
    required super.rfqId,
    required super.customerId,
    required super.title,
    required super.quantity,
    super.budgetAmount,
    super.preferredDeliveryDate,
    super.deliveryLocation,
    required super.targetType,
    required super.status,
    super.expiresAt,
    required super.createdAt,
    super.quotationCount,
    this.customizationNotes,
    this.targetStoreIds = const [],
    required this.updatedAt,
  });

  factory RfqDetailModel.fromJson(Map<String, dynamic> json) {
    final summary = RfqSummaryModel.fromJson(json);
    final rawTargets = json['targetStoreIds'];
    return RfqDetailModel(
      rfqId: summary.rfqId,
      customerId: summary.customerId,
      title: summary.title,
      quantity: summary.quantity,
      budgetAmount: summary.budgetAmount,
      preferredDeliveryDate: summary.preferredDeliveryDate,
      deliveryLocation: summary.deliveryLocation,
      targetType: summary.targetType,
      status: summary.status,
      expiresAt: summary.expiresAt,
      createdAt: summary.createdAt,
      quotationCount: summary.quotationCount,
      customizationNotes: json['customizationNotes']?.toString(),
      targetStoreIds: rawTargets is List
          ? rawTargets.map((e) => e.toString()).toList()
          : const [],
      updatedAt: (json['updatedAt'] ?? summary.createdAt).toString(),
    );
  }
}

class QuotationItemModel {
  final String quotationItemId;
  final String? variantId;
  final String itemName;
  final int quantity;
  final double unitPrice;
  final double lineTotal;
  final String? notes;

  const QuotationItemModel({
    required this.quotationItemId,
    this.variantId,
    required this.itemName,
    required this.quantity,
    required this.unitPrice,
    required this.lineTotal,
    this.notes,
  });

  factory QuotationItemModel.fromJson(Map<String, dynamic> json) {
    final qty = Formatters.parseInt(json['quantity'], 1);
    final unit = Formatters.parseDouble(json['unitPrice']);
    return QuotationItemModel(
      quotationItemId: (json['quotationItemId'] ?? '').toString(),
      variantId: json['variantId']?.toString(),
      itemName: (json['itemName'] ?? 'Sản phẩm báo giá').toString(),
      quantity: qty,
      unitPrice: unit,
      lineTotal: Formatters.parseDouble(json['lineTotal'], unit * qty),
      notes: json['notes']?.toString(),
    );
  }
}

class QuotationSummaryModel {
  final String quotationId;
  final String rfqId;
  final String storeId;
  final String supplierUserId;
  final int version;
  final double totalAmount;
  final double depositPercent;
  final double shippingFee;
  final String? validUntil;
  final String status;
  final String createdAt;

  const QuotationSummaryModel({
    required this.quotationId,
    required this.rfqId,
    required this.storeId,
    required this.supplierUserId,
    required this.version,
    required this.totalAmount,
    required this.depositPercent,
    required this.shippingFee,
    this.validUntil,
    required this.status,
    required this.createdAt,
  });

  static String statusLabelVi(String status) {
    switch (status) {
      case 'SUBMITTED':
        return 'Đang chờ duyệt';
      case 'ACCEPTED':
        return 'Đã chấp nhận';
      case 'REJECTED':
        return 'Đã từ chối';
      case 'CANCELLED':
        return 'Nhà bán đã rút';
      case 'EXPIRED':
        return 'Đã hết hạn';
      default:
        return status;
    }
  }

  factory QuotationSummaryModel.fromJson(Map<String, dynamic> json) {
    return QuotationSummaryModel(
      quotationId: (json['quotationId'] ?? '').toString(),
      rfqId: (json['rfqId'] ?? '').toString(),
      storeId: (json['storeId'] ?? '').toString(),
      supplierUserId: (json['supplierUserId'] ?? '').toString(),
      version: Formatters.parseInt(json['version'], 1),
      totalAmount: Formatters.parseDouble(json['totalAmount']),
      depositPercent: Formatters.parseDouble(json['depositPercent'], 100),
      shippingFee: Formatters.parseDouble(json['shippingFee']),
      validUntil: json['validUntil']?.toString(),
      status: (json['status'] ?? 'SUBMITTED').toString(),
      createdAt: (json['createdAt'] ?? '').toString(),
    );
  }
}

class QuotationDetailModel extends QuotationSummaryModel {
  final String? termsNotes;
  final List<QuotationItemModel> items;

  const QuotationDetailModel({
    required super.quotationId,
    required super.rfqId,
    required super.storeId,
    required super.supplierUserId,
    required super.version,
    required super.totalAmount,
    required super.depositPercent,
    required super.shippingFee,
    super.validUntil,
    required super.status,
    required super.createdAt,
    this.termsNotes,
    this.items = const [],
  });

  factory QuotationDetailModel.fromJson(Map<String, dynamic> json) {
    final summary = QuotationSummaryModel.fromJson(json);
    final rawItems = json['items'];
    return QuotationDetailModel(
      quotationId: summary.quotationId,
      rfqId: summary.rfqId,
      storeId: summary.storeId,
      supplierUserId: summary.supplierUserId,
      version: summary.version,
      totalAmount: summary.totalAmount,
      depositPercent: summary.depositPercent,
      shippingFee: summary.shippingFee,
      validUntil: summary.validUntil,
      status: summary.status,
      createdAt: summary.createdAt,
      termsNotes: json['termsNotes']?.toString(),
      items: rawItems is List
          ? rawItems
              .whereType<Map>()
              .map((e) =>
                  QuotationItemModel.fromJson(e.cast<String, dynamic>()))
              .toList()
          : const [],
    );
  }
}

class AcceptQuotationResultModel {
  final String quotationId;
  final int quotationVersion;
  final String rfqStatus;
  final String? commerceCustomerOrderId;
  final String? commerceSellerOrderId;
  final String status;

  const AcceptQuotationResultModel({
    required this.quotationId,
    required this.quotationVersion,
    required this.rfqStatus,
    this.commerceCustomerOrderId,
    this.commerceSellerOrderId,
    required this.status,
  });

  factory AcceptQuotationResultModel.fromJson(Map<String, dynamic> json) {
    return AcceptQuotationResultModel(
      quotationId: (json['quotationId'] ?? '').toString(),
      quotationVersion: Formatters.parseInt(json['quotationVersion'], 1),
      rfqStatus: (json['rfqStatus'] ?? 'CLOSED').toString(),
      commerceCustomerOrderId: json['commerceCustomerOrderId']?.toString(),
      commerceSellerOrderId: json['commerceSellerOrderId']?.toString(),
      status: (json['status'] ?? 'SUCCEEDED').toString(),
    );
  }
}

class ConversationSummaryModel {
  final String conversationId;
  final String rfqId;
  final String rfqTitle;
  final String buyerUserId;
  final String supplierUserId;
  final String storeId;
  final String? lastMessagePreview;
  final String? lastMessageAt;
  final int unreadCount;
  final String createdAt;

  const ConversationSummaryModel({
    required this.conversationId,
    required this.rfqId,
    required this.rfqTitle,
    required this.buyerUserId,
    required this.supplierUserId,
    required this.storeId,
    this.lastMessagePreview,
    this.lastMessageAt,
    required this.unreadCount,
    required this.createdAt,
  });

  factory ConversationSummaryModel.fromJson(Map<String, dynamic> json) {
    return ConversationSummaryModel(
      conversationId: (json['conversationId'] ?? '').toString(),
      rfqId: (json['rfqId'] ?? '').toString(),
      rfqTitle: (json['rfqTitle'] ?? 'Yêu cầu báo giá').toString(),
      buyerUserId: (json['buyerUserId'] ?? '').toString(),
      supplierUserId: (json['supplierUserId'] ?? '').toString(),
      storeId: (json['storeId'] ?? '').toString(),
      lastMessagePreview: json['lastMessagePreview']?.toString(),
      lastMessageAt: json['lastMessageAt']?.toString(),
      unreadCount: Formatters.parseInt(json['unreadCount']),
      createdAt: (json['createdAt'] ?? '').toString(),
    );
  }
}

class ChatMessageModel {
  final String messageId;
  final String conversationId;
  final String senderUserId;
  final String senderRole;
  final String messageText;
  final String? clientMessageId;
  final String createdAt;

  const ChatMessageModel({
    required this.messageId,
    required this.conversationId,
    required this.senderUserId,
    required this.senderRole,
    required this.messageText,
    this.clientMessageId,
    required this.createdAt,
  });

  factory ChatMessageModel.fromJson(Map<String, dynamic> json) {
    return ChatMessageModel(
      messageId: (json['messageId'] ?? '').toString(),
      conversationId: (json['conversationId'] ?? '').toString(),
      senderUserId: (json['senderUserId'] ?? '').toString(),
      senderRole: (json['senderRole'] ?? 'CUSTOMER').toString(),
      messageText: (json['messageText'] ?? '').toString(),
      clientMessageId: json['clientMessageId']?.toString(),
      createdAt: (json['createdAt'] ?? '').toString(),
    );
  }
}
