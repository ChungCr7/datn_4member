import '../../../../core/network/dio_client.dart';
import '../../../cart/domain/entities/cart_item_entity.dart';
import '../models/order_model.dart';

abstract class OrderRemoteDataSource {
  Future<OrderModel> createOrder({
    required String customerName,
    required String phone,
    required String address,
    String? note,
    required List<CartItemEntity> cartItems,
  });

  Future<List<OrderModel>> getUserOrders(int userId);

  Future<OrderModel> getOrderById(int id);

  Future<OrderModel> cancelOrder(int id);
}

class OrderRemoteDataSourceImpl implements OrderRemoteDataSource {
  OrderRemoteDataSourceImpl(this._dioClient);

  final DioClient _dioClient;

  @override
  Future<OrderModel> createOrder({
    required String customerName,
    required String phone,
    required String address,
    String? note,
    required List<CartItemEntity> cartItems,
  }) async {
    final response = await _dioClient.post<dynamic>(
      '/orders',
      data: {
        'customerName': customerName.trim(),
        'phone': phone.trim(),
        'address': address.trim(),
        if (note != null && note.trim().isNotEmpty) 'note': note.trim(),
        'paymentProvider': 'cash',
        'details': cartItems
            .map(
              (item) => {
                'menuItemId': item.menuItemId,
                'menuItemOptionId': ?item.menuItemOptionId,
                'quantity': item.quantity,
                if (item.note != null && item.note!.trim().isNotEmpty)
                  'note': item.note!.trim(),
              },
            )
            .toList(),
      },
    );
    return OrderModel.fromJson(_asMap(response.data) ?? const {});
  }

  @override
  Future<List<OrderModel>> getUserOrders(int userId) async {
    final response = await _dioClient.get<dynamic>(
      '/orders/user/$userId',
      queryParameters: {
        'page': 1,
        'limit': 50,
        'sortBy': 'createdAt',
        'sortOrder': 'desc',
      },
    );
    final body = _asMap(response.data);
    return _asList(
      body?['orders'] ?? response.data,
    ).map((json) => OrderModel.fromJson(json)).toList();
  }

  @override
  Future<OrderModel> getOrderById(int id) async {
    final response = await _dioClient.get<dynamic>('/orders/$id');
    return OrderModel.fromJson(_asMap(response.data) ?? const {});
  }

  @override
  Future<OrderModel> cancelOrder(int id) async {
    final response = await _dioClient.patch<dynamic>(
      '/orders/$id',
      data: {'status': 'cancelled'},
    );
    return OrderModel.fromJson(_asMap(response.data) ?? const {});
  }

  Map<String, dynamic>? _asMap(Object? value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) return Map<String, dynamic>.from(value);
    return null;
  }

  List<Map<String, dynamic>> _asList(Object? value) {
    if (value is! List) return const [];
    return value
        .whereType<Map>()
        .map((entry) => Map<String, dynamic>.from(entry))
        .toList();
  }
}
