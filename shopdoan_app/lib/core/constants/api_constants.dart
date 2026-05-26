class ApiConstants {
  ApiConstants._();

  // Doi baseUrl tai day neu backend chay tren IP noi bo khi test dien thoai that.
  static const String baseUrl = 'https://shopdoan-api-g850.onrender.com/api/v1';

  static const Duration connectTimeout = Duration(seconds: 20);
  static const Duration receiveTimeout = Duration(seconds: 20);
  static const Duration sendTimeout = Duration(seconds: 20);
}
