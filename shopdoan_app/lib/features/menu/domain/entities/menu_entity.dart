import 'menu_item_entity.dart';

class MenuEntity {
  const MenuEntity({
    required this.id,
    required this.title,
    this.description,
    this.image,
    this.isActive = true,
    this.itemCount = 0,
    this.items = const [],
  });

  final int id;
  final String title;
  final String? description;
  final String? image;
  final bool isActive;
  final int itemCount;
  final List<MenuItemEntity> items;
}
