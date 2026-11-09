import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AppStorage {
  static const String _accessTokenKey = 'mooncake.accessToken';
  static const String _apiBaseUrlKey = 'mooncake.apiBaseUrl';

  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  String? _cachedToken;

  String? get cachedToken => _cachedToken;

  Future<String?> readAccessToken() async {
    if (_cachedToken != null) return _cachedToken;
    try {
      final token = await _secureStorage
          .read(key: _accessTokenKey)
          .timeout(const Duration(milliseconds: 800));
      if (token != null && token.isNotEmpty) {
        _cachedToken = token;
        return token;
      }
    } catch (_) {
      // Fallback to SharedPreferences on platforms/tests where secure storage is unavailable
    }
    try {
      final prefs = await SharedPreferences.getInstance();
      final fallback = prefs.getString(_accessTokenKey);
      _cachedToken = (fallback != null && fallback.isNotEmpty) ? fallback : null;
      return _cachedToken;
    } catch (_) {
      return null;
    }
  }

  Future<void> writeAccessToken(String? token) async {
    final cleaned = (token != null && token.trim().isNotEmpty) ? token.trim() : null;
    _cachedToken = cleaned;
    try {
      if (cleaned == null) {
        await _secureStorage
            .delete(key: _accessTokenKey)
            .timeout(const Duration(milliseconds: 800));
      } else {
        await _secureStorage
            .write(key: _accessTokenKey, value: cleaned)
            .timeout(const Duration(milliseconds: 800));
      }
    } catch (_) {
      // Ignore secure storage error and persist in SharedPreferences fallback
    }
    try {
      final prefs = await SharedPreferences.getInstance();
      if (cleaned == null) {
        await prefs.remove(_accessTokenKey);
      } else {
        await prefs.setString(_accessTokenKey, cleaned);
      }
    } catch (_) {}
  }

  Future<List<String>> readWishlist(int userId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString('mooncake.wishlist.$userId');
      if (raw == null || raw.isEmpty) return const [];
      final decoded = jsonDecode(raw);
      if (decoded is List) {
        return decoded.map((e) => e.toString()).where((s) => s.isNotEmpty).toList();
      }
      return const [];
    } catch (_) {
      return const [];
    }
  }

  Future<void> writeWishlist(int userId, List<String> productIds) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('mooncake.wishlist.$userId', jsonEncode(productIds));
    } catch (_) {}
  }

  Future<String?> readCustomApiBaseUrl() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString(_apiBaseUrlKey);
    } catch (_) {
      return null;
    }
  }

  Future<void> writeCustomApiBaseUrl(String? url) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      if (url == null || url.trim().isEmpty) {
        await prefs.remove(_apiBaseUrlKey);
      } else {
        await prefs.setString(_apiBaseUrlKey, url.trim());
      }
    } catch (_) {}
  }
}
