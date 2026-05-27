class MenuItemEntity {
  const MenuItemEntity({
    required this.id,
    required this.title,
    required this.basePrice,
    this.menuId,
    this.menuTitle,
    this.slug,
    this.description,
    this.image,
    this.isAvailable = true,
    this.stock = 0,
    this.soldCount = 0,
    this.ratingAverage = 0,
    this.ratingCount = 0,
    this.sellerName,
    this.sellerId,
    this.options = const [],
  });

  final int id;
  final int? menuId;
  final String title;
  final String? slug;
  final String? description;
  final num basePrice;
  final String? image;
  final bool isAvailable;
  final int stock;
  final int soldCount;
  final num ratingAverage;
  final int ratingCount;
  final String? menuTitle;
  final String? sellerName;
  final int? sellerId;
  final List<MenuItemOptionEntity> options;
}

class MenuItemOptionEntity {
  const MenuItemOptionEntity({
    required this.id,
    required this.title,
    required this.additionalPrice,
    this.description,
    this.isAvailable = true,
  });

  final int id;
  final String title;
  final num additionalPrice;
  final String? description;
  final bool isAvailable;
}
