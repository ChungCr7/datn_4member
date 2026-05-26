import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../../core/constants/api_constants.dart';
import '../../../../core/routes/app_routes.dart';
import '../../../../core/widgets/app_button.dart';
import '../../../../core/widgets/app_text_field.dart';
import '../../../../shared/utils/validators.dart';
import '../../../auth/presentation/controllers/auth_controller.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  late final AuthController _authController;

  @override
  void initState() {
    super.initState();
    _authController = Get.find<AuthController>();
    _authController.loadProfile();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Ca nhan'),
        actions: [
          IconButton(
            tooltip: 'Tai lai',
            onPressed: () => _authController.loadProfile(showError: true),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: Obx(() {
        final user = _authController.currentUser.value;
        final loading = _authController.isProfileLoading.value;

        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              child: ListTile(
                leading: CircleAvatar(
                  backgroundImage: _avatarProvider(user?.avatarUrl),
                  child: user?.avatarUrl?.isNotEmpty == true
                      ? null
                      : Text(
                          _avatarText(user?.name ?? user?.email),
                          style: const TextStyle(fontWeight: FontWeight.w900),
                        ),
                ),
                title: Text(
                  user?.name?.isNotEmpty == true
                      ? user!.name!
                      : 'Tai khoan khach hang',
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
                subtitle: Text(
                  [
                    if (user?.email != null) user!.email,
                    if (user?.phone != null) user!.phone,
                    if (user?.role != null) user!.role,
                  ].whereType<String>().join(' | '),
                ),
                trailing: loading
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : IconButton(
                        tooltip: 'Sua ho so',
                        onPressed: () => Get.toNamed(AppRoutes.editProfile),
                        icon: const Icon(Icons.edit_outlined),
                      ),
              ),
            ),
            if (user?.address?.isNotEmpty == true) ...[
              const SizedBox(height: 12),
              ListTile(
                leading: const Icon(Icons.location_on_outlined),
                title: const Text('Dia chi'),
                subtitle: Text(user!.address!),
              ),
            ],
            const SizedBox(height: 12),
            ListTile(
              leading: const Icon(Icons.password_outlined),
              title: const Text('Doi mat khau'),
              subtitle: const Text('Xac nhan bang mat khau hien tai'),
              onTap: _showChangePasswordSheet,
            ),
            ListTile(
              leading: const Icon(Icons.mark_email_unread_outlined),
              title: const Text('Quen mat khau qua email'),
              onTap: () => Get.toNamed(
                AppRoutes.forgotPassword,
                arguments: {'email': user?.email ?? ''},
              ),
            ),
            const SizedBox(height: 12),
            ListTile(
              leading: const Icon(Icons.link),
              title: const Text('API dang dung'),
              subtitle: const Text(ApiConstants.baseUrl),
            ),
            const SizedBox(height: 12),
            Obx(
              () => FilledButton.tonalIcon(
                onPressed: _authController.isLoading.value
                    ? null
                    : _authController.logout,
                icon: const Icon(Icons.logout),
                label: Text(
                  _authController.isLoading.value
                      ? 'Dang xu ly...'
                      : 'Dang xuat',
                ),
              ),
            ),
          ],
        );
      }),
    );
  }

  String _avatarText(String? value) {
    final text = value?.trim();
    if (text == null || text.isEmpty) return 'U';
    return text.characters.first.toUpperCase();
  }

  ImageProvider? _avatarProvider(String? value) {
    final url = _resolveImageUrl(value);
    if (url == null) return null;
    return CachedNetworkImageProvider(url);
  }

  String? _resolveImageUrl(String? value) {
    final image = value?.trim();
    if (image == null || image.isEmpty) return null;
    if (image.startsWith('http://') || image.startsWith('https://')) {
      return image;
    }

    final origin = Uri.parse(ApiConstants.baseUrl).replace(path: '').toString();
    final slash = image.startsWith('/') ? '' : '/';
    return '$origin$slash$image';
  }

  void _showChangePasswordSheet() {
    final formKey = GlobalKey<FormState>();
    final oldPasswordController = TextEditingController();
    final newPasswordController = TextEditingController();
    final confirmPasswordController = TextEditingController();

    Get.bottomSheet<void>(
      SafeArea(
        child: Material(
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          child: Padding(
            padding: EdgeInsets.only(
              left: 16,
              right: 16,
              top: 18,
              bottom: MediaQuery.of(context).viewInsets.bottom + 16,
            ),
            child: Form(
              key: formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Doi mat khau',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 16),
                  AppTextField(
                    controller: oldPasswordController,
                    label: 'Mat khau hien tai',
                    prefixIcon: Icons.lock_outline,
                    obscureText: true,
                    validator: Validators.required,
                  ),
                  const SizedBox(height: 12),
                  AppTextField(
                    controller: newPasswordController,
                    label: 'Mat khau moi',
                    prefixIcon: Icons.lock_reset_outlined,
                    obscureText: true,
                    validator: (value) {
                      final required = Validators.required(value);
                      if (required != null) return required;
                      if ((value ?? '').length < 6) {
                        return 'Mat khau toi thieu 6 ky tu';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 12),
                  AppTextField(
                    controller: confirmPasswordController,
                    label: 'Nhap lai mat khau moi',
                    prefixIcon: Icons.verified_user_outlined,
                    obscureText: true,
                    validator: (value) {
                      final required = Validators.required(value);
                      if (required != null) return required;
                      if (value != newPasswordController.text) {
                        return 'Mat khau nhap lai khong khop';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 18),
                  Obx(
                    () => AppButton(
                      label: 'Cap nhat mat khau',
                      icon: Icons.save_outlined,
                      isLoading: _authController.isLoading.value,
                      onPressed: () {
                        if (!formKey.currentState!.validate()) return;
                        _authController.changeProfilePassword(
                          oldPassword: oldPasswordController.text.trim(),
                          newPassword: newPasswordController.text.trim(),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
      isScrollControlled: true,
    ).whenComplete(() {
      oldPasswordController.dispose();
      newPasswordController.dispose();
      confirmPasswordController.dispose();
    });
  }
}
