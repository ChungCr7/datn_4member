import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';

class FoodImage extends StatelessWidget {
  const FoodImage({
    super.key,
    required this.url,
    this.width,
    this.height,
    this.borderRadius = 8,
  });

  final String? url;
  final double? width;
  final double? height;
  final double borderRadius;

  @override
  Widget build(BuildContext context) {
    final imageUrl = url;
    final placeholder = _ImageFallback(
      width: width,
      height: height,
      borderRadius: borderRadius,
    );

    if (imageUrl == null || !imageUrl.startsWith('http')) {
      return placeholder;
    }

    return ClipRRect(
      borderRadius: BorderRadius.circular(borderRadius),
      child: CachedNetworkImage(
        imageUrl: imageUrl,
        width: width,
        height: height,
        fit: BoxFit.cover,
        placeholder: (context, url) => Shimmer.fromColors(
          baseColor: Colors.grey.shade300,
          highlightColor: Colors.grey.shade100,
          child: Container(width: width, height: height, color: Colors.white),
        ),
        errorWidget: (context, url, error) => placeholder,
      ),
    );
  }
}

class _ImageFallback extends StatelessWidget {
  const _ImageFallback({
    required this.width,
    required this.height,
    required this.borderRadius,
  });

  final double? width;
  final double? height;
  final double borderRadius;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(borderRadius),
      ),
      child: Icon(
        Icons.fastfood,
        color: Theme.of(context).colorScheme.primary,
        size: 34,
      ),
    );
  }
}
