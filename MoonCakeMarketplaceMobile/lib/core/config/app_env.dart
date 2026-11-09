import 'dart:io' show Platform;
import 'package:flutter/foundation.dart';

class AppEnv {
  static const String _definedBaseUrl = String.fromEnvironment('API_BASE_URL');
  static const String _definedOrigin = String.fromEnvironment(
    'WS_ORIGIN',
    defaultValue: 'http://localhost:5173',
  );

  static String? _runtimeBaseUrlOverride;

  static void setBaseUrlOverride(String? url) {
    final trimmed = url?.trim();
    if (trimmed == null || trimmed.isEmpty) {
      _runtimeBaseUrlOverride = null;
    } else {
      _runtimeBaseUrlOverride = trimmed.replaceAll(RegExp(r'/+$'), '');
    }
  }

  static String get defaultBaseUrl {
    if (_definedBaseUrl.isNotEmpty) {
      return _definedBaseUrl.replaceAll(RegExp(r'/+$'), '');
    }
    if (!kIsWeb && Platform.isAndroid) {
      return 'http://10.0.2.2:8080';
    }
    return 'http://localhost:8080';
  }

  static String get apiBaseUrl => _runtimeBaseUrlOverride ?? defaultBaseUrl;

  static String get wsChatUrl {
    final base = apiBaseUrl;
    if (base.startsWith('https://')) {
      return 'wss://${base.substring('https://'.length)}/ws/chat';
    }
    if (base.startsWith('http://')) {
      return 'ws://${base.substring('http://'.length)}/ws/chat';
    }
    return 'ws://$base/ws/chat';
  }

  static String get wsOriginHeader => _definedOrigin;
}
