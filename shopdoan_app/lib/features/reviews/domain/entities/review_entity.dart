class ReviewEntity {
  const ReviewEntity({
    required this.id,
    required this.rating,
    required this.createdAt,
    this.comment,
    this.image,
    this.userId,
    this.userName,
    this.userImage,
    this.menuItemId,
    this.menuItemTitle,
  });

  final int id;
  final int rating;
  final String? comment;
  final String? image;
  final int? userId;
  final String? userName;
  final String? userImage;
  final int? menuItemId;
  final String? menuItemTitle;
  final DateTime createdAt;
}

class RatingSummaryEntity {
  const RatingSummaryEntity({required this.rating, required this.count});

  final num rating;
  final int count;
}
