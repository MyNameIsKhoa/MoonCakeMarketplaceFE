import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:uuid/uuid.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/mss_theme.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/mss_widgets.dart';
import '../../auth/data/auth_models.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../catalog/presentation/catalog_controller.dart';
import '../../commerce/presentation/commerce_screens.dart';
import '../../profile/presentation/profile_screens.dart';
import '../data/rfq_api.dart';
import '../data/rfq_models.dart';
import '../data/stomp_chat_client.dart';

class B2BPortalScreen extends ConsumerStatefulWidget {
  final int initialSubTab;

  const B2BPortalScreen({super.key, this.initialSubTab = 0});

  @override
  ConsumerState<B2BPortalScreen> createState() => _B2BPortalScreenState();
}

class _B2BPortalScreenState extends ConsumerState<B2BPortalScreen> {
  late int _subTab; // 0: My RFQs, 1: Public RFQs, 2: Conversations
  List<RfqSummaryModel> _rfqs = const [];
  List<ConversationSummaryModel> _conversations = const [];
  int _unreadChatCount = 0;
  bool _loading = true;
  String? _error;
  String _statusFilter = '';

  @override
  void initState() {
    super.initState();
    _subTab = widget.initialSubTab;
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    final api = ref.read(rfqApiProvider);
    try {
      final unreadFuture = api.getUnreadConversationCount();
      if (_subTab == 2) {
        final convs = await api.listConversations();
        final unread = await unreadFuture;
        if (!mounted) return;
        setState(() {
          _conversations = convs;
          _unreadChatCount = unread;
          _loading = false;
        });
      } else {
        final rfqs = await api.listRfqs(
          mine: _subTab == 0,
          status: _statusFilter.isEmpty ? null : _statusFilter,
        );
        final unread = await unreadFuture;
        if (!mounted) return;
        setState(() {
          _rfqs = rfqs;
          _unreadChatCount = unread;
          _loading = false;
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e.toString();
      });
    }
  }

  Future<void> _openCreateRfq() async {
    final createdId = await Navigator.of(context).push<String>(
      MaterialPageRoute(builder: (_) => const RfqCreateScreen()),
    );
    if (createdId != null && mounted) {
      setState(() => _subTab = 0);
      await _loadData();
      if (!mounted) return;
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => RfqDetailScreen(rfqId: createdId),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final catalog = ref.watch(catalogControllerProvider);

    return Scaffold(
      body: Column(
        children: [
          Container(
            color: MssColors.surface,
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
            child: Column(
              children: [
                Row(
                  children: [
                    Expanded(
                      child: SegmentedButton<int>(
                        segments: [
                          const ButtonSegment(
                            value: 0,
                            label: Text('RFQ của tôi',
                                style: TextStyle(fontSize: 12)),
                          ),
                          const ButtonSegment(
                            value: 1,
                            label: Text('Sàn B2B',
                                style: TextStyle(fontSize: 12)),
                          ),
                          ButtonSegment(
                            value: 2,
                            label: Text(
                              _unreadChatCount > 0
                                  ? 'Tin nhắn ($_unreadChatCount)'
                                  : 'Tin nhắn',
                              style: const TextStyle(fontSize: 12),
                            ),
                          ),
                        ],
                        selected: {_subTab},
                        onSelectionChanged: (s) {
                          setState(() => _subTab = s.first);
                          _loadData();
                        },
                      ),
                    ),
                  ],
                ),
                if (_subTab != 2) ...[
                  const SizedBox(height: 10),
                  SizedBox(
                    height: 34,
                    child: ListView(
                      scrollDirection: Axis.horizontal,
                      children: [
                        _buildStatusChip('', 'Tất cả trạng thái'),
                        const SizedBox(width: 6),
                        _buildStatusChip('OPEN', 'Đang nhận báo giá'),
                        const SizedBox(width: 6),
                        _buildStatusChip('CLOSED', 'Đã đóng / Chốt'),
                        const SizedBox(width: 6),
                        _buildStatusChip('CANCELLED', 'Đã hủy'),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
          const Divider(),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                    ? MssEmptyState(
                        icon: Icons.error_outline,
                        title: 'Không tải được dữ liệu B2B',
                        description: _error,
                        actionLabel: 'Thử lại',
                        onAction: _loadData,
                      )
                    : _subTab == 2
                        ? _buildConversationList(catalog)
                        : _buildRfqList(),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: MssColors.primary,
        foregroundColor: Colors.white,
        onPressed: _openCreateRfq,
        icon: const Icon(Icons.post_add_rounded),
        label: const Text(
          'Tạo yêu cầu báo giá',
          style: TextStyle(fontWeight: FontWeight.w700),
        ),
      ),
    );
  }

  Widget _buildStatusChip(String value, String label) {
    final selected = _statusFilter == value;
    return ChoiceChip(
      label: Text(label),
      selected: selected,
      selectedColor: MssColors.primary,
      labelStyle: TextStyle(
        color: selected ? Colors.white : MssColors.textPrimary,
        fontSize: 12,
        fontWeight: FontWeight.w600,
      ),
      onSelected: (_) {
        setState(() => _statusFilter = value);
        _loadData();
      },
    );
  }

  Widget _buildRfqList() {
    if (_rfqs.isEmpty) {
      return MssEmptyState(
        icon: Icons.business_center_outlined,
        title: _subTab == 0
            ? 'Bạn chưa đăng yêu cầu báo giá (RFQ) nào'
            : 'Chưa có yêu cầu báo giá nào phù hợp',
        description:
            'Đăng yêu cầu báo giá số lượng lớn để các thương hiệu bánh Trung thu gửi báo giá cạnh tranh và chiết khấu doanh nghiệp.',
        actionLabel: '+ Đăng yêu cầu báo giá mới',
        onAction: _openCreateRfq,
      );
    }

    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 88),
        itemCount: _rfqs.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (context, index) {
          final rfq = _rfqs[index];
          return Card(
            child: InkWell(
              borderRadius: BorderRadius.circular(14),
              onTap: () async {
                await Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => RfqDetailScreen(rfqId: rfq.rfqId),
                  ),
                );
                _loadData();
              },
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        MssBadge(
                          label: 'RFQ #${rfq.rfqId}',
                          tone: MssBadgeTone.neutral,
                        ),
                        MssBadge(
                          label: RfqSummaryModel.statusLabelVi(rfq.status),
                          tone: rfq.status == 'OPEN'
                              ? MssBadgeTone.success
                              : rfq.status == 'CLOSED'
                                  ? MssBadgeTone.info
                                  : MssBadgeTone.danger,
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      rfq.title,
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 15.5,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 12,
                      runSpacing: 6,
                      children: [
                        Text(
                          'Số lượng: ${rfq.quantity} hộp',
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: MssColors.primary,
                          ),
                        ),
                        if (rfq.budgetAmount != null)
                          Text(
                            'Ngân sách: ${Formatters.formatVnd(rfq.budgetAmount)}',
                            style: const TextStyle(fontSize: 13),
                          ),
                        if (rfq.preferredDeliveryDate != null)
                          Text(
                            'Giao dự kiến: ${Formatters.formatDateVi(rfq.preferredDeliveryDate)}',
                            style: const TextStyle(
                              fontSize: 12.5,
                              color: MssColors.textMuted,
                            ),
                          ),
                      ],
                    ),
                    const Divider(height: 18),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          rfq.targetType == 'SELECTED_STORES'
                              ? 'Gửi gian hàng chọn lọc'
                              : 'Công khai toàn sàn',
                          style: const TextStyle(
                            fontSize: 12,
                            color: MssColors.textMuted,
                          ),
                        ),
                        const Text(
                          'Xem báo giá & thương lượng →',
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
    );
  }

  Widget _buildConversationList(CatalogState catalog) {
    if (_conversations.isEmpty) {
      return const MssEmptyState(
        icon: Icons.forum_outlined,
        title: 'Chưa có cuộc hội thoại thương lượng nào',
        description:
            'Mở một yêu cầu báo giá (RFQ) và bấm "Nhắn tin thương lượng" với gian hàng để bắt đầu trao đổi trực tiếp.',
      );
    }

    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 88),
        itemCount: _conversations.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (context, index) {
          final conv = _conversations[index];
          final storeIdInt = Formatters.parseInt(conv.storeId);
          final storeName =
              catalog.findStore(storeIdInt)?.name ?? 'Gian hàng #${conv.storeId}';
          return Card(
            child: ListTile(
              contentPadding: const EdgeInsets.all(12),
              leading: const CircleAvatar(
                backgroundColor: MssColors.primary50,
                child: Icon(Icons.storefront, color: MssColors.primary),
              ),
              title: Row(
                children: [
                  Expanded(
                    child: Text(
                      storeName,
                      style: const TextStyle(fontWeight: FontWeight.w800),
                    ),
                  ),
                  if (conv.unreadCount > 0)
                    MssBadge(
                      label: '${conv.unreadCount} mới',
                      tone: MssBadgeTone.primary,
                    ),
                ],
              ),
              subtitle: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 2),
                  Text(
                    'RFQ #${conv.rfqId}: ${conv.rfqTitle}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: MssColors.accent800,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    conv.lastMessagePreview ?? 'Bấm để mở hội thoại...',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: conv.unreadCount > 0
                          ? FontWeight.w700
                          : FontWeight.w400,
                    ),
                  ),
                ],
              ),
              onTap: () async {
                await Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => ChatScreen(
                      conversation: conv,
                      storeName: storeName,
                    ),
                  ),
                );
                _loadData();
              },
            ),
          );
        },
      ),
    );
  }
}

class RfqCreateScreen extends ConsumerStatefulWidget {
  const RfqCreateScreen({super.key});

  @override
  ConsumerState<RfqCreateScreen> createState() => _RfqCreateScreenState();
}

class _RfqCreateScreenState extends ConsumerState<RfqCreateScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleCtrl = TextEditingController();
  final _qtyCtrl = TextEditingController(text: '50');
  final _budgetCtrl = TextEditingController();
  final _locationCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();

  DateTime? _preferredDeliveryDate;
  String _targetType = 'ALL';
  final Set<String> _selectedStoreIds = {};
  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _titleCtrl.dispose();
    _qtyCtrl.dispose();
    _budgetCtrl.dispose();
    _locationCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDeliveryDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _preferredDeliveryDate ?? now.add(const Duration(days: 7)),
      firstDate: now.add(const Duration(days: 1)),
      lastDate: now.add(const Duration(days: 365)),
    );
    if (picked != null) {
      setState(() => _preferredDeliveryDate = picked);
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_targetType == 'SELECTED_STORES' && _selectedStoreIds.isEmpty) {
      setState(() => _error = 'Vui lòng chọn ít nhất 1 gian hàng nhận báo giá.');
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      final qty = Formatters.parseInt(_qtyCtrl.text, 50);
      final budget = _budgetCtrl.text.trim().isEmpty
          ? null
          : Formatters.parseDouble(_budgetCtrl.text);
      final deliveryStr = _preferredDeliveryDate != null
          ? DateFormat('yyyy-MM-dd').format(_preferredDeliveryDate!)
          : null;

      final created = await ref.read(rfqApiProvider).createRfq(
            title: _titleCtrl.text.trim(),
            quantity: qty,
            budgetAmount: budget,
            preferredDeliveryDate: deliveryStr,
            deliveryLocation: _locationCtrl.text.trim(),
            customizationNotes: _notesCtrl.text.trim(),
            targetType: _targetType,
            targetStoreIds: _targetType == 'SELECTED_STORES'
                ? _selectedStoreIds.toList()
                : null,
          );
      if (!mounted) return;
      Navigator.of(context).pop(created.rfqId);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.localizedMessage);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final stores = ref.watch(catalogControllerProvider).stores;

    return Scaffold(
      appBar: AppBar(title: const Text('Đăng yêu cầu báo giá B2B')),
      body: Form(
        key: _formKey,
        child: ListView(
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
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    TextFormField(
                      controller: _titleCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Tiêu đề nhu cầu đặt bánh *',
                        hintText:
                            'VD: Đặt 200 hộp quà Trung thu biếu đối tác doanh nghiệp',
                      ),
                      validator: (v) {
                        if (v == null || v.trim().isEmpty) {
                          return 'Vui lòng nhập tiêu đề yêu cầu báo giá.';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            controller: _qtyCtrl,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(
                              labelText: 'Số lượng hộp *',
                              hintText: '50',
                            ),
                            validator: (v) {
                              final n = Formatters.parseInt(v);
                              if (n < 1 || n > 1000000) {
                                return 'Số lượng từ 1 – 1.000.000';
                              }
                              return null;
                            },
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: TextFormField(
                            controller: _budgetCtrl,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(
                              labelText: 'Ngân sách dự kiến (VND)',
                              hintText: '50000000',
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    InkWell(
                      onTap: _pickDeliveryDate,
                      child: InputDecorator(
                        decoration: const InputDecoration(
                          labelText: 'Ngày giao hàng mong muốn',
                          suffixIcon: Icon(Icons.calendar_today_outlined),
                        ),
                        child: Text(
                          _preferredDeliveryDate != null
                              ? DateFormat('dd/MM/yyyy')
                                  .format(_preferredDeliveryDate!)
                              : 'Chọn ngày giao dự kiến',
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),
                    TextFormField(
                      controller: _locationCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Khu vực / Địa điểm nhận hàng',
                        hintText: 'Quận 1, TP. Hồ Chí Minh',
                      ),
                    ),
                    const SizedBox(height: 14),
                    TextFormField(
                      controller: _notesCtrl,
                      maxLines: 3,
                      decoration: const InputDecoration(
                        labelText: 'Yêu cầu in logo, thiệp chúc & đóng gói',
                        hintText:
                            'In logo công ty ép kim lên nắp hộp, kèm túi giấy đồng bộ...',
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Phạm vi gửi yêu cầu báo giá',
                      style: TextStyle(fontWeight: FontWeight.w800),
                    ),
                    RadioListTile<String>(
                      contentPadding: EdgeInsets.zero,
                      value: 'ALL',
                      groupValue: _targetType,
                      title: const Text('Gửi công khai tới tất cả gian hàng'),
                      onChanged: (v) => setState(() => _targetType = v!),
                    ),
                    RadioListTile<String>(
                      contentPadding: EdgeInsets.zero,
                      value: 'SELECTED_STORES',
                      groupValue: _targetType,
                      title: const Text(
                          'Chỉ gửi cho các thương hiệu được chọn (tối đa 20)'),
                      onChanged: (v) => setState(() => _targetType = v!),
                    ),
                    if (_targetType == 'SELECTED_STORES') ...[
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: stores.map((s) {
                          final idStr = s.storeId.toString();
                          final selected = _selectedStoreIds.contains(idStr);
                          return FilterChip(
                            label: Text(s.name),
                            selected: selected,
                            onSelected: (val) {
                              setState(() {
                                if (val && _selectedStoreIds.length < 20) {
                                  _selectedStoreIds.add(idStr);
                                } else {
                                  _selectedStoreIds.remove(idStr);
                                }
                              });
                            },
                          );
                        }).toList(),
                      ),
                    ],
                    const SizedBox(height: 20),
                    ElevatedButton(
                      onPressed: _submitting ? null : _submit,
                      child: _submitting
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2, color: Colors.white),
                            )
                          : const Text('Đăng yêu cầu báo giá'),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class RfqDetailScreen extends ConsumerStatefulWidget {
  final String rfqId;

  const RfqDetailScreen({super.key, required this.rfqId});

  @override
  ConsumerState<RfqDetailScreen> createState() => _RfqDetailScreenState();
}

class _RfqDetailScreenState extends ConsumerState<RfqDetailScreen> {
  RfqDetailModel? _rfq;
  List<QuotationSummaryModel> _quotations = const [];
  bool _loading = true;
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadDetail();
  }

  Future<void> _loadDetail() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    final api = ref.read(rfqApiProvider);
    try {
      final rfq = await api.getRfq(widget.rfqId);
      List<QuotationSummaryModel> quotes = const [];
      try {
        quotes = await api.listQuotationsForRfq(widget.rfqId);
      } catch (_) {}
      if (!mounted) return;
      setState(() {
        _rfq = rfq;
        _quotations = quotes;
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

  Future<void> _closeOrCancelRfq({required bool cancel}) async {
    setState(() => _busy = true);
    try {
      final api = ref.read(rfqApiProvider);
      if (cancel) {
        await api.cancelRfq(widget.rfqId);
      } else {
        await api.closeRfq(widget.rfqId);
      }
      await _loadDetail();
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text(e.localizedMessage),
            backgroundColor: MssColors.danger),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _startChatWithStore(String storeId, String storeName) async {
    setState(() => _busy = true);
    try {
      final conv = await ref.read(rfqApiProvider).openConversation(
            rfqId: widget.rfqId,
            storeId: storeId,
          );
      if (!mounted) return;
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => ChatScreen(
            conversation: conv,
            storeName: storeName,
          ),
        ),
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text(e.localizedMessage),
            backgroundColor: MssColors.danger),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _openQuotationDetailSheet(
    QuotationSummaryModel summary,
    String storeName,
  ) async {
    QuotationDetailModel detail;
    try {
      detail = await ref.read(rfqApiProvider).getQuotation(summary.quotationId);
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text(e.localizedMessage),
            backgroundColor: MssColors.danger),
      );
      return;
    }

    if (!mounted) return;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
        decoration: const BoxDecoration(
          color: MssColors.surface,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      '$storeName • Báo giá v${detail.version}',
                      style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  MssBadge(
                    label: QuotationSummaryModel.statusLabelVi(detail.status),
                    tone: detail.status == 'ACCEPTED'
                        ? MssBadgeTone.success
                        : MssBadgeTone.info,
                  ),
                ],
              ),
              const Divider(height: 18),
              ...detail.items.map((item) => Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            '${item.quantity}x ${item.itemName}',
                            style: const TextStyle(
                                fontWeight: FontWeight.w600, fontSize: 13.5),
                          ),
                        ),
                        Text(
                          Formatters.formatVnd(item.lineTotal),
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                      ],
                    ),
                  )),
              const Divider(height: 16),
              Text(
                'Phí vận chuyển: ${Formatters.formatVnd(detail.shippingFee)}',
                style: const TextStyle(fontSize: 13),
              ),
              Text(
                'Tỷ lệ đặt cọc: ${detail.depositPercent.toStringAsFixed(0)}%',
                style: const TextStyle(fontSize: 13),
              ),
              if (detail.validUntil != null)
                Text(
                  'Hiệu lực đến: ${Formatters.formatDateVi(detail.validUntil)}',
                  style: const TextStyle(fontSize: 13),
                ),
              if (detail.termsNotes != null &&
                  detail.termsNotes!.isNotEmpty) ...[
                const SizedBox(height: 6),
                Text(
                  'Điều khoản & ghi chú: ${detail.termsNotes}',
                  style: const TextStyle(
                      fontSize: 12.5, color: MssColors.textMuted),
                ),
              ],
              const SizedBox(height: 10),
              Text(
                'Tổng báo giá: ${Formatters.formatVnd(detail.totalAmount)}',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: MssColors.primary,
                ),
              ),
              const SizedBox(height: 16),
              if (detail.status == 'SUBMITTED')
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () async {
                          Navigator.of(ctx).pop();
                          await _rejectQuotation(detail.quotationId);
                        },
                        child: const Text('Từ chối'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () async {
                          Navigator.of(ctx).pop();
                          await _acceptQuotationFlow(detail);
                        },
                        child: const Text('Chấp nhận & Tạo đơn'),
                      ),
                    ),
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _rejectQuotation(String quotationId) async {
    setState(() => _busy = true);
    try {
      await ref.read(rfqApiProvider).rejectQuotation(quotationId);
      await _loadDetail();
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text(e.localizedMessage),
            backgroundColor: MssColors.danger),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _acceptQuotationFlow(QuotationDetailModel quotation) async {
    List<AddressModel> addresses =
        await ref.read(identityApiProvider).listAddresses();
    if (addresses.isEmpty && mounted) {
      final created = await showModalBottomSheet<AddressModel>(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (_) => const AddressFormSheet(),
      );
      if (created != null) {
        addresses = [created];
      }
    }
    if (addresses.isEmpty || !mounted) return;

    int selectedAddressId = addresses.first.addressId;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('Chọn địa chỉ nhận đơn B2B'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: addresses
                .map(
                  (a) => RadioListTile<int>(
                    contentPadding: EdgeInsets.zero,
                    value: a.addressId,
                    groupValue: selectedAddressId,
                    onChanged: (v) {
                      if (v != null) {
                        setDialogState(() => selectedAddressId = v);
                      }
                    },
                    title: Text(
                      '${a.recipientName} • ${a.phone}',
                      style: const TextStyle(
                          fontSize: 13.5, fontWeight: FontWeight.w700),
                    ),
                    subtitle: Text(
                      a.fullAddress,
                      style: const TextStyle(fontSize: 12),
                    ),
                  ),
                )
                .toList(),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: const Text('Hủy'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.of(ctx).pop(true),
              child: const Text('Chốt báo giá & Tạo đơn'),
            ),
          ],
        ),
      ),
    );
    if (confirmed != true) return;

    setState(() => _busy = true);
    try {
      final res = await ref.read(rfqApiProvider).acceptQuotation(
            quotationId: quotation.quotationId,
            quotationVersion: quotation.version,
            addressId: selectedAddressId.toString(),
          );
      await _loadDetail();
      if (!mounted) return;
      final orderId = Formatters.parseInt(res.commerceCustomerOrderId);
      if (orderId > 0) {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => OrderDetailScreen(customerOrderId: orderId),
          ),
        );
      }
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text(e.localizedMessage),
            backgroundColor: MssColors.danger),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final catalog = ref.watch(catalogControllerProvider);
    final auth = ref.watch(authControllerProvider);
    final rfq = _rfq;
    final isOwner = rfq != null &&
        auth.user != null &&
        rfq.customerId == auth.user!.userId.toString();

    return Scaffold(
      appBar: AppBar(title: Text('Chi tiết RFQ #${widget.rfqId}')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null || rfq == null
              ? MssEmptyState(
                  icon: Icons.error_outline,
                  title: 'Không tải được chi tiết RFQ',
                  description: _error,
                  actionLabel: 'Thử lại',
                  onAction: _loadDetail,
                )
              : RefreshIndicator(
                  onRefresh: _loadDetail,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  MssBadge(
                                    label: 'RFQ #${rfq.rfqId}',
                                    tone: MssBadgeTone.neutral,
                                  ),
                                  MssBadge(
                                    label: RfqSummaryModel.statusLabelVi(
                                        rfq.status),
                                    tone: rfq.status == 'OPEN'
                                        ? MssBadgeTone.success
                                        : MssBadgeTone.info,
                                  ),
                                ],
                              ),
                              const SizedBox(height: 10),
                              Text(
                                rfq.title,
                                style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              const SizedBox(height: 10),
                              Text(
                                '• Số lượng cần đặt: ${rfq.quantity} hộp',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                  color: MssColors.primary,
                                ),
                              ),
                              if (rfq.budgetAmount != null)
                                Text(
                                  '• Ngân sách dự kiến: ${Formatters.formatVnd(rfq.budgetAmount)}',
                                ),
                              if (rfq.preferredDeliveryDate != null)
                                Text(
                                  '• Ngày giao dự kiến: ${Formatters.formatDateVi(rfq.preferredDeliveryDate)}',
                                ),
                              if (rfq.deliveryLocation != null &&
                                  rfq.deliveryLocation!.isNotEmpty)
                                Text(
                                  '• Địa điểm giao: ${rfq.deliveryLocation}',
                                ),
                              if (rfq.customizationNotes != null &&
                                  rfq.customizationNotes!.isNotEmpty) ...[
                                const SizedBox(height: 8),
                                Text(
                                  'Yêu cầu đóng gói / in logo:\n${rfq.customizationNotes}',
                                  style: const TextStyle(
                                    fontSize: 13,
                                    color: MssColors.textMuted,
                                  ),
                                ),
                              ],
                              if (isOwner && rfq.status == 'OPEN') ...[
                                const Divider(height: 22),
                                Wrap(
                                  spacing: 10,
                                  runSpacing: 8,
                                  children: [
                                    OutlinedButton.icon(
                                      onPressed: _busy
                                          ? null
                                          : () =>
                                              _closeOrCancelRfq(cancel: false),
                                      icon: const Icon(Icons.lock_outline,
                                          size: 16),
                                      label: const Text('Đóng nhận báo giá'),
                                    ),
                                    TextButton.icon(
                                      onPressed: _busy
                                          ? null
                                          : () =>
                                              _closeOrCancelRfq(cancel: true),
                                      icon: const Icon(Icons.cancel_outlined,
                                          color: MssColors.danger, size: 16),
                                      label: const Text(
                                        'Hủy RFQ',
                                        style:
                                            TextStyle(color: MssColors.danger),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ],
                          ),
                        ),
                      ),

                      if (isOwner) ...[
                        const SizedBox(height: 20),
                        MssSectionHeader(
                          title: 'Báo giá từ các gian hàng (${_quotations.length})',
                          subtitle:
                              'So sánh giá, tỷ lệ cọc và nhắn tin thương lượng trực tiếp',
                        ),
                        const SizedBox(height: 10),
                        if (_quotations.isEmpty)
                          const Card(
                            child: Padding(
                              padding: EdgeInsets.all(16),
                              child: Text(
                                'Chưa có gian hàng nào gửi báo giá cho yêu cầu này. Bạn cũng có thể chọn một gian hàng bên dưới để nhắn tin trao đổi trước.',
                                style: TextStyle(color: MssColors.textMuted),
                              ),
                            ),
                          )
                        else
                          ..._quotations.map((q) {
                            final storeIdInt = Formatters.parseInt(q.storeId);
                            final storeName = catalog
                                    .findStore(storeIdInt)
                                    ?.name ??
                                'Gian hàng #${q.storeId}';
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: Card(
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
                                          Expanded(
                                            child: Text(
                                              '$storeName (Phiên bản v${q.version})',
                                              style: const TextStyle(
                                                fontWeight: FontWeight.w800,
                                                fontSize: 15,
                                              ),
                                            ),
                                          ),
                                          MssBadge(
                                            label: QuotationSummaryModel
                                                .statusLabelVi(q.status),
                                            tone: q.status == 'ACCEPTED'
                                                ? MssBadgeTone.success
                                                : MssBadgeTone.info,
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 6),
                                      Text(
                                        'Tổng báo giá: ${Formatters.formatVnd(q.totalAmount)}  •  Cọc: ${q.depositPercent.toStringAsFixed(0)}%',
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w800,
                                          color: MssColors.primary,
                                        ),
                                      ),
                                      const SizedBox(height: 10),
                                      Wrap(
                                        spacing: 8,
                                        runSpacing: 8,
                                        children: [
                                          ElevatedButton(
                                            onPressed: () =>
                                                _openQuotationDetailSheet(
                                                    q, storeName),
                                            child: const Text(
                                                'Xem chi tiết & Quyết định'),
                                          ),
                                          OutlinedButton.icon(
                                            onPressed: () =>
                                                _startChatWithStore(
                                                    q.storeId, storeName),
                                            icon: const Icon(
                                                Icons.chat_bubble_outline,
                                                size: 16),
                                            label: const Text('Thương lượng'),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            );
                          }),

                        // Quick chat with any store for this RFQ
                        const SizedBox(height: 18),
                        const MssSectionHeader(
                          title: 'Nhắn tin thương lượng với gian hàng',
                          subtitle:
                              'Chọn thương hiệu bất kỳ để mở phòng chat trực tiếp cho RFQ này',
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: catalog.stores.take(10).map((s) {
                            return ActionChip(
                              avatar: const Icon(Icons.chat_outlined,
                                  size: 15, color: MssColors.primary),
                              label: Text(s.name),
                              onPressed: () => _startChatWithStore(
                                s.storeId.toString(),
                                s.name,
                              ),
                            );
                          }).toList(),
                        ),
                      ],
                    ],
                  ),
                ),
    );
  }
}

class ChatScreen extends ConsumerStatefulWidget {
  final ConversationSummaryModel conversation;
  final String storeName;

  const ChatScreen({
    super.key,
    required this.conversation,
    required this.storeName,
  });

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  static const Uuid _uuid = Uuid();
  final _msgCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();

  List<ChatMessageModel> _messages = const [];
  StompChatClient? _stompClient;
  StompStatus _stompStatus = StompStatus.disconnected;
  String? _wsError;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _initChat();
  }

  @override
  void dispose() {
    _stompClient?.disconnect();
    _msgCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  Future<void> _initChat() async {
    final api = ref.read(rfqApiProvider);
    final storage = ref.read(appStorageProvider);
    try {
      final list = await api.listMessages(widget.conversation.conversationId);
      if (!mounted) return;
      setState(() {
        _messages = list;
        _loading = false;
      });
      if (list.isNotEmpty) {
        api.markConversationRead(
          widget.conversation.conversationId,
          lastReadMessageId: list.last.messageId,
        );
      } else {
        api.markConversationRead(widget.conversation.conversationId);
      }

      final token = await storage.readAccessToken();
      if (token != null && token.isNotEmpty && mounted) {
        _stompClient = StompChatClient(
          accessToken: token,
          conversationId: widget.conversation.conversationId,
          onMessage: _handleIncomingMessage,
          onStatusChange: (status, err) {
            if (!mounted) return;
            setState(() {
              _stompStatus = status;
              _wsError = err;
            });
          },
        );
        await _stompClient!.connect();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _loading = false;
          _wsError = e.toString();
        });
      }
    }
  }

  void _handleIncomingMessage(ChatMessageModel incoming) {
    if (!mounted) return;
    final exists = _messages.any((m) =>
        m.messageId == incoming.messageId ||
        (incoming.clientMessageId != null &&
            m.clientMessageId == incoming.clientMessageId));
    if (!exists) {
      setState(() {
        _messages = [..._messages, incoming];
      });
      ref.read(rfqApiProvider).markConversationRead(
            widget.conversation.conversationId,
            lastReadMessageId: incoming.messageId,
          );
    }
  }

  void _sendMessage() {
    final text = _msgCtrl.text.trim();
    if (text.isEmpty) return;
    final client = _stompClient;
    if (client == null || _stompStatus != StompStatus.connected) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Đang kết nối lại kênh chat thời gian thực...'),
          backgroundColor: MssColors.warning,
        ),
      );
      _stompClient?.connect();
      return;
    }

    try {
      client.sendChatMessage(
        messageText: text,
        clientMessageId: _uuid.v4(),
      );
      _msgCtrl.clear();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text(e.toString()), backgroundColor: MssColors.danger),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final currentUserId =
        ref.watch(authControllerProvider).user?.userId.toString() ?? '';

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.storeName, style: const TextStyle(fontSize: 16)),
            Text(
              'RFQ #${widget.conversation.rfqId} • ${_stompStatus == StompStatus.connected ? "Trực tuyến" : "Đang kết nối..."}',
              style: TextStyle(
                fontSize: 11.5,
                color: Colors.white.withOpacity(0.85),
              ),
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          if (_wsError != null)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              color: MssColors.warningBg,
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      _wsError!,
                      style: const TextStyle(
                          fontSize: 12, color: MssColors.warning),
                    ),
                  ),
                  TextButton(
                    onPressed: () => _stompClient?.connect(),
                    child: const Text('Kết nối lại'),
                  ),
                ],
              ),
            ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _messages.isEmpty
                    ? const MssEmptyState(
                        icon: Icons.chat_bubble_outline,
                        title: 'Bắt đầu thương lượng với gian hàng',
                        description:
                            'Hãy gửi yêu cầu chi tiết về mẫu hộp, chiết khấu số lượng hoặc tiến độ giao hàng.',
                      )
                    : ListView.builder(
                        controller: _scrollCtrl,
                        padding: const EdgeInsets.all(16),
                        itemCount: _messages.length,
                        itemBuilder: (context, index) {
                          final msg = _messages[index];
                          final isMe = msg.senderUserId == currentUserId;
                          return Align(
                            alignment: isMe
                                ? Alignment.centerRight
                                : Alignment.centerLeft,
                            child: Container(
                              margin: const EdgeInsets.only(bottom: 10),
                              constraints: BoxConstraints(
                                maxWidth:
                                    MediaQuery.of(context).size.width * 0.76,
                              ),
                              padding: const EdgeInsets.symmetric(
                                horizontal: 14,
                                vertical: 10,
                              ),
                              decoration: BoxDecoration(
                                color: isMe
                                    ? MssColors.primary
                                    : MssColors.surface,
                                borderRadius: BorderRadius.circular(14),
                                border: isMe
                                    ? null
                                    : Border.all(color: MssColors.border),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    msg.messageText,
                                    style: TextStyle(
                                      color: isMe
                                          ? Colors.white
                                          : MssColors.textPrimary,
                                      fontSize: 14,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    Formatters.formatDateTimeVi(msg.createdAt),
                                    style: TextStyle(
                                      color: isMe
                                          ? Colors.white.withOpacity(0.75)
                                          : MssColors.textMuted,
                                      fontSize: 10.5,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),
          Container(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
            decoration: const BoxDecoration(
              color: MssColors.surface,
              border: Border(top: BorderSide(color: MssColors.border)),
            ),
            child: SafeArea(
              top: false,
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _msgCtrl,
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _sendMessage(),
                      decoration: const InputDecoration(
                        hintText: 'Nhập tin nhắn thương lượng...',
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    style: IconButton.styleFrom(
                      backgroundColor: MssColors.primary,
                      foregroundColor: Colors.white,
                    ),
                    onPressed: _sendMessage,
                    icon: const Icon(Icons.send_rounded),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
