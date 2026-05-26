import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../../core/widgets/app_empty.dart';
import '../../../../core/widgets/price_text.dart';
import '../../../../shared/utils/date_formatter.dart';
import '../controllers/order_controller.dart';
import '../widgets/order_status_badge.dart';

class OrderHistoryPage extends StatefulWidget {
  const OrderHistoryPage({super.key});

  @override
  State<OrderHistoryPage> createState() => _OrderHistoryPageState();
}

class _OrderHistoryPageState extends State<OrderHistoryPage> {
  late final OrderController _orderController;

  @override
  void initState() {
    super.initState();
    _orderController = Get.find<OrderController>();
    _orderController.loadMyOrders(showError: false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Don hang'),
        actions: [
          IconButton(
            tooltip: 'Tai lai',
            onPressed: _orderController.loadMyOrders,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _orderController.loadMyOrders,
        child: Obx(() {
          if (_orderController.isLoading.value &&
              _orderController.orders.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }
          if (_orderController.orders.isEmpty) {
            return const AppEmpty(
              icon: Icons.receipt_long_outlined,
              title: 'Chua co don hang',
              message: 'Cac don da dat se xuat hien tai day.',
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemBuilder: (context, index) {
              final order = _orderController.orders[index];
              return Card(
                child: ListTile(
                  contentPadding: const EdgeInsets.all(12),
                  title: Row(
                    children: [
                      Expanded(
                        child: Text(
                          'Don #${order.id}',
                          style: const TextStyle(fontWeight: FontWeight.w900),
                        ),
                      ),
                      OrderStatusBadge(status: order.status),
                    ],
                  ),
                  subtitle: Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(
                      '${DateFormatter.dateTime(order.createdAt)} | ${order.details.length} mon',
                    ),
                  ),
                  trailing: PriceText(order.totalPrice),
                  onTap: () => _orderController.openOrderDetail(order),
                ),
              );
            },
            separatorBuilder: (context, index) => const SizedBox(height: 12),
            itemCount: _orderController.orders.length,
          );
        }),
      ),
    );
  }
}
