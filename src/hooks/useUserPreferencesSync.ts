import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getDefaultUserPreferences,
  loadUserPreferences,
  saveUserPreferences,
} from '@/services/userPreferences';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  markPreferencesHydrated,
  markPreferencesSynced,
  selectUserId,
  selectUserPreferences,
  selectUserPreferencesHydrated,
  selectUserPreferencesStatus,
  setUserPreferences,
  setUserPreferencesError,
  setUserPreferencesStatus,
} from '@/store/user';
import type { UserPreferences, UserSavedFilter } from '@/types/user';

const DEFAULT_QUERY_KEY = ['user', 'preferences'];

function compareStringArrays(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }

  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) {
      return false;
    }
  }

  return true;
}

function compareCriteria(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

function compareSavedFilters(
  a: readonly UserSavedFilter[],
  b: readonly UserSavedFilter[],
): boolean {
  if (a.length !== b.length) {
    return false;
  }

  for (let index = 0; index < a.length; index += 1) {
    const left = a[index];
    const right = b[index];
    if (!right) {
      return false;
    }

    if (
      left.id !== right.id ||
      left.label !== right.label ||
      left.scope !== right.scope ||
      Boolean(left.isDefault) !== Boolean(right.isDefault)
    ) {
      return false;
    }

    if (!compareCriteria(left.criteria, right.criteria)) {
      return false;
    }
  }

  return true;
}

function arePreferencesEqual(a: UserPreferences, b: UserPreferences): boolean {
  return (
    compareStringArrays(a.fixedWidgets, b.fixedWidgets) &&
    compareSavedFilters(a.savedFilters, b.savedFilters) &&
    a.locale === b.locale &&
    a.theme === b.theme
  );
}

export function useUserPreferencesSync() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const userId = useAppSelector((state) => selectUserId(state));
  const status = useAppSelector((state) => selectUserPreferencesStatus(state));
  const preferences = useAppSelector((state) => selectUserPreferences(state));
  const hydrated = useAppSelector((state) => selectUserPreferencesHydrated(state));
  const previousRef = useRef<UserPreferences | null>(null);

  const enabled = Boolean(userId);

  const query = useQuery<UserPreferences>({
    queryKey: enabled ? ['user', userId, 'preferences'] : DEFAULT_QUERY_KEY,
    queryFn: async (): Promise<UserPreferences> => {
      if (!userId) {
        return getDefaultUserPreferences();
      }

      return loadUserPreferences(userId);
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  useEffect(() => {
    if (!query.isSuccess || !query.data) {
      return;
    }

    dispatch(setUserPreferences(query.data));
    dispatch(markPreferencesHydrated(true));
    dispatch(setUserPreferencesStatus('ready'));
    dispatch(setUserPreferencesError(null));
    previousRef.current = query.data;
  }, [dispatch, query.data, query.isSuccess]);

  useEffect(() => {
    if (!query.isError) {
      return;
    }

    const message =
      query.error instanceof Error
        ? query.error.message
        : 'Não foi possível carregar as preferências do usuário.';
    dispatch(setUserPreferencesError(message));
    dispatch(setUserPreferencesStatus('error'));
  }, [dispatch, query.error, query.isError]);

  useEffect(() => {
    if (!enabled) {
      dispatch(setUserPreferences(getDefaultUserPreferences()));
      dispatch(markPreferencesHydrated(false));
      dispatch(setUserPreferencesStatus('idle'));
      previousRef.current = null;
      return;
    }

    if (status === 'idle') {
      dispatch(setUserPreferencesStatus('loading'));
    }
  }, [dispatch, enabled, status]);

  useEffect(() => {
    if (!enabled || !hydrated || status !== 'ready' || !userId) {
      return;
    }

    if (!previousRef.current) {
      previousRef.current = preferences;
      return;
    }

    if (arePreferencesEqual(previousRef.current, preferences)) {
      return;
    }

    const pending: UserPreferences = {
      ...preferences,
      updatedAt: new Date().toISOString(),
      fixedWidgets: [...preferences.fixedWidgets],
      savedFilters: preferences.savedFilters.map((filter) => ({
        ...filter,
        criteria: { ...filter.criteria },
      })),
    };

    previousRef.current = pending;
    dispatch(setUserPreferences(pending));

    saveUserPreferences(userId, pending)
      .then((stored) => {
        previousRef.current = stored;
        dispatch(markPreferencesSynced(Date.now()));
        queryClient.setQueryData(['user', userId, 'preferences'], stored);
      })
      .catch((error) => {
        console.warn('userPreferences: failed to persist preferences', error);
        dispatch(
          setUserPreferencesError(
            'Não foi possível salvar as preferências do usuário. Tente novamente mais tarde.',
          ),
        );
      });
  }, [dispatch, enabled, hydrated, preferences, queryClient, status, userId]);
}
