import '../../../cart/domain/entities/cart_item_entity.dart';
import '../entities/order_entity.dart';

abstract class OrderRepository {
  Future<OrderEntity> createOrder({
    required String customerName,
    required String phone,
    required String address,
    String? note,
    required List<CartItemEntity> cartItems,
  });

  Future<List<OrderEntity>> getUserOrders(int userId);

  Future<OrderEntity> getOrderById(int id);

  Future<OrderEntity> cancelOrder(int id);
}
