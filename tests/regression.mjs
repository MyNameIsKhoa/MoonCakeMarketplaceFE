// No new test dependencies: bundle the real components and supply hooks/API boundaries.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import * as React from 'react';

const require = createRequire(import.meta.url);
const tests = [];
const test = (name, run) => tests.push({ name, run });
const tick = () => new Promise(resolve => setImmediate(resolve));

function hooks() {
  const state = [], deps = [], cleanup = [];
  let cursor = 0, effects = [];
  const api = {
    ...React,
    useState(initial) {
      const i = cursor++;
      if (!(i in state)) state[i] = typeof initial === 'function' ? initial() : initial;
      return [state[i], value => { state[i] = typeof value === 'function' ? value(state[i]) : value; }];
    },
    useEffect(fn, next) {
      const i = cursor++;
      if (!deps[i] || next.some((d, n) => !Object.is(d, deps[i][n]))) {
        effects.push(() => { cleanup[i]?.(); cleanup[i] = fn(); });
        deps[i] = next;
      }
    },
    useLayoutEffect(fn, next) { api.useEffect(fn, next); },
    useMemo: fn => fn(), useCallback: fn => fn,
    useRef(initial) { const [ref] = api.useState(() => ({ current: initial })); return ref; },
    createContext: value => ({ Provider: 'Provider', value }),
    useContext: ctx => ctx.value,
  };
  return {
    api,
    render(fn, props) { cursor = 0; effects = []; const tree = fn(props); effects.forEach(f => f()); return tree; },
    dispose() { cleanup.forEach(f => f?.()); },
  };
}

async function load(file, { mock = false, api = {}, catalog = {}, auth = {}, router = {} } = {}) {
  const h = hooks();
  globalThis.__hooks = h.api;
  globalThis.__api = api;
  globalThis.__catalog = catalog;
  globalThis.__auth = auth;
  globalThis.__router = router;
  const result = await build({
    entryPoints: [file], bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic',
    define: { 'import.meta.env': JSON.stringify({ VITE_USE_MOCK_CATALOG: String(mock) }) },
    plugins: [{ name: 'boundaries', setup(b) {
      b.onResolve({ filter: /^react-router-dom$/ }, () => ({ path: "router", namespace: "test" }));
      b.onResolve({ filter: /^react$/ }, () => ({ path: 'react', namespace: 'test' }));
      b.onResolve({ filter: /services\/api$/ }, () => ({ path: 'api', namespace: 'test' }));
      b.onResolve({ filter: /(?:paymentApi|api\/fulfillmentApi)$/ }, () => ({ path: 'payments', namespace: 'test' }));
      if (!file.endsWith('CatalogContext.tsx')) b.onResolve({ filter: /context\/CatalogContext$/ }, () => ({ path: 'catalog', namespace: 'test' }));
      b.onResolve({ filter: /context\/AuthContext$/ }, () => ({ path: 'auth', namespace: 'test' }));
      b.onLoad({ filter: /.*/, namespace: 'test' }, args => ({ contents: {
        react: `module.exports = globalThis.__hooks`,
        router: `export const useLocation = () => globalThis.__router.location ?? { pathname: "/", search: "", key: "default", state: null };
          export const useNavigate = () => globalThis.__router.navigate ?? (() => {});
          export const useNavigationType = () => globalThis.__router.action ?? "POP";`,
        api: `export * from ${JSON.stringify(fileURLToPath(new URL('../src/services/api/index.ts', import.meta.url)))};
          export const { addressApi, userApi, cartApi, orderApi } = globalThis.__api;
          export const catalogApi = { promotions: { list: async () => ({ items: [] }) }, ...globalThis.__api.catalogApi };
          export { isApiId, toStore, toProduct, toCategoryOption, toPromotion, withProductDetail } from ${JSON.stringify(fileURLToPath(new URL('../src/services/api/catalogMappers.ts', import.meta.url)))};
          export class ApiError extends Error {}`,
        payments: `export const paymentApi = globalThis.__api; export const fulfillmentApi = globalThis.__api;`,
        catalog: `export const useCatalog = () => globalThis.__catalog`,
        auth: `export const useAuth = () => globalThis.__auth`,
      }[args.path], loader: 'js', resolveDir: process.cwd() }));
    } }],
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, module, module.exports);
  return { ...h, exports: module.exports };
}

function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...nodes(tree.props?.children)];
}
const textOf = tree => {
  if (Array.isArray(tree)) return tree.map(textOf).join(' ');
  if (tree && typeof tree === 'object') return textOf(tree.props?.children);
  return tree == null || typeof tree === 'boolean' ? '' : String(tree);
};
const emptyApi = { stores: { list: async () => [] }, products: { all: async () => [] }, categories: { all: async () => [] } };

test('catalog timeout exposes retry and no sample products or stores', async () => {
  const h = await load('src/context/CatalogContext.tsx', { api: { catalogApi: {
    ...emptyApi, stores: { list: async () => { throw new Error('timeout'); } },
  } } });
  h.render(h.exports.CatalogProvider, {}); await tick();
  let value = h.render(h.exports.CatalogProvider, {}).props.value;
  assert.deepEqual(value.products, []); assert.deepEqual(value.stores, []);
  assert.equal(value.source, 'error'); assert.equal(value.error, 'timeout');
  assert.equal(value.findStore('kinh-do'), undefined);
  value.reload(); h.render(h.exports.CatalogProvider, {}); await tick();
  value = h.render(h.exports.CatalogProvider, {}).props.value;
  assert.equal(value.source, 'error');
});

test('empty API catalog stays empty without sample fallback', async () => {
  const live = await load('src/context/CatalogContext.tsx', { api: { catalogApi: emptyApi } });
  live.render(live.exports.CatalogProvider, {}); await tick();
  const value = live.render(live.exports.CatalogProvider, {}).props.value;
  assert.equal(value.source, 'api'); assert.deepEqual(value.products, []);
  assert.deepEqual(value.stores, []);
  assert.equal(value.findStore('kinh-do'), undefined);
});

test('empty Commerce reviews never become sample reviews', async () => {
  const h = await load('src/features/fulfillment/components/ReviewList.jsx', { api: { getReviewsByVariant: async () => [] } });
  h.render(h.exports.ReviewList, { variantId: 734 }); await tick();
  const tree = h.render(h.exports.ReviewList, { variantId: 734 });
  assert.match(textOf(tree), /Chưa có đánh giá/);
  assert.doesNotMatch(textOf(tree), /jambon/);
});

test('Commerce review timeout shows an error and retry', async () => {
  const h = await load('src/features/fulfillment/components/ReviewList.jsx', { api: { getReviewsByVariant: async () => { throw Error('timeout'); } } });
  h.render(h.exports.ReviewList, { variantId: 734 }); await tick();
  const tree = h.render(h.exports.ReviewList, { variantId: 734 });
  assert.ok(nodes(tree).some(n => n.props?.role === 'alert'));
  assert.ok(nodes(tree).some(n => n.type === 'button'));
  assert.doesNotMatch(textOf(tree), /jambon/);
});

test('AI HTTP errors show an error without a recommendation', async () => {
  globalThis.fetch = async () => ({ ok: false, json: async () => ({ recommendation: 'fake' }) });
  const h = await load('src/components/AIAssistantModal.tsx');
  const tree = h.render(h.exports.default, { isOpen: true });
  await nodes(tree).find(n => n.type === 'form').props.onSubmit({ preventDefault() {} });
  const result = h.render(h.exports.default, { isOpen: true });
  assert.ok(nodes(result).some(n => n.props?.role === 'alert'));
  assert.doesNotMatch(textOf(result), /fake/);
});

test('customer checkout reconciles missing URL and opens the recovered link', async () => {
  let reconciled = 0, initiated = 0; const redirects = [];
  globalThis.window = { location: { assign: url => redirects.push(url) } };
  globalThis.sessionStorage = storage();
  const pending = { id: 23, status: 'PENDING', checkoutUrl: null, expiresAt: '2099-01-01' };
  const summary = payment => ({ payment, paidAmount: 0, totalAmount: 100 });
  const h = await load('src/features/payment-settlement/openCheckout.ts', { api: {
    customerSummary: async () => summary(pending),
    reconcileCustomer: async () => { reconciled++; return summary({ ...pending, checkoutUrl: 'https://pay.example/23' }); },
    initiateCustomer: async () => { initiated++; throw Error('must not create'); },
  } });
  await h.exports.openCustomerCheckout(44);
  assert.equal(reconciled, 1); assert.equal(initiated, 0);
  assert.deepEqual(redirects, ['https://pay.example/23']);
});

test('unknown customer payment status reconciles and never initiates a new payment', async () => {
  let initiated = 0, reconciled = 0;
  const summary = { payment: { id: 23, status: 'NEW_PROVIDER_STATE', checkoutUrl: null, expiresAt: null }, paidAmount: 0 };
  const h = await load('src/features/payment-settlement/openCheckout.ts', { api: {
    customerSummary: async () => summary,
    reconcileCustomer: async () => { reconciled++; return summary; },
    initiateCustomer: async () => { initiated++; return summary; },
  } });
  await assert.rejects(h.exports.openCustomerCheckout(44));
  assert.equal(initiated, 0); assert.equal(reconciled, 1);
});

test('customer checkout preserves the initiation key after a lost response', async () => {
  const keys = [];
  const h = await load('src/features/payment-settlement/openCheckout.ts', { api: {
    customerSummary: async () => ({ payment: null, paidAmount: 0 }),
    initiateCustomer: async (_id, key) => { keys.push(key); throw Error('timeout'); },
  } });
  await assert.rejects(h.exports.openCustomerCheckout(46));
  await assert.rejects(h.exports.openCustomerCheckout(46));
  assert.equal(keys.length, 2); assert.equal(keys[0], keys[1]);
});

test('older Catalog listings leave stock unknown and new listings keep explicit out-of-stock', async () => {
  const { exports: catalog } = await load('src/services/api/catalogMappers.ts');
  const summary = { productId: 20, storeId: 11, categoryId: 2, name: 'Bánh lava', status: 'ACTIVE', minPrice: 420000 };
  const toProduct = value => catalog.toProduct(value, new Map(), new Map());
  assert.equal(toProduct(summary).inStock, undefined);
  assert.equal(toProduct({ ...summary, purchasable: true }).inStock, true);
  assert.equal(toProduct({ ...summary, purchasable: false, minPrice: null }).inStock, false);
});

test('product detail uses legacy stock only when available quantity is absent', async () => {
  for (const [extra, canPurchase] of [[{}, true], [{ availableQuantity: 0 }, false]]) {
    const variant = { variantId: 20, variantName: 'Hộp 6 bánh', status: 'ACTIVE', stockQuantity: 60, basePrice: 420000, ...extra };
    const h = await load('src/pages/ProductDetail.tsx', { catalog: { source: 'api' }, api: { catalogApi: {
      products: { get: async () => ({ status: 'ACTIVE', variants: [variant] }) },
    } } });
    const props = { product: { id: '20', name: 'Bánh lava', image: '', price: 420000, gallery: [], ingredients: [] } };
    h.render(h.exports.default, props); await tick();
    const tree = h.render(h.exports.default, props);
    const buyNow = nodes(tree).find(n => n.type === 'button' && /Mua ngay/.test(textOf(n)));
    assert.equal(buyNow.props.disabled, !canPurchase);
    h.dispose();
  }
});

test('hidden product blocks purchase and offers a detail retry', async () => {
  const h = await load('src/pages/ProductDetail.tsx', { catalog: { source: 'api' }, api: { catalogApi: {
    products: { get: async () => { throw Error('not found'); } },
  } } });
  const props = { product: { id: '18', storeId: '9', name: 'Hidden', image: '', price: 100, gallery: [], ingredients: [], inStock: true } };
  h.render(h.exports.default, props); await tick();
  const tree = h.render(h.exports.default, props);
  const buyButtons = nodes(tree).filter(n => n.type === 'button' && /Mua ngay|Thêm vào giỏ/i.test(textOf(n)));
  assert.equal(buyButtons.length, 2); assert.ok(buyButtons.every(n => n.props.disabled));
  assert.ok(nodes(tree).some(n => n.type === 'button' && /Thử lại/.test(textOf(n))));
});

test('profile promotions come from Catalog', async () => {
  const calls = [];
  const h = await load('src/pages/UserProfile.tsx', { auth: { user: { userId: '7' } }, catalog: {
    source: 'api', products: [], findStore: id => id === '9' ? { name: 'API Store' } : undefined,
  }, api: { addressApi: { list: async () => [] }, catalogApi: { promotions: { list: async query => {
    calls.push(query); return { items: [{ promotionId: 12, storeId: 9, name: 'Real promotion', status: 'ACTIVE', startAt: '2020-01-01', endAt: '2099-01-01', rules: [] }], totalPages: 1 };
  } } } } });
  const props = {};
  h.render(h.exports.default, props); await tick();
  let tree = h.render(h.exports.default, props);
  nodes(tree).find(n => n.type === 'button' && /Ưu đãi gian hàng/.test(textOf(n))).props.onClick();
  await tick();
  tree = h.render(h.exports.default, props);
  assert.ok(calls.length); assert.match(textOf(tree), /Real promotion/); assert.match(textOf(tree), /API Store/);
  assert.doesNotMatch(textOf(tree), /Sản phẩm yêu thích/);
});

function storage(initial = {}) {
  const items = new Map(Object.entries(initial));
  return { getItem: key => items.get(key) ?? null, setItem: (key, value) => items.set(key, value), removeItem: key => items.delete(key) };
}

test('cart only adds purchasable variants from the live catalog', async () => {
  globalThis.sessionStorage = storage(); globalThis.location = { search: '' };
  globalThis.window = { scrollY: 0, scrollTo() {}, history: {}, addEventListener() {}, removeEventListener() {} };
  let added = [];
  const auth = { isAuthenticated: true, user: { userId: 1 } };
  const h = await load('src/App.tsx', { auth, catalog: { source: 'api', stores: [], products: [{ id: '18' }] }, api: {
    cartApi: { list: async () => [], add: async (...args) => added.push(args) },
    catalogApi: { products: { get: async () => ({ status: 'ACTIVE', variants: [
      { variantId: 700, status: 'HIDDEN', availableQuantity: 99 }, { variantId: 701, status: 'ACTIVE', availableQuantity: 2 },
    ] }) } },
  } });
  const home = tree => nodes(tree).find(n => n.props?.onOpenAI !== undefined && n.props?.onAddToCart)
    ?? nodes(tree).find(n => n.props?.onAddToCart && n.props?.setActiveTab);
  h.render(h.exports.default); await tick();
  let tree = h.render(h.exports.default);
  assert.equal(await home(tree).props.onAddToCart({ id: 'prod-1' }), false);
  assert.deepEqual(added, []);
  assert.equal(await home(tree).props.onAddToCart({ id: '18' }), true);
  assert.deepEqual(added, [['701', 1]]);
  h.dispose();
});

test('cart select-all skips unavailable products and only submits selected lines', async () => {
  const h = await load('src/components/CartDrawer.tsx');
  const product = { name: 'Bánh', storeId: '1', storeName: 'Gian hàng', price: 100 };
  let saved; let checkout;
  const props = { isOpen: true, busy: false, items: [
    { id: '10', product, quantity: 2, selected: true, sugarLevel: 'Hộp 2' },
    { id: '11', product, quantity: 3, selected: false, sugarLevel: 'Hộp 3' },
    { id: '12', product, quantity: 1, selected: false, sugarLevel: 'Hộp 4', unavailableReason: 'UNAVAILABLE' },
  ], onSelectionChange: value => { saved = value; }, onProceedCheckout: value => { checkout = value; }, onClose() {} };
  const tree = h.render(h.exports.default, props);
  const boxes = nodes(tree).filter(node => node.type === 'input' && node.props.type === 'checkbox');
  assert.equal(boxes.length, 4);
  assert.equal(boxes[3].props.disabled, true);
  boxes[0].props.onChange({ target: { checked: true } });
  assert.deepEqual(saved, [10, 11]);
  nodes(tree).find(node => node.type === 'button' && /Tiếp tục đặt hàng/.test(textOf(node))).props.onClick();
  assert.deepEqual(checkout, [10]);
});
test('product reviews use each selected real variant ID', async () => {
  const h = await load('src/pages/ProductDetail.tsx', { catalog: { source: 'api' }, api: { catalogApi: { products: { get: async () => ({
    status: 'ACTIVE', variants: [
      { variantId: 701, variantName: 'Small', status: 'ACTIVE', availableQuantity: 5, basePrice: 100 },
      { variantId: 702, variantName: 'Large', status: 'ACTIVE', availableQuantity: 5, basePrice: 200 },
    ],
  }) } } } });
  const props = { product: { id: '18', name: 'Live', image: '', price: 100, gallery: [], ingredients: [], inStock: true } };
  h.render(h.exports.default, props); await tick();
  let tree = h.render(h.exports.default, props);
  assert.ok(nodes(tree).some(n => n.props?.variantId === 701));
  nodes(tree).find(n => n.type === 'button' && /Large/.test(textOf(n))).props.onClick();
  tree = h.render(h.exports.default, props);
  assert.ok(nodes(tree).some(n => n.props?.variantId === 702));
  assert.ok(!nodes(tree).some(n => n.props?.variantId === 701));
});

test('seller unknown state reconciles without issuing a new link', async () => {
  let initiated = 0, reconciled = 0;
  const summary = { payments: [{ paymentId: 71, paymentType: 'FULL', status: 'UNKNOWN', checkoutUrl: null, expiresAt: null }] };
  const h = await load('src/features/payment-settlement/openCheckout.ts', { api: {
    summary: async () => summary, reconcile: async () => { reconciled++; return summary.payments[0]; },
    initiate: async () => { initiated++; throw Error('must not initiate'); },
  } });
  await assert.rejects(h.exports.openSellerCheckout(8));
  assert.equal(initiated, 0); assert.equal(reconciled, 1);
});

test('fresh RFQ deposit initiates PayOS without reconciling a missing order code', async () => {
  const redirects = [];
  globalThis.window = { location: { assign: url => redirects.push(url) } };
  globalThis.sessionStorage = storage();
  let initiated = 0, reconciled = 0;
  const obligation = { paymentId: 72, paymentType: 'DEPOSIT', status: 'PENDING',
    checkoutUrl: null, expiresAt: null };
  const h = await load('src/features/payment-settlement/openCheckout.ts', { api: {
    summary: async () => ({ payments: [obligation] }),
    reconcile: async () => { reconciled++; throw Error('PAYMENT_LINK_NOT_CREATED'); },
    initiate: async () => { initiated++; return { ...obligation, expiresAt: '2099-01-01',
      checkoutUrl: 'https://pay.example/deposit' }; },
  } });
  await h.exports.openSellerCheckout(9);
  assert.equal(reconciled, 0); assert.equal(initiated, 1);
  assert.deepEqual(redirects, ['https://pay.example/deposit']);
  assert.equal(globalThis.sessionStorage.getItem('financeSellerPaymentId'), '72');
});

test('seller link retry uses a fresh key after termination and preserves it after a timeout', async () => {
  globalThis.sessionStorage = storage();
  let status = 'PENDING';
  const keys = [];
  const h = await load('src/features/payment-settlement/openCheckout.ts', { api: {
    summary: async () => ({ payments: [{ paymentId: 91, paymentType: 'FULL', status,
      checkoutUrl: null, expiresAt: null }] }),
    reconcile: async () => ({ status: 'PENDING' }),
    initiate: async (_id, key) => { keys.push(key); throw Error('timeout'); },
  } });
  await assert.rejects(h.exports.openSellerCheckout(8));
  status = 'CANCELLED';
  await assert.rejects(h.exports.openSellerCheckout(8));
  await assert.rejects(h.exports.openSellerCheckout(8));
  assert.equal(keys.length, 3);
  assert.notEqual(keys[0], keys[1]);
  assert.equal(keys[1], keys[2]);
});

test('local expiry only triggers reconciliation, and verified success never redirects', async () => {
  let initiated = 0; const redirects = [];
  globalThis.window = { location: { assign: url => redirects.push(url) } };
  const h = await load('src/features/payment-settlement/openCheckout.ts', { api: {
    customerSummary: async () => ({ paidAmount: 0, payment: { id: 44, status: 'PENDING', checkoutUrl: 'https://pay.example/44', expiresAt: '2000-01-01' } }),
    reconcileCustomer: async () => ({ paidAmount: 100, payment: { id: 44, status: 'SUCCESS' } }),
    initiateCustomer: async () => { initiated++; },
  } });
  await assert.rejects(h.exports.openCustomerCheckout(8));
  assert.equal(initiated, 0); assert.deepEqual(redirects, []);
});

test('customer unknown state renders its raw status, reconciliation and no QR', async () => {
  const h = await load('src/features/payment-settlement/CustomerOrderPayment.tsx', { api: { customerSummary: async () => ({
    paidAmount: 0, totalAmount: 100, allocations: [], payment: { status: 'PROVIDER_UNKNOWN', checkoutUrl: null, expiresAt: null },
  }) } });
  h.render(h.exports.default, { orderId: 8 }); await tick();
  const tree = h.render(h.exports.default, { orderId: 8 });
  assert.ok(nodes(tree).some(n => n.props?.status === 'PROVIDER_UNKNOWN'));
  assert.ok(nodes(tree).some(n => n.type === 'button' && /Đối soát PayOS/.test(textOf(n))));
  assert.ok(!nodes(tree).some(n => n.type === 'a'));
  assert.ok(!nodes(tree).some(n => n.type === 'button' && /^Thanh toán /.test(textOf(n))));
});

test('orders list uses summaries only and opens a dedicated route with filter return state', async () => {
  globalThis.window = { history: { scrollRestoration: 'auto' }, addEventListener() {}, removeEventListener() {}, scrollTo() {}, scrollY: 0 };
  let details = 0;
  const navigations = [];
  const h = await load('src/pages/OrderTracking.tsx', { api: { orderApi: {
    summaries: async () => [{ orderId: 7, orderNo: 'TEST-7', sourceType: 'RFQ', status: 'ACCEPTED', placedAt: '2026-11-01T00:00:00Z', grandTotal: 100,
      sellerOrderCount: 1, itemCount: 2, sellerOrderStatuses: ['ACCEPTED'], hasCancellation: false }],
    get: async () => { details++; throw Error('list must not load details'); }
  } }, router: { location: { pathname: '/orders', search: '?filter=done', key: 'list', state: null }, navigate: (...args) => navigations.push(args) } });
  const props = { setActiveTab() {}, paymentReturnOrderId: null, paymentReturnSellerPaymentId: null, onPaymentReturnHandled() {} };
  h.render(h.exports.default, props); await tick();
  const tree = h.render(h.exports.default, props);
  assert.equal(details, 0);
  assert.doesNotMatch(textOf(tree), /Thu gọn|Xem thông tin đơn hàng/);
  nodes(tree).find(n => n.type === 'button' && /Xem chi tiết/.test(textOf(n))).props.onClick();
  assert.equal(navigations[0][0], '/orders/7');
  assert.equal(navigations[0][1].state.ordersFrom, '/orders?filter=done');
  h.dispose();
});

test('order direct detail loads only the owned order and provides a list fallback', async () => {
  globalThis.window = { history: { scrollRestoration: 'auto' }, addEventListener() {}, removeEventListener() {}, scrollTo() {}, scrollY: 0 };
  let summaries = 0; const seen = [], navigations = [];
  const h = await load('src/pages/OrderTracking.tsx', { api: { getMyReviews: async () => [], orderApi: {
    summaries: async () => { summaries++; return []; },
    get: async id => { seen.push(id); return { orderId: id, orderNo: 'TEST-8', status: 'AWAITING_DEPOSIT', sellerOrders: [] }; }
  } }, router: { location: { pathname: '/orders/8', search: '', key: 'detail', state: null }, navigate: (...args) => navigations.push(args) } });
  const props = { orderId: '8', setActiveTab() {}, paymentReturnOrderId: null, paymentReturnSellerPaymentId: null, onPaymentReturnHandled() {} };
  h.render(h.exports.default, props); await tick();
  const tree = h.render(h.exports.default, props);
  assert.equal(summaries, 0); assert.ok(seen.every(id => id === '8'));
  assert.ok(nodes(tree).some(n => n.props?.order?.orderId === '8'));
  nodes(tree).find(n => n.type === 'button' && /Quay lại danh sách đơn hàng/.test(textOf(n))).props.onClick();
  assert.equal(navigations[0][0], '/orders');
  h.dispose();
});

test('order detail route is parsed and invalid IDs never become an order route', async () => {
  const h = await load('src/utils/storefrontRoutes.ts');
  assert.deepEqual(h.exports.storefrontPage('/orders/8'), { page: 'orders', id: '8' });
  assert.equal(h.exports.storefrontPage('/orders/0').page, 'not-found');
  assert.equal(h.exports.storefrontPage('/orders/abc').page, 'not-found');
});

test('scroll restoration does not replace the list position with loading-clamped zero', async () => {
  const listeners = new Map();
  globalThis.window = { history: { scrollRestoration: 'auto' }, scrollY: 0,
    addEventListener: (event, fn) => listeners.set(event, fn), removeEventListener: event => listeners.delete(event),
    scrollTo: ({ top }) => { window.scrollY = top; } };
  const h = await load('src/utils/storefrontRoutes.ts');
  const render = (key, action, ready) => h.render(() => { h.exports.useStorefrontScroll({ key }, action, ready); return null; });
  render('list', 'PUSH', true);
  window.scrollY = 1200; listeners.get('scroll')();
  render('detail', 'PUSH', false);
  window.scrollY = 0; listeners.get('scroll')();
  render('detail', 'PUSH', true);
  render('list', 'POP', false); listeners.get('scroll')();
  render('list', 'POP', true);
  assert.equal(window.scrollY, 1200);
  h.dispose();
});

test('a previous order action cannot overwrite another order detail after navigation', async () => {
  globalThis.window = { history: { scrollRestoration: 'auto' }, addEventListener() {}, removeEventListener() {}, scrollTo() {}, scrollY: 0 };
  const h = await load('src/pages/OrderTracking.tsx', { api: { getMyReviews: async () => [], orderApi: {
    get: async id => ({ orderId: id, sellerOrders: [] })
  } }, router: { location: { pathname: '/orders/1', search: '', key: 'one', state: null } } });
  const props = { orderId: '1', setActiveTab() {}, paymentReturnOrderId: null, paymentReturnSellerPaymentId: null, onPaymentReturnHandled() {} };
  h.render(h.exports.default, props); await tick();
  const oldTree = h.render(h.exports.default, props);
  const oldAction = nodes(oldTree).find(n => n.props?.order?.orderId === '1').props.onUpdated;
  h.render(h.exports.default, { ...props, orderId: '2' }); await tick();
  oldAction({ orderId: '1', sellerOrders: [] });
  const tree = h.render(h.exports.default, { ...props, orderId: '2' });
  assert.ok(nodes(tree).some(n => n.props?.order?.orderId === '2'));
  h.dispose();
});

test('PayOS redirects clear stale order context and bind supplier return to the actual payment', async () => {
  globalThis.window = { location: { assign() {} } }; globalThis.sessionStorage = storage();
  sessionStorage.setItem('financeOrderDetailId', '1'); sessionStorage.setItem('financeDetailPaymentId', '3');
  const h = await load('src/features/payment-settlement/openCheckout.ts', { api: {
    customerSummary: async () => ({ paidAmount: 0, payment: { id: 30, status: 'PENDING', checkoutUrl: 'https://pay.example/customer', expiresAt: '2099-01-01' } }),
    summary: async () => ({ payments: [{ paymentId: 40, paymentType: 'DEPOSIT', status: 'PENDING', checkoutUrl: 'https://pay.example/seller', expiresAt: '2099-01-01' }] })
  } });
  await h.exports.openCustomerCheckout(8);
  assert.equal(sessionStorage.getItem('financeOrderDetailId'), null);
  assert.equal(sessionStorage.getItem('financeDetailPaymentId'), null);
  assert.equal(sessionStorage.getItem('financeCustomerOrderId'), '8');
  await h.exports.openSellerCheckout(9, '12');
  assert.equal(sessionStorage.getItem('financeOrderDetailId'), '12');
  assert.equal(sessionStorage.getItem('financeDetailPaymentId'), '40');
  await h.exports.openSellerCheckout(9);
  assert.equal(sessionStorage.getItem('financeOrderDetailId'), null);
});

let failed = 0;
for (const { name, run } of tests) {
  try { await run(); console.log(`PASS ${name}`); }
  catch (error) { failed++; console.error(`FAIL ${name}\n${error.stack}`); }
}
console.log(`${tests.length - failed}/${tests.length} regressions passed`);
process.exitCode = failed ? 1 : 0;
