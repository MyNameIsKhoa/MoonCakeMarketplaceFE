/**
 * HTTP client duy nhất gọi API Gateway. Base URL lấy từ VITE_API_BASE_URL (mặc định http://localhost:8080).
 * Lỗi được chuẩn hóa thành ApiError cho cả Problem Details (RFQ: detail/code/errors)
 * lẫn ErrorResponse (Identity: message/validationErrors).
 */
import { clearSession, getAccessToken } from './session';

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fieldErrors: Record<string, string> = {}
  ) {
    super(message);
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  contentType?: string;
  idempotencyKey?: string;
  signal?: AbortSignal;
}

const STATUS_MESSAGES: Record<number, string> = {
  401: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  403: 'Bạn không có quyền thực hiện thao tác này.',
  404: 'Không tìm thấy dữ liệu yêu cầu.',
  409: 'Dữ liệu đã thay đổi hoặc không còn hợp lệ. Hãy tải lại rồi thử lại.',
  503: 'Dịch vụ tạm thời gián đoạn. Vui lòng thử lại sau ít phút.'
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;
  if (options.body !== undefined) headers['Content-Type'] = options.contentType ?? 'application/json';

  let response: Response;
  try {
    response = await fetch(API_BASE_URL + path, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal
    });
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error;
    throw new ApiError(0, 'NETWORK_ERROR', 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.');
  }

  const text = await response.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }
  if (!response.ok) {
    if (response.status === 401 && token) clearSession();
    throw new ApiError(
      response.status,
      data?.code ?? `HTTP_${response.status}`,
      data?.detail ?? data?.message ?? STATUS_MESSAGES[response.status] ?? 'Có lỗi xảy ra. Vui lòng thử lại.',
      data?.errors ?? data?.validationErrors ?? {}
    );
  }
  return data as T;
}

export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Có lỗi xảy ra. Vui lòng thử lại.';
}
