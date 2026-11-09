import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/theme/mss_theme.dart';
import 'features/auth/presentation/auth_controller.dart';
import 'features/auth/presentation/auth_screens.dart';
import 'features/b2b_rfq/presentation/b2b_screens.dart';
import 'features/catalog/presentation/catalog_screens.dart';
import 'features/commerce/presentation/cart_controller.dart';
import 'features/commerce/presentation/commerce_screens.dart';
import 'features/profile/presentation/profile_screens.dart';

class MoonCakeCustomerApp extends ConsumerStatefulWidget {
  const MoonCakeCustomerApp({super.key});

  @override
  ConsumerState<MoonCakeCustomerApp> createState() =>
      _MoonCakeCustomerAppState();
}

class _MoonCakeCustomerAppState extends ConsumerState<MoonCakeCustomerApp> {
  int _currentIndex = 0;
  int? _productListCategoryFilter;

  static const List<String> _tabTitles = [
    'MooncakeHub • Sàn Bánh Trung Thu',
    'Khám phá Sản phẩm',
    'Cổng Báo giá Doanh nghiệp (B2B)',
    'Đơn hàng của tôi',
    'Tài khoản Cá nhân',
  ];

  static const Map<int, String> _loginNotices = {
    2: 'Vui lòng đăng nhập để gửi yêu cầu báo giá và thương lượng với gian hàng.',
    3: 'Vui lòng đăng nhập để theo dõi đơn hàng và thanh toán của bạn.',
    4: 'Vui lòng đăng nhập để quản lý hồ sơ, sổ địa chỉ và danh sách yêu thích.',
  };

  void _openCart(BuildContext context, AuthState auth) {
    if (!auth.isAuthenticated) {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => const LoginScreen(
            notice: 'Vui lòng đăng nhập để xem giỏ hàng và đặt mua.',
          ),
        ),
      );
      return;
    }
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const CartScreen()),
    );
  }

  void _openNotifications(BuildContext context, AuthState auth) {
    if (!auth.isAuthenticated) {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => const LoginScreen(
            notice: 'Vui lòng đăng nhập để xem thông báo.',
          ),
        ),
      );
      return;
    }
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const NotificationScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authControllerProvider);
    final cartState = ref.watch(cartControllerProvider);
    final isProtectedTab = _currentIndex >= 2;

    return MaterialApp(
      title: 'MooncakeHub Mobile',
      debugShowCheckedModeBanner: false,
      theme: MssTheme.lightTheme,
      home: Builder(
        builder: (innerContext) => Scaffold(
          appBar: AppBar(
            title: Text(_tabTitles[_currentIndex]),
            actions: [
              // Notification Bell
              IconButton(
                tooltip: 'Thông báo',
                onPressed: () => _openNotifications(innerContext, auth),
                icon: Badge(
                  isLabelVisible:
                      auth.isAuthenticated && auth.unreadNotifications > 0,
                  label: Text('${auth.unreadNotifications}'),
                  backgroundColor: MssColors.accent,
                  textColor: MssColors.primary950,
                  child: const Icon(Icons.notifications_outlined),
                ),
              ),
              // Cart Button with Count Badge
              IconButton(
                tooltip: 'Giỏ hàng',
                onPressed: () => _openCart(innerContext, auth),
                icon: Badge(
                  isLabelVisible:
                      auth.isAuthenticated && cartState.totalCount > 0,
                  label: Text('${cartState.totalCount}'),
                  backgroundColor: MssColors.accent,
                  textColor: MssColors.primary950,
                  child: const Icon(Icons.shopping_cart_outlined),
                ),
              ),
              const SizedBox(width: 4),
            ],
          ),
          body: auth.status == AuthStatus.loading
              ? const Center(child: CircularProgressIndicator())
              : (isProtectedTab && !auth.isAuthenticated)
                  ? LoginScreen(
                      notice: _loginNotices[_currentIndex],
                      onSuccess: () => setState(() {}),
                    )
                  : _buildCurrentTabBody(),
          bottomNavigationBar: NavigationBar(
            selectedIndex: _currentIndex,
            onDestinationSelected: (idx) {
              setState(() => _currentIndex = idx);
            },
            destinations: const [
              NavigationDestination(
                icon: Icon(Icons.home_outlined),
                selectedIcon: Icon(Icons.home_rounded),
                label: 'Trang chủ',
              ),
              NavigationDestination(
                icon: Icon(Icons.cake_outlined),
                selectedIcon: Icon(Icons.cake_rounded),
                label: 'Sản phẩm',
              ),
              NavigationDestination(
                icon: Icon(Icons.business_center_outlined),
                selectedIcon: Icon(Icons.business_center_rounded),
                label: 'Doanh nghiệp',
              ),
              NavigationDestination(
                icon: Icon(Icons.receipt_long_outlined),
                selectedIcon: Icon(Icons.receipt_long_rounded),
                label: 'Đơn hàng',
              ),
              NavigationDestination(
                icon: Icon(Icons.person_outline),
                selectedIcon: Icon(Icons.person_rounded),
                label: 'Tài khoản',
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCurrentTabBody() {
    switch (_currentIndex) {
      case 0:
        return HomeScreen(
          onNavigateToProducts: () => setState(() => _currentIndex = 1),
          onNavigateToB2B: () => setState(() => _currentIndex = 2),
          onSelectCategoryFilter: (catId) {
            setState(() => _productListCategoryFilter = catId);
          },
        );
      case 1:
        return ProductListScreen(
          initialCategoryId: _productListCategoryFilter,
        );
      case 2:
        return const B2BPortalScreen();
      case 3:
        return const OrderListScreen();
      case 4:
        return const ProfileScreen();
      default:
        return const SizedBox.shrink();
    }
  }
}
