import '../../domain/entities/menu_entity.dart';
import '../../domain/entities/menu_item_entity.dart';
import '../../domain/repositories/menu_repository.dart';
import '../datasources/menu_remote_datasource.dart';

class MenuRepositoryImpl implements MenuRepository {
  MenuRepositoryImpl(this._remoteDataSource);

  final MenuRemoteDataSource _remoteDataSource;

  @override
  Future<List<MenuEntity>> getMenus({String? search}) {
    return _remoteDataSource.getMenus(search: search);
  }

  @override
  Future<MenuEntity> getMenuById(int id) {
    return _remoteDataSource.getMenuById(id);
  }

  @override
  Future<List<MenuItemEntity>> getMenuItems({String? search, int? menuId}) {
    return _remoteDataSource.getMenuItems(search: search, menuId: menuId);
  }

  @override
  Future<MenuItemEntity> getMenuItemById(int id) {
    return _remoteDataSource.getMenuItemById(id);
  }
}
