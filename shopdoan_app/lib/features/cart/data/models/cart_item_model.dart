import '../../domain/entities/cart_item_entity.dart';

class CartItemModel extends CartItemEntity {
  const CartItemModel({
    required super.key,
    required super.menuItemId,
    required super.name,
    required super.price,
    required super.quantity,
    super.menuItemOptionId,
    super.optionTitle,
    super.image,
    super.note,
  });

  factory CartItemModel.fromJson(Map<String, dynamic> json) {
    final menuItemId = _asInt(json['menuItemId']) ?? 0;
    final optionId = _asInt(json['menuItemOptionId']);
    return CartItemModel(
      key: (json['id'] ?? json['key'] ?? '$menuItemId-${optionId ?? 'base'}')
          .toString(),
      menuItemId: menuItemId,
      menuItemOptionId: optionId,
      name: (json['name'] ?? json['title'] ?? 'Mon an').toString(),
      optionTitle: json['optionTitle']?.toString(),
      price: _asNum(json['price'] ?? json['unitPrice']) ?? 0,
      quantity: _asInt(json['quantity']) ?? 1,
      image: json['image']?.toString(),
      note: json['note']?.toString(),
    );
  }

  factory CartItemModel.fromEntity(CartItemEntity entity) {
    return CartItemModel(
      key: entity.key,
      menuItemId: entity.menuItemId,
      menuItemOptionId: entity.menuItemOptionId,
      name: entity.name,
      optionTitle: entity.optionTitle,
      price: entity.price,
      quantity: entity.quantity,
      image: entity.image,
      note: entity.note,
    );
  }

  Map<String, dynamic> toJson() => {
    'key': key,
    'menuItemId': menuItemId,
    'menuItemOptionId': menuItemOptionId,
    'name': name,
    'optionTitle': optionTitle,
    'price': price,
    'quantity': quantity,
    'image': image,
    'note': note,
  };

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
