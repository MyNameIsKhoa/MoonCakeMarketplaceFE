// Run with: node --test src/features/rfq/rfq.test.mjs
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import * as React from 'react';
import { build } from 'esbuild';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../../../', import.meta.url));
const tick = () => new Promise(resolve => setImmediate(resolve));
const user = { userId: 1, customerId: 11, email: 'buyer@example.test' };
const supplier = { supplierId: 2, verificationStatus: 'VERIFIED' };
const rfq = { rfqId: '3', customerId: '11', quantity: 100, status: 'OPEN' };
const quotation = {
  quotationId: '4', storeId: '5', rfqId: '3', version: 1, status: 'SUBMITTED',
  depositPercent: '30', shippingFee: '0', validUntil: '2099-01-01T00:00:00Z',
  proposedDeliveryDate: '2099-01-15', totalAmount: '45000',
  items: [{ variantId: '7', itemNameSnapshot: 'Original name', skuSnapshot: 'OLD',
    quantity: 1, unitPrice: '45000', discountAmount: '0' }],
};

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
      if (!deps[i] || next.some((value, n) => !Object.is(value, deps[i][n]))) {
        deps[i] = next;
        effects.push(() => { cleanup[i]?.(); cleanup[i] = fn(); });
      }
    },
    useMemo(fn, next) {
      const i = cursor++;
      if (!deps[i] || next.some((value, n) => !Object.is(value, deps[i][n]))) {
        deps[i] = next; state[i] = fn();
      }
      return state[i];
    },
    useCallback(fn, next) { return api.useMemo(() => fn, next); },
    useRef(initial) { return api.useState(() => ({ current: initial }))[0]; },
  };
  return {
    api,
    render(fn, props) { cursor = 0; effects = []; const tree = fn(props); effects.forEach(fn => fn()); return tree; },
    reset() { cleanup.forEach(fn => fn?.()); state.length = deps.length = cleanup.length = 0; },
  };
}

async function load(file, { auth = { user, supplierProfile: null }, api = {} } = {}) {
  const h = hooks();
  globalThis.__rfqTest = { hooks: h.api, auth, api };
  globalThis.window = { scrollTo() {}, setTimeout, clearTimeout, dispatchEvent(event) { events.push(event); } };
  globalThis.CustomEvent = class { constructor(type, options) { this.type = type; this.detail = options.detail; } };
  globalThis.requestAnimationFrame = fn => fn();
  const events = [];
  const result = await build({
    absWorkingDir: root, entryPoints: [`src/features/rfq/${file}`], bundle: true,
    write: false, platform: 'node', format: 'cjs', jsx: 'automatic',
    define: { 'import.meta.env': '{}' },
    plugins: [{ name: 'rfq-boundaries', setup(b) {
      b.onResolve({ filter: /^react$/ }, () => ({ path: 'react', namespace: 'test' }));
      b.onResolve({ filter: /context\/AuthContext$/ }, () => ({ path: 'auth', namespace: 'test' }));
      b.onResolve({ filter: /services\/api$/ }, () => ({ path: 'catalog', namespace: 'test' }));
      b.onResolve({ filter: /^\.\.\/api$|chat\/api$/ }, () => ({ path: 'api', namespace: 'test' }));
      b.onResolve({ filter: /useStoreNames$/ }, () => ({ path: 'names', namespace: 'test' }));
      b.onResolve({ filter: /components\/|^\.\/(?:Quotation|Decision|Accept|RfqList)|^\.\/ui$/ }, args => args.kind === 'entry-point' ? undefined : ({
        path: args.path.split('/').at(-1), namespace: 'stub',
      }));
      b.onLoad({ filter: /.*/, namespace: 'test' }, args => ({ loader: 'js', contents: {
        react: 'module.exports = globalThis.__rfqTest.hooks',
        auth: 'export const useAuth = () => globalThis.__rfqTest.auth',
        catalog: 'export const { productApi, variantApi } = globalThis.__rfqTest.api',
        api: 'export const { rfqApi, quotationApi, lookupApi, conversationApi } = globalThis.__rfqTest.api; export const idempotencyKeyFor = () => "test-key"',
        names: 'export const useStoreNames = () => ({}); export const storeLabel = (_names, id) => `Store ${id}`',
      }[args.path] }));
      b.onLoad({ filter: /.*/, namespace: 'stub' }, args => ({ loader: 'js', contents: `
        function Stub() {} Stub.testPath = ${JSON.stringify(args.path)};
        export default Stub;
        export const ErrorBlock = Stub, InfoRow = Stub, LoadingRows = Stub;
        export const isIntakeExpired = () => false;
      ` }));
    } }],
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, module, module.exports);
  let portalKey;
  return { ...h, events, component: module.exports.default,
    portal(props = {}) {
      const child = h.render(module.exports.default, props);
      if (!child) return null;
      if (portalKey !== child.key) { h.reset(); portalKey = child.key; }
      return h.render(child.type, child.props);
    },
  };
}

function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return tree && typeof tree === 'object' ? [tree, ...nodes(tree.props?.children)] : [];
}
function text(tree) {
  if (Array.isArray(tree)) return tree.map(text).join(' ');
  return tree && typeof tree === 'object' ? text(tree.props?.children) : tree == null || typeof tree === 'boolean' ? '' : String(tree);
}
const child = (tree, name) => nodes(tree).find(n => n.type?.testPath === name);
const input = (tree, suffix) => nodes(tree).find(n => n.type === 'input' && n.props.id?.endsWith(suffix) && (suffix !== '-price' || !n.props.readOnly));
const click = (tree, label) => nodes(tree).find(n => n.type === 'button' && text(n).includes(label)).props.onClick();

test('customers only see their own RFQs, including stale supplier tabs', async () => {
  const h = await load('RfqPortal.tsx');
  for (const initialTab of ['feed', 'mine', 'quotations']) {
    const tree = h.portal({ initialTab });
    assert.match(text(tree), /Yêu cầu báo giá của tôi/);
    assert.doesNotMatch(text(tree), /Sàn yêu cầu báo giá|Báo giá của tôi/);
    assert.equal(child(tree, 'RfqList').props.mine, true);
    assert.equal(typeof child(tree, 'RfqList').props.onCreate, 'function');
  }
});

test('supplier mode wins for dual roles and pending suppliers cannot create buyer RFQs', async () => {
  for (const verificationStatus of ['VERIFIED', 'PENDING', 'REJECTED', 'SUSPENDED']) {
    const h = await load('RfqPortal.tsx', { auth: { user, supplierProfile: { ...supplier, verificationStatus } } });
    const tree = h.portal({ initialTab: 'mine' });
    assert.match(text(tree), /Sàn yêu cầu báo giá/);
    assert.match(text(tree), /Báo giá của tôi/);
    assert.doesNotMatch(text(tree), /Yêu cầu báo giá của tôi/);
    assert.equal(child(tree, 'RfqList').props.mine, false);
    assert.equal(child(tree, 'RfqList').props.onCreate, undefined);
    assert.equal(/cần được xác minh để gửi báo giá/.test(text(tree)), verificationStatus !== 'VERIFIED');
  }
});

test('messages entry and RFQ chat actions open the widget without losing RFQ detail', async () => {
  const h = await load('RfqPortal.tsx');
  let tree = h.portal({ initialTab: 'messages' });
  assert.equal(h.events[0].type, 'mooncake:open-conversation-chat');
  assert.equal(h.events[0].detail.conversationId, null);
  child(tree, 'RfqList').props.onOpen('3');
  tree = h.portal({ initialTab: 'messages' });
  child(tree, 'RfqDetail').props.onOpenConversation('conversation-1');
  assert.equal(h.events.at(-1).detail.conversationId, 'conversation-1');
  assert.ok(child(h.portal({ initialTab: 'messages' }), 'RfqDetail'));
});

test('RFQ links open the requested detail for customer and supplier modes', async () => {
  for (const profile of [null, supplier, { ...supplier, verificationStatus: 'PENDING' }]) {
    const h = await load('RfqPortal.tsx', { auth: { user, supplierProfile: profile } });
    const tree = h.portal({ initialRfqId: '9007199254740993123' });
    assert.equal(child(tree, 'RfqDetail').props.rfqId, '9007199254740993123');
    assert.equal(child(tree, 'RfqDetail').props.supplier, profile);
    assert.equal(child(tree, 'RfqList'), undefined);
  }
});

test('RFQ link changes reset detail and invalid or absent IDs show the role list', async () => {
  const h = await load('RfqPortal.tsx');
  assert.equal(child(h.portal({ initialRfqId: '3' }), 'RfqDetail').props.rfqId, '3');
  let tree = h.portal({ initialRfqId: '4' });
  assert.equal(child(tree, 'RfqDetail').props.rfqId, '4');
  child(tree, 'RfqDetail').props.onBack();
  assert.equal(child(h.portal({ initialRfqId: '4' }), 'RfqList').props.mine, true);
  for (const initialRfqId of [undefined, '', '-1', '1.2', ' 3', '3 ', 'rfq-3']) {
    tree = h.portal({ initialRfqId });
    assert.equal(child(tree, 'RfqDetail'), undefined);
    assert.equal(child(tree, 'RfqList').props.mine, true);
  }
});

test('RFQ links remain compatible with the messages widget entry', async () => {
  const h = await load('RfqPortal.tsx');
  const tree = h.portal({ initialRfqId: '3', initialTab: 'messages' });
  assert.equal(child(tree, 'RfqDetail').props.rfqId, '3');
  assert.equal(h.events[0].type, 'mooncake:open-conversation-chat');
});

test('account and supplier mode changes discard open RFQs and buyer drafts', async () => {
  const auth = { user, supplierProfile: null };
  const h = await load('RfqPortal.tsx', { auth });
  child(h.portal(), 'RfqList').props.onCreate();
  assert.ok(child(h.portal(), 'RfqCreateForm'));
  auth.supplierProfile = supplier;
  assert.equal(child(h.portal(), 'RfqList').props.mine, false);
  child(h.portal(), 'RfqList').props.onOpen('3');
  auth.user = { ...user, userId: 99, customerId: 99 };
  assert.equal(child(h.portal(), 'RfqDetail'), undefined);
  auth.user = null;
  assert.equal(h.portal(), null);
});

test('variant selection fills editable negotiated price and readonly reference price', async () => {
  const h = await load('components/QuotationForm.tsx');
  const props = { rfq, mode: { kind: 'create', stores: [{ storeId: 5, status: 'ACTIVE' }] } };
  let tree = h.render(h.component, props);
  nodes(tree).find(n => n.type === 'input' && n.props.type === 'checkbox').props.onChange({ target: { checked: true } });
  tree = h.render(h.component, props);
  child(tree, 'QuotationCatalogPicker').props.onSelect({ productId: 6, name: 'Cake' }, { variantId: 7, variantName: 'Small', sku: 'S', basePrice: '60000.00' });
  tree = h.render(h.component, props);
  assert.equal(input(tree, '-price').props.value, '60000');
  assert.equal(input(tree, '-reference-price').props.readOnly, true);
  input(tree, '-price').props.onChange({ target: { value: '55000' } });
  tree = h.render(h.component, props);
  assert.equal(input(tree, '-price').props.value, '55000');
  assert.equal(input(tree, '-reference-price').props.value, '60000');
  click(tree, 'Chọn lại');
  tree = h.render(h.component, props);
  child(tree, 'QuotationCatalogPicker').props.onSelect({ productId: 6, name: 'Cake' }, { variantId: 8, variantName: 'Large', sku: 'L', basePrice: 80000 });
  tree = h.render(h.component, props);
  assert.equal(input(tree, '-price').props.value, '80000');
  assert.match(text(tree), /Cake · Large · L/);
});

test('revision catalog hydration never overwrites the negotiated price', async () => {
  const h = await load('components/QuotationForm.tsx', { api: {
    variantApi: { getOwned: async () => ({ productId: 6, variantName: 'Current variant', sku: 'NEW', status: 'ACTIVE', basePrice: 90000 }) },
    productApi: { get: async () => ({ name: 'Current cake', status: 'ACTIVE' }) },
  } });
  const props = { rfq, mode: { kind: 'revise', quotation } };
  h.render(h.component, props); await tick();
  const tree = h.render(h.component, props);
  assert.equal(input(tree, '-price').props.value, '45000');
  assert.equal(input(tree, '-reference-price').props.value, '90000');
  h.reset();
});

test('RFQ ownership requires the current customer and supplier mode blocks buyer controls', async () => {
  for (const [customerId, profile, buyer] of [[11, null, true], [99, null, false], [11, supplier, false], [11, { ...supplier, verificationStatus: 'PENDING' }, false]]) {
    const h = await load('components/RfqDetail.tsx', { auth: { user: { ...user, customerId } }, api: {
      rfqApi: { get: async () => rfq }, quotationApi: { listForRfq: async () => ({ items: [quotation] }) },
    } });
    const props = { rfqId: '3', supplier: profile, initialQuotationId: '4' };
    h.render(h.component, props); await tick(); h.render(h.component, props); await tick();
    const tree = h.render(h.component, props);
    assert.equal(text(tree).includes('Hủy yêu cầu'), buyer);
    const detail = child(tree, 'QuotationDetail');
    if (profile) {
      assert.equal(detail.props.viewer, 'supplier');
      assert.equal(typeof detail.props.onRevise === 'function', profile.verificationStatus === 'VERIFIED');
      assert.equal(text(tree).includes('Gửi báo giá'), profile.verificationStatus === 'VERIFIED');
      assert.equal(nodes(tree).filter(n => n.type === 'button' && n.props['aria-pressed'] !== undefined).length, 0);
    } else assert.equal(!!detail, buyer);
    h.reset();
  }
});

test('selected quotation has one full header while other versions remain selectable', async () => {
  const h = await load('components/QuotationCompare.tsx');
  const props = { quotations: [quotation], storeNames: {}, selectedId: '4', showHistory: false };
  assert.equal(nodes(h.render(h.component, props)).filter(n => n.type === 'button').length, 0);
  const tree = h.render(h.component, { ...props, quotations: [quotation, { ...quotation, quotationId: '8', version: 2 }] });
  assert.equal(nodes(tree).filter(n => n.type === 'button').length, 4);
  assert.doesNotMatch(text(tree), /Phiên bản 1.*Phiên bản 1/);
});
