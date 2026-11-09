import 'package:flutter/material.dart';

class MssColors {
  // Brand Red (Primary)
  static const Color primary50 = Color(0xFFFEF2F2);
  static const Color primary100 = Color(0xFFFEE2E2);
  static const Color primary200 = Color(0xFFFECACA);
  static const Color primary600 = Color(0xFFDC2626);
  static const Color primary = Color(0xFFB91C1C); // primary-700
  static const Color primaryHover = Color(0xFF991B1B); // primary-800
  static const Color primary900 = Color(0xFF7F1D1D);
  static const Color primary950 = Color(0xFF450A0A);

  // Mid-Autumn Gold (Accent)
  static const Color accent50 = Color(0xFFFFFBEB);
  static const Color accent100 = Color(0xFFFEF3C7);
  static const Color accent200 = Color(0xFFFDE68A);
  static const Color accent400 = Color(0xFFFBBF24);
  static const Color accent = Color(0xFFF59E0B); // accent-500
  static const Color accent600 = Color(0xFFD97706);
  static const Color accent800 = Color(0xFF92400E);
  static const Color accent900 = Color(0xFF78350F);

  // Surfaces & Typography
  static const Color background = Color(0xFFFFFBF7);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color surfaceMuted = Color(0xFFF9F3EC);
  static const Color textPrimary = Color(0xFF1F1A17);
  static const Color textMuted = Color(0xFF5F5853);
  static const Color border = Color(0xFFEADFD4);
  static const Color borderStrong = Color(0xFFD5C4B4);

  // Semantic Status
  static const Color success = Color(0xFF1E7A46);
  static const Color successBg = Color(0xFFE6F4EC);
  static const Color warning = Color(0xFF8A5A00);
  static const Color warningBg = Color(0xFFFDF3DC);
  static const Color danger = Color(0xFFB42318);
  static const Color dangerBg = Color(0xFFFDECEA);
  static const Color info = Color(0xFF1D4ED8);
  static const Color infoBg = Color(0xFFEFF6FF);
}

class MssTheme {
  static ThemeData get lightTheme {
    const colorScheme = ColorScheme.light(
      primary: MssColors.primary,
      onPrimary: Colors.white,
      primaryContainer: MssColors.primary50,
      onPrimaryContainer: MssColors.primary900,
      secondary: MssColors.accent,
      onSecondary: MssColors.primary950,
      secondaryContainer: MssColors.accent100,
      onSecondaryContainer: MssColors.accent900,
      surface: MssColors.surface,
      onSurface: MssColors.textPrimary,
      error: MssColors.danger,
      onError: Colors.white,
      outline: MssColors.border,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: MssColors.background,
      appBarTheme: const AppBarTheme(
        backgroundColor: MssColors.primary900,
        foregroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          color: Colors.white,
          fontSize: 18,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.2,
        ),
      ),
      cardTheme: CardTheme(
        color: MssColors.surface,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: const BorderSide(color: MssColors.border),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: MssColors.primary,
          foregroundColor: Colors.white,
          disabledBackgroundColor: MssColors.border,
          disabledForegroundColor: MssColors.textMuted,
          elevation: 0,
          minimumSize: const Size(88, 46),
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: MssColors.textPrimary,
          side: const BorderSide(color: MssColors.borderStrong),
          minimumSize: const Size(88, 46),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: MssColors.surface,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        hintStyle: const TextStyle(color: MssColors.textMuted, fontSize: 14),
        labelStyle: const TextStyle(color: MssColors.textMuted, fontSize: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: MssColors.borderStrong),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: MssColors.borderStrong),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: MssColors.primary, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: MssColors.danger),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: MssColors.danger, width: 1.5),
        ),
      ),
      dividerTheme: const DividerThemeData(
        color: MssColors.border,
        thickness: 1,
        space: 1,
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: MssColors.surface,
        indicatorColor: MssColors.primary50,
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return TextStyle(
            fontSize: 11.5,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
            color: selected ? MssColors.primary : MssColors.textMuted,
          );
        }),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return IconThemeData(
            size: 22,
            color: selected ? MssColors.primary : MssColors.textMuted,
          );
        }),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }
}
