import 'package:get/get.dart';

import '../../../../core/routes/app_routes.dart';
import '../../../menu/domain/entities/menu_item_entity.dart';
import '../../domain/entities/cart_item_entity.dart';
import '../../domain/repositories/cart_repository.dart';

class CartController extends GetxController {
  CartController(this._cartRepository);

  final CartRepository _cartRepository;

  final RxBool isLoading = false.obs;
  final RxBool isValidating = false.obs;
  final RxList<CartItemEntity> items = <CartItemEntity>[].obs;

  int get totalQuantity => items.fold(0, (sum, item) => sum + item.quantity);
  num get totalPrice => items.fold<num>(0, (sum, item) => sum + item.total);
  bool get isEmpty => items.isEmpty;

  @override
  void onInit() {
    super.onInit();
    loadCart();
  }

  Future<void> loadCart() async {
    isLoading.value = true;
    try {
      items.assignAll(await _cartRepository.loadCart());
    } catch (error) {
      Get.snackbar(
        'Loi',
        error.toString(),
        snackPosition: SnackPosition.BOTTOM,
      );
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> addMenuItem({
    required MenuItemEntity item,
    MenuItemOptionEntity? option,
    int quantity = 1,
    String? note,
  }) async {
    if (isValidating.value) return;
    isValidating.value = true;
    try {
      final validated = await _cartRepository.validateItem(
        menuItemId: item.id,
        menuItemOptionId: option?.id,
        quantity: quantity,
        note: note,
      );
      _upsertItem(validated);
      await _persist();
      Get.snackbar(
        'Gio hang',
        'Da them ${validated.name}',
        snackPosition: SnackPosition.BOTTOM,
      );
    } catch (error) {
      Get.snackbar(
        'Loi',
        error.toString(),
        snackPosition: SnackPosition.BOTTOM,
      );
    } finally {
      isValidating.value = false;
    }
  }

  Future<void> increase(String key) async {
    final index = items.indexWhere((item) => item.key == key);
    if (index < 0) return;
    items[index] = items[index].copyWith(quantity: items[index].quantity + 1);
    await _persist();
  }

  Future<void> decrease(String key) async {
    final index = items.indexWhere((item) => item.key == key);
    if (index < 0) return;
    final current = items[index];
    if (current.quantity <= 1) {
      items.removeAt(index);
    } else {
      items[index] = current.copyWith(quantity: current.quantity - 1);
    }
    await _persist();
  }

  Future<void> remove(String key) async {
    items.removeWhere((item) => item.key == key);
    await _persist();
  }

  Future<void> clear() async {
    items.clear();
    await _cartRepository.clearCart();
  }

  Future<bool> validateCartBeforeCheckout() async {
    if (items.isEmpty) {
      Get.snackbar(
        'Gio hang',
        'Gio hang dang trong.',
        snackPosition: SnackPosition.BOTTOM,
      );
      return false;
    }

    isValidating.value = true;
    try {
      final validatedItems = <CartItemEntity>[];
      for (final item in items) {
        validatedItems.add(
          await _cartRepository.validateItem(
            menuItemId: item.menuItemId,
            menuItemOptionId: item.menuItemOptionId,
            quantity: item.quantity,
            note: item.note,
          ),
        );
      }
      items.assignAll(validatedItems);
      await _persist();
      return true;
    } catch (error) {
      Get.snackbar(
        'Gio hang can cap nhat',
        error.toString(),
        snackPosition: SnackPosition.BOTTOM,
      );
      return false;
    } finally {
      isValidating.value = false;
    }
  }

  Future<void> goToCheckout() async {
    final isValid = await validateCartBeforeCheckout();
    if (isValid) Get.toNamed(AppRoutes.checkout);
  }

  void _upsertItem(CartItemEntity item) {
    final index = items.indexWhere((entry) => entry.key == item.key);
    if (index < 0) {
      items.add(item);
      return;
    }
    final current = items[index];
    items[index] = item.copyWith(quantity: current.quantity + item.quantity);
  }

  Future<void> _persist() => _cartRepository.saveCart(items);
}
