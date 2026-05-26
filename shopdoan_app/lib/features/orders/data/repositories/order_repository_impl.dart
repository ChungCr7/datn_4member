import '../../../cart/domain/entities/cart_item_entity.dart';
import '../../domain/entities/order_entity.dart';
import '../../domain/repositories/order_repository.dart';
import '../datasources/order_remote_datasource.dart';

class OrderRepositoryImpl implements OrderRepository {
  OrderRepositoryImpl(this._remoteDataSource);

  final OrderRemoteDataSource _remoteDataSource;

  @override
  Future<OrderEntity> createOrder({
    required String customerName,
    required String phone,
    required String address,
    String? note,
    required List<CartItemEntity> cartItems,
  }) {
    return _remoteDataSource.createOrder(
      customerName: customerName,
      phone: phone,
      address: address,
      note: note,
      cartItems: cartItems,
    );
  }

  @override
  Future<List<OrderEntity>> getUserOrders(int userId) {
    return _remoteDataSource.getUserOrders(userId);
  }

  @override
  Future<OrderEntity> getOrderById(int id) {
    return _remoteDataSource.getOrderById(id);
  }

  @override
  Future<OrderEntity> cancelOrder(int id) {
    return _remoteDataSource.cancelOrder(id);
  }
}
