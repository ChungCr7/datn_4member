import '../../domain/entities/review_entity.dart';
import '../../domain/repositories/review_repository.dart';
import '../datasources/review_remote_datasource.dart';

class ReviewRepositoryImpl implements ReviewRepository {
  ReviewRepositoryImpl(this._remoteDataSource);

  final ReviewRemoteDataSource _remoteDataSource;

  @override
  Future<List<ReviewEntity>> getMenuItemReviews(int menuItemId) {
    return _remoteDataSource.getMenuItemReviews(menuItemId);
  }

  @override
  Future<RatingSummaryEntity> getMenuItemRating(int menuItemId) {
    return _remoteDataSource.getMenuItemRating(menuItemId);
  }

  @override
  Future<ReviewEntity> createReview({
    required int menuItemId,
    required int rating,
    String? comment,
  }) {
    return _remoteDataSource.createReview(
      menuItemId: menuItemId,
      rating: rating,
      comment: comment,
    );
  }

  @override
  Future<ReviewEntity> updateReview({
    required int id,
    required int rating,
    String? comment,
  }) {
    return _remoteDataSource.updateReview(
      id: id,
      rating: rating,
      comment: comment,
    );
  }

  @override
  Future<void> deleteReview(int id) {
    return _remoteDataSource.deleteReview(id);
  }
}
