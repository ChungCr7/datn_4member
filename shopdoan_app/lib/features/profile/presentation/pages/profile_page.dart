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
      body: Obx(() {
        final user = _authController.currentUser.value;
        final loading = _authController.isProfileLoading.value;

        return RefreshIndicator(
          onRefresh: () => _authController.loadProfile(showError: true),
          child: ListView(
            padding: EdgeInsets.zero,
            children: [
              _ProfileHeader(
                name: user?.name?.isNotEmpty == true
                    ? user!.name!
                    : 'Tài khoản ShopDoan',
                email: user?.email ?? '',
                avatarUrl: user?.avatarUrl,
                loading: loading,
                onEdit: () => Get.toNamed(AppRoutes.editProfile),
              ),
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    _OrderShortcutCard(),
                    const SizedBox(height: 12),
                    _AccountPanel(
                      children: [
                        _ProfileTile(
                          icon: Icons.location_on_outlined,
                          title: 'Địa chỉ nhận hàng',
                          subtitle: user?.address?.isNotEmpty == true
                              ? user!.address!
                              : 'Thêm địa chỉ để checkout nhanh hơn',
                          onTap: () => Get.toNamed(AppRoutes.editProfile),
                        ),
                        _ProfileTile(
                          icon: Icons.phone_outlined,
                          title: 'Số điện thoại',
                          subtitle: user?.phone?.isNotEmpty == true
                              ? user!.phone!
                              : 'Bổ sung số điện thoại',
                          onTap: () => Get.toNamed(AppRoutes.editProfile),
                        ),
                        _ProfileTile(
                          icon: Icons.password_outlined,
                          title: 'Đổi mật khẩu',
                          subtitle: 'Xác nhận bằng mật khẩu hiện tại',
                          onTap: _showChangePasswordSheet,
                        ),
                        _ProfileTile(
                          icon: Icons.mark_email_unread_outlined,
                          title: 'Quên mật khẩu qua email',
                          subtitle: 'Nhận mã xác thực và đặt lại mật khẩu',
                          onTap: () => Get.toNamed(
                            AppRoutes.forgotPassword,
                            arguments: {'email': user?.email ?? ''},
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    _AccountPanel(
                      children: [
                        _InfoTile(
                          icon: Icons.cloud_outlined,
                          title: 'API đang dùng',
                          subtitle: ApiConstants.baseUrl,
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),
                    Obx(
                      () => FilledButton.tonalIcon(
                        onPressed: _authController.isLoading.value
                            ? null
                            : _authController.logout,
                        icon: const Icon(Icons.logout),
                        label: Text(
                          _authController.isLoading.value
                              ? 'Đang xử lý...'
                              : 'Đăng xuất',
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      }),
    );
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
                    'Đổi mật khẩu',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 16),
                  AppTextField(
                    controller: oldPasswordController,
                    label: 'Mật khẩu hiện tại',
                    prefixIcon: Icons.lock_outline,
                    obscureText: true,
                    validator: Validators.required,
                  ),
                  const SizedBox(height: 12),
                  AppTextField(
                    controller: newPasswordController,
                    label: 'Mật khẩu mới',
                    prefixIcon: Icons.lock_reset_outlined,
                    obscureText: true,
                    validator: (value) {
                      final required = Validators.required(value);
                      if (required != null) return required;
                      if ((value ?? '').length < 6) {
                        return 'Mật khẩu tối thiểu 6 ký tự';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 12),
                  AppTextField(
                    controller: confirmPasswordController,
                    label: 'Nhập lại mật khẩu mới',
                    prefixIcon: Icons.verified_user_outlined,
                    obscureText: true,
                    validator: (value) {
                      final required = Validators.required(value);
                      if (required != null) return required;
                      if (value != newPasswordController.text) {
                        return 'Mật khẩu nhập lại không khớp';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 18),
                  Obx(
                    () => AppButton(
                      label: 'Cập nhật mật khẩu',
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

class _ProfileHeader extends StatelessWidget {
  const _ProfileHeader({
    required this.name,
    required this.email,
    required this.avatarUrl,
    required this.loading,
    required this.onEdit,
  });

  final String name;
  final String email;
  final String? avatarUrl;
  final bool loading;
  final VoidCallback onEdit;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 54, 16, 22),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Theme.of(context).colorScheme.primary, Colors.deepOrange],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 34,
            backgroundColor: Colors.white,
            backgroundImage: _avatarProvider(avatarUrl),
            child: avatarUrl?.isNotEmpty == true
                ? null
                : Text(
                    name.characters.first.toUpperCase(),
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w900,
                      color: Colors.deepOrange,
                    ),
                  ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  email,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: Colors.white70),
                ),
              ],
            ),
          ),
          loading
              ? const SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                )
              : IconButton(
                  tooltip: 'Sửa hồ sơ',
                  onPressed: onEdit,
                  icon: const Icon(Icons.edit_outlined, color: Colors.white),
                ),
        ],
      ),
    );
  }

  ImageProvider? _avatarProvider(String? value) {
    final image = value?.trim();
    if (image == null || image.isEmpty) return null;
    if (image.startsWith('http://') || image.startsWith('https://')) {
      return CachedNetworkImageProvider(image);
    }

    final origin = Uri.parse(ApiConstants.baseUrl).replace(path: '').toString();
    final slash = image.startsWith('/') ? '' : '/';
    return CachedNetworkImageProvider('$origin$slash$image');
  }
}

class _OrderShortcutCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return _AccountPanel(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(14, 12, 14, 4),
          child: Row(
            children: [
              const Expanded(
                child: Text(
                  'Đơn mua',
                  style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
                ),
              ),
              TextButton(
                onPressed: () => Get.toNamed(AppRoutes.orderHistory),
                child: const Text('Xem lịch sử'),
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(8, 0, 8, 12),
          child: Row(
            children: [
              _OrderAction(
                icon: Icons.receipt_long_outlined,
                label: 'Chờ xác nhận',
                onTap: () => Get.toNamed(AppRoutes.orderHistory),
              ),
              _OrderAction(
                icon: Icons.inventory_2_outlined,
                label: 'Đóng gói',
                onTap: () => Get.toNamed(AppRoutes.orderHistory),
              ),
              _OrderAction(
                icon: Icons.local_shipping_outlined,
                label: 'Đang giao',
                onTap: () => Get.toNamed(AppRoutes.orderHistory),
              ),
              _OrderAction(
                icon: Icons.star_border_rounded,
                label: 'Đánh giá',
                onTap: () => Get.toNamed(AppRoutes.orderHistory),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _OrderAction extends StatelessWidget {
  const _OrderAction({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Column(
            children: [
              Icon(icon, color: Colors.deepOrange),
              const SizedBox(height: 6),
              Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 11),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AccountPanel extends StatelessWidget {
  const _AccountPanel({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Column(mainAxisSize: MainAxisSize.min, children: children),
    );
  }
}

class _ProfileTile extends StatelessWidget {
  const _ProfileTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: Colors.deepOrange),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
      subtitle: Text(subtitle, maxLines: 1, overflow: TextOverflow.ellipsis),
      trailing: const Icon(Icons.chevron_right),
      onTap: onTap,
    );
  }
}

class _InfoTile extends StatelessWidget {
  const _InfoTile({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: Colors.deepOrange),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
      subtitle: Text(subtitle),
    );
  }
}
