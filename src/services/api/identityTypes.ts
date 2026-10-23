/**
 * Identity Service contract (routes /api/auth, /api/users, /api/supplier-profile, /api/suppliers via the Gateway).
 * Field names match the backend DTOs exactly.
 */

/** JWT `roles` claim. Every account is ROLE_CUSTOMER; ADMIN_USER_IDS adds ROLE_ADMIN.
 *  There is no ROLE_SUPPLIER: a supplier is a user whose supplier profile is VERIFIED. */
export type JwtRole = 'ROLE_CUSTOMER' | 'ROLE_ADMIN';

export type SupplierVerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';

export interface RegisterRequest {
  /** Required, max 255. */
  fullName: string;
  email: string;
  /** 6–100 chars. */
  password: string;
  /** Max 30. */
  phone?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserSummaryResponse {
  userId: number;
  customerId: number | null;
  fullName: string | null;
  email: string;
  phone: string | null;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  /** Seconds. */
  expiresIn: number;
  user: UserSummaryResponse;
}

export interface UserProfileResponse {
  userId: number;
  customerId: number | null;
  email: string;
  fullName: string | null;
  phone: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

/** Omitted fields keep their current value. */
export interface UpdateProfileRequest {
  fullName?: string;
  phone?: string;
}

export interface SupplierProfileResponse {
  supplierId: number;
  userId: number;
  companyName: string;
  taxCode: string;
  verificationStatus: SupplierVerificationStatus;
  createdAt: string;
  updatedAt: string;
}

/** Creating starts at PENDING; editing a REJECTED or VERIFIED profile sends it back to PENDING. */
export interface SupplierProfileRequest {
  companyName: string;
  taxCode: string;
}

/** Allowed: PENDING → VERIFIED/REJECTED, VERIFIED → SUSPENDED, SUSPENDED → VERIFIED. */
export interface ReviewSupplierRequest {
  decision: Exclude<SupplierVerificationStatus, 'PENDING'>;
  /** Required, max 1000. */
  reason: string;
}

export interface SupplierVerificationAuditResponse {
  [field: string]: unknown;
}

/** Spring Data `Page` as serialised by Identity (not the Catalog PageResponse). */
export interface SpringPage<T> {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface SupplierReviewQuery {
  verificationStatus?: SupplierVerificationStatus;
  page?: number;
  size?: number;
}
