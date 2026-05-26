import '../../../../core/network/api_exception.dart';
import '../../../../core/storage/token_storage.dart';
import '../../domain/entities/auth_session.dart';
import '../../domain/entities/auth_user.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/auth_remote_datasource.dart';

class AuthRepositoryImpl implements AuthRepository {
  AuthRepositoryImpl({
    required AuthRemoteDataSource remoteDataSource,
    required TokenStorage tokenStorage,
  }) : _remoteDataSource = remoteDataSource,
       _tokenStorage = tokenStorage;

  final AuthRemoteDataSource _remoteDataSource;
  final TokenStorage _tokenStorage;

  @override
  Future<AuthSession> login({
    required String email,
    required String password,
  }) async {
    final session = await _remoteDataSource.login(
      email: email,
      password: password,
    );

    if (session.accessToken.isEmpty || session.refreshToken.isEmpty) {
      throw ApiException('Phan hoi dang nhap thieu token.');
    }

    await _tokenStorage.saveTokens(
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    );
    return session;
  }

  @override
  Future<void> register({
    required String name,
    required String email,
    required String phone,
    required String password,
  }) {
    return _remoteDataSource.register(
      name: name,
      email: email,
      phone: phone,
      password: password,
    );
  }

  @override
  Future<void> verifyRegistration({
    required String email,
    required String code,
  }) {
    return _remoteDataSource.verifyRegistration(email: email, code: code);
  }

  @override
  Future<void> forgotPassword(String email) {
    return _remoteDataSource.forgotPassword(email);
  }

  @override
  Future<void> verifyCode({required String email, required String code}) {
    return _remoteDataSource.verifyCode(email: email, code: code);
  }

  @override
  Future<void> resendActivation(String email) {
    return _remoteDataSource.resendActivation(email);
  }

  @override
  Future<void> changePassword({
    required String email,
    required String code,
    required String password,
    required String confirmPassword,
  }) {
    return _remoteDataSource.changePassword({
      'email': email,
      'code': code,
      'password': password,
      'confirmPassword': confirmPassword,
    });
  }

  @override
  Future<AuthUser> getProfile() {
    return _remoteDataSource.getProfile();
  }

  @override
  Future<AuthUser> updateProfile({
    required String name,
    String? phone,
    String? address,
  }) {
    return _remoteDataSource.updateProfile({
      'name': name,
      'phone': ?phone,
      'address': ?address,
    });
  }

  @override
  Future<AuthUser> updateProfileImage(String imagePath) {
    return _remoteDataSource.updateProfileImage(imagePath);
  }

  @override
  Future<AuthUser> changeProfilePassword({
    required String oldPassword,
    required String newPassword,
  }) {
    return _remoteDataSource.updateProfile({
      'oldPassword': oldPassword,
      'password': newPassword,
    });
  }

  @override
  Future<void> logout({int? userId}) async {
    var resolvedUserId = userId;
    try {
      resolvedUserId ??= (await _remoteDataSource.getProfile()).id;
      await _remoteDataSource.logout(resolvedUserId);
    } finally {
      await _tokenStorage.clearTokens();
    }
  }
}
