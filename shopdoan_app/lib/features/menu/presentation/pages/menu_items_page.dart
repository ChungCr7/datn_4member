import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../../core/widgets/app_empty.dart';
import '../../../../core/widgets/app_error.dart';
import '../../../../core/widgets/app_loading.dart';
import '../controllers/menu_controller.dart';
import '../widgets/menu_item_card.dart';

class MenuItemsPage extends GetView<FoodMenuController> {
  const MenuItemsPage({super.key});

  @override
  Widget build(BuildContext context) {
    Get.find<FoodMenuController>();

    return Scaffold(
      appBar: AppBar(
        title: Obx(() => Text(controller.selectedMenu?.title ?? 'Mon an')),
      ),
      body: RefreshIndicator(
        onRefresh: controller.loadItems,
        child: Obx(() {
          if (controller.isLoading.value && controller.items.isEmpty) {
            return const AppLoading();
          }
          if (controller.errorMessage.value.isNotEmpty &&
              controller.items.isEmpty) {
            return AppError(
              message: controller.errorMessage.value,
              onRetry: controller.loadItems,
            );
          }
          if (controller.items.isEmpty) {
            return const AppEmpty(
              icon: Icons.no_food_outlined,
              title: 'Danh muc chua co mon',
              message: 'Cac mon an se hien thi tai day khi backend co du lieu.',
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemBuilder: (context, index) {
              final item = controller.items[index];
              return MenuItemCard(
                item: item,
                onTap: () => controller.openDetail(item),
              );
            },
            separatorBuilder: (context, index) => const SizedBox(height: 12),
            itemCount: controller.items.length,
          );
        }),
      ),
    );
  }
}
