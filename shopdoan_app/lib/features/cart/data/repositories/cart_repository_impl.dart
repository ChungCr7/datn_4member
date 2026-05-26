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
    int? menuItemOptionId,
    int quantity = 1,
    String? note,
  }) {
    return _remoteDataSource.validateItem(
      menuItemId: menuItemId,
      menuItemOptionId: menuItemOptionId,
      quantity: quantity,
      note: note,
    );
  }

  @override
  Future<List<CartItemEntity>> loadCart() => _localDataSource.loadCart();

  @override
  Future<void> saveCart(List<CartItemEntity> items) {
    return _localDataSource.saveCart(
      items.map(CartItemModel.fromEntity).toList(),
    );
  }

  @override
  Future<void> clearCart() => _localDataSource.clearCart();
}
