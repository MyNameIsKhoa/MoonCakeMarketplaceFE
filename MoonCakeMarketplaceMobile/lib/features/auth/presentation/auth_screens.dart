import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/config/app_env.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/mss_theme.dart';
import '../../../core/utils/formatters.dart';
import 'auth_controller.dart';

class LoginScreen extends ConsumerStatefulWidget {
  final String? notice;
  final VoidCallback? onSuccess;

  const LoginScreen({
    super.key,
    this.notice,
    this.onSuccess,
  });

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();

  bool _loading = false;
  bool _obscurePassword = true;
  String? _errorMessage;
  bool _needsEmailVerification = false;
  String? _infoMessage;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _loading = true;
      _errorMessage = null;
      _infoMessage = null;
      _needsEmailVerification = false;
    });

    try {
      await ref.read(authControllerProvider.notifier).login(
            email: _emailCtrl.text.trim(),
            password: _passwordCtrl.text,
          );
      if (!mounted) return;
      if (widget.onSuccess != null) {
        widget.onSuccess!();
      } else if (Navigator.of(context).canPop()) {
        Navigator.of(context).pop(true);
      }
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = e.localizedMessage;
        _needsEmailVerification = e.code == 'EMAIL_NOT_VERIFIED';
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = e.toString();
      });
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _resendVerification() async {
    final email = _emailCtrl.text.trim();
    if (email.isEmpty) {
      setState(() {
        _errorMessage = 'Vui lòng nhập địa chỉ email để nhận mã xác minh.';
      });
      return;
    }
    setState(() {
      _loading = true;
      _errorMessage = null;
      _infoMessage = null;
    });
    try {
      final msg = await ref
          .read(identityApiProvider)
          .requestEmailVerification(email);
      if (!mounted) return;
      setState(() => _infoMessage = msg);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _errorMessage = e.localizedMessage);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _openVerifyEmailDialog() {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => VerifyEmailSheet(
        initialEmail: _emailCtrl.text.trim(),
        onVerified: (msg) {
          setState(() {
            _needsEmailVerification = false;
            _errorMessage = null;
            _infoMessage = msg;
          });
        },
      ),
    );
  }

  void _openForgotPasswordDialog() {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => ForgotPasswordSheet(
        initialEmail: _emailCtrl.text.trim(),
      ),
    );
  }

  void _openRegisterScreen() async {
    final registeredEmail = await Navigator.of(context).push<String>(
      MaterialPageRoute(builder: (_) => const RegisterScreen()),
    );
    if (registeredEmail != null && registeredEmail.isNotEmpty && mounted) {
      setState(() {
        _emailCtrl.text = registeredEmail;
        _infoMessage =
            'Đăng ký thành công! Vui lòng kiểm tra email để lấy mã xác minh trước khi đăng nhập.';
        _needsEmailVerification = true;
      });
    }
  }

  void _openServerConfigDialog() {
    final urlCtrl = TextEditingController(text: AppEnv.apiBaseUrl);
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text(
          'Cấu hình máy chủ API Gateway',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              '• Android Emulator: http://10.0.2.2:8080\n'
              '• Windows / iOS Simulator: http://localhost:8080\n'
              '• Máy thật chung Wi-Fi: http://<IP-LAN>:8080',
              style: TextStyle(fontSize: 12.5, color: MssColors.textMuted),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: urlCtrl,
              decoration: const InputDecoration(
                labelText: 'Địa chỉ API Gateway',
                hintText: 'http://10.0.2.2:8080',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () async {
              AppEnv.setBaseUrlOverride(null);
              await ref.read(appStorageProvider).writeCustomApiBaseUrl(null);
              if (ctx.mounted) Navigator.of(ctx).pop();
              if (mounted) setState(() {});
            },
            child: const Text('Mặc định'),
          ),
          ElevatedButton(
            onPressed: () async {
              final next = urlCtrl.text.trim();
              AppEnv.setBaseUrlOverride(next);
              await ref.read(appStorageProvider).writeCustomApiBaseUrl(next);
              if (ctx.mounted) Navigator.of(ctx).pop();
              if (mounted) setState(() {});
            },
            child: const Text('Lưu cấu hình'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Đăng nhập'),
        actions: [
          IconButton(
            tooltip: 'Cấu hình địa chỉ máy chủ API',
            onPressed: _openServerConfigDialog,
            icon: const Icon(Icons.dns_outlined),
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Festive header card
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [MssColors.primary950, MssColors.primary],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: const Text(
                          'MOONCAKEHUB • KHÁCH HÀNG',
                          style: TextStyle(
                            color: MssColors.accent400,
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                      const SizedBox(height: 10),
                      const Text(
                        'Chào mừng bạn trở lại mùa Trăng Rằm',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Đăng nhập để đặt bánh lẻ, quản lý đơn hàng, theo dõi kiện giao và thương lượng báo giá doanh nghiệp.',
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.88),
                          fontSize: 13,
                          height: 1.4,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                if (widget.notice != null && widget.notice!.isNotEmpty) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: MssColors.warningBg,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: MssColors.warning.withOpacity(0.3),
                      ),
                    ),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.info_outline,
                          color: MssColors.warning,
                          size: 20,
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            widget.notice!,
                            style: const TextStyle(
                              color: MssColors.warning,
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                ],

                if (_infoMessage != null) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: MssColors.successBg,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      _infoMessage!,
                      style: const TextStyle(
                        color: MssColors.success,
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                ],

                if (_errorMessage != null) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: MssColors.dangerBg,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _errorMessage!,
                          style: const TextStyle(
                            color: MssColors.danger,
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        if (_needsEmailVerification) ...[
                          const SizedBox(height: 10),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              OutlinedButton.icon(
                                onPressed:
                                    _loading ? null : _resendVerification,
                                icon: const Icon(Icons.mark_email_read_outlined,
                                    size: 16),
                                label: const Text('Gửi lại email xác minh'),
                              ),
                              ElevatedButton.icon(
                                onPressed:
                                    _loading ? null : _openVerifyEmailDialog,
                                icon: const Icon(Icons.verified_user_outlined,
                                    size: 16),
                                label: const Text('Nhập mã xác minh'),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                ],

                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(18),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        TextFormField(
                          controller: _emailCtrl,
                          keyboardType: TextInputType.emailAddress,
                          textInputAction: TextInputAction.next,
                          decoration: const InputDecoration(
                            labelText: 'Địa chỉ Email',
                            hintText: 'ban@example.com',
                            prefixIcon: Icon(Icons.email_outlined),
                          ),
                          validator: (v) {
                            final text = v?.trim() ?? '';
                            if (text.isEmpty) return 'Vui lòng nhập email.';
                            if (!text.contains('@')) {
                              return 'Địa chỉ email không hợp lệ.';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 14),
                        TextFormField(
                          controller: _passwordCtrl,
                          obscureText: _obscurePassword,
                          textInputAction: TextInputAction.done,
                          onFieldSubmitted: (_) => _submit(),
                          decoration: InputDecoration(
                            labelText: 'Mật khẩu',
                            hintText: 'Nhập mật khẩu',
                            prefixIcon: const Icon(Icons.lock_outline),
                            suffixIcon: IconButton(
                              onPressed: () => setState(
                                  () => _obscurePassword = !_obscurePassword),
                              icon: Icon(
                                _obscurePassword
                                    ? Icons.visibility_outlined
                                    : Icons.visibility_off_outlined,
                              ),
                            ),
                          ),
                          validator: (v) {
                            if (v == null || v.isEmpty) {
                              return 'Vui lòng nhập mật khẩu.';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          alignment: WrapAlignment.spaceBetween,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: [
                            TextButton(
                              onPressed: _openVerifyEmailDialog,
                              child: const Text('Xác minh email bằng mã'),
                            ),
                            TextButton(
                              onPressed: _openForgotPasswordDialog,
                              child: const Text('Quên mật khẩu?'),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        ElevatedButton(
                          onPressed: _loading ? null : _submit,
                          child: _loading
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : const Text('Đăng nhập'),
                        ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 16),
                Wrap(
                  alignment: WrapAlignment.center,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    const Text(
                      'Chưa có tài khoản khách hàng?',
                      style: TextStyle(color: MssColors.textMuted),
                    ),
                    TextButton(
                      onPressed: _openRegisterScreen,
                      child: const Text(
                        'Đăng ký ngay',
                        style: TextStyle(fontWeight: FontWeight.w700),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _fullNameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _confirmPasswordCtrl = TextEditingController();

  bool _loading = false;
  bool _obscurePassword = true;
  String? _errorMessage;

  @override
  void dispose() {
    _fullNameCtrl.dispose();
    _emailCtrl.dispose();
    _phoneCtrl.dispose();
    _passwordCtrl.dispose();
    _confirmPasswordCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _loading = true;
      _errorMessage = null;
    });

    try {
      final profile = await ref.read(authControllerProvider.notifier).register(
            email: _emailCtrl.text.trim(),
            password: _passwordCtrl.text,
            fullName: _fullNameCtrl.text.trim(),
            phoneNumber: _phoneCtrl.text.trim().isEmpty
                ? null
                : _phoneCtrl.text.trim(),
          );
      if (!mounted) return;
      Navigator.of(context).pop(profile.email);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _errorMessage = e.localizedMessage);
    } catch (e) {
      if (!mounted) return;
      setState(() => _errorMessage = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Đăng ký tài khoản')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Form(
            key: _formKey,
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text(
                      'Tạo tài khoản Khách hàng MooncakeHub',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: MssColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Sau khi đăng ký, hệ thống sẽ gửi mã xác minh tới email của bạn.',
                      style: TextStyle(
                        fontSize: 13,
                        color: MssColors.textMuted,
                      ),
                    ),
                    const SizedBox(height: 16),
                    if (_errorMessage != null) ...[
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: MssColors.dangerBg,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          _errorMessage!,
                          style: const TextStyle(
                            color: MssColors.danger,
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      const SizedBox(height: 14),
                    ],
                    TextFormField(
                      controller: _fullNameCtrl,
                      textInputAction: TextInputAction.next,
                      decoration: const InputDecoration(
                        labelText: 'Họ và tên *',
                        hintText: 'Nguyễn Văn A',
                        prefixIcon: Icon(Icons.person_outline),
                      ),
                      validator: (v) {
                        if (v == null || v.trim().isEmpty) {
                          return 'Vui lòng nhập họ và tên.';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 14),
                    TextFormField(
                      controller: _emailCtrl,
                      keyboardType: TextInputType.emailAddress,
                      textInputAction: TextInputAction.next,
                      decoration: const InputDecoration(
                        labelText: 'Địa chỉ Email *',
                        hintText: 'ban@example.com',
                        prefixIcon: Icon(Icons.email_outlined),
                      ),
                      validator: (v) {
                        final text = v?.trim() ?? '';
                        if (text.isEmpty) return 'Vui lòng nhập email.';
                        if (!text.contains('@')) return 'Email không hợp lệ.';
                        return null;
                      },
                    ),
                    const SizedBox(height: 14),
                    TextFormField(
                      controller: _phoneCtrl,
                      keyboardType: TextInputType.phone,
                      textInputAction: TextInputAction.next,
                      decoration: const InputDecoration(
                        labelText: 'Số điện thoại (Tùy chọn)',
                        hintText: '0901234567',
                        prefixIcon: Icon(Icons.phone_outlined),
                      ),
                      validator: (v) {
                        final text = v?.trim() ?? '';
                        if (text.isNotEmpty && !Formatters.isValidPhone(text)) {
                          return 'Số điện thoại phải từ 8–30 ký tự số hợp lệ.';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 14),
                    TextFormField(
                      controller: _passwordCtrl,
                      obscureText: _obscurePassword,
                      textInputAction: TextInputAction.next,
                      decoration: InputDecoration(
                        labelText: 'Mật khẩu * (tối thiểu 6 ký tự)',
                        prefixIcon: const Icon(Icons.lock_outline),
                        suffixIcon: IconButton(
                          onPressed: () => setState(
                              () => _obscurePassword = !_obscurePassword),
                          icon: Icon(
                            _obscurePassword
                                ? Icons.visibility_outlined
                                : Icons.visibility_off_outlined,
                          ),
                        ),
                      ),
                      validator: (v) {
                        if (v == null || v.length < 6) {
                          return 'Mật khẩu phải có ít nhất 6 ký tự.';
                        }
                        if (v.length > 100) {
                          return 'Mật khẩu tối đa 100 ký tự.';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 14),
                    TextFormField(
                      controller: _confirmPasswordCtrl,
                      obscureText: _obscurePassword,
                      textInputAction: TextInputAction.done,
                      onFieldSubmitted: (_) => _submit(),
                      decoration: const InputDecoration(
                        labelText: 'Xác nhận mật khẩu *',
                        prefixIcon: Icon(Icons.lock_reset_outlined),
                      ),
                      validator: (v) {
                        if (v != _passwordCtrl.text) {
                          return 'Mật khẩu xác nhận không khớp.';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 20),
                    ElevatedButton(
                      onPressed: _loading ? null : _submit,
                      child: _loading
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Text('Tạo tài khoản'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class VerifyEmailSheet extends ConsumerStatefulWidget {
  final String initialEmail;
  final ValueChanged<String> onVerified;

  const VerifyEmailSheet({
    super.key,
    required this.initialEmail,
    required this.onVerified,
  });

  @override
  ConsumerState<VerifyEmailSheet> createState() => _VerifyEmailSheetState();
}

class _VerifyEmailSheetState extends ConsumerState<VerifyEmailSheet> {
  final _tokenCtrl = TextEditingController();
  late final TextEditingController _emailCtrl;
  bool _loading = false;
  String? _error;
  String? _info;

  @override
  void initState() {
    super.initState();
    _emailCtrl = TextEditingController(text: widget.initialEmail);
  }

  @override
  void dispose() {
    _tokenCtrl.dispose();
    _emailCtrl.dispose();
    super.dispose();
  }

  Future<void> _verify() async {
    final token = Formatters.extractTokenFromInput(_tokenCtrl.text);
    if (token.isEmpty) {
      setState(() => _error = 'Vui lòng nhập mã xác minh gồm 6 chữ số.');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
      _info = null;
    });
    try {
      final msg = await ref.read(identityApiProvider).verifyEmail(token);
      if (!mounted) return;
      widget.onVerified(msg);
      Navigator.of(context).pop();
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.localizedMessage);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _resend() async {
    final email = _emailCtrl.text.trim();
    if (email.isEmpty) {
      setState(() => _error = 'Vui lòng nhập email để nhận mã xác minh.');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
      _info = null;
    });
    try {
      final msg =
          await ref.read(identityApiProvider).requestEmailVerification(email);
      if (!mounted) return;
      setState(() => _info = msg);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.localizedMessage);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      decoration: const BoxDecoration(
        color: MssColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Xác minh địa chỉ Email',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 6),
          const Text(
            'Nhập mã xác minh gồm 6 chữ số được gửi tới hộp thư của bạn.',
            style: TextStyle(fontSize: 13, color: MssColors.textMuted),
          ),
          const SizedBox(height: 14),
          if (_error != null) ...[
            Text(
              _error!,
              style: const TextStyle(
                color: MssColors.danger,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 10),
          ],
          if (_info != null) ...[
            Text(
              _info!,
              style: const TextStyle(
                color: MssColors.success,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 10),
          ],
          TextField(
            controller: _tokenCtrl,
            keyboardType: TextInputType.number,
            maxLength: 6,
            decoration: const InputDecoration(
              labelText: 'Mã xác minh *',
              hintText: '6 chữ số',
            ),
          ),
          const SizedBox(height: 12),
          ElevatedButton(
            onPressed: _loading ? null : _verify,
            child: const Text('Xác nhận kích hoạt'),
          ),
          const Divider(height: 24),
          TextField(
            controller: _emailCtrl,
            keyboardType: TextInputType.emailAddress,
            decoration: const InputDecoration(
              labelText: 'Email nhận mã xác minh',
              hintText: 'ban@example.com',
            ),
          ),
          const SizedBox(height: 10),
          OutlinedButton(
            onPressed: _loading ? null : _resend,
            child: const Text('Gửi mã xác minh'),
          ),
        ],
      ),
    );
  }
}

class ForgotPasswordSheet extends ConsumerStatefulWidget {
  final String initialEmail;

  const ForgotPasswordSheet({super.key, required this.initialEmail});

  @override
  ConsumerState<ForgotPasswordSheet> createState() =>
      _ForgotPasswordSheetState();
}

class _ForgotPasswordSheetState extends ConsumerState<ForgotPasswordSheet> {
  late final TextEditingController _emailCtrl;
  final _tokenCtrl = TextEditingController();
  final _newPasswordCtrl = TextEditingController();

  bool _loading = false;
  bool _stepReset = false;
  String? _error;
  String? _info;

  @override
  void initState() {
    super.initState();
    _emailCtrl = TextEditingController(text: widget.initialEmail);
  }

  @override
  void dispose() {
    _emailCtrl.dispose();
    _tokenCtrl.dispose();
    _newPasswordCtrl.dispose();
    super.dispose();
  }

  Future<void> _requestCode() async {
    final email = _emailCtrl.text.trim();
    if (email.isEmpty || !email.contains('@')) {
      setState(() => _error = 'Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
      _info = null;
    });
    try {
      final msg =
          await ref.read(identityApiProvider).requestPasswordReset(email);
      if (!mounted) return;
      setState(() {
        _info = msg;
        _stepReset = true;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.localizedMessage);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _confirmReset() async {
    final code = _tokenCtrl.text.trim();
    final newPassword = _newPasswordCtrl.text;
    if (!RegExp(r'^\d{6}$').hasMatch(code)) {
      setState(() => _error = 'Vui lòng nhập mã gồm 6 chữ số.');
      return;
    }
    if (newPassword.length < 6) {
      setState(() => _error = 'Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
      _info = null;
    });
    try {
      final msg = await ref.read(identityApiProvider).resetPassword(
            code: code,
            newPassword: newPassword,
          );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(msg)),
      );
      Navigator.of(context).pop();
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.localizedMessage);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      decoration: const BoxDecoration(
        color: MssColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              _stepReset ? 'Đặt lại mật khẩu mới' : 'Khôi phục mật khẩu',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 6),
            Text(
              _stepReset
                  ? 'Nhập mã 6 chữ số trong email và mật khẩu mới.'
                  : 'Nhập email đăng ký để nhận mã đặt lại mật khẩu.',
              style: const TextStyle(fontSize: 13, color: MssColors.textMuted),
            ),
            const SizedBox(height: 14),
            if (_error != null) ...[
              Text(
                _error!,
                style: const TextStyle(
                  color: MssColors.danger,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 10),
            ],
            if (_info != null) ...[
              Text(
                _info!,
                style: const TextStyle(
                  color: MssColors.success,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 10),
            ],
            if (!_stepReset) ...[
              TextField(
                controller: _emailCtrl,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(
                  labelText: 'Email tài khoản *',
                  hintText: 'ban@example.com',
                ),
              ),
              const SizedBox(height: 14),
              ElevatedButton(
                onPressed: _loading ? null : _requestCode,
                child: const Text('Gửi mã đặt lại mật khẩu'),
              ),
              TextButton(
                onPressed: () => setState(() => _stepReset = true),
                child: const Text('Tôi đã nhận được mã'),
              ),
            ] else ...[
              TextField(
                controller: _tokenCtrl,
                keyboardType: TextInputType.number,
                maxLength: 6,
                decoration: const InputDecoration(
                  labelText: 'Mã đặt lại mật khẩu *',
                  hintText: '6 chữ số',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _newPasswordCtrl,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'Mật khẩu mới * (tối thiểu 6 ký tự)',
                ),
              ),
              const SizedBox(height: 14),
              ElevatedButton(
                onPressed: _loading ? null : _confirmReset,
                child: const Text('Cập nhật mật khẩu mới'),
              ),
              TextButton(
                onPressed: () => setState(() => _stepReset = false),
                child: const Text('← Quay lại gửi email'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
