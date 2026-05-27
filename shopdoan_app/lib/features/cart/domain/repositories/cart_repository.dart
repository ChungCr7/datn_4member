import '../entities/cart_item_entity.dart';

abstract class CartRepository {
  Future<CartItemEntity> validateItem({
    required int menuItemId,
    int? productId,
    int? variantId,
    int? menuItemOptionId,
    int quantity = 1,
    String? note,
  });

  Future<CartItemEntity> addItem({
    required int menuItemId,
    int? productId,
    int? variantId,
    int? menuItemOptionId,
    int quantity = 1,
    String? note,
  });

  Future<List<CartItemEntity>> loadCart();

  Future<void> saveCart(List<CartItemEntity> items);

  Future<void> updateQuantity(String key, int quantity);

  Future<void> removeItem(String key);

  Future<void> clearCart();
}
