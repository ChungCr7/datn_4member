import 'package:flutter_test/flutter_test.dart';
import 'package:shopdoan_app/app.dart';

void main() {
  testWidgets('ShopDoAn app renders splash screen', (tester) async {
    await tester.pumpWidget(const ShopDoAnApp());
    await tester.pump(const Duration(milliseconds: 800));
    await tester.pump();

    expect(find.text('ShopDoAn'), findsOneWidget);
  });
}
