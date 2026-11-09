import '../../../core/network/dio_client.dart';
import 'catalog_models.dart';

class CatalogApi {
  final DioClient _client;

  CatalogApi(this._client);

  Future<List<StoreModel>> listStores() async {
    final res = await _client.get('/api/stores', skipAuth: true);
    if (res is List) {
      return res
          .whereType<Map>()
          .map((e) => StoreModel.fromJson(e.cast<String, dynamic>()))
          .toList();
    }
    return const [];
  }

  Future<StoreModel> getStore(int storeId) async {
    final res = await _client.get('/api/stores/$storeId', skipAuth: true);
    return StoreModel.fromJson((res as Map).cast<String, dynamic>());
  }

  Future<List<StoreBranchModel>> listStoreBranches(int storeId) async {
    final res =
        await _client.get('/api/stores/$storeId/branches', skipAuth: true);
    if (res is List) {
      return res
          .whereType<Map>()
          .map((e) => StoreBranchModel.fromJson(e.cast<String, dynamic>()))
          .toList();
    }
    return const [];
  }

  Future<List<CategoryModel>> listCategories() async {
    final res = await _client.get(
      '/api/categories',
      queryParameters: {'tree': false},
      skipAuth: true,
    );
    if (res is List) {
      return res
          .whereType<Map>()
          .map((e) => CategoryModel.fromJson(e.cast<String, dynamic>()))
          .toList();
    }
    return const [];
  }

  Future<List<ProductSummaryModel>> listProducts({
    int? storeId,
    int? categoryId,
    String? q,
  }) async {
    final query = <String, dynamic>{
      if (storeId != null) 'storeId': storeId,
      if (categoryId != null) 'categoryId': categoryId,
      if (q != null && q.trim().isNotEmpty) 'q': q.trim(),
    };
    final res = await _client.get(
      '/api/products',
      queryParameters: query.isEmpty ? null : query,
      skipAuth: true,
    );
    if (res is List) {
      return res
          .whereType<Map>()
          .where((e) => e['minPrice'] != null)
          .map((e) => ProductSummaryModel.fromJson(e.cast<String, dynamic>()))
          .toList();
    }
    return const [];
  }

  Future<ProductDetailModel> getProduct(
    int productId, {
    String storeName = 'Gian hàng chính hãng',
  }) async {
    final res = await _client.get('/api/products/$productId', skipAuth: true);
    return ProductDetailModel.fromJson(
      (res as Map).cast<String, dynamic>(),
      storeName: storeName,
    );
  }

  Future<List<PromotionModel>> listPromotions({int? storeId}) async {
    final res = await _client.get(
      '/api/promotions',
      queryParameters: storeId != null ? {'storeId': storeId} : null,
      skipAuth: true,
    );
    if (res is List) {
      return res
          .whereType<Map>()
          .map((e) => PromotionModel.fromJson(e.cast<String, dynamic>()))
          .toList();
    }
    return const [];
  }

  Future<List<ReviewModel>> listReviews({
    int? storeId,
    int? variantId,
    int? orderId,
  }) async {
    final query = <String, dynamic>{
      if (storeId != null) 'storeId': storeId,
      if (variantId != null) 'variantId': variantId,
      if (orderId != null) 'orderId': orderId,
    };
    final res = await _client.get(
      '/api/reviews',
      queryParameters: query,
      skipAuth: true,
    );
    if (res is List) {
      return res
          .whereType<Map>()
          .map((e) => ReviewModel.fromJson(e.cast<String, dynamic>()))
          .toList();
    }
    return const [];
  }

  Future<ReviewModel> createReview({
    required int orderItemId,
    required int rating,
    String? comment,
  }) async {
    final res = await _client.post(
      '/api/reviews',
      data: {
        'orderItemId': orderItemId,
        'rating': rating,
        if (comment != null && comment.trim().isNotEmpty)
          'comment': comment.trim(),
      },
    );
    return ReviewModel.fromJson((res as Map).cast<String, dynamic>());
  }
}
