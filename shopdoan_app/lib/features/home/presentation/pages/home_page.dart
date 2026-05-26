import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../../core/routes/app_routes.dart';
import '../../../../core/widgets/app_empty.dart';
import '../../../../core/widgets/app_error.dart';
import '../../../../core/widgets/app_loading.dart';
import '../../../menu/presentation/controllers/menu_controller.dart';
import '../../../menu/presentation/widgets/menu_category_chip.dart';
import '../../../menu/presentation/widgets/menu_item_card.dart';

class HomePage extends GetView<FoodMenuController> {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    Get.find<FoodMenuController>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('ShopDoAn'),
        actions: [
          IconButton(
            tooltip: 'Chatbot',
            onPressed: () => Get.toNamed(AppRoutes.chatbot),
            icon: const Icon(Icons.support_agent_outlined),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: controller.refreshAll,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
          children: [
            _HomeBanner(onMenuTap: () => Get.toNamed(AppRoutes.menu)),
            const SizedBox(height: 16),
            TextField(
              readOnly: true,
              onTap: () => Get.toNamed(AppRoutes.menu),
              decoration: const InputDecoration(
                prefixIcon: Icon(Icons.search),
                hintText: 'Tim mon an',
              ),
            ),
            const SizedBox(height: 22),
            _SectionHeader(
              title: 'Danh muc',
              actionLabel: 'Tat ca',
              onAction: () => Get.toNamed(AppRoutes.menu),
            ),
            const SizedBox(height: 10),
            SizedBox(
              height: 44,
              child: Obx(
                () => ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: controller.menus.length + 1,
                  separatorBuilder: (context, index) =>
                      const SizedBox(width: 8),
                  itemBuilder: (context, index) {
                    if (index == 0) {
                      return MenuCategoryChip(
                        menu: null,
                        selected: controller.selectedMenuId.value == null,
                        onTap: () {
                          controller.selectMenu(null);
                          Get.toNamed(AppRoutes.menu);
                        },
                      );
                    }
                    final menu = controller.menus[index - 1];
                    return MenuCategoryChip(
                      menu: menu,
                      selected: controller.selectedMenuId.value == menu.id,
                      onTap: () {
                        controller.selectMenu(menu.id);
                        Get.toNamed(AppRoutes.menuItems);
                      },
                    );
                  },
                ),
              ),
            ),
            const SizedBox(height: 22),
            _SectionHeader(
              title: 'Mon noi bat',
              actionLabel: 'Xem them',
              onAction: () => Get.toNamed(AppRoutes.menu),
            ),
            const SizedBox(height: 10),
            Obx(() {
              if (controller.isLoading.value && controller.items.isEmpty) {
                return const SizedBox(height: 360, child: AppLoading());
              }
              if (controller.errorMessage.value.isNotEmpty &&
                  controller.items.isEmpty) {
                return SizedBox(
                  height: 260,
                  child: AppError(
                    message: controller.errorMessage.value,
                    onRetry: controller.loadItems,
                  ),
                );
              }
              final items = controller.featuredItems;
              if (items.isEmpty) {
                return const SizedBox(
                  height: 260,
                  child: AppEmpty(
                    icon: Icons.no_food_outlined,
                    title: 'Chua co mon an',
                    message:
                        'Danh sach mon se hien thi khi backend co du lieu.',
                  ),
                );
              }
              return Column(
                children: [
                  for (final item in items) ...[
                    MenuItemCard(
                      item: item,
                      onTap: () => controller.openDetail(item),
                    ),
                    const SizedBox(height: 12),
                  ],
                ],
              );
            }),
          ],
        ),
      ),
    );
  }
}

class _HomeBanner extends StatelessWidget {
  const _HomeBanner({required this.onMenuTap});

  final VoidCallback onMenuTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.primary,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Hom nay an gi?',
            style: TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Dat mon nhanh, theo doi don hang gon, thanh toan COD san sang cho demo.',
            style: TextStyle(color: Colors.white),
          ),
          const SizedBox(height: 14),
          FilledButton.tonalIcon(
            onPressed: onMenuTap,
            icon: const Icon(Icons.restaurant_menu),
            label: const Text('Xem thuc don'),
          ),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({
    required this.title,
    required this.actionLabel,
    required this.onAction,
  });

  final String title;
  final String actionLabel;
  final VoidCallback onAction;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(
            title,
            style: Theme.of(
              context,
            ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
          ),
        ),
        TextButton(onPressed: onAction, child: Text(actionLabel)),
      ],
    );
  }
}
