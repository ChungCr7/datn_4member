import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../../core/widgets/app_empty.dart';
import '../../../../core/widgets/app_error.dart';
import '../../../../core/widgets/app_loading.dart';
import '../../../../shared/utils/date_formatter.dart';
import '../../data/models/notification_model.dart';
import '../controllers/notification_controller.dart';

class NotificationPage extends GetView<NotificationController> {
  const NotificationPage({super.key});

  @override
  Widget build(BuildContext context) {
    Get.find<NotificationController>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Thông báo'),
        actions: [
          Obx(
            () => TextButton(
              onPressed: controller.unreadCount.value == 0
                  ? null
                  : controller.markAllRead,
              child: const Text('Đọc hết'),
            ),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: controller.refreshAll,
        child: Obx(() {
          if (controller.isLoading.value && controller.notifications.isEmpty) {
            return const AppLoading();
          }
          if (controller.errorMessage.value.isNotEmpty &&
              controller.notifications.isEmpty) {
            return AppError(
              message: controller.errorMessage.value,
              onRetry: controller.loadNotifications,
            );
          }
          if (controller.notifications.isEmpty) {
            return const AppEmpty(
              icon: Icons.notifications_none_outlined,
              title: 'Chưa có thông báo',
              message: 'Thông báo đơn hàng, shop và hệ thống sẽ hiện ở đây.',
            );
          }

          return ListView.separated(
            padding: const EdgeInsets.all(12),
            itemCount: controller.notifications.length,
            separatorBuilder: (context, index) => const SizedBox(height: 8),
            itemBuilder: (context, index) {
              final notification = controller.notifications[index];
              return Dismissible(
                key: ValueKey(notification.id),
                direction: DismissDirection.endToStart,
                background: const _DeleteBackground(),
                onDismissed: (_) => controller.remove(notification),
                child: _NotificationTile(
                  notification: notification,
                  onTap: () => controller.markRead(notification),
                ),
              );
            },
          );
        }),
      ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  const _NotificationTile({required this.notification, required this.onTap});

  final AppNotification notification;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Card(
      color: notification.isRead
          ? colorScheme.surface
          : colorScheme.primaryContainer.withValues(alpha: 0.45),
      child: ListTile(
        onTap: onTap,
        leading: CircleAvatar(
          backgroundColor: colorScheme.primary.withValues(alpha: 0.12),
          child: Icon(_iconForType(notification.type)),
        ),
        title: Text(
          notification.title,
          style: const TextStyle(fontWeight: FontWeight.w900),
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(notification.message),
              const SizedBox(height: 4),
              Text(
                DateFormatter.dateTime(notification.createdAt),
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ),
        ),
        trailing: notification.isRead
            ? null
            : const Icon(Icons.circle, size: 10, color: Colors.deepOrange),
      ),
    );
  }

  IconData _iconForType(String type) {
    return switch (type) {
      'order' => Icons.receipt_long_outlined,
      'shop' => Icons.storefront_outlined,
      'chat' => Icons.chat_bubble_outline,
      'promotion' => Icons.local_offer_outlined,
      _ => Icons.notifications_none_outlined,
    };
  }
}

class _DeleteBackground extends StatelessWidget {
  const _DeleteBackground();

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.error,
        borderRadius: BorderRadius.circular(8),
      ),
      child: const Align(
        alignment: Alignment.centerRight,
        child: Padding(
          padding: EdgeInsets.only(right: 18),
          child: Icon(Icons.delete_outline, color: Colors.white),
        ),
      ),
    );
  }
}
