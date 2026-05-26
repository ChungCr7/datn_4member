class OrderEntity {
  const OrderEntity({
    required this.id,
    required this.totalPrice,
    required this.status,
    required this.paymentProvider,
    required this.paymentStatus,
    required this.createdAt,
    this.customerName,
    this.phone,
    this.address,
    this.note,
    this.details = const [],
  });

  final int id;
  final String? customerName;
  final String? phone;
  final String? address;
  final String? note;
  final num totalPrice;
  final String status;
  final String paymentProvider;
  final String paymentStatus;
  final DateTime createdAt;
  final List<OrderDetailEntity> details;
}

class OrderDetailEntity {
  const OrderDetailEntity({
    required this.id,
    required this.menuItemId,
    required this.quantity,
    required this.itemTitle,
    required this.unitPrice,
    required this.totalPrice,
    this.menuItemOptionId,
    this.optionTitle,
    this.note,
  });

  final int id;
  final int menuItemId;
  final int? menuItemOptionId;
  final int quantity;
  final String itemTitle;
  final String? optionTitle;
  final num unitPrice;
  final num totalPrice;
  final String? note;
}
