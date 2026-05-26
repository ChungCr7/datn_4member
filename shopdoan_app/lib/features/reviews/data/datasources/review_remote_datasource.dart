import '../../../../core/network/dio_client.dart';
import '../models/review_model.dart';

abstract class ReviewRemoteDataSource {
  Future<List<ReviewModel>> getMenuItemReviews(int menuItemId);

  Future<RatingSummaryModel> getMenuItemRating(int menuItemId);

  Future<ReviewModel> createReview({
    required int menuItemId,
    required int rating,
    String? comment,
  });

  Future<ReviewModel> updateReview({
    required int id,
    required int rating,
    String? comment,
  });

  Future<void> deleteReview(int id);
}

class ReviewRemoteDataSourceImpl implements ReviewRemoteDataSource {
  ReviewRemoteDataSourceImpl(this._dioClient);

  final DioClient _dioClient;

  @override
  Future<List<ReviewModel>> getMenuItemReviews(int menuItemId) async {
    final response = await _dioClient.get<dynamic>(
      '/reviews/menu-items/$menuItemId',
      queryParameters: {'page': 1, 'limit': 30},
    );
    final body = _asMap(response.data);
    return _asList(
      body?['reviews'] ?? response.data,
    ).map((json) => ReviewModel.fromJson(json)).toList();
  }

  @override
  Future<RatingSummaryModel> getMenuItemRating(int menuItemId) async {
    final response = await _dioClient.get<dynamic>(
      '/reviews/menu-items/$menuItemId/rating',
    );
    return RatingSummaryModel.fromJson(_asMap(response.data) ?? const {});
  }

  @override
  Future<ReviewModel> createReview({
    required int menuItemId,
    required int rating,
    String? comment,
  }) async {
    final response = await _dioClient.post<dynamic>(
      '/reviews',
      data: {
        'menuItemId': menuItemId,
        'rating': rating,
        if (comment != null && comment.trim().isNotEmpty)
          'comment': comment.trim(),
      },
    );
    return ReviewModel.fromJson(_asMap(response.data) ?? const {});
  }

  @override
  Future<ReviewModel> updateReview({
    required int id,
    required int rating,
    String? comment,
  }) async {
    final response = await _dioClient.patch<dynamic>(
      '/reviews/$id',
      data: {'rating': rating, 'comment': comment?.trim()},
    );
    return ReviewModel.fromJson(_asMap(response.data) ?? const {});
  }

  @override
  Future<void> deleteReview(int id) async {
    await _dioClient.delete<dynamic>('/reviews/$id');
  }

  Map<String, dynamic>? _asMap(Object? value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) return Map<String, dynamic>.from(value);
    return null;
  }

  List<Map<String, dynamic>> _asList(Object? value) {
    if (value is! List) return const [];
    return value
        .whereType<Map>()
        .map((entry) => Map<String, dynamic>.from(entry))
        .toList();
  }
}
