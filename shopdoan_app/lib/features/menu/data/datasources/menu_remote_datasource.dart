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
      '/categories',
      queryParameters: {
        'page': 1,
        'limit': 50,
        if (search != null && search.trim().isNotEmpty) 'search': search.trim(),
      },
    );
    final body = _unwrap(response.data);
    return _asList(
      body?['categories'] ?? body,
    ).map((json) => MenuModel.fromJson(json)).toList();
  }

  @override
  Future<MenuModel> getMenuById(int id) async {
    final response = await _dioClient.get<dynamic>('/categories/$id');
    return MenuModel.fromJson(_unwrap(response.data) ?? const {});
  }

  @override
  Future<List<MenuItemModel>> getMenuItems({
    String? search,
    int? menuId,
  }) async {
    final response = await _dioClient.get<dynamic>(
      '/products',
      queryParameters: {
        'page': 1,
        'limit': 80,
        'sortBy': 'newest',
        'categoryId': ?menuId,
        if (search != null && search.trim().isNotEmpty)
          'keyword': search.trim(),
      },
    );
    final body = _unwrap(response.data);
    final products = _asList(
      body?['products'] ?? body,
    ).map((json) => MenuItemModel.fromJson(json)).toList();

    if (products.isNotEmpty ||
        menuId != null ||
        search?.trim().isNotEmpty == true) {
      return products;
    }

    final fallback = await _dioClient.get<dynamic>(
      '/recommendations/home',
      queryParameters: {'limit': 80},
    );
    final fallbackBody = _unwrap(fallback.data);
    return _asList(
      fallbackBody?['products'],
    ).map((json) => MenuItemModel.fromJson(json)).toList();
  }

  @override
  Future<MenuItemModel> getMenuItemById(int id) async {
    final response = await _dioClient.get<dynamic>('/products/$id');
    return MenuItemModel.fromJson(_unwrap(response.data) ?? const {});
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
