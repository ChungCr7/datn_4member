import 'package:get/get.dart';

import '../../../../core/routes/app_routes.dart';
import '../../../../core/storage/token_storage.dart';

class SplashController extends GetxController {
  SplashController(this._tokenStorage);

  final TokenStorage _tokenStorage;

  @override
  void onReady() {
    super.onReady();
    _decideNextRoute();
  }

  Future<void> _decideNextRoute() async {
    await Future<void>.delayed(const Duration(milliseconds: 700));
    final accessToken = await _tokenStorage.getAccessToken();
    if (accessToken != null && accessToken.isNotEmpty) {
      Get.offAllNamed(AppRoutes.main);
    } else {
      Get.offAllNamed(AppRoutes.login);
    }
  }
}
