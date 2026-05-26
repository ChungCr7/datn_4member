import '../entities/review_entity.dart';

abstract class ReviewRepository {
  Future<List<ReviewEntity>> getMenuItemReviews(int menuItemId);

  Future<RatingSummaryEntity> getMenuItemRating(int menuItemId);

  Future<ReviewEntity> createReview({
    required int menuItemId,
    required int rating,
    String? comment,
  });

  Future<ReviewEntity> updateReview({
    required int id,
    required int rating,
    String? comment,
  });

  Future<void> deleteReview(int id);
}
