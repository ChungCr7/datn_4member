import '../../../../core/network/api_exception.dart';
import '../../../../core/network/dio_client.dart';
import '../models/cart_item_model.dart';

abstract class CartRemoteDataSource {
  Future<List<CartItemModel>> getCart();

  Future<CartItemModel> validateItem({
    required int menuItemId,
    int? productId,
    int? variantId,
    int? menuItemOptionId,
    int quantity = 1,
    String? note,
  });

  Future<CartItemModel> addItem({
    required int menuItemId,
    int? productId,
    int? variantId,
    int? menuItemOptionId,
    int quantity = 1,
    String? note,
  });

  Future<List<CartItemModel>> updateQuantity(String key, int quantity);

  Future<List<CartItemModel>> removeItem(String key);

  Future<List<CartItemModel>> clearCart();
}

class CartRemoteDataSourceImpl implements CartRemoteDataSource {
  CartRemoteDataSourceImpl(this._dioClient);

  final DioClient _dioClient;

  @override
  Future<List<CartItemModel>> getCart() async {
    final response = await _dioClient.get<dynamic>('/cart');
    final body = _unwrap(response.data);
    return _asList(
      body?['items'],
    ).map((json) => CartItemModel.fromJson(json)).toList();
  }

  @override
  Future<CartItemModel> validateItem({
    required int menuItemId,
    int? productId,
    int? variantId,
    int? menuItemOptionId,
    int quantity = 1,
    String? note,
  }) async {
    final response = await _dioClient.post<dynamic>(
      '/cart/validate-item',
      data: {
        'menuItemId': ?(productId == null ? menuItemId : null),
        'productId': ?productId,
        'menuItemOptionId': ?menuItemOptionId,
        'variantId': ?variantId,
        'quantity': quantity,
        if (note != null && note.trim().isNotEmpty) 'note': note.trim(),
      },
    );
    final body = _unwrap(response.data);
    if (body?['valid'] != true) {
      throw ApiException('Sản phẩm không hợp lệ hoặc đã hết hàng.');
    }
    final item = _asMap(body?['item']);
    if (item == null) {
      throw ApiException('Phản hồi giỏ hàng không hợp lệ.');
    }
    return CartItemModel.fromJson(item);
  }

  @override
  Future<CartItemModel> addItem({
    required int menuItemId,
    int? productId,
    int? variantId,
    int? menuItemOptionId,
    int quantity = 1,
    String? note,
  }) async {
    final response = await _dioClient.post<dynamic>(
      '/cart/items',
      data: {
        'menuItemId': ?(productId == null ? menuItemId : null),
        'productId': ?productId,
        'menuItemOptionId': ?menuItemOptionId,
        'variantId': ?variantId,
        'quantity': quantity,
        if (note != null && note.trim().isNotEmpty) 'note': note.trim(),
      },
    );
    final body = _unwrap(response.data);
    final item = _asMap(body?['item']);
    if (item == null) {
      throw ApiException('Phản hồi giỏ hàng không hợp lệ.');
    }
    return CartItemModel.fromJson(item);
  }

  @override
  Future<List<CartItemModel>> updateQuantity(String key, int quantity) async {
    final encodedKey = Uri.encodeComponent(key);
    final response = await _dioClient.patch<dynamic>(
      '/cart/items/$encodedKey',
      data: {'quantity': quantity},
    );
    final body = _unwrap(response.data);
    return _asList(
      body?['items'],
    ).map((json) => CartItemModel.fromJson(json)).toList();
  }

  @override
  Future<List<CartItemModel>> removeItem(String key) async {
    final encodedKey = Uri.encodeComponent(key);
    final response = await _dioClient.delete<dynamic>(
      '/cart/items/$encodedKey',
    );
    final body = _unwrap(response.data);
    return _asList(
      body?['items'],
    ).map((json) => CartItemModel.fromJson(json)).toList();
  }

  @override
  Future<List<CartItemModel>> clearCart() async {
    final response = await _dioClient.delete<dynamic>('/cart/clear');
    final body = _unwrap(response.data);
    return _asList(
      body?['items'],
    ).map((json) => CartItemModel.fromJson(json)).toList();
  }

  Map<String, dynamic>? _unwrap(Object? value) {
    final body = _asMap(value);
    final data = _asMap(body?['data']);
    return data ?? body;
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
