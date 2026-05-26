import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../../core/widgets/price_text.dart';
import '../../../cart/presentation/controllers/cart_controller.dart';
import '../../../cart/presentation/widgets/quantity_stepper.dart';
import '../../../reviews/presentation/widgets/review_list_widget.dart';
import '../../domain/entities/menu_item_entity.dart';
import '../controllers/menu_controller.dart';
import '../widgets/food_image.dart';

class MenuDetailPage extends StatefulWidget {
  const MenuDetailPage({super.key});

  @override
  State<MenuDetailPage> createState() => _MenuDetailPageState();
}

class _MenuDetailPageState extends State<MenuDetailPage> {
  final _noteController = TextEditingController();
  MenuItemOptionEntity? _selectedOption;
  int _quantity = 1;

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final menuController = Get.find<FoodMenuController>();
    final cartController = Get.find<CartController>();
    final args = Get.arguments;
    final id = args is Map ? int.tryParse(args['id']?.toString() ?? '') : null;
    if (id != null && menuController.selectedItem.value?.id != id) {
      menuController.loadItemDetail(id);
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Chi tiet mon')),
      body: Obx(() {
        final item = menuController.selectedItem.value;
        if (menuController.isDetailLoading.value && item == null) {
          return const Center(child: CircularProgressIndicator());
        }
        if (item == null) {
          return const Center(child: Text('Khong tim thay mon an.'));
        }

        final itemOptions = item.options
            .where((option) => option.isAvailable)
            .toList(growable: false);
        if (_selectedOption != null &&
            !itemOptions.any((option) => option.id == _selectedOption!.id)) {
          _selectedOption = null;
        }
        final unitPrice =
            item.basePrice + (_selectedOption?.additionalPrice ?? 0);

        return ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 140),
          children: [
            FoodImage(url: item.image, width: double.infinity, height: 240),
            const SizedBox(height: 18),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Text(
                    item.title,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
                PriceText(
                  unitPrice,
                  style: Theme.of(
                    context,
                  ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
                ),
              ],
            ),
            if (item.menuTitle?.isNotEmpty == true) ...[
              const SizedBox(height: 6),
              Text(
                item.menuTitle!,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.primary,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
            const SizedBox(height: 12),
            Text(
              item.description?.isNotEmpty == true
                  ? item.description!
                  : 'Mon ngon dang cho ban thuong thuc.',
              style: Theme.of(context).textTheme.bodyLarge,
            ),
            if (itemOptions.isNotEmpty) ...[
              const SizedBox(height: 20),
              Text(
                'Tuy chon',
                style: Theme.of(
                  context,
                ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 10),
              ChoiceChip(
                selected: _selectedOption == null,
                onSelected: (_) => setState(() => _selectedOption = null),
                label: const Text('Mac dinh'),
                avatar: const Icon(Icons.check, size: 18),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final option in itemOptions)
                    ChoiceChip(
                      selected: _selectedOption?.id == option.id,
                      onSelected: (_) =>
                          setState(() => _selectedOption = option),
                      label: Text(option.title),
                      avatar: option.additionalPrice > 0
                          ? const Icon(Icons.add, size: 18)
                          : null,
                    ),
                ],
              ),
            ],
            const SizedBox(height: 20),
            TextField(
              controller: _noteController,
              minLines: 1,
              maxLines: 3,
              decoration: const InputDecoration(
                prefixIcon: Icon(Icons.notes_outlined),
                labelText: 'Ghi chu mon an',
                hintText: 'Vi du: it cay, khong hanh...',
              ),
            ),
            const SizedBox(height: 24),
            ReviewListWidget(menuItemId: item.id, menuItemTitle: item.title),
          ],
        );
      }),
      bottomNavigationBar: Obx(() {
        final item = menuController.selectedItem.value;
        if (item == null) return const SizedBox.shrink();
        final unitPrice =
            item.basePrice + (_selectedOption?.additionalPrice ?? 0);

        return SafeArea(
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surface,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.08),
                  blurRadius: 18,
                  offset: const Offset(0, -6),
                ),
              ],
            ),
            child: Row(
              children: [
                QuantityStepper(
                  value: _quantity,
                  min: 1,
                  onDecrease: () {
                    if (_quantity <= 1) return;
                    setState(() => _quantity--);
                  },
                  onIncrease: () => setState(() => _quantity++),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: FilledButton.icon(
                    onPressed:
                        cartController.isValidating.value || !item.isAvailable
                        ? null
                        : () => cartController.addMenuItem(
                            item: item,
                            option: _selectedOption,
                            quantity: _quantity,
                            note: _noteController.text,
                          ),
                    icon: cartController.isValidating.value
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.add_shopping_cart),
                    label: Text('Them - ${_lineTotal(unitPrice)}'),
                  ),
                ),
              ],
            ),
          ),
        );
      }),
    );
  }

  String _lineTotal(num unitPrice) {
    final total = unitPrice * _quantity;
    return '${total.toStringAsFixed(0)} VNĐ';
  }
}
