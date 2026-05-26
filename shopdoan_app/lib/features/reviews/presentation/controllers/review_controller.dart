import 'package:get/get.dart';

import '../../../../core/routes/app_routes.dart';
import '../../../auth/presentation/controllers/auth_controller.dart';
import '../../domain/entities/review_entity.dart';
import '../../domain/repositories/review_repository.dart';

class ReviewController extends GetxController {
  ReviewController(this._reviewRepository);

  final ReviewRepository _reviewRepository;

  final RxBool isLoading = false.obs;
  final RxBool isSubmitting = false.obs;
  final RxList<ReviewEntity> reviews = <ReviewEntity>[].obs;
  final Rx<RatingSummaryEntity> ratingSummary = const RatingSummaryEntity(
    rating: 0,
    count: 0,
  ).obs;

  Future<void> loadForMenuItem(int menuItemId) async {
    isLoading.value = true;
    try {
      final results = await Future.wait([
        _reviewRepository.getMenuItemReviews(menuItemId),
        _reviewRepository.getMenuItemRating(menuItemId),
      ]);
      reviews.assignAll(results[0] as List<ReviewEntity>);
      ratingSummary.value = results[1] as RatingSummaryEntity;
    } catch (error) {
      Get.snackbar(
        'Loi',
        error.toString(),
        snackPosition: SnackPosition.BOTTOM,
      );
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> openCreateReview({
    required int menuItemId,
    required String menuItemTitle,
  }) async {
    final authController = Get.find<AuthController>();
    if (authController.currentUser.value?.id == null) {
      await authController.loadProfile(showError: false);
    }
    if (authController.currentUser.value?.id == null) {
      Get.snackbar(
        'Can dang nhap',
        'Vui long dang nhap de danh gia mon an.',
        snackPosition: SnackPosition.BOTTOM,
      );
      Get.toNamed(AppRoutes.login);
      return;
    }
    Get.toNamed(
      AppRoutes.createReview,
      arguments: {'menuItemId': menuItemId, 'menuItemTitle': menuItemTitle},
    );
  }

  Future<bool> createReview({
    required int menuItemId,
    required int rating,
    String? comment,
    bool closePage = true,
  }) async {
    if (isSubmitting.value) return false;
    isSubmitting.value = true;
    try {
      await _reviewRepository.createReview(
        menuItemId: menuItemId,
        rating: rating,
        comment: comment,
      );
      await loadForMenuItem(menuItemId);
      if (closePage) {
        Get.back<void>();
      }
      Get.snackbar(
        'Danh gia',
        'Cam on ban da danh gia mon an.',
        snackPosition: SnackPosition.BOTTOM,
      );
      return true;
    } catch (error) {
      Get.snackbar(
        'Loi',
        error.toString(),
        snackPosition: SnackPosition.BOTTOM,
      );
      return false;
    } finally {
      isSubmitting.value = false;
    }
  }

  Future<void> deleteReview(ReviewEntity review) async {
    try {
      await _reviewRepository.deleteReview(review.id);
      if (review.menuItemId != null) {
        await loadForMenuItem(review.menuItemId!);
      }
      Get.snackbar(
        'Danh gia',
        'Da xoa danh gia',
        snackPosition: SnackPosition.BOTTOM,
      );
    } catch (error) {
      Get.snackbar(
        'Loi',
        error.toString(),
        snackPosition: SnackPosition.BOTTOM,
      );
    }
  }
}
