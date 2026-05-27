class CartItemEntity {
  const CartItemEntity({
    required this.key,
    required this.menuItemId,
    required this.name,
    required this.price,
    required this.quantity,
    this.productId,
    this.variantId,
    this.menuItemOptionId,
    this.optionTitle,
    this.sellerName,
    this.stock,
    this.image,
    this.note,
  });

  final String key;
  final int menuItemId;
  final int? productId;
  final int? variantId;
  final int? menuItemOptionId;
  final String name;
  final String? optionTitle;
  final String? sellerName;
  final int? stock;
  final num price;
  final int quantity;
  final String? image;
  final String? note;

  num get total => price * quantity;

  CartItemEntity copyWith({int? quantity, String? note}) {
    return CartItemEntity(
      key: key,
      menuItemId: menuItemId,
      productId: productId,
      variantId: variantId,
      menuItemOptionId: menuItemOptionId,
      name: name,
      optionTitle: optionTitle,
      sellerName: sellerName,
      stock: stock,
      price: price,
      quantity: quantity ?? this.quantity,
      image: image,
      note: note ?? this.note,
    );
  }
}
