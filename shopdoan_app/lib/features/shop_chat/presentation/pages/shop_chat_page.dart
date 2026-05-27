import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../../core/network/dio_client.dart';
import '../../../../core/routes/app_routes.dart';
import '../../../auth/presentation/controllers/auth_controller.dart';

class ShopChatPage extends StatefulWidget {
  const ShopChatPage({super.key});

  @override
  State<ShopChatPage> createState() => _ShopChatPageState();
}

class _ShopChatPageState extends State<ShopChatPage> {
  final _dioClient = Get.find<DioClient>();
  final _messageController = TextEditingController();
  final _scrollController = ScrollController();
  final List<_ShopMessage> _messages = [];

  int? _sellerId;
  String _shopName = 'Shop';
  bool _isLoading = true;
  bool _isSending = false;

  @override
  void initState() {
    super.initState();
    final args = Get.arguments;
    if (args is Map) {
      _sellerId = int.tryParse(args['sellerId']?.toString() ?? '');
      _shopName = args['shopName']?.toString() ?? _shopName;
    }
    _loadConversation();
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadConversation() async {
    final authController = Get.find<AuthController>();
    if (authController.currentUser.value?.id == null) {
      await authController.loadProfile(showError: false);
    }
    if (authController.currentUser.value?.id == null) {
      Get.snackbar(
        'Cần đăng nhập',
        'Vui lòng đăng nhập để nhắn tin với shop.',
        snackPosition: SnackPosition.BOTTOM,
      );
      Get.offNamed(AppRoutes.login);
      return;
    }

    final sellerId = _sellerId;
    if (sellerId == null) {
      setState(() => _isLoading = false);
      return;
    }

    try {
      final response = await _dioClient.get<dynamic>(
        '/shop-chat/sellers/$sellerId',
      );
      _applyConversation(response.data);
    } catch (error) {
      Get.snackbar(
        'Lỗi',
        error.toString(),
        snackPosition: SnackPosition.BOTTOM,
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
      _scrollToBottom();
    }
  }

  Future<void> _sendMessage() async {
    final sellerId = _sellerId;
    final text = _messageController.text.trim();
    if (sellerId == null || text.isEmpty || _isSending) return;

    setState(() {
      _isSending = true;
      _messageController.clear();
      _messages.add(_ShopMessage(role: 'user', content: text));
    });
    _scrollToBottom();

    try {
      final response = await _dioClient.post<dynamic>(
        '/shop-chat/sellers/$sellerId/messages',
        data: {'message': text},
      );
      _applyConversation(response.data);
    } catch (error) {
      Get.snackbar(
        'Lỗi',
        error.toString(),
        snackPosition: SnackPosition.BOTTOM,
      );
    } finally {
      if (mounted) setState(() => _isSending = false);
      _scrollToBottom();
    }
  }

  void _applyConversation(Object? raw) {
    final body = _asMap(raw);
    final data = _asMap(body?['data']) ?? body;
    final conversation = _asMap(data?['conversation']);
    final shop = _asMap(conversation?['shop']);
    final messages = _asList(conversation?['messages']);

    setState(() {
      _shopName = shop?['shopName']?.toString() ?? _shopName;
      _messages
        ..clear()
        ..addAll(messages.map(_ShopMessage.fromJson));
    });
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOut,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(title: Text(_shopName)),
      body: Column(
        children: [
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.all(16),
                    itemCount: _messages.length,
                    itemBuilder: (context, index) {
                      final message = _messages[index];
                      final isMine = message.role == 'user';
                      return Align(
                        alignment: isMine
                            ? Alignment.centerRight
                            : Alignment.centerLeft,
                        child: Container(
                          constraints: BoxConstraints(
                            maxWidth: MediaQuery.sizeOf(context).width * 0.78,
                          ),
                          margin: const EdgeInsets.only(bottom: 10),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 10,
                          ),
                          decoration: BoxDecoration(
                            color: isMine
                                ? colorScheme.primary
                                : colorScheme.surfaceContainerHighest,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            message.content,
                            style: TextStyle(
                              color: isMine
                                  ? colorScheme.onPrimary
                                  : colorScheme.onSurface,
                              height: 1.35,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _messageController,
                      minLines: 1,
                      maxLines: 4,
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _sendMessage(),
                      decoration: const InputDecoration(
                        hintText: 'Nhập tin nhắn cho shop',
                        isDense: true,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    tooltip: 'Gửi',
                    onPressed: _isSending ? null : _sendMessage,
                    icon: const Icon(Icons.send_rounded),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
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
}

class _ShopMessage {
  const _ShopMessage({required this.role, required this.content});

  factory _ShopMessage.fromJson(Map<String, dynamic> json) {
    return _ShopMessage(
      role: json['senderRole']?.toString() ?? 'seller',
      content: (json['content'] ?? json['message'] ?? '').toString(),
    );
  }

  final String role;
  final String content;
}
