/** Shared Gateway transport. TV1 connects its in-memory authenticated session with setAccessToken. */
let accessToken: string | null = null;
export function setAccessToken(token: string | null) { accessToken = token; }

export class ApiError extends Error {
  constructor(public code: string, public status: number) { super(code); }
}

const gateway = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/$/, '');

export async function request<T>(path: string, options: { body?: unknown; key?: string; method?: string } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (options.key) headers['Idempotency-Key'] = options.key;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${gateway}${path}`, {
    method: options.method || 'GET', headers, credentials: 'include',
    signal: AbortSignal.timeout(20000),
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(body.code || `HTTP_${response.status}`, response.status);
  }
  return response.json();
}
