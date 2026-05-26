import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:get/get.dart' hide Response;

import '../constants/api_constants.dart';
import '../routes/app_routes.dart';
import '../storage/token_storage.dart';
import 'api_exception.dart';

class DioClient {
  DioClient(this._tokenStorage)
    : dio = Dio(
        BaseOptions(
          baseUrl: ApiConstants.baseUrl,
          connectTimeout: ApiConstants.connectTimeout,
          receiveTimeout: ApiConstants.receiveTimeout,
          sendTimeout: ApiConstants.sendTimeout,
          headers: const {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        ),
      ) {
    _configureInterceptors();
  }

  final TokenStorage _tokenStorage;
  final Dio dio;
  bool _isRefreshing = false;

  Future<Response<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) {
    return _request(
      () =>
          dio.get<T>(path, queryParameters: queryParameters, options: options),
    );
  }

  Future<Response<T>> post<T>(
    String path, {
    Object? data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) {
    return _request(
      () => dio.post<T>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
      ),
    );
  }

  Future<Response<T>> patch<T>(
    String path, {
    Object? data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) {
    return _request(
      () => dio.patch<T>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
      ),
    );
  }

  Future<Response<T>> delete<T>(
    String path, {
    Object? data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) {
    return _request(
      () => dio.delete<T>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
      ),
    );
  }

  Future<Response<T>> _request<T>(Future<Response<T>> Function() call) async {
    try {
      return await call();
    } on DioException catch (error) {
      throw ApiException(
        _extractMessage(error.response?.data) ?? _messageForType(error.type),
        statusCode: error.response?.statusCode,
        errors: error.response?.data,
      );
    }
  }

  void _configureInterceptors() {
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          if (options.extra['skipAuth'] == true) {
            return handler.next(options);
          }

          final token = await _tokenStorage.getAccessToken();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (error, handler) async {
          final request = error.requestOptions;
          final shouldRefresh =
              error.response?.statusCode == 401 &&
              request.extra['skipAuth'] != true &&
              request.extra['retried'] != true;

          if (!shouldRefresh) {
            return handler.next(error);
          }

          try {
            final newAccessToken = await _refreshAccessToken();
            if (newAccessToken == null) {
              await _forceLogout();
              return handler.next(error);
            }

            request.extra['retried'] = true;
            request.headers['Authorization'] = 'Bearer $newAccessToken';
            final response = await dio.fetch<dynamic>(request);
            return handler.resolve(response);
          } catch (_) {
            await _forceLogout();
            return handler.next(error);
          }
        },
      ),
    );

    if (!kReleaseMode) {
      dio.interceptors.add(
        LogInterceptor(requestBody: true, responseBody: true, error: true),
      );
    }
  }

  Future<String?> _refreshAccessToken() async {
    if (_isRefreshing) return null;
    _isRefreshing = true;

    try {
      final refreshToken = await _tokenStorage.getRefreshToken();
      if (refreshToken == null || refreshToken.isEmpty) return null;

      final refreshDio = Dio(
        BaseOptions(
          baseUrl: ApiConstants.baseUrl,
          connectTimeout: ApiConstants.connectTimeout,
          receiveTimeout: ApiConstants.receiveTimeout,
          sendTimeout: ApiConstants.sendTimeout,
          headers: const {'Content-Type': 'application/json'},
        ),
      );

      final response = await refreshDio.post<dynamic>(
        '/auth/refresh',
        data: {'refreshToken': refreshToken},
        options: Options(extra: {'skipAuth': true}),
      );
      final payload = _asMap(response.data);
      final data = _asMap(payload?['data']) ?? payload;
      final accessToken = data?['accessToken']?.toString();
      final nextRefreshToken =
          data?['refreshToken']?.toString() ?? refreshToken;

      if (accessToken == null || accessToken.isEmpty) return null;
      await _tokenStorage.saveTokens(
        accessToken: accessToken,
        refreshToken: nextRefreshToken,
      );
      return accessToken;
    } finally {
      _isRefreshing = false;
    }
  }

  Future<void> _forceLogout() async {
    await _tokenStorage.clearTokens();
    if (Get.currentRoute != AppRoutes.login) {
      Get.offAllNamed(AppRoutes.login);
    }
  }

  static Map<String, dynamic>? _asMap(Object? value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) return Map<String, dynamic>.from(value);
    return null;
  }

  static String? _extractMessage(Object? data) {
    final map = _asMap(data);
    if (map == null) return null;

    final message = map['message'] ?? map['error'];
    if (message is List) return message.join('\n');
    return message?.toString();
  }

  static String _messageForType(DioExceptionType type) {
    return switch (type) {
      DioExceptionType.connectionTimeout ||
      DioExceptionType.sendTimeout ||
      DioExceptionType.receiveTimeout =>
        'Ket noi may chu qua lau. Vui long thu lai.',
      DioExceptionType.connectionError => 'Khong the ket noi may chu.',
      DioExceptionType.badCertificate => 'Chung chi may chu khong hop le.',
      DioExceptionType.cancel => 'Yeu cau da bi huy.',
      _ => 'Co loi xay ra. Vui long thu lai.',
    };
  }
}
