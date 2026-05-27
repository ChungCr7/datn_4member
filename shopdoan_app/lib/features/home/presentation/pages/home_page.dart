import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../../core/routes/app_routes.dart';
import '../../../../core/widgets/app_empty.dart';
import '../../../../core/widgets/app_error.dart';
import '../../../../core/widgets/app_loading.dart';
import '../../../menu/presentation/controllers/menu_controller.dart';
import '../../../menu/presentation/widgets/menu_item_card.dart';

class HomePage extends GetView<FoodMenuController> {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    Get.find<FoodMenuController>();

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: controller.refreshAll,
        child: CustomScrollView(
          slivers: [
            _HomeHeader(onChat: () => Get.toNamed(AppRoutes.chatbot)),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                child: _SearchBox(onTap: () => Get.toNamed(AppRoutes.menu)),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
                child: _PromoBand(onTap: () => Get.toNamed(AppRoutes.menu)),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 18, 16, 8),
                child: _SectionHeader(
                  title: 'Danh mục',
                  actionLabel: 'Tất cả',
                  onAction: () => Get.toNamed(AppRoutes.menu),
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: SizedBox(
                height: 92,
                child: Obx(
                  () => ListView.separated(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    scrollDirection: Axis.horizontal,
                    itemCount: controller.menus.length,
                    separatorBuilder: (context, index) =>
                        const SizedBox(width: 10),
                    itemBuilder: (context, index) {
                      final menu = controller.menus[index];
                      return _CategoryShortcut(
                        title: menu.title,
                        onTap: () {
                          controller.selectMenu(menu.id);
                          Get.toNamed(AppRoutes.menu);
                        },
                      );
                    },
                  ),
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 18, 16, 8),
                child: _SectionHeader(
                  title: 'Gợi ý hôm nay',
                  actionLabel: 'Xem thêm',
                  onAction: () => Get.toNamed(AppRoutes.menu),
                ),
              ),
            ),
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
              final items = controller.featuredItems;
              if (items.isEmpty) {
                return const SliverFillRemaining(
                  child: AppEmpty(
                    icon: Icons.shopping_bag_outlined,
                    title: 'Chưa có sản phẩm',
                    message:
                        'Kiểm tra lại dữ liệu sản phẩm ACTIVE hoặc seller đã duyệt.',
                  ),
                );
              }
              return SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                sliver: SliverGrid.builder(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: 10,
                    crossAxisSpacing: 10,
                    mainAxisExtent: 270,
                  ),
                  itemBuilder: (context, index) {
                    final item = items[index];
                    return ProductGridCard(
                      item: item,
                      onTap: () => controller.openDetail(item),
                    );
                  },
                  itemCount: items.length,
                ),
              );
            }),
          ],
        ),
      ),
    );
  }
}

class _HomeHeader extends StatelessWidget {
  const _HomeHeader({required this.onChat});

  final VoidCallback onChat;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return SliverAppBar(
      pinned: true,
      expandedHeight: 112,
      backgroundColor: colorScheme.primary,
      foregroundColor: Colors.white,
      title: const Text(
        'ShopDoan',
        style: TextStyle(fontWeight: FontWeight.w900, color: Colors.white),
      ),
      actions: [
        IconButton(
          tooltip: 'Trợ lý AI',
          onPressed: onChat,
          icon: const Icon(Icons.support_agent_outlined),
        ),
      ],
      flexibleSpace: FlexibleSpaceBar(
        background: DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [colorScheme.primary, Colors.deepOrange.shade400],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: const Align(
            alignment: Alignment.bottomLeft,
            child: Padding(
              padding: EdgeInsets.fromLTRB(16, 0, 16, 18),
              child: Text(
                'Mua sắm nhanh, ưu đãi mỗi ngày',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _SearchBox extends StatelessWidget {
  const _SearchBox({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(8),
      elevation: 1,
      child: InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: onTap,
        child: const Padding(
          padding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          child: Row(
            children: [
              Icon(Icons.search, color: Colors.deepOrange),
              SizedBox(width: 8),
              Expanded(child: Text('Tìm sản phẩm, thương hiệu, shop')),
              Icon(Icons.camera_alt_outlined, size: 20),
            ],
          ),
        ),
      ),
    );
  }
}

class _PromoBand extends StatelessWidget {
  const _PromoBand({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(8),
      onTap: onTap,
      child: Ink(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.orange.shade50,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: Colors.orange.shade100),
        ),
        child: const Row(
          children: [
            Icon(Icons.local_shipping_outlined, color: Colors.deepOrange),
            SizedBox(width: 10),
            Expanded(
              child: Text(
                'Freeship demo 15k - thanh toán COD khi nhận hàng',
                style: TextStyle(fontWeight: FontWeight.w800),
              ),
            ),
            Icon(Icons.chevron_right),
          ],
        ),
      ),
    );
  }
}

class _CategoryShortcut extends StatelessWidget {
  const _CategoryShortcut({required this.title, required this.onTap});

  final String title;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 72,
      child: InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: onTap,
        child: Column(
          children: [
            Container(
              height: 52,
              width: 52,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.orange.shade100),
              ),
              child: const Icon(
                Icons.category_outlined,
                color: Colors.deepOrange,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              title,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 11, height: 1.1),
            ),
          ],
        ),
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
