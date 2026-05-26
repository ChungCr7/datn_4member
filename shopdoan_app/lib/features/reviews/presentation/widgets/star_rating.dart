import 'package:flutter/material.dart';

class StarRating extends StatelessWidget {
  const StarRating({
    super.key,
    required this.rating,
    this.size = 18,
    this.onChanged,
  });

  final num rating;
  final double size;
  final ValueChanged<int>? onChanged;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (var index = 1; index <= 5; index++)
          GestureDetector(
            onTap: onChanged == null ? null : () => onChanged!(index),
            child: Icon(
              index <= rating.round() ? Icons.star : Icons.star_border,
              color: Colors.amber.shade700,
              size: size,
            ),
          ),
      ],
    );
  }
}
