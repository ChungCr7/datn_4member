import 'package:get/get.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../features/auth/data/datasources/auth_remote_datasource.dart';
import '../../features/auth/data/repositories/auth_repository_impl.dart';
import '../../features/auth/domain/repositories/auth_repository.dart';
import '../../features/auth/presentation/controllers/auth_controller.dart';
import '../../features/cart/data/datasources/cart_local_datasource.dart';
import '../../features/cart/data/datasources/cart_remote_datasource.dart';
import '../../features/cart/data/repositories/cart_repository_impl.dart';
import '../../features/cart/domain/repositories/cart_repository.dart';
import '../../features/cart/presentation/controllers/cart_controller.dart';
import '../../features/home/presentation/controllers/main_layout_controller.dart';
import '../../features/menu/data/datasources/menu_remote_datasource.dart';
import '../../features/menu/data/repositories/menu_repository_impl.dart';
import '../../features/menu/domain/repositories/menu_repository.dart';
import '../../features/menu/presentation/controllers/menu_controller.dart';
import '../../features/notifications/presentation/controllers/notification_controller.dart';
import '../../features/orders/data/datasources/order_remote_datasource.dart';
import '../../features/orders/data/repositories/order_repository_impl.dart';
import '../../features/orders/domain/repositories/order_repository.dart';
import '../../features/orders/presentation/controllers/order_controller.dart';
import '../../features/reviews/data/datasources/review_remote_datasource.dart';
import '../../features/reviews/data/repositories/review_repository_impl.dart';
import '../../features/reviews/domain/repositories/review_repository.dart';
import '../../features/reviews/presentation/controllers/review_controller.dart';
import '../../features/splash/presentation/controllers/splash_controller.dart';
import '../network/dio_client.dart';
import '../storage/token_storage.dart';

class InitialBinding extends Bindings {
  @override
  void dependencies() {
    Get.put<TokenStorage>(TokenStorage(), permanent: true);
    Get.put<DioClient>(DioClient(Get.find<TokenStorage>()), permanent: true);
    Get.putAsync<SharedPreferences>(
      () => SharedPreferences.getInstance(),
      permanent: true,
    );

    Get.lazyPut<AuthRemoteDataSource>(
      () => AuthRemoteDataSourceImpl(Get.find<DioClient>()),
      fenix: true,
    );
    Get.lazyPut<AuthRepository>(
      () => AuthRepositoryImpl(
        remoteDataSource: Get.find<AuthRemoteDataSource>(),
        tokenStorage: Get.find<TokenStorage>(),
      ),
      fenix: true,
    );
    Get.lazyPut<AuthController>(
      () => AuthController(Get.find<AuthRepository>()),
      fenix: true,
    );
    Get.lazyPut<SplashController>(
      () => SplashController(Get.find<TokenStorage>()),
      fenix: true,
    );
    Get.lazyPut<MainLayoutController>(MainLayoutController.new, fenix: true);
    Get.lazyPut<CartRemoteDataSource>(
      () => CartRemoteDataSourceImpl(Get.find<DioClient>()),
      fenix: true,
    );
    Get.lazyPut<CartLocalDataSource>(CartLocalDataSourceImpl.new, fenix: true);
    Get.lazyPut<CartRepository>(
      () => CartRepositoryImpl(
        remoteDataSource: Get.find<CartRemoteDataSource>(),
        localDataSource: Get.find<CartLocalDataSource>(),
      ),
      fenix: true,
    );
    Get.lazyPut<CartController>(
      () => CartController(Get.find<CartRepository>()),
      fenix: true,
    );
    Get.lazyPut<MenuRemoteDataSource>(
      () => MenuRemoteDataSourceImpl(Get.find<DioClient>()),
      fenix: true,
    );
    Get.lazyPut<MenuRepository>(
      () => MenuRepositoryImpl(Get.find<MenuRemoteDataSource>()),
      fenix: true,
    );
    Get.lazyPut<FoodMenuController>(
      () => FoodMenuController(Get.find<MenuRepository>()),
      fenix: true,
    );
    Get.lazyPut<OrderRemoteDataSource>(
      () => OrderRemoteDataSourceImpl(Get.find<DioClient>()),
      fenix: true,
    );
    Get.lazyPut<OrderRepository>(
      () => OrderRepositoryImpl(Get.find<OrderRemoteDataSource>()),
      fenix: true,
    );
    Get.lazyPut<OrderController>(
      () => OrderController(Get.find<OrderRepository>()),
      fenix: true,
    );
    Get.lazyPut<ReviewRemoteDataSource>(
      () => ReviewRemoteDataSourceImpl(Get.find<DioClient>()),
      fenix: true,
    );
    Get.lazyPut<ReviewRepository>(
      () => ReviewRepositoryImpl(Get.find<ReviewRemoteDataSource>()),
      fenix: true,
    );
    Get.lazyPut<ReviewController>(
      () => ReviewController(Get.find<ReviewRepository>()),
      fenix: true,
    );
    Get.lazyPut<NotificationController>(
      () => NotificationController(Get.find<DioClient>()),
      fenix: true,
    );
  }
}
