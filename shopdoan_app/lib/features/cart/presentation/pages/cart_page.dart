import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../../core/widgets/app_empty.dart';
import '../../../../core/widgets/price_text.dart';
import '../../../menu/presentation/widgets/food_image.dart';
import '../controllers/cart_controller.dart';
import '../widgets/quantity_stepper.dart';

class CartPage extends GetView<CartController> {
  const CartPage({super.key});

  @override
  Widget build(BuildContext context) {
    Get.find<CartController>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Giỏ hàng'),
        actions: [
          Obx(
            () => controller.items.isEmpty
                ? const SizedBox.shrink()
                : IconButton(
                    tooltip: 'Xóa giỏ hàng',
                    onPressed: controller.clear,
                    icon: const Icon(Icons.delete_sweep_outlined),
                  ),
          ),
        ],
      ),
      body: Obx(() {
        if (controller.isLoading.value) {
          return const Center(child: CircularProgressIndicator());
        }
        if (controller.items.isEmpty) {
          return const AppEmpty(
            icon: Icons.shopping_bag_outlined,
            title: 'Giỏ hàng đang trống',
            message: 'Hãy chọn sản phẩm để bắt đầu đặt hàng.',
          );
        }

        return ListView.separated(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 140),
          itemBuilder: (context, index) {
            final item = controller.items[index];
            return Card(
              child: Padding(
                padding: const EdgeInsets.all(10),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    FoodImage(url: item.image, width: 82, height: 82),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            item.name,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          if (item.note?.isNotEmpty == true) ...[
                            const SizedBox(height: 4),
                            Text(
                              item.note!,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                          ],
                          if (item.sellerName?.isNotEmpty == true) ...[
                            const SizedBox(height: 4),
                            Text(
                              item.sellerName!,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                          ],
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              PriceText(item.price),
                              const Spacer(),
                              QuantityStepper(
                                value: item.quantity,
                                min: 1,
                                onDecrease: () => controller.decrease(item.key),
                                onIncrease: () => controller.increase(item.key),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
          separatorBuilder: (context, index) => const SizedBox(height: 12),
          itemCount: controller.items.length,
        );
      }),
      bottomNavigationBar: Obx(() {
        if (controller.items.isEmpty) return const SizedBox.shrink();

        return SafeArea(
          child: Container(
            padding: const EdgeInsets.all(16),
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
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    const Expanded(
                      child: Text(
                        'Tổng cộng',
                        style: TextStyle(fontWeight: FontWeight.w900),
                      ),
                    ),
                    PriceText(
                      controller.totalPrice,
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                FilledButton.icon(
                  onPressed: controller.isValidating.value
                      ? null
                      : controller.goToCheckout,
                  icon: controller.isValidating.value
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.payments_outlined),
                  label: const Text('Thanh toán COD'),
                ),
              ],
            ),
          ),
        );
      }),
    );
  }
}
