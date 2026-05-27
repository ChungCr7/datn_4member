import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../../core/network/api_exception.dart';
import '../../../../core/network/dio_client.dart';

class ChatbotPage extends StatefulWidget {
  const ChatbotPage({super.key});

  @override
  State<ChatbotPage> createState() => _ChatbotPageState();
}

class _ChatbotPageState extends State<ChatbotPage> {
  final _dioClient = Get.find<DioClient>();
  final _messageController = TextEditingController();
  final _scrollController = ScrollController();
  final List<_ChatMessage> _messages = [
    _ChatMessage(
      role: _ChatRole.bot,
      text:
          'Chào bạn! Mình là trợ lý mua sắm ShopDoan. Mình có thể hiểu ngữ cảnh, nhớ sở thích, tìm sản phẩm, kiểm tra đơn hàng và hướng dẫn thanh toán.',
      quickReplies: const [
        'Gợi ý sản phẩm dưới 500k',
        'Sản phẩm bán chạy',
        'Đơn hàng của tôi ở đâu?',
        'Cách đăng ký bán hàng',
      ],
    ),
  ];

  bool _isSending = false;
  int? _conversationId;
  String _aiLabel = 'adaptive_internal';

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _sendMessage([String? preset]) async {
    final text = (preset ?? _messageController.text).trim();
    if (text.isEmpty || _isSending) return;

    setState(() {
      _messages.add(_ChatMessage(role: _ChatRole.user, text: text));
      _messageController.clear();
      _isSending = true;
    });
    _scrollToBottom();

    try {
      final response = await _dioClient.post<dynamic>(
        '/chatbot/message',
        data: {
          'message': text,
          if (_conversationId != null) 'sessionId': _conversationId,
        },
      );
      final payload = _asMap(response.data);
      final data = _asMap(payload?['data']) ?? payload;
      final ai = _asMap(data?['ai']);
      final quickReplies = _asStringList(data?['quickReplies']);
      final products = _asProductCards(
        data?['products'] ?? data?['suggestions'],
      );

      setState(() {
        _conversationId = _asInt(data?['conversationId']) ?? _conversationId;
        _aiLabel = _formatAi(ai) ?? _aiLabel;
        _messages.add(
          _ChatMessage(
            role: _ChatRole.bot,
            text:
                data?['response']?.toString() ??
                'Mình chưa xử lý được yêu cầu này.',
            quickReplies: quickReplies,
            products: products,
          ),
        );
      });
    } on ApiException catch (error) {
      setState(() {
        _messages.add(
          _ChatMessage(
            role: _ChatRole.bot,
            text: error.message,
            quickReplies: const [
              'Thử lại',
              'Tìm sản phẩm bán chạy',
              'Hướng dẫn thanh toán',
            ],
          ),
        );
      });
    } catch (_) {
      setState(() {
        _messages.add(
          _ChatMessage(
            role: _ChatRole.bot,
            text: 'Mình chưa kết nối được tới trợ lý. Bạn thử lại nhé.',
            quickReplies: const [
              'Thử lại',
              'Tìm sản phẩm bán chạy',
              'Hướng dẫn thanh toán',
            ],
          ),
        );
      });
    } finally {
      if (mounted) {
        setState(() => _isSending = false);
        _scrollToBottom();
      }
    }
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
    return Scaffold(
      appBar: AppBar(
        title: const Text('Trợ lý AI ShopDoan'),
        actions: [
          Center(
            child: Padding(
              padding: const EdgeInsets.only(right: 12),
              child: Text(
                _aiLabel,
                style: Theme.of(context).textTheme.labelSmall,
              ),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length + (_isSending ? 1 : 0),
              itemBuilder: (context, index) {
                if (_isSending && index == _messages.length) {
                  return const _TypingBubble();
                }
                final message = _messages[index];
                return _MessageBubble(
                  message: message,
                  onQuickReply: _sendMessage,
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
                        hintText: 'Ví dụ: tìm tai nghe bluetooth dưới 500k',
                        border: OutlineInputBorder(),
                        isDense: true,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    onPressed: _isSending ? null : () => _sendMessage(),
                    icon: const Icon(Icons.send_rounded),
                    tooltip: 'Gửi',
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

  static int? _asInt(Object? value) {
    if (value is int) return value;
    return int.tryParse(value?.toString() ?? '');
  }

  static List<String> _asStringList(Object? value) {
    if (value is! List) return const [];
    return value.map((item) => item.toString()).toList();
  }

  static List<_ProductCardData> _asProductCards(Object? value) {
    if (value is! List) return const [];
    return value
        .map(_asMap)
        .whereType<Map<String, dynamic>>()
        .map(
          (product) => _ProductCardData(
            name: product['name']?.toString() ?? 'Sản phẩm',
            price:
                _asNumber(product['salePrice']) ?? _asNumber(product['price']),
            reason: product['reason']?.toString(),
          ),
        )
        .toList();
  }

  static num? _asNumber(Object? value) {
    if (value is num) return value;
    return num.tryParse(value?.toString() ?? '');
  }

  static String? _formatAi(Map<String, dynamic>? ai) {
    final provider = ai?['provider']?.toString();
    final model = ai?['model']?.toString();
    if (provider == null || provider.isEmpty) return null;
    if (model == null || model.isEmpty) return provider;
    return '$provider:$model';
  }
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({required this.message, required this.onQuickReply});

  final _ChatMessage message;
  final ValueChanged<String> onQuickReply;

  @override
  Widget build(BuildContext context) {
    final isBot = message.role == _ChatRole.bot;
    final colorScheme = Theme.of(context).colorScheme;

    return Align(
      alignment: isBot ? Alignment.centerLeft : Alignment.centerRight,
      child: Container(
        width: MediaQuery.sizeOf(context).width * 0.82,
        margin: const EdgeInsets.only(bottom: 12),
        child: Column(
          crossAxisAlignment: isBot
              ? CrossAxisAlignment.start
              : CrossAxisAlignment.end,
          children: [
            DecoratedBox(
              decoration: BoxDecoration(
                color: isBot
                    ? colorScheme.surfaceContainerHighest
                    : colorScheme.primary,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Text(
                  message.text,
                  style: TextStyle(
                    color: isBot
                        ? colorScheme.onSurface
                        : colorScheme.onPrimary,
                    height: 1.35,
                  ),
                ),
              ),
            ),
            if (message.products.isNotEmpty) ...[
              const SizedBox(height: 8),
              ...message.products
                  .take(4)
                  .map((product) => _ProductCard(product)),
            ],
            if (isBot && message.quickReplies.isNotEmpty) ...[
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: message.quickReplies.take(4).map((reply) {
                  return ActionChip(
                    label: Text(reply),
                    onPressed: () => onQuickReply(reply),
                  );
                }).toList(),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _ProductCard extends StatelessWidget {
  const _ProductCard(this.product);

  final _ProductCardData product;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        dense: true,
        leading: const Icon(Icons.shopping_bag_outlined),
        title: Text(product.name),
        subtitle: Text(product.reason ?? 'Gợi ý phù hợp'),
        trailing: product.price == null
            ? null
            : Text('${product.price!.toStringAsFixed(0)}đ'),
      ),
    );
  }
}

class _TypingBubble extends StatelessWidget {
  const _TypingBubble();

  @override
  Widget build(BuildContext context) {
    return const Align(
      alignment: Alignment.centerLeft,
      child: Padding(
        padding: EdgeInsets.only(bottom: 12),
        child: Chip(
          avatar: SizedBox(
            height: 16,
            width: 16,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
          label: Text('Đang đọc ngữ cảnh...'),
        ),
      ),
    );
  }
}

enum _ChatRole { user, bot }

class _ChatMessage {
  _ChatMessage({
    required this.role,
    required this.text,
    this.quickReplies = const [],
    this.products = const [],
  });

  final _ChatRole role;
  final String text;
  final List<String> quickReplies;
  final List<_ProductCardData> products;
}

class _ProductCardData {
  const _ProductCardData({required this.name, this.price, this.reason});

  final String name;
  final num? price;
  final String? reason;
}
