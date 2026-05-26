import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../../core/widgets/app_button.dart';
import '../../../../core/widgets/app_text_field.dart';
import '../../../../shared/utils/validators.dart';
import '../controllers/auth_controller.dart';

class ChangePasswordPage extends StatefulWidget {
  const ChangePasswordPage({super.key});

  @override
  State<ChangePasswordPage> createState() => _ChangePasswordPageState();
}

class _ChangePasswordPageState extends State<ChangePasswordPage> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _emailController;
  final _codeController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

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
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authController = Get.find<AuthController>();

    return Scaffold(
      appBar: AppBar(title: const Text('Doi mat khau')),
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
                keyboardType: TextInputType.emailAddress,
                validator: Validators.email,
              ),
              const SizedBox(height: 12),
              AppTextField(
                controller: _codeController,
                label: 'Ma xac thuc',
                prefixIcon: Icons.pin_outlined,
                validator: (value) => Validators.required(
                  value,
                  message: 'Vui long nhap ma xac thuc',
                ),
              ),
              const SizedBox(height: 12),
              AppTextField(
                controller: _passwordController,
                label: 'Mat khau moi',
                prefixIcon: Icons.lock_outline,
                obscureText: true,
                validator: Validators.password,
              ),
              const SizedBox(height: 12),
              AppTextField(
                controller: _confirmPasswordController,
                label: 'Nhap lai mat khau moi',
                prefixIcon: Icons.lock_reset_outlined,
                obscureText: true,
                validator: (value) {
                  final error = Validators.password(value);
                  if (error != null) return error;
                  if (value != _passwordController.text) {
                    return 'Mat khau nhap lai khong khop';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 20),
              Obx(
                () => AppButton(
                  label: 'Doi mat khau',
                  icon: Icons.password_outlined,
                  isLoading: authController.isLoading.value,
                  onPressed: () {
                    if (!_formKey.currentState!.validate()) return;
                    authController.changePassword(
                      email: _emailController.text.trim(),
                      code: _codeController.text.trim(),
                      password: _passwordController.text,
                      confirmPassword: _confirmPasswordController.text,
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
