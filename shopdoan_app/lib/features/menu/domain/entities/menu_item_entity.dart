class MenuItemEntity {
  const MenuItemEntity({
    required this.id,
    required this.title,
    required this.basePrice,
    this.menuId,
    this.menuTitle,
    this.description,
    this.image,
    this.isAvailable = true,
    this.options = const [],
  });

  final int id;
  final int? menuId;
  final String title;
  final String? description;
  final num basePrice;
  final String? image;
  final bool isAvailable;
  final String? menuTitle;
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
