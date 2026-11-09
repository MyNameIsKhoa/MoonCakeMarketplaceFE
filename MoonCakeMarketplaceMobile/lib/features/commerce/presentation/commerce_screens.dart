import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:uuid/uuid.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/mss_theme.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/mss_widgets.dart';
import '../../auth/data/auth_models.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../catalog/data/catalog_models.dart';
import '../../catalog/presentation/catalog_controller.dart';
import '../../profile/presentation/profile_screens.dart';
import '../data/commerce_models.dart';
import 'cart_controller.dart';

class CartScreen extends ConsumerStatefulWidget {
  const CartScreen({super.key});

  @override
  ConsumerState<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends ConsumerState<CartScreen> {
  CartPricingPreviewModel? _pricing;
  bool _loadingPricing = false;

  @override
  void initState() {
    super.initState();
    Future.microtask(_reloadCartAndPricing);
  }

  Future<void> _reloadCartAndPricing() async {
    await ref.read(cartControllerProvider.notifier).refresh();
    final cart = ref.read(cartControllerProvider).cart;
    if (cart.items.isEmpty) {
      if (mounted) setState(() => _pricing = null);
      return;
    }
    setState(() => _loadingPricing = true);
    try {
      final preview = await ref.read(commerceApiProvider).previewPricing();
      if (mounted) {
        setState(() {
          _pricing = preview;
          _loadingPricing = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loadingPricing = false);
    }
  }

  Future<void> _changeQty(CartItemModel item, int delta) async {
    try {
      await ref
          .read(cartControllerProvider.notifier)
          .updateQuantity(item.cartItemId, item.quantity + delta);
      await _reloadCartAndPricing();
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.localizedMessage),
          backgroundColor: MssColors.danger,
        ),
      );
    }
  }

  Future<void> _removeItem(int cartItemId) async {
    try {
      await ref.read(cartControllerProvider.notifier).removeItem(cartItemId);
      await _reloadCartAndPricing();
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.localizedMessage),
          backgroundColor: MssColors.danger,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final cartState = ref.watch(cartControllerProvider);
    final cart = cartState.cart;

    return Scaffold(
      appBar: AppBar(title: Text('Giỏ hàng (${cart.totalQuantity})')),
      body: cartState.loading && cart.items.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : cart.items.isEmpty && cart.unavailableItems.isEmpty
              ? MssEmptyState(
                  icon: Icons.shopping_cart_outlined,
                  title: 'Giỏ hàng của bạn đang trống',
                  description:
                      'Hãy chọn những hộp bánh Trung thu ưng ý để thêm vào giỏ hàng nhé.',
                  actionLabel: 'Tiếp tục mua sắm',
                  onAction: () => Navigator.of(context).pop(),
                )
              : Column(
                  children: [
                    Expanded(
                      child: RefreshIndicator(
                        onRefresh: _reloadCartAndPricing,
                        child: ListView(
                          padding: const EdgeInsets.all(16),
                          children: [
                            if (cart.unavailableItems.isNotEmpty) ...[
                              Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: MssColors.dangerBg,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      'Sản phẩm không còn khả dụng (vui lòng xóa trước khi đặt hàng):',
                                      style: TextStyle(
                                        color: MssColors.danger,
                                        fontWeight: FontWeight.w700,
                                        fontSize: 13,
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    ...cart.unavailableItems.map(
                                      (u) => ListTile(
                                        dense: true,
                                        contentPadding: EdgeInsets.zero,
                                        title: Text(
                                          '${u.productName} (${u.variantName})',
                                          style: const TextStyle(
                                              fontWeight: FontWeight.w600),
                                        ),
                                        subtitle: Text(u.reason),
                                        trailing: IconButton(
                                          icon: const Icon(Icons.delete_outline,
                                              color: MssColors.danger),
                                          onPressed: () =>
                                              _removeItem(u.cartItemId),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 14),
                            ],
                            if (_pricing != null &&
                                _pricing!.groups.isNotEmpty) ...[
                              ..._pricing!.groups.map((group) => Padding(
                                    padding: const EdgeInsets.only(bottom: 14),
                                    child: Card(
                                      child: Padding(
                                        padding: const EdgeInsets.all(14),
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Row(
                                              children: [
                                                const Icon(
                                                    Icons.storefront_outlined,
                                                    size: 18,
                                                    color: MssColors.primary),
                                                const SizedBox(width: 8),
                                                Expanded(
                                                  child: Text(
                                                    group.storeName,
                                                    style: const TextStyle(
                                                      fontWeight:
                                                          FontWeight.w800,
                                                      fontSize: 15,
                                                    ),
                                                  ),
                                                ),
                                              ],
                                            ),
                                            const Divider(height: 18),
                                            ...group.items.map(
                                                (item) => _buildItemRow(item)),
                                            const Divider(height: 18),
                                            if (group.discountAmount > 0) ...[
                                              Row(
                                                mainAxisAlignment:
                                                    MainAxisAlignment
                                                        .spaceBetween,
                                                children: [
                                                  Expanded(
                                                    child: Text(
                                                      'Khuyến mãi (${group.appliedPromotionName ?? "Ưu đãi gian hàng"}):',
                                                      style: const TextStyle(
                                                        fontSize: 12.5,
                                                        color:
                                                            MssColors.success,
                                                        fontWeight:
                                                            FontWeight.w600,
                                                      ),
                                                    ),
                                                  ),
                                                  Text(
                                                    '-${Formatters.formatVnd(group.discountAmount)}',
                                                    style: const TextStyle(
                                                      fontSize: 12.5,
                                                      color: MssColors.success,
                                                      fontWeight:
                                                          FontWeight.w700,
                                                    ),
                                                  ),
                                                ],
                                              ),
                                              const SizedBox(height: 4),
                                            ],
                                            Row(
                                              mainAxisAlignment:
                                                  MainAxisAlignment
                                                      .spaceBetween,
                                              children: [
                                                const Text(
                                                  'Phí vận chuyển:',
                                                  style: TextStyle(
                                                    fontSize: 12.5,
                                                    color: MssColors.textMuted,
                                                  ),
                                                ),
                                                Text(
                                                  Formatters.formatVnd(
                                                      group.shippingFee),
                                                  style: const TextStyle(
                                                      fontSize: 12.5),
                                                ),
                                              ],
                                            ),
                                            const SizedBox(height: 6),
                                            Row(
                                              mainAxisAlignment:
                                                  MainAxisAlignment
                                                      .spaceBetween,
                                              children: [
                                                const Text(
                                                  'Tạm tính gian hàng:',
                                                  style: TextStyle(
                                                    fontWeight: FontWeight.w700,
                                                    fontSize: 13.5,
                                                  ),
                                                ),
                                                Text(
                                                  Formatters.formatVnd(
                                                      group.totalAmount),
                                                  style: const TextStyle(
                                                    fontWeight: FontWeight.w800,
                                                    color: MssColors.primary,
                                                    fontSize: 14,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                  )),
                            ] else ...[
                              Card(
                                child: Padding(
                                  padding: const EdgeInsets.all(14),
                                  child: Column(
                                    children:
                                        cart.items.map(_buildItemRow).toList(),
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                    // Bottom summary bar
                    Container(
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
                      decoration: const BoxDecoration(
                        color: MssColors.surface,
                        border:
                            Border(top: BorderSide(color: MssColors.border)),
                      ),
                      child: SafeArea(
                        top: false,
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (_pricing != null &&
                                _pricing!.discountTotal > 0) ...[
                              Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text(
                                    'Tổng giảm giá khuyến mãi:',
                                    style: TextStyle(
                                      fontSize: 13,
                                      color: MssColors.success,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  Text(
                                    '-${Formatters.formatVnd(_pricing!.discountTotal)}',
                                    style: const TextStyle(
                                      fontSize: 13,
                                      color: MssColors.success,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                            ],
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text(
                                  'Tổng thanh toán dự kiến:',
                                  style: TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                Text(
                                  Formatters.formatVnd(
                                    _pricing?.grandTotal ?? cart.subtotal,
                                  ),
                                  style: const TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w800,
                                    color: MssColors.primary,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton.icon(
                                onPressed: (cart.items.isEmpty ||
                                        cart.unavailableItems.isNotEmpty ||
                                        _loadingPricing)
                                    ? null
                                    : () async {
                                        final placedOrderId =
                                            await Navigator.of(context)
                                                .push<int>(
                                          MaterialPageRoute(
                                            builder: (_) =>
                                                const CheckoutScreen(),
                                          ),
                                        );
                                        if (placedOrderId != null &&
                                            context.mounted) {
                                          Navigator.of(context).pushReplacement(
                                            MaterialPageRoute(
                                              builder: (_) => OrderDetailScreen(
                                                customerOrderId: placedOrderId,
                                              ),
                                            ),
                                          );
                                        }
                                      },
                                icon: const Icon(
                                    Icons.shopping_bag_outlined,
                                    size: 18),
                                label: const Text('Tiến hành đặt hàng'),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
    );
  }

  Widget _buildItemRow(CartItemModel item) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          MssImage(
            imageUrl: item.imageUrl,
            width: 64,
            height: 64,
            borderRadius: BorderRadius.circular(10),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.productName,
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 13.5,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Phân loại: ${item.variantName}',
                  style: const TextStyle(
                    fontSize: 12,
                    color: MssColors.textMuted,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  Formatters.formatVnd(item.unitPrice),
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    color: MssColors.primary,
                    fontSize: 13.5,
                  ),
                ),
              ],
            ),
          ),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              IconButton(
                visualDensity: VisualDensity.compact,
                onPressed: () => _changeQty(item, -1),
                icon: const Icon(Icons.remove_circle_outline, size: 20),
              ),
              Text(
                '${item.quantity}',
                style: const TextStyle(fontWeight: FontWeight.w800),
              ),
              IconButton(
                visualDensity: VisualDensity.compact,
                onPressed: item.quantity < item.availableStock
                    ? () => _changeQty(item, 1)
                    : null,
                icon: const Icon(Icons.add_circle_outline, size: 20),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class CheckoutScreen extends ConsumerStatefulWidget {
  const CheckoutScreen({super.key});

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  static const Uuid _uuid = Uuid();
  List<AddressModel> _addresses = const [];
  int? _selectedAddressId;
  CartPricingPreviewModel? _pricing;
  bool _loading = true;
  bool _submitting = false;
  String? _error;
  String _idempotencyKey = _uuid.v4();

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        ref.read(identityApiProvider).listAddresses(),
        ref.read(commerceApiProvider).previewPricing(),
      ]);
      final addresses = results[0] as List<AddressModel>;
      final pricing = results[1] as CartPricingPreviewModel;
      int? defaultAddrId;
      for (final a in addresses) {
        if (a.isDefault) {
          defaultAddrId = a.addressId;
          break;
        }
      }
      defaultAddrId ??=
          addresses.isNotEmpty ? addresses.first.addressId : null;

      if (!mounted) return;
      setState(() {
        _addresses = addresses;
        _selectedAddressId = _selectedAddressId ?? defaultAddrId;
        _pricing = pricing;
        _loading = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e.localizedMessage;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e.toString();
      });
    }
  }

  Future<void> _openAddAddressSheet() async {
    final created = await showModalBottomSheet<AddressModel>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const AddressFormSheet(),
    );
    if (created != null && mounted) {
      await _loadData();
      setState(() {
        _selectedAddressId = created.addressId;
        _idempotencyKey = _uuid.v4();
      });
    }
  }

  Future<void> _placeOrder() async {
    final addrId = _selectedAddressId;
    if (addrId == null) {
      setState(() => _error = 'Vui lòng chọn hoặc thêm địa chỉ nhận hàng.');
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final order = await ref.read(commerceApiProvider).checkout(
            addressId: addrId,
            idempotencyKey: _idempotencyKey,
          );
      ref.read(cartControllerProvider.notifier).clearLocalCart();
      if (!mounted) return;
      Navigator.of(context).pop(order.customerOrderId);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.localizedMessage;
        _idempotencyKey = _uuid.v4();
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _idempotencyKey = _uuid.v4();
      });
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Xác nhận đặt hàng')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (_error != null) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: MssColors.dangerBg,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      _error!,
                      style: const TextStyle(
                        color: MssColors.danger,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                ],

                // Delivery Address Selection
                MssSectionHeader(
                  title: '1. Địa chỉ nhận hàng',
                  trailingText: '+ Thêm địa chỉ',
                  onTrailingTap: _openAddAddressSheet,
                ),
                const SizedBox(height: 8),
                if (_addresses.isEmpty)
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        children: [
                          const Text(
                            'Bạn chưa có địa chỉ nhận hàng nào trong sổ địa chỉ.',
                            style: TextStyle(color: MssColors.textMuted),
                          ),
                          const SizedBox(height: 10),
                          ElevatedButton.icon(
                            onPressed: _openAddAddressSheet,
                            icon: const Icon(Icons.add_location_alt_outlined),
                            label: const Text('Thêm địa chỉ nhận hàng'),
                          ),
                        ],
                      ),
                    ),
                  )
                else
                  ..._addresses.map((addr) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Card(
                          child: RadioListTile<int>(
                            value: addr.addressId,
                            groupValue: _selectedAddressId,
                            activeColor: MssColors.primary,
                            onChanged: (v) {
                              setState(() {
                                _selectedAddressId = v;
                                _idempotencyKey = _uuid.v4();
                              });
                            },
                            title: Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    '${addr.recipientName} • ${addr.phone}',
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w700,
                                      fontSize: 14,
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
                            subtitle: Padding(
                              padding: const EdgeInsets.only(top: 4),
                              child: Text(
                                addr.fullAddress,
                                style: const TextStyle(fontSize: 12.5),
                              ),
                            ),
                          ),
                        ),
                      )),

                const SizedBox(height: 18),
                const MssSectionHeader(
                  title: '2. Chi tiết đơn hàng theo gian hàng',
                  subtitle:
                      'Mỗi gian hàng sẽ được tách thành một đơn vận chuyển riêng',
                ),
                const SizedBox(height: 10),

                if (_pricing != null) ...[
                  ..._pricing!.groups.map((g) => Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Card(
                          child: Padding(
                            padding: const EdgeInsets.all(14),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  g.storeName,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w800,
                                    fontSize: 15,
                                  ),
                                ),
                                const Divider(height: 16),
                                ...g.items.map((item) => Padding(
                                      padding: const EdgeInsets.symmetric(
                                          vertical: 4),
                                      child: Row(
                                        mainAxisAlignment:
                                            MainAxisAlignment.spaceBetween,
                                        children: [
                                          Expanded(
                                            child: Text(
                                              '${item.quantity}x ${item.productName} (${item.variantName})',
                                              style: const TextStyle(
                                                  fontSize: 13),
                                            ),
                                          ),
                                          Text(
                                            Formatters.formatVnd(
                                                item.lineTotal),
                                            style: const TextStyle(
                                              fontWeight: FontWeight.w600,
                                              fontSize: 13,
                                            ),
                                          ),
                                        ],
                                      ),
                                    )),
                                const Divider(height: 16),
                                if (g.discountAmount > 0)
                                  Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        'Ưu đãi (${g.appliedPromotionName ?? "Khuyến mãi"}):',
                                        style: const TextStyle(
                                          color: MssColors.success,
                                          fontSize: 12.5,
                                        ),
                                      ),
                                      Text(
                                        '-${Formatters.formatVnd(g.discountAmount)}',
                                        style: const TextStyle(
                                          color: MssColors.success,
                                          fontWeight: FontWeight.w700,
                                          fontSize: 12.5,
                                        ),
                                      ),
                                    ],
                                  ),
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    const Text(
                                      'Phí vận chuyển:',
                                      style: TextStyle(
                                          fontSize: 12.5,
                                          color: MssColors.textMuted),
                                    ),
                                    Text(
                                      Formatters.formatVnd(g.shippingFee),
                                      style: const TextStyle(fontSize: 12.5),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    const Text(
                                      'Thành tiền gian hàng:',
                                      style: TextStyle(
                                          fontWeight: FontWeight.w700),
                                    ),
                                    Text(
                                      Formatters.formatVnd(g.totalAmount),
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w800,
                                        color: MssColors.primary,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                      )),
                  const SizedBox(height: 8),
                  Card(
                    color: MssColors.primary50,
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        children: [
                          _SummaryLine(
                            label: 'Tổng tiền hàng:',
                            value: Formatters.formatVnd(_pricing!.subtotal),
                          ),
                          if (_pricing!.discountTotal > 0)
                            _SummaryLine(
                              label: 'Giảm giá khuyến mãi:',
                              value:
                                  '-${Formatters.formatVnd(_pricing!.discountTotal)}',
                              valueColor: MssColors.success,
                            ),
                          _SummaryLine(
                            label: 'Tổng phí vận chuyển:',
                            value:
                                Formatters.formatVnd(_pricing!.shippingTotal),
                          ),
                          const Divider(height: 16),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                'Tổng thanh toán:',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              Text(
                                Formatters.formatVnd(_pricing!.grandTotal),
                                style: const TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w800,
                                  color: MssColors.primary,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ],

                const SizedBox(height: 20),
                ElevatedButton.icon(
                  onPressed: (_submitting ||
                          _selectedAddressId == null ||
                          _pricing == null)
                      ? null
                      : _placeOrder,
                  icon: _submitting
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white),
                        )
                      : const Icon(Icons.check_circle_outline),
                  label: Text(
                    _submitting
                        ? 'Đang tạo đơn & giữ kho...'
                        : 'Đặt hàng & Thanh toán PayOS',
                  ),
                ),
              ],
            ),
    );
  }
}

class _SummaryLine extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;

  const _SummaryLine({
    required this.label,
    required this.value,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 13.5)),
          Text(
            value,
            style: TextStyle(
              fontSize: 13.5,
              fontWeight: FontWeight.w700,
              color: valueColor ?? MssColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}

class OrderListScreen extends ConsumerStatefulWidget {
  const OrderListScreen({super.key});

  @override
  ConsumerState<OrderListScreen> createState() => _OrderListScreenState();
}

class _OrderListScreenState extends ConsumerState<OrderListScreen> {
  List<CustomerOrderModel> _orders = const [];
  bool _loading = true;
  String? _error;
  String _filter = 'all';

  @override
  void initState() {
    super.initState();
    _loadOrders();
  }

  Future<void> _loadOrders() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final list = await ref.read(commerceApiProvider).listOrders();
      if (!mounted) return;
      setState(() {
        _orders = list;
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

  bool _matchesFilter(CustomerOrderModel order) {
    if (_filter == 'all') return true;
    final statuses = order.sellerOrders.map((s) => s.status).toSet();
    switch (_filter) {
      case 'pending_payment':
        return order.status == 'PENDING_PAYMENT' ||
            statuses.contains('PENDING_PAYMENT') ||
            statuses.contains('DEPOSIT_PAID');
      case 'processing':
        return statuses.any((s) => [
              'CONFIRMED',
              'PROCESSING',
              'ALLOCATED',
              'PARTIALLY_SHIPPED',
              'SHIPPED'
            ].contains(s));
      case 'completed':
        return statuses
            .any((s) => ['DELIVERED', 'ACCEPTED', 'SETTLED'].contains(s));
      case 'cancelled_disputed':
        return order.status == 'CANCELLED' ||
            statuses
                .any((s) => ['CANCELLED', 'DISPUTED', 'REFUNDED'].contains(s));
      default:
        return true;
    }
  }

  @override
  Widget build(BuildContext context) {
    final catalog = ref.watch(catalogControllerProvider);
    final filtered = _orders.where(_matchesFilter).toList();

    return Column(
      children: [
        Container(
          color: MssColors.surface,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          child: SizedBox(
            height: 36,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                _buildTabChip('all', 'Tất cả (${_orders.length})'),
                const SizedBox(width: 8),
                _buildTabChip('pending_payment', 'Chờ thanh toán'),
                const SizedBox(width: 8),
                _buildTabChip('processing', 'Đang xử lý / Giao'),
                const SizedBox(width: 8),
                _buildTabChip('completed', 'Đã giao / Hoàn tất'),
                const SizedBox(width: 8),
                _buildTabChip('cancelled_disputed', 'Đã hủy / Khiếu nại'),
              ],
            ),
          ),
        ),
        const Divider(),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _error != null
                  ? MssEmptyState(
                      icon: Icons.error_outline,
                      title: 'Không tải được danh sách đơn hàng',
                      description: _error,
                      actionLabel: 'Thử lại',
                      onAction: _loadOrders,
                    )
                  : filtered.isEmpty
                      ? MssEmptyState(
                          icon: Icons.receipt_long_outlined,
                          title: 'Chưa có đơn hàng nào trong mục này',
                          description:
                              'Các đơn đặt mua bánh lẻ và đơn từ báo giá B2B sẽ hiển thị tại đây.',
                          actionLabel: 'Làm mới',
                          onAction: _loadOrders,
                        )
                      : RefreshIndicator(
                          onRefresh: _loadOrders,
                          child: ListView.separated(
                            padding: const EdgeInsets.all(16),
                            itemCount: filtered.length,
                            separatorBuilder: (_, __) =>
                                const SizedBox(height: 12),
                            itemBuilder: (context, index) {
                              final order = filtered[index];
                              return Card(
                                child: InkWell(
                                  borderRadius: BorderRadius.circular(14),
                                  onTap: () async {
                                    await Navigator.of(context).push(
                                      MaterialPageRoute(
                                        builder: (_) => OrderDetailScreen(
                                          customerOrderId:
                                              order.customerOrderId,
                                        ),
                                      ),
                                    );
                                    _loadOrders();
                                  },
                                  child: Padding(
                                    padding: const EdgeInsets.all(14),
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          mainAxisAlignment:
                                              MainAxisAlignment.spaceBetween,
                                          children: [
                                            Text(
                                              'Đơn hàng #${order.customerOrderId}',
                                              style: const TextStyle(
                                                fontWeight: FontWeight.w800,
                                                fontSize: 15,
                                              ),
                                            ),
                                            MssBadge(
                                              label: order.isRfqOrder
                                                  ? 'Đơn B2B RFQ'
                                                  : 'Mua lẻ',
                                              tone: order.isRfqOrder
                                                  ? MssBadgeTone.info
                                                  : MssBadgeTone.accent,
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          'Ngày đặt: ${Formatters.formatDateTimeVi(order.createdAt)}',
                                          style: const TextStyle(
                                            fontSize: 12,
                                            color: MssColors.textMuted,
                                          ),
                                        ),
                                        const Divider(height: 18),
                                        ...order.sellerOrders.map((so) {
                                          final storeName = catalog
                                                  .findStore(so.storeId)
                                                  ?.name ??
                                              'Gian hàng #${so.storeId}';
                                          return Padding(
                                            padding: const EdgeInsets.only(
                                                bottom: 8),
                                            child: Row(
                                              mainAxisAlignment:
                                                  MainAxisAlignment
                                                      .spaceBetween,
                                              children: [
                                                Expanded(
                                                  child: Text(
                                                    '$storeName (${so.items.length} SP)',
                                                    style: const TextStyle(
                                                      fontWeight:
                                                          FontWeight.w600,
                                                      fontSize: 13,
                                                    ),
                                                  ),
                                                ),
                                                MssBadge(
                                                  label: SellerOrderModel
                                                      .statusLabelVi(so.status),
                                                  tone: _statusTone(so.status),
                                                ),
                                              ],
                                            ),
                                          );
                                        }),
                                        const Divider(height: 16),
                                        Row(
                                          mainAxisAlignment:
                                              MainAxisAlignment.spaceBetween,
                                          children: [
                                            Text(
                                              'Tổng cộng: ${Formatters.formatVnd(order.totalAmount)}',
                                              style: const TextStyle(
                                                fontWeight: FontWeight.w800,
                                                color: MssColors.primary,
                                                fontSize: 15,
                                              ),
                                            ),
                                            const Text(
                                              'Chi tiết & Thanh toán →',
                                              style: TextStyle(
                                                fontSize: 12.5,
                                                fontWeight: FontWeight.w700,
                                                color: MssColors.primary,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
        ),
      ],
    );
  }

  Widget _buildTabChip(String key, String label) {
    final selected = _filter == key;
    return ChoiceChip(
      label: Text(label),
      selected: selected,
      selectedColor: MssColors.primary,
      labelStyle: TextStyle(
        color: selected ? Colors.white : MssColors.textPrimary,
        fontWeight: FontWeight.w600,
        fontSize: 12.5,
      ),
      onSelected: (_) => setState(() => _filter = key),
    );
  }

  static MssBadgeTone _statusTone(String status) {
    switch (status) {
      case 'DELIVERED':
      case 'ACCEPTED':
      case 'SETTLED':
        return MssBadgeTone.success;
      case 'PENDING_PAYMENT':
      case 'DEPOSIT_PAID':
        return MssBadgeTone.warning;
      case 'CANCELLED':
      case 'DISPUTED':
        return MssBadgeTone.danger;
      default:
        return MssBadgeTone.info;
    }
  }
}

class OrderDetailScreen extends ConsumerStatefulWidget {
  final int customerOrderId;

  const OrderDetailScreen({super.key, required this.customerOrderId});

  @override
  ConsumerState<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends ConsumerState<OrderDetailScreen>
    with WidgetsBindingObserver {
  CustomerOrderModel? _order;
  CustomerPaymentSnapshotModel? _customerPayment;
  Map<int, SellerOrderFinanceSnapshotModel> _sellerFinances = const {};
  Map<int, List<ShipmentModel>> _shipmentsBySellerOrder = const {};
  Map<int, ReviewModel> _reviewsByOrderItem = const {};
  bool _loading = true;
  bool _actionBusy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _loadOrderEverything();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Automatically reconcile pending PayOS payments when user returns from browser/banking app
    if (state == AppLifecycleState.resumed) {
      _autoReconcileOnResume();
    }
  }

  Future<void> _autoReconcileOnResume() async {
    final order = _order;
    if (order == null || _actionBusy) return;
    final api = ref.read(commerceApiProvider);
    try {
      if (!order.isRfqOrder &&
          _customerPayment?.payment?.status == 'PENDING' &&
          _customerPayment?.payment?.checkoutUrl != null) {
        await api.reconcileCustomerOrderPayment(order.customerOrderId);
        await _loadOrderEverything();
      } else if (order.isRfqOrder) {
        for (final f in _sellerFinances.values) {
          for (final p in f.payments) {
            if (p.status == 'PENDING' && p.checkoutUrl != null) {
              await api.reconcileSellerPayment(p.paymentId);
            }
          }
        }
        await _loadOrderEverything();
      }
    } catch (_) {}
  }

  Future<void> _loadOrderEverything() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    final api = ref.read(commerceApiProvider);
    final catalogApi = ref.read(catalogApiProvider);
    try {
      final order = await api.getOrder(widget.customerOrderId);
      CustomerPaymentSnapshotModel? custPayment;
      if (!order.isRfqOrder) {
        try {
          custPayment = await api.getCustomerOrderPayment(order.customerOrderId);
        } catch (_) {}
      }

      final finances = <int, SellerOrderFinanceSnapshotModel>{};
      final shipments = <int, List<ShipmentModel>>{};
      final reviews = <int, ReviewModel>{};

      for (final so in order.sellerOrders) {
        try {
          finances[so.sellerOrderId] =
              await api.getSellerOrderFinance(so.sellerOrderId);
        } catch (_) {}
        try {
          shipments[so.sellerOrderId] =
              await api.listShipments(so.sellerOrderId);
        } catch (_) {}
        try {
          final orderReviews =
              await catalogApi.listReviews(orderId: so.sellerOrderId);
          for (final r in orderReviews) {
            reviews[r.orderItemId] = r;
          }
        } catch (_) {}
      }

      if (!mounted) return;
      setState(() {
        _order = order;
        _customerPayment = custPayment;
        _sellerFinances = finances;
        _shipmentsBySellerOrder = shipments;
        _reviewsByOrderItem = reviews;
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

  Future<void> _initiateAndShowRetailPayment() async {
    setState(() => _actionBusy = true);
    try {
      final record = await ref
          .read(commerceApiProvider)
          .initiateCustomerOrderPayment(widget.customerOrderId);
      await _loadOrderEverything();
      if (!mounted) return;
      _showPayOsPaymentModal(
        title: 'Thanh toán tổng đơn #${widget.customerOrderId}',
        amount: record.amount,
        checkoutUrl: record.checkoutUrl,
        qrCode: record.qrCode,
        onReconcile: () async {
          await ref
              .read(commerceApiProvider)
              .reconcileCustomerOrderPayment(widget.customerOrderId);
          await _loadOrderEverything();
        },
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text(e.localizedMessage),
            backgroundColor: MssColors.danger),
      );
    } finally {
      if (mounted) setState(() => _actionBusy = false);
    }
  }

  Future<void> _initiateAndShowSellerPayment(
      SellerPaymentRecordModel payment) async {
    setState(() => _actionBusy = true);
    try {
      final record = await ref
          .read(commerceApiProvider)
          .initiateSellerPayment(payment.paymentId);
      await _loadOrderEverything();
      if (!mounted) return;
      _showPayOsPaymentModal(
        title: '${record.paymentTypeLabelVi} • Đơn #${record.sellerOrderId}',
        amount: record.amount,
        checkoutUrl: record.checkoutUrl,
        qrCode: record.qrCode,
        onReconcile: () async {
          await ref
              .read(commerceApiProvider)
              .reconcileSellerPayment(record.paymentId);
          await _loadOrderEverything();
        },
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text(e.localizedMessage),
            backgroundColor: MssColors.danger),
      );
    } finally {
      if (mounted) setState(() => _actionBusy = false);
    }
  }

  void _showPayOsPaymentModal({
    required String title,
    required double amount,
    required String? checkoutUrl,
    required String? qrCode,
    required Future<void> Function() onReconcile,
  }) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
        decoration: const BoxDecoration(
          color: MssColors.surface,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              title,
              style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 6),
            Text(
              Formatters.formatVnd(amount),
              style: const TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w800,
                color: MssColors.primary,
              ),
            ),
            const SizedBox(height: 14),
            if (qrCode != null && qrCode.trim().isNotEmpty) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: MssColors.borderStrong),
                ),
                child: QrImageView(
                  data: qrCode.trim(),
                  size: 200,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Quét mã VietQR bằng ứng dụng Ngân hàng hoặc mở cổng PayOS bên dưới.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12.5, color: MssColors.textMuted),
              ),
              const SizedBox(height: 14),
            ],
            if (checkoutUrl != null && checkoutUrl.isNotEmpty) ...[
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () async {
                    final uri = Uri.tryParse(checkoutUrl);
                    if (uri != null) {
                      await launchUrl(uri,
                          mode: LaunchMode.externalApplication);
                    }
                  },
                  icon: const Icon(Icons.open_in_new),
                  label: const Text('Mở trang thanh toán PayOS'),
                ),
              ),
              const SizedBox(height: 10),
            ],
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () async {
                  Navigator.of(ctx).pop();
                  await onReconcile();
                },
                icon: const Icon(Icons.sync),
                label: const Text('Tôi đã thanh toán • Kiểm tra trạng thái'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _cancelUnpaidOrder() async {
    final reasonCtrl = TextEditingController();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Hủy đơn hàng chưa thanh toán?'),
        content: TextField(
          controller: reasonCtrl,
          decoration: const InputDecoration(
            labelText: 'Lý do hủy đơn (tùy chọn)',
            hintText: 'Đổi ý / đặt nhầm sản phẩm...',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Đóng'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Xác nhận hủy đơn'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    setState(() => _actionBusy = true);
    try {
      await ref.read(commerceApiProvider).cancelUnpaidCustomerOrder(
            widget.customerOrderId,
            reason: reasonCtrl.text.trim(),
          );
      await _loadOrderEverything();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Đã hủy đơn hàng và hoàn trả tồn kho.')),
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text(e.localizedMessage),
            backgroundColor: MssColors.danger),
      );
    } finally {
      if (mounted) setState(() => _actionBusy = false);
    }
  }

  Future<void> _acceptDeliveredOrder(int sellerOrderId) async {
    setState(() => _actionBusy = true);
    try {
      await ref.read(commerceApiProvider).acceptSellerOrder(sellerOrderId);
      await _loadOrderEverything();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Đã xác nhận nghiệm thu đơn hàng thành công!')),
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text(e.localizedMessage),
            backgroundColor: MssColors.danger),
      );
    } finally {
      if (mounted) setState(() => _actionBusy = false);
    }
  }

  Future<void> _openReviewDialog(OrderItemModel item) async {
    int rating = 5;
    final commentCtrl = TextEditingController();
    final submitted = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: Text(
            'Đánh giá: ${item.productNameSnapshot}',
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Phân loại: ${item.variantNameSnapshot}',
                style:
                    const TextStyle(fontSize: 12.5, color: MssColors.textMuted),
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(
                  5,
                  (i) => IconButton(
                    onPressed: () => setDialogState(() => rating = i + 1),
                    icon: Icon(
                      i < rating
                          ? Icons.star_rounded
                          : Icons.star_border_rounded,
                      color: MssColors.accent,
                      size: 32,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: commentCtrl,
                maxLines: 3,
                decoration: const InputDecoration(
                  labelText: 'Nhận xét của bạn',
                  hintText: 'Chia sẻ cảm nhận về hương vị và đóng gói...',
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
              onPressed: () => Navigator.of(ctx).pop(true),
              child: const Text('Gửi đánh giá'),
            ),
          ],
        ),
      ),
    );
    if (submitted != true) return;

    try {
      await ref.read(catalogApiProvider).createReview(
            orderItemId: item.orderItemId,
            rating: rating,
            comment: commentCtrl.text.trim(),
          );
      await _loadOrderEverything();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Cảm ơn bạn đã gửi đánh giá sản phẩm!')),
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

  Future<void> _requestPaidCancellation(int sellerOrderId) async {
    final reasonCtrl = TextEditingController();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Yêu cầu hủy đơn đã thanh toán'),
        content: TextField(
          controller: reasonCtrl,
          maxLines: 2,
          decoration: const InputDecoration(
            labelText: 'Lý do yêu cầu hủy *',
            hintText: 'Nhập lý do để Quản trị viên xét duyệt hoàn tiền...',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Đóng'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Gửi yêu cầu'),
          ),
        ],
      ),
    );
    if (confirmed != true || reasonCtrl.text.trim().isEmpty) return;

    try {
      await ref.read(commerceApiProvider).requestCancellation(
            sellerOrderId: sellerOrderId,
            reason: reasonCtrl.text.trim(),
          );
      await _loadOrderEverything();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Đã gửi yêu cầu hủy đơn chờ xét duyệt.')),
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

  Future<void> _openDisputeSheet(int sellerOrderId) async {
    final reasonCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    final evidenceCtrl = TextEditingController();

    final submitted = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        padding: EdgeInsets.only(
          left: 20,
          right: 20,
          top: 20,
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
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
              const Text(
                'Mở khiếu nại đơn hàng',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: reasonCtrl,
                decoration: const InputDecoration(
                  labelText: 'Lý do khiếu nại *',
                  hintText: 'Bánh hư hỏng / giao thiếu / trễ hạn giao...',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: descCtrl,
                maxLines: 3,
                decoration: const InputDecoration(
                  labelText: 'Mô tả chi tiết *',
                  hintText: 'Mô tả tình trạng thực tế khi nhận hàng...',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: evidenceCtrl,
                decoration: const InputDecoration(
                  labelText: 'Liên kết ảnh/video bằng chứng (https://...)',
                  hintText: 'https://...',
                ),
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => Navigator.of(ctx).pop(true),
                child: const Text('Gửi hồ sơ khiếu nại'),
              ),
            ],
          ),
        ),
      ),
    );
    if (submitted != true) return;
    if (reasonCtrl.text.trim().isEmpty || descCtrl.text.trim().isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Vui lòng nhập đầy đủ lý do và mô tả khiếu nại.'),
          backgroundColor: MssColors.danger,
        ),
      );
      return;
    }

    try {
      await ref.read(commerceApiProvider).openDispute(
            sellerOrderId: sellerOrderId,
            reason: reasonCtrl.text.trim(),
            description: descCtrl.text.trim(),
            evidenceUrl: evidenceCtrl.text.trim().isEmpty
                ? null
                : evidenceCtrl.text.trim(),
          );
      await _loadOrderEverything();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Đã mở hồ sơ khiếu nại thành công.')),
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

  @override
  Widget build(BuildContext context) {
    final catalog = ref.watch(catalogControllerProvider);
    final order = _order;

    return Scaffold(
      appBar: AppBar(
        title: Text('Chi tiết đơn #${widget.customerOrderId}'),
        actions: [
          IconButton(
            tooltip: 'Làm mới',
            onPressed: _loadOrderEverything,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null || order == null
              ? MssEmptyState(
                  icon: Icons.error_outline,
                  title: 'Không tải được chi tiết đơn hàng',
                  description: _error,
                  actionLabel: 'Thử lại',
                  onAction: _loadOrderEverything,
                )
              : RefreshIndicator(
                  onRefresh: _loadOrderEverything,
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
                    children: [
                      // Order Header & Delivery Address
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(14),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    'Mã tổng đơn: #${order.customerOrderId}',
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w800,
                                      fontSize: 16,
                                    ),
                                  ),
                                  MssBadge(
                                    label: SellerOrderModel.statusLabelVi(
                                        order.status),
                                    tone: _OrderListScreenState._statusTone(
                                        order.status),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Text(
                                'Thời gian đặt: ${Formatters.formatDateTimeVi(order.createdAt)}',
                                style: const TextStyle(
                                    fontSize: 12.5, color: MssColors.textMuted),
                              ),
                              const Divider(height: 18),
                              const Row(
                                children: [
                                  Icon(Icons.location_on_outlined,
                                      size: 16, color: MssColors.primary),
                                  SizedBox(width: 6),
                                  Text(
                                    'Địa chỉ nhận hàng',
                                    style: TextStyle(
                                      fontWeight: FontWeight.w700,
                                      fontSize: 13.5,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${order.addressSnapshot.recipientName} • ${order.addressSnapshot.phone}',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w600,
                                  fontSize: 13,
                                ),
                              ),
                              Text(
                                order.addressSnapshot.fullAddress,
                                style: const TextStyle(
                                  fontSize: 12.5,
                                  color: MssColors.textMuted,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),

                      // Retail Customer Order Payment Card
                      if (!order.isRfqOrder &&
                          order.status == 'PENDING_PAYMENT') ...[
                        const SizedBox(height: 14),
                        Card(
                          color: MssColors.accent50,
                          child: Padding(
                            padding: const EdgeInsets.all(14),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Row(
                                  children: [
                                    Icon(Icons.qr_code_scanner_rounded,
                                        color: MssColors.primary),
                                    SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        'Thanh toán trực tuyến qua PayOS',
                                        style: TextStyle(
                                          fontWeight: FontWeight.w800,
                                          fontSize: 15,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  'Tổng cần thanh toán: ${Formatters.formatVnd(order.totalAmount)}',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w800,
                                    color: MssColors.primary,
                                    fontSize: 16,
                                  ),
                                ),
                                const SizedBox(height: 12),
                                Wrap(
                                  spacing: 8,
                                  runSpacing: 8,
                                  children: [
                                    ElevatedButton.icon(
                                      onPressed: _actionBusy
                                          ? null
                                          : _initiateAndShowRetailPayment,
                                      icon: const Icon(Icons.payment, size: 18),
                                      label: const Text(
                                          'Thanh toán / Hiện QR PayOS'),
                                    ),
                                    OutlinedButton.icon(
                                      onPressed: _actionBusy
                                          ? null
                                          : () async {
                                              await ref
                                                  .read(commerceApiProvider)
                                                  .reconcileCustomerOrderPayment(
                                                      order.customerOrderId);
                                              await _loadOrderEverything();
                                            },
                                      icon: const Icon(Icons.sync, size: 18),
                                      label: const Text('Đối soát PayOS'),
                                    ),
                                    TextButton.icon(
                                      onPressed: _actionBusy
                                          ? null
                                          : _cancelUnpaidOrder,
                                      icon: const Icon(Icons.cancel_outlined,
                                          color: MssColors.danger, size: 18),
                                      label: const Text(
                                        'Hủy đơn chưa thanh toán',
                                        style:
                                            TextStyle(color: MssColors.danger),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],

                      // Seller Orders Breakdown
                      const SizedBox(height: 18),
                      ...order.sellerOrders.map((so) {
                        final storeName =
                            catalog.findStore(so.storeId)?.name ??
                                'Gian hàng #${so.storeId}';
                        final finance = _sellerFinances[so.sellerOrderId];
                        final shipments =
                            _shipmentsBySellerOrder[so.sellerOrderId] ??
                                const [];
                        final canReview = ['DELIVERED', 'ACCEPTED', 'SETTLED']
                            .contains(so.status);

                        return Padding(
                          padding: const EdgeInsets.only(bottom: 16),
                          child: Card(
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
                                          '$storeName • Đơn #${so.sellerOrderId}',
                                          style: const TextStyle(
                                            fontWeight: FontWeight.w800,
                                            fontSize: 15,
                                          ),
                                        ),
                                      ),
                                      MssBadge(
                                        label: SellerOrderModel.statusLabelVi(
                                            so.status),
                                        tone: _OrderListScreenState._statusTone(
                                            so.status),
                                      ),
                                    ],
                                  ),
                                  const Divider(height: 18),

                                  // Order Items & Reviews
                                  ...so.items.map((item) {
                                    final existingReview =
                                        _reviewsByOrderItem[item.orderItemId];
                                    return Padding(
                                      padding:
                                          const EdgeInsets.only(bottom: 10),
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            mainAxisAlignment:
                                                MainAxisAlignment.spaceBetween,
                                            children: [
                                              Expanded(
                                                child: Text(
                                                  '${item.quantity}x ${item.productNameSnapshot} (${item.variantNameSnapshot})',
                                                  style: const TextStyle(
                                                    fontWeight: FontWeight.w600,
                                                    fontSize: 13.5,
                                                  ),
                                                ),
                                              ),
                                              Text(
                                                Formatters.formatVnd(
                                                    item.lineTotal),
                                                style: const TextStyle(
                                                  fontWeight: FontWeight.w700,
                                                ),
                                              ),
                                            ],
                                          ),
                                          if (existingReview != null)
                                            Padding(
                                              padding:
                                                  const EdgeInsets.only(top: 4),
                                              child: MssBadge(
                                                icon: Icons.star_rounded,
                                                label:
                                                    'Đã đánh giá ${existingReview.rating}/5 sao',
                                                tone: MssBadgeTone.success,
                                              ),
                                            )
                                          else if (canReview)
                                            Align(
                                              alignment: Alignment.centerRight,
                                              child: TextButton.icon(
                                                onPressed: () =>
                                                    _openReviewDialog(item),
                                                icon: const Icon(
                                                    Icons.rate_review_outlined,
                                                    size: 16),
                                                label: const Text(
                                                    'Đánh giá sản phẩm'),
                                              ),
                                            ),
                                        ],
                                      ),
                                    );
                                  }),

                                  const Divider(height: 16),
                                  _SummaryLine(
                                    label: 'Tạm tính:',
                                    value: Formatters.formatVnd(
                                        so.subtotalAmount),
                                  ),
                                  if (so.discountAmount > 0)
                                    _SummaryLine(
                                      label: 'Khuyến mãi:',
                                      value:
                                          '-${Formatters.formatVnd(so.discountAmount)}',
                                      valueColor: MssColors.success,
                                    ),
                                  _SummaryLine(
                                    label: 'Phí vận chuyển:',
                                    value:
                                        Formatters.formatVnd(so.shippingFee),
                                  ),
                                  _SummaryLine(
                                    label: 'Tổng đơn gian hàng:',
                                    value: Formatters.formatVnd(so.totalAmount),
                                    valueColor: MssColors.primary,
                                  ),

                                  // RFQ Milestone Payments
                                  if (so.orderSource == 'RFQ' &&
                                      finance != null &&
                                      finance.payments.isNotEmpty) ...[
                                    const Divider(height: 20),
                                    const Text(
                                      'Các đợt thanh toán B2B RFQ',
                                      style: TextStyle(
                                        fontWeight: FontWeight.w800,
                                        fontSize: 13.5,
                                      ),
                                    ),
                                    if (finance.remainingOverdue)
                                      const Padding(
                                        padding: EdgeInsets.only(top: 4),
                                        child: Text(
                                          '⚠ Đã quá hạn thanh toán phần còn lại!',
                                          style: TextStyle(
                                            color: MssColors.danger,
                                            fontWeight: FontWeight.w700,
                                            fontSize: 12.5,
                                          ),
                                        ),
                                      ),
                                    const SizedBox(height: 8),
                                    ...finance.payments.map((p) => Padding(
                                          padding:
                                              const EdgeInsets.only(bottom: 8),
                                          child: Container(
                                            padding: const EdgeInsets.all(10),
                                            decoration: BoxDecoration(
                                              color: MssColors.surfaceMuted,
                                              borderRadius:
                                                  BorderRadius.circular(10),
                                            ),
                                            child: Row(
                                              mainAxisAlignment:
                                                  MainAxisAlignment
                                                      .spaceBetween,
                                              children: [
                                                Expanded(
                                                  child: Column(
                                                    crossAxisAlignment:
                                                        CrossAxisAlignment
                                                            .start,
                                                    children: [
                                                      Text(
                                                        '${p.paymentTypeLabelVi}: ${Formatters.formatVnd(p.amount)}',
                                                        style: const TextStyle(
                                                          fontWeight:
                                                              FontWeight.w700,
                                                          fontSize: 13,
                                                        ),
                                                      ),
                                                      Text(
                                                        'Trạng thái: ${p.status}',
                                                        style: const TextStyle(
                                                          fontSize: 12,
                                                          color: MssColors
                                                              .textMuted,
                                                        ),
                                                      ),
                                                    ],
                                                  ),
                                                ),
                                                if (p.status == 'PENDING')
                                                  ElevatedButton(
                                                    onPressed: _actionBusy
                                                        ? null
                                                        : () =>
                                                            _initiateAndShowSellerPayment(
                                                                p),
                                                    child: const Text(
                                                        'Thanh toán'),
                                                  ),
                                              ],
                                            ),
                                          ),
                                        )),
                                  ],

                                  // Multi-batch Shipments
                                  if (shipments.isNotEmpty) ...[
                                    const Divider(height: 20),
                                    Text(
                                      'Kiện hàng vận chuyển (${shipments.length} đợt)',
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w800,
                                        fontSize: 13.5,
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    ...shipments.map((sh) => Container(
                                          margin:
                                              const EdgeInsets.only(bottom: 8),
                                          padding: const EdgeInsets.all(10),
                                          decoration: BoxDecoration(
                                            color: MssColors.background,
                                            borderRadius:
                                                BorderRadius.circular(10),
                                            border: Border.all(
                                                color: MssColors.border),
                                          ),
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              Row(
                                                mainAxisAlignment:
                                                    MainAxisAlignment
                                                        .spaceBetween,
                                                children: [
                                                  Text(
                                                    'Kiện #${sh.shipmentId} • ${sh.carrierName ?? "Tự giao"}',
                                                    style: const TextStyle(
                                                      fontWeight:
                                                          FontWeight.w700,
                                                      fontSize: 13,
                                                    ),
                                                  ),
                                                  MssBadge(
                                                    label: ShipmentModel
                                                        .statusLabelVi(
                                                            sh.status),
                                                    tone: sh.status ==
                                                            'DELIVERED'
                                                        ? MssBadgeTone.success
                                                        : MssBadgeTone.info,
                                                  ),
                                                ],
                                              ),
                                              if (sh.trackingNumber != null &&
                                                  sh.trackingNumber!.isNotEmpty)
                                                Text(
                                                  'Mã vận đơn: ${sh.trackingNumber}',
                                                  style: const TextStyle(
                                                    fontSize: 12,
                                                    color: MssColors.textMuted,
                                                  ),
                                                ),
                                              const SizedBox(height: 4),
                                              ...sh.lines.map((line) => Text(
                                                    '• ${line.quantity}x ${line.productNameSnapshot} (${line.variantNameSnapshot})',
                                                    style: const TextStyle(
                                                        fontSize: 12),
                                                  )),
                                            ],
                                          ),
                                        )),
                                  ],

                                  // Existing Disputes
                                  if (finance != null &&
                                      finance.disputes.isNotEmpty) ...[
                                    const Divider(height: 20),
                                    const Text(
                                      'Hồ sơ khiếu nại',
                                      style: TextStyle(
                                        fontWeight: FontWeight.w800,
                                        fontSize: 13.5,
                                        color: MssColors.danger,
                                      ),
                                    ),
                                    const SizedBox(height: 6),
                                    ...finance.disputes.map((d) => Container(
                                          padding: const EdgeInsets.all(10),
                                          decoration: BoxDecoration(
                                            color: MssColors.dangerBg,
                                            borderRadius:
                                                BorderRadius.circular(10),
                                          ),
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                'Khiếu nại #${d.disputeId} (${d.status}): ${d.reason}',
                                                style: const TextStyle(
                                                  fontWeight: FontWeight.w700,
                                                  fontSize: 13,
                                                ),
                                              ),
                                              const SizedBox(height: 4),
                                              Text(
                                                d.description,
                                                style: const TextStyle(
                                                    fontSize: 12.5),
                                              ),
                                              if (d.sellerResponse != null &&
                                                  d.sellerResponse!
                                                      .isNotEmpty) ...[
                                                const SizedBox(height: 6),
                                                Text(
                                                  'Phản hồi từ gian hàng: ${d.sellerResponse}',
                                                  style: const TextStyle(
                                                    fontSize: 12.5,
                                                    fontWeight: FontWeight.w600,
                                                  ),
                                                ),
                                              ],
                                              if (d.canCustomerEscalate) ...[
                                                const SizedBox(height: 8),
                                                OutlinedButton(
                                                  onPressed: () async {
                                                    await ref
                                                        .read(
                                                            commerceApiProvider)
                                                        .escalateDispute(
                                                          sellerOrderId:
                                                              so.sellerOrderId,
                                                          disputeId:
                                                              d.disputeId,
                                                          note:
                                                              'Khách hàng yêu cầu Quản trị viên phân xử.',
                                                        );
                                                    await _loadOrderEverything();
                                                  },
                                                  child: const Text(
                                                      'Yêu cầu Admin phân xử'),
                                                ),
                                              ],
                                            ],
                                          ),
                                        )),
                                  ],

                                  // Customer Actions (Accept Order, Request Cancellation, Open Dispute)
                                  const SizedBox(height: 12),
                                  Wrap(
                                    spacing: 8,
                                    runSpacing: 8,
                                    children: [
                                      if (so.status == 'DELIVERED')
                                        ElevatedButton.icon(
                                          onPressed: _actionBusy
                                              ? null
                                              : () => _acceptDeliveredOrder(
                                                  so.sellerOrderId),
                                          icon: const Icon(
                                              Icons.verified_outlined,
                                              size: 18),
                                          label: const Text(
                                              'Xác nhận đã nhận & Nghiệm thu'),
                                        ),
                                      if ([
                                            'CONFIRMED',
                                            'DEPOSIT_PAID',
                                            'PROCESSING',
                                            'ALLOCATED'
                                          ].contains(so.status) &&
                                          (finance?.cancellations.isEmpty ??
                                              true))
                                        OutlinedButton.icon(
                                          onPressed: () =>
                                              _requestPaidCancellation(
                                                  so.sellerOrderId),
                                          icon: const Icon(
                                              Icons.cancel_schedule_send,
                                              size: 16),
                                          label:
                                              const Text('Yêu cầu hủy đơn'),
                                        ),
                                      if ((finance?.disputeWindowOpen ??
                                              false) &&
                                          (finance?.disputes.isEmpty ?? true))
                                        OutlinedButton.icon(
                                          onPressed: () => _openDisputeSheet(
                                              so.sellerOrderId),
                                          icon: const Icon(
                                              Icons.report_problem_outlined,
                                              color: MssColors.danger,
                                              size: 16),
                                          label: const Text(
                                            'Mở khiếu nại',
                                            style: TextStyle(
                                                color: MssColors.danger),
                                          ),
                                        ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      }),
                    ],
                  ),
                ),
    );
  }
}
