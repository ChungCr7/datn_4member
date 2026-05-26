import 'package:flutter/material.dart';

import '../../shared/utils/money_formatter.dart';

class PriceText extends StatelessWidget {
  const PriceText(this.value, {super.key, this.style});

  final num value;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) {
    return Text(
      MoneyFormatter.vnd(value),
      style: style ?? const TextStyle(fontWeight: FontWeight.w800),
    );
  }
}
