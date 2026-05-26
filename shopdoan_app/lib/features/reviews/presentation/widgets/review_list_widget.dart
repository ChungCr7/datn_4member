import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../../core/routes/app_routes.dart';
import '../../../../core/widgets/app_button.dart';
import '../../../../core/widgets/app_empty.dart';
import '../../../../shared/utils/date_formatter.dart';
import '../../../auth/presentation/controllers/auth_controller.dart';
import '../controllers/review_controller.dart';
import 'star_rating.dart';

class ReviewListWidget extends StatefulWidget {
  const ReviewListWidget({
    super.key,
    required this.menuItemId,
    required this.menuItemTitle,
  });

  final int menuItemId;
  final String menuItemTitle;

  @override
  State<ReviewListWidget> createState() => _ReviewListWidgetState();
}

class _ReviewListWidgetState extends State<ReviewListWidget> {
  late final ReviewController _reviewController;
  late final AuthController _authController;
  final _commentController = TextEditingController();
  int _rating = 5;

  @override
  void initState() {
    super.initState();
    _reviewController = Get.find<ReviewController>();
    _authController = Get.find<AuthController>();
    _reviewController.loadForMenuItem(widget.menuItemId);
    if (_authController.currentUser.value?.id == null) {
      _authController.loadProfile();
    }
  }

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      final summary = _reviewController.ratingSummary.value;
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Danh gia',
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              StarRating(rating: summary.rating),
              const SizedBox(width: 8),
              Text('${summary.rating} (${summary.count})'),
            ],
          ),
          const SizedBox(height: 12),
          _buildComposer(context),
          const SizedBox(height: 10),
          if (_reviewController.isLoading.value)
            const Center(child: CircularProgressIndicator())
          else if (_reviewController.reviews.isEmpty)
            const AppEmpty(
              icon: Icons.reviews_outlined,
              title: 'Chua co danh gia',
              message: 'Hay la nguoi dau tien danh gia mon nay.',
            )
          else
            for (final review in _reviewController.reviews)
              Card(
                child: ListTile(
                  leading: CircleAvatar(
                    child: Text(_avatarText(review.userName)),
                  ),
                  title: Row(
                    children: [
                      Expanded(
                        child: Text(
                          review.userName ?? 'Khach hang',
                          style: const TextStyle(fontWeight: FontWeight.w800),
                        ),
                      ),
                      StarRating(rating: review.rating, size: 16),
                    ],
                  ),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (review.comment?.isNotEmpty == true) ...[
                        const SizedBox(height: 4),
                        Text(review.comment!),
                      ],
                      const SizedBox(height: 4),
                      Text(DateFormatter.date(review.createdAt)),
                    ],
                  ),
                  trailing:
                      _authController.currentUser.value?.id == review.userId
                      ? IconButton(
                          tooltip: 'Xoa danh gia',
                          onPressed: () =>
                              _reviewController.deleteReview(review),
                          icon: const Icon(Icons.delete_outline),
                        )
                      : null,
                ),
              ),
        ],
      );
    });
  }

  Widget _buildComposer(BuildContext context) {
    final userId = _authController.currentUser.value?.id;
    if (userId == null) {
      return OutlinedButton.icon(
        onPressed: () => Get.toNamed(AppRoutes.login),
        icon: const Icon(Icons.login_outlined),
        label: const Text('Dang nhap de danh gia'),
      );
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Danh gia cua ban',
              style: Theme.of(
                context,
              ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            StarRating(
              rating: _rating,
              size: 28,
              onChanged: (value) => setState(() => _rating = value),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _commentController,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Noi dung danh gia',
                hintText: 'Mon nay co ngon khong?',
              ),
            ),
            const SizedBox(height: 12),
            Obx(
              () => AppButton(
                label: 'Gui danh gia',
                icon: Icons.send_outlined,
                isLoading: _reviewController.isSubmitting.value,
                onPressed: () async {
                  final ok = await _reviewController.createReview(
                    menuItemId: widget.menuItemId,
                    rating: _rating,
                    comment: _commentController.text.trim().isEmpty
                        ? null
                        : _commentController.text.trim(),
                    closePage: false,
                  );
                  if (!ok || !mounted) return;
                  _commentController.clear();
                  setState(() => _rating = 5);
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _avatarText(String? value) {
    final text = value?.trim();
    if (text == null || text.isEmpty) return 'U';
    return text.characters.first.toUpperCase();
  }
}
