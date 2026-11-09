import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../auth/presentation/auth_controller.dart';
import '../data/catalog_api.dart';
import '../data/catalog_models.dart';

class CatalogState {
  final bool loading;
  final String? error;
  final List<StoreModel> stores;
  final List<CategoryModel> categories;
  final List<ProductSummaryModel> products;

  const CatalogState({
    this.loading = true,
    this.error,
    this.stores = const [],
    this.categories = const [],
    this.products = const [],
  });

  StoreModel? findStore(int storeId) {
    for (final s in stores) {
      if (s.storeId == storeId) return s;
    }
    return null;
  }

  CatalogState copyWith({
    bool? loading,
    String? error,
    bool clearError = false,
    List<StoreModel>? stores,
    List<CategoryModel>? categories,
    List<ProductSummaryModel>? products,
  }) {
    return CatalogState(
      loading: loading ?? this.loading,
      error: clearError ? null : (error ?? this.error),
      stores: stores ?? this.stores,
      categories: categories ?? this.categories,
      products: products ?? this.products,
    );
  }
}

final catalogApiProvider = Provider<CatalogApi>((ref) {
  return CatalogApi(ref.watch(dioClientProvider));
});

final catalogControllerProvider =
    StateNotifierProvider<CatalogController, CatalogState>((ref) {
  return CatalogController(ref.watch(catalogApiProvider));
});

class CatalogController extends StateNotifier<CatalogState> {
  final CatalogApi _api;

  CatalogController(this._api) : super(const CatalogState()) {
    refresh();
  }

  Future<void> refresh() async {
    state = state.copyWith(loading: true, clearError: true);
    try {
      final results = await Future.wait([
        _api.listStores(),
        _api.listCategories(),
        _api.listProducts(),
      ]);

      final allStores = results[0] as List<StoreModel>;
      final allCategories = results[1] as List<CategoryModel>;
      final allProducts = results[2] as List<ProductSummaryModel>;

      final activeStores =
          allStores.where((s) => s.status == 'ACTIVE').toList();
      final storeNameById = <int, String>{
        for (final s in activeStores) s.storeId: s.name,
      };

      final activeCategories =
          allCategories.where((c) => c.status == 'ACTIVE').toList();

      final visibleProducts = allProducts
          .where((p) =>
              (p.status == 'ACTIVE' || p.status == 'OUT_OF_STOCK') &&
              storeNameById.containsKey(p.storeId))
          .map((p) => p.copyWith(storeName: storeNameById[p.storeId]))
          .toList();

      state = CatalogState(
        loading: false,
        stores: activeStores,
        categories: activeCategories,
        products: visibleProducts,
      );
    } catch (e) {
      state = state.copyWith(
        loading: false,
        error: e.toString(),
      );
    }
  }
}
