import axios, {
  AxiosError,
  AxiosHeaders,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
} from 'axios';

export type AccessTokenProvider = () =>
  | string
  | null
  | Promise<string | null>;

export type RefreshTokenHandler = (error: AxiosError) => Promise<string | null>;

export type UnauthorizedHandler = (error: HttpClientError) => void;

export type HttpErrorHandler = (error: HttpClientError) => void;

export interface RetryPolicy {
  /** Número máximo de tentativas extras. */
  retries?: number;
  /**
   * Função para calcular o intervalo entre tentativas em milissegundos.
   * Recebe a contagem atual (começando em 1) e o erro original.
   */
  retryDelay?: (retryCount: number, error: AxiosError) => number;
  /**
   * Condição que determina se o erro deve ser reprocessado.
   * Retorne `true` para permitir uma nova tentativa.
   */
  retryCondition?: (error: AxiosError) => boolean;
}

export interface HttpRequestConfig<TData = unknown>
  extends AxiosRequestConfig<TData> {
  /** Ignora a injeção automática do token de autenticação. */
  skipAuth?: boolean;
  /** Política de retry específica para a requisição. */
  retry?: RetryPolicy;
  /** @internal */
  __retryCount?: number;
  /** @internal */
  __isAuthRetry?: boolean;
}

export interface HttpSuccessResponse<TData = unknown> {
  data: TData;
  status: number;
  headers: Record<string, string>;
}

export interface HttpErrorPayload {
  status?: number;
  code?: string;
  message: string;
  details?: unknown;
  isNetworkError: boolean;
  isTimeout: boolean;
  isCanceled: boolean;
}

export class HttpClientError extends Error implements HttpErrorPayload {
  public readonly status?: number;

  public readonly code?: string;

  public readonly details?: unknown;

  public readonly isNetworkError: boolean;

  public readonly isTimeout: boolean;

  public readonly isCanceled: boolean;

  public readonly originalError: unknown;

  constructor(payload: HttpErrorPayload & { originalError: unknown }) {
    super(payload.message);
    this.name = 'HttpClientError';
    this.status = payload.status;
    this.code = payload.code;
    this.details = payload.details;
    this.isNetworkError = payload.isNetworkError;
    this.isTimeout = payload.isTimeout;
    this.isCanceled = payload.isCanceled;
    this.originalError = payload.originalError;
  }
}

const DEFAULT_RETRY_POLICY: Required<RetryPolicy> = {
  retries: 2,
  retryDelay: (retryCount) =>
    Math.min(1000 * Math.pow(2, retryCount - 1), 8000),
  retryCondition: (error) => {
    if (!error || typeof error !== 'object') {
      return false;
    }

    if (axios.isCancel(error)) {
      return false;
    }

    if (!error.response) {
      return true;
    }

    const { status } = error.response;
    return status >= 500 || status === 429;
  },
};

let defaultRetryPolicy: Required<RetryPolicy> = { ...DEFAULT_RETRY_POLICY };

const httpClient: AxiosInstance = axios.create({
  baseURL: import.meta.env?.VITE_API_BASE_URL ?? '/api',
  timeout: 30000,
  withCredentials: true,
});

let accessTokenProvider: AccessTokenProvider = () => null;
let refreshTokenHandler: RefreshTokenHandler | null = null;
let unauthorizedHandler: UnauthorizedHandler | null = null;
let httpErrorHandler: HttpErrorHandler | null = null;
let refreshPromise: Promise<string | null> | null = null;

function resolveAuthorizationHeader(token: string, config: HttpRequestConfig) {
  if (!token) {
    return;
  }

  const headers = config.headers;

  if (headers && typeof (headers as AxiosHeaders).set === 'function') {
    (headers as AxiosHeaders).set('Authorization', `Bearer ${token}`);
    return;
  }

  const plainHeaders =
    headers && typeof headers === 'object'
      ? (headers as Record<string, unknown>)
      : {};

  config.headers = {
    ...plainHeaders,
    Authorization: `Bearer ${token}`,
  };
}

function resolveErrorMessage(error: AxiosError): string {
  const responseData = error.response?.data;

  if (typeof responseData === 'string' && responseData.trim().length > 0) {
    return responseData;
  }

  if (
    responseData &&
    typeof responseData === 'object' &&
    !Array.isArray(responseData)
  ) {
    const dataRecord = responseData as Record<string, unknown>;
    const possibleKeys = ['message', 'error', 'detail', 'title'];
    for (const key of possibleKeys) {
      const value = dataRecord[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value;
      }
    }
  }

  return error.message;
}

function normalizeHeaders(
  headers: AxiosResponse['headers'],
): Record<string, string> {
  const normalized: Record<string, string> = {};

  if (!headers) {
    return normalized;
  }

  if (typeof (headers as AxiosResponse['headers'] & { forEach?: unknown }).forEach === 'function') {
    const axiosHeaders = headers as AxiosResponse['headers'] & {
      forEach: (callback: (value: string, key: string) => void) => void;
    };
    axiosHeaders.forEach((value, key) => {
      normalized[key] = value;
    });
    return normalized;
  }

  Object.entries(headers as Record<string, unknown>).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      normalized[key] = value.join(', ');
      return;
    }

    if (typeof value === 'string') {
      normalized[key] = value;
      return;
    }

    if (value != null) {
      normalized[key] = String(value);
    }
  });

  return normalized;
}

function wait(delay: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, delay);
  });
}

async function applyRetry(
  error: AxiosError,
  config: HttpRequestConfig,
): Promise<boolean> {
  const policy: Required<RetryPolicy> = {
    retries: config.retry?.retries ?? defaultRetryPolicy.retries,
    retryDelay: config.retry?.retryDelay ?? defaultRetryPolicy.retryDelay,
    retryCondition:
      config.retry?.retryCondition ?? defaultRetryPolicy.retryCondition,
  };

  const currentRetryCount = config.__retryCount ?? 0;

  if (currentRetryCount >= policy.retries) {
    return false;
  }

  if (!policy.retryCondition(error)) {
    return false;
  }

  const nextRetryCount = currentRetryCount + 1;
  config.__retryCount = nextRetryCount;
  const delay = Math.max(0, policy.retryDelay(nextRetryCount, error));
  if (delay > 0) {
    await wait(delay);
  }

  return true;
}

async function applyAuthenticationRetry(
  error: AxiosError,
  config: HttpRequestConfig,
): Promise<boolean> {
  if (config.skipAuth) {
    return false;
  }

  if (config.__isAuthRetry) {
    return false;
  }

  if (error.response?.status !== 401) {
    return false;
  }

  if (!refreshTokenHandler) {
    return false;
  }

  config.__isAuthRetry = true;

  try {
    if (!refreshPromise) {
      refreshPromise = refreshTokenHandler(error).finally(() => {
        refreshPromise = null;
      });
    }

    const newToken = await refreshPromise;

    if (!newToken) {
      return false;
    }

    resolveAuthorizationHeader(newToken, config);
    return true;
  } catch (refreshError) {
    console.warn('Refresh token handler failed', refreshError);
    return false;
  }
}

export function normalizeHttpError(error: unknown): HttpClientError {
  if (error instanceof HttpClientError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    const status = axiosError.response?.status;
    const details = axiosError.response?.data;
    const message = resolveErrorMessage(axiosError);
    const timeoutCodes = new Set([
      AxiosError.ECONNABORTED,
      AxiosError.ETIMEDOUT,
    ]);
    const isTimeout =
      typeof axiosError.code === 'string' && timeoutCodes.has(axiosError.code);
    const isNetworkError =
      !axiosError.response || axiosError.code === AxiosError.ERR_NETWORK;

    return new HttpClientError({
      status,
      code: axiosError.code,
      details,
      message,
      isNetworkError,
      isTimeout,
      isCanceled: axiosError.code === AxiosError.ERR_CANCELED,
      originalError: axiosError,
    });
  }

  const fallbackMessage =
    error instanceof Error ? error.message : 'Erro inesperado na requisição';
  return new HttpClientError({
    message: fallbackMessage,
    status: undefined,
    code: undefined,
    details: undefined,
    isNetworkError: false,
    isTimeout: false,
    isCanceled: false,
    originalError: error,
  });
}

export function toHttpSuccessResponse<TData>(
  response: AxiosResponse<TData>,
): HttpSuccessResponse<TData> {
  return {
    data: response.data,
    status: response.status,
    headers: normalizeHeaders(response.headers),
  };
}

export function setAccessTokenProvider(provider: AccessTokenProvider | null) {
  accessTokenProvider = provider ?? (() => null);
}

export function setRefreshTokenHandler(
  handler: RefreshTokenHandler | null,
) {
  refreshTokenHandler = handler;
}

export function setUnauthorizedHandler(
  handler: UnauthorizedHandler | null,
) {
  unauthorizedHandler = handler;
}

export function setHttpErrorHandler(handler: HttpErrorHandler | null) {
  httpErrorHandler = handler;
}

export function setDefaultRetryPolicy(policy: RetryPolicy) {
  defaultRetryPolicy = {
    retries: policy.retries ?? defaultRetryPolicy.retries,
    retryDelay: policy.retryDelay ?? defaultRetryPolicy.retryDelay,
    retryCondition:
      policy.retryCondition ?? defaultRetryPolicy.retryCondition,
  };
}

httpClient.interceptors.request.use(async (config) => {
  const enrichedConfig = config as HttpRequestConfig & typeof config;

  if (enrichedConfig.skipAuth) {
    return config;
  }

  const token = await Promise.resolve(accessTokenProvider());
  if (token) {
    resolveAuthorizationHeader(token, enrichedConfig);
  }

  return config;
});

httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!axios.isAxiosError(error) || !error.config) {
      const normalized = normalizeHttpError(error);
      httpErrorHandler?.(normalized);
      return Promise.reject(normalized);
    }

    const enrichedConfig = error.config as HttpRequestConfig;

    if (await applyAuthenticationRetry(error, enrichedConfig)) {
      return httpClient(enrichedConfig);
    }

    if (await applyRetry(error, enrichedConfig)) {
      return httpClient(enrichedConfig);
    }

    const normalized = normalizeHttpError(error);

    if (normalized.status === 401) {
      unauthorizedHandler?.(normalized);
    }

    httpErrorHandler?.(normalized);
    return Promise.reject(normalized);
  },
);

export default httpClient;
