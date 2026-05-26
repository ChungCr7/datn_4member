import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../../core/widgets/price_text.dart';
import '../../../../shared/utils/date_formatter.dart';
import '../controllers/order_controller.dart';
import '../widgets/order_status_badge.dart';

class OrderDetailPage extends StatelessWidget {
  const OrderDetailPage({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = Get.find<OrderController>();
    final args = Get.arguments;
    final id = args is Map ? int.tryParse(args['id']?.toString() ?? '') : null;
    if (id != null && controller.selectedOrder.value?.id != id) {
      controller.loadOrderDetail(id);
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Chi tiet don hang')),
      body: Obx(() {
        final order = controller.selectedOrder.value;
        if (controller.isLoading.value && order == null) {
          return const Center(child: CircularProgressIndicator());
        }
        if (order == null) {
          return const Center(child: Text('Khong tim thay don hang.'));
        }

        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            'Don #${order.id}',
                            style: Theme.of(context).textTheme.titleLarge
                                ?.copyWith(fontWeight: FontWeight.w900),
                          ),
                        ),
                        OrderStatusBadge(status: order.status),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(DateFormatter.dateTime(order.createdAt)),
                    const SizedBox(height: 8),
                    Text(
                      'Thanh toan: ${paymentStatusLabel(order.paymentStatus)}',
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Thong tin giao hang',
                      style: TextStyle(fontWeight: FontWeight.w900),
                    ),
                    const SizedBox(height: 8),
                    Text(order.customerName ?? ''),
                    Text(order.phone ?? ''),
                    Text(order.address ?? ''),
                    if (order.note?.isNotEmpty == true) ...[
                      const SizedBox(height: 8),
                      Text('Ghi chu: ${order.note}'),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Mon da dat',
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 8),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  children: [
                    for (final detail in order.details)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 7),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    detail.optionTitle == null
                                        ? detail.itemTitle
                                        : '${detail.itemTitle} (${detail.optionTitle})',
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                  Text(
                                    '${detail.quantity} x',
                                    style: Theme.of(
                                      context,
                                    ).textTheme.bodySmall,
                                  ),
                                ],
                              ),
                            ),
                            PriceText(detail.totalPrice),
                          ],
                        ),
                      ),
                    const Divider(),
                    Row(
                      children: [
                        const Expanded(
                          child: Text(
                            'Tong cong',
                            style: TextStyle(fontWeight: FontWeight.w900),
                          ),
                        ),
                        PriceText(order.totalPrice),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        );
      }),
      bottomNavigationBar: Obx(() {
        final order = controller.selectedOrder.value;
        if (order == null || !_canCancel(order.status)) {
          return const SizedBox.shrink();
        }
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: FilledButton.tonalIcon(
              onPressed: controller.isLoading.value
                  ? null
                  : controller.cancelSelectedOrder,
              icon: const Icon(Icons.cancel_outlined),
              label: const Text('Huy don'),
            ),
          ),
        );
      }),
    );
  }

  bool _canCancel(String status) {
    return status == 'ordered' || status == 'confirmed';
  }
}
