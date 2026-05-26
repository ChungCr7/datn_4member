import '../../domain/entities/auth_user.dart';

class AuthUserModel extends AuthUser {
  const AuthUserModel({
    super.id,
    super.email,
    super.name,
    super.phone,
    super.address,
    super.role,
    super.avatarUrl,
  });

  factory AuthUserModel.fromJson(Map<String, dynamic> json) {
    final role = json['role'];

    return AuthUserModel(
      id: _asInt(json['id'] ?? json['_id']),
      email: json['email']?.toString(),
      name: (json['name'] ?? json['fullName'] ?? json['username'])?.toString(),
      phone: json['phone']?.toString(),
      address: json['address']?.toString(),
      role: role is Map ? role['name']?.toString() : role?.toString(),
      avatarUrl: (json['avatarUrl'] ?? json['avatar'] ?? json['image'])
          ?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'email': email,
    'name': name,
    'phone': phone,
    'address': address,
    'role': role,
    'avatarUrl': avatarUrl,
  };

  static int? _asInt(Object? value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    return int.tryParse(value?.toString() ?? '');
  }
}
