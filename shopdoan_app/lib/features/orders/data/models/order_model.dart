import '../../domain/entities/order_entity.dart';

class OrderModel extends OrderEntity {
  const OrderModel({
    required super.id,
    required super.totalPrice,
    required super.status,
    required super.paymentProvider,
    required super.paymentStatus,
    required super.createdAt,
    super.customerName,
    super.phone,
    super.address,
    super.note,
    super.details,
  });

  factory OrderModel.fromJson(Map<String, dynamic> json) {
    return OrderModel(
      id: _asInt(json['id']) ?? 0,
      customerName: json['customerName']?.toString(),
      phone: json['phone']?.toString(),
      address: json['address']?.toString(),
      note: json['note']?.toString(),
      totalPrice: _asNum(json['totalPrice']) ?? 0,
      status: (json['status'] ?? 'ordered').toString(),
      paymentProvider: (json['paymentProvider'] ?? 'cash').toString(),
      paymentStatus: (json['paymentStatus'] ?? 'pending').toString(),
      createdAt: _asDate(json['createdAt'] ?? json['orderTime']),
      details: _asList(
        json['details'],
      ).map((value) => OrderDetailModel.fromJson(value)).toList(),
    );
  }

  static DateTime _asDate(Object? value) {
    return DateTime.tryParse(value?.toString() ?? '') ?? DateTime.now();
  }

  static List<Map<String, dynamic>> _asList(Object? value) {
    if (value is! List) return const [];
    return value
        .whereType<Map>()
        .map((entry) => Map<String, dynamic>.from(entry))
        .toList();
  }

  static int? _asInt(Object? value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    return int.tryParse(value?.toString() ?? '');
  }

  static num? _asNum(Object? value) {
    if (value is num) return value;
    return num.tryParse(value?.toString() ?? '');
  }
}

class OrderDetailModel extends OrderDetailEntity {
  const OrderDetailModel({
    required super.id,
    required super.menuItemId,
    required super.quantity,
    required super.itemTitle,
    required super.unitPrice,
    required super.totalPrice,
    super.menuItemOptionId,
    super.optionTitle,
    super.note,
  });

  factory OrderDetailModel.fromJson(Map<String, dynamic> json) {
    return OrderDetailModel(
      id: _asInt(json['id']) ?? 0,
      menuItemId: _asInt(json['menuItemId']) ?? 0,
      menuItemOptionId: _asInt(json['menuItemOptionId']),
      quantity: _asInt(json['quantity']) ?? 1,
      itemTitle:
          (json['itemTitle'] ?? _asMap(json['menuItem'])?['title'] ?? 'Mon an')
              .toString(),
      optionTitle:
          (json['optionTitle'] ?? _asMap(json['menuItemOption'])?['title'])
              ?.toString(),
      unitPrice: _asNum(json['unitPrice']) ?? 0,
      totalPrice: _asNum(json['totalPrice']) ?? 0,
      note: json['note']?.toString(),
    );
  }

  static Map<String, dynamic>? _asMap(Object? value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) return Map<String, dynamic>.from(value);
    return null;
  }

  static int? _asInt(Object? value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    return int.tryParse(value?.toString() ?? '');
  }

  static num? _asNum(Object? value) {
    if (value is num) return value;
    return num.tryParse(value?.toString() ?? '');
  }
}
