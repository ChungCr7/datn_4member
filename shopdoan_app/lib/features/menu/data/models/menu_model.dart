import '../../domain/entities/menu_entity.dart';
import 'menu_item_model.dart';

class MenuModel extends MenuEntity {
  const MenuModel({
    required super.id,
    required super.title,
    super.description,
    super.image,
    super.isActive,
    super.itemCount,
    super.items,
  });

  factory MenuModel.fromJson(Map<String, dynamic> json) {
    final count = _asMap(json['_count']);
    final items = _asList(
      json['menuItems'],
    ).map((value) => MenuItemModel.fromJson(value)).toList();

    return MenuModel(
      id: _asInt(json['id']) ?? 0,
      title: (json['title'] ?? json['name'] ?? 'Danh muc').toString(),
      description: json['description']?.toString(),
      image: json['image']?.toString(),
      isActive: _asBool(json['isActive']) ?? true,
      itemCount: _asInt(count?['menuItems']) ?? items.length,
      items: items,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'title': title,
    'description': description,
    'image': image,
    'isActive': isActive,
    'itemCount': itemCount,
    'menuItems': items
        .whereType<MenuItemModel>()
        .map((item) => item.toJson())
        .toList(),
  };

  static Map<String, dynamic>? _asMap(Object? value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) return Map<String, dynamic>.from(value);
    return null;
  }

  static List<Map<String, dynamic>> _asList(Object? value) {
    if (value is! List) return const [];
    return value
        .whereType<Map>()
        .map((entry) => Map<String, dynamic>.from(entry))
        .toList();
  }

  static int? _asInt(Object? value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    return int.tryParse(value?.toString() ?? '');
  }

  static bool? _asBool(Object? value) {
    if (value is bool) return value;
    if (value is String) return value.toLowerCase() == 'true';
    return null;
  }
}
