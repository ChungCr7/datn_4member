import 'package:flutter/material.dart';

import '../../../../core/widgets/price_text.dart';
import '../../domain/entities/menu_item_entity.dart';
import 'food_image.dart';

class MenuItemCard extends StatelessWidget {
  const MenuItemCard({super.key, required this.item, required this.onTap});

  final MenuItemEntity item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              FoodImage(url: item.image, width: 96, height: 96),
              const SizedBox(width: 12),
              Expanded(
                child: SizedBox(
                  height: 96,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              item.title,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                          ),
                          if (!item.isAvailable)
                            const Icon(Icons.visibility_off, size: 18),
                        ],
                      ),
                      if (item.menuTitle?.isNotEmpty == true) ...[
                        const SizedBox(height: 2),
                        Text(
                          item.menuTitle!,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                      const SizedBox(height: 4),
                      Expanded(
                        child: Text(
                          item.description?.isNotEmpty == true
                              ? item.description!
                              : 'Mon ngon dang cho ban thuong thuc.',
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                      ),
                      Row(
                        children: [
                          PriceText(item.basePrice),
                          const Spacer(),
                          Icon(
                            Icons.chevron_right,
                            color: Theme.of(context).colorScheme.primary,
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
