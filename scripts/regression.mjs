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

async function load(file, { mock = false, api = {}, catalog = {}, auth = {} } = {}) {
  const h = hooks();
  globalThis.__hooks = h.api;
  globalThis.__api = api;
  globalThis.__catalog = catalog;
  globalThis.__auth = auth;
  const result = await build({
    entryPoints: [file], bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic',
    define: { 'import.meta.env': JSON.stringify({ VITE_USE_MOCK_CATALOG: String(mock) }) },
    plugins: [{ name: 'boundaries', setup(b) {
      b.onResolve({ filter: /^react$/ }, () => ({ path: 'react', namespace: 'test' }));
      b.onResolve({ filter: /services\/api$/ }, () => ({ path: 'api', namespace: 'test' }));
      b.onResolve({ filter: /(?:paymentApi|api\/fulfillmentApi)$/ }, () => ({ path: 'payments', namespace: 'test' }));
      if (!file.endsWith('CatalogContext.tsx')) b.onResolve({ filter: /context\/CatalogContext$/ }, () => ({ path: 'catalog', namespace: 'test' }));
      b.onResolve({ filter: /context\/AuthContext$/ }, () => ({ path: 'auth', namespace: 'test' }));
      b.onLoad({ filter: /.*/, namespace: 'test' }, args => ({ contents: {
        react: `module.exports = globalThis.__hooks`,
        api: `export * from ${JSON.stringify(fileURLToPath(new URL('../src/services/api/index.ts', import.meta.url)))};
          export const { catalogApi, addressApi, userApi, cartApi } = globalThis.__api;
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

test('empty API catalog stays empty; explicit demo still has samples', async () => {
  const live = await load('src/context/CatalogContext.tsx', { api: { catalogApi: emptyApi } });
  live.render(live.exports.CatalogProvider, {}); await tick();
  const value = live.render(live.exports.CatalogProvider, {}).props.value;
  assert.equal(value.source, 'api'); assert.deepEqual(value.products, []);
  assert.equal(value.findStore('kinh-do'), undefined);
  const demo = await load('src/context/CatalogContext.tsx', { mock: true });
  const sample = demo.render(demo.exports.CatalogProvider, {}).props.value;
  assert.equal(sample.source, 'mock'); assert.ok(sample.products.length > 0);
  assert.ok(sample.findStore(sample.stores[0].storeId));
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
  globalThis.sessionStorage = { setItem() {}, getItem() { return null; } };
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

test('hidden product blocks purchase and offers a detail retry', async () => {
  const h = await load('src/pages/ProductDetail.tsx', { catalog: { source: 'api' }, api: { catalogApi: {
    products: { get: async () => { throw Error('not found'); } },
  } } });
  const props = { product: { id: '18', storeId: '9', name: 'Hidden', image: '', price: 100, gallery: [], ingredients: [], inStock: true }, wishlistIds: [] };
  h.render(h.exports.default, props); await tick();
  const tree = h.render(h.exports.default, props);
  const buyButtons = nodes(tree).filter(n => n.type === 'button' && /Mua ngay|Thêm vào giỏ/i.test(textOf(n)));
  assert.equal(buyButtons.length, 2); assert.ok(buyButtons.every(n => n.props.disabled));
  assert.ok(nodes(tree).some(n => n.type === 'button' && /Thử lại/.test(textOf(n))));
});

test('profile promotions come from Catalog; wishlist never resolves sample IDs in real mode', async () => {
  const calls = [];
  const h = await load('src/pages/UserProfile.tsx', { auth: { user: { userId: '7' } }, catalog: {
    source: 'api', products: [], findStore: id => id === '9' ? { name: 'API Store' } : undefined,
  }, api: { addressApi: { list: async () => [] }, catalogApi: { promotions: { list: async query => {
    calls.push(query); return { items: [{ promotionId: 12, storeId: 9, name: 'Real promotion', status: 'ACTIVE', startAt: '2020-01-01', endAt: '2099-01-01', rules: [] }], totalPages: 1 };
  } } } } });
  const props = { initialTab: 'promotions', wishlistIds: ['prod-1'] };
  h.render(h.exports.default, props); await tick();
  let tree = h.render(h.exports.default, props);
  assert.ok(calls.length); assert.match(textOf(tree), /Real promotion/); assert.match(textOf(tree), /API Store/);
  nodes(tree).find(n => n.type === 'button' && /Sản phẩm yêu thích/.test(textOf(n))).props.onClick();
  tree = h.render(h.exports.default, props);
  assert.doesNotMatch(textOf(tree), /Trăng Vàng Hoàng Kim/);
  assert.match(textOf(tree), /chưa đồng bộ/i);
});

function storage(initial = {}) {
  const items = new Map(Object.entries(initial));
  return { getItem: key => items.get(key) ?? null, setItem: (key, value) => items.set(key, value), removeItem: key => items.delete(key) };
}

test('wishlist separates accounts immediately on switch and logout; cart rejects sample IDs', async () => {
  globalThis.localStorage = storage({ 'mooncake.wishlist.1': '["18"]', 'mooncake.wishlist.2': '["19"]' });
  globalThis.sessionStorage = storage(); globalThis.location = { search: '' };
  globalThis.window = { scrollTo() {} };
  let added = [];
  const auth = { isAuthenticated: true, user: { userId: 1 } };
  const h = await load('src/App.tsx', { auth, catalog: { source: 'api', stores: [], products: [{ id: '18' }] }, api: {
    cartApi: { list: async () => [], add: async (...args) => added.push(args) },
    catalogApi: { products: { get: async () => ({ status: 'ACTIVE', variants: [
      { variantId: 700, status: 'HIDDEN', stockQuantity: 99 }, { variantId: 701, status: 'ACTIVE', stockQuantity: 2 },
    ] }) } },
  } });
  const home = tree => nodes(tree).find(n => n.props?.onToggleWishlist && n.props?.onAddToCart);
  h.render(h.exports.default); await tick();
  let tree = h.render(h.exports.default);
  assert.deepEqual(home(tree).props.wishlistIds, ['18']);
  auth.user = { userId: 2 };
  tree = h.render(h.exports.default);
  assert.deepEqual(home(tree).props.wishlistIds, []);
  tree = h.render(h.exports.default);
  assert.deepEqual(home(tree).props.wishlistIds, ['19']);
  home(tree).props.onToggleWishlist('18');
  assert.equal(localStorage.getItem('mooncake.wishlist.1'), '["18"]');
  assert.equal(localStorage.getItem('mooncake.wishlist.2'), '["19","18"]');
  assert.equal(await home(tree).props.onAddToCart({ id: 'prod-1' }), false);
  assert.deepEqual(added, []);
  assert.equal(await home(tree).props.onAddToCart({ id: '18' }), true);
  assert.deepEqual(added, [['701', 1]]);
  auth.isAuthenticated = false; auth.user = null;
  tree = h.render(h.exports.default);
  assert.deepEqual(home(tree).props.wishlistIds, []);
  h.dispose();
});

test('product reviews use each selected real variant ID', async () => {
  const h = await load('src/pages/ProductDetail.tsx', { catalog: { source: 'api' }, api: { catalogApi: { products: { get: async () => ({
    status: 'ACTIVE', variants: [
      { variantId: 701, variantName: 'Small', status: 'ACTIVE', stockQuantity: 5, basePrice: 100 },
      { variantId: 702, variantName: 'Large', status: 'ACTIVE', stockQuantity: 5, basePrice: 200 },
    ],
  }) } } } });
  const props = { product: { id: '18', name: 'Live', image: '', price: 100, gallery: [], ingredients: [], inStock: true }, wishlistIds: [] };
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

let failed = 0;
for (const { name, run } of tests) {
  try { await run(); console.log(`PASS ${name}`); }
  catch (error) { failed++; console.error(`FAIL ${name}\n${error.stack}`); }
}
console.log(`${tests.length - failed}/${tests.length} regressions passed`);
process.exitCode = failed ? 1 : 0;
