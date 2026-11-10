// Run independently: node --test src/features/chat/chat.test.mjs
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import * as React from 'react';
import { build } from 'esbuild';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../../../', import.meta.url));
const tick = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const conversation = id => ({ conversationId: id, rfqId: `rfq-${id}`, customerId: '11', supplierId: '22', status: 'OPEN', createdAt: '2026-01-01T00:00:00Z' });
const page = (items = [], n = 0) => ({ items, page: n, totalPages: 2, totalElements: 21 });
const history = items => ({ items, hasMore: false, nextCursor: null });
const message = id => ({ messageId: id, conversationId: '1', senderUserId: '2', content: `message ${id}`, clientMessageId: null });

// Match React's dependency/cleanup behavior while testing the real components and hooks.
function hooks() {
  const state = [], deps = [], cleanup = [];
  let cursor = 0, effects = [], disposed = false, lateWrites = 0;
  const changed = (i, next) => !deps[i] || next.some((v, n) => !Object.is(v, deps[i][n]));
  const api = {
    ...React,
    useState(initial) {
      const i = cursor++;
      if (!(i in state)) state[i] = typeof initial === 'function' ? initial() : initial;
      return [state[i], value => {
        if (disposed) lateWrites++;
        state[i] = typeof value === 'function' ? value(state[i]) : value;
      }];
    },
    useEffect(fn, next) {
      const i = cursor++;
      if (changed(i, next)) {
        deps[i] = next;
        effects.push(() => { cleanup[i]?.(); cleanup[i] = fn(); });
      }
    },
    useMemo(fn, next) {
      const i = cursor++;
      if (changed(i, next)) { deps[i] = next; state[i] = fn(); }
      return state[i];
    },
    useCallback(fn, next) { return api.useMemo(() => fn, next); },
    useRef(initial) { return api.useState(() => ({ current: initial }))[0]; },
    useId() { return api.useState(() => `chat-test-${cursor}`)[0]; },
  };
  return {
    api,
    render(fn, props) { cursor = 0; effects = []; const tree = fn(props); effects.forEach(fn => fn()); return tree; },
    dispose() { cleanup.forEach(fn => fn?.()); cleanup.length = 0; disposed = true; },
    reset() { this.dispose(); state.length = deps.length = 0; disposed = false; },
    get lateWrites() { return lateWrites; },
  };
}

async function load(file, api = {}, auth = { isAuthenticated: true, user: { userId: 1, customerId: 11 } }) {
  const h = hooks();
  const sockets = [];
  const env = { hooks: h.api, auth, api: { list: async () => page(), unreadCount: async () => ({ unreadCount: 0 }), ...api }, sockets };
  globalThis.__chatTest = env;
  globalThis.window = Object.assign(new EventTarget(), { setTimeout, clearTimeout, setInterval, clearInterval });
  globalThis.document = Object.assign(new EventTarget(), { visibilityState: 'visible', activeElement: null });
  const result = await build({
    absWorkingDir: root, entryPoints: [`src/features/chat/${file}`], bundle: true,
    write: false, platform: 'node', format: 'cjs', jsx: 'automatic',
    plugins: [{ name: 'chat-boundaries', setup(b) {
      b.onResolve({ filter: /^react$/ }, () => ({ path: 'react', namespace: 'test' }));
      b.onResolve({ filter: /context\/AuthContext$/ }, () => ({ path: 'auth', namespace: 'test' }));
      b.onResolve({ filter: /services\/api\/http$/ }, () => ({ path: 'http', namespace: 'test' }));
      b.onResolve({ filter: /rfq\/api$/ }, () => ({ path: 'rfq', namespace: 'test' }));
      b.onResolve({ filter: /^\.\/api$/ }, () => ({ path: 'api', namespace: 'test' }));
      b.onResolve({ filter: /^\.\/stompClient$/ }, () => ({ path: 'socket', namespace: 'test' }));
      b.onLoad({ filter: /.*/, namespace: 'test' }, args => ({ contents: {
        react: 'module.exports = globalThis.__chatTest.hooks',
        auth: 'const env = globalThis.__chatTest; export const useAuth = () => env.auth;',
        http: 'export const errorMessage = e => e.message; export const getAccessToken = () => "token";',
        api: 'export const conversationApi = globalThis.__chatTest.api; export const CHAT_SOCKET_URL = "ws://localhost/ws/chat"; export const MAX_MESSAGE_LENGTH = 10000;',
        rfq: 'export const rfqApi = { get: async id => ({ title: id }) }; export const lookupApi = { supplierStore: async () => ({ name: "Partner store" }) };',
        socket: `const env = globalThis.__chatTest;
          export class StompConnection {
            isOpen = true; disposed = false; sent = [];
            constructor(url, token, handlers) { this.handlers = handlers; env.sockets.push(this); }
            subscribe(destination) { this.destination = destination; }
            send(destination, body) { this.sent.push({ destination, body }); }
            dispose() { this.disposed = true; }
          }`,
      }[args.path], loader: 'js', resolveDir: root }));
    } }],
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, module, module.exports);
  return { ...h, h, exports: module.exports, env, sockets };
}

function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...nodes(tree.props?.children)];
}
const find = (tree, predicate) => nodes(tree).find(predicate);
const byName = (tree, name) => find(tree, n => n.type?.name === name);
const button = (tree, label) => find(tree, n => n.type === 'button' && n.props['aria-label'] === label);

test('RFQ event helper emits a conversation ID or an explicit inbox request', async () => {
  const { exports: e } = await load('chatWidgetEvents.ts');
  const events = [];
  window.addEventListener(e.OPEN_CONVERSATION_CHAT_EVENT, event => events.push(event.detail));
  e.openConversationChat(' 123 ');
  e.openConversationChat();
  assert.deepEqual(events, [{ conversationId: '123' }, { conversationId: null }]);
});

test('auth gates the widget, keys account sessions and clears host state on account switch/logout', async () => {
  const { h, exports: e, env } = await load('FloatingChatWidget.tsx', {}, { isAuthenticated: false, user: null });
  const selected = []; let closed = 0;
  const props = { open: true, onClose: () => closed++, onSelectConversation: id => selected.push(id) };
  assert.equal(h.render(e.default, props), null);
  env.auth.isAuthenticated = true; env.auth.user = { userId: 1, customerId: 11 };
  assert.equal(h.render(e.default, props).key, '1');
  env.auth.user = { userId: 2, customerId: null };
  assert.equal(h.render(e.default, props), null);
  assert.deepEqual(selected, [null]); assert.equal(closed, 1);
  const next = h.render(e.default, { ...props, open: false });
  assert.equal(next, null);
  env.auth.isAuthenticated = false; env.auth.user = null;
  assert.equal(h.render(e.default, props), null);
  assert.equal(closed, 2);
  h.dispose();
});

test('widget selects locally, minimizes with reading paused, restores on repeated RFQ event, and closes with Escape', async () => {
  const { h, exports: e } = await load('FloatingChatWidget.tsx', { unreadCount: async () => ({ unreadCount: 3 }) });
  let closed = 0;
  const session = h.render(e.default, { open: true, onClose: () => closed++ });
  h.reset();
  const render = () => h.render(session.type, session.props);
  let tree = render(); await tick(); tree = render();
  assert.equal(tree.props.role, 'dialog');
  assert.ok(find(tree, n => n.props?.['aria-label'] === '3 tin nhắn chưa đọc'));
  byName(tree, 'ConversationsView').props.onSelect('123');
  tree = render();
  assert.equal(byName(tree, 'ConversationsView').props.selectedId, '123');
  button(tree, 'Thu nhỏ tin nhắn').props.onClick();
  tree = render();
  assert.equal(tree.props.role, 'region');
  assert.equal(byName(tree, 'ConversationsView').props.visible, false);
  assert.ok(find(tree, n => n.props?.hidden === true));
  window.dispatchEvent(new CustomEvent('mooncake:open-conversation-chat', { detail: { conversationId: '123' } }));
  tree = render();
  assert.equal(tree.props.role, 'dialog');
  assert.equal(byName(tree, 'ConversationsView').props.selectedId, '123');
  let stopped = false;
  tree.props.onKeyDown({ key: 'Escape', stopPropagation: () => { stopped = true; } });
  assert.equal(closed, 1); assert.equal(stopped, true);
  assert.equal(byName(render(), 'ConversationsView').props.selectedId, null);
  h.dispose();
});

test('minimized chat retains drafts and marks incoming messages read only after restoring', async () => {
  let reads = 0;
  const { h, exports: e, sockets } = await load('ChatPanel.tsx', {
    history: async () => history([message('10')]),
    markRead: async () => { reads++; },
  });
  const props = { conversationId: '1', conversationStatus: 'OPEN', title: 'Partner', myUserId: '1', compact: true, active: true };
  const render = () => h.render(e.default, props);
  render(); await tick(); let tree = render();
  assert.equal(reads, 1);
  find(tree, n => n.type === 'textarea').props.onChange({ target: { value: 'Keep my draft' } });
  props.active = false; render();
  sockets[0].handlers.onMessage({ body: JSON.stringify(message('11')) });
  tree = render();
  assert.equal(find(tree, n => n.type === 'textarea').props.value, 'Keep my draft');
  document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(reads, 1);
  props.active = true; tree = render();
  assert.equal(reads, 2);
  assert.equal(find(tree, n => n.type === 'textarea').props.value, 'Keep my draft');
  h.dispose();
  assert.equal(sockets[0].disposed, true);
});

test('inbox paginates all account threads and preserves the exact RFQ callback', async () => {
  const pages = [], rfqs = [];
  const { h, exports: e } = await load('ConversationsView.tsx', {
    list: async ({ page: n }) => { pages.push(n); return page([conversation(String(n + 1))], n); },
    get: async id => conversation(id),
  });
  const props = { myUserId: '1', myCustomerId: '11', selectedId: null, onSelect() {}, onOpenRfq: id => rfqs.push(id), compact: true };
  const inbox = e.default(props);
  const render = () => h.render(inbox.type, props);
  render(); await tick(); let tree = render(); await tick(); tree = render();
  assert.ok(find(tree, n => n.type === 'span' && n.props.children === 'Partner store'));
  byName(tree, 'Pager').props.onChange(1);
  render(); await tick(); tree = render();
  assert.deepEqual(pages, [0, 1]);
  props.selectedId = '99'; render(); await tick(); tree = render();
  assert.equal(byName(tree, 'ChatPanel').props.conversationId, '99');
  const link = find(tree, n => n.type === 'button' && nodes(n).some(child => child.type?.displayName === 'ExternalLink'))
    ?? nodes(tree).filter(n => n.type === 'button').at(-1);
  link.props.onClick();
  assert.deepEqual(rfqs, ['rfq-99']);
  const otherAccount = e.default({ ...props, myUserId: '2' });
  assert.notEqual(inbox.key, otherAccount.key);
  h.dispose();
});

test('out-of-order selection responses cannot reopen an old thread; inaccessible threads expose retry/back', async () => {
  const first = deferred(), second = deferred();
  let calls = 0;
  const { h, exports: e } = await load('ConversationsView.tsx', { get: () => (++calls === 1 ? first.promise : second.promise) });
  const selected = [];
  const props = { myUserId: '1', myCustomerId: '11', selectedId: '1', onSelect: id => selected.push(id), compact: true };
  const inbox = e.default(props);
  const render = () => h.render(inbox.type, props);
  render();
  props.selectedId = '2';
  assert.equal(byName(render(), 'ChatPanel'), undefined);
  first.resolve(conversation('1')); await tick();
  assert.equal(byName(render(), 'ChatPanel'), undefined);
  second.reject(new Error('Forbidden')); await tick();
  let tree = render();
  assert.equal(byName(tree, 'ErrorBlock').props.message, 'Forbidden');
  assert.equal(byName(tree, 'ChatPanel'), undefined);
  find(tree, n => n.type === 'button' && n.props.children === 'Quay lại danh sách hội thoại').props.onClick();
  assert.deepEqual(selected, [null]);
  h.dispose();
});

test('list errors retry independently and stale pagination results are ignored', async () => {
  const stale = deferred(); let calls = 0;
  const { h, exports: e } = await load('ConversationsView.tsx', { list: async () => {
    calls++;
    if (calls === 1) throw new Error('Offline');
    if (calls === 2) return stale.promise;
    return page([conversation('3')]);
  } });
  const props = { myUserId: '1', myCustomerId: '11', selectedId: null, onSelect() {} };
  const inbox = e.default(props);
  const render = () => h.render(inbox.type, props);
  render(); await tick();
  byName(render(), 'ErrorBlock').props.onRetry(); render();
  find(render(), n => n.type === 'button' && n.props.onClick && !n.props['aria-label']).props.onClick();
  render(); await tick();
  stale.resolve(page([conversation('old')])); await tick();
  const tree = render();
  assert.equal(byName(tree, 'ErrorBlock'), undefined);
  assert.ok(find(tree, n => n.type === 'span' && n.props.children === 'Yêu cầu báo giá #rfq-3')
    || find(tree, n => n.type === 'span' && n.props.children === 'Yêu cầu báo giá: rfq-3'));
  assert.equal(find(tree, n => n.type === 'span' && String(n.props.children).includes('rfq-old')), undefined);
  assert.equal(calls, 3);
  h.dispose();
});

test('unread polling drops old-account and out-of-order responses, refreshes on visibility, and stops on logout', async () => {
  const requests = [];
  const { h, exports: e } = await load('useUnreadMessages.ts', { unreadCount: () => { const d = deferred(); requests.push(d); return d.promise; } });
  const render = (enabled = true, account = '1') => h.render(() => e.useUnreadMessages(enabled, account));
  assert.equal(render(), 0);
  window.dispatchEvent(new Event('mooncake:chat-read'));
  requests[1].resolve({ unreadCount: 0 }); await tick();
  requests[0].resolve({ unreadCount: 5 }); await tick();
  assert.equal(render(), 0);
  window.dispatchEvent(new Event('focus'));
  render(true, '2');
  requests[3].resolve({ unreadCount: 2 }); await tick();
  requests[2].resolve({ unreadCount: 9 }); await tick();
  assert.equal(render(true, '2'), 2);
  document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(requests.length, 5);
  assert.equal(render(false, '2'), 0);
  requests[4].resolve({ unreadCount: 20 }); await tick();
  const count = requests.length;
  window.dispatchEvent(new Event('focus'));
  assert.equal(requests.length, count);
  h.dispose();
});

test('live messages survive slow history; thread cleanup cancels reconnect/catchup and older-page writes', async () => {
  const initial = deferred(), catchup = deferred(), older = deferred();
  let calls = 0;
  const { h, exports: e, sockets } = await load('useChatThread.ts', { history: () => [initial, catchup, older][calls++].promise });
  const render = () => h.render(() => e.useChatThread('1'));
  render();
  const socket = sockets[0];
  socket.handlers.onConnected();
  socket.handlers.onMessage({ body: JSON.stringify(message('21')) });
  render();
  initial.resolve({ ...history([message('20')]), hasMore: true });
  catchup.resolve(history([message('21')])); await tick();
  let thread = render();
  assert.deepEqual(thread.messages.map(m => m.messageId), ['20', '21']);
  socket.handlers.onMessage({ body: JSON.stringify({ ...message('22'), conversationId: 'foreign' }) });
  assert.equal(render().messages.length, 2);
  const pendingOlder = thread.loadOlder();
  h.dispose();
  assert.equal(socket.disposed, true);
  socket.handlers.onConnected();
  socket.handlers.onDisconnected();
  socket.handlers.onMessage({ body: JSON.stringify(message('23')) });
  older.resolve(history([message('19')])); await pendingOlder;
  assert.equal(calls, 3);
  assert.equal(h.lateWrites, 0);
});

test('history errors can be retried without losing live messages or reconnecting the socket', async () => {
  let calls = 0;
  const { h, exports: e, sockets } = await load('useChatThread.ts', { history: async () => {
    if (++calls === 1) throw new Error('History offline');
    return history([message('10')]);
  } });
  const render = () => h.render(() => e.useChatThread('1'));
  render(); await tick();
  assert.equal(render().loadError, 'History offline');
  sockets[0].handlers.onMessage({ body: JSON.stringify(message('11')) });
  await render().reload();
  const thread = render();
  assert.equal(thread.loadError, '');
  assert.deepEqual(thread.messages.map(m => m.messageId), ['10', '11']);
  assert.equal(sockets.length, 1);
  h.dispose();
});

test('disposed native STOMP sockets ignore late connection/message frames', async () => {
  class Socket {
    static OPEN = 1;
    readyState = 0; sent = [];
    constructor() { Socket.last = this; }
    send(value) { this.sent.push(value); }
    close() { this.readyState = 3; }
  }
  globalThis.WebSocket = Socket;
  const { exports: e } = await load('stompClient.ts');
  let callbacks = 0;
  const connection = new e.StompConnection('ws://localhost/ws/chat', 'token', {
    onConnected: () => callbacks++, onMessage: () => callbacks++, onDisconnected: () => callbacks++,
  });
  connection.dispose();
  Socket.last.onopen();
  Socket.last.onmessage({ data: 'CONNECTED\n\n\0MESSAGE\n\n{}\0' });
  Socket.last.onclose();
  assert.equal(callbacks, 0);
  assert.deepEqual(Socket.last.sent, []);
});
