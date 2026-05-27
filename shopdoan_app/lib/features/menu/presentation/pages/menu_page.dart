import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../../core/widgets/app_empty.dart';
import '../../../../core/widgets/app_error.dart';
import '../../../../core/widgets/app_loading.dart';
import '../controllers/menu_controller.dart';
import '../widgets/menu_category_chip.dart';
import '../widgets/menu_item_card.dart';

class MenuPage extends GetView<FoodMenuController> {
  const MenuPage({super.key});

  @override
  Widget build(BuildContext context) {
    Get.find<FoodMenuController>();

    return Scaffold(
      appBar: AppBar(title: const Text('Sản phẩm')),
      body: RefreshIndicator(
        onRefresh: controller.refreshAll,
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                child: TextField(
                  controller: controller.searchController,
                  onChanged: controller.onSearchChanged,
                  decoration: InputDecoration(
                    prefixIcon: const Icon(Icons.search),
                    hintText: 'Tìm sản phẩm, danh mục, shop',
                    suffixIcon: Obx(
                      () => controller.searchText.value.isEmpty
                          ? const SizedBox.shrink()
                          : IconButton(
                              tooltip: 'Xóa',
                              onPressed: controller.clearSearch,
                              icon: const Icon(Icons.close),
                            ),
                    ),
                  ),
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: SizedBox(
                height: 48,
                child: Obx(
                  () => ListView.separated(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    scrollDirection: Axis.horizontal,
                    itemCount: controller.menus.length + 1,
                    separatorBuilder: (context, index) =>
                        const SizedBox(width: 8),
                    itemBuilder: (context, index) {
                      if (index == 0) {
                        return MenuCategoryChip(
                          menu: null,
                          selected: controller.selectedMenuId.value == null,
                          onTap: () => controller.selectMenu(null),
                        );
                      }
                      final menu = controller.menus[index - 1];
                      return MenuCategoryChip(
                        menu: menu,
                        selected: controller.selectedMenuId.value == menu.id,
                        onTap: () => controller.selectMenu(menu.id),
                      );
                    },
                  ),
                ),
              ),
            ),
            const SliverToBoxAdapter(child: SizedBox(height: 12)),
            Obx(() {
              if (controller.isLoading.value && controller.items.isEmpty) {
                return const SliverFillRemaining(child: AppLoading());
              }
              if (controller.errorMessage.value.isNotEmpty &&
                  controller.items.isEmpty) {
                return SliverFillRemaining(
                  child: AppError(
                    message: controller.errorMessage.value,
                    onRetry: controller.loadItems,
                  ),
                );
              }
              if (controller.items.isEmpty) {
                return const SliverFillRemaining(
                  child: AppEmpty(
                    icon: Icons.shopping_bag_outlined,
                    title: 'Không tìm thấy sản phẩm',
                    message: 'Thử từ khóa khác hoặc chọn danh mục khác.',
                  ),
                );
              }
              return SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                sliver: SliverGrid.builder(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: 10,
                    crossAxisSpacing: 10,
                    mainAxisExtent: 270,
                  ),
                  itemBuilder: (context, index) {
                    final item = controller.items[index];
                    return ProductGridCard(
                      item: item,
                      onTap: () => controller.openDetail(item),
                    );
                  },
                  itemCount: controller.items.length,
                ),
              );
            }),
          ],
        ),
      ),
    );
  }
}
