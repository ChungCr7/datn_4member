import '../../domain/entities/auth_session.dart';
import 'auth_user_model.dart';

class AuthSessionModel extends AuthSession {
  const AuthSessionModel({
    required super.accessToken,
    required super.refreshToken,
    super.user,
  });

  factory AuthSessionModel.fromJson(Map<String, dynamic> json) {
    final data = _asMap(json['data']) ?? json;
    final userMap = _asMap(data['user']) ?? _asMap(data['customer']);

    return AuthSessionModel(
      accessToken:
          (data['accessToken'] ?? data['access_token'] ?? data['token'] ?? '')
              .toString(),
      refreshToken: (data['refreshToken'] ?? data['refresh_token'] ?? '')
          .toString(),
      user: userMap == null ? null : AuthUserModel.fromJson(userMap),
    );
  }

  Map<String, dynamic> toJson() => {
    'accessToken': accessToken,
    'refreshToken': refreshToken,
    'user': user is AuthUserModel ? (user as AuthUserModel).toJson() : null,
  };

  static Map<String, dynamic>? _asMap(Object? value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) return Map<String, dynamic>.from(value);
    return null;
  }
}
