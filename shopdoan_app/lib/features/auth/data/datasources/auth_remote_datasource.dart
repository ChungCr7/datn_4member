import 'package:dio/dio.dart';

import '../../../../core/network/dio_client.dart';
import '../models/auth_session_model.dart';
import '../models/auth_user_model.dart';

abstract class AuthRemoteDataSource {
  Future<AuthSessionModel> login({
    required String email,
    required String password,
  });

  Future<void> register({
    required String name,
    required String email,
    required String phone,
    required String password,
  });

  Future<void> verifyRegistration({
    required String email,
    required String code,
  });

  Future<void> forgotPassword(String email);

  Future<void> verifyCode({required String email, required String code});

  Future<void> resendActivation(String email);

  Future<void> changePassword(Map<String, dynamic> payload);

  Future<AuthUserModel> getProfile();

  Future<AuthUserModel> updateProfile(Map<String, dynamic> payload);

  Future<AuthUserModel> updateProfileImage(String imagePath);

  Future<void> logout(int? userId);
}

class AuthRemoteDataSourceImpl implements AuthRemoteDataSource {
  AuthRemoteDataSourceImpl(this._dioClient);

  final DioClient _dioClient;

  @override
  Future<AuthSessionModel> login({
    required String email,
    required String password,
  }) async {
    final response = await _dioClient.post<dynamic>(
      '/auth/login',
      data: {'email': email, 'password': password},
      options: Options(extra: {'skipAuth': true}),
    );
    return AuthSessionModel.fromJson(_asMap(response.data) ?? const {});
  }

  @override
  Future<void> register({
    required String name,
    required String email,
    required String phone,
    required String password,
  }) async {
    await _dioClient.post<dynamic>(
      '/auth/register',
      data: {
        'name': name,
        'email': email,
        'phone': phone,
        'password': password,
      },
      options: Options(extra: {'skipAuth': true}),
    );
  }

  @override
  Future<void> verifyRegistration({
    required String email,
    required String code,
  }) async {
    await _dioClient.post<dynamic>(
      '/auth/verify-registration',
      data: {'email': email, 'code': code},
      options: Options(extra: {'skipAuth': true}),
    );
  }

  @override
  Future<void> forgotPassword(String email) async {
    await _dioClient.post<dynamic>(
      '/auth/forgot-password',
      data: {'email': email},
      options: Options(extra: {'skipAuth': true}),
    );
  }

  @override
  Future<void> verifyCode({required String email, required String code}) async {
    await _dioClient.post<dynamic>(
      '/auth/verify-code',
      data: {'email': email, 'code': code},
      options: Options(extra: {'skipAuth': true}),
    );
  }

  @override
  Future<void> resendActivation(String email) async {
    await _dioClient.post<dynamic>(
      '/auth/resend-activation',
      data: {'email': email},
      options: Options(extra: {'skipAuth': true}),
    );
  }

  @override
  Future<void> changePassword(Map<String, dynamic> payload) async {
    await _dioClient.post<dynamic>(
      '/auth/change-password',
      data: payload,
      options: Options(extra: {'skipAuth': true}),
    );
  }

  @override
  Future<AuthUserModel> getProfile() async {
    final response = await _dioClient.get<dynamic>('/users/profile');
    return AuthUserModel.fromJson(_asMap(response.data) ?? const {});
  }

  @override
  Future<AuthUserModel> updateProfile(Map<String, dynamic> payload) async {
    final response = await _dioClient.patch<dynamic>(
      '/users/profile',
      data: payload,
    );
    return AuthUserModel.fromJson(_asMap(response.data) ?? const {});
  }

  @override
  Future<AuthUserModel> updateProfileImage(String imagePath) async {
    final fileName = imagePath.split(RegExp(r'[\\/]')).last;
    final formData = FormData.fromMap({
      'image': await MultipartFile.fromFile(imagePath, filename: fileName),
    });

    final response = await _dioClient.patch<dynamic>(
      '/users/profile/image',
      data: formData,
      options: Options(contentType: 'multipart/form-data'),
    );
    return AuthUserModel.fromJson(_asMap(response.data) ?? const {});
  }

  @override
  Future<void> logout(int? userId) async {
    await _dioClient.post<dynamic>('/auth/logout', data: {'userId': ?userId});
  }

  Map<String, dynamic>? _asMap(Object? value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) return Map<String, dynamic>.from(value);
    return null;
  }
}
