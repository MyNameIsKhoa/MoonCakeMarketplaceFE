/**
 * Shared HTTP client for the real backend. Every request goes through the API Gateway
 * (never a service port directly). Components must not import this file; go through
 * `services/api/index.ts`.
 *
 * Base URL: VITE_API_BASE_URL (default http://localhost:8080 — the Gateway).
 * Auth: the access token from Identity login (context/AuthContext) is attached as `Authorization: Bearer ...`.
 * A 401 on an authenticated request clears the token and fires UNAUTHORIZED_EVENT so the app logs out.
 */
import axios, { AxiosError } from 'axios';

const DEFAULT_BASE_URL = 'http://localhost:8080';
const TOKEN_STORAGE_KEY = 'mooncake.accessToken';

// import.meta.env is undefined outside Vite (e.g. scripts run with tsx); fall back to the Gateway default.
const baseURL = (import.meta.env?.VITE_API_BASE_URL as string | undefined) ?? DEFAULT_BASE_URL;

// ---------------------------------------------------------------------------
// Access token (localStorage can throw in private mode / blocked storage)
// ---------------------------------------------------------------------------

let memoryToken: string | null = null;

export function getAccessToken(): string | null {
  if (memoryToken) return memoryToken;
  try {
    return globalThis.localStorage?.getItem(TOKEN_STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

export function setAccessToken(token: string | null): void {
  memoryToken = token;
  try {
    if (token) globalThis.localStorage?.setItem(TOKEN_STORAGE_KEY, token);
    else globalThis.localStorage?.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Storage unavailable: keep the in-memory token for this session only.
  }
}

/** Claims Identity puts in the access token (HS256, signature checked by the backend only). */
export interface AccessTokenPayload {
  userId?: number;
  customerId?: number | null;
  roles?: string[];
  /** Seconds since epoch. */
  exp?: number;
}

/** Decodes the JWT payload without verifying it; null when the token is not a readable JWT. */
export function readTokenPayload(token: string): AccessTokenPayload | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as AccessTokenPayload;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = readTokenPayload(token);
  return !payload || (!!payload.exp && payload.exp * 1000 <= Date.now());
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/**
 * Normalised backend error. Branch on `status`, not on `message` text.
 * Backend bodies: `{status, message}` (business errors) or `{status, errors: {field: msg}}` (validation;
 * Identity names it `validationErrors`).
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: Record<string, string>;

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code ?? `HTTP_${status}`;
    this.fieldErrors = fieldErrors;
    this.code = code || message;
  }
}

const DEFAULT_MESSAGES: Record<number, string> = {
  400: 'Dữ liệu không hợp lệ.',
  401: 'Bạn cần đăng nhập để thực hiện thao tác này.',
  403: 'Bạn không có quyền thực hiện thao tác này.',
  404: 'Không tìm thấy dữ liệu.',
  409: 'Dữ liệu bị trùng hoặc xung đột với trạng thái hiện tại.'
};

interface ErrorBody {
  code?: string;
  message?: string;
  errors?: Record<string, string>;
  validationErrors?: Record<string, string> | null;
}

function toApiError(error: unknown): ApiError {
  if (!(error instanceof AxiosError)) {
    return new ApiError(0, error instanceof Error ? error.message : 'Lỗi không xác định.');
  }
  if (!error.response) {
    return new ApiError(0, 'Không kết nối được máy chủ. Kiểm tra API Gateway đã chạy chưa.');
  }
  const status = error.response.status;
  const body = (error.response.data ?? {}) as ErrorBody;
  const fieldErrors = body.errors ?? body.validationErrors ?? {};
  const message = body.message
    ?? (Object.keys(fieldErrors).length > 0 ? Object.values(fieldErrors).join('; ') : undefined)
    ?? DEFAULT_MESSAGES[status]
    ?? (status >= 500 ? 'Máy chủ gặp lỗi, vui lòng thử lại sau.' : `Yêu cầu thất bại (HTTP ${status}).`);
  return new ApiError(status, message, fieldErrors, body.code);
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export const http = axios.create({
  baseURL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
});

http.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** Fired on window when the backend rejects the stored token (expired/invalid). */
export const UNAUTHORIZED_EVENT = 'mooncake:unauthorized';

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const apiError = toApiError(error);
    const sentToken = error instanceof AxiosError && !!error.config?.headers?.Authorization;
    // The Gateway answers an invalid/expired token with 403, not 401; a 403 with a still-valid
    // token is a real permission error and must not log the user out.
    const token = getAccessToken();
    const sessionGone = apiError.status === 401 || (apiError.status === 403 && (!token || isTokenExpired(token)));
    if (sessionGone && sentToken) {
      setAccessToken(null);
      globalThis.dispatchEvent?.(new Event(UNAUTHORIZED_EVENT));
    }
    return Promise.reject(apiError);
  }
);

/** Query params: drop undefined/null/empty so the backend applies its own defaults. */
export function cleanParams(params: object): Record<string, string | number | boolean> {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
}

/** Legacy fetch-based request helper (used by tv5/payos features). */
export async function request<T>(path: string, options: { body?: unknown; key?: string; method?: string } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.key) headers['Idempotency-Key'] = options.key;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${baseURL}${path}`, {
    method: options.method || 'GET', headers, credentials: 'include',
    signal: AbortSignal.timeout(20000),
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(response.status, body.message || body.code || `HTTP_${response.status}`, {}, body.code);
  }
  return response.json();
}
