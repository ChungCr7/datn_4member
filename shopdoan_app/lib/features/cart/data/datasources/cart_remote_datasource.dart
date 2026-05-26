import '../../../../core/network/api_exception.dart';
import '../../../../core/network/dio_client.dart';
import '../models/cart_item_model.dart';

abstract class CartRemoteDataSource {
  Future<CartItemModel> validateItem({
    required int menuItemId,
    int? menuItemOptionId,
    int quantity = 1,
    String? note,
  });
}

class CartRemoteDataSourceImpl implements CartRemoteDataSource {
  CartRemoteDataSourceImpl(this._dioClient);

  final DioClient _dioClient;

  @override
  Future<CartItemModel> validateItem({
    required int menuItemId,
    int? menuItemOptionId,
    int quantity = 1,
    String? note,
  }) async {
    final response = await _dioClient.post<dynamic>(
      '/cart/validate-item',
      data: {
        'menuItemId': menuItemId,
        'menuItemOptionId': ?menuItemOptionId,
        'quantity': quantity,
        if (note != null && note.trim().isNotEmpty) 'note': note.trim(),
      },
    );
    final body = _asMap(response.data);
    if (body?['valid'] != true) {
      throw ApiException('Mon an khong hop le hoac da het hang.');
    }
    final item = _asMap(body?['item']);
    if (item == null) {
      throw ApiException('Phan hoi validate gio hang khong hop le.');
    }
    return CartItemModel.fromJson(item);
  }

  Map<String, dynamic>? _asMap(Object? value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) return Map<String, dynamic>.from(value);
    return null;
  }
}
