import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/mss_theme.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/mss_widgets.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../auth/presentation/auth_screens.dart';
import '../../commerce/presentation/cart_controller.dart';
import '../../commerce/presentation/commerce_screens.dart';
import '../data/catalog_models.dart';
import 'catalog_controller.dart';

class HomeScreen extends ConsumerStatefulWidget {
  final VoidCallback onNavigateToProducts;
  final VoidCallback onNavigateToB2B;
  final ValueChanged<int?> onSelectCategoryFilter;

  const HomeScreen({
    super.key,
    required this.onNavigateToProducts,
    required this.onNavigateToB2B,
    required this.onSelectCategoryFilter,
  });

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  String _selectedGroup = 'all';
  String _storeSearch = '';

  static const List<Map<String, String>> _storeGroups = [
    {'key': 'all', 'label': 'Tất cả gian hàng'},
    {'key': 'traditional', 'label': 'Truyền thống'},
    {'key': 'premium', 'label': 'Quà biếu cao cấp'},
    {'key': 'modern', 'label': 'Hiện đại'},
    {'key': 'vegetarian', 'label': 'Bánh chay'},
  ];

  @override
  Widget build(BuildContext context) {
    final catalog = ref.watch(catalogControllerProvider);
    final auth = ref.watch(authControllerProvider);

    final filteredStores = catalog.stores.where((s) {
      if (_selectedGroup != 'all' && s.groupKey != _selectedGroup) {
        return false;
      }
      if (_storeSearch.trim().isNotEmpty) {
        final q = _storeSearch.trim().toLowerCase();
        return s.name.toLowerCase().contains(q) ||
            (s.description ?? '').toLowerCase().contains(q);
      }
      return true;
    }).toList();

    return RefreshIndicator(
      onRefresh: () => ref.read(catalogControllerProvider.notifier).refresh(),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 28),
        children: [
          // Hero Banner
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [
                  MssColors.primary950,
                  MssColors.primary900,
                  MssColors.primary
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(18),
              boxShadow: [
                BoxShadow(
                  color: MssColors.primary900.withOpacity(0.18),
                  blurRadius: 16,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: MssColors.accent.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(999),
                    border:
                        Border.all(color: MssColors.accent400.withOpacity(0.5)),
                  ),
                  child: const Text(
                    'MÙA TRĂNG ĐOÀN VIÊN • CHÍNH HÃNG 100%',
                    style: TextStyle(
                      color: MssColors.accent400,
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.4,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'Tinh Hoa Bánh Trung Thu Từ Các Thương Hiệu Danh Tiếng',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    height: 1.25,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Đặt mua lẻ giao tận nơi hoặc gửi yêu cầu báo giá số lượng lớn trực tiếp tới 15+ thương hiệu uy tín.',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.88),
                    fontSize: 13.5,
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 16),
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: [
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: MssColors.accent,
                        foregroundColor: MssColors.primary950,
                      ),
                      onPressed: widget.onNavigateToProducts,
                      icon: const Icon(Icons.shopping_bag_outlined, size: 18),
                      label: const Text(
                        'Khám phá bánh lẻ',
                        style: TextStyle(fontWeight: FontWeight.w800),
                      ),
                    ),
                    OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.white,
                        side: BorderSide(color: Colors.white.withOpacity(0.5)),
                      ),
                      onPressed: widget.onNavigateToB2B,
                      icon: const Icon(Icons.business_center_outlined, size: 18),
                      label: const Text('Báo giá Doanh nghiệp (B2B)'),
                    ),
                  ],
                ),
              ],
            ),
          ),

          if (catalog.error != null) ...[
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: MssColors.dangerBg,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  const Icon(Icons.error_outline, color: MssColors.danger),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      catalog.error!,
                      style: const TextStyle(
                        color: MssColors.danger,
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  TextButton(
                    onPressed: () =>
                        ref.read(catalogControllerProvider.notifier).refresh(),
                    child: const Text('Thử lại'),
                  ),
                ],
              ),
            ),
          ],

          const SizedBox(height: 22),

          // Categories horizontal bar
          if (catalog.categories.isNotEmpty) ...[
            MssSectionHeader(
              title: 'Danh mục bánh Trung thu',
              subtitle: 'Chọn nhanh dòng bánh yêu thích của bạn',
              trailingText: 'Xem tất cả',
              onTrailingTap: () {
                widget.onSelectCategoryFilter(null);
                widget.onNavigateToProducts();
              },
            ),
            const SizedBox(height: 10),
            SizedBox(
              height: 44,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: catalog.categories.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (context, index) {
                  final cat = catalog.categories[index];
                  return ActionChip(
                    avatar: const Icon(
                      Icons.cake_outlined,
                      size: 16,
                      color: MssColors.primary,
                    ),
                    backgroundColor: MssColors.surface,
                    side: const BorderSide(color: MssColors.borderStrong),
                    label: Text(
                      cat.name,
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        color: MssColors.textPrimary,
                      ),
                    ),
                    onPressed: () {
                      widget.onSelectCategoryFilter(cat.categoryId);
                      widget.onNavigateToProducts();
                    },
                  );
                },
              ),
            ),
            const SizedBox(height: 22),
          ],

          // Partner Stores Section
          MssSectionHeader(
            title: 'Gian hàng chính hãng (${catalog.stores.length})',
            subtitle: 'Chọn thương hiệu để xem ưu đãi và sản phẩm đặc trưng',
            trailingText: 'Tất cả thương hiệu',
            onTrailingTap: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const StoreListScreen()),
              );
            },
          ),
          const SizedBox(height: 10),

          // Store group filter pills
          SizedBox(
            height: 38,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: _storeGroups.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final g = _storeGroups[index];
                final selected = _selectedGroup == g['key'];
                return ChoiceChip(
                  label: Text(g['label']!),
                  selected: selected,
                  selectedColor: MssColors.primary,
                  labelStyle: TextStyle(
                    color: selected ? Colors.white : MssColors.textPrimary,
                    fontWeight: FontWeight.w600,
                    fontSize: 12.5,
                  ),
                  onSelected: (_) =>
                      setState(() => _selectedGroup = g['key']!),
                );
              },
            ),
          ),
          const SizedBox(height: 10),

          TextField(
            onChanged: (v) => setState(() => _storeSearch = v),
            decoration: const InputDecoration(
              hintText: 'Tìm thương hiệu (Kinh Đô, Givral, Như Lan, Brodard...)',
              prefixIcon: Icon(Icons.search),
            ),
          ),
          const SizedBox(height: 14),

          if (catalog.loading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 40),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (filteredStores.isEmpty)
            const MssEmptyState(
              icon: Icons.storefront_outlined,
              title: 'Không tìm thấy gian hàng phù hợp',
              description: 'Hãy thử đổi nhóm thương hiệu hoặc từ khóa tìm kiếm.',
            )
          else
            ...filteredStores.map((store) {
              final storeProducts = catalog.products
                  .where((p) => p.storeId == store.storeId)
                  .take(3)
                  .toList();
              return Padding(
                padding: const EdgeInsets.only(bottom: 14),
                child: _StoreFeaturedCard(
                  store: store,
                  featuredProducts: storeProducts,
                  wishlistIds: auth.wishlistIds,
                  onTapStore: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => StoreDetailScreen(store: store),
                      ),
                    );
                  },
                  onTapProduct: (product) {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => ProductDetailScreen(product: product),
                      ),
                    );
                  },
                ),
              );
            }),
        ],
      ),
    );
  }
}

class _StoreFeaturedCard extends StatelessWidget {
  final StoreModel store;
  final List<ProductSummaryModel> featuredProducts;
  final List<String> wishlistIds;
  final VoidCallback onTapStore;
  final ValueChanged<ProductSummaryModel> onTapProduct;

  const _StoreFeaturedCard({
    required this.store,
    required this.featuredProducts,
    required this.wishlistIds,
    required this.onTapStore,
    required this.onTapProduct,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTapStore,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: MssColors.border),
                    ),
                    padding: const EdgeInsets.all(4),
                    child: MssImage(
                      imageUrl: store.logoUrl,
                      fit: BoxFit.contain,
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                store.name,
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w800,
                                  color: MssColors.textPrimary,
                                ),
                              ),
                            ),
                            MssBadge(
                              label: store.categoryLabel,
                              tone: MssBadgeTone.accent,
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          store.description ?? 'Thương hiệu bánh Trung thu chính hãng',
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 12.5,
                            color: MssColors.textMuted,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              if (featuredProducts.isNotEmpty) ...[
                const SizedBox(height: 12),
                const Divider(),
                const SizedBox(height: 10),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: List.generate(3, (slot) {
                    if (slot >= featuredProducts.length) {
                      return const Expanded(child: SizedBox.shrink());
                    }
                    final p = featuredProducts[slot];
                    return Expanded(
                      child: GestureDetector(
                        onTap: () => onTapProduct(p),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 4),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              AspectRatio(
                                aspectRatio: 1.15,
                                child: MssImage(
                                  imageUrl: p.imageUrl,
                                  borderRadius: BorderRadius.circular(10),
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                p.name,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              Text(
                                Formatters.formatVnd(p.minPrice),
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w800,
                                  color: MssColors.primary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  }),
                ),
              ],
              const SizedBox(height: 10),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      store.shippingFee > 0
                          ? 'Phí giao tiêu chuẩn: ${Formatters.formatVnd(store.shippingFee)}'
                          : 'Miễn phí vận chuyển',
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 12,
                        color: MssColors.textMuted,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  const Text(
                    'Xem gian hàng →',
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
  }
}

class StoreListScreen extends ConsumerStatefulWidget {
  const StoreListScreen({super.key});

  @override
  ConsumerState<StoreListScreen> createState() => _StoreListScreenState();
}

class _StoreListScreenState extends ConsumerState<StoreListScreen> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final catalog = ref.watch(catalogControllerProvider);
    final stores = catalog.stores.where((s) {
      if (_query.trim().isEmpty) return true;
      final q = _query.trim().toLowerCase();
      return s.name.toLowerCase().contains(q) ||
          (s.description ?? '').toLowerCase().contains(q);
    }).toList();

    return Scaffold(
      appBar: AppBar(title: const Text('Tất cả thương hiệu chính hãng')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              onChanged: (v) => setState(() => _query = v),
              decoration: const InputDecoration(
                hintText: 'Tìm thương hiệu bánh Trung thu...',
                prefixIcon: Icon(Icons.search),
              ),
            ),
          ),
          Expanded(
            child: stores.isEmpty
                ? const MssEmptyState(
                    icon: Icons.store_outlined,
                    title: 'Không tìm thấy thương hiệu phù hợp',
                  )
                : ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                    itemCount: stores.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      final store = stores[index];
                      return Card(
                        child: ListTile(
                          contentPadding: const EdgeInsets.all(12),
                          leading: Container(
                            width: 56,
                            height: 56,
                            padding: const EdgeInsets.all(4),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: MssColors.border),
                            ),
                            child: MssImage(
                              imageUrl: store.logoUrl,
                              fit: BoxFit.contain,
                            ),
                          ),
                          title: Text(
                            store.name,
                            style: const TextStyle(fontWeight: FontWeight.w800),
                          ),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const SizedBox(height: 4),
                              Text(
                                store.description ?? store.categoryLabel,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 12.5),
                              ),
                              const SizedBox(height: 6),
                              MssBadge(
                                label: store.categoryLabel,
                                tone: MssBadgeTone.accent,
                              ),
                            ],
                          ),
                          trailing: const Icon(Icons.chevron_right),
                          onTap: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => StoreDetailScreen(store: store),
                              ),
                            );
                          },
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

class StoreDetailScreen extends ConsumerStatefulWidget {
  final StoreModel store;

  const StoreDetailScreen({super.key, required this.store});

  @override
  ConsumerState<StoreDetailScreen> createState() => _StoreDetailScreenState();
}

class _StoreDetailScreenState extends ConsumerState<StoreDetailScreen> {
  List<StoreBranchModel> _branches = const [];
  List<PromotionModel> _promotions = const [];
  List<ReviewModel> _reviews = const [];
  bool _loadingExtra = true;
  int? _selectedCategoryId;
  String _search = '';
  String _sortBy = 'default';

  @override
  void initState() {
    super.initState();
    _loadStoreExtras();
  }

  Future<void> _loadStoreExtras() async {
    final api = ref.read(catalogApiProvider);
    try {
      final results = await Future.wait([
        api.listStoreBranches(widget.store.storeId),
        api.listPromotions(storeId: widget.store.storeId),
        api.listReviews(storeId: widget.store.storeId),
      ]);
      if (!mounted) return;
      setState(() {
        _branches = (results[0] as List<StoreBranchModel>)
            .where((b) => b.status == 'ACTIVE')
            .toList();
        _promotions = (results[1] as List<PromotionModel>)
            .where((p) => p.isActiveNow && p.rules.isNotEmpty)
            .toList();
        _reviews = results[2] as List<ReviewModel>;
        _loadingExtra = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loadingExtra = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final catalog = ref.watch(catalogControllerProvider);
    final storeProducts = catalog.products
        .where((p) => p.storeId == widget.store.storeId)
        .toList();

    final filtered = storeProducts.where((p) {
      if (_selectedCategoryId != null && p.categoryId != _selectedCategoryId) {
        return false;
      }
      if (_search.trim().isNotEmpty) {
        final q = _search.trim().toLowerCase();
        return p.name.toLowerCase().contains(q) ||
            (p.description ?? '').toLowerCase().contains(q);
      }
      return true;
    }).toList();

    if (_sortBy == 'price-asc') {
      filtered.sort((a, b) => a.minPrice.compareTo(b.minPrice));
    } else if (_sortBy == 'price-desc') {
      filtered.sort((a, b) => b.minPrice.compareTo(a.minPrice));
    }

    final avgRating = _reviews.isEmpty
        ? null
        : _reviews.fold<int>(0, (s, r) => s + r.rating) / _reviews.length;

    return Scaffold(
      appBar: AppBar(title: Text(widget.store.name)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        children: [
          // Store Header Card
          Card(
            clipBehavior: Clip.antiAlias,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  height: 130,
                  width: double.infinity,
                  child: MssImage(
                    imageUrl: widget.store.bannerUrl,
                    fit: BoxFit.cover,
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 60,
                            height: 60,
                            padding: const EdgeInsets.all(4),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: MssColors.border),
                            ),
                            child: MssImage(
                              imageUrl: widget.store.logoUrl,
                              fit: BoxFit.contain,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  widget.store.name,
                                  style: const TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Wrap(
                                  spacing: 8,
                                  runSpacing: 4,
                                  children: [
                                    MssBadge(
                                      label: widget.store.categoryLabel,
                                      tone: MssBadgeTone.accent,
                                    ),
                                    if (avgRating != null)
                                      MssBadge(
                                        icon: Icons.star_rounded,
                                        label:
                                            '${avgRating.toStringAsFixed(1)} (${_reviews.length} đánh giá)',
                                        tone: MssBadgeTone.success,
                                      ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      if (widget.store.description != null &&
                          widget.store.description!.isNotEmpty) ...[
                        const SizedBox(height: 12),
                        Text(
                          widget.store.description!,
                          style: const TextStyle(
                            fontSize: 13.5,
                            color: MssColors.textMuted,
                            height: 1.4,
                          ),
                        ),
                      ],
                      const SizedBox(height: 10),
                      Text(
                        'Phí vận chuyển tiêu chuẩn: ${Formatters.formatVnd(widget.store.shippingFee)}',
                        style: const TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w600,
                          color: MssColors.primary,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Active Promotions Banner
          if (_promotions.isNotEmpty) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: MssColors.accent50,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: MssColors.accent200),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.local_offer_outlined,
                          size: 18, color: MssColors.accent800),
                      SizedBox(width: 8),
                      Text(
                        'Ưu đãi đang áp dụng tại gian hàng',
                        style: TextStyle(
                          fontWeight: FontWeight.w800,
                          color: MssColors.accent900,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  ..._promotions.map((promo) => Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '• ${promo.name} (đến ${Formatters.formatDateVi(promo.endAt)})',
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 13,
                                color: MssColors.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 4),
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
                          ],
                        ),
                      )),
                ],
              ),
            ),
          ],

          // Store Branches
          if (_branches.isNotEmpty) ...[
            const SizedBox(height: 18),
            MssSectionHeader(
              title: 'Hệ thống chi nhánh (${_branches.length})',
              subtitle: 'Địa điểm cửa hàng chính thức của thương hiệu',
            ),
            const SizedBox(height: 8),
            ..._branches.map((b) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Card(
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.location_on_outlined,
                                  size: 16, color: MssColors.primary),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  b.branchName,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                    fontSize: 13.5,
                                  ),
                                ),
                              ),
                              if (b.isPrimary)
                                const MssBadge(
                                  label: 'Chi nhánh chính',
                                  tone: MssBadgeTone.primary,
                                ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            b.fullAddress,
                            style: const TextStyle(
                              fontSize: 12.5,
                              color: MssColors.textMuted,
                            ),
                          ),
                          if ((b.phone != null && b.phone!.isNotEmpty) ||
                              (b.openingHours != null &&
                                  b.openingHours!.isNotEmpty)) ...[
                            const SizedBox(height: 4),
                            Text(
                              [
                                if (b.phone != null && b.phone!.isNotEmpty)
                                  'SĐT: ${b.phone}',
                                if (b.openingHours != null &&
                                    b.openingHours!.isNotEmpty)
                                  'Giờ mở cửa: ${b.openingHours}',
                              ].join('  •  '),
                              style: const TextStyle(
                                fontSize: 12,
                                color: MssColors.textMuted,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                )),
          ],

          // Products in Store
          const SizedBox(height: 18),
          MssSectionHeader(
            title: 'Sản phẩm của gian hàng (${filtered.length})',
            subtitle: 'Chọn sản phẩm để xem phân loại và đặt mua',
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: TextField(
                  onChanged: (v) => setState(() => _search = v),
                  decoration: const InputDecoration(
                    hintText: 'Tìm bánh trong gian hàng...',
                    prefixIcon: Icon(Icons.search),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              DropdownButtonHideUnderline(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                  decoration: BoxDecoration(
                    color: MssColors.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: MssColors.borderStrong),
                  ),
                  child: DropdownButton<String>(
                    value: _sortBy,
                    items: const [
                      DropdownMenuItem(
                          value: 'default', child: Text('Mặc định')),
                      DropdownMenuItem(
                          value: 'price-asc', child: Text('Giá tăng dần')),
                      DropdownMenuItem(
                          value: 'price-desc', child: Text('Giá giảm dần')),
                    ],
                    onChanged: (v) {
                      if (v != null) setState(() => _sortBy = v);
                    },
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          if (filtered.isEmpty)
            const MssEmptyState(
              icon: Icons.cake_outlined,
              title: 'Chưa có sản phẩm phù hợp',
            )
          else
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: filtered.length,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 0.66,
              ),
              itemBuilder: (context, index) {
                return ProductCardWidget(product: filtered[index]);
              },
            ),

          // Store Reviews
          const SizedBox(height: 24),
          MssSectionHeader(
            title: 'Đánh giá từ người mua (${_reviews.length})',
            subtitle: 'Nhận xét thực tế từ các đơn hàng đã giao thành công',
          ),
          const SizedBox(height: 10),
          if (_loadingExtra)
            const Center(child: CircularProgressIndicator())
          else if (_reviews.isEmpty)
            const Card(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Text(
                  'Gian hàng chưa có đánh giá nào.',
                  style: TextStyle(color: MssColors.textMuted),
                ),
              ),
            )
          else
            ..._reviews.take(10).map((r) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Card(
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Row(
                                children: List.generate(
                                  5,
                                  (i) => Icon(
                                    i < r.rating
                                        ? Icons.star_rounded
                                        : Icons.star_border_rounded,
                                    color: MssColors.accent,
                                    size: 16,
                                  ),
                                ),
                              ),
                              Text(
                                Formatters.formatDateVi(r.createdAt),
                                style: const TextStyle(
                                  fontSize: 11.5,
                                  color: MssColors.textMuted,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            (r.comment != null && r.comment!.trim().isNotEmpty)
                                ? r.comment!
                                : 'Khách hàng đánh giá ${r.rating} sao.',
                            style: const TextStyle(fontSize: 13),
                          ),
                        ],
                      ),
                    ),
                  ),
                )),
        ],
      ),
    );
  }
}

class ProductListScreen extends ConsumerStatefulWidget {
  final int? initialCategoryId;

  const ProductListScreen({
    super.key,
    this.initialCategoryId,
  });

  @override
  ConsumerState<ProductListScreen> createState() => _ProductListScreenState();
}

class _ProductListScreenState extends ConsumerState<ProductListScreen> {
  String _search = '';
  int? _categoryId;
  int? _storeId;
  String _priceBand = 'all';
  String _sortBy = 'default';

  @override
  void initState() {
    super.initState();
    _categoryId = widget.initialCategoryId;
  }

  @override
  void didUpdateWidget(covariant ProductListScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.initialCategoryId != oldWidget.initialCategoryId) {
      setState(() => _categoryId = widget.initialCategoryId);
    }
  }

  bool _matchesPriceBand(double price) {
    switch (_priceBand) {
      case 'under200':
        return price < 200000;
      case '200to500':
        return price >= 200000 && price <= 500000;
      case '500to1m':
        return price > 500000 && price <= 1000000;
      case 'above1m':
        return price > 1000000;
      default:
        return true;
    }
  }

  @override
  Widget build(BuildContext context) {
    final catalog = ref.watch(catalogControllerProvider);

    final filtered = catalog.products.where((p) {
      if (_categoryId != null && p.categoryId != _categoryId) return false;
      if (_storeId != null && p.storeId != _storeId) return false;
      if (!_matchesPriceBand(p.minPrice)) return false;
      if (_search.trim().isNotEmpty) {
        final q = _search.trim().toLowerCase();
        return p.name.toLowerCase().contains(q) ||
            p.storeName.toLowerCase().contains(q) ||
            p.categoryName.toLowerCase().contains(q);
      }
      return true;
    }).toList();

    if (_sortBy == 'price-asc') {
      filtered.sort((a, b) => a.minPrice.compareTo(b.minPrice));
    } else if (_sortBy == 'price-desc') {
      filtered.sort((a, b) => b.minPrice.compareTo(a.minPrice));
    }

    return Column(
      children: [
        Container(
          color: MssColors.surface,
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
          child: Column(
            children: [
              TextField(
                onChanged: (v) => setState(() => _search = v),
                decoration: InputDecoration(
                  hintText: 'Tìm tên bánh, nhân bánh, thương hiệu...',
                  prefixIcon: const Icon(Icons.search),
                  suffixIcon: (_search.isNotEmpty ||
                          _categoryId != null ||
                          _storeId != null ||
                          _priceBand != 'all')
                      ? IconButton(
                          tooltip: 'Xóa bộ lọc',
                          icon: const Icon(Icons.filter_alt_off_outlined),
                          onPressed: () {
                            setState(() {
                              _search = '';
                              _categoryId = null;
                              _storeId = null;
                              _priceBand = 'all';
                              _sortBy = 'default';
                            });
                          },
                        )
                      : null,
                ),
              ),
              const SizedBox(height: 10),
              // Category chips
              SizedBox(
                height: 36,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  children: [
                    ChoiceChip(
                      label: const Text('Tất cả loại bánh'),
                      selected: _categoryId == null,
                      onSelected: (_) => setState(() => _categoryId = null),
                    ),
                    const SizedBox(width: 6),
                    ...catalog.categories.map((cat) => Padding(
                          padding: const EdgeInsets.only(right: 6),
                          child: ChoiceChip(
                            label: Text(cat.name),
                            selected: _categoryId == cat.categoryId,
                            onSelected: (_) => setState(
                              () => _categoryId = _categoryId == cat.categoryId
                                  ? null
                                  : cat.categoryId,
                            ),
                          ),
                        )),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              // Store, Price & Sort filters
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _FilterDropdown<int?>(
                      value: _storeId,
                      hint: 'Tất cả thương hiệu',
                      items: [
                        const DropdownMenuItem<int?>(
                          value: null,
                          child: Text('Tất cả thương hiệu'),
                        ),
                        ...catalog.stores.map(
                          (s) => DropdownMenuItem<int?>(
                            value: s.storeId,
                            child: Text(s.name),
                          ),
                        ),
                      ],
                      onChanged: (v) => setState(() => _storeId = v),
                    ),
                    const SizedBox(width: 8),
                    _FilterDropdown<String>(
                      value: _priceBand,
                      hint: 'Mức giá',
                      items: const [
                        DropdownMenuItem(
                            value: 'all', child: Text('Mọi mức giá')),
                        DropdownMenuItem(
                            value: 'under200', child: Text('Dưới 200.000 ₫')),
                        DropdownMenuItem(
                            value: '200to500',
                            child: Text('200.000 ₫ – 500.000 ₫')),
                        DropdownMenuItem(
                            value: '500to1m',
                            child: Text('500.000 ₫ – 1.000.000 ₫')),
                        DropdownMenuItem(
                            value: 'above1m', child: Text('Trên 1.000.000 ₫')),
                      ],
                      onChanged: (v) {
                        if (v != null) setState(() => _priceBand = v);
                      },
                    ),
                    const SizedBox(width: 8),
                    _FilterDropdown<String>(
                      value: _sortBy,
                      hint: 'Sắp xếp',
                      items: const [
                        DropdownMenuItem(
                            value: 'default', child: Text('Sắp xếp: Mặc định')),
                        DropdownMenuItem(
                            value: 'price-asc',
                            child: Text('Giá: Thấp → Cao')),
                        DropdownMenuItem(
                            value: 'price-desc',
                            child: Text('Giá: Cao → Thấp')),
                      ],
                      onChanged: (v) {
                        if (v != null) setState(() => _sortBy = v);
                      },
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const Divider(),
        Expanded(
          child: catalog.loading
              ? const Center(child: CircularProgressIndicator())
              : filtered.isEmpty
                  ? const MssEmptyState(
                      icon: Icons.search_off_outlined,
                      title: 'Không tìm thấy sản phẩm phù hợp',
                      description:
                          'Thử xóa bớt bộ lọc hoặc tìm bằng từ khóa khác.',
                    )
                  : RefreshIndicator(
                      onRefresh: () =>
                          ref.read(catalogControllerProvider.notifier).refresh(),
                      child: GridView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: filtered.length,
                        gridDelegate:
                            const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          mainAxisSpacing: 12,
                          crossAxisSpacing: 12,
                          childAspectRatio: 0.65,
                        ),
                        itemBuilder: (context, index) {
                          return ProductCardWidget(product: filtered[index]);
                        },
                      ),
                    ),
        ),
      ],
    );
  }
}

class _FilterDropdown<T> extends StatelessWidget {
  final T value;
  final String hint;
  final List<DropdownMenuItem<T>> items;
  final ValueChanged<T?> onChanged;

  const _FilterDropdown({
    required this.value,
    required this.hint,
    required this.items,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 36,
      padding: const EdgeInsets.symmetric(horizontal: 10),
      decoration: BoxDecoration(
        color: MssColors.background,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: MssColors.borderStrong),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<T>(
          value: value,
          hint: Text(hint, style: const TextStyle(fontSize: 12.5)),
          style: const TextStyle(
            fontSize: 12.5,
            color: MssColors.textPrimary,
            fontWeight: FontWeight.w600,
          ),
          items: items,
          onChanged: onChanged,
        ),
      ),
    );
  }
}

class ProductCardWidget extends ConsumerWidget {
  final ProductSummaryModel product;

  const ProductCardWidget({super.key, required this.product});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    final isWishlisted =
        auth.wishlistIds.contains(product.productId.toString());

    Future<void> handleQuickAdd() async {
      if (!auth.isAuthenticated) {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => const LoginScreen(
              notice: 'Vui lòng đăng nhập để thêm bánh vào giỏ hàng.',
            ),
          ),
        );
        return;
      }
      try {
        await ref
            .read(cartControllerProvider.notifier)
            .addProductToCart(product: product, quantity: 1);
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Đã thêm "${product.name}" vào giỏ hàng.'),
              duration: const Duration(seconds: 2),
            ),
          );
        }
      } catch (e) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(e.toString()),
              backgroundColor: MssColors.danger,
            ),
          );
        }
      }
    }

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => ProductDetailScreen(product: product),
            ),
          );
        },
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              child: Stack(
                fit: StackFit.expand,
                children: [
                  MssImage(imageUrl: product.imageUrl),
                  Positioned(
                    top: 8,
                    right: 8,
                    child: Material(
                      color: Colors.white.withOpacity(0.9),
                      shape: const CircleBorder(),
                      child: InkWell(
                        customBorder: const CircleBorder(),
                        onTap: () {
                          if (!auth.isAuthenticated) {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => const LoginScreen(
                                  notice:
                                      'Vui lòng đăng nhập để lưu sản phẩm yêu thích.',
                                ),
                              ),
                            );
                            return;
                          }
                          ref
                              .read(authControllerProvider.notifier)
                              .toggleWishlist(product.productId.toString());
                        },
                        child: Padding(
                          padding: const EdgeInsets.all(6),
                          child: Icon(
                            isWishlisted
                                ? Icons.favorite
                                : Icons.favorite_border,
                            size: 18,
                            color: isWishlisted
                                ? MssColors.primary
                                : MssColors.textMuted,
                          ),
                        ),
                      ),
                    ),
                  ),
                  if (!product.inStock)
                    const Positioned(
                      bottom: 8,
                      left: 8,
                      child: MssBadge(
                        label: 'Tạm hết hàng',
                        tone: MssBadgeTone.danger,
                      ),
                    ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    product.storeName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: MssColors.accent800,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    product.name,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      height: 1.25,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          Formatters.formatVnd(product.minPrice),
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                            color: MssColors.primary,
                          ),
                        ),
                      ),
                      InkWell(
                        onTap: product.inStock ? handleQuickAdd : null,
                        borderRadius: BorderRadius.circular(8),
                        child: Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: product.inStock
                                ? MssColors.primary50
                                : MssColors.surfaceMuted,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Icon(
                            Icons.add_shopping_cart_rounded,
                            size: 18,
                            color: product.inStock
                                ? MssColors.primary
                                : MssColors.textMuted,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class ProductDetailScreen extends ConsumerStatefulWidget {
  final ProductSummaryModel product;

  const ProductDetailScreen({super.key, required this.product});

  @override
  ConsumerState<ProductDetailScreen> createState() =>
      _ProductDetailScreenState();
}

class _ProductDetailScreenState extends ConsumerState<ProductDetailScreen> {
  ProductDetailModel? _detail;
  ProductVariantModel? _selectedVariant;
  List<ReviewModel> _reviews = const [];
  bool _loading = true;
  bool _loadingReviews = false;
  int _quantity = 1;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadProductDetail();
  }

  Future<void> _loadProductDetail() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = ref.read(catalogApiProvider);
      final detail = await api.getProduct(
        widget.product.productId,
        storeName: widget.product.storeName,
      );
      final activeVariants =
          detail.variants.where((v) => v.status == 'ACTIVE').toList();
      ProductVariantModel? initialVariant;
      for (final v in activeVariants) {
        if (v.stockQuantity > 0) {
          initialVariant = v;
          break;
        }
      }
      initialVariant ??= activeVariants.isNotEmpty
          ? activeVariants.first
          : (detail.variants.isNotEmpty ? detail.variants.first : null);

      if (!mounted) return;
      setState(() {
        _detail = detail;
        _selectedVariant = initialVariant;
        _loading = false;
      });
      if (initialVariant != null) {
        _loadVariantReviews(initialVariant.variantId);
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e.toString();
      });
    }
  }

  Future<void> _loadVariantReviews(int variantId) async {
    setState(() => _loadingReviews = true);
    try {
      final list =
          await ref.read(catalogApiProvider).listReviews(variantId: variantId);
      if (mounted) {
        setState(() {
          _reviews = list;
          _loadingReviews = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loadingReviews = false);
    }
  }

  void _selectVariant(ProductVariantModel variant) {
    setState(() {
      _selectedVariant = variant;
      if (_quantity > variant.stockQuantity && variant.stockQuantity > 0) {
        _quantity = variant.stockQuantity;
      } else if (_quantity < 1) {
        _quantity = 1;
      }
    });
    _loadVariantReviews(variant.variantId);
  }

  Future<void> _addToCart({required bool buyNow}) async {
    final auth = ref.read(authControllerProvider);
    if (!auth.isAuthenticated) {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => const LoginScreen(
            notice: 'Vui lòng đăng nhập để thêm sản phẩm và thanh toán.',
          ),
        ),
      );
      return;
    }

    final variant = _selectedVariant;
    if (variant == null || !variant.isAvailable) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Phân loại này hiện đã hết hàng.'),
          backgroundColor: MssColors.danger,
        ),
      );
      return;
    }

    try {
      await ref.read(cartControllerProvider.notifier).addProductToCart(
            product: widget.product,
            variantId: variant.variantId,
            quantity: _quantity,
          );
      if (!mounted) return;
      if (buyNow) {
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const CheckoutScreen()),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Đã thêm $_quantity × "${variant.variantName}" vào giỏ hàng.',
            ),
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString()),
          backgroundColor: MssColors.danger,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authControllerProvider);
    final isWishlisted =
        auth.wishlistIds.contains(widget.product.productId.toString());
    final variant = _selectedVariant;
    final displayImage = (variant?.imageUrl != null &&
            variant!.imageUrl!.trim().isNotEmpty)
        ? variant.imageUrl!
        : widget.product.imageUrl;
    final displayPrice = variant?.basePrice ?? widget.product.minPrice;
    final availableStock = variant?.stockQuantity ?? widget.product.totalStock;

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.product.name),
        actions: [
          IconButton(
            tooltip: 'Yêu thích',
            onPressed: () {
              if (!auth.isAuthenticated) {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => const LoginScreen(
                      notice: 'Vui lòng đăng nhập để lưu sản phẩm yêu thích.',
                    ),
                  ),
                );
                return;
              }
              ref
                  .read(authControllerProvider.notifier)
                  .toggleWishlist(widget.product.productId.toString());
            },
            icon: Icon(
              isWishlisted ? Icons.favorite : Icons.favorite_border,
              color: isWishlisted ? MssColors.accent400 : Colors.white,
            ),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? MssEmptyState(
                  icon: Icons.error_outline,
                  title: 'Không tải được chi tiết sản phẩm',
                  description: _error,
                  actionLabel: 'Thử lại',
                  onAction: _loadProductDetail,
                )
              : ListView(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
                  children: [
                    AspectRatio(
                      aspectRatio: 1.2,
                      child: MssImage(
                        imageUrl: displayImage,
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        MssBadge(
                          label: widget.product.storeName,
                          tone: MssBadgeTone.accent,
                          icon: Icons.storefront_outlined,
                        ),
                        const SizedBox(width: 8),
                        MssBadge(
                          label: widget.product.categoryName,
                          tone: MssBadgeTone.neutral,
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(
                      widget.product.name,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                        color: MssColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          Formatters.formatVnd(displayPrice),
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w800,
                            color: MssColors.primary,
                          ),
                        ),
                        MssBadge(
                          label: availableStock > 0
                              ? 'Còn $availableStock sản phẩm'
                              : 'Hết hàng',
                          tone: availableStock > 0
                              ? MssBadgeTone.success
                              : MssBadgeTone.danger,
                        ),
                      ],
                    ),
                    if (_detail?.summary.description != null &&
                        _detail!.summary.description!.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      Text(
                        _detail!.summary.description!,
                        style: const TextStyle(
                          fontSize: 13.5,
                          color: MssColors.textMuted,
                          height: 1.45,
                        ),
                      ),
                    ],

                    // Variants selector
                    if (_detail != null && _detail!.variants.isNotEmpty) ...[
                      const SizedBox(height: 20),
                      const Text(
                        'Chọn phân loại bánh',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: _detail!.variants
                            .where((v) => v.status == 'ACTIVE')
                            .map((v) {
                          final selected = variant?.variantId == v.variantId;
                          return ChoiceChip(
                            label: Text(
                              '${v.variantName} • ${Formatters.formatVnd(v.basePrice)}'
                              '${v.stockQuantity <= 0 ? ' (Hết)' : ''}',
                            ),
                            selected: selected,
                            selectedColor: MssColors.primary,
                            labelStyle: TextStyle(
                              color: selected
                                  ? Colors.white
                                  : MssColors.textPrimary,
                              fontWeight: FontWeight.w600,
                              fontSize: 12.5,
                            ),
                            onSelected: (_) => _selectVariant(v),
                          );
                        }).toList(),
                      ),
                    ],

                    const SizedBox(height: 20),
                    // Quantity Stepper
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 10),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'Số lượng đặt mua',
                              style: TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 14,
                              ),
                            ),
                            Row(
                              children: [
                                IconButton(
                                  onPressed: _quantity > 1
                                      ? () => setState(() => _quantity--)
                                      : null,
                                  icon: const Icon(
                                      Icons.remove_circle_outline_rounded),
                                ),
                                Padding(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 12),
                                  child: Text(
                                    '$_quantity',
                                    style: const TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                ),
                                IconButton(
                                  onPressed: availableStock > _quantity
                                      ? () => setState(() => _quantity++)
                                      : null,
                                  icon: const Icon(
                                      Icons.add_circle_outline_rounded),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: availableStock > 0
                                ? () => _addToCart(buyNow: false)
                                : null,
                            icon: const Icon(Icons.add_shopping_cart_outlined),
                            label: const Text('Thêm vào giỏ'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: availableStock > 0
                                ? () => _addToCart(buyNow: true)
                                : null,
                            icon: const Icon(Icons.flash_on_outlined),
                            label: const Text('Mua ngay'),
                          ),
                        ),
                      ],
                    ),

                    // Reviews for selected variant
                    const SizedBox(height: 28),
                    MssSectionHeader(
                      title: 'Đánh giá phân loại này (${_reviews.length})',
                      subtitle: variant != null
                          ? 'Phân loại: ${variant.variantName}'
                          : null,
                    ),
                    const SizedBox(height: 10),
                    if (_loadingReviews)
                      const Center(child: CircularProgressIndicator())
                    else if (_reviews.isEmpty)
                      const Card(
                        child: Padding(
                          padding: EdgeInsets.all(16),
                          child: Text(
                            'Chưa có đánh giá nào cho phân loại sản phẩm này.',
                            style: TextStyle(color: MssColors.textMuted),
                          ),
                        ),
                      )
                    else
                      ..._reviews.map((r) => Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: Card(
                              child: Padding(
                                padding: const EdgeInsets.all(12),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.spaceBetween,
                                      children: [
                                        Row(
                                          children: List.generate(
                                            5,
                                            (i) => Icon(
                                              i < r.rating
                                                  ? Icons.star_rounded
                                                  : Icons.star_border_rounded,
                                              color: MssColors.accent,
                                              size: 16,
                                            ),
                                          ),
                                        ),
                                        Text(
                                          Formatters.formatDateVi(r.createdAt),
                                          style: const TextStyle(
                                            fontSize: 11.5,
                                            color: MssColors.textMuted,
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 6),
                                    Text(
                                      (r.comment != null &&
                                              r.comment!.trim().isNotEmpty)
                                          ? r.comment!
                                          : 'Khách hàng đánh giá ${r.rating} sao.',
                                      style: const TextStyle(fontSize: 13),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          )),
                  ],
                ),
    );
  }
}
