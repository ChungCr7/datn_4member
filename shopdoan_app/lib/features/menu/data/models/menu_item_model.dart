import '../../domain/entities/menu_item_entity.dart';

class MenuItemModel extends MenuItemEntity {
  const MenuItemModel({
    required super.id,
    required super.title,
    required super.basePrice,
    super.menuId,
    super.menuTitle,
    super.slug,
    super.description,
    super.image,
    super.isAvailable,
    super.stock,
    super.soldCount,
    super.ratingAverage,
    super.ratingCount,
    super.sellerName,
    super.sellerId,
    super.options,
  });

  factory MenuItemModel.fromJson(Map<String, dynamic> json) {
    final menu = _asMap(json['menu'] ?? json['category']);
    final seller = _asMap(json['seller']);
    final images = _asList(json['images']);
    final salePrice = _asNum(json['salePrice']);
    final price = _asNum(json['price'] ?? json['basePrice']) ?? 0;
    return MenuItemModel(
      id: _asInt(json['id']) ?? 0,
      menuId: _asInt(json['menuId'] ?? json['categoryId'] ?? menu?['id']),
      title: (json['title'] ?? json['name'] ?? 'Sản phẩm').toString(),
      slug: json['slug']?.toString(),
      description: json['description']?.toString(),
      basePrice: salePrice ?? price,
      image:
          json['image']?.toString() ??
          (images.isNotEmpty ? images.first['imageUrl']?.toString() : null),
      isAvailable:
          (_asBool(json['isAvailable']) ?? true) &&
          (json['status']?.toString().toUpperCase() != 'INACTIVE') &&
          (json['status']?.toString().toUpperCase() != 'BANNED') &&
          ((_asInt(json['stock']) ?? 1) > 0),
      stock: _asInt(json['stock']) ?? 0,
      soldCount: _asInt(json['soldCount']) ?? 0,
      ratingAverage: _asNum(json['ratingAverage'] ?? json['rating']) ?? 0,
      ratingCount: _asInt(json['ratingCount']) ?? 0,
      menuTitle: (menu?['title'] ?? menu?['name'])?.toString(),
      sellerName: seller?['shopName']?.toString(),
      sellerId: _asInt(seller?['id']),
      options: _asList(
        json['options'] ?? json['variants'],
      ).map((value) => MenuItemOptionModel.fromJson(value)).toList(),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'menuId': menuId,
    'title': title,
    'slug': slug,
    'description': description,
    'basePrice': basePrice,
    'image': image,
    'isAvailable': isAvailable,
    'stock': stock,
    'soldCount': soldCount,
    'ratingAverage': ratingAverage,
    'ratingCount': ratingCount,
    'menuTitle': menuTitle,
    'sellerName': sellerName,
    'sellerId': sellerId,
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
      title: (json['title'] ?? json['value'] ?? json['name'] ?? 'Tùy chọn')
          .toString(),
      additionalPrice:
          _asNum(json['additionalPrice'] ?? json['priceDelta']) ?? 0,
      description: (json['optionalDescription'] ?? json['description'])
          ?.toString(),
      isAvailable:
          (_asBool(json['isAvailable'] ?? json['isActive']) ?? true) &&
          ((_asInt(json['stock']) ?? 1) > 0),
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
