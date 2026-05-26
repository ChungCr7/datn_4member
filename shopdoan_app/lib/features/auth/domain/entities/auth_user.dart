class AuthUser {
  const AuthUser({
    this.id,
    this.email,
    this.name,
    this.phone,
    this.address,
    this.role,
    this.avatarUrl,
  });

  final int? id;
  final String? email;
  final String? name;
  final String? phone;
  final String? address;
  final String? role;
  final String? avatarUrl;
}
