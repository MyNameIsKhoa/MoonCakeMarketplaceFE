import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/config/app_env.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/mss_theme.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/mss_widgets.dart';
import '../../auth/data/auth_models.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../b2b_rfq/presentation/b2b_screens.dart';
import '../../catalog/data/catalog_models.dart';
import '../../catalog/presentation/catalog_controller.dart';
import '../../catalog/presentation/catalog_screens.dart';
import '../../commerce/presentation/commerce_screens.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  Future<void> _openEditProfileDialog(UserProfile user) async {
    final nameCtrl = TextEditingController(text: user.fullName);
    final phoneCtrl = TextEditingController(text: user.phoneNumber ?? '');
    String? dialogError;

    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('Cập nhật thông tin cá nhân'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (dialogError != null) ...[
                Text(
                  dialogError!,
                  style: const TextStyle(color: MssColors.danger, fontSize: 13),
                ),
                const SizedBox(height: 8),
              ],
              TextField(
                controller: nameCtrl,
                decoration: const InputDecoration(
                  labelText: 'Họ và tên *',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: phoneCtrl,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: 'Số điện thoại',
                  hintText: '0901234567',
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: const Text('Hủy'),
            ),
            ElevatedButton(
              onPressed: () {
                if (nameCtrl.text.trim().isEmpty) {
                  setDialogState(
                      () => dialogError = 'Họ và tên không được để trống.');
                  return;
                }
                final phone = phoneCtrl.text.trim();
                if (phone.isNotEmpty && !Formatters.isValidPhone(phone)) {
                  setDialogState(() =>
                      dialogError = 'Số điện thoại phải từ 8–30 chữ số hợp lệ.');
                  return;
                }
                Navigator.of(ctx).pop(true);
              },
              child: const Text('Lưu thay đổi'),
            ),
          ],
        ),
      ),
    );
    if (saved != true) return;

    try {
      await ref.read(authControllerProvider.notifier).updateProfile(
            fullName: nameCtrl.text.trim(),
            phoneNumber: phoneCtrl.text.trim(),
          );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Đã cập nhật thông tin tài khoản.')),
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text(e.localizedMessage),
            backgroundColor: MssColors.danger),
      );
    }
  }

  void _openServerDialog() {
    final urlCtrl = TextEditingController(text: AppEnv.apiBaseUrl);
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Địa chỉ máy chủ API Gateway'),
        content: TextField(
          controller: urlCtrl,
          decoration: const InputDecoration(
            labelText: 'API Base URL',
            hintText: 'http://10.0.2.2:8080',
          ),
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
            child: const Text('Lưu'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authControllerProvider);
    final user = auth.user;

    if (user == null) {
      return const Center(child: CircularProgressIndicator());
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // User Profile Card
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 28,
                  backgroundColor: MssColors.primary50,
                  child: Text(
                    user.fullName.isNotEmpty
                        ? user.fullName.characters.first.toUpperCase()
                        : 'K',
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      color: MssColors.primary,
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        user.fullName,
                        style: const TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        user.email,
                        style: const TextStyle(
                          fontSize: 13,
                          color: MssColors.textMuted,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        (user.phoneNumber != null &&
                                user.phoneNumber!.trim().isNotEmpty)
                            ? 'SĐT: ${user.phoneNumber}'
                            : 'Chưa cập nhật số điện thoại',
                        style: const TextStyle(
                          fontSize: 12.5,
                          color: MssColors.textMuted,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  tooltip: 'Sửa thông tin',
                  onPressed: () => _openEditProfileDialog(user),
                  icon: const Icon(Icons.edit_outlined, color: MssColors.primary),
                ),
              ],
            ),
          ),
        ),

        const SizedBox(height: 16),

        Card(
          child: Column(
            children: [
              ListTile(
                leading: const Icon(Icons.location_on_outlined,
                    color: MssColors.primary),
                title: const Text(
                  'Sổ địa chỉ nhận hàng',
                  style: TextStyle(fontWeight: FontWeight.w700),
                ),
                subtitle: const Text(
                    'Quản lý địa chỉ giao bánh và đặt địa chỉ mặc định'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                        builder: (_) => const AddressBookScreen()),
                  );
                },
              ),
              const Divider(),
              ListTile(
                leading:
                    const Icon(Icons.favorite_outline, color: MssColors.primary),
                title: Text(
                  'Sản phẩm yêu thích (${auth.wishlistIds.length})',
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                subtitle:
                    const Text('Danh sách các hộp bánh bạn đã đánh dấu lưu'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const WishlistScreen()),
                  );
                },
              ),
              const Divider(),
              ListTile(
                leading: const Icon(Icons.local_offer_outlined,
                    color: MssColors.accent600),
                title: const Text(
                  'Ưu đãi gian hàng toàn sàn',
                  style: TextStyle(fontWeight: FontWeight.w700),
                ),
                subtitle: const Text(
                    'Tra cứu các chương trình khuyến mãi đang áp dụng'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                        builder: (_) => const PromotionsScreen()),
                  );
                },
              ),
              const Divider(),
              ListTile(
                leading: const Icon(Icons.notifications_outlined,
                    color: MssColors.primary),
                title: Row(
                  children: [
                    const Text(
                      'Thông báo của tôi',
                      style: TextStyle(fontWeight: FontWeight.w700),
                    ),
                    if (auth.unreadNotifications > 0) ...[
                      const SizedBox(width: 8),
                      MssBadge(
                        label: '${auth.unreadNotifications} mới',
                        tone: MssBadgeTone.primary,
                      ),
                    ],
                  ],
                ),
                subtitle: const Text(
                    'Cập nhật trạng thái đơn hàng, báo giá và tin nhắn'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () async {
                  await Navigator.of(context).push(
                    MaterialPageRoute(
                        builder: (_) => const NotificationScreen()),
                  );
                  ref
                      .read(authControllerProvider.notifier)
                      .refreshUnreadNotifications();
                },
              ),
              const Divider(),
              ListTile(
                leading:
                    const Icon(Icons.dns_outlined, color: MssColors.textMuted),
                title: const Text(
                  'Cấu hình máy chủ API Gateway',
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
                subtitle: Text(AppEnv.apiBaseUrl),
                trailing: const Icon(Icons.settings_outlined),
                onTap: _openServerDialog,
              ),
            ],
          ),
        ),

        const SizedBox(height: 20),
        OutlinedButton.icon(
          style: OutlinedButton.styleFrom(
            foregroundColor: MssColors.danger,
            side: const BorderSide(color: MssColors.danger),
          ),
          onPressed: () => ref.read(authControllerProvider.notifier).logout(),
          icon: const Icon(Icons.logout_rounded),
          label: const Text('Đăng xuất tài khoản'),
        ),
      ],
    );
  }
}

class AddressBookScreen extends ConsumerStatefulWidget {
  const AddressBookScreen({super.key});

  @override
  ConsumerState<AddressBookScreen> createState() => _AddressBookScreenState();
}

class _AddressBookScreenState extends ConsumerState<AddressBookScreen> {
  List<AddressModel> _addresses = const [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadAddresses();
  }

  Future<void> _loadAddresses() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final list = await ref.read(identityApiProvider).listAddresses();
      if (!mounted) return;
      setState(() {
        _addresses = list;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e.toString();
      });
    }
  }

  Future<void> _openForm({AddressModel? existing}) async {
    final result = await showModalBottomSheet<AddressModel>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => AddressFormSheet(existing: existing),
    );
    if (result != null) {
      _loadAddresses();
    }
  }

  Future<void> _setDefault(AddressModel addr) async {
    try {
      await ref
          .read(identityApiProvider)
          .updateAddress(addr.addressId, isDefault: true);
      await _loadAddresses();
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text(e.localizedMessage),
            backgroundColor: MssColors.danger),
      );
    }
  }

  Future<void> _delete(AddressModel addr) async {
    try {
      await ref.read(identityApiProvider).deleteAddress(addr.addressId);
      await _loadAddresses();
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text(e.localizedMessage),
            backgroundColor: MssColors.danger),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Sổ địa chỉ nhận hàng')),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: MssColors.primary,
        foregroundColor: Colors.white,
        onPressed: () => _openForm(),
        icon: const Icon(Icons.add_location_alt_outlined),
        label: const Text('Thêm địa chỉ'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? MssEmptyState(
                  icon: Icons.error_outline,
                  title: 'Không tải được sổ địa chỉ',
                  description: _error,
                  actionLabel: 'Thử lại',
                  onAction: _loadAddresses,
                )
              : _addresses.isEmpty
                  ? MssEmptyState(
                      icon: Icons.location_off_outlined,
                      title: 'Chưa có địa chỉ nhận hàng',
                      description:
                          'Thêm địa chỉ nhận hàng để đặt bánh nhanh hơn.',
                      actionLabel: '+ Thêm địa chỉ đầu tiên',
                      onAction: () => _openForm(),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 88),
                      itemCount: _addresses.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 10),
                      itemBuilder: (context, index) {
                        final addr = _addresses[index];
                        return Card(
                          child: Padding(
                            padding: const EdgeInsets.all(14),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Text(
                                        '${addr.recipientName} • ${addr.phone}',
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w800,
                                          fontSize: 15,
                                        ),
                                      ),
                                    ),
                                    if (addr.isDefault)
                                      const MssBadge(
                                        label: 'Mặc định',
                                        tone: MssBadgeTone.primary,
                                      ),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  addr.fullAddress,
                                  style: const TextStyle(
                                    fontSize: 13,
                                    color: MssColors.textMuted,
                                  ),
                                ),
                                const SizedBox(height: 10),
                                Wrap(
                                  spacing: 8,
                                  children: [
                                    if (!addr.isDefault)
                                      OutlinedButton(
                                        onPressed: () => _setDefault(addr),
                                        child: const Text('Đặt làm mặc định'),
                                      ),
                                    TextButton.icon(
                                      onPressed: () =>
                                          _openForm(existing: addr),
                                      icon: const Icon(Icons.edit_outlined,
                                          size: 16),
                                      label: const Text('Sửa'),
                                    ),
                                    TextButton.icon(
                                      onPressed: () => _delete(addr),
                                      icon: const Icon(Icons.delete_outline,
                                          color: MssColors.danger, size: 16),
                                      label: const Text(
                                        'Xóa',
                                        style:
                                            TextStyle(color: MssColors.danger),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
    );
  }
}

class AddressFormSheet extends ConsumerStatefulWidget {
  final AddressModel? existing;

  const AddressFormSheet({super.key, this.existing});

  @override
  ConsumerState<AddressFormSheet> createState() => _AddressFormSheetState();
}

class _AddressFormSheetState extends ConsumerState<AddressFormSheet> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _recipientCtrl;
  late final TextEditingController _phoneCtrl;
  late final TextEditingController _provinceCtrl;
  late final TextEditingController _districtCtrl;
  late final TextEditingController _wardCtrl;
  late final TextEditingController _streetCtrl;
  bool _isDefault = false;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final e = widget.existing;
    _recipientCtrl = TextEditingController(text: e?.recipientName ?? '');
    _phoneCtrl = TextEditingController(text: e?.phone ?? '');
    _provinceCtrl =
        TextEditingController(text: e?.province ?? 'TP. Hồ Chí Minh');
    _districtCtrl = TextEditingController(text: e?.district ?? '');
    _wardCtrl = TextEditingController(text: e?.ward ?? '');
    _streetCtrl = TextEditingController(text: e?.streetAddress ?? '');
    _isDefault = e?.isDefault ?? false;
  }

  @override
  void dispose() {
    _recipientCtrl.dispose();
    _phoneCtrl.dispose();
    _provinceCtrl.dispose();
    _districtCtrl.dispose();
    _wardCtrl.dispose();
    _streetCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final api = ref.read(identityApiProvider);
      final AddressModel saved;
      if (widget.existing == null) {
        saved = await api.createAddress(
          recipientName: _recipientCtrl.text.trim(),
          phone: _phoneCtrl.text.trim(),
          province: _provinceCtrl.text.trim(),
          district: _districtCtrl.text.trim(),
          ward: _wardCtrl.text.trim(),
          streetAddress: _streetCtrl.text.trim(),
          isDefault: _isDefault,
        );
      } else {
        saved = await api.updateAddress(
          widget.existing!.addressId,
          recipientName: _recipientCtrl.text.trim(),
          phone: _phoneCtrl.text.trim(),
          province: _provinceCtrl.text.trim(),
          district: _districtCtrl.text.trim(),
          ward: _wardCtrl.text.trim(),
          streetAddress: _streetCtrl.text.trim(),
          isDefault: _isDefault ? true : null,
        );
      }
      if (!mounted) return;
      Navigator.of(context).pop(saved);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.localizedMessage);
    } finally {
      if (mounted) setState(() => _saving = false);
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
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                widget.existing == null
                    ? 'Thêm địa chỉ nhận hàng mới'
                    : 'Cập nhật địa chỉ nhận hàng',
                style:
                    const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 14),
              if (_error != null) ...[
                Text(
                  _error!,
                  style: const TextStyle(
                      color: MssColors.danger, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 10),
              ],
              TextFormField(
                controller: _recipientCtrl,
                decoration:
                    const InputDecoration(labelText: 'Họ tên người nhận *'),
                validator: (v) => (v == null || v.trim().isEmpty)
                    ? 'Nhập tên người nhận'
                    : null,
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _phoneCtrl,
                keyboardType: TextInputType.phone,
                decoration:
                    const InputDecoration(labelText: 'Số điện thoại *'),
                validator: (v) {
                  if (v == null || !Formatters.isValidPhone(v)) {
                    return 'Nhập số điện thoại hợp lệ (8–30 số)';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _provinceCtrl,
                      decoration:
                          const InputDecoration(labelText: 'Tỉnh / Thành phố *'),
                      validator: (v) => (v == null || v.trim().isEmpty)
                          ? 'Nhập Tỉnh/TP'
                          : null,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextFormField(
                      controller: _districtCtrl,
                      decoration:
                          const InputDecoration(labelText: 'Quận / Huyện *'),
                      validator: (v) => (v == null || v.trim().isEmpty)
                          ? 'Nhập Quận/Huyện'
                          : null,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _wardCtrl,
                decoration:
                    const InputDecoration(labelText: 'Phường / Xã *'),
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? 'Nhập Phường/Xã' : null,
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: _streetCtrl,
                decoration: const InputDecoration(
                    labelText: 'Số nhà, tên đường *'),
                validator: (v) => (v == null || v.trim().isEmpty)
                    ? 'Nhập số nhà, tên đường'
                    : null,
              ),
              if (widget.existing == null || !widget.existing!.isDefault)
                CheckboxListTile(
                  contentPadding: EdgeInsets.zero,
                  value: _isDefault,
                  onChanged: (v) => setState(() => _isDefault = v ?? false),
                  title: const Text('Đặt làm địa chỉ mặc định'),
                ),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: _saving ? null : _save,
                child: Text(_saving ? 'Đang lưu...' : 'Lưu địa chỉ'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class WishlistScreen extends ConsumerWidget {
  const WishlistScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    final catalog = ref.watch(catalogControllerProvider);
    final items = catalog.products
        .where((p) => auth.wishlistIds.contains(p.productId.toString()))
        .toList();

    return Scaffold(
      appBar: AppBar(title: Text('Sản phẩm yêu thích (${items.length})')),
      body: items.isEmpty
          ? const MssEmptyState(
              icon: Icons.favorite_border,
              title: 'Danh sách yêu thích đang trống',
              description:
                  'Bấm biểu tượng trái tim trên các hộp bánh Trung thu để lưu lại tại đây.',
            )
          : GridView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 0.65,
              ),
              itemBuilder: (context, index) =>
                  ProductCardWidget(product: items[index]),
            ),
    );
  }
}

class PromotionsScreen extends ConsumerStatefulWidget {
  const PromotionsScreen({super.key});

  @override
  ConsumerState<PromotionsScreen> createState() => _PromotionsScreenState();
}

class _PromotionsScreenState extends ConsumerState<PromotionsScreen> {
  List<PromotionModel> _promotions = const [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadPromotions();
  }

  Future<void> _loadPromotions() async {
    try {
      final list = await ref.read(catalogApiProvider).listPromotions();
      if (!mounted) return;
      setState(() {
        _promotions =
            list.where((p) => p.isActiveNow && p.rules.isNotEmpty).toList();
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final catalog = ref.watch(catalogControllerProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Ưu đãi gian hàng đang áp dụng')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _promotions.isEmpty
              ? const MssEmptyState(
                  icon: Icons.local_offer_outlined,
                  title: 'Hiện chưa có chương trình khuyến mãi nào',
                )
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: _promotions.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final promo = _promotions[index];
                    final store = catalog.findStore(promo.storeId);
                    return Card(
                      child: InkWell(
                        borderRadius: BorderRadius.circular(14),
                        onTap: store == null
                            ? null
                            : () {
                                Navigator.of(context).push(
                                  MaterialPageRoute(
                                    builder: (_) =>
                                        StoreDetailScreen(store: store),
                                  ),
                                );
                              },
                        child: Padding(
                          padding: const EdgeInsets.all(14),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  MssBadge(
                                    label: store?.name ??
                                        'Gian hàng #${promo.storeId}',
                                    tone: MssBadgeTone.accent,
                                  ),
                                  Text(
                                    'Đến ${Formatters.formatDateVi(promo.endAt)}',
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: MssColors.textMuted,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Text(
                                promo.name,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w800,
                                  fontSize: 15,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Wrap(
                                spacing: 6,
                                runSpacing: 6,
                                children: promo.rules
                                    .map((r) => MssBadge(
                                          label: r.summaryVi,
                                          tone: MssBadgeTone.primary,
                                        ))
                                    .toList(),
                              ),
                              if (store != null) ...[
                                const SizedBox(height: 10),
                                const Text(
                                  'Tự động áp dụng tại giỏ hàng • Xem gian hàng →',
                                  style: TextStyle(
                                    fontSize: 12.5,
                                    fontWeight: FontWeight.w700,
                                    color: MssColors.primary,
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}

class NotificationScreen extends ConsumerStatefulWidget {
  const NotificationScreen({super.key});

  @override
  ConsumerState<NotificationScreen> createState() => _NotificationScreenState();
}

class _NotificationScreenState extends ConsumerState<NotificationScreen> {
  List<NotificationItem> _items = const [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadNotifications();
  }

  Future<void> _loadNotifications() async {
    setState(() => _loading = true);
    try {
      final page = await ref.read(identityApiProvider).listNotifications();
      if (!mounted) return;
      setState(() {
        _items = page.items;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _markAllRead() async {
    try {
      await ref.read(identityApiProvider).markAllNotificationsRead();
      await ref
          .read(authControllerProvider.notifier)
          .refreshUnreadNotifications();
      await _loadNotifications();
    } catch (_) {}
  }

  Future<void> _openNotification(NotificationItem item) async {
    if (!item.read) {
      try {
        await ref
            .read(identityApiProvider)
            .markNotificationRead(item.notificationId);
        ref.read(authControllerProvider.notifier).refreshUnreadNotifications();
      } catch (_) {}
    }
    if (!mounted) return;

    final target = item.target;
    if (target.orderId != null) {
      final orderId = Formatters.parseInt(target.orderId);
      if (orderId > 0) {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => OrderDetailScreen(customerOrderId: orderId),
          ),
        );
        return;
      }
    }
    if (target.rfqId != null && target.rfqId!.isNotEmpty) {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => RfqDetailScreen(rfqId: target.rfqId!),
        ),
      );
      return;
    }
    _loadNotifications();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Thông báo của tôi'),
        actions: [
          TextButton(
            onPressed: _markAllRead,
            child: const Text(
              'Đọc tất cả',
              style: TextStyle(color: Colors.white),
            ),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _items.isEmpty
              ? const MssEmptyState(
                  icon: Icons.notifications_none_outlined,
                  title: 'Chưa có thông báo nào',
                )
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: _items.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    final n = _items[index];
                    return Card(
                      color: n.read ? MssColors.surface : MssColors.primary50,
                      child: ListTile(
                        onTap: () => _openNotification(n),
                        leading: Icon(
                          n.read
                              ? Icons.notifications_none
                              : Icons.notifications_active,
                          color: MssColors.primary,
                        ),
                        title: Text(
                          n.title,
                          style: TextStyle(
                            fontWeight:
                                n.read ? FontWeight.w600 : FontWeight.w800,
                          ),
                        ),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const SizedBox(height: 4),
                            Text(n.body),
                            const SizedBox(height: 4),
                            Text(
                              Formatters.formatDateTimeVi(n.createdAt),
                              style: const TextStyle(
                                fontSize: 11.5,
                                color: MssColors.textMuted,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
