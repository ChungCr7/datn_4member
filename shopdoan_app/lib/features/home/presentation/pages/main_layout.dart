import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../cart/presentation/controllers/cart_controller.dart';
import '../../../cart/presentation/pages/cart_page.dart';
import '../../../menu/presentation/pages/menu_page.dart';
import '../../../notifications/presentation/controllers/notification_controller.dart';
import '../../../notifications/presentation/pages/notification_page.dart';
import '../../../orders/presentation/pages/order_history_page.dart';
import '../../../profile/presentation/pages/profile_page.dart';
import '../controllers/main_layout_controller.dart';
import 'home_page.dart';

class MainLayout extends GetView<MainLayoutController> {
  const MainLayout({super.key});

  static const _pages = <Widget>[
    HomePage(),
    MenuPage(),
    CartPage(),
    NotificationPage(),
    OrderHistoryPage(),
    ProfilePage(),
  ];

  @override
  Widget build(BuildContext context) {
    final cartController = Get.find<CartController>();
    final notificationController = Get.find<NotificationController>();

    return Obx(
      () => Scaffold(
        body: SafeArea(child: _pages[controller.currentIndex.value]),
        bottomNavigationBar: NavigationBar(
          selectedIndex: controller.currentIndex.value,
          onDestinationSelected: controller.changeTab,
          destinations: [
            const NavigationDestination(
              icon: Icon(Icons.home_outlined),
              selectedIcon: Icon(Icons.home),
              label: 'Trang chủ',
            ),
            const NavigationDestination(
              icon: Icon(Icons.storefront_outlined),
              selectedIcon: Icon(Icons.storefront),
              label: 'Sản phẩm',
            ),
            NavigationDestination(
              icon: Obx(
                () => Badge(
                  isLabelVisible: cartController.totalQuantity > 0,
                  label: Text('${cartController.totalQuantity}'),
                  child: const Icon(Icons.shopping_bag_outlined),
                ),
              ),
              selectedIcon: Obx(
                () => Badge(
                  isLabelVisible: cartController.totalQuantity > 0,
                  label: Text('${cartController.totalQuantity}'),
                  child: const Icon(Icons.shopping_bag),
                ),
              ),
              label: 'Giỏ hàng',
            ),
            NavigationDestination(
              icon: Obx(
                () => Badge(
                  isLabelVisible: notificationController.unreadCount.value > 0,
                  label: Text('${notificationController.unreadCount.value}'),
                  child: const Icon(Icons.notifications_none_outlined),
                ),
              ),
              selectedIcon: Obx(
                () => Badge(
                  isLabelVisible: notificationController.unreadCount.value > 0,
                  label: Text('${notificationController.unreadCount.value}'),
                  child: const Icon(Icons.notifications),
                ),
              ),
              label: 'Thông báo',
            ),
            const NavigationDestination(
              icon: Icon(Icons.receipt_long_outlined),
              selectedIcon: Icon(Icons.receipt_long),
              label: 'Đơn hàng',
            ),
            const NavigationDestination(
              icon: Icon(Icons.person_outline),
              selectedIcon: Icon(Icons.person),
              label: 'Cá nhân',
            ),
          ],
        ),
      ),
    );
  }
}
