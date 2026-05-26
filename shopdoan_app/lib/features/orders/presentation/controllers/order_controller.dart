import 'package:get/get.dart';

import '../../../../core/routes/app_routes.dart';
import '../../../auth/presentation/controllers/auth_controller.dart';
import '../../../cart/presentation/controllers/cart_controller.dart';
import '../../domain/entities/order_entity.dart';
import '../../domain/repositories/order_repository.dart';

class OrderController extends GetxController {
  OrderController(this._orderRepository);

  final OrderRepository _orderRepository;

  final RxBool isLoading = false.obs;
  final RxBool isCreating = false.obs;
  final RxList<OrderEntity> orders = <OrderEntity>[].obs;
  final Rxn<OrderEntity> selectedOrder = Rxn<OrderEntity>();

  Future<OrderEntity?> createOrder({
    required String customerName,
    required String phone,
    required String address,
    String? note,
  }) async {
    if (isCreating.value) return null;
    final cartController = Get.find<CartController>();
    final isValid = await cartController.validateCartBeforeCheckout();
    if (!isValid) return null;

    isCreating.value = true;
    try {
      final order = await _orderRepository.createOrder(
        customerName: customerName,
        phone: phone,
        address: address,
        note: note,
        cartItems: cartController.items,
      );
      selectedOrder.value = order;
      await cartController.clear();
      await loadMyOrders(showError: false);
      Get.offNamed(AppRoutes.orderSuccess, arguments: {'orderId': order.id});
      return order;
    } catch (error) {
      Get.snackbar(
        'Loi',
        error.toString(),
        snackPosition: SnackPosition.BOTTOM,
      );
      return null;
    } finally {
      isCreating.value = false;
    }
  }

  Future<void> loadMyOrders({bool showError = true}) async {
    if (isLoading.value) return;
    isLoading.value = true;
    try {
      final authController = Get.find<AuthController>();
      if (authController.currentUser.value?.id == null) {
        await authController.loadProfile(showError: showError);
      }
      final userId = authController.currentUser.value?.id;
      if (userId == null) {
        if (showError) {
          Get.snackbar(
            'Can dang nhap',
            'Vui long dang nhap de xem don hang.',
            snackPosition: SnackPosition.BOTTOM,
          );
        }
        return;
      }
      orders.assignAll(await _orderRepository.getUserOrders(userId));
    } catch (error) {
      if (showError) {
        Get.snackbar(
          'Loi',
          error.toString(),
          snackPosition: SnackPosition.BOTTOM,
        );
      }
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> openOrderDetail(OrderEntity order) async {
    selectedOrder.value = order;
    Get.toNamed(AppRoutes.orderDetail, arguments: {'id': order.id});
    await loadOrderDetail(order.id);
  }

  Future<void> loadOrderDetail(int id) async {
    isLoading.value = true;
    try {
      selectedOrder.value = await _orderRepository.getOrderById(id);
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

  Future<void> cancelSelectedOrder() async {
    final order = selectedOrder.value;
    if (order == null) return;
    isLoading.value = true;
    try {
      selectedOrder.value = await _orderRepository.cancelOrder(order.id);
      await loadMyOrders(showError: false);
      Get.snackbar(
        'Don hang',
        'Da huy don #${order.id}',
        snackPosition: SnackPosition.BOTTOM,
      );
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
}
