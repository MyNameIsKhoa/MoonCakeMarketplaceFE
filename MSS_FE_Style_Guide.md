# MSS Frontend — Shared CSS, UI Rules & Coding Convention v1

> **Áp dụng cho:** React + TypeScript frontend MSS Mooncake Marketplace. Mục tiêu: mọi thành viên và AI sinh giao diện **đồng bộ font, kích thước, khoảng cách, màu, layout**, không mỗi trang một kiểu, không khoảng trống vô lý. File CSS thực thi là `src/styles/global.css` đi kèm. Văn bản này là **quy ước FE đề xuất**, không phải dữ liệu lấy từ SQL.

## 1. Nguyên tắc bắt buộc

1. **Chỉ có một nguồn design tokens chung:** `src/styles/global.css` (`--mss-*`). Import **một lần** từ `src/main.tsx`.
2. Không cho mỗi component tự khai báo `font-family`, bảng kích cỡ heading, màu nền, spacing tuỳ ý; sử dụng CSS variables/classes `mss-*`.
3. **Không tạo một file `global.css` mới ở từng feature.** Feature có layout đặc thù được dùng `*.module.css` nhưng phải lấy giá trị từ `var(--mss-...)`; không ghi đè toàn app.
4. Không dùng `!important` để chữa lệch layout; không thêm thư viện CSS framework thứ hai để “cho nhanh” khi dự án đã có một styling approach.
5. Không style trực tiếp các thẻ HTML theo cách làm hỏng component bên ngoài. Global CSS trong bộ này chỉ có reset nhẹ, heading, body và các utility/component class có tiền tố `mss-`.
6. Bố cục phải **responsive 320px đến desktop** và dùng content-driven height. **Không** tạo block rỗng với `height: 600px`, `margin-top: 200px`, `padding: 10rem` để căn vị trí.
7. Không hiển thị chữ / nút có độ tương phản quá yếu, text cực nhỏ, hình kéo giãn, bảng tràn màn mobile.
8. Với ảnh/logo/banner của store: cho phép nội dung/brand thay đổi, **không cho supplier tùy ý inject CSS**; chọn theme đã được whitelist qua `theme_key`.

## 2. Design tokens: chỉ dùng các kích cỡ đã chốt

### Typography

| Vai trò | Token | Kích cỡ |
|---|---|---:|
| Caption, micro label, badge | `--mss-text-xs` | 12px |
| Helper, metadata, button, table | `--mss-text-sm` | 14px |
| Body chính / input | `--mss-text-md` | 16px |
| Tên card / heading nhỏ | `--mss-text-lg` | 18px |
| Section title | `--mss-text-xl` | 22px |
| Page title | `--mss-text-2xl` | 28px |
| Hero đặc biệt | `--mss-text-hero` | Responsive, 28–40px |

- Font: `Inter` nếu hệ thống đã cung cấp; fallback system font. Không download font ngẫu nhiên và không thay mỗi trang.
- Line-height body 1.55; title 1.25; title ngắn gọn, đừng đẩy một card thành quá cao.
- Body **không nhỏ hơn 16px**; thông tin phụ có thể 14px; chỉ caption ít quan trọng được 12px.
- Không dùng `vw` tự do cho text (ngoại trừ token hero đã clamp); không dùng kích cỡ 48/64px cho heading sản phẩm bình thường.

### Spacing

| Token | Giá trị | Mục đích thường dùng |
|---|---:|---|
| `--mss-space-1` | 4px | icon/text nhỏ |
| `--mss-space-2` | 8px | label/helper |
| `--mss-space-3` | 12px | control gap |
| `--mss-space-4` | 16px | card/grid gap |
| `--mss-space-5` | 20px | card padding |
| `--mss-space-6` | 24px | nhóm form/page header |
| `--mss-space-8` | 32px | ngăn section |
| `--mss-space-10` | 40px | padding page desktop |
| `--mss-space-12` | 48px | hero gap tối đa thông thường |

**Không làm:** một section cách section kế tiếp 160px; form fields cách nhau 50px; page title cách content 100px; card quá rộng nhưng bên trong chỉ vài chữ. Nếu cần nhiều hơn 48px, phải có lý do sản phẩm/UI được reviewer chấp thuận.

### Color và hình thức

- Main: xanh đậm `--mss-primary`, accent vàng trầm `--mss-accent` (gợi không khí Trung Thu nhưng giao diện vẫn nghiêm túc).
- Nền: `--mss-bg` / card: `--mss-surface`; text: `--mss-text`, meta: `--mss-text-muted`.
- Border `--mss-border`; radius: `--mss-radius-sm/md/lg`; shadow dùng `--mss-shadow`.
- Trạng thái: các class `.mss-badge--success`, `--warning`, `--danger`; **cụ thể status nào map vào kiểu nào do status mapping tập trung**, không hardcode rải rác.

## 3. Layout chung, không tạo khoảng trắng dư

- Container desktop tối đa **1200px**, padding ngang mobile **12px**, desktop **16px**; dùng `.mss-container`.
- Page chính: `.mss-page` có vertical padding ~24–40px; section thường cách nhau **32px**.
- Form: `.mss-field` và `.mss-stack` dùng gap 8/16px; chia 2 cột chỉ khi viewport đủ rộng.
- Card list: `.mss-grid` tự responsive; `.mss-grid-3` đổi 3 → 2 → 1 cột theo breakpoint.
- Sidebar/summary: `.mss-two-column` chuyển thành một cột dưới 900px.
- Table rộng: bọc trong `.mss-table-scroll`, không để cả trang scroll ngang.
- Với loading, empty và error: **render trạng thái thật** trong vùng content, tránh dành nguyên một khoảng trống cao cố định.
- **Không** đặt `min-height: 100vh` lên từng section/card/trang con; chỉ shell `.mss-app` + `.mss-main` quản lý footer dính cuối khi trang ít nội dung.
- Ảnh dùng aspect-ratio tại component để ổn định layout. Không ép height/width ảnh khiến méo tỷ lệ; product card ưu tiên ảnh vuông.

## 4. Common components cần tái sử dụng

Mỗi team member **dùng lại** các primitives này thay vì tạo một Button/Input/Card riêng mỗi trang:

| React component gợi ý | Class chuẩn |
|---|---|
| `PageContainer` / `PageHeader` | `.mss-container`, `.mss-page`, `.mss-page-header` |
| `Section` / `SectionTitle` | `.mss-section`, `.mss-section-title` |
| `Button` | `.mss-button` + `--primary/secondary/danger/sm/full` |
| `Card` | `.mss-card` |
| `TextField` / `SelectField` / `TextareaField` | `.mss-field`, `.mss-label`, `.mss-input`, `.mss-select`, `.mss-textarea` |
| `StatusBadge` | `.mss-badge` + variant |
| `DataTable` | `.mss-table-scroll`, `.mss-table` |
| `EmptyState` / `Alert` | `.mss-empty`, `.mss-alert` |
| `PriceText` | `.mss-price` |

Không phải tạo sẵn tất cả component nếu feature chưa sử dụng. Khi tạo một component tái dùng, ưu tiên TypeScript props với variant rõ ràng thay vì mỗi feature fork bản mới.

## 5. Cấu trúc mã FE đề xuất

```text
src/
├── app/
│   ├── router/                  # route-level, lazy load theo trang
│   └── providers/               # auth, query providers khi thật sự cần
├── components/
│   ├── ui/                      # Button, Input, Card, Badge, Spinner
│   └── layout/                  # Header, Footer, Sidebar, PageShell
├── features/
│   ├── auth/
│   ├── catalog/
│   ├── cart/
│   ├── checkout/
│   ├── orders/
│   ├── rfq/
│   ├── chat/
│   ├── supplier/
│   └── payments/
├── services/
│   └── api/                     # HTTP client + typed services qua Gateway
├── types/                       # types chia sẻ thật sự
├── utils/                       # currency/date/format helpers
├── styles/
│   └── global.css               # DUY NHẤT cho tokens + common classes
├── main.tsx
└── App.tsx
```

- File TypeScript React: component `PascalCase.tsx`, hook `useXxx.ts`, helper `camelCase.ts`.
- Business logic/API calls không đặt lẫn trong JSX của card/form. `features/*/api` (hoặc `services/api`) quản lý calls; `features/*/components` quản lý presentation.
- Tránh duplicate DTO: tạo type từ OpenAPI/codegen khi có; không tự định nghĩa status enum giả. Trong UI, map trạng thái tại một chỗ.
- Không import SQL DDL hay database driver vào FE; mọi request đi qua Gateway.
- Tạo routes theo nhóm Public / Customer / Supplier / Admin **chỉ khi requirement và authorization thực sự có**.
- React list key ổn định theo ID, không dùng index nếu item có thể reorder/delete.
- Không disable ESLint/TypeScript errors cho toàn project chỉ để build pass.
- Không đưa mật khẩu/token vào local console log hoặc các artifact debug.

## 6. Ví dụ sử dụng CSS chung

Đặt file tại `src/styles/global.css`, import duy nhất:

```tsx
// src/main.tsx
import './styles/global.css';
```

```tsx
export function ProductListPage() {
  return (
    <div className="mss-app">
      <main className="mss-main">
        <div className="mss-container mss-page">
          <header className="mss-page-header">
            <div>
              <h1 className="mss-page-title">Bánh Trung Thu</h1>
              <p className="mss-page-description">Khám phá sản phẩm từ các nhà cung cấp.</p>
            </div>
          </header>
          <section className="mss-grid" aria-label="Danh sách sản phẩm">
            <article className="mss-card">
              <h2 className="mss-card-title">Tên sản phẩm</h2>
              <p className="mss-card-meta">Tên gian hàng</p>
              <p className="mss-price">299.000 ₫</p>
              <button className="mss-button mss-button--primary">Xem chi tiết</button>
            </article>
          </section>
        </div>
      </main>
    </div>
  );
}
```

Ví dụ chỉ minh họa **structure/style**, không phải mock UI cuối hoặc sản phẩm thật. Trong app thực, `mss-app` thường chỉ nằm ở root Layout, không lặp ở từng page.

## 7. Quy tắc kiểm tra trước khi merge UI (bắt buộc)

- [ ] Không còn font-size/spacing lạ hoặc `style={{ marginTop: 140 }}` để chữa giao diện.
- [ ] Không còn footer cách content bởi một block trống lớn; nội dung ít thì app shell xử lý.
- [ ] H1 page 22–28px; card title 18px; body 16px; meta 14px; badge tối thiểu dễ đọc.
- [ ] Card thống nhất padding/radius; button thống nhất height và state; input có label, error.
- [ ] Responsive: xem ít nhất **375px, 768px, 1280px**; không scroll ngang toàn trang.
- [ ] Màn hình list/detail có `loading`, `empty`, `error`, `retry` khi thích hợp.
- [ ] Hàng dài, tên store dài, địa chỉ dài không làm vỡ cột (`min-width: 0`, wrap/truncate phù hợp).
- [ ] Ảnh thiếu hoặc fail phải có fallback hợp lý; không hiển thị icon broken-image.
- [ ] Không có mock data “núp” như kết quả API thật. Nếu API chưa xong, dùng mock tách riêng, gắn cờ và note để thay thế.
- [ ] FE không trực tiếp query database; không hardcode server URL ở nhiều component; API client tập trung.
- [ ] Không làm màn tiền/đơn hàng dựa trên status/giá do FE tự kết luận thay backend.

## 8. Prompt giao cho AI dựng frontend

> **Dán nguyên phần dưới vào Codex hoặc AI coding agent cùng với 3 file trong bộ handoff.**

```text
Build/refactor the MSS Mooncake Marketplace frontend using React + TypeScript.

Read first:
- MSS_DB_Detailed_FE_Handoff.md (physical DB dictionary and business semantics)
- MSS_FE_Style_Guide.md (mandatory frontend architecture and design rules)
- src/styles/global.css (single source of truth for design tokens/shared classes)

IMPORTANT: The DB dictionary is NOT an API contract. Inspect the existing backend
API Gateway routes, Controllers, DTOs and OpenAPI/Swagger. Use actual endpoints only.
If an endpoint or required role/status is missing, report it as a TODO/blocker;
do not invent an API and claim integration works.

Use React + TypeScript. Put shared design tokens and common styles ONLY in
src/styles/global.css, imported ONCE from main.tsx.
Reuse shared UI components (Button, Input, Card, Badge, PageHeader, EmptyState).
Feature-specific styles may use CSS Modules but MUST consume --mss-* tokens.
Do NOT create one global stylesheet per page. Do NOT introduce another UI/CSS
framework unless the existing project already requires it.

Visual QA constraints:
- Uniform typography: body 16px, metadata 14px, card title 18px, page title 22-28px.
- Spacing scale 4/8/12/16/20/24/32/40/48px only.
- No excessive empty areas, giant margins, fixed-height whitespace, random oversized headings.
- Content container max 1200px; mobile-friendly 320px+.
- Responsive review at 375px, 768px and 1280px.
- Loading/empty/error states for async pages.
- Use snapshot fields for order history.
- Display backend-authoritative monetary totals, payment and order states.
- Frontend communicates ONLY through API Gateway, never directly to SQL Server.

Before coding: summarize existing FE structure, backend contracts found, and the
UI page plan; then implement incrementally. Preserve working code; avoid duplicate
components and CSS. After coding: run available lint/typecheck/build/tests,
report routes/files changed, unresolved API blockers, and responsive issues.
```

---

**Lưu ý:** Nếu dự án FE hiện đã có Tailwind/MUI/Ant Design, không được tự ý trộn hai hệ style; agent phải báo đang có design system nào và **chuyển token/mẫu chung sang cách quản lý hiện có** trước khi refactor hàng loạt. `global.css` này là phương án mặc định khi FE chưa có design system chuẩn.
