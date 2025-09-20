import { useEffect } from 'react';
import { useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';

import {
  assertDashboardSuccess,
  fetchDashboardSummary,
  type DashboardFilters,
  type DashboardSummary,
  type DashboardTimeframe,
} from '@/services/dashboardService';
import {
  selectDashboardTimeframe,
  setDashboardError,
  setDashboardStatus,
  setDashboardSummary,
  setDashboardTimeframe,
} from '@/store/dashboardsSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { getErrorMessage } from '@/utils/errors';

const DASHBOARD_QUERY_KEY = ['dashboards'] as const;

type DashboardQueryKey = readonly [
  typeof DASHBOARD_QUERY_KEY[0],
  string,
  DashboardTimeframe,
  ...unknown[],
];

function normalizeFilters(filters?: DashboardFilters | null) {
  if (!filters) {
    return null;
  }

  const entries = Object.entries(filters).filter(([, value]) =>
    value !== undefined && value !== null && value !== '',
  );

  if (entries.length === 0) {
    return null;
  }

  return Object.fromEntries(entries) as DashboardFilters;
}

export function getDashboardQueryKey(
  scope: string,
  timeframe: DashboardTimeframe,
  filters?: DashboardFilters | null,
): DashboardQueryKey {
  const normalized = normalizeFilters(filters);
  if (!normalized) {
    return [...DASHBOARD_QUERY_KEY, scope, timeframe];
  }

  return [...DASHBOARD_QUERY_KEY, scope, timeframe, normalized];
}

export function useDashboardSummaryQuery(
  scope: string,
  options?: {
    timeframe?: DashboardTimeframe;
    filters?: DashboardFilters;
    enabled?: boolean;
  },
) {
  const dispatch = useAppDispatch();
  const storedTimeframe = useAppSelector((state) =>
    selectDashboardTimeframe(state, scope),
  );
  const activeTimeframe = options?.timeframe ?? storedTimeframe;
  const filters = options?.filters;
  const queryKey = getDashboardQueryKey(scope, activeTimeframe, filters ?? null);

  useEffect(() => {
    if (options?.timeframe) {
      dispatch(setDashboardTimeframe({ scope, timeframe: options.timeframe }));
      return;
    }

    if (!storedTimeframe) {
      dispatch(setDashboardTimeframe({ scope, timeframe: activeTimeframe }));
    }
  }, [dispatch, scope, options?.timeframe, storedTimeframe, activeTimeframe]);

  const query = useQuery<DashboardSummary, unknown, DashboardSummary, DashboardQueryKey>({
    queryKey,
    enabled: options?.enabled ?? true,
    queryFn: async (): Promise<DashboardSummary> => {
      dispatch(setDashboardStatus({ scope, status: 'loading' }));
      const result = await fetchDashboardSummary({
        scope,
        timeframe: activeTimeframe,
        ...filters,
      });
      assertDashboardSuccess(result);
      return result.data;
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!query.isSuccess || !query.data) {
      return;
    }

    dispatch(setDashboardSummary({ scope, summary: query.data }));
    dispatch(setDashboardStatus({ scope, status: 'succeeded' }));
    dispatch(setDashboardError({ scope, error: null }));
  }, [dispatch, query.data, query.isSuccess, scope]);

  useEffect(() => {
    if (!query.isError) {
      return;
    }

    dispatch(setDashboardStatus({ scope, status: 'failed' }));
    dispatch(
      setDashboardError({
        scope,
        error: getErrorMessage(
          query.error,
          'Não foi possível carregar os indicadores.',
        ),
      }),
    );
  }, [dispatch, query.error, query.isError, scope]);

  return query;
}

export function useInvalidateDashboardSummary(scope: string) {
  const queryClient = useQueryClient();
  return (timeframe?: DashboardTimeframe) => {
    const partialKey: QueryKey = timeframe
      ? [DASHBOARD_QUERY_KEY[0], scope, timeframe]
      : [DASHBOARD_QUERY_KEY[0], scope];
    return queryClient.invalidateQueries({ queryKey: partialKey });
  };
}

export { DASHBOARD_QUERY_KEY };
