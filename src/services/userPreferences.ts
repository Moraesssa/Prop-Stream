import type { UserPreferences, UserSavedFilter } from '@/types/user';

const STORAGE_PREFIX = 'prop-stream:user-preferences';
const BASE_DEFAULT_PREFERENCES: UserPreferences = {
  fixedWidgets: [],
  savedFilters: [],
  locale: 'pt-BR',
  theme: 'system',
};

const isBrowser = typeof window !== 'undefined';

function safeLocalStorageGet(key: string): string | null {
  if (!isBrowser) {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    console.warn('userPreferences: unable to read preferences from localStorage', error);
    return null;
  }
}

function safeLocalStorageSet(key: string, value: string | null) {
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
    console.warn('userPreferences: unable to persist preferences to localStorage', error);
  }
}

function getStorageKey(userId: string) {
  return `${STORAGE_PREFIX}:${userId}`;
}

function normalizeSavedFilter(filter: unknown): UserSavedFilter | null {
  if (!filter || typeof filter !== 'object') {
    return null;
  }

  const record = filter as Record<string, unknown>;
  const id = record.id;
  const label = record.label;
  const scope = record.scope;
  const rawCriteria = record.criteria;

  if (typeof id !== 'string' || typeof label !== 'string' || typeof scope !== 'string') {
    return null;
  }

  const criteria =
    rawCriteria && typeof rawCriteria === 'object' && !Array.isArray(rawCriteria)
      ? (rawCriteria as Record<string, unknown>)
      : {};

  return {
    id,
    label,
    scope,
    criteria,
    isDefault: Boolean(record.isDefault),
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : undefined,
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : undefined,
  };
}

function cloneArray<T>(values: readonly T[] | undefined): T[] {
  return Array.isArray(values) ? [...values] : [];
}

export function getDefaultUserPreferences(): UserPreferences {
  return {
    fixedWidgets: cloneArray(BASE_DEFAULT_PREFERENCES.fixedWidgets),
    savedFilters: cloneArray(BASE_DEFAULT_PREFERENCES.savedFilters),
    locale: BASE_DEFAULT_PREFERENCES.locale,
    theme: BASE_DEFAULT_PREFERENCES.theme,
    updatedAt: undefined,
  };
}

function normalizePreferences(preferences?: Partial<UserPreferences> | null): UserPreferences {
  if (!preferences || typeof preferences !== 'object') {
    return getDefaultUserPreferences();
  }

  const fixedWidgets = Array.isArray(preferences.fixedWidgets)
    ? preferences.fixedWidgets.filter(
        (value): value is string => typeof value === 'string' && value.trim().length > 0,
      )
    : [];

  const savedFilters = Array.isArray(preferences.savedFilters)
    ? preferences.savedFilters
        .map(normalizeSavedFilter)
        .filter((filter): filter is UserSavedFilter => filter != null)
    : [];

  return {
    fixedWidgets,
    savedFilters,
    locale: typeof preferences.locale === 'string' ? preferences.locale : BASE_DEFAULT_PREFERENCES.locale,
    theme:
      preferences.theme === 'light' || preferences.theme === 'dark' || preferences.theme === 'system'
        ? preferences.theme
        : BASE_DEFAULT_PREFERENCES.theme,
    updatedAt: typeof preferences.updatedAt === 'string' ? preferences.updatedAt : undefined,
  };
}

export async function loadUserPreferences(userId: string): Promise<UserPreferences> {
  if (!userId) {
    return getDefaultUserPreferences();
  }

  const stored = safeLocalStorageGet(getStorageKey(userId));
  if (!stored) {
    return getDefaultUserPreferences();
  }

  try {
    const parsed = JSON.parse(stored) as Partial<UserPreferences> | null;
    return normalizePreferences(parsed);
  } catch (error) {
    console.warn('userPreferences: failed to parse persisted preferences', error);
    return getDefaultUserPreferences();
  }
}

export async function saveUserPreferences(
  userId: string,
  preferences: UserPreferences,
): Promise<UserPreferences> {
  const normalized = normalizePreferences(preferences);
  const payload = {
    ...normalized,
    updatedAt: new Date().toISOString(),
  } satisfies UserPreferences;

  try {
    safeLocalStorageSet(getStorageKey(userId), JSON.stringify(payload));
  } catch (error) {
    console.warn('userPreferences: failed to persist preferences', error);
  }

  return { ...payload, savedFilters: cloneArray(payload.savedFilters), fixedWidgets: cloneArray(payload.fixedWidgets) };
}

export async function clearUserPreferences(userId: string) {
  safeLocalStorageSet(getStorageKey(userId), null);
}

export function mergeUserPreferences(
  current: UserPreferences,
  updates: Partial<UserPreferences>,
): UserPreferences {
  const merged = {
    ...current,
    ...updates,
  };

  return normalizePreferences(merged);
}
