/**
 * Central API client. Components import from here only.
 *
 * Catalog, Identity and Commerce requests go through the API Gateway.
 */
export { addressApi, cartApi, checkoutApi, orderApi, sellerOrderApi } from './commerceApi';
export type { CheckoutPlaced, SellerOrderSummary } from './commerceApi';

// ---------------------------------------------------------------------------
// Catalog & Store (TV2) — real backend through the API Gateway (VITE_API_BASE_URL).
// Pages still on mock data switch to these calls one by one; see catalogTypes.ts for the contract.
// ---------------------------------------------------------------------------
export {
  catalogApi, storeApi, storeBranchApi, categoryApi, productApi, variantApi, promotionApi
} from './catalogApi';
export {
  isApiId, toStore, toStoreBranch, toCategoryOption, toProduct, withProductDetail, toPromotion
} from './catalogMappers';
export type { CategoryOption } from './catalogMappers';
// ---------------------------------------------------------------------------
// Identity (TV1) — register/login, current user, supplier onboarding, admin review.
// ---------------------------------------------------------------------------
export { authApi, userApi, supplierProfileApi, adminSupplierApi } from './identityApi';
export type * from './identityTypes';

export {
  ApiError, getAccessToken, setAccessToken, readTokenPayload, isTokenExpired, UNAUTHORIZED_EVENT
} from './http';
export type * from './catalogTypes';
