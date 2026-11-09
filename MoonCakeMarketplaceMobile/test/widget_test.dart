import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mooncake_marketplace_mobile/app.dart';
import 'package:mooncake_marketplace_mobile/core/network/api_exception.dart';
import 'package:mooncake_marketplace_mobile/core/utils/formatters.dart';
import 'package:mooncake_marketplace_mobile/core/widgets/mss_widgets.dart';
import 'package:mooncake_marketplace_mobile/features/auth/data/auth_models.dart';
import 'package:mooncake_marketplace_mobile/features/auth/presentation/auth_controller.dart';
import 'package:mooncake_marketplace_mobile/features/auth/presentation/auth_screens.dart';
import 'package:mooncake_marketplace_mobile/features/b2b_rfq/data/rfq_models.dart';
import 'package:mooncake_marketplace_mobile/features/catalog/data/catalog_api.dart';
import 'package:mooncake_marketplace_mobile/features/catalog/data/catalog_models.dart';
import 'package:mooncake_marketplace_mobile/features/catalog/presentation/catalog_controller.dart';
import 'package:mooncake_marketplace_mobile/features/commerce/data/commerce_models.dart';
import 'package:mooncake_marketplace_mobile/core/network/dio_client.dart';
import 'package:mooncake_marketplace_mobile/core/storage/token_storage.dart';

class _FakeCatalogApi extends CatalogApi {
  _FakeCatalogApi() : super(DioClient(AppStorage()));

  @override
  Future<List<StoreModel>> listStores() async => [
        StoreModel.fromJson({
          'storeId': 1,
          'supplierUserId': 2,
          'name': 'Kinh Đô Chính Hãng',
          'slug': 'kinh-do',
          'description': 'Bánh Trung thu truyền thống danh tiếng',
          'logoUrl': '/images/demo/brands/stores/store-logo-1.png',
          'bannerUrl': '/images/demo/brands/stores/store-banner-1.png',
          'shippingFee': 30000,
          'status': 'ACTIVE',
        }),
        StoreModel.fromJson({
          'storeId': 2,
          'supplierUserId': 3,
          'name': 'Givral Bakery',
          'slug': 'givral',
          'description': 'Phong vị bánh tươi hiện đại',
          'logoUrl': '/images/demo/brands/stores/store-logo-2.png',
          'bannerUrl': '/images/demo/brands/stores/store-banner-2.png',
          'shippingFee': 25000,
          'status': 'ACTIVE',
        }),
      ];

  @override
  Future<List<CategoryModel>> listCategories() async => [
        CategoryModel.fromJson({
          'categoryId': 10,
          'name': 'Bánh Nướng Truyền Thống',
          'slug': 'banh-nuong',
          'status': 'ACTIVE',
        }),
        CategoryModel.fromJson({
          'categoryId': 11,
          'name': 'Bánh Dẻo',
          'slug': 'banh-deo',
          'status': 'ACTIVE',
        }),
      ];

  @override
  Future<List<ProductSummaryModel>> listProducts({
    int? storeId,
    int? categoryId,
    String? q,
  }) async =>
      [
        ProductSummaryModel.fromJson({
          'productId': 101,
          'storeId': 1,
          'categoryId': 10,
          'categoryName': 'Bánh Nướng Truyền Thống',
          'name': 'Bánh Nướng Thập Cẩm Gà Quay 2 Trứng',
          'slug': 'banh-nuong-thap-cam',
          'description': 'Hương vị truyền thống đậm đà',
          'status': 'ACTIVE',
          'minPrice': 185000,
          'maxPrice': 220000,
          'totalStock': 50,
          'imageUrl': '/images/demo/brands/products/product-1.png',
        }),
        ProductSummaryModel.fromJson({
          'productId': 102,
          'storeId': 2,
          'categoryId': 11,
          'categoryName': 'Bánh Dẻo',
          'name': 'Bánh Dẻo Hạt Sen Trà Xanh',
          'slug': 'banh-deo-hat-sen',
          'description': 'Thanh mát ít ngọt',
          'status': 'ACTIVE',
          'minPrice': 145000,
          'maxPrice': 145000,
          'totalStock': 25,
          'imageUrl': '/images/demo/brands/products/product-2.png',
        }),
      ];
}

class _FakeAppStorage extends AppStorage {
  @override
  Future<String?> readAccessToken() async => null;

  @override
  Future<String?> readCustomApiBaseUrl() async => null;
}

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  group('1. Formatters & Core Utilities', () {
    test('formats VND currency accurately', () {
      final formatted = Formatters.formatVnd(185000);
      expect(formatted.contains('185.000'), isTrue);
      expect(formatted.contains('₫'), isTrue);
      expect(Formatters.formatVnd('2500000').contains('2.500.000'), isTrue);
    });

    test('extracts token from email verification and password reset URLs', () {
      expect(
        Formatters.extractTokenFromInput(
            'http://localhost:3000/verify-email?token=abc-123-xyz'),
        equals('abc-123-xyz'),
      );
      expect(
        Formatters.extractTokenFromInput(
            'https://mooncake.vn/reset-password?token=reset_999&foo=bar'),
        equals('reset_999'),
      );
      expect(
        Formatters.extractTokenFromInput('raw-token-999'),
        equals('raw-token-999'),
      );
    });

    test('validates Vietnamese & international phone numbers', () {
      expect(Formatters.isValidPhone('0901234567'), isTrue);
      expect(Formatters.isValidPhone('+84 901 234 567'), isTrue);
      expect(Formatters.isValidPhone('123'), isFalse);
      expect(Formatters.isValidPhone('abc1234567'), isFalse);
    });

    test('parses UTC timestamps with and without Z suffix', () {
      final withoutZ = Formatters.parseApiDate('2026-10-10T09:15:00');
      final withZ = Formatters.parseApiDate('2026-10-10T09:15:00Z');
      expect(withoutZ, isNotNull);
      expect(withZ, isNotNull);
      expect(withoutZ!.millisecondsSinceEpoch,
          equals(withZ!.millisecondsSinceEpoch));
    });

    test('translates backend error codes to Vietnamese', () {
      const err1 = ApiException(
        status: 403,
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Email not verified',
      );
      expect(err1.localizedMessage, contains('chưa được xác minh'));

      const err2 = ApiException(
        status: 400,
        code: 'SELF_PURCHASE_NOT_ALLOWED',
        message: 'Self purchase',
      );
      expect(err2.localizedMessage, contains('của chính mình'));

      const err3 = ApiException(
        status: 400,
        code: 'INSUFFICIENT_STOCK',
        message: 'Insufficient stock',
      );
      expect(err3.localizedMessage, contains('tồn kho không đủ'));
    });
  });

  group('2. Domain & Data Models Parsing', () {
    test('AuthResponse & UserProfile parse accurately', () {
      final auth = AuthResponse.fromJson({
        'accessToken': 'eyJ.test.token',
        'tokenType': 'Bearer',
        'expiresInSeconds': 3600,
        'user': {
          'userId': 15,
          'customerId': 9,
          'email': 'khachhang@mooncake.vn',
          'status': 'ACTIVE',
          'emailVerified': true,
          'fullName': 'Trần Thị Thu',
          'phoneNumber': '0912345678',
          'createdAt': '2026-09-01T10:00:00',
          'roles': ['ROLE_CUSTOMER'],
        },
      });
      expect(auth.user.userId, 15);
      expect(auth.user.customerId, 9);
      expect(auth.user.fullName, 'Trần Thị Thu');
      expect(auth.user.roles, contains('ROLE_CUSTOMER'));
    });

    test('PromotionRuleModel formats discount rules in Vietnamese', () {
      final percentRule = PromotionRuleModel.fromJson({
        'ruleId': 1,
        'ruleType': 'PERCENT_DISCOUNT',
        'discountValue': 10,
        'minOrderAmount': 500000,
      });
      expect(percentRule.summaryVi, contains('Giảm 10%'));
      expect(percentRule.summaryVi, contains('500.000'));

      final buyXGetY = PromotionRuleModel.fromJson({
        'ruleId': 2,
        'ruleType': 'BUY_X_GET_Y',
        'buyQuantity': 5,
        'freeQuantity': 1,
      });
      expect(buyXGetY.summaryVi, equals('Mua 5 tặng 1'));
    });

    test('CartPricingPreviewModel & CustomerOrderModel parse multi-store data',
        () {
      final pricing = CartPricingPreviewModel.fromJson({
        'customerId': 9,
        'subtotal': 400000,
        'discountTotal': 40000,
        'shippingTotal': 30000,
        'grandTotal': 390000,
        'unavailableItems': [],
        'groups': [
          {
            'storeId': 1,
            'storeName': 'Kinh Đô',
            'subtotal': 400000,
            'discountAmount': 40000,
            'appliedPromotionId': 5,
            'appliedPromotionName': 'Ưu đãi Trung Thu 10%',
            'shippingFee': 30000,
            'totalAmount': 390000,
            'items': [
              {
                'cartItemId': 1,
                'variantId': 201,
                'productId': 101,
                'storeId': 1,
                'storeName': 'Kinh Đô',
                'productName': 'Bánh Nướng Thập Cẩm',
                'variantName': 'Hộp 4 bánh 200g',
                'sku': 'KD-TC-4',
                'unitPrice': 200000,
                'quantity': 2,
                'lineTotal': 400000,
                'availableStock': 15,
              }
            ],
          }
        ],
      });
      expect(pricing.groups.length, 1);
      expect(pricing.groups.first.appliedPromotionName, 'Ưu đãi Trung Thu 10%');
      expect(pricing.grandTotal, 390000);
    });

    test('RfqDetailModel & QuotationDetailModel handle string decimals', () {
      final rfq = RfqDetailModel.fromJson({
        'rfqId': '42',
        'customerId': '15',
        'title': 'Đặt 300 hộp quà doanh nghiệp',
        'quantity': 300,
        'budgetAmount': '90000000.00',
        'preferredDeliveryDate': '2026-09-20',
        'deliveryLocation': 'Quận 1, TP.HCM',
        'targetType': 'SELECTED_STORES',
        'targetStoreIds': ['1', '2'],
        'status': 'OPEN',
        'createdAt': '2026-09-01T08:00:00Z',
        'updatedAt': '2026-09-01T08:00:00Z',
      });
      expect(rfq.rfqId, '42');
      expect(rfq.budgetAmount, 90000000);
      expect(rfq.targetStoreIds, equals(['1', '2']));

      final quote = QuotationDetailModel.fromJson({
        'quotationId': '88',
        'rfqId': '42',
        'storeId': '1',
        'supplierUserId': '2',
        'version': 2,
        'totalAmount': '85500000.00',
        'depositPercent': '30.00',
        'shippingFee': '0.00',
        'status': 'SUBMITTED',
        'createdAt': '2026-09-02T09:00:00Z',
        'items': [
          {
            'quotationItemId': '1',
            'itemName': 'Hộp Trăng Vàng Hoàng Kim',
            'quantity': 300,
            'unitPrice': '285000.00',
            'lineTotal': '85500000.00',
          }
        ],
      });
      expect(quote.totalAmount, 85500000);
      expect(quote.depositPercent, 30);
      expect(quote.items.first.unitPrice, 285000);
    });
  });

  group('3. Widget & Screen Navigation Tests', () {
    testWidgets('MssEmptyState renders title, description and action button',
        (tester) async {
      bool tapped = false;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: MssEmptyState(
              title: 'Giỏ hàng trống',
              description: 'Chưa có sản phẩm nào',
              actionLabel: 'Mua ngay',
              onAction: () => tapped = true,
            ),
          ),
        ),
      );

      expect(find.text('Giỏ hàng trống'), findsOneWidget);
      expect(find.text('Chưa có sản phẩm nào'), findsOneWidget);
      await tester.tap(find.text('Mua ngay'));
      expect(tapped, isTrue);
    });

    testWidgets(
        'MoonCakeCustomerApp renders Home, filters products, and gates protected tabs for Guest',
        (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            appStorageProvider.overrideWithValue(_FakeAppStorage()),
            catalogApiProvider.overrideWithValue(_FakeCatalogApi()),
          ],
          child: const MoonCakeCustomerApp(),
        ),
      );

      // Let async initialization complete
      await tester.pumpAndSettle();

      // Verify Home tab shows hero banner and seeded stores
      expect(
        find.textContaining('Tinh Hoa Bánh Trung Thu'),
        findsOneWidget,
      );
      expect(find.text('Kinh Đô Chính Hãng'), findsOneWidget);
      await tester.drag(find.byType(ListView).first, const Offset(0, -350));
      await tester.pumpAndSettle();
      expect(find.text('Givral Bakery'), findsOneWidget);

      // Navigate to Tab 2: Sản phẩm
      await tester.tap(find.text('Sản phẩm'));
      await tester.pumpAndSettle();
      expect(
        find.text('Bánh Nướng Thập Cẩm Gà Quay 2 Trứng'),
        findsOneWidget,
      );
      expect(find.text('Bánh Dẻo Hạt Sen Trà Xanh'), findsOneWidget);

      // Navigate to Tab 3: Doanh nghiệp (Protected -> should show Login Gate for guest)
      await tester.tap(find.text('Doanh nghiệp'));
      await tester.pumpAndSettle();
      expect(
        find.textContaining(
            'Vui lòng đăng nhập để gửi yêu cầu báo giá và thương lượng'),
        findsOneWidget,
      );

      // Navigate to Tab 4: Đơn hàng (Protected -> should show Login Gate for guest)
      await tester.tap(find.text('Đơn hàng'));
      await tester.pumpAndSettle();
      expect(
        find.textContaining(
            'Vui lòng đăng nhập để theo dõi đơn hàng và thanh toán'),
        findsOneWidget,
      );
    });

    testWidgets('LoginScreen validates empty email and password fields',
        (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: LoginScreen(),
          ),
        ),
      );

      await tester.tap(find.widgetWithText(ElevatedButton, 'Đăng nhập'));
      await tester.pump();

      expect(find.text('Vui lòng nhập email.'), findsOneWidget);
      expect(find.text('Vui lòng nhập mật khẩu.'), findsOneWidget);
    });
  });
}
