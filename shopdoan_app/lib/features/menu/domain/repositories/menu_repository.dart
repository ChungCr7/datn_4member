import '../entities/menu_entity.dart';
import '../entities/menu_item_entity.dart';

abstract class MenuRepository {
  Future<List<MenuEntity>> getMenus({String? search});

  Future<MenuEntity> getMenuById(int id);

  Future<List<MenuItemEntity>> getMenuItems({String? search, int? menuId});

  Future<MenuItemEntity> getMenuItemById(int id);
}
