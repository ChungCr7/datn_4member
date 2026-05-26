class CartItemEntity {
  const CartItemEntity({
    required this.key,
    required this.menuItemId,
    required this.name,
    required this.price,
    required this.quantity,
    this.menuItemOptionId,
    this.optionTitle,
    this.image,
    this.note,
  });

  final String key;
  final int menuItemId;
  final int? menuItemOptionId;
  final String name;
  final String? optionTitle;
  final num price;
  final int quantity;
  final String? image;
  final String? note;

  num get total => price * quantity;

  CartItemEntity copyWith({int? quantity, String? note}) {
    return CartItemEntity(
      key: key,
      menuItemId: menuItemId,
      menuItemOptionId: menuItemOptionId,
      name: name,
      optionTitle: optionTitle,
      price: price,
      quantity: quantity ?? this.quantity,
      image: image,
      note: note ?? this.note,
    );
  }
}
