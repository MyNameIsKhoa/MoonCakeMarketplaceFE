import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/config/app_env.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/storage/token_storage.dart';
import '../../../core/utils/formatters.dart';
import '../data/auth_models.dart';
import '../data/identity_api.dart';

enum AuthStatus { loading, guest, authenticated }

class AuthState {
  final AuthStatus status;
  final UserProfile? user;
  final List<String> wishlistIds;
  final int unreadNotifications;

  const AuthState({
    required this.status,
    this.user,
    this.wishlistIds = const [],
    this.unreadNotifications = 0,
  });

  bool get isAuthenticated =>
      status == AuthStatus.authenticated && user != null;

  AuthState copyWith({
    AuthStatus? status,
    UserProfile? user,
    bool clearUser = false,
    List<String>? wishlistIds,
    int? unreadNotifications,
  }) {
    return AuthState(
      status: status ?? this.status,
      user: clearUser ? null : (user ?? this.user),
      wishlistIds: wishlistIds ?? this.wishlistIds,
      unreadNotifications: unreadNotifications ?? this.unreadNotifications,
    );
  }
}

final appStorageProvider = Provider<AppStorage>((ref) => AppStorage());

final dioClientProvider = Provider<DioClient>((ref) {
  final storage = ref.watch(appStorageProvider);
  return DioClient(storage);
});

final identityApiProvider = Provider<IdentityApi>((ref) {
  return IdentityApi(ref.watch(dioClientProvider));
});

final authControllerProvider =
    StateNotifierProvider<AuthController, AuthState>((ref) {
  final storage = ref.watch(appStorageProvider);
  final dioClient = ref.watch(dioClientProvider);
  final identityApi = ref.watch(identityApiProvider);
  final controller = AuthController(storage, identityApi);
  dioClient.onUnauthorized = () {
    controller.handleUnauthorized();
  };
  return controller;
});

class AuthController extends StateNotifier<AuthState> {
  final AppStorage _storage;
  final IdentityApi _identityApi;

  AuthController(this._storage, this._identityApi)
      : super(const AuthState(status: AuthStatus.loading)) {
    initialize();
  }

  Future<void> initialize() async {
    final customUrl = await _storage.readCustomApiBaseUrl();
    if (customUrl != null && customUrl.isNotEmpty) {
      AppEnv.setBaseUrlOverride(customUrl);
    }

    final token = await _storage.readAccessToken();
    if (token == null || token.isEmpty || Formatters.isJwtExpired(token)) {
      await _storage.writeAccessToken(null);
      state = const AuthState(status: AuthStatus.guest);
      return;
    }

    try {
      final user = await _identityApi.getMe();
      final wishlist = await _storage.readWishlist(user.userId);
      int unread = 0;
      try {
        unread = await _identityApi.getUnreadNotificationCount();
      } catch (_) {}
      state = AuthState(
        status: AuthStatus.authenticated,
        user: user,
        wishlistIds: wishlist,
        unreadNotifications: unread,
      );
    } catch (_) {
      await _storage.writeAccessToken(null);
      state = const AuthState(status: AuthStatus.guest);
    }
  }

  void handleUnauthorized() {
    state = const AuthState(status: AuthStatus.guest);
  }

  Future<UserProfile> login({
    required String email,
    required String password,
  }) async {
    final res = await _identityApi.login(email: email, password: password);
    await _storage.writeAccessToken(res.accessToken);
    final wishlist = await _storage.readWishlist(res.user.userId);
    int unread = 0;
    try {
      unread = await _identityApi.getUnreadNotificationCount();
    } catch (_) {}
    state = AuthState(
      status: AuthStatus.authenticated,
      user: res.user,
      wishlistIds: wishlist,
      unreadNotifications: unread,
    );
    return res.user;
  }

  Future<UserProfile> loginWithGoogle(String idToken) async {
    final res = await _identityApi.loginWithGoogle(idToken);
    await _storage.writeAccessToken(res.accessToken);
    final wishlist = await _storage.readWishlist(res.user.userId);
    int unread = 0;
    try {
      unread = await _identityApi.getUnreadNotificationCount();
    } catch (_) {}
    state = AuthState(
      status: AuthStatus.authenticated,
      user: res.user,
      wishlistIds: wishlist,
      unreadNotifications: unread,
    );
    return res.user;
  }

  Future<UserProfile> register({
    required String email,
    required String password,
    required String fullName,
    String? phoneNumber,
  }) async {
    return _identityApi.register(
      email: email,
      password: password,
      fullName: fullName,
      phoneNumber: phoneNumber,
    );
  }

  Future<UserProfile> updateProfile({
    String? fullName,
    String? phoneNumber,
  }) async {
    final updated = await _identityApi.updateMe(
      fullName: fullName,
      phoneNumber: phoneNumber,
    );
    state = state.copyWith(user: updated);
    return updated;
  }

  Future<void> refreshUnreadNotifications() async {
    if (!state.isAuthenticated) return;
    try {
      final count = await _identityApi.getUnreadNotificationCount();
      if (mounted) {
        state = state.copyWith(unreadNotifications: count);
      }
    } catch (_) {}
  }

  Future<bool> toggleWishlist(String productId) async {
    final user = state.user;
    if (user == null) return false;
    final current = List<String>.from(state.wishlistIds);
    final exists = current.contains(productId);
    if (exists) {
      current.remove(productId);
    } else {
      current.add(productId);
    }
    state = state.copyWith(wishlistIds: current);
    await _storage.writeWishlist(user.userId, current);
    return !exists;
  }

  Future<void> logout() async {
    await _storage.writeAccessToken(null);
    state = const AuthState(status: AuthStatus.guest);
  }
}
