class AppNotification {
  const AppNotification({
    required this.id,
    required this.title,
    required this.message,
    required this.type,
    required this.createdAt,
    this.actionUrl,
    this.readAt,
  });

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    return AppNotification(
      id: _asInt(json['id']) ?? 0,
      title: json['title']?.toString() ?? 'Thông báo',
      message: json['message']?.toString() ?? '',
      type: json['type']?.toString() ?? 'system',
      actionUrl: json['actionUrl']?.toString(),
      readAt: DateTime.tryParse(json['readAt']?.toString() ?? ''),
      createdAt:
          DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
          DateTime.now(),
    );
  }

  final int id;
  final String title;
  final String message;
  final String type;
  final String? actionUrl;
  final DateTime? readAt;
  final DateTime createdAt;

  bool get isRead => readAt != null;

  static int? _asInt(Object? value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    return int.tryParse(value?.toString() ?? '');
  }
}
