import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { renderToStaticMarkup } from 'react-dom/server';
import { http, setAccessToken } from '../../services/api/http';
import { MAX_IMAGE_BYTES, uploadProductImage } from './productImageUpload';
import VariantImageField from './VariantImageField';

test('upload sends the file with authentication, a multipart boundary, product ID and abort signal', async () => {
  const originalBaseUrl = http.defaults.baseURL;
  const signal = new AbortController().signal;
  const response = { url: 'https://api.example/uploads/catalog/test.png', contentType: 'image/png', width: 2, height: 3, size: 10 };
  let received: { url: string | undefined; authorization: string | undefined; contentType: string | undefined; body: string } | undefined;
  const server = createServer(async (request, reply) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    received = { url: request.url, authorization: request.headers.authorization,
      contentType: request.headers['content-type'], body: Buffer.concat(chunks).toString() };
    reply.writeHead(201, { 'Content-Type': 'application/json' }).end(JSON.stringify(response));
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  http.defaults.baseURL = `http://127.0.0.1:${address.port}`;
  setAccessToken('upload-test-token');
  try {
    assert.deepEqual(await uploadProductImage(42, new File(['pixels'], 'cake.png', { type: 'image/png' }), signal), response);
    assert.equal(received?.url, '/api/products/42/images');
    assert.equal(received?.authorization, 'Bearer upload-test-token');
    assert.match(received?.contentType ?? '', /^multipart\/form-data; boundary=.+/);
    assert.match(received?.body ?? '', /name="file"; filename="cake.png"/);
    assert.match(received?.body ?? '', /pixels/);
  } finally {
    http.defaults.baseURL = originalBaseUrl;
    setAccessToken(null);
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('unsaved products and invalid files never send an upload request', async () => {
  const originalAdapter = http.defaults.adapter;
  let requests = 0;
  http.defaults.adapter = async () => { requests++; throw new Error('Unexpected request'); };
  try {
    const png = new File(['pixels'], 'cake.png', { type: 'image/png' });
    await assert.rejects(uploadProductImage(null, png), /Tạo sản phẩm/);
    await assert.rejects(uploadProductImage(-1, png), /Tạo sản phẩm/);
    await assert.rejects(uploadProductImage(42, new File(['<svg/>'], 'cake.svg', { type: 'image/svg+xml' })), /JPEG hoặc PNG/);
    await assert.rejects(uploadProductImage(42, new File([], 'empty.png', { type: 'image/png' })), /5 MiB/);
    await assert.rejects(uploadProductImage(42, new File([new Uint8Array(MAX_IMAGE_BYTES + 1)], 'large.png', { type: 'image/png' })), /5 MiB/);
    assert.equal(requests, 0);
  } finally { http.defaults.adapter = originalAdapter; }
});

test('server upload errors propagate without replacing the existing image URL', async () => {
  const originalAdapter = http.defaults.adapter;
  http.defaults.adapter = async () => { throw new Error('Bạn không có quyền thao tác trên store này.'); };
  try {
    await assert.rejects(uploadProductImage(42, new File(['pixels'], 'cake.png', { type: 'image/png' })), /không có quyền/);
  } finally { http.defaults.adapter = originalAdapter; }
});

test('aborted editor uploads never reach the transport', async () => {
  const originalAdapter = http.defaults.adapter;
  let requests = 0;
  http.defaults.adapter = async () => { requests++; throw new Error('Unexpected request'); };
  const controller = new AbortController();
  controller.abort();
  try {
    await assert.rejects(uploadProductImage(42,
      new File(['pixels'], 'cake.png', { type: 'image/png' }), controller.signal));
    assert.equal(requests, 0);
  } finally { http.defaults.adapter = originalAdapter; }
});

test('variant field keeps URL input, image preview, validation errors and create-first guidance', () => {
  const props = { value: 'https://example.test/cake.png', onChange() {}, onUploadingChange() {} };
  const saved = renderToStaticMarkup(<VariantImageField {...props} productId={42} error="Ảnh không hợp lệ" />);
  assert.match(saved, /type="file"/);
  assert.match(saved, /accept="image\/jpeg,image\/png"/);
  assert.match(saved, /value="https:\/\/example.test\/cake.png"/);
  assert.match(saved, /alt="Xem trước ảnh biến thể"/);
  assert.match(saved, /role="alert"/);
  assert.doesNotMatch(saved, /disabled=""/);
  const unsaved = renderToStaticMarkup(<VariantImageField {...props} productId={null} />);
  assert.match(unsaved, /Tạo sản phẩm trước/);
  assert.match(unsaved, /type="file"[^>]*disabled=""/);
});
