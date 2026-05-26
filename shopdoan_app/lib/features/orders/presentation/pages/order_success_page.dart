import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../../core/routes/app_routes.dart';
import '../../../../core/widgets/price_text.dart';
import '../controllers/order_controller.dart';

class OrderSuccessPage extends StatelessWidget {
  const OrderSuccessPage({super.key});

  @override
  Widget build(BuildContext context) {
    final order = Get.find<OrderController>().selectedOrder.value;

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.check_circle,
                  size: 72,
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(height: 16),
                Text(
                  'Dat hang thanh cong',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
                  textAlign: TextAlign.center,
                ),
                if (order != null) ...[
                  const SizedBox(height: 10),
                  Text(
                    'Ma don #${order.id}',
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 6),
                  PriceText(order.totalPrice),
                ],
                const SizedBox(height: 20),
                FilledButton.icon(
                  onPressed: () => Get.offAllNamed(AppRoutes.main),
                  icon: const Icon(Icons.home_outlined),
                  label: const Text('Ve trang chu'),
                ),
                const SizedBox(height: 8),
                TextButton(
                  onPressed: () => Get.offAllNamed(AppRoutes.main),
                  child: const Text('Xem trong muc Don hang'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
