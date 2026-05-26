import 'dart:async';

import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../../core/routes/app_routes.dart';
import '../../domain/entities/menu_entity.dart';
import '../../domain/entities/menu_item_entity.dart';
import '../../domain/repositories/menu_repository.dart';

class FoodMenuController extends GetxController {
  FoodMenuController(this._menuRepository);

  final MenuRepository _menuRepository;

  final searchController = TextEditingController();
  final RxBool isLoading = false.obs;
  final RxBool isDetailLoading = false.obs;
  final RxString errorMessage = ''.obs;
  final RxString searchText = ''.obs;
  final RxList<MenuEntity> menus = <MenuEntity>[].obs;
  final RxList<MenuItemEntity> items = <MenuItemEntity>[].obs;
  final RxnInt selectedMenuId = RxnInt();
  final Rxn<MenuItemEntity> selectedItem = Rxn<MenuItemEntity>();

  Timer? _searchDebounce;

  List<MenuItemEntity> get featuredItems => items.take(6).toList();

  MenuEntity? get selectedMenu {
    final id = selectedMenuId.value;
    if (id == null) return null;
    return menus.firstWhereOrNull((menu) => menu.id == id);
  }

  @override
  void onInit() {
    super.onInit();
    loadInitial();
  }

  @override
  void onClose() {
    _searchDebounce?.cancel();
    searchController.dispose();
    super.onClose();
  }

  Future<void> loadInitial() async {
    await Future.wait([loadMenus(), loadItems()]);
  }

  Future<void> refreshAll() async {
    await loadInitial();
  }

  Future<void> loadMenus() async {
    try {
      menus.assignAll(await _menuRepository.getMenus());
    } catch (error) {
      errorMessage.value = error.toString();
    }
  }

  Future<void> loadItems() async {
    if (isLoading.value) return;
    isLoading.value = true;
    errorMessage.value = '';
    try {
      final result = await _menuRepository.getMenuItems(
        menuId: selectedMenuId.value,
        search: searchText.value,
      );
      items.assignAll(result);
    } catch (error) {
      errorMessage.value = error.toString();
    } finally {
      isLoading.value = false;
    }
  }

  void selectMenu(int? menuId) {
    selectedMenuId.value = menuId;
    loadItems();
  }

  void onSearchChanged(String value) {
    searchText.value = value;
    _searchDebounce?.cancel();
    _searchDebounce = Timer(const Duration(milliseconds: 450), loadItems);
  }

  void clearSearch() {
    searchController.clear();
    onSearchChanged('');
  }

  Future<void> openDetail(MenuItemEntity item) async {
    selectedItem.value = item;
    Get.toNamed(AppRoutes.menuDetail, arguments: {'id': item.id});
    await loadItemDetail(item.id);
  }

  Future<void> loadItemDetail(int id) async {
    isDetailLoading.value = true;
    try {
      selectedItem.value = await _menuRepository.getMenuItemById(id);
    } catch (error) {
      Get.snackbar(
        'Loi',
        error.toString(),
        snackPosition: SnackPosition.BOTTOM,
      );
    } finally {
      isDetailLoading.value = false;
    }
  }
}
