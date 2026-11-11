import 'package:dio/dio.dart';
import '../config/app_env.dart';
import '../storage/token_storage.dart';
import '../utils/formatters.dart';
import 'api_exception.dart';

typedef UnauthorizedCallback = void Function();

class DioClient {
  final AppStorage _storage;
  UnauthorizedCallback? onUnauthorized;
  late final Dio _dio;

  DioClient(this._storage, {this.onUnauthorized}) {
    _dio = Dio(
      BaseOptions(
        baseUrl: AppEnv.apiBaseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 20),
        headers: const {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          options.baseUrl = AppEnv.apiBaseUrl;
          final skipAuth = options.extra['skipAuth'] == true;
          if (!skipAuth) {
            final token = await _storage.readAccessToken();
            if (token != null && token.isNotEmpty) {
              options.headers['Authorization'] = 'Bearer $token';
            }
          }
          handler.next(options);
        },
        onError: (DioException error, handler) async {
          final status = error.response?.statusCode ?? 0;
          final skipAuth = error.requestOptions.extra['skipAuth'] == true;
          if (!skipAuth) {
            final token = _storage.cachedToken;
            final expiredOrMissing =
                token == null || Formatters.isJwtExpired(token);
            if (status == 401 || (status == 403 && expiredOrMissing)) {
              await _storage.writeAccessToken(null);
              onUnauthorized?.call();
            }
          }
          handler.next(error);
        },
      ),
    );
  }

  Dio get dio => _dio;

  Future<dynamic> get(
    String path, {
    Map<String, dynamic>? queryParameters,
    bool skipAuth = false,
  }) async {
    try {
      final response = await _dio.get(
        path,
        queryParameters: queryParameters,
        options: Options(extra: {'skipAuth': skipAuth}),
      );
      return response.data;
    } on DioException catch (e) {
      throw _mapDioException(e);
    }
  }

  Future<dynamic> post(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Map<String, dynamic>? headers,
    bool skipAuth = false,
  }) async {
    try {
      final response = await _dio.post(
        path,
        data: data,
        queryParameters: queryParameters,
        options: Options(
          headers: headers,
          extra: {'skipAuth': skipAuth},
        ),
      );
      return response.data;
    } on DioException catch (e) {
      throw _mapDioException(e);
    }
  }

  Future<dynamic> patch(
    String path, {
    dynamic data,
    Map<String, dynamic>? headers,
    bool skipAuth = false,
  }) async {
    try {
      final response = await _dio.patch(
        path,
        data: data,
        options: Options(
          headers: headers,
          extra: {'skipAuth': skipAuth},
        ),
      );
      return response.data;
    } on DioException catch (e) {
      throw _mapDioException(e);
    }
  }

  Future<dynamic> put(
    String path, {
    dynamic data,
    Map<String, dynamic>? headers,
    bool skipAuth = false,
  }) async {
    try {
      final response = await _dio.put(
        path,
        data: data,
        options: Options(
          headers: headers,
          extra: {'skipAuth': skipAuth},
        ),
      );
      return response.data;
    } on DioException catch (e) {
      throw _mapDioException(e);
    }
  }

  Future<dynamic> delete(
    String path, {
    dynamic data,
    bool skipAuth = false,
  }) async {
    try {
      final response = await _dio.delete(
        path,
        data: data,
        options: Options(extra: {'skipAuth': skipAuth}),
      );
      return response.data;
    } on DioException catch (e) {
      throw _mapDioException(e);
    }
  }

  ApiException _mapDioException(DioException e) {
    final status = e.response?.statusCode ?? 0;
    final data = e.response?.data;

    if (data is Map) {
      final rawCode = data['code'] ?? data['errorCode'] ?? data['error'];
      final fallbackCode = switch (status) {
        400 => 'BAD_REQUEST',
        401 => 'UNAUTHORIZED',
        403 => 'FORBIDDEN',
        404 => 'NOT_FOUND',
        409 => 'CONFLICT',
        _ => 'HTTP_$status',
      };
      final rawMessage =
          data['message'] ?? data['detail'] ?? data['errorDescription'];
      final message = rawMessage is String && rawMessage.trim().isNotEmpty
          ? rawMessage.trim()
          : (rawCode is String && rawCode.trim().isNotEmpty
              ? rawCode.trim()
              : 'Yêu cầu không thành công');
      final code = rawCode is String && rawCode.trim().isNotEmpty
          ? rawCode.trim()
          : fallbackCode;
      final details = <String, String>{};
      final rawDetails = data['details'] ?? data['errors'];
      if (rawDetails is Map) {
        rawDetails.forEach((k, v) {
          if (k == null || v == null) return;
          if (v is List) {
            details[k.toString()] = v.map((item) => item.toString()).join(', ');
          } else {
            details[k.toString()] = v.toString();
          }
        });
      }
      return ApiException(
        status: status,
        code: code,
        message: message,
        details: details,
      );
    }
    if (data is String && data.trim().isNotEmpty) {
      return ApiException(
        status: status,
        code: 'HTTP_$status',
        message: data.trim(),
      );
    }

    if (status == 403) {
      return ApiException(
        status: status,
        code: 'FORBIDDEN',
        message: 'Bạn không có quyền thực hiện thao tác này.',
      );
    }
    if (status == 409) {
      return ApiException(
        status: status,
        code: 'CONFLICT',
        message: 'Trạng thái dữ liệu vừa thay đổi. Hãy tải lại rồi thử lại.',
      );
    }
    if (status == 400) {
      return ApiException(
        status: status,
        code: 'BAD_REQUEST',
        message: 'Yêu cầu không hợp lệ. Vui lòng kiểm tra thông tin đã nhập.',
      );
    }
    if (status == 404) {
      return ApiException(
        status: status,
        code: 'NOT_FOUND',
        message: 'Không tìm thấy dữ liệu yêu cầu hoặc bạn không có quyền xem.',
      );
    }
    if (status == 401) {
      return ApiException(
        status: status,
        code: 'UNAUTHORIZED',
        message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
      );
    }
    if (e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.receiveTimeout ||
        e.type == DioExceptionType.connectionError) {
      return ApiException(
        status: 0,
        code: 'NETWORK_ERROR',
        message:
            'Không thể kết nối tới API Gateway (${AppEnv.apiBaseUrl}). Hãy kiểm tra Backend đã chạy ở cổng 8080 chưa.',
      );
    }

    return ApiException(
      status: status,
      code: 'HTTP_$status',
      message: e.message ?? 'Đã xảy ra lỗi kết nối máy chủ.',
    );
  }
}
