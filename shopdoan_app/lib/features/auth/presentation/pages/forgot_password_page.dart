import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../../core/routes/app_routes.dart';
import '../../../../core/widgets/app_button.dart';
import '../../../../core/widgets/app_text_field.dart';
import '../../../../shared/utils/validators.dart';
import '../controllers/auth_controller.dart';

class ForgotPasswordPage extends StatefulWidget {
  const ForgotPasswordPage({super.key});

  @override
  State<ForgotPasswordPage> createState() => _ForgotPasswordPageState();
}

class _ForgotPasswordPageState extends State<ForgotPasswordPage> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _emailController;

  @override
  void initState() {
    super.initState();
    final args = Get.arguments;
    final email = args is Map ? args['email']?.toString() ?? '' : '';
    _emailController = TextEditingController(text: email);
  }

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authController = Get.find<AuthController>();

    return Scaffold(
      appBar: AppBar(title: const Text('Quen mat khau')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Nhap email de nhan ma khoi phuc mat khau.',
                style: Theme.of(context).textTheme.bodyLarge,
              ),
              const SizedBox(height: 18),
              AppTextField(
                controller: _emailController,
                label: 'Email',
                prefixIcon: Icons.mail_outline,
                validator: Validators.email,
              ),
              const SizedBox(height: 20),
              Obx(
                () => AppButton(
                  label: 'Gui ma',
                  icon: Icons.send_outlined,
                  isLoading: authController.isLoading.value,
                  onPressed: () {
                    if (!_formKey.currentState!.validate()) return;
                    authController.forgotPassword(_emailController.text.trim());
                  },
                ),
              ),
              const SizedBox(height: 12),
              TextButton(
                onPressed: () => Get.toNamed(
                  AppRoutes.changePassword,
                  arguments: {'email': _emailController.text.trim()},
                ),
                child: const Text('Da co ma? Doi mat khau'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
