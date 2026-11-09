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

    if (data is Map<String, dynamic>) {
      final code = (data['code'] ?? data['error'] ?? 'HTTP_$status').toString();
      final message =
          (data['message'] ?? data['error'] ?? 'Yêu cầu không thành công').toString();
      final rawDetails = data['details'];
      final details = <String, String>{};
      if (rawDetails is Map) {
        rawDetails.forEach((k, v) {
          if (k != null && v != null) {
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
