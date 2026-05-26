import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../../core/widgets/app_button.dart';
import '../../../../core/widgets/app_text_field.dart';
import '../../../../shared/utils/validators.dart';
import '../controllers/auth_controller.dart';

class VerifyRegistrationPage extends StatefulWidget {
  const VerifyRegistrationPage({super.key});

  @override
  State<VerifyRegistrationPage> createState() => _VerifyRegistrationPageState();
}

class _VerifyRegistrationPageState extends State<VerifyRegistrationPage> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _emailController;
  final _codeController = TextEditingController();

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
    _codeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authController = Get.find<AuthController>();

    return Scaffold(
      appBar: AppBar(title: const Text('Xac thuc dang ky')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              AppTextField(
                controller: _emailController,
                label: 'Email',
                prefixIcon: Icons.mail_outline,
                validator: Validators.email,
              ),
              const SizedBox(height: 12),
              AppTextField(
                controller: _codeController,
                label: 'Ma xac thuc',
                prefixIcon: Icons.verified_outlined,
                validator: (value) => Validators.required(
                  value,
                  message: 'Vui long nhap ma xac thuc',
                ),
              ),
              const SizedBox(height: 20),
              Obx(
                () => AppButton(
                  label: 'Xac thuc',
                  icon: Icons.check_circle_outline,
                  isLoading: authController.isLoading.value,
                  onPressed: () {
                    if (!_formKey.currentState!.validate()) return;
                    authController.verifyRegistration(
                      email: _emailController.text.trim(),
                      code: _codeController.text.trim(),
                    );
                  },
                ),
              ),
              const SizedBox(height: 12),
              Obx(
                () => TextButton.icon(
                  onPressed: authController.isLoading.value
                      ? null
                      : () {
                          final emailError = Validators.email(
                            _emailController.text,
                          );
                          if (emailError != null) {
                            Get.snackbar(
                              'Loi',
                              emailError,
                              snackPosition: SnackPosition.BOTTOM,
                            );
                            return;
                          }
                          authController.resendActivation(
                            _emailController.text.trim(),
                          );
                        },
                  icon: const Icon(Icons.refresh),
                  label: const Text('Gui lai ma xac thuc'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
