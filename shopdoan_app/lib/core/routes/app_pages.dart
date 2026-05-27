import 'package:get/get.dart';

import '../../features/auth/presentation/pages/change_password_page.dart';
import '../../features/auth/presentation/pages/forgot_password_page.dart';
import '../../features/auth/presentation/pages/login_page.dart';
import '../../features/auth/presentation/pages/register_page.dart';
import '../../features/auth/presentation/pages/verify_registration_page.dart';
import '../../features/cart/presentation/pages/cart_page.dart';
import '../../features/cart/presentation/pages/checkout_page.dart';
import '../../features/chatbot/presentation/pages/chatbot_page.dart';
import '../../features/home/presentation/pages/home_page.dart';
import '../../features/home/presentation/pages/main_layout.dart';
import '../../features/menu/presentation/pages/menu_detail_page.dart';
import '../../features/menu/presentation/pages/menu_page.dart';
import '../../features/menu/presentation/pages/shop_profile_page.dart';
import '../../features/orders/presentation/pages/order_detail_page.dart';
import '../../features/orders/presentation/pages/order_history_page.dart';
import '../../features/orders/presentation/pages/order_success_page.dart';
import '../../features/profile/presentation/pages/edit_profile_page.dart';
import '../../features/profile/presentation/pages/profile_page.dart';
import '../../features/reviews/presentation/pages/create_review_page.dart';
import '../../features/shop_chat/presentation/pages/shop_chat_page.dart';
import '../../features/splash/presentation/pages/splash_page.dart';
import 'app_routes.dart';

class AppPages {
  AppPages._();

  static final pages = <GetPage<dynamic>>[
    GetPage(name: AppRoutes.splash, page: () => const SplashPage()),
    GetPage(name: AppRoutes.login, page: () => const LoginPage()),
    GetPage(name: AppRoutes.register, page: () => const RegisterPage()),
    GetPage(
      name: AppRoutes.verifyRegistration,
      page: () => const VerifyRegistrationPage(),
    ),
    GetPage(
      name: AppRoutes.forgotPassword,
      page: () => const ForgotPasswordPage(),
    ),
    GetPage(name: AppRoutes.main, page: () => const MainLayout()),
    GetPage(name: AppRoutes.home, page: () => const HomePage()),
    GetPage(name: AppRoutes.menu, page: () => const MenuPage()),
    GetPage(name: AppRoutes.menuDetail, page: () => const MenuDetailPage()),
    GetPage(name: AppRoutes.shopProfile, page: () => const ShopProfilePage()),
    GetPage(name: AppRoutes.shopChat, page: () => const ShopChatPage()),
    GetPage(name: AppRoutes.cart, page: () => const CartPage()),
    GetPage(name: AppRoutes.checkout, page: () => const CheckoutPage()),
    GetPage(name: AppRoutes.orderSuccess, page: () => const OrderSuccessPage()),
    GetPage(name: AppRoutes.orderHistory, page: () => const OrderHistoryPage()),
    GetPage(name: AppRoutes.orderDetail, page: () => const OrderDetailPage()),
    GetPage(name: AppRoutes.createReview, page: () => const CreateReviewPage()),
    GetPage(name: AppRoutes.profile, page: () => const ProfilePage()),
    GetPage(name: AppRoutes.editProfile, page: () => const EditProfilePage()),
    GetPage(
      name: AppRoutes.changePassword,
      page: () => const ChangePasswordPage(),
    ),
    GetPage(name: AppRoutes.chatbot, page: () => const ChatbotPage()),
  ];
}
