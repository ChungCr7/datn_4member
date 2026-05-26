import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../../core/widgets/app_button.dart';
import '../../../../core/widgets/app_text_field.dart';
import '../../../../shared/utils/validators.dart';
import '../controllers/review_controller.dart';
import '../widgets/star_rating.dart';

class CreateReviewPage extends StatefulWidget {
  const CreateReviewPage({super.key});

  @override
  State<CreateReviewPage> createState() => _CreateReviewPageState();
}

class _CreateReviewPageState extends State<CreateReviewPage> {
  final _formKey = GlobalKey<FormState>();
  final _commentController = TextEditingController();
  int _rating = 5;

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final args = Get.arguments;
    final menuItemId = args is Map
        ? int.tryParse(args['menuItemId']?.toString() ?? '')
        : null;
    final title = args is Map ? args['menuItemTitle']?.toString() : null;
    final controller = Get.find<ReviewController>();

    return Scaffold(
      appBar: AppBar(title: const Text('Viet danh gia')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (title?.isNotEmpty == true)
              Text(
                title!,
                style: Theme.of(
                  context,
                ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
              ),
            const SizedBox(height: 16),
            StarRating(
              rating: _rating,
              size: 36,
              onChanged: (value) => setState(() => _rating = value),
            ),
            const SizedBox(height: 16),
            AppTextField(
              controller: _commentController,
              label: 'Noi dung danh gia',
              prefixIcon: Icons.edit_note_outlined,
              maxLines: 5,
              validator: (value) => Validators.required(
                value,
                message: 'Vui long nhap noi dung danh gia',
              ),
            ),
            const SizedBox(height: 20),
            Obx(
              () => AppButton(
                label: 'Gui danh gia',
                icon: Icons.send_outlined,
                isLoading: controller.isSubmitting.value,
                onPressed: menuItemId == null
                    ? null
                    : () {
                        if (!_formKey.currentState!.validate()) return;
                        controller.createReview(
                          menuItemId: menuItemId,
                          rating: _rating,
                          comment: _commentController.text,
                        );
                      },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
