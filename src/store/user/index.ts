import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { UserPreferences, UserProfile, UserSavedFilter } from '@/types/user';
import { getDefaultUserPreferences } from '@/services/userPreferences';

export type UserSessionStatus = 'unknown' | 'authenticated' | 'unauthenticated';

export interface UserState {
  profile: UserProfile | null;
  permissions: string[];
  preferences: UserPreferences;
  preferencesStatus: 'idle' | 'loading' | 'ready' | 'error';
  preferencesError: string | null;
  preferencesHydrated: boolean;
  lastPreferencesSyncAt: number | null;
  sessionStatus: UserSessionStatus;
}

function createDefaultProfile(): UserProfile {
  return {
    id: 'guest',
    name: 'Convidado Prop-Stream',
    email: 'guest@propstream.local',
    role: 'Gestor',
    organization: 'Prop-Stream',
  };
}

function normalizeFixedWidgets(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter((value, index, array) => value.length > 0 && array.indexOf(value) === index);
}

function normalizeSavedFilter(filter: UserSavedFilter): UserSavedFilter {
  return {
    ...filter,
    id: filter.id,
    label: filter.label,
    scope: filter.scope,
    criteria: { ...filter.criteria },
    isDefault: Boolean(filter.isDefault),
    createdAt: filter.createdAt,
    updatedAt: filter.updatedAt ?? new Date().toISOString(),
  };
}

function normalizePreferences(preferences: Partial<UserPreferences> | UserPreferences | undefined): UserPreferences {
  const defaults = getDefaultUserPreferences();
  if (!preferences || typeof preferences !== 'object') {
    return defaults;
  }

  const normalizedFilters = Array.isArray(preferences.savedFilters)
    ? preferences.savedFilters.flatMap((filter) => {
        if (
          !filter ||
          typeof filter !== 'object' ||
          typeof filter.id !== 'string' ||
          typeof filter.scope !== 'string' ||
          typeof filter.label !== 'string'
        ) {
          return [];
        }

        const criteria =
          filter.criteria &&
          typeof filter.criteria === 'object' &&
          !Array.isArray(filter.criteria)
            ? { ...filter.criteria }
            : {};

        const normalized: UserSavedFilter = {
          id: filter.id,
          label: filter.label,
          scope: filter.scope,
          criteria,
          isDefault: Boolean(filter.isDefault),
          createdAt: filter.createdAt,
          updatedAt: filter.updatedAt,
        };

        return [normalizeSavedFilter(normalized)];
      })
    : [];

  return {
    fixedWidgets: normalizeFixedWidgets(preferences.fixedWidgets),
    savedFilters: normalizedFilters,
    locale: typeof preferences.locale === 'string' ? preferences.locale : defaults.locale,
    theme:
      preferences.theme === 'light' || preferences.theme === 'dark' || preferences.theme === 'system'
        ? preferences.theme
        : defaults.theme,
    updatedAt: preferences.updatedAt ?? defaults.updatedAt,
  };
}

function ensureUniquePermissions(permissions: unknown): string[] {
  if (!Array.isArray(permissions)) {
    return [];
  }

  return permissions
    .map((permission) =>
      typeof permission === 'string'
        ? permission
        : typeof permission === 'object' && permission && 'id' in permission
          ? String((permission as { id: unknown }).id)
          : null,
    )
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .filter((value, index, array) => array.indexOf(value) === index);
}

function createInitialState(): UserState {
  return {
    profile: createDefaultProfile(),
    permissions: ensureUniquePermissions([
      'dashboards:view',
      'pipeline:manage',
      'portfolio:view',
    ]),
    preferences: getDefaultUserPreferences(),
    preferencesStatus: 'idle',
    preferencesError: null,
    preferencesHydrated: false,
    lastPreferencesSyncAt: null,
    sessionStatus: 'unknown',
  };
}

const initialState: UserState = createInitialState();

function markUpdated(state: UserState) {
  state.preferences.updatedAt = new Date().toISOString();
  state.lastPreferencesSyncAt = Date.now();
}

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUserProfile(state, action: PayloadAction<UserProfile | null>) {
      state.profile = action.payload;
      state.sessionStatus = action.payload ? 'authenticated' : 'unauthenticated';
    },
    setUserPermissions(state, action: PayloadAction<unknown>) {
      state.permissions = ensureUniquePermissions(action.payload);
    },
    setUserPreferences(state, action: PayloadAction<UserPreferences | Partial<UserPreferences>>) {
      state.preferences = normalizePreferences(action.payload);
      state.preferencesHydrated = true;
      state.preferencesStatus = 'ready';
      state.preferencesError = null;
    },
    mergeUserPreferences(state, action: PayloadAction<Partial<UserPreferences>>) {
      state.preferences = normalizePreferences({
        ...state.preferences,
        ...action.payload,
      });
      markUpdated(state);
    },
    toggleFixedWidget(state, action: PayloadAction<string>) {
      const widgetId = action.payload.trim();
      if (!widgetId) {
        return;
      }

      const widgets = state.preferences.fixedWidgets;
      const index = widgets.indexOf(widgetId);
      if (index >= 0) {
        widgets.splice(index, 1);
      } else {
        widgets.push(widgetId);
      }

      markUpdated(state);
    },
    upsertSavedFilter(state, action: PayloadAction<UserSavedFilter>) {
      const incoming = normalizeSavedFilter(action.payload);
      const filters = state.preferences.savedFilters;
      const existingIndex = filters.findIndex((filter) => filter.id === incoming.id);

      if (incoming.isDefault) {
        filters.forEach((filter, index) => {
          if (filter.scope === incoming.scope) {
            filters[index] = { ...filter, isDefault: filter.id === incoming.id };
          }
        });
      }

      if (existingIndex >= 0) {
        const current = filters[existingIndex];
        filters[existingIndex] = {
          ...incoming,
          createdAt: current.createdAt ?? incoming.createdAt ?? new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      } else {
        filters.push({
          ...incoming,
          createdAt: incoming.createdAt ?? new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      markUpdated(state);
    },
    removeSavedFilter(state, action: PayloadAction<{ id?: string; scope?: string }>) {
      const { id, scope } = action.payload;
      state.preferences.savedFilters = state.preferences.savedFilters.filter((filter) => {
        if (id) {
          return filter.id !== id;
        }

        if (scope) {
          return filter.scope !== scope;
        }

        return true;
      });
      markUpdated(state);
    },
    setUserPreferencesStatus(state, action: PayloadAction<UserState['preferencesStatus']>) {
      state.preferencesStatus = action.payload;
      if (action.payload !== 'error') {
        state.preferencesError = null;
      }
    },
    setUserPreferencesError(state, action: PayloadAction<string | null>) {
      state.preferencesError = action.payload;
      if (action.payload) {
        state.preferencesStatus = 'error';
      }
    },
    markPreferencesHydrated(state, action: PayloadAction<boolean | undefined>) {
      state.preferencesHydrated = action.payload ?? true;
    },
    markPreferencesSynced(state, action: PayloadAction<number | null | undefined>) {
      state.lastPreferencesSyncAt = action.payload ?? Date.now();
    },
    resetUserPreferences(state) {
      state.preferences = getDefaultUserPreferences();
      state.preferencesStatus = 'idle';
      state.preferencesError = null;
      state.preferencesHydrated = false;
      state.lastPreferencesSyncAt = null;
    },
    resetUserState() {
      return createInitialState();
    },
  },
});

export const {
  setUserProfile,
  setUserPermissions,
  setUserPreferences,
  mergeUserPreferences,
  toggleFixedWidget,
  upsertSavedFilter,
  removeSavedFilter,
  setUserPreferencesStatus,
  setUserPreferencesError,
  markPreferencesHydrated,
  markPreferencesSynced,
  resetUserPreferences,
  resetUserState,
} = userSlice.actions;

export default userSlice.reducer;

import type { RootState } from '..';

export const selectUserState = (state: RootState) => state.user;
export const selectUserProfile = (state: RootState) => selectUserState(state).profile;
export const selectUserPermissions = (state: RootState) => selectUserState(state).permissions;
export const selectUserSessionStatus = (state: RootState) => selectUserState(state).sessionStatus;
export const selectUserPreferences = (state: RootState) => selectUserState(state).preferences;
export const selectUserPreferencesStatus = (state: RootState) =>
  selectUserState(state).preferencesStatus;
export const selectUserPreferencesError = (state: RootState) =>
  selectUserState(state).preferencesError;
export const selectUserPreferencesHydrated = (state: RootState) =>
  selectUserState(state).preferencesHydrated;
export const selectUserLastPreferencesSyncAt = (state: RootState) =>
  selectUserState(state).lastPreferencesSyncAt;

export const selectUserId = createSelector(selectUserProfile, (profile) => profile?.id ?? null);

export const selectUserFixedWidgets = createSelector(
  selectUserPreferences,
  (preferences) => preferences.fixedWidgets,
);

export const selectUserSavedFilters = createSelector(
  selectUserPreferences,
  (preferences) => preferences.savedFilters,
);

export const selectPipelineDefaultFilter = createSelector(selectUserSavedFilters, (filters) =>
  filters.find((filter) => filter.scope === 'pipeline' && filter.isDefault) ?? null,
);

export const selectIsWidgetPinned = (widgetId: string) =>
  createSelector(selectUserFixedWidgets, (widgets) => widgets.includes(widgetId));
