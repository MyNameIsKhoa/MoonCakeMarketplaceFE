/**
 * Identity Service through the API Gateway. Components import from `services/api/index.ts`, not from this file.
 */
import { cleanParams, http } from './http';
import type {
  AuthResponse, GoogleLoginRequest, LoginRequest, PasswordResetRequest, RegisterRequest, ReviewSupplierRequest,
  SpringPage, SupplierProfileDraft,
  SupplierProfileRequest, SupplierProfileResponse, SupplierReviewQuery, SupplierVerificationAuditResponse,
  UpdateProfileRequest, UserProfileResponse, UserSummaryResponse
} from './identityTypes';

export const authApi = {
  /** 201; 409 when the email is already registered. Does not log in. */
  register: async (body: RegisterRequest) =>
    (await http.post<UserSummaryResponse>('/api/auth/register', body)).data,
  /** 401 wrong email/password, 403 account not ACTIVE. */
  login: async (body: LoginRequest) =>
    (await http.post<AuthResponse>('/api/auth/login', body)).data,
  /** Creates a verified customer account on first use. 401 invalid Google token, 403 account not ACTIVE. */
  loginWithGoogle: async (body: GoogleLoginRequest) =>
    (await http.post<AuthResponse>('/api/auth/google', body)).data,
  verifyEmail: async (token: string) =>
    http.post('/api/auth/email/verify', { token }),
  requestEmailVerification: async (email: string) =>
    http.post('/api/auth/email/verification-requests', { email }),
  /** 202 whether or not the account exists (no enumeration); Identity sends at most one email per minute. */
  requestPasswordReset: async (email: string) =>
    http.post('/api/auth/password-reset-requests', { email }),
  /** 204; 401 when the token is invalid, expired or already used. */
  resetPassword: async (body: PasswordResetRequest) =>
    http.post('/api/auth/password-resets', body)
};

export const userApi = {
  me: async () => (await http.get<UserProfileResponse>('/api/users/me')).data,
  updateMe: async (body: UpdateProfileRequest) =>
    (await http.patch<UserProfileResponse>('/api/users/me', body)).data
};

export interface PayoutAccount {
  ownerKind: 'CUSTOMER' | 'SUPPLIER'; bankBin: string; bankName: string;
  accountNumber: string; accountHolder: string; updatedAt: string;
}

export const payoutAccountApi = {
  banks: async () => (await http.get<{ bin: string; name: string }[]>('/api/users/me/payout-accounts/banks')).data,
  mine: async (kind: PayoutAccount['ownerKind']) =>
    (await http.get<PayoutAccount>(`/api/users/me/payout-accounts/${kind}`)).data,
  save: async (kind: PayoutAccount['ownerKind'], body: Pick<PayoutAccount, 'bankBin' | 'accountNumber' | 'accountHolder'>) =>
    (await http.put<PayoutAccount>(`/api/users/me/payout-accounts/${kind}`, body)).data,
};

export const supplierProfileApi = {
  /** 404 when the user has not applied as a supplier. */
  get: async () => (await http.get<SupplierProfileResponse>('/api/supplier-profile')).data,
  create: async (body: SupplierProfileRequest) =>
    (await http.post<SupplierProfileResponse>('/api/supplier-profile', body)).data,
  /** On a REJECTED profile this is the "resubmit" action: it goes back to PENDING even when nothing changed. */
  update: async (body: Partial<SupplierProfileRequest>) =>
    (await http.patch<SupplierProfileResponse>('/api/supplier-profile', body)).data
};

const SUPPLIER_DRAFT_KEY = 'mooncake.supplierDraft';

/**
 * Local (browser-only) draft of the supplier fields typed at registration; see SupplierProfileDraft.
 * Storage can be unavailable (private mode / blocked): `save` then returns false so the caller can tell the user.
 */
export const supplierDraftStorage = {
  save: (draft: SupplierProfileDraft): boolean => {
    try {
      globalThis.localStorage.setItem(SUPPLIER_DRAFT_KEY, JSON.stringify({ ...draft, email: draft.email.trim().toLowerCase() }));
      return true;
    } catch {
      return false;
    }
  },
  /** The draft saved for this account, or null (none, unreadable, or saved by another account). */
  load: (email: string): SupplierProfileDraft | null => {
    try {
      const raw = globalThis.localStorage.getItem(SUPPLIER_DRAFT_KEY);
      const draft = raw ? (JSON.parse(raw) as Partial<SupplierProfileDraft>) : null;
      if (!draft || draft.email !== email.trim().toLowerCase() || !draft.companyName || !draft.taxCode) return null;
      return { email: draft.email, companyName: draft.companyName, taxCode: draft.taxCode, autoSubmit: draft.autoSubmit !== false };
    } catch {
      return null;
    }
  },
  clear: (): void => {
    try {
      globalThis.localStorage.removeItem(SUPPLIER_DRAFT_KEY);
    } catch {
      // Nothing to clear when storage is unavailable.
    }
  }
};

/** ROLE_ADMIN only (Gateway rejects everyone else with 403). */
export const adminSupplierApi = {
  list: async (query: SupplierReviewQuery = {}) =>
    (await http.get<SpringPage<SupplierProfileResponse>>('/api/suppliers', { params: cleanParams(query) })).data,
  review: async (supplierId: number, body: ReviewSupplierRequest) =>
    (await http.post<SupplierProfileResponse>(`/api/suppliers/${supplierId}/verification`, body)).data,
  history: async (supplierId: number) =>
    (await http.get<SupplierVerificationAuditResponse[]>(`/api/suppliers/${supplierId}/verification-history`)).data
};
