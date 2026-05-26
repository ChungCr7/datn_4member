import 'package:flutter/material.dart';

class ChatbotPage extends StatelessWidget {
  const ChatbotPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Chatbot')),
      body: const Center(
        child: Text(
          'Chatbot POST /chatbot/message se duoc hoan thien trong Phase 7.',
        ),
      ),
    );
  }
}
