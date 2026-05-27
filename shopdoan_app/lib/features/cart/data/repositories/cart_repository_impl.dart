import '../../domain/entities/cart_item_entity.dart';
import '../../domain/repositories/cart_repository.dart';
import '../datasources/cart_local_datasource.dart';
import '../datasources/cart_remote_datasource.dart';
import '../models/cart_item_model.dart';

class CartRepositoryImpl implements CartRepository {
  CartRepositoryImpl({
    required CartRemoteDataSource remoteDataSource,
    required CartLocalDataSource localDataSource,
  }) : _remoteDataSource = remoteDataSource,
       _localDataSource = localDataSource;

  final CartRemoteDataSource _remoteDataSource;
  final CartLocalDataSource _localDataSource;

  @override
  Future<CartItemEntity> validateItem({
    required int menuItemId,
    int? productId,
    int? variantId,
    int? menuItemOptionId,
    int quantity = 1,
    String? note,
  }) {
    return _remoteDataSource.validateItem(
      menuItemId: menuItemId,
      productId: productId,
      variantId: variantId,
      menuItemOptionId: menuItemOptionId,
      quantity: quantity,
      note: note,
    );
  }

  @override
  Future<CartItemEntity> addItem({
    required int menuItemId,
    int? productId,
    int? variantId,
    int? menuItemOptionId,
    int quantity = 1,
    String? note,
  }) {
    return _remoteDataSource.addItem(
      menuItemId: menuItemId,
      productId: productId,
      variantId: variantId,
      menuItemOptionId: menuItemOptionId,
      quantity: quantity,
      note: note,
    );
  }

  @override
  Future<List<CartItemEntity>> loadCart() async {
    try {
      final items = await _remoteDataSource.getCart();
      await _localDataSource.saveCart(items);
      return items;
    } catch (_) {
      return _localDataSource.loadCart();
    }
  }

  @override
  Future<void> saveCart(List<CartItemEntity> items) {
    return _localDataSource.saveCart(
      items.map(CartItemModel.fromEntity).toList(),
    );
  }

  @override
  Future<void> updateQuantity(String key, int quantity) async {
    try {
      final items = await _remoteDataSource.updateQuantity(key, quantity);
      await _localDataSource.saveCart(items);
    } catch (_) {
      // Local cart is still updated by the controller.
    }
  }

  @override
  Future<void> removeItem(String key) async {
    try {
      final items = await _remoteDataSource.removeItem(key);
      await _localDataSource.saveCart(items);
    } catch (_) {
      // Local cart is still updated by the controller.
    }
  }

  @override
  Future<void> clearCart() async {
    try {
      await _remoteDataSource.clearCart();
    } catch (_) {
      // Ignore remote clear failure; local clear still runs below.
    }
    await _localDataSource.clearCart();
  }
}
