import 'package:flutter/material.dart';
import '../config/app_env.dart';
import '../theme/mss_theme.dart';

/// Renders both bundled demo assets (`/images/demo/...`) and network URLs (`http(s)://...`)
/// with a festive Mid-Autumn fallback placeholder.
class MssImage extends StatelessWidget {
  final String? imageUrl;
  final double? width;
  final double? height;
  final BoxFit fit;
  final BorderRadius? borderRadius;

  const MssImage({
    super.key,
    required this.imageUrl,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
    this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    final raw = imageUrl?.trim() ?? '';
    Widget content;

    if (raw.isEmpty) {
      content = _buildFallback();
    } else if (raw.startsWith('/images/demo/')) {
      final assetPath = 'assets$raw';
      content = Image.asset(
        assetPath,
        width: width,
        height: height,
        fit: fit,
        errorBuilder: (_, __, ___) => _buildFallback(),
      );
    } else if (raw.startsWith('assets/')) {
      content = Image.asset(
        raw,
        width: width,
        height: height,
        fit: fit,
        errorBuilder: (_, __, ___) => _buildFallback(),
      );
    } else {
      final resolvedUrl = raw.startsWith('http://') || raw.startsWith('https://')
          ? raw
          : '${AppEnv.apiBaseUrl}${raw.startsWith('/') ? '' : '/'}$raw';
      content = Image.network(
        resolvedUrl,
        width: width,
        height: height,
        fit: fit,
        errorBuilder: (_, __, ___) => _buildFallback(),
      );
    }

    if (borderRadius != null) {
      return ClipRRect(
        borderRadius: borderRadius!,
        child: content,
      );
    }
    return content;
  }

  Widget _buildFallback() {
    return Container(
      width: width,
      height: height,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [MssColors.primary50, MssColors.accent100],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      alignment: Alignment.center,
      child: Icon(
        Icons.cake_outlined,
        color: MssColors.primary.withOpacity(0.65),
        size: (height != null && height! < 64) ? 22 : 34,
      ),
    );
  }
}

enum MssBadgeTone { neutral, primary, accent, success, warning, danger, info }

class MssBadge extends StatelessWidget {
  final String label;
  final MssBadgeTone tone;
  final IconData? icon;

  const MssBadge({
    super.key,
    required this.label,
    this.tone = MssBadgeTone.neutral,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color fg;
    switch (tone) {
      case MssBadgeTone.primary:
        bg = MssColors.primary50;
        fg = MssColors.primary;
        break;
      case MssBadgeTone.accent:
        bg = MssColors.accent100;
        fg = MssColors.accent800;
        break;
      case MssBadgeTone.success:
        bg = MssColors.successBg;
        fg = MssColors.success;
        break;
      case MssBadgeTone.warning:
        bg = MssColors.warningBg;
        fg = MssColors.warning;
        break;
      case MssBadgeTone.danger:
        bg = MssColors.dangerBg;
        fg = MssColors.danger;
        break;
      case MssBadgeTone.info:
        bg = MssColors.infoBg;
        fg = MssColors.info;
        break;
      case MssBadgeTone.neutral:
        bg = MssColors.surfaceMuted;
        fg = MssColors.textMuted;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 13, color: fg),
            const SizedBox(width: 4),
          ],
          Flexible(
            child: Text(
              label,
              style: TextStyle(
                color: fg,
                fontSize: 11.5,
                fontWeight: FontWeight.w700,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}

class MssEmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? description;
  final String? actionLabel;
  final VoidCallback? onAction;

  const MssEmptyState({
    super.key,
    this.icon = Icons.inbox_outlined,
    required this.title,
    this.description,
    this.actionLabel,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: MssColors.primary50,
                borderRadius: BorderRadius.circular(32),
              ),
              child: Icon(icon, size: 32, color: MssColors.primary),
            ),
            const SizedBox(height: 14),
            Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: MssColors.textPrimary,
              ),
            ),
            if (description != null && description!.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(
                description!,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 13.5,
                  color: MssColors.textMuted,
                  height: 1.4,
                ),
              ),
            ],
            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: onAction,
                child: Text(actionLabel!),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class MssSectionHeader extends StatelessWidget {
  final String title;
  final String? subtitle;
  final String? trailingText;
  final VoidCallback? onTrailingTap;

  const MssSectionHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.trailingText,
    this.onTrailingTap,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: MssColors.textPrimary,
                ),
              ),
              if (subtitle != null && subtitle!.isNotEmpty) ...[
                const SizedBox(height: 2),
                Text(
                  subtitle!,
                  style: const TextStyle(
                    fontSize: 12.5,
                    color: MssColors.textMuted,
                  ),
                ),
              ],
            ],
          ),
        ),
        if (trailingText != null && onTrailingTap != null)
          TextButton(
            onPressed: onTrailingTap,
            child: Text(
              trailingText!,
              style: const TextStyle(
                color: MssColors.primary,
                fontWeight: FontWeight.w700,
                fontSize: 13,
              ),
            ),
          ),
      ],
    );
  }
}
