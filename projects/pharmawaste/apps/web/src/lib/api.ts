const isServer = typeof window === 'undefined';

export const API_PUBLIC_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333/api/v1/inventory';

export const API_BASE_URL = isServer
  ? process.env.INTERNAL_API_URL || API_PUBLIC_URL
  : API_PUBLIC_URL;

export const API_ORIGIN = API_PUBLIC_URL.replace(
  /\/api\/v1\/inventory\/?$/,
  '',
);

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body' | 'method'> {
  body?: unknown;
}

async function request<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, headers: customHeaders, ...rest } = options;
  const isFormData =
    typeof FormData !== 'undefined' && body instanceof FormData;

  const headers = new Headers(customHeaders);
  if (!isFormData && body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const res = await fetch(`${API_BASE_URL}${normalizedPath}`, {
    method,
    credentials: 'include',
    cache: 'no-store',
    ...rest,
    headers,
    body:
      body === undefined
        ? undefined
        : isFormData
          ? (body as FormData)
          : JSON.stringify(body),
  });

  const isJson = res.headers
    .get('content-type')
    ?.includes('application/json');
  const payload = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const rawMsg = (payload as { message?: string | string[] } | null)?.message;
    const message = Array.isArray(rawMsg)
      ? rawMsg.join(', ')
      : typeof rawMsg === 'string' && rawMsg.trim()
        ? rawMsg
        : `Erro na API (${res.status})`;
    throw new ApiError(message, res.status, payload);
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>('GET', path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('POST', path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PATCH', path, { ...options, body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>('DELETE', path, options),
};

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}
