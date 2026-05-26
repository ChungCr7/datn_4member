import '../entities/auth_session.dart';
import '../entities/auth_user.dart';

abstract class AuthRepository {
  Future<AuthSession> login({required String email, required String password});

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

  Future<void> changePassword({
    required String email,
    required String code,
    required String password,
    required String confirmPassword,
  });

  Future<AuthUser> getProfile();

  Future<AuthUser> updateProfile({
    required String name,
    String? phone,
    String? address,
  });

  Future<AuthUser> updateProfileImage(String imagePath);

  Future<AuthUser> changeProfilePassword({
    required String oldPassword,
    required String newPassword,
  });

  Future<void> logout({int? userId});
}
