import '../../../core/utils/formatters.dart';

class StoreModel {
  final int storeId;
  final int supplierUserId;
  final String name;
  final String slug;
  final String? description;
  final String logoUrl;
  final String bannerUrl;
  final double shippingFee;
  final String status;

  const StoreModel({
    required this.storeId,
    required this.supplierUserId,
    required this.name,
    required this.slug,
    this.description,
    required this.logoUrl,
    required this.bannerUrl,
    required this.shippingFee,
    required this.status,
  });

  /// Matches Web `CatalogContext.tsx` store grouping for Home filter pills.
  String get groupKey {
    final text = '${name.toLowerCase()} ${(description ?? '').toLowerCase()}';
    if (text.contains('chay') || text.contains('thanh đạm')) {
      return 'vegetarian';
    }
    if (text.contains('khách sạn') ||
        text.contains('5 sao') ||
        text.contains('cao cấp') ||
        text.contains('thượng hạng') ||
        text.contains('sheraton') ||
        text.contains('brodard')) {
      return 'premium';
    }
    if (text.contains('hiện đại') ||
        text.contains('tươi') ||
        text.contains('lava') ||
        text.contains('givral') ||
        text.contains('kết hợp')) {
      return 'modern';
    }
    return 'traditional';
  }

  String get categoryLabel {
    switch (groupKey) {
      case 'premium':
        return 'Quà biếu cao cấp';
      case 'modern':
        return 'Phong vị hiện đại';
      case 'vegetarian':
        return 'Bánh chay & thanh đạm';
      default:
        return 'Hương vị truyền thống';
    }
  }

  factory StoreModel.fromJson(Map<String, dynamic> json) {
    final id = Formatters.parseInt(json['storeId']);
    final fallbackIdx = ((id - 1).clamp(0, 7)) + 1;
    final rawLogo = json['logoUrl']?.toString().trim() ?? '';
    final rawBanner = json['bannerUrl']?.toString().trim() ?? '';
    return StoreModel(
      storeId: id,
      supplierUserId: Formatters.parseInt(json['supplierUserId']),
      name: (json['name'] ?? '').toString(),
      slug: (json['slug'] ?? '').toString(),
      description: json['description']?.toString(),
      logoUrl: rawLogo.isNotEmpty
          ? rawLogo
          : '/images/demo/brands/stores/store-logo-$fallbackIdx.png',
      bannerUrl: rawBanner.isNotEmpty
          ? rawBanner
          : '/images/demo/brands/stores/store-banner-$fallbackIdx.png',
      shippingFee: Formatters.parseDouble(json['shippingFee']),
      status: (json['status'] ?? 'ACTIVE').toString(),
    );
  }
}

class StoreBranchModel {
  final int branchId;
  final int storeId;
  final String branchName;
  final String province;
  final String district;
  final String ward;
  final String streetAddress;
  final String? phone;
  final String? openingHours;
  final bool isPrimary;
  final String status;

  const StoreBranchModel({
    required this.branchId,
    required this.storeId,
    required this.branchName,
    required this.province,
    required this.district,
    required this.ward,
    required this.streetAddress,
    this.phone,
    this.openingHours,
    required this.isPrimary,
    required this.status,
  });

  String get fullAddress => '$streetAddress, $ward, $district, $province';

  factory StoreBranchModel.fromJson(Map<String, dynamic> json) {
    return StoreBranchModel(
      branchId: Formatters.parseInt(json['branchId']),
      storeId: Formatters.parseInt(json['storeId']),
      branchName: (json['branchName'] ?? '').toString(),
      province: (json['province'] ?? '').toString(),
      district: (json['district'] ?? '').toString(),
      ward: (json['ward'] ?? '').toString(),
      streetAddress: (json['streetAddress'] ?? '').toString(),
      phone: json['phone']?.toString(),
      openingHours: json['openingHours']?.toString(),
      isPrimary: json['isPrimary'] == true,
      status: (json['status'] ?? 'ACTIVE').toString(),
    );
  }
}

class CategoryModel {
  final int categoryId;
  final int? parentCategoryId;
  final String name;
  final String slug;
  final String status;

  const CategoryModel({
    required this.categoryId,
    this.parentCategoryId,
    required this.name,
    required this.slug,
    required this.status,
  });

  factory CategoryModel.fromJson(Map<String, dynamic> json) {
    return CategoryModel(
      categoryId: Formatters.parseInt(json['categoryId']),
      parentCategoryId: json['parentCategoryId'] != null
          ? Formatters.parseInt(json['parentCategoryId'])
          : null,
      name: (json['name'] ?? '').toString(),
      slug: (json['slug'] ?? '').toString(),
      status: (json['status'] ?? 'ACTIVE').toString(),
    );
  }
}

class ProductVariantModel {
  final int variantId;
  final int productId;
  final String sku;
  final String variantName;
  final double basePrice;
  final int stockQuantity;
  final String? imageUrl;
  final String status;

  const ProductVariantModel({
    required this.variantId,
    required this.productId,
    required this.sku,
    required this.variantName,
    required this.basePrice,
    required this.stockQuantity,
    this.imageUrl,
    required this.status,
  });

  bool get isAvailable => status == 'ACTIVE' && stockQuantity > 0;

  factory ProductVariantModel.fromJson(Map<String, dynamic> json) {
    return ProductVariantModel(
      variantId: Formatters.parseInt(json['variantId']),
      productId: Formatters.parseInt(json['productId']),
      sku: (json['sku'] ?? '').toString(),
      variantName: (json['variantName'] ?? '').toString(),
      basePrice: Formatters.parseDouble(json['basePrice']),
      stockQuantity: Formatters.parseInt(json['stockQuantity']),
      imageUrl: json['imageUrl']?.toString(),
      status: (json['status'] ?? 'ACTIVE').toString(),
    );
  }
}

class ProductSummaryModel {
  final int productId;
  final int storeId;
  final String storeName;
  final int categoryId;
  final String categoryName;
  final String name;
  final String slug;
  final String? description;
  final String status;
  final double minPrice;
  final double maxPrice;
  final int totalStock;
  final String imageUrl;

  const ProductSummaryModel({
    required this.productId,
    required this.storeId,
    required this.storeName,
    required this.categoryId,
    required this.categoryName,
    required this.name,
    required this.slug,
    this.description,
    required this.status,
    required this.minPrice,
    required this.maxPrice,
    required this.totalStock,
    required this.imageUrl,
  });

  bool get inStock => status == 'ACTIVE' && totalStock > 0;

  ProductSummaryModel copyWith({String? storeName}) {
    return ProductSummaryModel(
      productId: productId,
      storeId: storeId,
      storeName: storeName ?? this.storeName,
      categoryId: categoryId,
      categoryName: categoryName,
      name: name,
      slug: slug,
      description: description,
      status: status,
      minPrice: minPrice,
      maxPrice: maxPrice,
      totalStock: totalStock,
      imageUrl: imageUrl,
    );
  }

  factory ProductSummaryModel.fromJson(
    Map<String, dynamic> json, {
    String storeName = 'Gian hàng chính hãng',
  }) {
    final id = Formatters.parseInt(json['productId']);
    final fallbackIdx = ((id - 1).clamp(0, 11)) + 1;
    final rawImg = json['imageUrl']?.toString().trim() ?? '';
    final minP = Formatters.parseDouble(json['minPrice']);
    final maxP = Formatters.parseDouble(json['maxPrice'], minP);
    return ProductSummaryModel(
      productId: id,
      storeId: Formatters.parseInt(json['storeId']),
      storeName: storeName,
      categoryId: Formatters.parseInt(json['categoryId']),
      categoryName: (json['categoryName'] ?? 'Bánh Trung thu').toString(),
      name: (json['name'] ?? '').toString(),
      slug: (json['slug'] ?? '').toString(),
      description: json['description']?.toString(),
      status: (json['status'] ?? 'ACTIVE').toString(),
      minPrice: minP,
      maxPrice: maxP,
      totalStock: Formatters.parseInt(json['totalStock']),
      imageUrl: rawImg.isNotEmpty
          ? rawImg
          : '/images/demo/brands/products/product-$fallbackIdx.png',
    );
  }
}

class ProductDetailModel {
  final ProductSummaryModel summary;
  final List<ProductVariantModel> variants;

  const ProductDetailModel({
    required this.summary,
    required this.variants,
  });

  factory ProductDetailModel.fromJson(
    Map<String, dynamic> json, {
    String storeName = 'Gian hàng chính hãng',
  }) {
    final summary = ProductSummaryModel.fromJson(json, storeName: storeName);
    final rawVariants = json['variants'];
    final variants = rawVariants is List
        ? rawVariants
            .whereType<Map>()
            .map((e) =>
                ProductVariantModel.fromJson(e.cast<String, dynamic>()))
            .toList()
        : const <ProductVariantModel>[];
    return ProductDetailModel(summary: summary, variants: variants);
  }
}

class PromotionRuleModel {
  final int ruleId;
  final String ruleType;
  final double? discountValue;
  final double? minOrderAmount;
  final int? buyQuantity;
  final int? freeQuantity;

  const PromotionRuleModel({
    required this.ruleId,
    required this.ruleType,
    this.discountValue,
    this.minOrderAmount,
    this.buyQuantity,
    this.freeQuantity,
  });

  String get summaryVi {
    final minText = (minOrderAmount != null && minOrderAmount! > 0)
        ? ' cho đơn từ ${Formatters.formatVnd(minOrderAmount)}'
        : '';
    switch (ruleType) {
      case 'PERCENT_DISCOUNT':
        final pct = discountValue?.toStringAsFixed(0) ?? '0';
        return 'Giảm $pct%$minText';
      case 'FIXED_DISCOUNT':
        return 'Giảm ${Formatters.formatVnd(discountValue)}$minText';
      case 'BUY_X_GET_Y':
        return 'Mua ${buyQuantity ?? 0} tặng ${freeQuantity ?? 0}$minText';
      default:
        return ruleType;
    }
  }

  factory PromotionRuleModel.fromJson(Map<String, dynamic> json) {
    return PromotionRuleModel(
      ruleId: Formatters.parseInt(json['ruleId']),
      ruleType: (json['ruleType'] ?? '').toString(),
      discountValue: json['discountValue'] != null
          ? Formatters.parseDouble(json['discountValue'])
          : null,
      minOrderAmount: json['minOrderAmount'] != null
          ? Formatters.parseDouble(json['minOrderAmount'])
          : null,
      buyQuantity: json['buyQuantity'] != null
          ? Formatters.parseInt(json['buyQuantity'])
          : null,
      freeQuantity: json['freeQuantity'] != null
          ? Formatters.parseInt(json['freeQuantity'])
          : null,
    );
  }
}

class PromotionModel {
  final int promotionId;
  final int storeId;
  final String name;
  final String status;
  final String startAt;
  final String endAt;
  final List<PromotionRuleModel> rules;

  const PromotionModel({
    required this.promotionId,
    required this.storeId,
    required this.name,
    required this.status,
    required this.startAt,
    required this.endAt,
    required this.rules,
  });

  bool get isActiveNow {
    if (status != 'ACTIVE') return false;
    final now = DateTime.now();
    final start = Formatters.parseApiDate(startAt);
    final end = Formatters.parseApiDate(endAt);
    if (start != null && now.isBefore(start)) return false;
    if (end != null && now.isAfter(end)) return false;
    return true;
  }

  factory PromotionModel.fromJson(Map<String, dynamic> json) {
    final rawRules = json['rules'];
    return PromotionModel(
      promotionId: Formatters.parseInt(json['promotionId']),
      storeId: Formatters.parseInt(json['storeId']),
      name: (json['name'] ?? '').toString(),
      status: (json['status'] ?? 'ACTIVE').toString(),
      startAt: (json['startAt'] ?? '').toString(),
      endAt: (json['endAt'] ?? '').toString(),
      rules: rawRules is List
          ? rawRules
              .whereType<Map>()
              .map((e) =>
                  PromotionRuleModel.fromJson(e.cast<String, dynamic>()))
              .toList()
          : const [],
    );
  }
}

class ReviewModel {
  final int reviewId;
  final int orderItemId;
  final int customerId;
  final int storeId;
  final int variantId;
  final int rating;
  final String? comment;
  final String createdAt;

  const ReviewModel({
    required this.reviewId,
    required this.orderItemId,
    required this.customerId,
    required this.storeId,
    required this.variantId,
    required this.rating,
    this.comment,
    required this.createdAt,
  });

  factory ReviewModel.fromJson(Map<String, dynamic> json) {
    return ReviewModel(
      reviewId: Formatters.parseInt(json['reviewId']),
      orderItemId: Formatters.parseInt(json['orderItemId']),
      customerId: Formatters.parseInt(json['customerId']),
      storeId: Formatters.parseInt(json['storeId']),
      variantId: Formatters.parseInt(json['variantId']),
      rating: Formatters.parseInt(json['rating'], 5),
      comment: json['comment']?.toString(),
      createdAt: (json['createdAt'] ?? '').toString(),
    );
  }
}
