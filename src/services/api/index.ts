/**
 * Central API client. Components import from here only.
 *
 * USE_MOCK_API = true  → address/checkout/order requests are served by ./mockBackend.
 * Catalog (categories/products/variants/promotions) already calls the real Gateway via ./catalogApi.
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

// ---------------------------------------------------------------------------
// Catalog & Store (TV2) — real backend through the API Gateway (VITE_API_BASE_URL).
// Pages still on mock data switch to these calls one by one; see catalogTypes.ts for the contract.
// ---------------------------------------------------------------------------
export {
  catalogApi, storeApi, storeBranchApi, categoryApi, productApi, variantApi, promotionApi
} from './catalogApi';
export { ApiError, getAccessToken, setAccessToken } from './http';
export type * from './catalogTypes';
