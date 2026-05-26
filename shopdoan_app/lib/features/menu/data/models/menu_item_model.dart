import '../../domain/entities/menu_item_entity.dart';

class MenuItemModel extends MenuItemEntity {
  const MenuItemModel({
    required super.id,
    required super.title,
    required super.basePrice,
    super.menuId,
    super.menuTitle,
    super.description,
    super.image,
    super.isAvailable,
    super.options,
  });

  factory MenuItemModel.fromJson(Map<String, dynamic> json) {
    final menu = _asMap(json['menu']);
    return MenuItemModel(
      id: _asInt(json['id']) ?? 0,
      menuId: _asInt(json['menuId'] ?? menu?['id']),
      title: (json['title'] ?? json['name'] ?? 'Mon an').toString(),
      description: json['description']?.toString(),
      basePrice: _asNum(json['basePrice'] ?? json['price']) ?? 0,
      image: json['image']?.toString(),
      isAvailable: _asBool(json['isAvailable']) ?? true,
      menuTitle: menu?['title']?.toString(),
      options: _asList(
        json['options'],
      ).map((value) => MenuItemOptionModel.fromJson(value)).toList(),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'menuId': menuId,
    'title': title,
    'description': description,
    'basePrice': basePrice,
    'image': image,
    'isAvailable': isAvailable,
    'menuTitle': menuTitle,
    'options': options
        .whereType<MenuItemOptionModel>()
        .map((option) => option.toJson())
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

  static num? _asNum(Object? value) {
    if (value is num) return value;
    return num.tryParse(value?.toString() ?? '');
  }

  static bool? _asBool(Object? value) {
    if (value is bool) return value;
    if (value is String) return value.toLowerCase() == 'true';
    return null;
  }
}

class MenuItemOptionModel extends MenuItemOptionEntity {
  const MenuItemOptionModel({
    required super.id,
    required super.title,
    required super.additionalPrice,
    super.description,
    super.isAvailable,
  });

  factory MenuItemOptionModel.fromJson(Map<String, dynamic> json) {
    return MenuItemOptionModel(
      id: _asInt(json['id']) ?? 0,
      title: (json['title'] ?? json['name'] ?? 'Tuy chon').toString(),
      additionalPrice: _asNum(json['additionalPrice'] ?? json['price']) ?? 0,
      description: (json['optionalDescription'] ?? json['description'])
          ?.toString(),
      isAvailable: _asBool(json['isAvailable']) ?? true,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'title': title,
    'additionalPrice': additionalPrice,
    'optionalDescription': description,
    'isAvailable': isAvailable,
  };

  static int? _asInt(Object? value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    return int.tryParse(value?.toString() ?? '');
  }

  static num? _asNum(Object? value) {
    if (value is num) return value;
    return num.tryParse(value?.toString() ?? '');
  }

  static bool? _asBool(Object? value) {
    if (value is bool) return value;
    if (value is String) return value.toLowerCase() == 'true';
    return null;
  }
}
