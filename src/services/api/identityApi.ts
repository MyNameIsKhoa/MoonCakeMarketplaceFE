/**
 * Identity Service through the API Gateway. Components import from `services/api/index.ts`, not from this file.
 */
import { cleanParams, http } from './http';
import type {
  AuthResponse, LoginRequest, RegisterRequest, ReviewSupplierRequest, SpringPage,
  SupplierProfileRequest, SupplierProfileResponse, SupplierReviewQuery, SupplierVerificationAuditResponse,
  UpdateProfileRequest, UserProfileResponse, UserSummaryResponse
} from './identityTypes';

export const authApi = {
  /** 201; 409 when the email is already registered. Does not log in. */
  register: async (body: RegisterRequest) =>
    (await http.post<UserSummaryResponse>('/api/auth/register', body)).data,
  /** 401 wrong email/password, 403 account not ACTIVE. */
  login: async (body: LoginRequest) =>
    (await http.post<AuthResponse>('/api/auth/login', body)).data
};

export const userApi = {
  me: async () => (await http.get<UserProfileResponse>('/api/users/me')).data,
  updateMe: async (body: UpdateProfileRequest) =>
    (await http.patch<UserProfileResponse>('/api/users/me', body)).data
};

export const supplierProfileApi = {
  /** 404 when the user has not applied as a supplier. */
  get: async () => (await http.get<SupplierProfileResponse>('/api/supplier-profile')).data,
  create: async (body: SupplierProfileRequest) =>
    (await http.post<SupplierProfileResponse>('/api/supplier-profile', body)).data,
  update: async (body: Partial<SupplierProfileRequest>) =>
    (await http.patch<SupplierProfileResponse>('/api/supplier-profile', body)).data
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
