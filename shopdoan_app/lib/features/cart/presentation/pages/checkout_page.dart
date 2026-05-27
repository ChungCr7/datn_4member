import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../../core/routes/app_routes.dart';
import '../../../../core/widgets/app_button.dart';
import '../../../../core/widgets/app_text_field.dart';
import '../../../../core/widgets/price_text.dart';
import '../../../../shared/utils/validators.dart';
import '../../../auth/presentation/controllers/auth_controller.dart';
import '../../../orders/presentation/controllers/order_controller.dart';
import '../controllers/cart_controller.dart';

class CheckoutPage extends StatefulWidget {
  const CheckoutPage({super.key});

  @override
  State<CheckoutPage> createState() => _CheckoutPageState();
}

class _CheckoutPageState extends State<CheckoutPage> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _addressController = TextEditingController();
  final _noteController = TextEditingController();

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _addressController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    final authController = Get.find<AuthController>();
    authController.loadProfile().then((_) {
      if (!mounted) return;
      final user = authController.currentUser.value;
      _nameController.text = user?.name ?? '';
      _phoneController.text = user?.phone ?? '';
      _addressController.text = user?.address ?? '';
    });
  }

  @override
  Widget build(BuildContext context) {
    final cartController = Get.find<CartController>();
    final orderController = Get.find<OrderController>();

    return Scaffold(
      appBar: AppBar(title: const Text('Thanh toán')),
      body: Obx(() {
        if (cartController.items.isEmpty) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: AppButton(
                label: 'Quay lại mua sắm',
                icon: Icons.storefront_outlined,
                onPressed: () => Get.offAllNamed(AppRoutes.main),
              ),
            ),
          );
        }

        return Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
            children: [
              AppTextField(
                controller: _nameController,
                label: 'Tên người nhận',
                prefixIcon: Icons.person_outline,
                validator: (value) => Validators.required(
                  value,
                  message: 'Vui lòng nhập tên người nhận',
                ),
              ),
              const SizedBox(height: 12),
              AppTextField(
                controller: _phoneController,
                label: 'Số điện thoại',
                prefixIcon: Icons.phone_outlined,
                keyboardType: TextInputType.phone,
                validator: Validators.phone,
              ),
              const SizedBox(height: 12),
              AppTextField(
                controller: _addressController,
                label: 'Địa chỉ giao hàng',
                prefixIcon: Icons.location_on_outlined,
                maxLines: 2,
                validator: (value) => Validators.required(
                  value,
                  message: 'Vui lòng nhập địa chỉ giao hàng',
                ),
              ),
              const SizedBox(height: 12),
              AppTextField(
                controller: _noteController,
                label: 'Ghi chú đơn hàng',
                prefixIcon: Icons.notes_outlined,
                maxLines: 3,
              ),
              const SizedBox(height: 18),
              Text(
                'Tóm tắt đơn hàng',
                style: Theme.of(
                  context,
                ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 8),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    children: [
                      for (final item in cartController.items)
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 6),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                child: Text('${item.quantity}x ${item.name}'),
                              ),
                              PriceText(item.total),
                            ],
                          ),
                        ),
                      const Divider(),
                      Row(
                        children: [
                          const Expanded(
                            child: Text(
                              'Tổng cộng',
                              style: TextStyle(fontWeight: FontWeight.w900),
                            ),
                          ),
                          PriceText(cartController.totalPrice),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      }),
      bottomNavigationBar: Obx(() {
        if (cartController.items.isEmpty) return const SizedBox.shrink();

        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: AppButton(
              label: 'Xác nhận COD',
              icon: Icons.check_circle_outline,
              isLoading:
                  cartController.isValidating.value ||
                  orderController.isCreating.value,
              onPressed: () async {
                if (!_formKey.currentState!.validate()) return;
                await orderController.createOrder(
                  customerName: _nameController.text,
                  phone: _phoneController.text,
                  address: _addressController.text,
                  note: _noteController.text,
                );
              },
            ),
          ),
        );
      }),
    );
  }
}
