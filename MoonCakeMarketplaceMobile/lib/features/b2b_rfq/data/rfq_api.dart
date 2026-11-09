import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/utils/formatters.dart';
import '../../auth/presentation/auth_controller.dart';
import 'rfq_models.dart';

final rfqApiProvider = Provider<RfqApi>((ref) {
  return RfqApi(ref.watch(dioClientProvider));
});

class RfqApi {
  final DioClient _client;
  static const Uuid _uuid = Uuid();

  RfqApi(this._client);

  Future<List<RfqSummaryModel>> listRfqs({
    bool mine = false,
    String? status,
    String? q,
    int page = 0,
    int size = 30,
  }) async {
    final query = <String, dynamic>{
      'mine': mine,
      'page': page,
      'size': size,
      if (status != null && status.isNotEmpty) 'status': status,
      if (q != null && q.trim().isNotEmpty) 'q': q.trim(),
    };
    final res = await _client.get('/api/rfqs', queryParameters: query);
    if (res is Map && res['items'] is List) {
      return (res['items'] as List)
          .whereType<Map>()
          .map((e) => RfqSummaryModel.fromJson(e.cast<String, dynamic>()))
          .toList();
    }
    if (res is List) {
      return res
          .whereType<Map>()
          .map((e) => RfqSummaryModel.fromJson(e.cast<String, dynamic>()))
          .toList();
    }
    return const [];
  }

  Future<RfqDetailModel> getRfq(String rfqId) async {
    final res = await _client.get('/api/rfqs/$rfqId');
    return RfqDetailModel.fromJson((res as Map).cast<String, dynamic>());
  }

  Future<RfqDetailModel> createRfq({
    required String title,
    required int quantity,
    double? budgetAmount,
    String? preferredDeliveryDate,
    String? deliveryLocation,
    String? customizationNotes,
    String? expiresAt,
    required String targetType,
    List<String>? targetStoreIds,
  }) async {
    final payload = <String, dynamic>{
      'title': title.trim(),
      'quantity': quantity,
      if (budgetAmount != null && budgetAmount > 0)
        'budgetAmount': budgetAmount.toStringAsFixed(0),
      if (preferredDeliveryDate != null &&
          preferredDeliveryDate.trim().isNotEmpty)
        'preferredDeliveryDate': preferredDeliveryDate.trim(),
      if (deliveryLocation != null && deliveryLocation.trim().isNotEmpty)
        'deliveryLocation': deliveryLocation.trim(),
      if (customizationNotes != null && customizationNotes.trim().isNotEmpty)
        'customizationNotes': customizationNotes.trim(),
      if (expiresAt != null && expiresAt.trim().isNotEmpty)
        'expiresAt': expiresAt.trim(),
      'targetType': targetType,
      if (targetType == 'SELECTED_STORES' && targetStoreIds != null)
        'targetStoreIds': targetStoreIds,
    };
    final res = await _client.post('/api/rfqs', data: payload);
    return RfqDetailModel.fromJson((res as Map).cast<String, dynamic>());
  }

  Future<RfqDetailModel> closeRfq(String rfqId) async {
    final res = await _client.post('/api/rfqs/$rfqId/close');
    return RfqDetailModel.fromJson((res as Map).cast<String, dynamic>());
  }

  Future<RfqDetailModel> cancelRfq(String rfqId) async {
    final res = await _client.post('/api/rfqs/$rfqId/cancel');
    return RfqDetailModel.fromJson((res as Map).cast<String, dynamic>());
  }

  Future<List<QuotationSummaryModel>> listQuotationsForRfq(String rfqId) async {
    final res = await _client.get(
      '/api/rfqs/$rfqId/quotations',
      queryParameters: {'page': 0, 'size': 30},
    );
    if (res is Map && res['items'] is List) {
      return (res['items'] as List)
          .whereType<Map>()
          .map((e) => QuotationSummaryModel.fromJson(e.cast<String, dynamic>()))
          .toList();
    }
    if (res is List) {
      return res
          .whereType<Map>()
          .map((e) => QuotationSummaryModel.fromJson(e.cast<String, dynamic>()))
          .toList();
    }
    return const [];
  }

  Future<QuotationDetailModel> getQuotation(String quotationId) async {
    final res = await _client.get('/api/quotations/$quotationId');
    return QuotationDetailModel.fromJson((res as Map).cast<String, dynamic>());
  }

  Future<QuotationDetailModel> rejectQuotation(String quotationId) async {
    final res = await _client.post('/api/quotations/$quotationId/reject');
    return QuotationDetailModel.fromJson((res as Map).cast<String, dynamic>());
  }

  Future<AcceptQuotationResultModel> acceptQuotation({
    required String quotationId,
    required int quotationVersion,
    required String addressId,
  }) async {
    final res = await _client.post(
      '/api/quotations/$quotationId/accept',
      data: {
        'quotationVersion': quotationVersion,
        'addressId': addressId,
      },
      headers: {'Idempotency-Key': _uuid.v4()},
    );
    return AcceptQuotationResultModel.fromJson(
      (res as Map).cast<String, dynamic>(),
    );
  }

  Future<ConversationSummaryModel> openConversation({
    required String rfqId,
    required String storeId,
  }) async {
    final res = await _client.post(
      '/api/rfqs/$rfqId/conversations',
      data: {'storeId': storeId},
    );
    return ConversationSummaryModel.fromJson(
      (res as Map).cast<String, dynamic>(),
    );
  }

  Future<List<ConversationSummaryModel>> listConversations({
    String? rfqId,
  }) async {
    final res = await _client.get(
      '/api/conversations',
      queryParameters: {
        'page': 0,
        'size': 50,
        if (rfqId != null && rfqId.isNotEmpty) 'rfqId': rfqId,
      },
    );
    if (res is Map && res['items'] is List) {
      return (res['items'] as List)
          .whereType<Map>()
          .map((e) =>
              ConversationSummaryModel.fromJson(e.cast<String, dynamic>()))
          .toList();
    }
    if (res is List) {
      return res
          .whereType<Map>()
          .map((e) =>
              ConversationSummaryModel.fromJson(e.cast<String, dynamic>()))
          .toList();
    }
    return const [];
  }

  Future<int> getUnreadConversationCount() async {
    final res = await _client.get('/api/conversations/unread-count');
    if (res is Map) {
      return Formatters.parseInt(res['unreadCount']);
    }
    return 0;
  }

  Future<ConversationSummaryModel> markConversationRead(
    String conversationId, {
    String? lastReadMessageId,
  }) async {
    final res = await _client.post(
      '/api/conversations/$conversationId/read',
      data: {
        if (lastReadMessageId != null) 'lastReadMessageId': lastReadMessageId,
      },
    );
    return ConversationSummaryModel.fromJson(
      (res as Map).cast<String, dynamic>(),
    );
  }

  Future<List<ChatMessageModel>> listMessages(
    String conversationId, {
    String? beforeMessageId,
    String? afterMessageId,
    int size = 50,
  }) async {
    final res = await _client.get(
      '/api/conversations/$conversationId/messages',
      queryParameters: {
        'size': size,
        if (beforeMessageId != null) 'beforeMessageId': beforeMessageId,
        if (afterMessageId != null) 'afterMessageId': afterMessageId,
      },
    );
    if (res is Map && res['items'] is List) {
      return (res['items'] as List)
          .whereType<Map>()
          .map((e) => ChatMessageModel.fromJson(e.cast<String, dynamic>()))
          .toList();
    }
    if (res is List) {
      return res
          .whereType<Map>()
          .map((e) => ChatMessageModel.fromJson(e.cast<String, dynamic>()))
          .toList();
    }
    return const [];
  }
}
