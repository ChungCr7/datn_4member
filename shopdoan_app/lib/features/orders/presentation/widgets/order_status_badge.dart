import 'package:flutter/material.dart';

class OrderStatusBadge extends StatelessWidget {
  const OrderStatusBadge({super.key, required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final color = _colorForStatus(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        orderStatusLabel(status),
        style: TextStyle(color: color, fontWeight: FontWeight.w800),
      ),
    );
  }

  Color _colorForStatus(String value) {
    return switch (value) {
      'CONFIRMED' || 'confirmed' || 'PACKING' || 'preparing' => Colors.orange,
      'SHIPPING' || 'on_the_way' => Colors.blue,
      'DELIVERED' || 'delivered' => Colors.green,
      'CANCELLED' || 'cancelled' => Colors.red,
      _ => Colors.brown,
    };
  }
}

String orderStatusLabel(String status) {
  return switch (status) {
    'PENDING' || 'ordered' => 'Chờ xác nhận',
    'CONFIRMED' || 'confirmed' => 'Đã xác nhận',
    'PACKING' || 'preparing' => 'Đang đóng gói',
    'SHIPPING' || 'on_the_way' => 'Đang giao',
    'DELIVERED' || 'delivered' => 'Đã giao',
    'CANCELLED' || 'cancelled' => 'Đã hủy',
    _ => status,
  };
}

String paymentStatusLabel(String status) {
  return switch (status) {
    'UNPAID' || 'pending' => 'Chờ thanh toán',
    'PAID' || 'paid' => 'Đã thanh toán',
    'FAILED' || 'failed' => 'Thất bại',
    'cancelled' => 'Đã hủy',
    'REFUNDED' || 'refunded' => 'Đã hoàn tiền',
    _ => status,
  };
}
