import 'package:flutter/material.dart';

import '../../domain/entities/menu_entity.dart';

class MenuCategoryChip extends StatelessWidget {
  const MenuCategoryChip({
    super.key,
    required this.menu,
    required this.selected,
    required this.onTap,
  });

  final MenuEntity? menu;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final title = menu?.title ?? 'Tat ca';
    final count = menu?.itemCount;

    return ChoiceChip(
      selected: selected,
      onSelected: (_) => onTap(),
      label: Text(count == null || count == 0 ? title : '$title ($count)'),
      avatar: Icon(
        menu == null ? Icons.apps_outlined : Icons.local_dining_outlined,
        size: 18,
      ),
      visualDensity: VisualDensity.compact,
    );
  }
}
