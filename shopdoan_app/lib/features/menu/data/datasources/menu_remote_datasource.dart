import '../../../../core/network/dio_client.dart';
import '../models/menu_item_model.dart';
import '../models/menu_model.dart';

abstract class MenuRemoteDataSource {
  Future<List<MenuModel>> getMenus({String? search});

  Future<MenuModel> getMenuById(int id);

  Future<List<MenuItemModel>> getMenuItems({String? search, int? menuId});

  Future<MenuItemModel> getMenuItemById(int id);
}

class MenuRemoteDataSourceImpl implements MenuRemoteDataSource {
  MenuRemoteDataSourceImpl(this._dioClient);

  final DioClient _dioClient;

  @override
  Future<List<MenuModel>> getMenus({String? search}) async {
    final response = await _dioClient.get<dynamic>(
      '/menus',
      queryParameters: {
        'page': 1,
        'limit': 50,
        'filter': 'active',
        'sortBy': 'sortOrder',
        'sortOrder': 'asc',
        if (search != null && search.trim().isNotEmpty) 'search': search.trim(),
      },
    );
    final body = _asMap(response.data);
    return _asList(
      body?['menus'] ?? response.data,
    ).map((json) => MenuModel.fromJson(json)).toList();
  }

  @override
  Future<MenuModel> getMenuById(int id) async {
    final response = await _dioClient.get<dynamic>('/menus/$id');
    return MenuModel.fromJson(_asMap(response.data) ?? const {});
  }

  @override
  Future<List<MenuItemModel>> getMenuItems({
    String? search,
    int? menuId,
  }) async {
    final response = await _dioClient.get<dynamic>(
      menuId == null ? '/menu-items' : '/menu-items/menu/$menuId',
      queryParameters: {
        'page': 1,
        'limit': 80,
        'filter': 'available',
        'sortBy': 'sortOrder',
        'sortOrder': 'asc',
        if (search != null && search.trim().isNotEmpty) 'search': search.trim(),
      },
    );
    final body = _asMap(response.data);
    return _asList(
      body?['items'] ?? response.data,
    ).map((json) => MenuItemModel.fromJson(json)).toList();
  }

  @override
  Future<MenuItemModel> getMenuItemById(int id) async {
    final response = await _dioClient.get<dynamic>('/menu-items/$id');
    return MenuItemModel.fromJson(_asMap(response.data) ?? const {});
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
