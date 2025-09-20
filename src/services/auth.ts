import httpClient, {
  type HttpClientError,
  normalizeHttpError,
  setAccessTokenProvider,
  setRefreshTokenHandler,
  setUnauthorizedHandler,
} from './httpClient';

import type {
  AuthSession,
  AuthTokens,
  LoginCredentials,
  LoginResponse,
  LogoutResponse,
  RefreshResponse,
} from '@/types/user';

const STORAGE_PREFIX = 'prop-stream:auth';
const TOKEN_STORAGE_KEY = `${STORAGE_PREFIX}:tokens`;
const TOKEN_KEY_STORAGE_KEY = `${STORAGE_PREFIX}:key`;
const ENCRYPTED_PREFIX = 'v2:';
const PLAIN_PREFIX = 'v1:';
const ACCESS_TOKEN_TOLERANCE_MS = 15_000;

const isBrowser = typeof window !== 'undefined';
const textEncoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
const textDecoder = typeof TextDecoder !== 'undefined' ? new TextDecoder() : null;

let inMemoryTokens: AuthTokens | null = null;
let cachedTokensPromise: Promise<AuthTokens | null> | null = null;
let cryptoKeyPromise: Promise<CryptoKey | null> | null = null;

const tokenListeners = new Set<(tokens: AuthTokens | null) => void>();

function notifyTokenListeners(tokens: AuthTokens | null) {
  tokenListeners.forEach((listener) => {
    try {
      listener(tokens);
    } catch (error) {
      console.error('auth: token listener failed', error);
    }
  });
}

function supportsWebCrypto(): boolean {
  const crypto = globalThis.crypto as typeof window.crypto | undefined;
  return Boolean(crypto && typeof crypto.subtle?.importKey === 'function');
}

function getWebCrypto(): (typeof window.crypto) | null {
  const crypto = globalThis.crypto as typeof window.crypto | undefined;
  return crypto && typeof crypto.subtle?.importKey === 'function' ? crypto : null;
}

function safeLocalStorageGet(key: string): string | null {
  if (!isBrowser) {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    console.warn('auth: unable to read from localStorage', error);
    return null;
  }
}

function safeLocalStorageSet(key: string, value: string | null): void {
  if (!isBrowser) {
    return;
  }

  try {
    if (value === null) {
      window.localStorage.removeItem(key);
      return;
    }

    window.localStorage.setItem(key, value);
  } catch (error) {
    console.warn('auth: unable to write to localStorage', error);
  }
}

function safeSessionStorageGet(key: string): string | null {
  if (!isBrowser) {
    return null;
  }

  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSessionStorageSet(key: string, value: string | null): void {
  if (!isBrowser) {
    return;
  }

  try {
    if (value === null) {
      window.sessionStorage.removeItem(key);
      return;
    }

    window.sessionStorage.setItem(key, value);
  } catch {
    // ignore storage quota errors
  }
}

function encodeToBase64(value: ArrayBuffer | Uint8Array): string {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);

  if (typeof globalThis.btoa === 'function') {
    let binary = '';
    const chunkSize = 0x8000;
    for (let index = 0; index < bytes.length; index += chunkSize) {
      const chunk = bytes.subarray(index, index + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    return globalThis.btoa(binary);
  }

  const bufferCtor = (globalThis as { Buffer?: { from: (data: Uint8Array) => { toString(encoding: string): string } } }).Buffer;
  if (bufferCtor) {
    return bufferCtor.from(bytes).toString('base64');
  }

  throw new Error('Base64 encoding is not supported in this environment.');
}

function decodeFromBase64(value: string): Uint8Array {
  if (typeof globalThis.atob === 'function') {
    const binary = globalThis.atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }

  const bufferCtor = (globalThis as { Buffer?: { from: (data: string, encoding: string) => Uint8Array } }).Buffer;
  if (bufferCtor) {
    const buffer = bufferCtor.from(value, 'base64');
    return buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  }

  throw new Error('Base64 decoding is not supported in this environment.');
}

function encodeString(value: string): string {
  if (typeof globalThis.btoa === 'function') {
    return globalThis.btoa(value);
  }

  const bufferCtor = (globalThis as { Buffer?: { from: (data: string, encoding: string) => { toString(encoding: string): string } } }).Buffer;
  if (bufferCtor) {
    return bufferCtor.from(value, 'utf-8').toString('base64');
  }

  return value;
}

function decodeString(value: string): string {
  if (typeof globalThis.atob === 'function') {
    return globalThis.atob(value);
  }

  const bufferCtor = (globalThis as { Buffer?: { from: (data: string, encoding: string) => { toString(encoding: string): string } } }).Buffer;
  if (bufferCtor) {
    return bufferCtor.from(value, 'base64').toString('utf-8');
  }

  return value;
}

async function obtainCryptoKey(): Promise<CryptoKey | null> {
  if (!supportsWebCrypto()) {
    return null;
  }

  if (cryptoKeyPromise) {
    return cryptoKeyPromise;
  }

  const crypto = getWebCrypto();
  if (!crypto) {
    return null;
  }

  cryptoKeyPromise = (async () => {
    const stored = safeSessionStorageGet(TOKEN_KEY_STORAGE_KEY);
    if (stored) {
      try {
        const rawKey = decodeFromBase64(stored);
        return await crypto.subtle.importKey('raw', rawKey, 'AES-GCM', true, [
          'encrypt',
          'decrypt',
        ]);
      } catch (error) {
        console.warn('auth: failed to import stored token key', error);
      }
    }

    try {
      const key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt'],
      );
      try {
        const rawKey = await crypto.subtle.exportKey('raw', key);
        safeSessionStorageSet(TOKEN_KEY_STORAGE_KEY, encodeToBase64(rawKey));
      } catch (error) {
        console.warn('auth: unable to persist crypto key, continuing in-memory only', error);
      }
      return key;
    } catch (error) {
      console.warn('auth: unable to generate crypto key', error);
      return null;
    }
  })()
    .catch((error) => {
      console.warn('auth: crypto key initialization failed', error);
      return null;
    })
    .finally(() => {
      cryptoKeyPromise = null;
    });

  return cryptoKeyPromise;
}

async function encodeTokens(tokens: AuthTokens): Promise<string> {
  const payload = JSON.stringify(tokens);
  const crypto = getWebCrypto();
  const key = await obtainCryptoKey();

  if (!crypto || !key || !textEncoder) {
    return `${PLAIN_PREFIX}${encodeString(payload)}`;
  }

  try {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = textEncoder.encode(payload);
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);

    const storedPayload = JSON.stringify({
      iv: encodeToBase64(iv),
      data: encodeToBase64(encrypted),
    });

    return `${ENCRYPTED_PREFIX}${storedPayload}`;
  } catch (error) {
    console.warn('auth: encryption failed, falling back to base64 storage', error);
    return `${PLAIN_PREFIX}${encodeString(payload)}`;
  }
}

async function decodeTokens(raw: string): Promise<AuthTokens | null> {
  if (!raw) {
    return null;
  }

  if (raw.startsWith(ENCRYPTED_PREFIX)) {
    const payload = raw.slice(ENCRYPTED_PREFIX.length);

    try {
      const parsed = JSON.parse(payload) as { iv: string; data: string };
      const crypto = getWebCrypto();
      const key = await obtainCryptoKey();

      if (!crypto || !key || !textDecoder) {
        const fallback = decodeString(parsed.data);
        return JSON.parse(fallback) as AuthTokens;
      }

      const ivBytes = decodeFromBase64(parsed.iv);
      const dataBytes = decodeFromBase64(parsed.data);
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: ivBytes },
        key,
        dataBytes,
      );
      const text = textDecoder.decode(decrypted);
      return JSON.parse(text) as AuthTokens;
    } catch (error) {
      console.warn('auth: failed to decrypt stored tokens', error);
      return null;
    }
  }

  if (raw.startsWith(PLAIN_PREFIX)) {
    const payload = raw.slice(PLAIN_PREFIX.length);
    try {
      return JSON.parse(decodeString(payload)) as AuthTokens;
    } catch (error) {
      console.warn('auth: failed to decode stored plain tokens', error);
      return null;
    }
  }

  try {
    return JSON.parse(raw) as AuthTokens;
  } catch {
    try {
      return JSON.parse(decodeString(raw)) as AuthTokens;
    } catch {
      return null;
    }
  }
}

function parseTimestamp(value: string | number | undefined): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const asNumber = Number(value);
    if (!Number.isNaN(asNumber)) {
      return asNumber;
    }

    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

function isAccessTokenExpired(tokens: AuthTokens): boolean {
  const expiration = parseTimestamp(tokens.expiresAt);
  if (!expiration) {
    return false;
  }

  return expiration - ACCESS_TOKEN_TOLERANCE_MS <= Date.now();
}

function normalizeTokens(tokens: AuthTokens, previous?: AuthTokens | null): AuthTokens {
  const next: AuthTokens = {
    accessToken: tokens.accessToken ?? previous?.accessToken ?? '',
    refreshToken: tokens.refreshToken ?? previous?.refreshToken ?? '',
    tokenType: tokens.tokenType ?? previous?.tokenType,
    expiresAt: tokens.expiresAt ?? previous?.expiresAt,
    refreshExpiresAt: tokens.refreshExpiresAt ?? previous?.refreshExpiresAt,
  };

  if (!next.accessToken || !next.refreshToken) {
    throw new Error('auth: received invalid token payload');
  }

  return next;
}

async function persistTokens(tokens: AuthTokens | null) {
  inMemoryTokens = tokens;

  if (!tokens) {
    safeLocalStorageSet(TOKEN_STORAGE_KEY, null);
    notifyTokenListeners(null);
    return;
  }

  try {
    const encoded = await encodeTokens(tokens);
    safeLocalStorageSet(TOKEN_STORAGE_KEY, encoded);
  } finally {
    notifyTokenListeners(tokens);
  }
}

async function loadTokens(): Promise<AuthTokens | null> {
  if (inMemoryTokens) {
    return inMemoryTokens;
  }

  if (!isBrowser) {
    return inMemoryTokens;
  }

  if (!cachedTokensPromise) {
    cachedTokensPromise = (async () => {
      const stored = safeLocalStorageGet(TOKEN_STORAGE_KEY);
      if (!stored) {
        inMemoryTokens = null;
        return null;
      }

      const decoded = await decodeTokens(stored);
      inMemoryTokens = decoded;
      return decoded;
    })().finally(() => {
      cachedTokensPromise = null;
    });
  }

  return cachedTokensPromise;
}

export async function getStoredTokens(): Promise<AuthTokens | null> {
  return loadTokens();
}

export async function clearStoredTokens(): Promise<void> {
  await persistTokens(null);
}

async function resolveAccessToken(): Promise<string | null> {
  const tokens = await loadTokens();
  if (!tokens) {
    return null;
  }

  if (isAccessTokenExpired(tokens)) {
    try {
      const refreshed = await refreshTokens();
      return refreshed?.accessToken ?? null;
    } catch (error) {
      console.warn('auth: automatic refresh failed', error);
      await clearStoredTokens();
      return null;
    }
  }

  return tokens.accessToken;
}

export async function login(credentials: LoginCredentials): Promise<AuthSession> {
  try {
    const response = await httpClient.post<LoginResponse>(
      '/auth/login',
      credentials,
      { skipAuth: true },
    );

    const normalizedTokens = normalizeTokens(response.data.tokens);
    await persistTokens(normalizedTokens);

    return {
      profile: response.data.profile,
      permissions: response.data.permissions,
      preferences: response.data.preferences,
      tokens: normalizedTokens,
    };
  } catch (error) {
    throw normalizeHttpError(error);
  }
}

export async function logout(): Promise<void> {
  try {
    await httpClient.post<LogoutResponse>(
      '/auth/logout',
      undefined,
      { skipAuth: true },
    );
  } catch (error) {
    const normalized = normalizeHttpError(error);
    if (!normalized.status || normalized.status < 500) {
      throw normalized;
    }
  } finally {
    await clearStoredTokens();
  }
}

export async function refreshTokens(): Promise<AuthTokens | null> {
  const current = await loadTokens();
  if (!current?.refreshToken) {
    return null;
  }

  try {
    const response = await httpClient.post<RefreshResponse>(
      '/auth/refresh',
      { refreshToken: current.refreshToken },
      { skipAuth: true },
    );

    const normalized = normalizeTokens(response.data.tokens, current);
    await persistTokens(normalized);
    return normalized;
  } catch (error) {
    throw normalizeHttpError(error);
  }
}

export interface InitializeAuthOptions {
  onUnauthorized?: (error: HttpClientError) => void;
  onTokensChange?: (tokens: AuthTokens | null) => void;
}

export function subscribeToAuthTokens(listener: (tokens: AuthTokens | null) => void) {
  tokenListeners.add(listener);
  return () => {
    tokenListeners.delete(listener);
  };
}

export function initializeAuthService(options?: InitializeAuthOptions) {
  if (options?.onTokensChange) {
    subscribeToAuthTokens(options.onTokensChange);
  }

  setAccessTokenProvider(() => resolveAccessToken());
  setRefreshTokenHandler(async (_error) => {
    try {
      const refreshed = await refreshTokens();
      return refreshed?.accessToken ?? null;
    } catch (refreshError) {
      console.warn('auth: refresh handler failed', refreshError);
      if (refreshError) {
        const normalized = normalizeHttpError(refreshError);
        if (normalized.status === 401) {
          await clearStoredTokens();
        }
      }
      return null;
    }
  });
  setUnauthorizedHandler(async (error) => {
    await clearStoredTokens();
    options?.onUnauthorized?.(error);
  });
}

export async function restoreSession(): Promise<AuthTokens | null> {
  return loadTokens();
}
