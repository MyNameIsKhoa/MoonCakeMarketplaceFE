import 'dart:async';
import 'dart:convert';
import 'dart:io';
import '../../../core/config/app_env.dart';
import 'rfq_models.dart';

enum StompStatus { disconnected, connecting, connected, error }

/// Native Dart STOMP 1.2 client over WebSocket matching `chatStompClient.ts` on Web.
/// Sends `Origin: http://localhost:5173` on HTTP Upgrade so API-Gateway and RFQService
/// OriginHandshakeInterceptor accept the mobile connection without backend changes.
class StompChatClient {
  final String accessToken;
  final String conversationId;
  final void Function(ChatMessageModel message) onMessage;
  final void Function(StompStatus status, String? error) onStatusChange;

  WebSocket? _socket;
  Timer? _heartbeatTimer;
  String _buffer = '';
  bool _closed = false;

  StompChatClient({
    required this.accessToken,
    required this.conversationId,
    required this.onMessage,
    required this.onStatusChange,
  });

  Future<void> connect() async {
    _closed = false;
    onStatusChange(StompStatus.connecting, null);
    try {
      _socket = await WebSocket.connect(
        AppEnv.wsChatUrl,
        headers: {
          'Origin': AppEnv.wsOriginHeader,
        },
      ).timeout(const Duration(seconds: 10));

      if (_closed) {
        await _socket?.close();
        return;
      }

      _socket!.listen(
        _onData,
        onError: (Object err) {
          if (!_closed) {
            onStatusChange(
                StompStatus.error, 'Mất kết nối kênh chat thời gian thực.');
          }
        },
        onDone: () {
          _heartbeatTimer?.cancel();
          if (!_closed) {
            onStatusChange(StompStatus.disconnected, null);
          }
        },
      );

      _sendFrame('CONNECT', {
        'accept-version': '1.2',
        'heart-beat': '10000,10000',
        'Authorization': 'Bearer $accessToken',
      });
    } catch (_) {
      if (!_closed) {
        onStatusChange(
          StompStatus.error,
          'Không thể kết nối WebSocket (${AppEnv.wsChatUrl}).',
        );
      }
    }
  }

  void sendChatMessage({
    required String messageText,
    required String clientMessageId,
  }) {
    final socket = _socket;
    if (socket == null || socket.readyState != WebSocket.open) {
      throw Exception('Chưa kết nối kênh chat thời gian thực.');
    }
    final payload = jsonEncode({
      'messageText': messageText.trim(),
      'clientMessageId': clientMessageId,
    });
    _sendFrame(
      'SEND',
      {
        'destination': '/app/conversations/$conversationId/messages',
        'content-type': 'application/json',
      },
      body: payload,
    );
  }

  Future<void> disconnect() async {
    _closed = true;
    _heartbeatTimer?.cancel();
    try {
      if (_socket != null && _socket!.readyState == WebSocket.open) {
        _sendFrame('DISCONNECT', {});
      }
      await _socket?.close();
    } catch (_) {}
    _socket = null;
  }

  void _sendFrame(
    String command,
    Map<String, String> headers, {
    String body = '',
  }) {
    final sb = StringBuffer()..writeln(command);
    headers.forEach((k, v) {
      sb.writeln('$k:$v');
    });
    sb.writeln();
    sb.write(body);
    sb.write('\x00');
    _socket?.add(sb.toString());
  }

  void _onData(dynamic rawData) {
    final chunk = rawData is String
        ? rawData
        : utf8.decode(rawData as List<int>, allowMalformed: true);
    _buffer += chunk;

    while (true) {
      final nullIdx = _buffer.indexOf('\x00');
      if (nullIdx == -1) break;
      final rawFrame = _buffer.substring(0, nullIdx);
      _buffer = _buffer.substring(nullIdx + 1);
      _handleFrame(rawFrame.trimLeft());
    }
  }

  void _handleFrame(String rawFrame) {
    if (rawFrame.isEmpty) return;
    final normalized = rawFrame.replaceAll('\r\n', '\n');
    final splitIdx = normalized.indexOf('\n\n');
    final headerPart =
        splitIdx >= 0 ? normalized.substring(0, splitIdx) : normalized;
    final bodyPart =
        splitIdx >= 0 ? normalized.substring(splitIdx + 2) : '';

    final lines = headerPart.split('\n');
    if (lines.isEmpty) return;
    final command = lines.first.trim();

    if (command == 'CONNECTED') {
      _sendFrame('SUBSCRIBE', {
        'id': 'sub-$conversationId',
        'destination': '/topic/conversations/$conversationId',
      });
      _heartbeatTimer?.cancel();
      _heartbeatTimer = Timer.periodic(const Duration(seconds: 10), (_) {
        if (_socket?.readyState == WebSocket.open) {
          _socket?.add('\n');
        }
      });
      onStatusChange(StompStatus.connected, null);
    } else if (command == 'MESSAGE') {
      try {
        final decoded = jsonDecode(bodyPart);
        if (decoded is Map<String, dynamic>) {
          onMessage(ChatMessageModel.fromJson(decoded));
        }
      } catch (_) {}
    } else if (command == 'ERROR') {
      onStatusChange(
        StompStatus.error,
        bodyPart.isNotEmpty ? bodyPart : 'Lỗi xác thực hoặc gửi tin nhắn STOMP.',
      );
    }
  }
}
