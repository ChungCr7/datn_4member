import 'dart:io';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:image_picker/image_picker.dart';

import '../../../../core/constants/api_constants.dart';
import '../../../../core/widgets/app_button.dart';
import '../../../../core/widgets/app_text_field.dart';
import '../../../../shared/utils/validators.dart';
import '../../../auth/presentation/controllers/auth_controller.dart';

class EditProfilePage extends StatefulWidget {
  const EditProfilePage({super.key});

  @override
  State<EditProfilePage> createState() => _EditProfilePageState();
}

class _EditProfilePageState extends State<EditProfilePage> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _addressController = TextEditingController();
  final _imagePicker = ImagePicker();
  XFile? _selectedImage;

  @override
  void initState() {
    super.initState();
    final authController = Get.find<AuthController>();
    final user = authController.currentUser.value;
    _nameController.text = user?.name ?? '';
    _phoneController.text = user?.phone ?? '';
    _addressController.text = user?.address ?? '';
    authController.loadProfile().then((_) {
      if (!mounted) return;
      final nextUser = authController.currentUser.value;
      _nameController.text = nextUser?.name ?? _nameController.text;
      _phoneController.text = nextUser?.phone ?? _phoneController.text;
      _addressController.text = nextUser?.address ?? _addressController.text;
    });
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _addressController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authController = Get.find<AuthController>();

    return Scaffold(
      appBar: AppBar(title: const Text('Sua ho so')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Center(
              child: Obx(() {
                final user = authController.currentUser.value;
                final imageProvider = _profileImageProvider(user?.avatarUrl);

                return Stack(
                  children: [
                    CircleAvatar(
                      radius: 48,
                      backgroundImage: imageProvider,
                      child: imageProvider == null
                          ? Text(
                              _avatarText(user?.name ?? user?.email),
                              style: Theme.of(context).textTheme.headlineSmall
                                  ?.copyWith(fontWeight: FontWeight.w900),
                            )
                          : null,
                    ),
                    Positioned(
                      right: 0,
                      bottom: 0,
                      child: IconButton.filled(
                        tooltip: 'Chon anh dai dien',
                        onPressed: _pickProfileImage,
                        icon: const Icon(Icons.camera_alt_outlined),
                      ),
                    ),
                  ],
                );
              }),
            ),
            const SizedBox(height: 20),
            AppTextField(
              controller: _nameController,
              label: 'Ho ten',
              prefixIcon: Icons.person_outline,
              validator: (value) =>
                  Validators.required(value, message: 'Vui long nhap ho ten'),
            ),
            const SizedBox(height: 12),
            AppTextField(
              controller: _phoneController,
              label: 'So dien thoai',
              prefixIcon: Icons.phone_outlined,
              keyboardType: TextInputType.phone,
            ),
            const SizedBox(height: 12),
            AppTextField(
              controller: _addressController,
              label: 'Dia chi',
              prefixIcon: Icons.location_on_outlined,
              maxLines: 3,
            ),
            const SizedBox(height: 20),
            Obx(
              () => AppButton(
                label: 'Luu thay doi',
                icon: Icons.save_outlined,
                isLoading: authController.isLoading.value,
                onPressed: () {
                  if (!_formKey.currentState!.validate()) return;
                  authController.saveProfile(
                    name: _nameController.text.trim(),
                    phone: _phoneController.text.trim(),
                    address: _addressController.text.trim(),
                    imagePath: _selectedImage?.path,
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _pickProfileImage() async {
    final picked = await _imagePicker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 85,
      maxWidth: 1200,
    );
    if (picked == null) return;

    final lowerPath = picked.path.toLowerCase();
    final isSupported =
        lowerPath.endsWith('.jpg') ||
        lowerPath.endsWith('.jpeg') ||
        lowerPath.endsWith('.png') ||
        lowerPath.endsWith('.gif') ||
        lowerPath.endsWith('.webp');
    if (!isSupported) {
      Get.snackbar(
        'Anh dai dien',
        'Vui long chon anh jpg, png, gif hoac webp.',
        snackPosition: SnackPosition.BOTTOM,
      );
      return;
    }

    final size = await picked.length();
    if (size > 5 * 1024 * 1024) {
      Get.snackbar(
        'Anh dai dien',
        'Anh dai dien toi da 5MB.',
        snackPosition: SnackPosition.BOTTOM,
      );
      return;
    }

    setState(() => _selectedImage = picked);
  }

  ImageProvider? _profileImageProvider(String? imageUrl) {
    if (_selectedImage != null) {
      return FileImage(File(_selectedImage!.path));
    }

    final url = _resolveImageUrl(imageUrl);
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

  String _avatarText(String? value) {
    final text = value?.trim();
    if (text == null || text.isEmpty) return 'U';
    return text.characters.first.toUpperCase();
  }
}
