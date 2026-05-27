import '../../domain/entities/review_entity.dart';

class ReviewModel extends ReviewEntity {
  const ReviewModel({
    required super.id,
    required super.rating,
    required super.createdAt,
    super.comment,
    super.image,
    super.userId,
    super.userName,
    super.userImage,
    super.menuItemId,
    super.menuItemTitle,
  });

  factory ReviewModel.fromJson(Map<String, dynamic> json) {
    final user = _asMap(json['user']);
    final menuItem = _asMap(json['menuItem']);
    final product = _asMap(json['product']);
    return ReviewModel(
      id: _asInt(json['id']) ?? 0,
      rating: _asInt(json['rating']) ?? 0,
      comment: json['comment']?.toString(),
      image: json['image']?.toString(),
      userId: _asInt(json['userId'] ?? user?['id']),
      userName: (user?['name'] ?? user?['email'])?.toString(),
      userImage: user?['image']?.toString(),
      menuItemId: _asInt(
        json['menuItemId'] ??
            json['productId'] ??
            menuItem?['id'] ??
            product?['id'],
      ),
      menuItemTitle: (menuItem?['title'] ?? product?['name'])?.toString(),
      createdAt:
          DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
          DateTime.now(),
    );
  }

  static Map<String, dynamic>? _asMap(Object? value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) return Map<String, dynamic>.from(value);
    return null;
  }

  static int? _asInt(Object? value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    return int.tryParse(value?.toString() ?? '');
  }
}

class RatingSummaryModel extends RatingSummaryEntity {
  const RatingSummaryModel({required super.rating, required super.count});

  factory RatingSummaryModel.fromJson(Map<String, dynamic> json) {
    return RatingSummaryModel(
      rating: _asNum(json['rating']) ?? 0,
      count: _asInt(json['count']) ?? 0,
    );
  }

  static int? _asInt(Object? value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    return int.tryParse(value?.toString() ?? '');
  }

  static num? _asNum(Object? value) {
    if (value is num) return value;
    return num.tryParse(value?.toString() ?? '');
  }
}
