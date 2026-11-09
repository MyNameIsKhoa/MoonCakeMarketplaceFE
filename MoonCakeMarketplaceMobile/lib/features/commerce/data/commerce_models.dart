import '../../../core/utils/formatters.dart';

class CartItemModel {
  final int cartItemId;
  final int variantId;
  final int productId;
  final int storeId;
  final String storeName;
  final String productName;
  final String variantName;
  final String sku;
  final double unitPrice;
  final int quantity;
  final double lineTotal;
  final int availableStock;
  final String? imageUrl;

  const CartItemModel({
    required this.cartItemId,
    required this.variantId,
    required this.productId,
    required this.storeId,
    required this.storeName,
    required this.productName,
    required this.variantName,
    required this.sku,
    required this.unitPrice,
    required this.quantity,
    required this.lineTotal,
    required this.availableStock,
    this.imageUrl,
  });

  factory CartItemModel.fromJson(Map<String, dynamic> json) {
    final unit = Formatters.parseDouble(json['unitPrice']);
    final qty = Formatters.parseInt(json['quantity'], 1);
    return CartItemModel(
      cartItemId: Formatters.parseInt(json['cartItemId']),
      variantId: Formatters.parseInt(json['variantId']),
      productId: Formatters.parseInt(json['productId']),
      storeId: Formatters.parseInt(json['storeId']),
      storeName: (json['storeName'] ?? 'Gian hàng #$json[storeId]').toString(),
      productName: (json['productName'] ?? '').toString(),
      variantName: (json['variantName'] ?? '').toString(),
      sku: (json['sku'] ?? '').toString(),
      unitPrice: unit,
      quantity: qty,
      lineTotal: Formatters.parseDouble(json['lineTotal'], unit * qty),
      availableStock: Formatters.parseInt(json['availableStock']),
      imageUrl: json['imageUrl']?.toString(),
    );
  }
}

class UnavailableCartItemModel {
  final int cartItemId;
  final int variantId;
  final String productName;
  final String variantName;
  final String reason;

  const UnavailableCartItemModel({
    required this.cartItemId,
    required this.variantId,
    required this.productName,
    required this.variantName,
    required this.reason,
  });

  factory UnavailableCartItemModel.fromJson(Map<String, dynamic> json) {
    return UnavailableCartItemModel(
      cartItemId: Formatters.parseInt(json['cartItemId']),
      variantId: Formatters.parseInt(json['variantId']),
      productName: (json['productName'] ?? 'Sản phẩm').toString(),
      variantName: (json['variantName'] ?? '').toString(),
      reason: (json['reason'] ?? 'Ngừng bán hoặc hết hàng').toString(),
    );
  }
}

class CartResponseModel {
  final int cartId;
  final int customerId;
  final List<CartItemModel> items;
  final List<UnavailableCartItemModel> unavailableItems;
  final double subtotal;

  const CartResponseModel({
    this.cartId = 0,
    this.customerId = 0,
    this.items = const [],
    this.unavailableItems = const [],
    this.subtotal = 0,
  });

  int get totalQuantity =>
      items.fold<int>(0, (sum, item) => sum + item.quantity);

  factory CartResponseModel.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'];
    final rawUnavailable = json['unavailableItems'];
    return CartResponseModel(
      cartId: Formatters.parseInt(json['cartId']),
      customerId: Formatters.parseInt(json['customerId']),
      items: rawItems is List
          ? rawItems
              .whereType<Map>()
              .map((e) => CartItemModel.fromJson(e.cast<String, dynamic>()))
              .toList()
          : const [],
      unavailableItems: rawUnavailable is List
          ? rawUnavailable
              .whereType<Map>()
              .map((e) => UnavailableCartItemModel.fromJson(
                  e.cast<String, dynamic>()))
              .toList()
          : const [],
      subtotal: Formatters.parseDouble(json['subtotal']),
    );
  }
}

class CartStoreGroupModel {
  final int storeId;
  final String storeName;
  final List<CartItemModel> items;
  final double subtotal;
  final double discountAmount;
  final int? appliedPromotionId;
  final String? appliedPromotionName;
  final double shippingFee;
  final double totalAmount;

  const CartStoreGroupModel({
    required this.storeId,
    required this.storeName,
    required this.items,
    required this.subtotal,
    required this.discountAmount,
    this.appliedPromotionId,
    this.appliedPromotionName,
    required this.shippingFee,
    required this.totalAmount,
  });

  factory CartStoreGroupModel.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'];
    return CartStoreGroupModel(
      storeId: Formatters.parseInt(json['storeId']),
      storeName:
          (json['storeName'] ?? 'Gian hàng #${json['storeId']}').toString(),
      items: rawItems is List
          ? rawItems
              .whereType<Map>()
              .map((e) => CartItemModel.fromJson(e.cast<String, dynamic>()))
              .toList()
          : const [],
      subtotal: Formatters.parseDouble(json['subtotal']),
      discountAmount: Formatters.parseDouble(json['discountAmount']),
      appliedPromotionId: json['appliedPromotionId'] != null
          ? Formatters.parseInt(json['appliedPromotionId'])
          : null,
      appliedPromotionName: json['appliedPromotionName']?.toString(),
      shippingFee: Formatters.parseDouble(json['shippingFee']),
      totalAmount: Formatters.parseDouble(json['totalAmount']),
    );
  }
}

class CartPricingPreviewModel {
  final int customerId;
  final List<CartStoreGroupModel> groups;
  final List<UnavailableCartItemModel> unavailableItems;
  final double subtotal;
  final double discountTotal;
  final double shippingTotal;
  final double grandTotal;

  const CartPricingPreviewModel({
    required this.customerId,
    required this.groups,
    required this.unavailableItems,
    required this.subtotal,
    required this.discountTotal,
    required this.shippingTotal,
    required this.grandTotal,
  });

  factory CartPricingPreviewModel.fromJson(Map<String, dynamic> json) {
    final rawGroups = json['groups'];
    final rawUnavailable = json['unavailableItems'];
    return CartPricingPreviewModel(
      customerId: Formatters.parseInt(json['customerId']),
      groups: rawGroups is List
          ? rawGroups
              .whereType<Map>()
              .map((e) =>
                  CartStoreGroupModel.fromJson(e.cast<String, dynamic>()))
              .toList()
          : const [],
      unavailableItems: rawUnavailable is List
          ? rawUnavailable
              .whereType<Map>()
              .map((e) => UnavailableCartItemModel.fromJson(
                  e.cast<String, dynamic>()))
              .toList()
          : const [],
      subtotal: Formatters.parseDouble(json['subtotal']),
      discountTotal: Formatters.parseDouble(json['discountTotal']),
      shippingTotal: Formatters.parseDouble(json['shippingTotal']),
      grandTotal: Formatters.parseDouble(json['grandTotal']),
    );
  }
}

class OrderAddressSnapshot {
  final String recipientName;
  final String phone;
  final String province;
  final String district;
  final String ward;
  final String streetAddress;

  const OrderAddressSnapshot({
    required this.recipientName,
    required this.phone,
    required this.province,
    required this.district,
    required this.ward,
    required this.streetAddress,
  });

  String get fullAddress =>
      [streetAddress, ward, district, province]
          .where((s) => s.trim().isNotEmpty)
          .join(', ');

  factory OrderAddressSnapshot.fromJson(Map<String, dynamic> json) {
    return OrderAddressSnapshot(
      recipientName: (json['recipientName'] ?? '').toString(),
      phone: (json['phone'] ?? '').toString(),
      province: (json['province'] ?? '').toString(),
      district: (json['district'] ?? '').toString(),
      ward: (json['ward'] ?? '').toString(),
      streetAddress: (json['streetAddress'] ?? '').toString(),
    );
  }
}

class OrderItemModel {
  final int orderItemId;
  final int variantId;
  final String productNameSnapshot;
  final String variantNameSnapshot;
  final String skuSnapshot;
  final int quantity;
  final double unitPrice;
  final double lineTotal;

  const OrderItemModel({
    required this.orderItemId,
    required this.variantId,
    required this.productNameSnapshot,
    required this.variantNameSnapshot,
    required this.skuSnapshot,
    required this.quantity,
    required this.unitPrice,
    required this.lineTotal,
  });

  factory OrderItemModel.fromJson(Map<String, dynamic> json) {
    final qty = Formatters.parseInt(json['quantity'], 1);
    final unit = Formatters.parseDouble(json['unitPrice']);
    return OrderItemModel(
      orderItemId: Formatters.parseInt(json['orderItemId']),
      variantId: Formatters.parseInt(json['variantId']),
      productNameSnapshot: (json['productNameSnapshot'] ?? 'Sản phẩm').toString(),
      variantNameSnapshot: (json['variantNameSnapshot'] ?? '').toString(),
      skuSnapshot: (json['skuSnapshot'] ?? '').toString(),
      quantity: qty,
      unitPrice: unit,
      lineTotal: Formatters.parseDouble(json['lineTotal'], unit * qty),
    );
  }
}

class SellerOrderModel {
  final int sellerOrderId;
  final int customerOrderId;
  final int storeId;
  final String orderSource;
  final int? rfqQuotationId;
  final double subtotalAmount;
  final double discountAmount;
  final double shippingFee;
  final double totalAmount;
  final double depositPercent;
  final double depositAmount;
  final double remainingAmount;
  final String? preferredDeliveryDate;
  final String? remainingDueAt;
  final String status;
  final String createdAt;
  final String updatedAt;
  final List<OrderItemModel> items;

  const SellerOrderModel({
    required this.sellerOrderId,
    required this.customerOrderId,
    required this.storeId,
    required this.orderSource,
    this.rfqQuotationId,
    required this.subtotalAmount,
    required this.discountAmount,
    required this.shippingFee,
    required this.totalAmount,
    required this.depositPercent,
    required this.depositAmount,
    required this.remainingAmount,
    this.preferredDeliveryDate,
    this.remainingDueAt,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
    required this.items,
  });

  static String statusLabelVi(String status) {
    switch (status) {
      case 'PENDING_PAYMENT':
        return 'Chờ thanh toán';
      case 'DEPOSIT_PAID':
        return 'Đã đặt cọc';
      case 'CONFIRMED':
        return 'Đã xác nhận';
      case 'PROCESSING':
      case 'ALLOCATED':
        return 'Đang chuẩn bị hàng';
      case 'PARTIALLY_SHIPPED':
        return 'Đang giao một phần';
      case 'SHIPPED':
        return 'Đang vận chuyển';
      case 'DELIVERED':
        return 'Đã giao hàng';
      case 'ACCEPTED':
        return 'Đã nghiệm thu';
      case 'SETTLED':
        return 'Đã hoàn tất';
      case 'DISPUTED':
        return 'Đang khiếu nại';
      case 'CANCELLED':
        return 'Đã hủy';
      case 'REFUNDED':
        return 'Đã hoàn tiền';
      default:
        return status;
    }
  }

  factory SellerOrderModel.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'];
    return SellerOrderModel(
      sellerOrderId: Formatters.parseInt(json['sellerOrderId']),
      customerOrderId: Formatters.parseInt(json['customerOrderId']),
      storeId: Formatters.parseInt(json['storeId']),
      orderSource: (json['orderSource'] ?? 'RETAIL').toString(),
      rfqQuotationId: json['rfqQuotationId'] != null
          ? Formatters.parseInt(json['rfqQuotationId'])
          : null,
      subtotalAmount: Formatters.parseDouble(json['subtotalAmount']),
      discountAmount: Formatters.parseDouble(json['discountAmount']),
      shippingFee: Formatters.parseDouble(json['shippingFee']),
      totalAmount: Formatters.parseDouble(json['totalAmount']),
      depositPercent: Formatters.parseDouble(json['depositPercent'], 100),
      depositAmount: Formatters.parseDouble(json['depositAmount']),
      remainingAmount: Formatters.parseDouble(json['remainingAmount']),
      preferredDeliveryDate: json['preferredDeliveryDate']?.toString(),
      remainingDueAt: json['remainingDueAt']?.toString(),
      status: (json['status'] ?? 'PENDING_PAYMENT').toString(),
      createdAt: (json['createdAt'] ?? '').toString(),
      updatedAt: (json['updatedAt'] ?? '').toString(),
      items: rawItems is List
          ? rawItems
              .whereType<Map>()
              .map((e) => OrderItemModel.fromJson(e.cast<String, dynamic>()))
              .toList()
          : const [],
    );
  }
}

class CustomerOrderModel {
  final int customerOrderId;
  final int customerId;
  final int? addressId;
  final OrderAddressSnapshot addressSnapshot;
  final double totalAmount;
  final String status;
  final String createdAt;
  final String updatedAt;
  final List<SellerOrderModel> sellerOrders;

  const CustomerOrderModel({
    required this.customerOrderId,
    required this.customerId,
    this.addressId,
    required this.addressSnapshot,
    required this.totalAmount,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
    required this.sellerOrders,
  });

  bool get isRfqOrder =>
      sellerOrders.any((so) => so.orderSource == 'RFQ');

  factory CustomerOrderModel.fromJson(Map<String, dynamic> json) {
    final rawSellerOrders = json['sellerOrders'];
    return CustomerOrderModel(
      customerOrderId: Formatters.parseInt(json['customerOrderId']),
      customerId: Formatters.parseInt(json['customerId']),
      addressId: json['addressId'] != null
          ? Formatters.parseInt(json['addressId'])
          : null,
      addressSnapshot: OrderAddressSnapshot.fromJson(
        (json['addressSnapshot'] as Map?)?.cast<String, dynamic>() ?? const {},
      ),
      totalAmount: Formatters.parseDouble(json['totalAmount']),
      status: (json['status'] ?? 'PENDING_PAYMENT').toString(),
      createdAt: (json['createdAt'] ?? '').toString(),
      updatedAt: (json['updatedAt'] ?? '').toString(),
      sellerOrders: rawSellerOrders is List
          ? rawSellerOrders
              .whereType<Map>()
              .map((e) =>
                  SellerOrderModel.fromJson(e.cast<String, dynamic>()))
              .toList()
          : const [],
    );
  }
}

class ShipmentLineModel {
  final int shipmentLineId;
  final int orderItemId;
  final int variantId;
  final String productNameSnapshot;
  final String variantNameSnapshot;
  final String skuSnapshot;
  final int quantity;

  const ShipmentLineModel({
    required this.shipmentLineId,
    required this.orderItemId,
    required this.variantId,
    required this.productNameSnapshot,
    required this.variantNameSnapshot,
    required this.skuSnapshot,
    required this.quantity,
  });

  factory ShipmentLineModel.fromJson(Map<String, dynamic> json) {
    return ShipmentLineModel(
      shipmentLineId: Formatters.parseInt(json['shipmentLineId']),
      orderItemId: Formatters.parseInt(json['orderItemId']),
      variantId: Formatters.parseInt(json['variantId']),
      productNameSnapshot:
          (json['productNameSnapshot'] ?? 'Sản phẩm').toString(),
      variantNameSnapshot: (json['variantNameSnapshot'] ?? '').toString(),
      skuSnapshot: (json['skuSnapshot'] ?? '').toString(),
      quantity: Formatters.parseInt(json['quantity'], 1),
    );
  }
}

class ShipmentModel {
  final int shipmentId;
  final int sellerOrderId;
  final String? carrierName;
  final String? trackingNumber;
  final String status;
  final String? shippedAt;
  final String? deliveredAt;
  final String? note;
  final String createdAt;
  final List<ShipmentLineModel> lines;

  const ShipmentModel({
    required this.shipmentId,
    required this.sellerOrderId,
    this.carrierName,
    this.trackingNumber,
    required this.status,
    this.shippedAt,
    this.deliveredAt,
    this.note,
    required this.createdAt,
    required this.lines,
  });

  static String statusLabelVi(String status) {
    switch (status) {
      case 'PENDING':
        return 'Đang đóng gói';
      case 'SHIPPED':
        return 'Đang vận chuyển';
      case 'DELIVERED':
        return 'Đã giao thành công';
      case 'CANCELLED':
        return 'Đã hủy kiện';
      default:
        return status;
    }
  }

  factory ShipmentModel.fromJson(Map<String, dynamic> json) {
    final rawLines = json['lines'];
    return ShipmentModel(
      shipmentId: Formatters.parseInt(json['shipmentId']),
      sellerOrderId: Formatters.parseInt(json['sellerOrderId']),
      carrierName: json['carrierName']?.toString(),
      trackingNumber: json['trackingNumber']?.toString(),
      status: (json['status'] ?? 'PENDING').toString(),
      shippedAt: json['shippedAt']?.toString(),
      deliveredAt: json['deliveredAt']?.toString(),
      note: json['note']?.toString(),
      createdAt: (json['createdAt'] ?? '').toString(),
      lines: rawLines is List
          ? rawLines
              .whereType<Map>()
              .map((e) =>
                  ShipmentLineModel.fromJson(e.cast<String, dynamic>()))
              .toList()
          : const [],
    );
  }
}

class CustomerPaymentRecordModel {
  final int customerPaymentId;
  final int customerOrderId;
  final double amount;
  final String status;
  final int? payosOrderCode;
  final String? paymentLinkId;
  final String? checkoutUrl;
  final String? qrCode;
  final String? expiresAt;
  final String? paidAt;

  const CustomerPaymentRecordModel({
    required this.customerPaymentId,
    required this.customerOrderId,
    required this.amount,
    required this.status,
    this.payosOrderCode,
    this.paymentLinkId,
    this.checkoutUrl,
    this.qrCode,
    this.expiresAt,
    this.paidAt,
  });

  factory CustomerPaymentRecordModel.fromJson(Map<String, dynamic> json) {
    return CustomerPaymentRecordModel(
      customerPaymentId: Formatters.parseInt(json['customerPaymentId']),
      customerOrderId: Formatters.parseInt(json['customerOrderId']),
      amount: Formatters.parseDouble(json['amount']),
      status: (json['status'] ?? 'PENDING').toString(),
      payosOrderCode: json['payosOrderCode'] != null
          ? Formatters.parseInt(json['payosOrderCode'])
          : null,
      paymentLinkId: json['paymentLinkId']?.toString(),
      checkoutUrl: json['checkoutUrl']?.toString(),
      qrCode: json['qrCode']?.toString(),
      expiresAt: json['expiresAt']?.toString(),
      paidAt: json['paidAt']?.toString(),
    );
  }
}

class CustomerPaymentSnapshotModel {
  final int customerOrderId;
  final int customerId;
  final String orderStatus;
  final double totalAmount;
  final CustomerPaymentRecordModel? payment;

  const CustomerPaymentSnapshotModel({
    required this.customerOrderId,
    required this.customerId,
    required this.orderStatus,
    required this.totalAmount,
    this.payment,
  });

  factory CustomerPaymentSnapshotModel.fromJson(Map<String, dynamic> json) {
    return CustomerPaymentSnapshotModel(
      customerOrderId: Formatters.parseInt(json['customerOrderId']),
      customerId: Formatters.parseInt(json['customerId']),
      orderStatus: (json['orderStatus'] ?? '').toString(),
      totalAmount: Formatters.parseDouble(json['totalAmount']),
      payment: json['payment'] is Map
          ? CustomerPaymentRecordModel.fromJson(
              (json['payment'] as Map).cast<String, dynamic>())
          : null,
    );
  }
}

class SellerPaymentRecordModel {
  final int paymentId;
  final int sellerOrderId;
  final String paymentType;
  final double amount;
  final String status;
  final int? payosOrderCode;
  final String? checkoutUrl;
  final String? qrCode;
  final String? expiresAt;
  final String? paidAt;

  const SellerPaymentRecordModel({
    required this.paymentId,
    required this.sellerOrderId,
    required this.paymentType,
    required this.amount,
    required this.status,
    this.payosOrderCode,
    this.checkoutUrl,
    this.qrCode,
    this.expiresAt,
    this.paidAt,
  });

  String get paymentTypeLabelVi {
    switch (paymentType) {
      case 'DEPOSIT':
        return 'Đặt cọc B2B';
      case 'REMAINING':
        return 'Phần còn lại B2B';
      default:
        return 'Thanh toán toàn bộ';
    }
  }

  factory SellerPaymentRecordModel.fromJson(Map<String, dynamic> json) {
    return SellerPaymentRecordModel(
      paymentId: Formatters.parseInt(json['paymentId']),
      sellerOrderId: Formatters.parseInt(json['sellerOrderId']),
      paymentType: (json['paymentType'] ?? 'FULL').toString(),
      amount: Formatters.parseDouble(json['amount']),
      status: (json['status'] ?? 'PENDING').toString(),
      payosOrderCode: json['payosOrderCode'] != null
          ? Formatters.parseInt(json['payosOrderCode'])
          : null,
      checkoutUrl: json['checkoutUrl']?.toString(),
      qrCode: json['qrCode']?.toString(),
      expiresAt: json['expiresAt']?.toString(),
      paidAt: json['paidAt']?.toString(),
    );
  }
}

class CancellationRecordModel {
  final int cancellationId;
  final int sellerOrderId;
  final String reason;
  final String status;
  final String? decisionReason;
  final String createdAt;

  const CancellationRecordModel({
    required this.cancellationId,
    required this.sellerOrderId,
    required this.reason,
    required this.status,
    this.decisionReason,
    required this.createdAt,
  });

  factory CancellationRecordModel.fromJson(Map<String, dynamic> json) {
    return CancellationRecordModel(
      cancellationId: Formatters.parseInt(json['cancellationId']),
      sellerOrderId: Formatters.parseInt(json['sellerOrderId']),
      reason: (json['reason'] ?? '').toString(),
      status: (json['status'] ?? 'PENDING').toString(),
      decisionReason: json['decisionReason']?.toString(),
      createdAt: (json['createdAt'] ?? '').toString(),
    );
  }
}

class DisputeEvidenceModel {
  final int evidenceId;
  final String uploadedByRole;
  final String evidenceUrl;
  final String? note;
  final String createdAt;

  const DisputeEvidenceModel({
    required this.evidenceId,
    required this.uploadedByRole,
    required this.evidenceUrl,
    this.note,
    required this.createdAt,
  });

  factory DisputeEvidenceModel.fromJson(Map<String, dynamic> json) {
    return DisputeEvidenceModel(
      evidenceId: Formatters.parseInt(json['evidenceId']),
      uploadedByRole: (json['uploadedByRole'] ?? 'CUSTOMER').toString(),
      evidenceUrl: (json['evidenceUrl'] ?? '').toString(),
      note: json['note']?.toString(),
      createdAt: (json['createdAt'] ?? '').toString(),
    );
  }
}

class DisputeRecordModel {
  final int disputeId;
  final int sellerOrderId;
  final String reason;
  final String description;
  final String status;
  final String? sellerResponse;
  final String? resolutionType;
  final double? resolutionAmount;
  final String? resolutionReason;
  final bool canCustomerEscalate;
  final String? escalateAvailableAt;
  final String createdAt;
  final List<DisputeEvidenceModel> evidences;

  const DisputeRecordModel({
    required this.disputeId,
    required this.sellerOrderId,
    required this.reason,
    required this.description,
    required this.status,
    this.sellerResponse,
    this.resolutionType,
    this.resolutionAmount,
    this.resolutionReason,
    required this.canCustomerEscalate,
    this.escalateAvailableAt,
    required this.createdAt,
    required this.evidences,
  });

  factory DisputeRecordModel.fromJson(Map<String, dynamic> json) {
    final rawEvidences = json['evidences'];
    return DisputeRecordModel(
      disputeId: Formatters.parseInt(json['disputeId']),
      sellerOrderId: Formatters.parseInt(json['sellerOrderId']),
      reason: (json['reason'] ?? '').toString(),
      description: (json['description'] ?? '').toString(),
      status: (json['status'] ?? 'OPEN').toString(),
      sellerResponse: json['sellerResponse']?.toString(),
      resolutionType: json['resolutionType']?.toString(),
      resolutionAmount: json['resolutionAmount'] != null
          ? Formatters.parseDouble(json['resolutionAmount'])
          : null,
      resolutionReason: json['resolutionReason']?.toString(),
      canCustomerEscalate: json['canCustomerEscalate'] == true,
      escalateAvailableAt: json['escalateAvailableAt']?.toString(),
      createdAt: (json['createdAt'] ?? '').toString(),
      evidences: rawEvidences is List
          ? rawEvidences
              .whereType<Map>()
              .map((e) =>
                  DisputeEvidenceModel.fromJson(e.cast<String, dynamic>()))
              .toList()
          : const [],
    );
  }
}

class SellerOrderFinanceSnapshotModel {
  final int sellerOrderId;
  final String orderSource;
  final String orderStatus;
  final double totalAmount;
  final double collectedAmount;
  final double refundedAmount;
  final String? remainingDueAt;
  final bool remainingOverdue;
  final bool disputeWindowOpen;
  final List<SellerPaymentRecordModel> payments;
  final List<CancellationRecordModel> cancellations;
  final List<DisputeRecordModel> disputes;

  const SellerOrderFinanceSnapshotModel({
    required this.sellerOrderId,
    required this.orderSource,
    required this.orderStatus,
    required this.totalAmount,
    required this.collectedAmount,
    required this.refundedAmount,
    this.remainingDueAt,
    required this.remainingOverdue,
    required this.disputeWindowOpen,
    required this.payments,
    required this.cancellations,
    required this.disputes,
  });

  factory SellerOrderFinanceSnapshotModel.fromJson(Map<String, dynamic> json) {
    final rawPayments = json['payments'];
    final rawCancellations = json['cancellations'];
    final rawDisputes = json['disputes'];
    return SellerOrderFinanceSnapshotModel(
      sellerOrderId: Formatters.parseInt(json['sellerOrderId']),
      orderSource: (json['orderSource'] ?? 'RETAIL').toString(),
      orderStatus: (json['orderStatus'] ?? '').toString(),
      totalAmount: Formatters.parseDouble(json['totalAmount']),
      collectedAmount: Formatters.parseDouble(json['collectedAmount']),
      refundedAmount: Formatters.parseDouble(json['refundedAmount']),
      remainingDueAt: json['remainingDueAt']?.toString(),
      remainingOverdue: json['remainingOverdue'] == true,
      disputeWindowOpen: json['disputeWindowOpen'] == true,
      payments: rawPayments is List
          ? rawPayments
              .whereType<Map>()
              .map((e) =>
                  SellerPaymentRecordModel.fromJson(e.cast<String, dynamic>()))
              .toList()
          : const [],
      cancellations: rawCancellations is List
          ? rawCancellations
              .whereType<Map>()
              .map((e) =>
                  CancellationRecordModel.fromJson(e.cast<String, dynamic>()))
              .toList()
          : const [],
      disputes: rawDisputes is List
          ? rawDisputes
              .whereType<Map>()
              .map((e) =>
                  DisputeRecordModel.fromJson(e.cast<String, dynamic>()))
              .toList()
          : const [],
    );
  }
}
