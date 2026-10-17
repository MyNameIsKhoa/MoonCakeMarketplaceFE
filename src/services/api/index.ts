/**
 * Central API client. Components import from here only.
 *
 * USE_MOCK_API = true  → requests are served by ./mockBackend (no real backend yet).
 * When the API Gateway is available, implement the same functions with HTTP calls
 * against the Commerce/Identity endpoints confirmed in the backend OpenAPI spec,
 * and flip the flag. TODO(backend): confirm routes, JSON field names, status codes.
 */
import * as mock from './mockBackend';

export const USE_MOCK_API = true;

export const addressApi = {
  list: mock.listAddresses,
  create: mock.createAddress,
  setDefault: mock.setDefaultAddress
};

export const checkoutApi = {
  preview: mock.previewCheckout,
  placeOrder: mock.placeOrder
};

export const orderApi = {
  list: mock.listOrders,
  requestCancellation: mock.requestCancellation,
  pay: mock.payObligation
};

export type { PlaceOrderInput } from './mockBackend';
