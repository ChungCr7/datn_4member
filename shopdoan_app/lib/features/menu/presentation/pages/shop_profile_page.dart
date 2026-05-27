import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../../core/network/dio_client.dart';
import '../../../../core/routes/app_routes.dart';
import '../../../../core/widgets/app_empty.dart';
import '../../../../core/widgets/app_error.dart';
import '../../../../core/widgets/app_loading.dart';
import '../controllers/menu_controller.dart';
import '../../data/models/menu_item_model.dart';
import '../widgets/food_image.dart';
import '../widgets/menu_item_card.dart';

class ShopProfilePage extends StatefulWidget {
  const ShopProfilePage({super.key});

  @override
  State<ShopProfilePage> createState() => _ShopProfilePageState();
}

class _ShopProfilePageState extends State<ShopProfilePage> {
  final _dioClient = Get.find<DioClient>();
  bool _isLoading = true;
  String _error = '';
  _ShopProfile? _profile;

  @override
  void initState() {
    super.initState();
    _loadShop();
  }

  Future<void> _loadShop() async {
    final sellerId = _sellerId;
    if (sellerId == null) {
      setState(() {
        _isLoading = false;
        _error = 'Không tìm thấy shop.';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _error = '';
    });

    try {
      final response = await _dioClient.get<dynamic>(
        '/sellers/public/$sellerId',
      );
      setState(() => _profile = _ShopProfile.fromJson(response.data));
    } catch (error) {
      setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  int? get _sellerId {
    final args = Get.arguments;
    if (args is! Map) return null;
    return int.tryParse(args['sellerId']?.toString() ?? '');
  }

  String? get _fallbackShopName {
    final args = Get.arguments;
    if (args is! Map) return null;
    return args['shopName']?.toString();
  }

  @override
  Widget build(BuildContext context) {
    final profile = _profile;
    return Scaffold(
      appBar: AppBar(title: Text(profile?.name ?? _fallbackShopName ?? 'Shop')),
      body: RefreshIndicator(
        onRefresh: _loadShop,
        child: Builder(
          builder: (context) {
            if (_isLoading) return const AppLoading();
            if (_error.isNotEmpty) {
              return AppError(message: _error, onRetry: _loadShop);
            }
            if (profile == null) {
              return const AppEmpty(
                icon: Icons.storefront_outlined,
                title: 'Không tìm thấy shop',
                message: 'Shop hiện chưa sẵn sàng.',
              );
            }

            return CustomScrollView(
              slivers: [
                SliverToBoxAdapter(child: _ShopHeader(profile: profile)),
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                    child: Row(
                      children: [
                        Expanded(
                          child: FilledButton.icon(
                            onPressed: () => Get.toNamed(
                              AppRoutes.shopChat,
                              arguments: {
                                'sellerId': profile.id,
                                'shopName': profile.name,
                              },
                            ),
                            icon: const Icon(Icons.chat_bubble_outline),
                            label: const Text('Nhắn tin'),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 18),
                  sliver: SliverGrid.builder(
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          mainAxisSpacing: 10,
                          crossAxisSpacing: 10,
                          mainAxisExtent: 270,
                        ),
                    itemCount: profile.products.length,
                    itemBuilder: (context, index) {
                      final item = profile.products[index];
                      return ProductGridCard(
                        item: item,
                        onTap: () {
                          Get.find<FoodMenuController>().selectedItem.value =
                              item;
                          Get.toNamed(
                            AppRoutes.menuDetail,
                            arguments: {'id': item.id},
                          );
                        },
                      );
                    },
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _ShopHeader extends StatelessWidget {
  const _ShopHeader({required this.profile});

  final _ShopProfile profile;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          height: 138,
          width: double.infinity,
          child: FoodImage(
            url: profile.banner,
            width: double.infinity,
            height: 138,
            borderRadius: 0,
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(
                radius: 30,
                backgroundColor: theme.colorScheme.primaryContainer,
                child: ClipOval(
                  child: FoodImage(
                    url: profile.logo,
                    width: 60,
                    height: 60,
                    borderRadius: 30,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      profile.name,
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(profile.description ?? 'Shop đang bán trên ShopDoan'),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _Metric(
                          label: 'Sản phẩm',
                          value: profile.activeProducts,
                        ),
                        _Metric(label: 'Đã bán', value: profile.soldCount),
                        _Metric(
                          label: 'Đánh giá',
                          value: profile.ratingAverage.toStringAsFixed(1),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric({required this.label, required this.value});

  final String label;
  final Object value;

  @override
  Widget build(BuildContext context) {
    return Chip(label: Text('$label $value'));
  }
}

class _ShopProfile {
  const _ShopProfile({
    required this.id,
    required this.name,
    required this.activeProducts,
    required this.soldCount,
    required this.ratingAverage,
    required this.products,
    this.description,
    this.logo,
    this.banner,
  });

  factory _ShopProfile.fromJson(Object? raw) {
    final body = _asMap(raw);
    final data = _asMap(body?['data']) ?? body;
    final seller = _asMap(data?['seller']) ?? const {};
    final stats = _asMap(data?['stats']) ?? const {};
    return _ShopProfile(
      id: _asInt(seller['id']) ?? 0,
      name: seller['shopName']?.toString() ?? 'Shop',
      description: seller['description']?.toString(),
      logo: seller['logo']?.toString(),
      banner: seller['banner']?.toString(),
      activeProducts: _asInt(stats['activeProducts']) ?? 0,
      soldCount: _asInt(stats['soldCount']) ?? 0,
      ratingAverage: _asNum(stats['ratingAverage']) ?? 0,
      products: _asList(
        data?['products'],
      ).map((product) => MenuItemModel.fromJson(product)).toList(),
    );
  }

  final int id;
  final String name;
  final String? description;
  final String? logo;
  final String? banner;
  final int activeProducts;
  final int soldCount;
  final num ratingAverage;
  final List<MenuItemModel> products;

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
}
