import '../../domain/entities/cart_item_entity.dart';

class CartItemModel extends CartItemEntity {
  const CartItemModel({
    required super.key,
    required super.menuItemId,
    required super.name,
    required super.price,
    required super.quantity,
    super.productId,
    super.variantId,
    super.menuItemOptionId,
    super.optionTitle,
    super.sellerName,
    super.stock,
    super.image,
    super.note,
  });

  factory CartItemModel.fromJson(Map<String, dynamic> json) {
    final menuItemId = _asInt(json['menuItemId'] ?? json['productId']) ?? 0;
    final productId = _asInt(json['productId']);
    final optionId = _asInt(json['menuItemOptionId']);
    final variantId = _asInt(json['variantId']);
    final seller = _asMap(json['seller']);
    return CartItemModel(
      key:
          (json['id'] ??
                  json['key'] ??
                  (productId != null
                      ? 'product:$productId:${variantId ?? 'base'}'
                      : '$menuItemId-${optionId ?? 'base'}'))
              .toString(),
      menuItemId: menuItemId,
      productId: productId,
      variantId: variantId,
      menuItemOptionId: optionId,
      name: (json['name'] ?? json['title'] ?? 'Sản phẩm').toString(),
      optionTitle: (json['optionTitle'] ?? json['variantName'])?.toString(),
      sellerName: seller?['shopName']?.toString(),
      stock: _asInt(json['stock']),
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
      productId: entity.productId,
      variantId: entity.variantId,
      menuItemOptionId: entity.menuItemOptionId,
      name: entity.name,
      optionTitle: entity.optionTitle,
      sellerName: entity.sellerName,
      stock: entity.stock,
      price: entity.price,
      quantity: entity.quantity,
      image: entity.image,
      note: entity.note,
    );
  }

  Map<String, dynamic> toJson() => {
    'key': key,
    'menuItemId': menuItemId,
    'productId': productId,
    'variantId': variantId,
    'menuItemOptionId': menuItemOptionId,
    'name': name,
    'optionTitle': optionTitle,
    'sellerName': sellerName,
    'stock': stock,
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

  static Map<String, dynamic>? _asMap(Object? value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) return Map<String, dynamic>.from(value);
    return null;
  }
}
