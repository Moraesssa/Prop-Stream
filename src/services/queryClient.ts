import type { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

import { setOfflineFallback } from './apiClient';
import authService from './auth';

export type QueryKey = string | readonly unknown[];

type QueryStatus = 'idle' | 'loading' | 'success' | 'error';

type Listener<T> = (result: QueryResult<T>) => void;

type FallbackHandler<T> = () => T | Promise<T>;

export interface QueryClientConfig {
  retry?: number;
  retryDelay?: number;
  staleTime?: number;
}

export interface AuthenticatedQueryOptions<TData> {
  queryKey: QueryKey;
  queryFn: () => Promise<TData>;
  enabled?: boolean;
  retry?: number;
  retryDelay?: number;
  staleTime?: number;
  onSuccess?: (data: TData) => void;
  onError?: (error: unknown) => void;
  fallback?: FallbackHandler<TData>;
  offlineKey?: string;
  authRequired?: boolean;
}

export interface MutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  retry?: number;
  retryDelay?: number;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: unknown, variables: TVariables) => void;
  offlineFallback?: (variables: TVariables) => TData | Promise<TData>;
}

export interface QueryResult<TData> {
  data?: TData;
  error?: unknown;
  status: QueryStatus;
  isFetching: boolean;
  updatedAt?: number;
  refetch: () => Promise<QueryResult<TData>>;
  subscribe: (listener: Listener<TData>) => () => void;
}

export interface MutationResult<TData, TVariables> {
  data?: TData;
  error?: unknown;
  status: 'idle' | 'loading' | 'success' | 'error';
  isPending: boolean;
  mutate: (variables: TVariables) => void;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  reset: () => void;
}

interface QueryState<TData> {
  key: string;
  data?: TData;
  error?: unknown;
  status: QueryStatus;
  isFetching: boolean;
  updatedAt?: number;
  listeners: Set<Listener<TData>>;
  options: AuthenticatedQueryOptions<TData>;
}

class QueryClient {
  private cache = new Map<string, QueryState<any>>();

  private offlineFallbacks = new Map<string, FallbackHandler<unknown>>();

  constructor(private readonly config: QueryClientConfig = {}) {}

  watchQuery<TData>(options: AuthenticatedQueryOptions<TData>): QueryResult<TData> {
    const key = serializeKey(options.queryKey);
    const state = this.ensureState<TData>(key, options);

    if (options.offlineKey && options.fallback) {
      this.registerOfflineFallback(options.offlineKey, options.fallback);
    }

    void this.maybeFetch(state, options);
    return this.toResult(state);
  }

  async refetch<TData>(options: AuthenticatedQueryOptions<TData>): Promise<QueryResult<TData>> {
    const key = serializeKey(options.queryKey);
    const state = this.ensureState<TData>(key, options);
    await this.fetch(state, options);
    return this.toResult(state);
  }

  registerOfflineFallback<TData>(key: string, handler: FallbackHandler<TData>): void {
    this.offlineFallbacks.set(key, handler as FallbackHandler<unknown>);
  }

  clearQuery(key: QueryKey): void {
    const serialized = serializeKey(key);
    this.cache.delete(serialized);
  }

  getOfflineHandler() {
    return {
      shouldFallback: (error: AxiosError) => {
        if (!isOnline()) {
          return true;
        }
        const url = error.config?.url;
        return Boolean(url && this.offlineFallbacks.has(url));
      },
      handle: async <T>(error: AxiosError, request: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
        const url = request.url ?? '';
        const handler = this.offlineFallbacks.get(url);
        if (!handler) {
          throw error;
        }
        const data = (await handler()) as T;
        return {
          data,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: request,
          request: null
        };
      }
    };
  }

  private ensureState<TData>(key: string, options: AuthenticatedQueryOptions<TData>): QueryState<TData> {
    if (!this.cache.has(key)) {
      this.cache.set(key, {
        key,
        status: 'idle',
        isFetching: false,
        listeners: new Set(),
        options
      });
    }

    const state = this.cache.get(key) as QueryState<TData>;
    state.options = { ...(state.options as AuthenticatedQueryOptions<TData>), ...options };
    return state;
  }

  private async maybeFetch<TData>(state: QueryState<TData>, options: AuthenticatedQueryOptions<TData>): Promise<void> {
    if (options.enabled === false) {
      return;
    }

    if (options.authRequired !== false && !authService.getAccessToken()) {
      return;
    }

    if (state.status === 'success' && !this.isStale(state, options)) {
      return;
    }

    await this.fetch(state, options);
  }

  private async fetch<TData>(state: QueryState<TData>, options: AuthenticatedQueryOptions<TData>): Promise<void> {
    const retryLimit = options.retry ?? this.config.retry ?? 2;
    const retryDelay = options.retryDelay ?? this.config.retryDelay ?? 1000;
    let attempt = 0;

    state.status = state.status === 'idle' ? 'loading' : state.status;
    state.isFetching = true;
    this.notify(state);

    while (attempt <= retryLimit) {
      try {
        const data = await options.queryFn();
        state.data = data;
        state.error = undefined;
        state.status = 'success';
        state.isFetching = false;
        state.updatedAt = Date.now();
        this.notify(state);
        options.onSuccess?.(data);
        return;
      } catch (error) {
        attempt += 1;
        if (attempt > retryLimit) {
          const fallback = options.fallback;
          if (fallback && !isOnline()) {
            const data = await fallback();
            state.data = data;
            state.error = undefined;
            state.status = 'success';
            state.isFetching = false;
            state.updatedAt = Date.now();
            this.notify(state);
            return;
          }

          state.error = error;
          state.status = 'error';
          state.isFetching = false;
          this.notify(state);
          options.onError?.(error);
          return;
        }

        await delay(retryDelay * attempt);
      }
    }
  }

  private isStale<TData>(state: QueryState<TData>, options: AuthenticatedQueryOptions<TData>): boolean {
    if (!state.updatedAt) {
      return true;
    }
    const staleTime = options.staleTime ?? this.config.staleTime ?? 30_000;
    return Date.now() - state.updatedAt > staleTime;
  }

  private notify<TData>(state: QueryState<TData>): void {
    const result = this.toResult(state);
    state.listeners.forEach((listener) => listener(result));
  }

  private toResult<TData>(state: QueryState<TData>): QueryResult<TData> {
    const refetch = async () => {
      await this.fetch(state, state.options);
      return this.toResult(state);
    };

    return {
      data: state.data,
      error: state.error,
      status: state.status,
      isFetching: state.isFetching,
      updatedAt: state.updatedAt,
      refetch,
      subscribe: (listener: Listener<TData>) => {
        state.listeners.add(listener);
        listener(this.toResult(state));
        return () => {
          state.listeners.delete(listener);
        };
      }
    };
  }
}

class MutationObserver<TData, TVariables> {
  private state: MutationResult<TData, TVariables>;

  constructor(private readonly options: MutationOptions<TData, TVariables>, private readonly clientConfig: QueryClientConfig) {
    this.state = {
      data: undefined,
      error: undefined,
      status: 'idle',
      isPending: false,
      mutate: (variables: TVariables) => {
        void this.execute(variables);
      },
      mutateAsync: (variables: TVariables) => this.execute(variables),
      reset: () => {
        this.state = {
          ...this.state,
          data: undefined,
          error: undefined,
          status: 'idle',
          isPending: false
        };
      }
    };
  }

  getResult(): MutationResult<TData, TVariables> {
    return this.state;
  }

  private async execute(variables: TVariables): Promise<TData> {
    const retryLimit = this.options.retry ?? this.clientConfig.retry ?? 0;
    const retryDelay = this.options.retryDelay ?? this.clientConfig.retryDelay ?? 1000;
    let attempt = 0;

    this.state.status = 'loading';
    this.state.isPending = true;

    while (attempt <= retryLimit) {
      try {
        const data = await this.options.mutationFn(variables);
        this.state.data = data;
        this.state.error = undefined;
        this.state.status = 'success';
        this.state.isPending = false;
        this.options.onSuccess?.(data, variables);
        return data;
      } catch (error) {
        attempt += 1;
        if (attempt > retryLimit) {
          if (this.options.offlineFallback && !isOnline()) {
            const data = await this.options.offlineFallback(variables);
            this.state.data = data;
            this.state.error = undefined;
            this.state.status = 'success';
            this.state.isPending = false;
            this.options.onSuccess?.(data, variables);
            return data;
          }

          this.state.error = error;
          this.state.status = 'error';
          this.state.isPending = false;
          this.options.onError?.(error, variables);
          throw error;
        }
        await delay(retryDelay * attempt);
      }
    }

    throw new Error('Mutation failed');
  }
}

function serializeKey(key: QueryKey): string {
  if (Array.isArray(key)) {
    return JSON.stringify(key);
  }
  return String(key);
}

function isOnline(): boolean {
  if (typeof navigator === 'undefined') {
    return true;
  }
  return navigator.onLine !== false;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const queryClientInstance = new QueryClient({ retry: 2, retryDelay: 500, staleTime: 60_000 });

setOfflineFallback(queryClientInstance.getOfflineHandler());

export function useAuthenticatedQuery<TData>(options: AuthenticatedQueryOptions<TData>): QueryResult<TData> {
  return queryClientInstance.watchQuery(options);
}

export function useCommandMutation<TData, TVariables>(options: MutationOptions<TData, TVariables>): MutationResult<TData, TVariables> {
  const observer = new MutationObserver(options, { retry: 1, retryDelay: 500 });
  return observer.getResult();
}

export function registerOfflineFallback<TData>(key: string, handler: FallbackHandler<TData>): void {
  queryClientInstance.registerOfflineFallback(key, handler);
}

export { queryClientInstance as queryClient };
