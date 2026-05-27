import 'package:flutter/foundation.dart';

class ApiConstants {
  ApiConstants._();

  static String get baseUrl {
    const configured = String.fromEnvironment('API_BASE_URL');
    if (configured.isNotEmpty) return configured;

    if (kIsWeb) return 'http://localhost:3002/api/v1';
    if (defaultTargetPlatform == TargetPlatform.android) {
      return 'http://192.168.1.13:3002/api/v1';
    }
    return 'http://localhost:3002/api/v1';
  }

  static const Duration connectTimeout = Duration(seconds: 20);
  static const Duration receiveTimeout = Duration(seconds: 20);
  static const Duration sendTimeout = Duration(seconds: 20);
}
