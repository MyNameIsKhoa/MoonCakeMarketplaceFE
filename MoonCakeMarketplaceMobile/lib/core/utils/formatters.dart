import 'dart:convert';
import 'package:intl/intl.dart';

class Formatters {
  static final NumberFormat _vndFormat = NumberFormat.currency(
    locale: 'vi_VN',
    symbol: '₫',
    decimalDigits: 0,
  );

  /// Formats a numeric or string amount into Vietnamese Dong (e.g., "185.000 ₫").
  static String formatVnd(dynamic value) {
    final amount = parseDouble(value);
    if (!amount.isFinite) return '0 ₫';
    return _vndFormat.format(amount.round());
  }

  static double parseDouble(dynamic value, [double fallback = 0]) {
    if (value == null) return fallback;
    if (value is num) return value.toDouble();
    if (value is String) {
      final cleaned = value.trim();
      if (cleaned.isEmpty) return fallback;
      return double.tryParse(cleaned) ?? fallback;
    }
    return fallback;
  }

  static int parseInt(dynamic value, [int fallback = 0]) {
    if (value == null) return fallback;
    if (value is int) return value;
    if (value is num) return value.toInt();
    if (value is String) {
      final cleaned = value.trim();
      if (cleaned.isEmpty) return fallback;
      return int.tryParse(cleaned) ?? double.tryParse(cleaned)?.toInt() ?? fallback;
    }
    return fallback;
  }

  /// Backend microservices store timestamps in UTC, but Identity/Catalog/Commerce
  /// serialize LocalDateTime without a trailing 'Z' (e.g. "2026-10-10T09:15:00").
  /// Appending 'Z' before parsing ensures proper conversion to local Vietnam time.
  static DateTime? parseApiDate(String? value) {
    if (value == null) return null;
    final trimmed = value.trim();
    if (trimmed.isEmpty) return null;

    if (RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(trimmed)) {
      return DateTime.tryParse('${trimmed}T00:00:00');
    }

    final hasTimezone = RegExp(r'(Z|[+-]\d{2}:?\d{2})$', caseSensitive: false)
        .hasMatch(trimmed);
    final normalized =
        (trimmed.contains('T') && !hasTimezone) ? '${trimmed}Z' : trimmed;
    final parsed = DateTime.tryParse(normalized);
    return parsed?.toLocal();
  }

  static String formatDateVi(String? value) {
    final date = parseApiDate(value);
    if (date == null) return value ?? '—';
    return DateFormat('dd/MM/yyyy').format(date);
  }

  static String formatDateTimeVi(String? value) {
    final date = parseApiDate(value);
    if (date == null) return value ?? '—';
    return DateFormat('HH:mm dd/MM/yyyy').format(date);
  }

  static final RegExp phonePattern =
      RegExp(r'^\+?[0-9][0-9 .-]{6,28}[0-9]$');

  static bool isValidPhone(String phone) {
    return phonePattern.hasMatch(phone.trim());
  }

  /// Extracts token from either a raw token string or a full URL containing `?token=...`.
  static String extractTokenFromInput(String rawInput) {
    final trimmed = rawInput.trim();
    if (trimmed.isEmpty) return '';
    final uri = Uri.tryParse(trimmed);
    if (uri != null && uri.queryParameters.containsKey('token')) {
      return uri.queryParameters['token']!.trim();
    }
    final match = RegExp(r'[?&]token=([^&#\s]+)').firstMatch(trimmed);
    if (match != null) {
      return Uri.decodeComponent(match.group(1)!).trim();
    }
    return trimmed;
  }

  /// Decodes JWT payload and checks whether `exp` has passed.
  static bool isJwtExpired(String? token) {
    if (token == null || token.trim().isEmpty) return true;
    final parts = token.split('.');
    if (parts.length != 3) return true;
    try {
      final normalized = base64Url.normalize(parts[1]);
      final payloadJson = utf8.decode(base64Url.decode(normalized));
      final payload = jsonDecode(payloadJson);
      if (payload is Map<String, dynamic>) {
        final exp = payload['exp'];
        if (exp is num) {
          final nowSeconds = DateTime.now().millisecondsSinceEpoch ~/ 1000;
          return exp.toInt() <= nowSeconds;
        }
      }
      return false;
    } catch (_) {
      return true;
    }
  }
}
