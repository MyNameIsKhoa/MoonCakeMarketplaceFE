import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../catalog/data/catalog_api.dart';
import '../../catalog/data/catalog_models.dart';
import '../../catalog/presentation/catalog_controller.dart';
import '../data/commerce_api.dart';
import '../data/commerce_models.dart';

class CartState {
  final bool loading;
  final String? error;
  final CartResponseModel cart;

  const CartState({
    this.loading = false,
    this.error,
    this.cart = const CartResponseModel(),
  });

  int get totalCount => cart.totalQuantity;

  CartState copyWith({
    bool? loading,
    String? error,
    bool clearError = false,
    CartResponseModel? cart,
  }) {
    return CartState(
      loading: loading ?? this.loading,
      error: clearError ? null : (error ?? this.error),
      cart: cart ?? this.cart,
    );
  }
}

final commerceApiProvider = Provider<CommerceApi>((ref) {
  return CommerceApi(ref.watch(dioClientProvider));
});

final cartControllerProvider =
    StateNotifierProvider<CartController, CartState>((ref) {
  final auth = ref.watch(authControllerProvider);
  final commerceApi = ref.watch(commerceApiProvider);
  final catalogApi = ref.watch(catalogApiProvider);
  final controller = CartController(commerceApi, catalogApi);
  if (auth.isAuthenticated) {
    controller.refresh();
  }
  return controller;
});

class CartController extends StateNotifier<CartState> {
  final CommerceApi _commerceApi;
  final CatalogApi _catalogApi;

  CartController(this._commerceApi, this._catalogApi)
      : super(const CartState());

  Future<void> refresh() async {
    state = state.copyWith(loading: true, clearError: true);
    try {
      final cart = await _commerceApi.getCart();
      if (mounted) {
        state = CartState(loading: false, cart: cart);
      }
    } catch (e) {
      if (mounted) {
        state = state.copyWith(loading: false, error: e.toString());
      }
    }
  }

  /// Adds a specific variant (or the first active in-stock variant of a product) to cart.
  Future<void> addProductToCart({
    required ProductSummaryModel product,
    int? variantId,
    int quantity = 1,
  }) async {
    state = state.copyWith(loading: true, clearError: true);
    try {
      int resolvedVariantId = variantId ?? 0;
      if (resolvedVariantId <= 0) {
        final detail = await _catalogApi.getProduct(
          product.productId,
          storeName: product.storeName,
        );
        if (detail.summary.status != 'ACTIVE') {
          throw Exception('Sản phẩm hiện không mở bán.');
        }
        ProductVariantModel? firstAvailable;
        for (final v in detail.variants) {
          if (v.status == 'ACTIVE' && v.stockQuantity >= quantity) {
            firstAvailable = v;
            break;
          }
        }
        if (firstAvailable == null) {
          throw Exception(
              'Phân loại sản phẩm đã hết hàng hoặc không đủ số lượng tồn kho.');
        }
        resolvedVariantId = firstAvailable.variantId;
      }

      final updated = await _commerceApi.addCartItem(
        variantId: resolvedVariantId,
        quantity: quantity,
      );
      if (mounted) {
        state = CartState(loading: false, cart: updated);
      }
    } catch (e) {
      if (mounted) {
        state = state.copyWith(loading: false, error: e.toString());
      }
      rethrow;
    }
  }

  Future<void> updateQuantity(int cartItemId, int newQuantity) async {
    state = state.copyWith(loading: true, clearError: true);
    try {
      final CartResponseModel updated;
      if (newQuantity <= 0) {
        updated = await _commerceApi.removeCartItem(cartItemId);
      } else {
        updated = await _commerceApi.updateCartItem(
          cartItemId: cartItemId,
          quantity: newQuantity,
        );
      }
      if (mounted) {
        state = CartState(loading: false, cart: updated);
      }
    } catch (e) {
      if (mounted) {
        state = state.copyWith(loading: false, error: e.toString());
      }
      rethrow;
    }
  }

  Future<void> removeItem(int cartItemId) async {
    state = state.copyWith(loading: true, clearError: true);
    try {
      final updated = await _commerceApi.removeCartItem(cartItemId);
      if (mounted) {
        state = CartState(loading: false, cart: updated);
      }
    } catch (e) {
      if (mounted) {
        state = state.copyWith(loading: false, error: e.toString());
      }
      rethrow;
    }
  }

  void clearLocalCart() {
    state = const CartState();
  }
}
