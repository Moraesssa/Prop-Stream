import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse
} from 'axios';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt?: number;
}

export type TokenProvider = () => Promise<string | undefined> | string | undefined;
export type TokenRefreshHandler = () => Promise<AuthTokens | null | undefined>;
export type ErrorLogger = (error: unknown, context: Record<string, unknown>) => void;

export interface RetryPolicy {
  retries: number;
  retryDelay: (attempt: number, error: AxiosError) => number;
  shouldRetry?: (error: AxiosError) => boolean;
}

export interface OfflineFallbackHandler {
  shouldFallback: (error: AxiosError) => boolean;
  handle: <T>(error: AxiosError, request: AxiosRequestConfig) => Promise<AxiosResponse<T>>;
}

export interface ApiClientOptions {
  baseURL?: string;
  timeout?: number;
  retryPolicy?: Partial<RetryPolicy>;
}

type RequestConfigWithMeta = AxiosRequestConfig & {
  __retryCount?: number;
  __isRefreshing?: boolean;
};

const DEFAULT_RETRY_POLICY: RetryPolicy = {
  retries: 2,
  retryDelay: (attempt) => Math.min(1000 * 2 ** (attempt - 1), 10000),
  shouldRetry: (error) => {
    if (error.response) {
      const status = error.response.status;
      if (status >= 500) return true;
      if (status === 429) return true;
      return false;
    }
    return true;
  }
};

const environmentBaseURL =
  typeof globalThis !== 'undefined' && (globalThis as any)?.process?.env?.API_BASE_URL
    ? String((globalThis as any).process.env.API_BASE_URL)
    : undefined;

const defaultOptions: Required<ApiClientOptions> = {
  baseURL: environmentBaseURL ?? 'https://api.prop-stream.local',
  timeout: 15000,
  retryPolicy: DEFAULT_RETRY_POLICY
};

const apiClient: AxiosInstance = axios.create({
  baseURL: defaultOptions.baseURL,
  timeout: defaultOptions.timeout,
  withCredentials: true
});

let currentAccessToken: string | undefined;
let tokenProvider: TokenProvider | null = null;
let refreshHandler: TokenRefreshHandler | null = null;
let errorLogger: ErrorLogger = (error, context) => {
  if (typeof console !== 'undefined') {
    console.error('[apiClient] request failed', context, error);
  }
};
let offlineFallback: OfflineFallbackHandler | null = null;
let retryPolicy: RetryPolicy = DEFAULT_RETRY_POLICY;

let isRefreshing = false;
const refreshQueue: Array<(token?: string, error?: unknown) => void> = [];

function resolveAfter(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getAccessToken(): Promise<string | undefined> {
  if (currentAccessToken) {
    return currentAccessToken;
  }

  if (tokenProvider) {
    try {
      const provided = await tokenProvider();
      currentAccessToken = provided ?? undefined;
      return currentAccessToken;
    } catch (error) {
      errorLogger(error, { scope: 'token-provider' });
    }
  }

  return undefined;
}

function onRefreshed(token?: string, error?: unknown) {
  while (refreshQueue.length) {
    const callback = refreshQueue.shift();
    if (!callback) continue;
    callback(token, error);
  }
}

function shouldRetry(error: AxiosError, config: RequestConfigWithMeta): boolean {
  const attempts = config.__retryCount ?? 0;
  if (attempts >= retryPolicy.retries) {
    return false;
  }

  if (retryPolicy.shouldRetry && !retryPolicy.shouldRetry(error)) {
    return false;
  }

  // Do not retry for authentication failures because they are handled separately.
  if (error.response?.status === 401) {
    return false;
  }

  return true;
}

apiClient.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`
    };
  }
  config.headers = {
    'X-Requested-With': 'XMLHttpRequest',
    ...config.headers
  };
  return config;
});

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const config = (error.config || {}) as RequestConfigWithMeta;

    if (!config || typeof config !== 'object') {
      errorLogger(error, { scope: 'unhandled-error' });
      throw error;
    }

    if (error.response?.status === 401 && !config.__isRefreshing) {
      if (!refreshHandler) {
        errorLogger(error, { scope: 'authentication', message: 'Refresh handler missing' });
        throw error;
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push((token, refreshError) => {
            if (refreshError || !token) {
              reject(refreshError ?? error);
              return;
            }
            config.__isRefreshing = true;
            config.headers = {
              ...config.headers,
              Authorization: `Bearer ${token}`
            };
            resolve(apiClient(config));
          });
        });
      }

      isRefreshing = true;
      config.__isRefreshing = true;

      try {
        const tokens = await refreshHandler();
        if (!tokens?.accessToken) {
          throw error;
        }
        setAuthTokens(tokens);
        onRefreshed(tokens.accessToken);
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${tokens.accessToken}`
        };
        return apiClient(config);
      } catch (refreshError) {
        onRefreshed(undefined, refreshError);
        throw refreshError;
      } finally {
        isRefreshing = false;
      }
    }

    config.__retryCount = (config.__retryCount ?? 0) + 1;
    if (shouldRetry(error, config)) {
      const delay = retryPolicy.retryDelay(config.__retryCount, error);
      await resolveAfter(delay);
      return apiClient(config);
    }

    if (offlineFallback && offlineFallback.shouldFallback(error)) {
      return offlineFallback.handle(error, config);
    }

    errorLogger(error, {
      scope: 'response-error',
      url: config.url,
      method: config.method,
      status: error.response?.status
    });

    throw error;
  }
);

export function setAuthTokens(tokens?: AuthTokens | null): void {
  currentAccessToken = tokens?.accessToken;
}

export function registerTokenProvider(provider: TokenProvider | null): void {
  tokenProvider = provider;
}

export function registerTokenRefreshHandler(handler: TokenRefreshHandler | null): void {
  refreshHandler = handler;
}

export function setErrorLogger(logger: ErrorLogger | null): void {
  errorLogger = logger ?? errorLogger;
}

export function setOfflineFallback(handler: OfflineFallbackHandler | null): void {
  offlineFallback = handler;
}

export function configureApiClient(options: ApiClientOptions): void {
  if (options.baseURL) {
    apiClient.defaults.baseURL = options.baseURL;
  }

  if (options.timeout) {
    apiClient.defaults.timeout = options.timeout;
  }

  if (options.retryPolicy) {
    retryPolicy = {
      ...retryPolicy,
      ...options.retryPolicy
    };
  }
}

export default apiClient;
