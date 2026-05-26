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
      'confirmed' || 'preparing' => Colors.orange,
      'on_the_way' => Colors.blue,
      'delivered' => Colors.green,
      'cancelled' => Colors.red,
      _ => Colors.brown,
    };
  }
}

String orderStatusLabel(String status) {
  return switch (status) {
    'ordered' => 'Da dat',
    'confirmed' => 'Da xac nhan',
    'preparing' => 'Dang chuan bi',
    'on_the_way' => 'Dang giao',
    'delivered' => 'Da giao',
    'cancelled' => 'Da huy',
    _ => status,
  };
}

String paymentStatusLabel(String status) {
  return switch (status) {
    'pending' => 'Cho thanh toan',
    'paid' => 'Da thanh toan',
    'failed' => 'That bai',
    'cancelled' => 'Da huy',
    'refunded' => 'Da hoan tien',
    _ => status,
  };
}
