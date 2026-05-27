import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../../core/routes/app_routes.dart';
import '../../../../core/widgets/price_text.dart';
import '../../../cart/presentation/controllers/cart_controller.dart';
import '../../../cart/presentation/widgets/quantity_stepper.dart';
import '../../../reviews/presentation/widgets/review_list_widget.dart';
import '../../domain/entities/menu_item_entity.dart';
import '../controllers/menu_controller.dart';
import '../widgets/food_image.dart';

class MenuDetailPage extends StatefulWidget {
  const MenuDetailPage({super.key});

  @override
  State<MenuDetailPage> createState() => _MenuDetailPageState();
}

class _MenuDetailPageState extends State<MenuDetailPage> {
  final _noteController = TextEditingController();
  MenuItemOptionEntity? _selectedOption;
  int _quantity = 1;
  int? _requestedId;

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final menuController = Get.find<FoodMenuController>();
    final cartController = Get.find<CartController>();
    final args = Get.arguments;
    final id = args is Map ? int.tryParse(args['id']?.toString() ?? '') : null;
    if (id != null &&
        _requestedId != id &&
        menuController.selectedItem.value?.id != id) {
      _requestedId = id;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        menuController.loadItemDetail(id);
      });
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Chi tiết sản phẩm'),
        actions: [
          Obx(() {
            final item = menuController.selectedItem.value;
            if (item?.sellerId == null) return const SizedBox.shrink();
            return IconButton(
              tooltip: 'Nhắn tin shop',
              onPressed: () => _openShopChat(item!),
              icon: const Icon(Icons.chat_bubble_outline),
            );
          }),
        ],
      ),
      body: Obx(() {
        final item = menuController.selectedItem.value;
        if (menuController.isDetailLoading.value && item == null) {
          return const Center(child: CircularProgressIndicator());
        }
        if (item == null) {
          return const Center(child: Text('Không tìm thấy sản phẩm.'));
        }

        final options = item.options
            .where((option) => option.isAvailable)
            .toList(growable: false);
        if (_selectedOption != null &&
            !options.any((option) => option.id == _selectedOption!.id)) {
          _selectedOption = null;
        }
        final unitPrice =
            item.basePrice + (_selectedOption?.additionalPrice ?? 0);

        return ListView(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 120),
          children: [
            _ProductImage(item: item),
            const SizedBox(height: 16),
            _PriceBlock(item: item, unitPrice: unitPrice),
            const SizedBox(height: 10),
            Text(
              item.title,
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.w900,
                height: 1.16,
              ),
            ),
            const SizedBox(height: 10),
            _StatsRow(item: item),
            const SizedBox(height: 14),
            if (item.sellerName?.isNotEmpty == true) _ShopBlock(item: item),
            if (options.isNotEmpty) ...[
              const SizedBox(height: 14),
              _SectionCard(
                title: 'Phân loại',
                child: Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    ChoiceChip(
                      selected: _selectedOption == null,
                      onSelected: (_) => setState(() => _selectedOption = null),
                      label: const Text('Mặc định'),
                    ),
                    for (final option in options)
                      ChoiceChip(
                        selected: _selectedOption?.id == option.id,
                        onSelected: (_) =>
                            setState(() => _selectedOption = option),
                        label: Text(option.title),
                      ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 14),
            _SectionCard(
              title: 'Mô tả sản phẩm',
              child: Text(
                item.description?.isNotEmpty == true
                    ? item.description!
                    : 'Sản phẩm đang chờ bạn khám phá.',
                style: Theme.of(
                  context,
                ).textTheme.bodyMedium?.copyWith(height: 1.45),
              ),
            ),
            const SizedBox(height: 14),
            _SectionCard(
              title: 'Ghi chú cho người bán',
              child: TextField(
                controller: _noteController,
                minLines: 1,
                maxLines: 3,
                decoration: const InputDecoration(
                  prefixIcon: Icon(Icons.notes_outlined),
                  hintText: 'Ví dụ: giao giờ hành chính, đóng gói kỹ...',
                ),
              ),
            ),
            const SizedBox(height: 14),
            _SectionCard(
              title: 'Đánh giá sản phẩm',
              child: ReviewListWidget(
                menuItemId: item.id,
                menuItemTitle: item.title,
              ),
            ),
          ],
        );
      }),
      bottomNavigationBar: Obx(() {
        final item = menuController.selectedItem.value;
        if (item == null) return const SizedBox.shrink();
        return SafeArea(
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surface,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.08),
                  blurRadius: 18,
                  offset: const Offset(0, -6),
                ),
              ],
            ),
            child: Row(
              children: [
                QuantityStepper(
                  value: _quantity,
                  min: 1,
                  onDecrease: () {
                    if (_quantity <= 1) return;
                    setState(() => _quantity--);
                  },
                  onIncrease: () => setState(() => _quantity++),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed:
                        cartController.isValidating.value || !item.isAvailable
                        ? null
                        : () => cartController.addMenuItem(
                            item: item,
                            option: _selectedOption,
                            quantity: _quantity,
                            note: _noteController.text,
                          ),
                    icon: const Icon(Icons.add_shopping_cart),
                    label: const Text('Thêm giỏ'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: FilledButton(
                    onPressed:
                        cartController.isValidating.value || !item.isAvailable
                        ? null
                        : () async {
                            await cartController.addMenuItem(
                              item: item,
                              option: _selectedOption,
                              quantity: _quantity,
                              note: _noteController.text,
                            );
                            await cartController.goToCheckout();
                          },
                    child: const Text('Mua ngay'),
                  ),
                ),
              ],
            ),
          ),
        );
      }),
    );
  }

  void _openShopChat(MenuItemEntity item) {
    if (item.sellerId == null) return;
    Get.toNamed(
      AppRoutes.shopChat,
      arguments: {'sellerId': item.sellerId, 'shopName': item.sellerName},
    );
  }
}

class _ProductImage extends StatelessWidget {
  const _ProductImage({required this.item});

  final MenuItemEntity item;

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: 1,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: Colors.black.withValues(alpha: 0.06)),
        ),
        child: FoodImage(
          url: item.image,
          width: double.infinity,
          height: double.infinity,
          borderRadius: 8,
          fit: BoxFit.contain,
        ),
      ),
    );
  }
}

class _PriceBlock extends StatelessWidget {
  const _PriceBlock({required this.item, required this.unitPrice});

  final MenuItemEntity item;
  final num unitPrice;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        PriceText(
          unitPrice,
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            color: Theme.of(context).colorScheme.primary,
            fontWeight: FontWeight.w900,
          ),
        ),
        const Spacer(),
        if (!item.isAvailable)
          const Chip(
            label: Text('Hết hàng'),
            avatar: Icon(Icons.remove_shopping_cart_outlined, size: 18),
          ),
      ],
    );
  }
}

class _StatsRow extends StatelessWidget {
  const _StatsRow({required this.item});

  final MenuItemEntity item;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 12,
      runSpacing: 6,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.star_rounded, size: 18, color: Colors.amber.shade700),
            const SizedBox(width: 3),
            Text(
              item.ratingAverage > 0
                  ? item.ratingAverage.toStringAsFixed(1)
                  : 'Mới',
            ),
          ],
        ),
        Text('Đã bán ${item.soldCount}'),
        Text('Kho ${item.stock}'),
      ],
    );
  }
}

class _ShopBlock extends StatelessWidget {
  const _ShopBlock({required this.item});

  final MenuItemEntity item;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            Row(
              children: [
                const CircleAvatar(child: Icon(Icons.storefront_outlined)),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.sellerName!,
                        style: const TextStyle(fontWeight: FontWeight.w900),
                      ),
                      Text(item.menuTitle ?? 'Shop đang bán sản phẩm này'),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: item.sellerId == null
                        ? null
                        : () => Get.toNamed(
                            AppRoutes.shopProfile,
                            arguments: {
                              'sellerId': item.sellerId,
                              'shopName': item.sellerName,
                            },
                          ),
                    icon: const Icon(Icons.storefront_outlined),
                    label: const Text('Xem shop'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: FilledButton.icon(
                    onPressed: item.sellerId == null
                        ? null
                        : () => Get.toNamed(
                            AppRoutes.shopChat,
                            arguments: {
                              'sellerId': item.sellerId,
                              'shopName': item.sellerName,
                            },
                          ),
                    icon: const Icon(Icons.chat_bubble_outline),
                    label: const Text('Chat'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
            ),
            const SizedBox(height: 10),
            child,
          ],
        ),
      ),
    );
  }
}
