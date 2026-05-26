import '../entities/cart_item_entity.dart';

abstract class CartRepository {
  Future<CartItemEntity> validateItem({
    required int menuItemId,
    int? menuItemOptionId,
    int quantity = 1,
    String? note,
  });

  Future<List<CartItemEntity>> loadCart();

  Future<void> saveCart(List<CartItemEntity> items);

  Future<void> clearCart();
}
