import { ApiError, apiRequest } from '../../services/api/http';
import { setSession } from '../../services/api/session';
import type {
  BuyerAddress,
  CreateRfqInput,
  PageResult,
  Quotation,
  QuotationAccepted,
  QuotationStatus,
  QuotationSummary,
  QuotationTermsInput,
  Rfq,
  RfqStatus,
  StoreInfo,
  SupplierProfile
} from './types';

function query(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value));
  });
  const text = search.toString();
  return text ? `?${text}` : '';
}

export const rfqApi = {
  list: (params: { q?: string; mine?: boolean; status?: RfqStatus; page?: number }) =>
    apiRequest<PageResult<Rfq>>(`/api/rfqs${query({ ...params, size: 10, sort: 'createdAt,desc' })}`),
  get: (rfqId: string) => apiRequest<Rfq>(`/api/rfqs/${rfqId}`),
  create: (input: CreateRfqInput) => apiRequest<Rfq>('/api/rfqs', { method: 'POST', body: input }),
  close: (rfqId: string) => apiRequest<Rfq>(`/api/rfqs/${rfqId}/close`, { method: 'POST' }),
  cancel: (rfqId: string) => apiRequest<Rfq>(`/api/rfqs/${rfqId}/cancel`, { method: 'POST' })
};

export const quotationApi = {
  listForRfq: (rfqId: string) =>
    apiRequest<PageResult<QuotationSummary>>(`/api/rfqs/${rfqId}/quotations${query({ size: 100, sort: 'submittedAt,desc' })}`),
  listMine: (params: { status?: QuotationStatus; page?: number }) =>
    apiRequest<PageResult<QuotationSummary>>(`/api/quotations${query({ mine: true, ...params, size: 10, sort: 'submittedAt,desc' })}`),
  get: (quotationId: string) => apiRequest<Quotation>(`/api/quotations/${quotationId}`),
  create: (rfqId: string, input: QuotationTermsInput & { storeId: string }, idempotencyKey: string) =>
    apiRequest<Quotation>(`/api/rfqs/${rfqId}/quotations`, { method: 'POST', body: input, idempotencyKey }),
  revise: (quotationId: string, input: QuotationTermsInput & { expectedVersion: number }, idempotencyKey: string) =>
    apiRequest<Quotation>(`/api/quotations/${quotationId}/revisions`, { method: 'POST', body: input, idempotencyKey }),
  reject: (quotationId: string, reason?: string) =>
    apiRequest<Quotation>(`/api/quotations/${quotationId}/reject`, { method: 'POST', body: { reason: reason || undefined } }),
  withdraw: (quotationId: string, reason?: string) =>
    apiRequest<Quotation>(`/api/quotations/${quotationId}/cancel`, { method: 'POST', body: { reason: reason || undefined } }),
  /** 200 when the order exists, 202 while Commerce is still confirming (conversionStatus=PENDING). */
  accept: (quotationId: string, input: { quotationVersion: number; addressId: string }, idempotencyKey: string) =>
    apiRequest<QuotationAccepted>(`/api/quotations/${quotationId}/accept`, { method: 'POST', body: input, idempotencyKey }),
  orderLink: (quotationId: string) => apiRequest<QuotationAccepted>(`/api/quotations/${quotationId}/order`)
};

// Read-only lookups owned by TV1 (Identity/Store); TV4 screens only consume them.
const storeCache = new Map<string, Promise<StoreInfo | null>>();
const supplierStoreCache = new Map<string, Promise<StoreInfo | null>>();

export const lookupApi = {
  myAddresses: () => apiRequest<BuyerAddress[]>('/api/addresses'),
  createAddress: (input: Omit<BuyerAddress, 'addressId'>) =>
    apiRequest<BuyerAddress>('/api/addresses', { method: 'POST', body: input }),
  mySupplierProfile: () =>
    apiRequest<SupplierProfile>('/api/supplier-profile').catch((error) => {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }),
  myStores: () => apiRequest<StoreInfo[]>('/api/stores?mine=true'),
  store: (storeId: string) => {
    if (!storeCache.has(storeId)) {
      storeCache.set(storeId, apiRequest<StoreInfo>(`/api/stores/${storeId}`).catch(() => null));
    }
    return storeCache.get(storeId)!;
  },
  /** First store of a supplier, used as a readable name in chat. */
  supplierStore: (supplierId: string) => {
    if (!supplierStoreCache.has(supplierId)) {
      supplierStoreCache.set(
        supplierId,
        apiRequest<StoreInfo[]>(`/api/stores?supplierId=${supplierId}`)
          .then((stores) => stores.find((s) => s.status === 'ACTIVE') ?? stores[0] ?? null)
          .catch(() => null)
      );
    }
    return supplierStoreCache.get(supplierId)!;
  }
};

interface LoginResponse {
  accessToken: string;
  expiresIn: number;
  user: { userId: number; customerId: number | null; fullName: string; email: string };
}

export async function signIn(email: string, password: string) {
  const result = await apiRequest<LoginResponse>('/api/auth/login', { method: 'POST', body: { email, password } });
  setSession({
    accessToken: result.accessToken,
    expiresAt: Date.now() + result.expiresIn * 1000,
    user: {
      userId: String(result.user.userId),
      customerId: result.user.customerId == null ? null : String(result.user.customerId),
      fullName: result.user.fullName,
      email: result.user.email
    }
  });
}

/** Reuses the same Idempotency-Key while the payload is unchanged so a retry never creates a duplicate. */
export function idempotencyKeyFor(slot: { payload?: string; key?: string }, payload: unknown): string {
  const serialized = JSON.stringify(payload);
  if (slot.payload !== serialized || !slot.key) {
    slot.payload = serialized;
    slot.key = crypto.randomUUID();
  }
  return slot.key;
}
