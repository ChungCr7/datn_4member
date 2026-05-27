import 'package:get/get.dart';

import '../../../../core/network/dio_client.dart';
import '../../data/models/notification_model.dart';

class NotificationController extends GetxController {
  NotificationController(this._dioClient);

  final DioClient _dioClient;

  final RxBool isLoading = false.obs;
  final RxString errorMessage = ''.obs;
  final RxInt unreadCount = 0.obs;
  final RxList<AppNotification> notifications = <AppNotification>[].obs;

  @override
  void onInit() {
    super.onInit();
    refreshAll(showError: false);
  }

  Future<void> refreshAll({bool showError = true}) async {
    await Future.wait([
      loadNotifications(showError: showError),
      loadUnreadCount(),
    ]);
  }

  Future<void> loadNotifications({bool showError = true}) async {
    if (isLoading.value) return;
    isLoading.value = true;
    errorMessage.value = '';
    try {
      final response = await _dioClient.get<dynamic>(
        '/notifications',
        queryParameters: {'page': 1, 'limit': 50},
      );
      final data = _unwrap(response.data);
      unreadCount.value = _asInt(data?['unreadCount']) ?? unreadCount.value;
      notifications.assignAll(
        _asList(data?['notifications']).map(AppNotification.fromJson),
      );
    } catch (error) {
      errorMessage.value = error.toString();
      if (showError) {
        Get.snackbar(
          'Lỗi',
          error.toString(),
          snackPosition: SnackPosition.BOTTOM,
        );
      }
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> loadUnreadCount() async {
    try {
      final response = await _dioClient.get<dynamic>(
        '/notifications/unread-count',
      );
      final data = _unwrap(response.data);
      unreadCount.value = _asInt(data?['count']) ?? 0;
    } catch (_) {
      unreadCount.value = 0;
    }
  }

  Future<void> markRead(AppNotification notification) async {
    if (notification.isRead) return;
    try {
      await _dioClient.patch<dynamic>('/notifications/${notification.id}/read');
      await refreshAll(showError: false);
    } catch (error) {
      Get.snackbar(
        'Lỗi',
        error.toString(),
        snackPosition: SnackPosition.BOTTOM,
      );
    }
  }

  Future<void> markAllRead() async {
    try {
      await _dioClient.patch<dynamic>('/notifications/read-all');
      await refreshAll(showError: false);
    } catch (error) {
      Get.snackbar(
        'Lỗi',
        error.toString(),
        snackPosition: SnackPosition.BOTTOM,
      );
    }
  }

  Future<void> remove(AppNotification notification) async {
    notifications.removeWhere((item) => item.id == notification.id);
    try {
      await _dioClient.delete<dynamic>('/notifications/${notification.id}');
      await loadUnreadCount();
    } catch (error) {
      await refreshAll(showError: false);
      Get.snackbar(
        'Lỗi',
        error.toString(),
        snackPosition: SnackPosition.BOTTOM,
      );
    }
  }

  static Map<String, dynamic>? _unwrap(Object? value) {
    final body = _asMap(value);
    final data = _asMap(body?['data']);
    return data ?? body;
  }

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
}
