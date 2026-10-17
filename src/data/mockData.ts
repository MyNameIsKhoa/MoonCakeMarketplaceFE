import { Product, Brand, Review, Promotion } from '../types';

export const BRANDS: Brand[] = [
  {
    id: 'kinh-do',
    storeCode: 'STORE-KD',
    name: 'Kinh Đô - Mondelez',
    supplierId: 'sup-01',
    supplierName: 'Công ty CP Mondelez Kinh Đô Việt Nam',
    logo: 'https://images.unsplash.com/photo-1549488344-cbb6c34cf08b?auto=format&fit=crop&q=80&w=200',
    banner: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=1200',
    description: 'Thương hiệu bánh trung thu quốc dân hàng đầu Việt Nam với hơn 30 năm đồng hành cùng mùa trăng rằm.',
    rating: 4.9,
    productCount: 45,
    responseRate: '99%',
    joinedYear: 1993
  },
  {
    id: 'nhu-lan',
    storeCode: 'STORE-NL',
    name: 'Đặc Sản Như Lan',
    supplierId: 'sup-02',
    supplierName: 'Công ty TNHH Thực Phẩm Như Lan',
    logo: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&q=80&w=200',
    banner: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&q=80&w=1200',
    description: 'Hương vị truyền thống Sài Gòn xưa, nổi tiếng với bánh nướng thập cẩm và dẻo hạt sen thơm ngon chuẩn vị.',
    rating: 4.8,
    productCount: 28,
    responseRate: '98%',
    joinedYear: 1975
  },
  {
    id: 'madame-huong',
    storeCode: 'STORE-MH',
    name: 'Madame Hương Hà Nội',
    supplierId: 'sup-03',
    supplierName: 'Công ty TNHH Madame Hương',
    logo: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&q=80&w=200',
    banner: 'https://images.unsplash.com/photo-1514517517853-eef7d50731a5?auto=format&fit=crop&q=80&w=1200',
    description: 'Sự kết tinh hoàn hảo giữa nghệ thuật ẩm thực Pháp và tinh hoa truyền thống phố cổ Hà Nội.',
    rating: 4.95,
    productCount: 32,
    responseRate: '100%',
    joinedYear: 2016
  },
  {
    id: 'brodard',
    storeCode: 'STORE-BD',
    name: 'Brodard Bakery',
    supplierId: 'sup-04',
    supplierName: 'Công ty TNHH Brodard Bakery',
    logo: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=200',
    banner: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&q=80&w=1200',
    description: 'Thương hiệu bánh thượng hạng từ năm 1948, kết hợp phong cách Pháp tinh tế và vị ngon truyền thống.',
    rating: 4.9,
    productCount: 24,
    responseRate: '99%',
    joinedYear: 1948
  },
  {
    id: 'givral',
    storeCode: 'STORE-GV',
    name: 'Givral Bakery',
    supplierId: 'sup-05',
    supplierName: 'Công ty CP Givral',
    logo: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&q=80&w=200',
    banner: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=1200',
    description: 'Bánh trung thu tươi không chất bảo quản, vỏ mỏng nhân đầy, hương vị thanh tao khó quên.',
    rating: 4.85,
    productCount: 26,
    responseRate: '97%',
    joinedYear: 1950
  }
];

// promotion + promotion_rule (per store). Evaluated by the (mock) backend at checkout.
export const PROMOTIONS: Promotion[] = [
  {
    promotionId: 'promo-kd-01',
    storeId: 'kinh-do',
    name: 'Mùa Trăng 2026: giảm 10% khi mua từ 2 sản phẩm',
    startAt: '2026-09-01T00:00:00',
    endAt: '2026-10-31T23:59:59',
    status: 'ACTIVE',
    rules: [{ promotionRuleId: 'rule-kd-01', ruleType: 'PERCENT_DISCOUNT', minQuantity: 2, discountPercent: 10 }]
  },
  {
    promotionId: 'promo-nl-01',
    storeId: 'nhu-lan',
    name: 'Giảm 30.000đ cho đơn từ 3 bánh',
    startAt: '2026-09-01T00:00:00',
    endAt: '2026-10-25T23:59:59',
    status: 'ACTIVE',
    rules: [{ promotionRuleId: 'rule-nl-01', ruleType: 'FIXED_DISCOUNT', minQuantity: 3, discountAmount: 30000 }]
  },
  {
    promotionId: 'promo-mh-01',
    storeId: 'madame-huong',
    name: 'Ưu đãi hộp quà Hà Thành: giảm 5%',
    startAt: '2026-09-10T00:00:00',
    endAt: '2026-10-30T23:59:59',
    status: 'ACTIVE',
    rules: [{ promotionRuleId: 'rule-mh-01', ruleType: 'PERCENT_DISCOUNT', minQuantity: 1, discountPercent: 5 }]
  },
  {
    promotionId: 'promo-bd-01',
    storeId: 'brodard',
    name: 'Giảm 50.000đ khi mua từ 4 bánh lava',
    startAt: '2026-09-01T00:00:00',
    endAt: '2026-10-25T23:59:59',
    status: 'ACTIVE',
    rules: [{ promotionRuleId: 'rule-bd-01', ruleType: 'FIXED_DISCOUNT', minQuantity: 4, discountAmount: 50000 }]
  },
  {
    promotionId: 'promo-gv-01',
    storeId: 'givral',
    name: 'Giảm 20.000đ khi mua từ 2 bánh',
    startAt: '2026-09-01T00:00:00',
    endAt: '2026-10-20T23:59:59',
    status: 'ACTIVE',
    rules: [{ promotionRuleId: 'rule-gv-01', ruleType: 'FIXED_DISCOUNT', minQuantity: 2, discountAmount: 20000 }]
  }
];

export const CATEGORIES = [
  { id: 'all', name: 'Tất cả sản phẩm', icon: 'Sparkles' },
  { id: 'truyen-thong', name: 'Bánh Truyền Thống', icon: 'Cookie' },
  { id: 'cao-cap', name: 'Hộp Quà Cao Cấp', icon: 'Gift' },
  { id: 'hiện-đại', name: 'Bánh Hiện Đại / Lava', icon: 'Flame' },
  { id: 'chay', name: 'Bánh Chay / Thực Dưỡng', icon: 'Leaf' },
  { id: 'thieu-nhi', name: 'Bánh Thiếu Nhi & Đèn', icon: 'Heart' },
];

export const PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'Hộp Quà Trăng Vàng Hoàng Kim - Kinh Đô',
    brandId: 'kinh-do',
    brandName: 'Kinh Đô - Mondelez',
    price: 1280000,
    originalPrice: 1500000,
    rating: 4.9,
    reviewCount: 342,
    image: 'https://images.unsplash.com/photo-1549488344-cbb6c34cf08b?auto=format&fit=crop&q=80&w=600',
    gallery: [
      'https://images.unsplash.com/photo-1549488344-cbb6c34cf08b?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&q=80&w=800'
    ],
    category: 'cao-cap',
    flavor: 'Vi cá hải sâm, Bào ngư lẩu Thái, Đậu xanh hạt sen, Hạt sen trà xanh',
    weight: '4 bánh x 200g + Hộp trà Ô Long cao cấp',
    ingredients: ['Bột mì', 'Đường tinh luyện', 'Dầu thực vật', 'Vi cá (2.5%)', 'Hải sâm', 'Trứng muối', 'Hạt sen'],
    sugarLevel: 'Ít ngọt (Giảm 30%)',
    description: 'Hộp quà Trăng Vàng Hoàng Kim biểu tượng cho sự phú quý, thịnh vượng và lời chúc vẹn tròn thành công. Thiết kế sang trọng mạ vàng kết hợp cùng những hương vị thượng hạng nhất.',
    salesCount: 1520,
    inStock: true,
    isFlashSale: true,
    flashSaleEnds: '2026-10-20T23:59:59',
    isBestSeller: true
  },
  {
    id: 'prod-2',
    name: 'Bánh Nướng Thập Cẩm Gà Quay Bào Ngư (2 Trứng) - Như Lan',
    brandId: 'nhu-lan',
    brandName: 'Đặc Sản Như Lan',
    price: 185000,
    originalPrice: 210000,
    rating: 4.8,
    reviewCount: 512,
    image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&q=80&w=600',
    gallery: [
      'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=800'
    ],
    category: 'truyen-thong',
    flavor: 'Thập cẩm gà quay bào ngư',
    weight: '250g',
    ingredients: ['Thịt gà quay', 'Bào ngư sợi', 'Lạp xưởng', 'Hạt điều', 'Mứt bí', 'Mè trắng', 'Trứng muối (2 quả)'],
    sugarLevel: 'Tiêu chuẩn',
    description: 'Bánh nướng truyền thống đặc trưng của Như Lan Sài Gòn với lớp vỏ vàng óng, nhân thập cẩm đậm đà vị bùi béo của các loại hạt và vị mặn ngọt hài hòa của gà quay bào ngư.',
    salesCount: 3200,
    inStock: true,
    isBestSeller: true
  },
  {
    id: 'prod-3',
    name: 'Hộp Quà Sơn Thủy Hữu Tình - Madame Hương',
    brandId: 'madame-huong',
    brandName: 'Madame Hương Hà Nội',
    price: 950000,
    originalPrice: 1100000,
    rating: 4.95,
    reviewCount: 184,
    image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&q=80&w=600',
    gallery: [
      'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1514517517853-eef7d50731a5?auto=format&fit=crop&q=80&w=800'
    ],
    category: 'cao-cap',
    flavor: 'Cốm xanh Hà Nội, Sen xát trứng muối, Môn trứng muối, Trà xanh hạnh nhân',
    weight: '4 bánh x 150g + Hộp quà sơn mài thủ công',
    ingredients: ['Cốm tươi làng Vòng', 'Đậu xanh', 'Hạt sen', 'Hạnh nhân', 'Trứng muối'],
    sugarLevel: 'Ít ngọt (Giảm 30%)',
    description: 'Hộp quà khắc họa vẻ đẹp thơ mộng của thủ đô qua nét vẽ tinh xảo trên chất liệu sơn mài cao cấp. Bên trong là những chiếc bánh nướng nhân cốm xanh và sen xát đậm chất Hà Thành.',
    salesCount: 890,
    inStock: true,
    isFlashSale: true,
    flashSaleEnds: '2026-10-22T18:00:00',
    isBestSeller: true
  },
  {
    id: 'prod-4',
    name: 'Bánh Nướng Lava Trứng Chảy Sầu Riêng - Brodard',
    brandId: 'brodard',
    brandName: 'Brodard Bakery',
    price: 240000,
    originalPrice: 280000,
    rating: 4.9,
    reviewCount: 620,
    image: 'https://images.unsplash.com/photo-1514517517853-eef7d50731a5?auto=format&fit=crop&q=80&w=600',
    gallery: [
      'https://images.unsplash.com/photo-1514517517853-eef7d50731a5?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1549488344-cbb6c34cf08b?auto=format&fit=crop&q=80&w=800'
    ],
    category: 'hiện-đại',
    flavor: 'Sầu riêng Ri6 trứng chảy',
    weight: '120g',
    ingredients: ['Sầu riêng tươi (40%)', 'Sữa tươi', 'Bơ Pháp', 'Trứng muối', 'Bột mì cao cấp'],
    sugarLevel: 'Tiêu chuẩn',
    description: 'Hương vị hiện đại gây nghiện với lớp nhân sầu riêng tươi đậm đặc tan chảy ngay khi cắt bánh. Vỏ bánh mềm mịn thơm bơ chuẩn Pháp.',
    salesCount: 2450,
    inStock: true,
    isFlashSale: true,
    flashSaleEnds: '2026-10-25T12:00:00'
  },
  {
    id: 'prod-5',
    name: 'Bánh Dẻo Hạt Sen Hạt Chia (Không Đường) - Givral',
    brandId: 'givral',
    brandName: 'Givral Bakery',
    price: 145000,
    originalPrice: 160000,
    rating: 4.75,
    reviewCount: 210,
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=600',
    gallery: [
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=800'
    ],
    category: 'chay',
    flavor: 'Hạt sen & Hạt chia',
    weight: '200g',
    ingredients: ['Hạt sen', 'Hạt chia hữu cơ', 'Đường Isomalt (Dành cho người ăn kiêng & tiểu đường)', 'Bột nếp dẻo'],
    sugarLevel: 'Không đường (Dành cho người ăn kiêng)',
    description: 'Sự lựa chọn hoàn hảo cho người ăn kiêng, tiểu đường hoặc quan tâm đến sức khỏe. Vỏ bánh dẻo thơm mát kết hợp nhân hạt sen nhuyễn mịn và hạt chia giàu Omega-3.',
    salesCount: 1120,
    inStock: true
  },
  {
    id: 'prod-6',
    name: 'Hộp Quà Thượng Uyển Hoàng Gia - Kinh Đô',
    brandId: 'kinh-do',
    brandName: 'Kinh Đô - Mondelez',
    price: 2450000,
    originalPrice: 2800000,
    rating: 4.98,
    reviewCount: 95,
    image: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&q=80&w=600',
    gallery: [
      'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1549488344-cbb6c34cf08b?auto=format&fit=crop&q=80&w=800'
    ],
    category: 'cao-cap',
    flavor: 'Vi cá yến sào, Bào ngư đông trùng hạ thảo, Hạt sen long nhãn, Trà Ô Long thượng hạng',
    weight: '6 bánh đặc biệt + 1 chai rượu vang nhẹ / Trà',
    ingredients: ['Yến sào Khánh Hòa', 'Vi cá', 'Đông trùng hạ thảo', 'Bào ngư', 'Hạt sen'],
    sugarLevel: 'Ít ngọt (Giảm 30%)',
    description: 'Tuyệt tác quà tặng biếu đối tác và nguyên thủ. Hộp quà thiết kế hoàng gia với âm thanh hộp nhạc truyền thống và các nguyên liệu quý hiếm bậc nhất.',
    salesCount: 430,
    inStock: true,
    isBestSeller: true
  },
  {
    id: 'prod-7',
    name: 'Bánh Nướng Đậu Xanh Lá Dứa (1 Trứng) - Như Lan',
    brandId: 'nhu-lan',
    brandName: 'Đặc Sản Như Lan',
    price: 135000,
    originalPrice: 150000,
    rating: 4.8,
    reviewCount: 310,
    image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&q=80&w=600',
    gallery: [
      'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&q=80&w=800'
    ],
    category: 'truyen-thong',
    flavor: 'Đậu xanh lá dứa',
    weight: '200g',
    ingredients: ['Đậu xanh nguyên chất', 'Lá dứa tươi', 'Dầu dừa', 'Trứng muối (1 quả)'],
    sugarLevel: 'Tiêu chuẩn',
    description: 'Hương vị thân thuộc từ thuở thơ ấu với nhân đậu xanh nhuyễn quyện hương lá dứa thơm mát dịu nhẹ.',
    salesCount: 2890,
    inStock: true
  },
  {
    id: 'prod-8',
    name: 'Hộp Thiếu Nhi - Bánh Hình Thú & Lồng Đèn - Kinh Đô',
    brandId: 'kinh-do',
    brandName: 'Kinh Đô - Mondelez',
    price: 195000,
    originalPrice: 220000,
    rating: 4.9,
    reviewCount: 740,
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=600',
    gallery: [
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=800'
    ],
    category: 'thieu-nhi',
    flavor: 'Sô cô la sữa, Đậu xanh sữa dừa',
    weight: '4 bánh nhỏ x 80g + Tặng kèm lồng đèn phát nhạc',
    ingredients: ['Bột mì', 'Sữa tươi nguyên chất', 'Bột ca cao nguyên chất', 'Đậu xanh'],
    sugarLevel: 'Tiêu chuẩn',
    description: 'Món quà tuyệt vời cho các bé thiếu nhi đêm rằm trung thu. Bánh tạo hình các con vật ngộ nghĩnh kèm theo lồng đèn ngôi sao phát nhạc lung linh.',
    salesCount: 4120,
    inStock: true,
    isBestSeller: true
  }
];

export const REVIEWS: Review[] = [
  {
    id: 'rev-1',
    productId: 'prod-1',
    userName: 'Nguyễn Văn Minh',
    userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100',
    rating: 5,
    date: '12/10/2026',
    comment: 'Hộp quà cực kỳ sang trọng, đem biếu sếp rất lịch sự và đẳng cấp. Bánh ít ngọt, vị vi cá bào ngư thơm ngon đặc biệt. Giao hàng siêu tốc trong 2 giờ.',
    sugarLevelOption: 'Ít ngọt (Giảm 30%)',
    photos: ['https://images.unsplash.com/photo-1549488344-cbb6c34cf08b?auto=format&fit=crop&q=80&w=300']
  },
  {
    id: 'rev-2',
    productId: 'prod-2',
    userName: 'Trần Thị Mai',
    userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100',
    rating: 5,
    date: '10/10/2026',
    comment: 'Chuẩn vị Như Lan Sài Gòn truyền thống. Nhà mình năm nào cũng mua loại thập cẩm gà quay này. Sàn đóng gói cấn móp rất cẩn thận.',
    sugarLevelOption: 'Tiêu chuẩn'
  },
  {
    id: 'rev-3',
    productId: 'prod-4',
    userName: 'Lê Hoàng Long',
    userAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=100',
    rating: 5,
    date: '09/10/2026',
    comment: 'Bánh lava sầu riêng Brodard ngon xuất sắc! Nhân chảy ngập tràn, cắt ra là sầu riêng thơm nức mũi.',
    sugarLevelOption: 'Tiêu chuẩn'
  }
];

export const FESTIVE_BLOGS = [
  {
    id: 'blog-1',
    title: 'Bí quyết chọn trà thưởng thức cùng từng loại bánh trung thu để trọn vẹn vị giác',
    excerpt: 'Thưởng thức bánh trung thu cùng tách trà nóng hổi là nét văn hóa tao nhã lâu đời. Cùng khám phá cách kết hợp trà Ô Long, trà sen hay trà xanh...',
    image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&q=80&w=600',
    date: '10/10/2026',
    readTime: '5 phút đọc'
  },
  {
    id: 'blog-2',
    title: 'Ý nghĩa các hộp quà biếu Tết Trung Thu trong văn hóa doanh nghiệp hiện đại',
    excerpt: 'Tặng quà trung thu cho đối tác và nhân viên không chỉ là tri ân mà còn gắn kết quan hệ hợp tác bền chặt trong mùa trăng...',
    image: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&q=80&w=600',
    date: '08/10/2026',
    readTime: '4 phút đọc'
  },
  {
    id: 'blog-3',
    title: 'Top 5 thương hiệu bánh trung thu truyền thống và hiện đại được săn đón nhất 2026',
    excerpt: 'Điểm danh các thương hiệu uy tín từ Kinh Đô, Như Lan, Madame Hương đến Brodard với những bộ sưu tập hộp quà độc đáo năm nay.',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=600',
    date: '05/10/2026',
    readTime: '6 phút đọc'
  }
];
