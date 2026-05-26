import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../models/cart_item_model.dart';

abstract class CartLocalDataSource {
  Future<List<CartItemModel>> loadCart();

  Future<void> saveCart(List<CartItemModel> items);

  Future<void> clearCart();
}

class CartLocalDataSourceImpl implements CartLocalDataSource {
  static const _cartKey = 'shopdoan_cart';

  @override
  Future<List<CartItemModel>> loadCart() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_cartKey);
    if (raw == null || raw.isEmpty) return const [];

    final decoded = jsonDecode(raw);
    if (decoded is! List) return const [];
    return decoded
        .whereType<Map>()
        .map(
          (entry) => CartItemModel.fromJson(Map<String, dynamic>.from(entry)),
        )
        .toList();
  }

  @override
  Future<void> saveCart(List<CartItemModel> items) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _cartKey,
      jsonEncode(items.map((item) => item.toJson()).toList()),
    );
  }

  @override
  Future<void> clearCart() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_cartKey);
  }
}
