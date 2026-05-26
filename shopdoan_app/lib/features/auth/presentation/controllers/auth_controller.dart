import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../../core/routes/app_routes.dart';
import '../../domain/entities/auth_session.dart';
import '../../domain/entities/auth_user.dart';
import '../../domain/repositories/auth_repository.dart';

class AuthController extends GetxController {
  AuthController(this._authRepository);

  final AuthRepository _authRepository;

  final RxBool isLoading = false.obs;
  final RxBool isProfileLoading = false.obs;
  final Rxn<AuthSession> session = Rxn<AuthSession>();
  final Rxn<AuthUser> currentUser = Rxn<AuthUser>();

  Future<void> login({required String email, required String password}) async {
    await _run(() async {
      session.value = await _authRepository.login(
        email: email,
        password: password,
      );
      currentUser.value = session.value?.user;
      Get.offAllNamed(AppRoutes.main);
    }, successMessage: 'Dang nhap thanh cong');
  }

  Future<void> register({
    required String name,
    required String email,
    required String phone,
    required String password,
  }) async {
    await _run(
      () => _authRepository.register(
        name: name,
        email: email,
        phone: phone,
        password: password,
      ),
      successMessage:
          'Dang ky thanh cong. Vui long kiem tra ma xac thuc neu backend yeu cau.',
      afterSuccess: () => Get.toNamed(
        AppRoutes.verifyRegistration,
        arguments: {'email': email},
      ),
    );
  }

  Future<void> verifyRegistration({
    required String email,
    required String code,
  }) async {
    await _run(
      () => _authRepository.verifyRegistration(email: email, code: code),
      successMessage: 'Xac thuc tai khoan thanh cong',
      afterSuccess: () => Get.offAllNamed(AppRoutes.login),
    );
  }

  Future<void> forgotPassword(String email) async {
    await _run(
      () => _authRepository.forgotPassword(email),
      successMessage: 'Da gui yeu cau khoi phuc mat khau',
      afterSuccess: () =>
          Get.toNamed(AppRoutes.changePassword, arguments: {'email': email}),
    );
  }

  Future<void> resendActivation(String email) async {
    await _run(
      () => _authRepository.resendActivation(email),
      successMessage: 'Da gui lai ma xac thuc',
    );
  }

  Future<void> changePassword({
    required String email,
    required String code,
    required String password,
    required String confirmPassword,
  }) async {
    await _run(
      () => _authRepository.changePassword(
        email: email,
        code: code,
        password: password,
        confirmPassword: confirmPassword,
      ),
      successMessage: 'Doi mat khau thanh cong',
      afterSuccess: () => Get.offAllNamed(AppRoutes.login),
    );
  }

  Future<void> loadProfile({bool showError = false}) async {
    if (isProfileLoading.value) return;
    isProfileLoading.value = true;
    try {
      currentUser.value = await _authRepository.getProfile();
    } catch (error) {
      if (showError) {
        Get.snackbar(
          'Loi',
          error.toString(),
          snackPosition: SnackPosition.BOTTOM,
        );
      }
    } finally {
      isProfileLoading.value = false;
    }
  }

  Future<void> updateProfile({
    required String name,
    String? phone,
    String? address,
  }) async {
    await saveProfile(name: name, phone: phone, address: address);
  }

  Future<void> saveProfile({
    required String name,
    String? phone,
    String? address,
    String? imagePath,
  }) async {
    await _run(
      () async {
        currentUser.value = await _authRepository.updateProfile(
          name: name,
          phone: phone,
          address: address,
        );
        if (imagePath != null && imagePath.isNotEmpty) {
          currentUser.value = await _authRepository.updateProfileImage(
            imagePath,
          );
        }
      },
      successMessage: 'Da cap nhat ho so',
      afterSuccess: () => Get.back<void>(),
    );
  }

  Future<void> changeProfilePassword({
    required String oldPassword,
    required String newPassword,
  }) async {
    await _run(
      () async {
        currentUser.value = await _authRepository.changeProfilePassword(
          oldPassword: oldPassword,
          newPassword: newPassword,
        );
      },
      successMessage: 'Da doi mat khau',
      afterSuccess: () => Get.back<void>(),
    );
  }

  Future<void> logout() async {
    await _run(
      () => _authRepository.logout(userId: currentUser.value?.id),
      successMessage: 'Da dang xuat',
      afterSuccess: () {
        session.value = null;
        currentUser.value = null;
        Get.offAllNamed(AppRoutes.login);
      },
    );
  }

  Future<void> _run(
    Future<void> Function() action, {
    String? successMessage,
    VoidCallback? afterSuccess,
  }) async {
    if (isLoading.value) return;
    isLoading.value = true;
    try {
      await action();
      if (successMessage != null) {
        Get.snackbar(
          'Thanh cong',
          successMessage,
          snackPosition: SnackPosition.BOTTOM,
        );
      }
      afterSuccess?.call();
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
}
