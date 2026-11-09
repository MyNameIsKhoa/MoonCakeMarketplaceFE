import 'package:uuid/uuid.dart';
import '../../../core/network/dio_client.dart';
import 'commerce_models.dart';

class CommerceApi {
  final DioClient _client;
  static const Uuid _uuid = Uuid();

  CommerceApi(this._client);

  // --- Cart & Pricing ---
  Future<CartResponseModel> getCart() async {
    final res = await _client.get('/api/cart');
    return CartResponseModel.fromJson((res as Map).cast<String, dynamic>());
  }

  Future<CartResponseModel> addCartItem({
    required int variantId,
    required int quantity,
  }) async {
    final res = await _client.post(
      '/api/cart/items',
      data: {'variantId': variantId, 'quantity': quantity},
    );
    return CartResponseModel.fromJson((res as Map).cast<String, dynamic>());
  }

  Future<CartResponseModel> updateCartItem({
    required int cartItemId,
    required int quantity,
  }) async {
    final res = await _client.patch(
      '/api/cart/items/$cartItemId',
      data: {'quantity': quantity},
    );
    return CartResponseModel.fromJson((res as Map).cast<String, dynamic>());
  }

  Future<CartResponseModel> removeCartItem(int cartItemId) async {
    final res = await _client.delete('/api/cart/items/$cartItemId');
    return CartResponseModel.fromJson((res as Map).cast<String, dynamic>());
  }

  Future<CartPricingPreviewModel> previewPricing() async {
    final res = await _client.post('/api/cart/pricing', data: const {});
    return CartPricingPreviewModel.fromJson(
      (res as Map).cast<String, dynamic>(),
    );
  }

  Future<CustomerOrderModel> checkout({
    required int addressId,
    String? idempotencyKey,
  }) async {
    final key = idempotencyKey ?? _uuid.v4();
    final res = await _client.post(
      '/api/checkout',
      data: {'addressId': addressId},
      headers: {'Idempotency-Key': key},
    );
    return CustomerOrderModel.fromJson((res as Map).cast<String, dynamic>());
  }

  // --- Orders, Shipments & Acceptance ---
  Future<List<CustomerOrderModel>> listOrders() async {
    final res = await _client.get('/api/orders');
    if (res is List) {
      return res
          .whereType<Map>()
          .map((e) => CustomerOrderModel.fromJson(e.cast<String, dynamic>()))
          .toList();
    }
    return const [];
  }

  Future<CustomerOrderModel> getOrder(int customerOrderId) async {
    final res = await _client.get('/api/orders/$customerOrderId');
    return CustomerOrderModel.fromJson((res as Map).cast<String, dynamic>());
  }

  Future<SellerOrderModel> acceptSellerOrder(int sellerOrderId) async {
    final res = await _client.post('/api/seller-orders/$sellerOrderId/accept');
    return SellerOrderModel.fromJson((res as Map).cast<String, dynamic>());
  }

  Future<List<ShipmentModel>> listShipments(int sellerOrderId) async {
    final res = await _client.get(
      '/api/shipments',
      queryParameters: {'sellerOrderId': sellerOrderId},
    );
    if (res is List) {
      return res
          .whereType<Map>()
          .map((e) => ShipmentModel.fromJson(e.cast<String, dynamic>()))
          .toList();
    }
    return const [];
  }

  // --- Customer Order PayOS Payment (Retail) ---
  Future<CustomerPaymentSnapshotModel> getCustomerOrderPayment(
      int customerOrderId) async {
    final res =
        await _client.get('/api/payments/customer-orders/$customerOrderId');
    return CustomerPaymentSnapshotModel.fromJson(
      (res as Map).cast<String, dynamic>(),
    );
  }

  Future<CustomerPaymentRecordModel> initiateCustomerOrderPayment(
    int customerOrderId, {
    String? idempotencyKey,
  }) async {
    final res = await _client.post(
      '/api/payments/customer-orders/$customerOrderId/initiate',
      data: const {},
      headers: {'Idempotency-Key': idempotencyKey ?? _uuid.v4()},
    );
    return CustomerPaymentRecordModel.fromJson(
      (res as Map).cast<String, dynamic>(),
    );
  }

  Future<CustomerPaymentRecordModel> reconcileCustomerOrderPayment(
      int customerOrderId) async {
    final res = await _client.post(
      '/api/payments/customer-orders/$customerOrderId/reconcile',
      data: const {},
    );
    return CustomerPaymentRecordModel.fromJson(
      (res as Map).cast<String, dynamic>(),
    );
  }

  Future<CustomerPaymentRecordModel> cancelCustomerOrderPaymentLink(
    int customerOrderId, {
    String? reason,
  }) async {
    final res = await _client.post(
      '/api/payments/customer-orders/$customerOrderId/cancel-link',
      data: {
        if (reason != null && reason.trim().isNotEmpty) 'reason': reason.trim(),
      },
    );
    return CustomerPaymentRecordModel.fromJson(
      (res as Map).cast<String, dynamic>(),
    );
  }

  Future<CustomerPaymentSnapshotModel> cancelUnpaidCustomerOrder(
    int customerOrderId, {
    String? reason,
  }) async {
    final res = await _client.post(
      '/api/payments/customer-orders/$customerOrderId/cancel-unpaid',
      data: {
        if (reason != null && reason.trim().isNotEmpty) 'reason': reason.trim(),
      },
    );
    return CustomerPaymentSnapshotModel.fromJson(
      (res as Map).cast<String, dynamic>(),
    );
  }

  // --- Seller Order Finance, RFQ Payments, Cancellations & Disputes ---
  Future<SellerOrderFinanceSnapshotModel> getSellerOrderFinance(
      int sellerOrderId) async {
    final res = await _client.get('/api/payments/orders/$sellerOrderId');
    return SellerOrderFinanceSnapshotModel.fromJson(
      (res as Map).cast<String, dynamic>(),
    );
  }

  Future<SellerPaymentRecordModel> initiateSellerPayment(
    int paymentId, {
    String? idempotencyKey,
  }) async {
    final res = await _client.post(
      '/api/payments/$paymentId/initiate',
      data: const {},
      headers: {'Idempotency-Key': idempotencyKey ?? _uuid.v4()},
    );
    return SellerPaymentRecordModel.fromJson(
      (res as Map).cast<String, dynamic>(),
    );
  }

  Future<SellerPaymentRecordModel> reconcileSellerPayment(
      int paymentId) async {
    final res = await _client.post(
      '/api/payments/$paymentId/reconcile',
      data: const {},
    );
    return SellerPaymentRecordModel.fromJson(
      (res as Map).cast<String, dynamic>(),
    );
  }

  Future<SellerPaymentRecordModel> cancelSellerPaymentLink(
    int paymentId, {
    String? reason,
  }) async {
    final res = await _client.post(
      '/api/payments/$paymentId/cancel-link',
      data: {
        if (reason != null && reason.trim().isNotEmpty) 'reason': reason.trim(),
      },
    );
    return SellerPaymentRecordModel.fromJson(
      (res as Map).cast<String, dynamic>(),
    );
  }

  Future<CancellationRecordModel> requestCancellation({
    required int sellerOrderId,
    required String reason,
  }) async {
    final res = await _client.post(
      '/api/payments/orders/$sellerOrderId/cancellations',
      data: {'reason': reason.trim()},
      headers: {'Idempotency-Key': _uuid.v4()},
    );
    return CancellationRecordModel.fromJson(
      (res as Map).cast<String, dynamic>(),
    );
  }

  Future<DisputeRecordModel> openDispute({
    required int sellerOrderId,
    required String reason,
    required String description,
    String? evidenceUrl,
  }) async {
    final res = await _client.post(
      '/api/payments/orders/$sellerOrderId/disputes',
      data: {
        'reason': reason.trim(),
        'description': description.trim(),
        if (evidenceUrl != null && evidenceUrl.trim().isNotEmpty)
          'evidenceUrl': evidenceUrl.trim(),
      },
      headers: {'Idempotency-Key': _uuid.v4()},
    );
    return DisputeRecordModel.fromJson((res as Map).cast<String, dynamic>());
  }

  Future<DisputeRecordModel> addDisputeEvidence({
    required int sellerOrderId,
    required int disputeId,
    required String evidenceUrl,
    String? note,
  }) async {
    final res = await _client.post(
      '/api/payments/orders/$sellerOrderId/disputes/$disputeId/evidence',
      data: {
        'evidenceUrl': evidenceUrl.trim(),
        if (note != null && note.trim().isNotEmpty) 'note': note.trim(),
      },
    );
    return DisputeRecordModel.fromJson((res as Map).cast<String, dynamic>());
  }

  Future<DisputeRecordModel> escalateDispute({
    required int sellerOrderId,
    required int disputeId,
    String? note,
  }) async {
    final res = await _client.post(
      '/api/payments/orders/$sellerOrderId/disputes/$disputeId/escalate',
      data: {
        if (note != null && note.trim().isNotEmpty) 'note': note.trim(),
      },
    );
    return DisputeRecordModel.fromJson((res as Map).cast<String, dynamic>());
  }
}
