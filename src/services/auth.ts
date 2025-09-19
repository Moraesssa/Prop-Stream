import apiClient, {
  AuthTokens,
  registerTokenProvider,
  registerTokenRefreshHandler,
  setAuthTokens
} from './apiClient';

// Minimal Buffer declaration to satisfy environments without Node typings.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Buffer: any;

export interface Credentials {
  username: string;
  password: string;
  otp?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  roles: string[];
  avatarUrl?: string;
}

export interface SessionState {
  tokens: AuthTokens;
  user: UserProfile;
  createdAt: number;
  refreshedAt?: number;
}

export interface AuthServiceConfig {
  storageKey?: string;
  encryptionKey?: string;
  storage?: StorageLike;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const DEFAULT_STORAGE_KEY = 'prop-stream';

class MemoryStorage implements StorageLike {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }
}

function getSubtleCrypto(): SubtleCrypto | null {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
    return globalThis.crypto.subtle;
  }
  return null;
}

function encodeString(value: string): Uint8Array {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(value);
  }

  if (typeof Buffer !== 'undefined') {
    return Uint8Array.from(Buffer.from(value, 'utf-8'));
  }

  const bytes = new Uint8Array(value.length);
  for (let index = 0; index < value.length; index += 1) {
    bytes[index] = value.charCodeAt(index);
  }
  return bytes;
}

function decodeString(bytes: Uint8Array): string {
  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder().decode(bytes);
  }

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('utf-8');
  }

  let result = '';
  bytes.forEach((value) => {
    result += String.fromCharCode(value);
  });
  return result;
}

function toBase64(data: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(data).toString('base64');
  }

  let binary = '';
  data.forEach((value) => {
    binary += String.fromCharCode(value);
  });

  if (typeof btoa === 'function') {
    return btoa(binary);
  }

  return binary;
}

function fromBase64(value: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(value, 'base64'));
  }

  const binary = typeof atob === 'function' ? atob(value) : value;
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function deriveKey(secret: string): Promise<CryptoKey | null> {
  const subtle = getSubtleCrypto();
  if (!subtle) {
    return null;
  }

  const secretBuffer = encodeString(secret);
  const hashed = await subtle.digest('SHA-256', secretBuffer as unknown as BufferSource);
  return subtle.importKey('raw', hashed, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function encrypt(value: string, secret?: string): Promise<string> {
  if (!secret) return value;

  const subtle = getSubtleCrypto();
  if (!subtle) {
    return toBase64(encodeString(value));
  }

  const key = await deriveKey(secret);
  if (!key || !globalThis.crypto?.getRandomValues) {
    return value;
  }

  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const encodedValue = encodeString(value);
  const cipher = await subtle.encrypt({ name: 'AES-GCM', iv }, key, encodedValue as unknown as BufferSource);

  return `${toBase64(iv)}.${toBase64(new Uint8Array(cipher))}`;
}

async function decrypt(value: string, secret?: string): Promise<string> {
  if (!secret) return value;

  const subtle = getSubtleCrypto();
  if (!subtle) {
    const bytes = fromBase64(value);
    return decodeString(bytes);
  }

  const [ivRaw, dataRaw] = value.split('.');
  if (!ivRaw || !dataRaw) {
    return value;
  }

  const key = await deriveKey(secret);
  if (!key) {
    return value;
  }

  const decrypted = await subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(ivRaw) as unknown as BufferSource },
    key,
    fromBase64(dataRaw) as unknown as BufferSource
  );

  return decodeString(new Uint8Array(decrypted));
}

class SecureStorage {
  private prefix: string;

  constructor(
    private readonly storage: StorageLike,
    storageKey: string,
    private secret?: string
  ) {
    this.prefix = storageKey;
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    const payload = JSON.stringify(value);
    const encrypted = await encrypt(payload, this.secret);
    this.storage.setItem(this.namespacedKey(key), encrypted);
  }

  async getItem<T>(key: string): Promise<T | null> {
    const stored = this.storage.getItem(this.namespacedKey(key));
    if (!stored) return null;

    try {
      const decrypted = await decrypt(stored, this.secret);
      return JSON.parse(decrypted) as T;
    } catch (error) {
      console.warn('[auth] Failed to parse secure storage item', error);
      return null;
    }
  }

  async removeItem(key: string): Promise<void> {
    this.storage.removeItem(this.namespacedKey(key));
  }

  private namespacedKey(key: string): string {
    return `${this.prefix}:${key}`;
  }
}

interface LoginResponse {
  tokens: AuthTokens;
  user: UserProfile;
}

interface RefreshResponse {
  tokens: AuthTokens;
}

type SessionListener = (session: SessionState | null) => void;

function detectStorage(): StorageLike {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return new MemoryStorage();
}

export class AuthService {
  private storage: SecureStorage;

  private session: SessionState | null = null;

  private listeners = new Set<SessionListener>();

  private readyPromise: Promise<void>;

  constructor(private config: AuthServiceConfig = {}) {
    const storageImpl = config.storage ?? detectStorage();
    const storageKey = config.storageKey ?? DEFAULT_STORAGE_KEY;
    this.storage = new SecureStorage(storageImpl, storageKey, config.encryptionKey);
    this.readyPromise = this.restoreSession();

    registerTokenProvider(() => this.session?.tokens.accessToken);
    registerTokenRefreshHandler(() => this.refreshSession());
  }

  async ready(): Promise<void> {
    await this.readyPromise;
  }

  async login(credentials: Credentials): Promise<SessionState> {
    await this.ready();
    const { data } = await apiClient.post<LoginResponse>('/auth/login', credentials);
    const session: SessionState = {
      tokens: data.tokens,
      user: data.user,
      createdAt: Date.now(),
      refreshedAt: Date.now()
    };

    this.session = session;
    await this.storage.setItem('session', session);
    setAuthTokens(session.tokens);
    this.emit();
    return session;
  }

  async logout(): Promise<void> {
    await this.ready();
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.warn('[auth] logout call failed, clearing local session only', error);
    }

    this.session = null;
    await this.storage.removeItem('session');
    setAuthTokens(null);
    this.emit();
  }

  async refreshSession(): Promise<AuthTokens | null> {
    await this.ready();

    if (!this.session?.tokens.refreshToken) {
      return null;
    }

    try {
      const { data } = await apiClient.post<RefreshResponse>('/auth/refresh', {
        refreshToken: this.session.tokens.refreshToken
      });

      const updated: SessionState = {
        ...this.session,
        tokens: data.tokens,
        refreshedAt: Date.now()
      };
      this.session = updated;
      await this.storage.setItem('session', updated);
      setAuthTokens(updated.tokens);
      this.emit();
      return updated.tokens;
    } catch (error) {
      await this.logout();
      throw error;
    }
  }

  getSession(): SessionState | null {
    return this.session;
  }

  getAccessToken(): string | undefined {
    return this.session?.tokens.accessToken;
  }

  async setEncryptionKey(secret?: string): Promise<void> {
    this.storage = new SecureStorage(
      this.config.storage ?? detectStorage(),
      this.config.storageKey ?? DEFAULT_STORAGE_KEY,
      secret
    );
    this.config.encryptionKey = secret;
    if (this.session) {
      await this.storage.setItem('session', this.session);
    }
  }

  subscribe(listener: SessionListener): () => void {
    this.listeners.add(listener);
    listener(this.session);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private async restoreSession(): Promise<void> {
    try {
      const session = await this.storage.getItem<SessionState>('session');
      if (session) {
        this.session = session;
        setAuthTokens(session.tokens);
      }
    } catch (error) {
      console.warn('[auth] Unable to restore session', error);
    }
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener(this.session));
  }
}

export const authService = new AuthService();

export default authService;
