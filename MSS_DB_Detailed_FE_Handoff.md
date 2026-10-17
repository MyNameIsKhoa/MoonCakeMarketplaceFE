# MSS — Database Dictionary & Frontend Handoff (Physical SQL Server v1)

> **Mục đích:** tài liệu đưa cho AI/nhóm React + TypeScript để hiểu đầy đủ dữ liệu nghiệp vụ MSS và xây UI đúng. Đây là **bản mô tả schema vật lý tham chiếu**, đối chiếu trực tiếp từ 4 file SQL Server DDL v1; **không chứng minh backend hiện đã có API hoạt động**. Không đưa thông tin truy cập DB cho trình duyệt.

## 0. Quy tắc sử dụng tài liệu

- **Frontend gọi Backend qua API Gateway**, không kết nối SQL Server, không viết SQL ở browser.
- Tên cột bên dưới là **snake_case trong SQL**. JSON DTO qua API có thể khác (vd. `sellerOrderId`, `grandTotal`); **ưu tiên OpenAPI/Swagger và DTO backend thực tế**. Không tự tưởng tượng endpoint/response là đã tồn tại.
- **Các status không có enum CHECK hoàn chỉnh thì chưa có contract chính thức**. Dùng status trả về từ API, map nhãn/ màu tập trung, hỗ trợ trạng thái chưa biết.
- Giá/chiết khấu/phí/cọc/phần còn lại/settlement được **backend tính và xác nhận**, FE chỉ định dạng và hiển thị; không lấy tính toán FE làm nguồn thật.
- Các trường `*_snapshot` là dữ liệu lịch sử bất biến. Trang order/quotation history dùng snapshot, **không query Catalog để ghi đè tên/giá lúc đặt**.
- Khóa `*_id_ref` là tham chiếu logic giữa các microservice, không phải FK vật lý. FK thật chỉ nằm trong cùng database.
- **Mâu thuẫn tài liệu cần chú ý:** workplan v3 cũ liệt kê `SUPPLIER_PROFILE` ở Catalog, nhưng **SQL physical v1 đặt `supplier_profile` trong `mss_identity`**. Trong *database dictionary này*, lấy SQL physical làm chuẩn; phải xác nhận lại ownership khi map backend hiện tại.

## 1. Bức tranh tổng quan

| Database | Domain / owner | Số bảng | Phục vụ màn hình |
|---|---|---:|---|
| `mss_identity` | Identity | 4 | Đăng nhập/hồ sơ, thông tin nhà cung cấp, sổ địa chỉ |
| `mss_catalog_store` | Catalog & Store | 6 | Gian hàng, danh mục, sản phẩm, biến thể, khuyến mãi |
| `mss_commerce` | Commerce | 13 | Giỏ hàng, checkout, đơn, payment, ship, refund, dispute, settlement, review |
| `mss_rfq_negotiation` | RFQ & Negotiation | 5 | RFQ công khai, báo giá/version, chat |

**Tổng cộng: 28 bảng** theo SQL v1.

### Quan hệ nghiệp vụ xuyên domain

```text
Identity.customer_profile(customer_id)
    --> Commerce.customer_order.customer_id_ref
    --> RFQ.rfq.customer_id_ref
Identity.supplier_profile(supplier_id)
    --> Catalog.store.supplier_id_ref
    --> Commerce.seller_order.supplier_id_ref
    --> RFQ.quotation.supplier_id_ref
Catalog.store(store_id) --> Commerce.seller_order.store_id_ref
Catalog.product_variant(variant_id)
    --> Commerce.cart_item.variant_id_ref / order_item.variant_id_ref
    --> RFQ.quotation_item.variant_id_ref
RFQ.rfq(rfq_id) --> Commerce.customer_order.rfq_id_ref
RFQ.quotation(quotation_id) --> Commerce.seller_order.quotation_id_ref
```

**Một lần checkout** có `customer_order` tổng → nhiều `seller_order` (mỗi cửa hàng/supplier) → nhiều `order_item`. Payment, shipment, refund, dispute, settlement đi theo **seller order**, không gộp bừa sang order tổng.


## Identity — `mss_identity`

*Nguồn: `01_mss_identity.sql`; các cột dưới đây khớp với DDL (nullable/default/PK/FK/unique). Phần mô tả công dụng chỉ hỗ trợ UI.*


### `dbo.app_user`

Tài khoản định danh cơ bản; schema hiện tại **không có** password/role/session; luồng auth phải theo hợp đồng backend.

| Cột | SQL Server type | Null? | Khóa / ràng buộc / default | Ý nghĩa cho FE |
|---|---|:---:|---|---|
| `user_id` | `BIGINT` | Không | PK | Mã user |
| `email` | `NVARCHAR(255)` | Không | UNIQUE | Email đăng nhập/định danh |
| `status` | `NVARCHAR(30)` | Không | — | Mã trạng thái; map label từ API/contract, không đoán toàn bộ enum |
| `created_at` | `DATETIME2(0)` | Không | DEFAULT SYSUTCDATETIME() | Thời gian tạo |
| `updated_at` | `DATETIME2(0)` | Không | DEFAULT SYSUTCDATETIME() | Thời gian cập nhật |

**Unique:** `email`.



### `dbo.customer_profile`

Thông tin khách hàng gắn 1–1 với tài khoản.

| Cột | SQL Server type | Null? | Khóa / ràng buộc / default | Ý nghĩa cho FE |
|---|---|:---:|---|---|
| `customer_id` | `BIGINT` | Không | PK | Mã customer |
| `user_id` | `BIGINT` | Không | FK → `app_user.user_id`; UNIQUE | Mã user |
| `full_name` | `NVARCHAR(255)` | Không | — | Họ tên khách |
| `phone` | `NVARCHAR(30)` | Có | — | Số điện thoại |
| `created_at` | `DATETIME2(0)` | Không | DEFAULT SYSUTCDATETIME() | Thời gian tạo |
| `updated_at` | `DATETIME2(0)` | Không | DEFAULT SYSUTCDATETIME() | Thời gian cập nhật |

**FK nội bộ:** `user_id` → `app_user.user_id`.

**Unique:** `user_id`.



### `dbo.supplier_profile`

Hồ sơ nhà cung cấp và trạng thái xác minh; **ở Identity DB theo physical SQL**.

| Cột | SQL Server type | Null? | Khóa / ràng buộc / default | Ý nghĩa cho FE |
|---|---|:---:|---|---|
| `supplier_id` | `BIGINT` | Không | PK | Mã supplier |
| `user_id` | `BIGINT` | Không | FK → `app_user.user_id`; UNIQUE | Mã user |
| `company_name` | `NVARCHAR(255)` | Không | — | Tên công ty nhà cung cấp |
| `tax_code` | `NVARCHAR(100)` | Không | UNIQUE | Mã số thuế |
| `verification_status` | `NVARCHAR(30)` | Không | — | Trạng thái xác minh supplier |
| `created_at` | `DATETIME2(0)` | Không | DEFAULT SYSUTCDATETIME() | Thời gian tạo |
| `updated_at` | `DATETIME2(0)` | Không | DEFAULT SYSUTCDATETIME() | Thời gian cập nhật |

**FK nội bộ:** `user_id` → `app_user.user_id`.

**Unique:** `user_id`, `tax_code`.



### `dbo.address`

Sổ địa chỉ giao hàng khách hàng có thể cập nhật.

| Cột | SQL Server type | Null? | Khóa / ràng buộc / default | Ý nghĩa cho FE |
|---|---|:---:|---|---|
| `address_id` | `BIGINT` | Không | PK | ID địa chỉ |
| `customer_id` | `BIGINT` | Không | FK → `customer_profile.customer_id` | Mã customer |
| `recipient_name` | `NVARCHAR(255)` | Không | — | Người nhận |
| `recipient_phone` | `NVARCHAR(30)` | Không | — | SĐT người nhận |
| `address_line` | `NVARCHAR(500)` | Không | — | Địa chỉ cụ thể |
| `ward` | `NVARCHAR(100)` | Có | — | Phường/xã |
| `district` | `NVARCHAR(100)` | Có | — | Quận/huyện |
| `city` | `NVARCHAR(100)` | Không | — | Tỉnh/thành phố |
| `is_default` | `BIT` | Không | DEFAULT 0 | Địa chỉ mặc định |

**FK nội bộ:** `customer_id` → `customer_profile.customer_id`.



## Catalog & Store — `mss_catalog_store`

*Nguồn: `02_mss_catalog_store.sql`; các cột dưới đây khớp với DDL (nullable/default/PK/FK/unique). Phần mô tả công dụng chỉ hỗ trợ UI.*


### `dbo.store`

Gian hàng thuộc một supplier, có logo/banner/theme key.

| Cột | SQL Server type | Null? | Khóa / ràng buộc / default | Ý nghĩa cho FE |
|---|---|:---:|---|---|
| `store_id` | `BIGINT` | Không | PK | Mã store |
| `supplier_id_ref` | `BIGINT` | Không | cross-service logical ref | Tham chiếu sang Identity supplier (không FK) |
| `store_code` | `NVARCHAR(100)` | Không | UNIQUE | Mã gian hàng |
| `name` | `NVARCHAR(255)` | Không | — | Tên hiển thị |
| `slug` | `NVARCHAR(255)` | Không | UNIQUE | Slug dùng cho URL |
| `logo_url` | `NVARCHAR(500)` | Có | — | Hình logo |
| `banner_url` | `NVARCHAR(500)` | Có | — | Hình banner |
| `theme_key` | `NVARCHAR(100)` | Có | — | Mã theme store, không phải CSS tự do |
| `status` | `NVARCHAR(30)` | Không | — | Mã trạng thái; map label từ API/contract, không đoán toàn bộ enum |

**Unique:** `store_code`, `slug`.



### `dbo.category`

Danh mục cây phân cấp bằng parent_category_id.

| Cột | SQL Server type | Null? | Khóa / ràng buộc / default | Ý nghĩa cho FE |
|---|---|:---:|---|---|
| `category_id` | `BIGINT` | Không | PK | Mã category |
| `parent_category_id` | `BIGINT` | Có | FK → `category.category_id` | Khóa định danh: parent_category_id |
| `name` | `NVARCHAR(255)` | Không | — | Tên hiển thị |
| `slug` | `NVARCHAR(255)` | Không | UNIQUE | Slug dùng cho URL |
| `status` | `NVARCHAR(30)` | Không | — | Mã trạng thái; map label từ API/contract, không đoán toàn bộ enum |

**FK nội bộ:** `parent_category_id` → `category.category_id`.

**Unique:** `slug`.



### `dbo.product`

Thông tin sản phẩm; nằm trong một store và một category.

| Cột | SQL Server type | Null? | Khóa / ràng buộc / default | Ý nghĩa cho FE |
|---|---|:---:|---|---|
| `product_id` | `BIGINT` | Không | PK | Mã product |
| `store_id` | `BIGINT` | Không | FK → `store.store_id`; UNIQUE (composite) | Mã store |
| `category_id` | `BIGINT` | Không | FK → `category.category_id` | Mã category |
| `product_code` | `NVARCHAR(100)` | Không | UNIQUE (composite) | Mã sản phẩm ổn định trong store |
| `name` | `NVARCHAR(255)` | Không | — | Tên hiển thị |
| `status` | `NVARCHAR(30)` | Không | — | Mã trạng thái; map label từ API/contract, không đoán toàn bộ enum |
| `created_at` | `DATETIME2(0)` | Không | DEFAULT SYSUTCDATETIME() | Thời gian tạo |
| `updated_at` | `DATETIME2(0)` | Không | DEFAULT SYSUTCDATETIME() | Thời gian cập nhật |

**FK nội bộ:** `store_id` → `store.store_id`; `category_id` → `category.category_id`.

**Unique:** `store_id,product_code`.



### `dbo.product_variant`

SKU bán được, giá hiện hành và tồn kho.

| Cột | SQL Server type | Null? | Khóa / ràng buộc / default | Ý nghĩa cho FE |
|---|---|:---:|---|---|
| `variant_id` | `BIGINT` | Không | PK | Mã variant |
| `product_id` | `BIGINT` | Không | FK → `product.product_id` | Mã product |
| `sku` | `NVARCHAR(100)` | Không | UNIQUE | SKU duy nhất toàn Catalog DB |
| `variant_name` | `NVARCHAR(255)` | Không | — | variant name |
| `image_url` | `NVARCHAR(500)` | Có | — | URL hình variant |
| `base_price` | `DECIMAL(18,2)` | Không | — | Giá niêm yết hiện tại, không dùng cho order history |
| `stock_quantity` | `INT` | Không | DEFAULT 0 | Tồn kho hiện tại, chỉ Catalog kiểm soát |
| `status` | `NVARCHAR(30)` | Không | — | Mã trạng thái; map label từ API/contract, không đoán toàn bộ enum |

**FK nội bộ:** `product_id` → `product.product_id`.

**Unique:** `sku`.

**CHECK constraints:**

- `(base_price >= 0)`

- `(stock_quantity >= 0)`



### `dbo.promotion`

Chương trình khuyến mãi theo gian hàng và thời gian.

| Cột | SQL Server type | Null? | Khóa / ràng buộc / default | Ý nghĩa cho FE |
|---|---|:---:|---|---|
| `promotion_id` | `BIGINT` | Không | PK | Mã promotion |
| `store_id` | `BIGINT` | Không | FK → `store.store_id` | Mã store |
| `name` | `NVARCHAR(255)` | Không | — | Tên hiển thị |
| `start_at` | `DATETIME2(0)` | Không | — | Bắt đầu hiệu lực |
| `end_at` | `DATETIME2(0)` | Không | — | Hết hiệu lực |
| `status` | `NVARCHAR(30)` | Không | — | Mã trạng thái; map label từ API/contract, không đoán toàn bộ enum |

**FK nội bộ:** `store_id` → `store.store_id`.

**CHECK constraints:**

- `(end_at > start_at)`



### `dbo.promotion_rule`

Điều kiện/ưu đãi giảm phần trăm, số tiền, hoặc mua X tặng Y.

| Cột | SQL Server type | Null? | Khóa / ràng buộc / default | Ý nghĩa cho FE |
|---|---|:---:|---|---|
| `promotion_rule_id` | `BIGINT` | Không | PK | Mã rule |
| `promotion_id` | `BIGINT` | Không | FK → `promotion.promotion_id` | Mã promotion |
| `target_variant_id` | `BIGINT` | Có | FK → `product_variant.variant_id` | SKU mục tiêu nếu promotion theo SKU |
| `reward_variant_id` | `BIGINT` | Có | FK → `product_variant.variant_id` | SKU tặng nếu BUY_X_GET_Y |
| `rule_type` | `NVARCHAR(30)` | Không | — | PERCENT_DISCOUNT, FIXED_DISCOUNT, BUY_X_GET_Y |
| `min_quantity` | `INT` | Có | — | Ngưỡng số lượng |
| `discount_percent` | `DECIMAL(5,2)` | Có | — | Phần trăm chiết khấu |
| `discount_amount` | `DECIMAL(18,2)` | Có | — | Giảm tiền, ngữ nghĩa theo cấp item/rule |
| `reward_quantity` | `INT` | Có | — | Số lượng được tặng |

**FK nội bộ:** `promotion_id` → `promotion.promotion_id`; `target_variant_id` → `product_variant.variant_id`; `reward_variant_id` → `product_variant.variant_id`.

**CHECK constraints:**

- `(rule_type IN ('PERCENT_DISCOUNT','FIXED_DISCOUNT','BUY_X_GET_Y'))`

- `(min_quantity IS NULL OR min_quantity > 0)`

- `(discount_percent IS NULL OR (discount_percent >= 0 AND discount_percent <= 100))`

- `(discount_amount IS NULL OR discount_amount >= 0)`

- `(reward_quantity IS NULL OR reward_quantity > 0)`



## Commerce — `mss_commerce`

*Nguồn: `03_mss_commerce.sql`; các cột dưới đây khớp với DDL (nullable/default/PK/FK/unique). Phần mô tả công dụng chỉ hỗ trợ UI.*


### `dbo.cart`

Giỏ hàng khách hàng.

| Cột | SQL Server type | Null? | Khóa / ràng buộc / default | Ý nghĩa cho FE |
|---|---|:---:|---|---|
| `cart_id` | `BIGINT` | Không | PK | ID giỏ hàng |
| `customer_id_ref` | `BIGINT` | Không | cross-service logical ref | Tham chiếu sang Identity customer (không FK) |
| `status` | `NVARCHAR(30)` | Không | — | Mã trạng thái; map label từ API/contract, không đoán toàn bộ enum |
| `created_at` | `DATETIME2(0)` | Không | DEFAULT SYSUTCDATETIME() | Thời gian tạo |
| `updated_at` | `DATETIME2(0)` | Không | DEFAULT SYSUTCDATETIME() | Thời gian cập nhật |



### `dbo.cart_item`

Dòng giỏ hàng tham chiếu variant hiện hành.

| Cột | SQL Server type | Null? | Khóa / ràng buộc / default | Ý nghĩa cho FE |
|---|---|:---:|---|---|
| `cart_item_id` | `BIGINT` | Không | PK | ID dòng cart |
| `cart_id` | `BIGINT` | Không | FK → `cart.cart_id`; UNIQUE (composite) | ID giỏ hàng |
| `variant_id_ref` | `BIGINT` | Không | UNIQUE (composite); cross-service logical ref | Tham chiếu sang Catalog variant (không FK) |
| `quantity` | `INT` | Không | — | Số lượng |
| `added_at` | `DATETIME2(0)` | Không | DEFAULT SYSUTCDATETIME() | Thời gian thêm vào giỏ |

**FK nội bộ:** `cart_id` → `cart.cart_id`.

**Unique:** `cart_id,variant_id_ref`.

**CHECK constraints:**

- `(quantity > 0)`



### `dbo.customer_order`

Đơn tổng từ một lần checkout hoặc từ RFQ được chấp nhận.

| Cột | SQL Server type | Null? | Khóa / ràng buộc / default | Ý nghĩa cho FE |
|---|---|:---:|---|---|
| `order_id` | `BIGINT` | Không | PK | Mã đơn tổng |
| `order_no` | `NVARCHAR(100)` | Không | UNIQUE | Mã đơn hiển thị |
| `customer_id_ref` | `BIGINT` | Không | cross-service logical ref | Tham chiếu sang Identity customer (không FK) |
| `source_type` | `NVARCHAR(30)` | Không | — | RETAIL hoặc RFQ |
| `rfq_id_ref` | `BIGINT` | Có | cross-service logical ref | Tham chiếu sang RFQ service (không FK) |
| `subtotal` | `DECIMAL(18,2)` | Không | — | Thành tiền của cấp hiện tại |
| `discount_total` | `DECIMAL(18,2)` | Không | DEFAULT 0 | Tổng giảm giá trên order |
| `shipping_total` | `DECIMAL(18,2)` | Không | DEFAULT 0 | Tổng ship các seller order |
| `grand_total` | `DECIMAL(18,2)` | Không | — | Tổng đơn hàng do backend tính |
| `status` | `NVARCHAR(30)` | Không | — | Mã trạng thái; map label từ API/contract, không đoán toàn bộ enum |
| `placed_at` | `DATETIME2(0)` | Không | DEFAULT SYSUTCDATETIME() | Thời gian đặt hàng |

**Unique:** `order_no`.

**CHECK constraints:**

- `(source_type IN ('RETAIL','RFQ'))`

- `( (source_type = 'RETAIL' AND rfq_id_ref IS NULL) OR (source_type = 'RFQ' AND rfq_id_ref IS NOT NULL) )`

- `( subtotal >= 0 AND discount_total >= 0 AND shipping_total >= 0 AND grand_total >= 0 )`



### `dbo.delivery_address`

Bản chụp địa chỉ tại thời điểm đặt hàng; 1–1 với order.

| Cột | SQL Server type | Null? | Khóa / ràng buộc / default | Ý nghĩa cho FE |
|---|---|:---:|---|---|
| `delivery_address_id` | `BIGINT` | Không | PK | ID snapshot address |
| `order_id` | `BIGINT` | Không | FK → `customer_order.order_id`; UNIQUE | Mã đơn tổng |
| `source_address_id_ref` | `BIGINT` | Có | cross-service logical ref | ID địa chỉ gốc ở Identity, chỉ để trace |
| `recipient_name` | `NVARCHAR(255)` | Không | — | Người nhận |
| `recipient_phone` | `NVARCHAR(30)` | Không | — | SĐT người nhận |
| `address_line` | `NVARCHAR(500)` | Không | — | Địa chỉ cụ thể |
| `ward` | `NVARCHAR(100)` | Có | — | Phường/xã |
| `district` | `NVARCHAR(100)` | Có | — | Quận/huyện |
| `city` | `NVARCHAR(100)` | Không | — | Tỉnh/thành phố |

**FK nội bộ:** `order_id` → `customer_order.order_id`.

**Unique:** `order_id`.



### `dbo.seller_order`

Đơn con theo từng nhà cung cấp/store; có trạng thái, điều khoản và nghĩa vụ riêng.

| Cột | SQL Server type | Null? | Khóa / ràng buộc / default | Ý nghĩa cho FE |
|---|---|:---:|---|---|
| `seller_order_id` | `BIGINT` | Không | PK | Khóa định danh: seller_order_id |
| `order_id` | `BIGINT` | Không | FK → `customer_order.order_id` | Mã đơn tổng |
| `seller_order_no` | `NVARCHAR(100)` | Không | UNIQUE | Mã đơn nhà bán hiển thị |
| `store_id_ref` | `BIGINT` | Không | cross-service logical ref | Tham chiếu sang Catalog store (không FK) |
| `supplier_id_ref` | `BIGINT` | Không | cross-service logical ref | Tham chiếu sang Identity supplier (không FK) |
| `quotation_id_ref` | `BIGINT` | Có | cross-service logical ref | Tham chiếu sang RFQ quotation (không FK) |
| `store_name_snapshot` | `NVARCHAR(255)` | Không | — | Tên store tại lúc đặt |
| `supplier_name_snapshot` | `NVARCHAR(255)` | Không | — | Tên supplier tại lúc đặt |
| `subtotal` | `DECIMAL(18,2)` | Không | — | Thành tiền của cấp hiện tại |
| `shipping_fee` | `DECIMAL(18,2)` | Không | DEFAULT 0 | Phí vận chuyển |
| `total_amount` | `DECIMAL(18,2)` | Không | — | Tổng số tiền tại cấp hiện tại |
| `deposit_percent` | `DECIMAL(5,2)` | Có | — | Tỷ lệ cọc trong thỏa thuận, đơn vị % |
| `deposit_amount` | `DECIMAL(18,2)` | Có | — | Tiền cọc đã chốt |
| `remaining_amount` | `DECIMAL(18,2)` | Có | — | Tiền còn lại đã chốt |
| `remaining_due_at` | `DATETIME2(0)` | Có | — | Hạn thanh toán phần còn lại |
| `delivery_date_snapshot` | `DATE` | Có | — | Ngày giao đã chốt |
| `shipping_method_snapshot` | `NVARCHAR(100)` | Có | — | Phương thức giao đã chốt |
| `status` | `NVARCHAR(30)` | Không | — | Mã trạng thái; map label từ API/contract, không đoán toàn bộ enum |

**FK nội bộ:** `order_id` → `customer_order.order_id`.

**Unique:** `seller_order_no`.

**CHECK constraints:**

- `( subtotal >= 0 AND shipping_fee >= 0 AND total_amount >= 0 AND (deposit_percent IS NULL OR (deposit_percent >= 0 AND deposit_percent <= 100)) AND (deposit_amount IS NULL OR deposit_amount >= 0) AND (remaining_amount IS NULL OR remaining_amount >= 0) )`



### `dbo.order_item`

Chi tiết hàng đã đặt với snapshot tên sản phẩm, SKU, hình và giá tại lúc mua.

| Cột | SQL Server type | Null? | Khóa / ràng buộc / default | Ý nghĩa cho FE |
|---|---|:---:|---|---|
| `order_item_id` | `BIGINT` | Không | PK | ID dòng order |
| `seller_order_id` | `BIGINT` | Không | FK → `seller_order.seller_order_id` | Khóa định danh: seller_order_id |
| `variant_id_ref` | `BIGINT` | Có | cross-service logical ref | Tham chiếu sang Catalog variant (không FK) |
| `product_code_snapshot` | `NVARCHAR(100)` | Có | — | Mã sản phẩm lúc đặt |
| `product_name_snapshot` | `NVARCHAR(255)` | Không | — | Tên sản phẩm tại lúc đặt; không cập nhật theo Catalog |
| `sku_snapshot` | `NVARCHAR(100)` | Có | — | Mã SKU tại lúc giao dịch |
| `variant_name_snapshot` | `NVARCHAR(255)` | Có | — | Tên biến thể lúc đặt |
| `image_url_snapshot` | `NVARCHAR(500)` | Có | — | URL hình tại lúc đặt |
| `quantity` | `INT` | Không | — | Số lượng |
| `unit_price` | `DECIMAL(18,2)` | Không | — | Đơn giá snapshot theo thời điểm nghiệp vụ |
| `discount_amount` | `DECIMAL(18,2)` | Không | DEFAULT 0 | Giảm tiền, ngữ nghĩa theo cấp item/rule |
| `subtotal` | `DECIMAL(18,2)` | Không | — | Thành tiền của cấp hiện tại |

**FK nội bộ:** `seller_order_id` → `seller_order.seller_order_id`.

**CHECK constraints:**

- `(quantity > 0)`

- `(unit_price >= 0 AND discount_amount >= 0 AND subtotal >= 0)`



### `dbo.payment`

Nghĩa vụ/đợt thanh toán theo seller order (đặt cọc, phần còn lại, v.v.).

| Cột | SQL Server type | Null? | Khóa / ràng buộc / default | Ý nghĩa cho FE |
|---|---|:---:|---|---|
| `payment_id` | `BIGINT` | Không | PK | ID payment |
| `seller_order_id` | `BIGINT` | Không | FK → `seller_order.seller_order_id` | Khóa định danh: seller_order_id |
| `payment_type` | `NVARCHAR(30)` | Không | — | Loại đợt thanh toán; chưa có CHECK enum đầy đủ |
| `amount` | `DECIMAL(18,2)` | Không | — | amount |
| `due_at` | `DATETIME2(0)` | Có | — | Ngày hạn thanh toán |
| `provider` | `NVARCHAR(100)` | Có | — | Nhà cung cấp xử lý thanh toán/vận chuyển tùy bảng |
| `transaction_ref` | `NVARCHAR(255)` | Có | cross-service logical ref | Mã giao dịch cổng thanh toán |
| `status` | `NVARCHAR(30)` | Không | — | Mã trạng thái; map label từ API/contract, không đoán toàn bộ enum |
| `paid_at` | `DATETIME2(0)` | Có | — | Thời điểm thanh toán thành công |

**FK nội bộ:** `seller_order_id` → `seller_order.seller_order_id`.

**CHECK constraints:**

- `(amount > 0)`



### `dbo.cancellation`

Yêu cầu/kết quả hủy cho một seller order (tối đa một bản ghi theo v1).

| Cột | SQL Server type | Null? | Khóa / ràng buộc / default | Ý nghĩa cho FE |
|---|---|:---:|---|---|
| `cancellation_id` | `BIGINT` | Không | PK | ID cancellation |
| `seller_order_id` | `BIGINT` | Không | FK → `seller_order.seller_order_id`; UNIQUE | Khóa định danh: seller_order_id |
| `actor_type` | `NVARCHAR(30)` | Không | — | Bên hủy (quy ước chưa chốt) |
| `actor_id_ref` | `BIGINT` | Không | cross-service logical ref | ID người thực hiện hủy; giải nghĩa dựa trên actor_type |
| `reason` | `NVARCHAR(500)` | Không | — | Lý do nghiệp vụ |
| `refund_percent` | `DECIMAL(5,2)` | Có | — | Tỷ lệ hoàn theo chính sách |
| `status` | `NVARCHAR(30)` | Không | — | Mã trạng thái; map label từ API/contract, không đoán toàn bộ enum |
| `cancelled_at` | `DATETIME2(0)` | Có | — | Thời điểm hủy |

**FK nội bộ:** `seller_order_id` → `seller_order.seller_order_id`.

**Unique:** `seller_order_id`.

**CHECK constraints:**

- `(refund_percent IS NULL OR (refund_percent >= 0 AND refund_percent <= 100))`



### `dbo.refund`

Khoản hoàn liên kết payment, có thể có cancellation.

| Cột | SQL Server type | Null? | Khóa / ràng buộc / default | Ý nghĩa cho FE |
|---|---|:---:|---|---|
| `refund_id` | `BIGINT` | Không | PK | ID refund |
| `payment_id` | `BIGINT` | Không | FK → `payment.payment_id` | ID payment |
| `cancellation_id` | `BIGINT` | Có | FK → `cancellation.cancellation_id` | ID cancellation |
| `amount` | `DECIMAL(18,2)` | Không | — | amount |
| `reason` | `NVARCHAR(500)` | Không | — | Lý do nghiệp vụ |
| `status` | `NVARCHAR(30)` | Không | — | Mã trạng thái; map label từ API/contract, không đoán toàn bộ enum |
| `requested_at` | `DATETIME2(0)` | Không | DEFAULT SYSUTCDATETIME() | Thời điểm yêu cầu |
| `refunded_at` | `DATETIME2(0)` | Có | — | Thời điểm hoàn thực tế |

**FK nội bộ:** `payment_id` → `payment.payment_id`; `cancellation_id` → `cancellation.cancellation_id`.

**CHECK constraints:**

- `(amount > 0)`



### `dbo.dispute`

Khiếu nại/tranh chấp trên seller order.

| Cột | SQL Server type | Null? | Khóa / ràng buộc / default | Ý nghĩa cho FE |
|---|---|:---:|---|---|
| `dispute_id` | `BIGINT` | Không | PK | ID dispute |
| `seller_order_id` | `BIGINT` | Không | FK → `seller_order.seller_order_id` | Khóa định danh: seller_order_id |
| `opened_by_user_id_ref` | `BIGINT` | Không | cross-service logical ref | ID người mở tranh chấp ở Identity |
| `reason` | `NVARCHAR(500)` | Không | — | Lý do nghiệp vụ |
| `evidence_url` | `NVARCHAR(1000)` | Có | — | Liên kết bằng chứng |
| `status` | `NVARCHAR(30)` | Không | — | Mã trạng thái; map label từ API/contract, không đoán toàn bộ enum |
| `opened_at` | `DATETIME2(0)` | Không | DEFAULT SYSUTCDATETIME() | Thời điểm mở tranh chấp |
| `resolved_at` | `DATETIME2(0)` | Có | — | Thời điểm xử lý xong |

**FK nội bộ:** `seller_order_id` → `seller_order.seller_order_id`.



### `dbo.settlement`

Quyết toán nhà cung cấp; phí nền tảng mặc định 5%.

| Cột | SQL Server type | Null? | Khóa / ràng buộc / default | Ý nghĩa cho FE |
|---|---|:---:|---|---|
| `settlement_id` | `BIGINT` | Không | PK | ID settlement |
| `seller_order_id` | `BIGINT` | Không | FK → `seller_order.seller_order_id`; UNIQUE | Khóa định danh: seller_order_id |
| `gross_amount` | `DECIMAL(18,2)` | Không | — | gross amount |
| `fee_rate` | `DECIMAL(5,2)` | Không | DEFAULT 5.00 | Phí nền tảng theo %, mặc định 5.00 |
| `fee_amount` | `DECIMAL(18,2)` | Không | — | Số tiền phí nền tảng |
| `supplier_payout_amount` | `DECIMAL(18,2)` | Không | — | Số tiền thanh toán supplier |
| `status` | `NVARCHAR(30)` | Không | — | Mã trạng thái; map label từ API/contract, không đoán toàn bộ enum |
| `settled_at` | `DATETIME2(0)` | Có | — | Thời điểm quyết toán |

**FK nội bộ:** `seller_order_id` → `seller_order.seller_order_id`.

**Unique:** `seller_order_id`.

**CHECK constraints:**

- `( gross_amount >= 0 AND fee_rate >= 0 AND fee_rate <= 100 AND fee_amount >= 0 AND supplier_payout_amount >= 0 )`



### `dbo.shipment`

Vận chuyển của seller order; có thể có nhiều lần/kiện.

| Cột | SQL Server type | Null? | Khóa / ràng buộc / default | Ý nghĩa cho FE |
|---|---|:---:|---|---|
| `shipment_id` | `BIGINT` | Không | PK | ID shipment |
| `seller_order_id` | `BIGINT` | Không | FK → `seller_order.seller_order_id` | Khóa định danh: seller_order_id |
| `shipping_method` | `NVARCHAR(100)` | Không | — | Hình thức vận chuyển |
| `provider` | `NVARCHAR(100)` | Có | — | Nhà cung cấp xử lý thanh toán/vận chuyển tùy bảng |
| `tracking_code` | `NVARCHAR(255)` | Có | — | Mã vận đơn |
| `expected_ship_at` | `DATETIME2(0)` | Có | — | Dự kiến bàn giao vận chuyển |
| `shipped_at` | `DATETIME2(0)` | Có | — | Đã gửi hàng lúc |
| `expected_delivery_at` | `DATETIME2(0)` | Có | — | Dự kiến giao |
| `delivered_at` | `DATETIME2(0)` | Có | — | Thực tế giao |
| `shipping_fee` | `DECIMAL(18,2)` | Không | DEFAULT 0 | Phí vận chuyển |
| `status` | `NVARCHAR(30)` | Không | — | Mã trạng thái; map label từ API/contract, không đoán toàn bộ enum |

**FK nội bộ:** `seller_order_id` → `seller_order.seller_order_id`.

**CHECK constraints:**

- `(shipping_fee >= 0)`



### `dbo.review`

Đánh giá một dòng hàng đã mua.

| Cột | SQL Server type | Null? | Khóa / ràng buộc / default | Ý nghĩa cho FE |
|---|---|:---:|---|---|
| `review_id` | `BIGINT` | Không | PK | ID review |
| `order_item_id` | `BIGINT` | Không | FK → `order_item.order_item_id`; UNIQUE | ID dòng order |
| `customer_id_ref` | `BIGINT` | Không | cross-service logical ref | Tham chiếu sang Identity customer (không FK) |
| `rating` | `INT` | Không | — | Số sao 1–5 |
| `created_at` | `DATETIME2(0)` | Không | DEFAULT SYSUTCDATETIME() | Thời gian tạo |

**FK nội bộ:** `order_item_id` → `order_item.order_item_id`.

**Unique:** `order_item_id`.

**CHECK constraints:**

- `(rating BETWEEN 1 AND 5)`



## RFQ & Negotiation — `mss_rfq_negotiation`

*Nguồn: `04_mss_rfq_negotiation.sql`; các cột dưới đây khớp với DDL (nullable/default/PK/FK/unique). Phần mô tả công dụng chỉ hỗ trợ UI.*


### `dbo.rfq`

Bài đăng yêu cầu báo giá **công khai** từ khách hàng, không chọn recipient.

| Cột | SQL Server type | Null? | Khóa / ràng buộc / default | Ý nghĩa cho FE |
|---|---|:---:|---|---|
| `rfq_id` | `BIGINT` | Không | PK | ID RFQ |
| `rfq_code` | `NVARCHAR(100)` | Không | UNIQUE | Mã RFQ hiển thị |
| `customer_id_ref` | `BIGINT` | Không | cross-service logical ref | Tham chiếu sang Identity customer (không FK) |
| `title` | `NVARCHAR(255)` | Không | — | Tiêu đề |
| `quantity` | `INT` | Không | — | Số lượng |
| `budget_amount` | `DECIMAL(18,2)` | Có | — | Ngân sách dự kiến của RFQ |
| `requested_delivery_date` | `DATE` | Có | — | Ngày giao mong muốn |
| `delivery_location` | `NVARCHAR(500)` | Có | — | Vị trí giao hàng mô tả trên RFQ |
| `status` | `NVARCHAR(30)` | Không | — | Mã trạng thái; map label từ API/contract, không đoán toàn bộ enum |
| `expires_at` | `DATETIME2(0)` | Có | — | Hạn RFQ |
| `created_at` | `DATETIME2(0)` | Không | DEFAULT SYSUTCDATETIME() | Thời gian tạo |

**Unique:** `rfq_code`.

**CHECK constraints:**

- `(quantity > 0)`

- `(budget_amount IS NULL OR budget_amount >= 0)`



### `dbo.quotation`

Báo giá của supplier/store cho RFQ với lịch sử phiên bản.

| Cột | SQL Server type | Null? | Khóa / ràng buộc / default | Ý nghĩa cho FE |
|---|---|:---:|---|---|
| `quotation_id` | `BIGINT` | Không | PK | ID quotation/version |
| `rfq_id` | `BIGINT` | Không | FK → `rfq.rfq_id`; UNIQUE (composite) | ID RFQ |
| `supplier_id_ref` | `BIGINT` | Không | cross-service logical ref | Tham chiếu sang Identity supplier (không FK) |
| `store_id_ref` | `BIGINT` | Không | UNIQUE (composite); cross-service logical ref | Tham chiếu sang Catalog store (không FK) |
| `previous_quotation_id` | `BIGINT` | Có | FK → `quotation.quotation_id` | Phiên bản báo giá trước (trong RFQ DB) |
| `version_no` | `INT` | Không | UNIQUE (composite) | Số phiên bản; tăng khi sửa báo giá |
| `total_amount` | `DECIMAL(18,2)` | Không | — | Tổng số tiền tại cấp hiện tại |
| `deposit_percent` | `DECIMAL(5,2)` | Không | — | Tỷ lệ cọc trong thỏa thuận, đơn vị % |
| `valid_until` | `DATETIME2(0)` | Không | — | Thời hạn hiệu lực báo giá |
| `lead_time_days` | `INT` | Có | — | Số ngày chuẩn bị |
| `proposed_delivery_date` | `DATE` | Có | — | Ngày giao supplier đề xuất |
| `shipping_method` | `NVARCHAR(100)` | Có | — | Hình thức vận chuyển |
| `shipping_fee` | `DECIMAL(18,2)` | Không | DEFAULT 0 | Phí vận chuyển |
| `status` | `NVARCHAR(30)` | Không | — | Mã trạng thái; map label từ API/contract, không đoán toàn bộ enum |
| `submitted_at` | `DATETIME2(0)` | Có | — | Thời gian gửi báo giá |
| `accepted_at` | `DATETIME2(0)` | Có | — | Thời gian chấp nhận báo giá |

**FK nội bộ:** `rfq_id` → `rfq.rfq_id`; `previous_quotation_id` → `quotation.quotation_id`.

**Unique:** `rfq_id,store_id_ref,version_no`.

**CHECK constraints:**

- `(version_no > 0)`

- `(total_amount >= 0)`

- `(deposit_percent >= 0 AND deposit_percent <= 100)`

- `(lead_time_days IS NULL OR lead_time_days >= 0)`

- `(shipping_fee >= 0)`

- `(status IN ('DRAFT','SUBMITTED','REVISED','ACCEPTED','REJECTED','EXPIRED','CANCELLED'))`



### `dbo.quotation_item`

Dòng sản phẩm/dịch vụ trong báo giá; được phép custom không có variant hiện hành.

| Cột | SQL Server type | Null? | Khóa / ràng buộc / default | Ý nghĩa cho FE |
|---|---|:---:|---|---|
| `quotation_item_id` | `BIGINT` | Không | PK | ID dòng quotation |
| `quotation_id` | `BIGINT` | Không | FK → `quotation.quotation_id` | ID quotation/version |
| `variant_id_ref` | `BIGINT` | Có | cross-service logical ref | Tham chiếu sang Catalog variant (không FK) |
| `item_name_snapshot` | `NVARCHAR(255)` | Không | — | Tên dòng hàng trong báo giá tại lúc quote |
| `sku_snapshot` | `NVARCHAR(100)` | Có | — | Mã SKU tại lúc giao dịch |
| `quantity` | `INT` | Không | — | Số lượng |
| `unit_price` | `DECIMAL(18,2)` | Không | — | Đơn giá snapshot theo thời điểm nghiệp vụ |
| `discount_amount` | `DECIMAL(18,2)` | Không | DEFAULT 0 | Giảm tiền, ngữ nghĩa theo cấp item/rule |
| `subtotal` | `DECIMAL(18,2)` | Không | — | Thành tiền của cấp hiện tại |

**FK nội bộ:** `quotation_id` → `quotation.quotation_id`.

**CHECK constraints:**

- `(quantity > 0)`

- `(unit_price >= 0 AND discount_amount >= 0 AND subtotal >= 0)`



### `dbo.conversation`

Cuộc trao đổi theo cặp RFQ–supplier, với khách hàng.

| Cột | SQL Server type | Null? | Khóa / ràng buộc / default | Ý nghĩa cho FE |
|---|---|:---:|---|---|
| `conversation_id` | `BIGINT` | Không | PK | ID cuộc trao đổi |
| `rfq_id` | `BIGINT` | Không | FK → `rfq.rfq_id`; UNIQUE (composite) | ID RFQ |
| `customer_id_ref` | `BIGINT` | Không | cross-service logical ref | Tham chiếu sang Identity customer (không FK) |
| `supplier_id_ref` | `BIGINT` | Không | UNIQUE (composite); cross-service logical ref | Tham chiếu sang Identity supplier (không FK) |
| `status` | `NVARCHAR(30)` | Không | — | Mã trạng thái; map label từ API/contract, không đoán toàn bộ enum |
| `created_at` | `DATETIME2(0)` | Không | DEFAULT SYSUTCDATETIME() | Thời gian tạo |

**FK nội bộ:** `rfq_id` → `rfq.rfq_id`.

**Unique:** `rfq_id,supplier_id_ref`.



### `dbo.conversation_message`

Tin nhắn thuộc conversation (SQL table tên conversation_message, không phải message).

| Cột | SQL Server type | Null? | Khóa / ràng buộc / default | Ý nghĩa cho FE |
|---|---|:---:|---|---|
| `message_id` | `BIGINT` | Không | PK | ID tin nhắn |
| `conversation_id` | `BIGINT` | Không | FK → `conversation.conversation_id` | ID cuộc trao đổi |
| `sender_user_id_ref` | `BIGINT` | Không | cross-service logical ref | ID user gửi tin nhắn, ở Identity |
| `message_type` | `NVARCHAR(30)` | Không | — | Loại tin nhắn |
| `sent_at` | `DATETIME2(0)` | Không | DEFAULT SYSUTCDATETIME() | Thời gian gửi tin nhắn |

**FK nội bộ:** `conversation_id` → `conversation.conversation_id`.


## 6. Cross-service reference — frontend cần biết lấy gì ở đâu

| Trường logic | Bảng nguồn | Bảng đích thuộc service | Ghi chú UI |
|---|---|---|---|
| `store.supplier_id_ref` | Catalog | Identity `supplier_profile` | Store card dùng dữ liệu store trả về; không join DB |
| `cart.customer_id_ref` | Commerce | Identity `customer_profile` | Lấy user hiện hành từ auth/session |
| `cart_item.variant_id_ref` | Commerce | Catalog `product_variant` | Giỏ có thể cần ProductSnapshot endpoint để hiển thị giá hiện hành |
| `customer_order.customer_id_ref` | Commerce | Identity `customer_profile` | Order history lấy qua Commerce |
| `customer_order.rfq_id_ref` | Commerce | RFQ `rfq` | Chỉ có khi `source_type=RFQ` |
| `delivery_address.source_address_id_ref` | Commerce | Identity `address` | Chỉ trace; hiển thị từ delivery_address snapshot |
| `seller_order.store_id_ref` | Commerce | Catalog `store` | Lịch sử hiển thị từ `store_name_snapshot` |
| `seller_order.supplier_id_ref` | Commerce | Identity `supplier_profile` | Lịch sử hiển thị từ `supplier_name_snapshot` |
| `seller_order.quotation_id_ref` | Commerce | RFQ `quotation` | Chỉ có khi sinh từ báo giá |
| `order_item.variant_id_ref` | Commerce | Catalog `product_variant` | Link “xem hàng hiện tại” (optional); không lấy lại giá lịch sử |
| `review.customer_id_ref` | Commerce | Identity `customer_profile` | Chỉ user có quyền review mới được ghi |
| `rfq.customer_id_ref` | RFQ | Identity `customer_profile` | Chủ bài RFQ |
| `quotation.supplier_id_ref` | RFQ | Identity `supplier_profile` | Supplier nộp báo giá |
| `quotation.store_id_ref` | RFQ | Catalog `store` | Store nộp báo giá |
| `quotation_item.variant_id_ref` | RFQ | Catalog `product_variant` | Nullable: custom item không có SKU |
| `conversation.customer_id_ref` | RFQ | Identity `customer_profile` | Người mua tham gia chat |
| `conversation.supplier_id_ref` | RFQ | Identity `supplier_profile` | Nhà cung cấp tham gia chat |
| `conversation_message.sender_user_id_ref` | RFQ | Identity `app_user` | Người gửi message |
| `cancellation.actor_id_ref` | Commerce | Identity account/business actor, tùy `actor_type` | Contract actor type cần chốt |
| `dispute.opened_by_user_id_ref` | Commerce | Identity `app_user` | ID người khiếu nại |

### Các quy tắc nghiệp vụ bắt buộc phản ánh trên UI

1. **Retail**: catalog → variant → cart → checkout → `customer_order` → từng `seller_order`; các seller order có trạng thái/ship riêng.
2. **RFQ**: khách đăng RFQ công khai; supplier gửi quotation; revision tạo **version mới**; customer ACCEPT quotation → backend tạo đơn, chốt snapshot và mới phát sinh tiền cọc.
3. **Giữ lịch sử**: Order detail phải hiển thị snapshot sản phẩm, store, supplier, địa chỉ và payment terms đã chốt, không lấy dữ liệu mới từ Catalog để thay thế.
4. **Tiền**: customer có thể trả `DEPOSIT` và `REMAINING`; hạn phần còn lại theo rule hiện tại = 3 ngày trước delivery đã thỏa thuận; platform giữ tiền đến điều kiện settlement; phí nền tảng hiện tại 5%. Backend chịu trách nhiệm xét điều kiện, tính tổng và cập nhật trạng thái.
5. **Cancel/refund**: supplier hủy → 100% theo quy tắc dự án; customer hủy sớm/gần ngày giao → theo chính sách và trạng thái; UI không tự tính phần được hoàn để gửi như kết luận cuối.
6. **Dispute** có thể chặn settlement; không cho supplier bấm payout đơn giản nếu backend chưa cho phép.
7. **Promotion** hỗ trợ `PERCENT_DISCOUNT`, `FIXED_DISCOUNT`, `BUY_X_GET_Y`; frontend nhập điều kiện, backend validate và tính kết quả.
8. **Inventory**: v1 chỉ có `product_variant.stock_quantity`, **chưa có** bảng giữ chỗ inventory; FE phải hiển thị lỗi hết hàng/cập nhật giá lúc checkout từ backend.

## 7. Các màn hình cần dữ liệu gì (hướng dẫn AI React)

| Vai trò / màn hình | Dữ liệu cần | Đơn vị sở hữu dữ liệu |
|---|---|---|
| Khách — Home / Catalog | Store, category, product, variant/price/image/promotion | Catalog |
| Khách — Storefront | Store name, logo, banner, theme_key, products | Catalog |
| Khách — Product detail | Product + variants + stock status + promotion đang áp dụng | Catalog |
| Khách — Cart | Cart & items; variant summary cho giá/tình trạng hiện hành | Commerce + Catalog qua backend |
| Khách — Checkout | Delivery address, grouping seller, backend price breakdown | Identity + Commerce (backend aggregate) |
| Khách — Order history/detail | Customer order, seller orders, item snapshots, delivery snapshot, status | Commerce |
| Khách — Payments | Nghĩa vụ DEPOSIT/REMAINING, due date, status, provider result | Commerce |
| Khách — RFQ feed/create/detail | RFQ public, quantity/budget/deadline/customization | RFQ |
| Khách — Quote comparison | Quotations + items + version/valid_until/shipping/payment terms | RFQ |
| Khách / Supplier — Chat | Conversations, messages, sender/time | RFQ |
| Supplier — Store & Catalog | Store config, products, SKU, pricing, stock, promotions | Catalog |
| Supplier — Quotations | RFQ public, quotation version, revision, submission | RFQ |
| Supplier — Orders / Shipping | Seller orders, items, shipping/tracking, acceptance | Commerce |
| Supplier — Settlements | Gross, 5% platform fee snapshot, payout, status | Commerce |
| Customer support/admin (nếu trong scope) | Supplier verification, disputes/cancellation/refunds | Identity/Commerce |

**Không suy ra endpoint từ tên bảng.** AI làm FE phải đọc routes/controllers/OpenAPI backend hiện tại. Gợi ý API contract tối thiểu để thống nhất trước khi code: danh sách/chi tiết product, store, cart, checkout preview/submit, order history/detail, RFQ list/detail/create, quotation list/detail/revise/accept, conversation/messages, payment/refund/dispute, shipment/settlement. Đó là **contract cần xác nhận**, không phải API đã được implement.

## 8. TypeScript / hiển thị dữ liệu

```ts
// Ví dụ UI view models (định hướng, KHÔNG khẳng định backend có JSON tương ứng)
export type Money = string; // ưu tiên backend trả decimal dạng string để tránh sai số
export interface OrderItemView {
  orderItemId: string;
  productName: string;      // lấy từ product_name_snapshot
  variantName?: string;    // variant_name_snapshot
  imageUrl?: string;       // image_url_snapshot
  quantity: number;
  unitPrice: Money;
  subtotal: Money;
}
export interface SellerOrderView {
  sellerOrderId: string;
  storeName: string;        // store_name_snapshot
  supplierName: string;    // supplier_name_snapshot
  status: string;          // label từ status map, có fallback
  items: OrderItemView[];
}
```

- SQL `BIGINT` có thể vượt `Number.MAX_SAFE_INTEGER` của JS: **đề nghị API trả ID dạng string** hoặc chốt mapping an toàn với backend; không tự `parseInt` tất cả ID.
- SQL `DECIMAL(18,2)` dùng decimal/string trong contract; khi format VND, kiểm tra làm tròn/đơn vị ở backend. Không cộng nhiều tiền kiểu floating-point rồi xem là nguồn chuẩn.
- SQL `DATETIME2(0)` không mang timezone: **contract API cần nói rõ UTC/ISO8601 timezone**; không tự thêm `Z` nếu chưa chốt.
- Loading / Empty / Error / Unauthorized / Forbidden phải có UI thống nhất cho mỗi màn hình; không render số `0` hay placeholder giả như dữ liệu thật.
- UI không dựa vào cột `status` để tự cho phép các mutation nếu backend chưa trả quyền/hành động hợp lệ; 401/403/409 phải xử lý tốt.

## 9. Những khoảng trống tài liệu — AI KHÔNG ĐƯỢC TỰ CHỐT

- API Gateway URL, danh sách endpoint thực tế, tên JSON field, phân trang/filter/sort, upload hình, provider payment và auth token đều cần đối chiếu code backend/OpenAPI.
- Chưa có full status enums/lifecycle CHECK cho phần lớn bảng; đừng tự cố định toàn bộ theo ý AI.
- `app_user` trong DDL chưa có password/role/identity provider mapping; không tự thêm ô nhập mật khẩu rồi giả định API đăng nhập tự phát hành JWT.
- `supplier_profile` ownership xung đột với một đoạn workplan v3: ở đây ưu tiên physical SQL, cần backend xác nhận.
- Chưa có inventory reservation, payout bank account schema, chat attachment schema, hay shipment item association trong SQL v1; **không invent entity/field để tạo UI giả**.
- `delivery_address` là snapshot 1–1 theo customer order v1; nếu thực tế nhiều địa chỉ giao riêng cho từng seller order thì cần **change request** cho DB, không tự đoán.
- `PAYMENT` trong physical v1 có thể là các đợt nghĩa vụ thanh toán, không nhất thiết tương đương một transaction attempt; UI phải theo backend contract.

## 10. Tài liệu nên gửi kèm khi yêu cầu AI dựng FE

1. File này (`MSS_DB_Detailed_FE_Handoff.md`).
2. `MSS_FE_Style_Guide.md` và `src/styles/global.css` (bắt buộc dùng một design system thống nhất).
3. Swagger/OpenAPI JSON hoặc code Controller/DTO Backend thật để xác nhận routes, enum, authorization, payload.
4. User stories / wireframe Figma hoặc screenshot thiết kế mong muốn (nếu có).

**Kết luận:** database dictionary này là **nguồn context/thiết kế dữ liệu**; nó **không tự thay thế API contract**. Không để AI tạo thẳng frontend kết nối SQL Server.

