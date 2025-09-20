import { useEffect } from 'react';
import { useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';

import {
  assertPortfolioSuccess,
  fetchPortfolioSnapshot,
  type PortfolioFilters,
  type PortfolioSnapshot,
} from '@/services/portfolioService';
import {
  selectActivePortfolioId,
  setActivePortfolioId,
  setPortfolioError,
  setPortfolioSnapshot,
  setPortfolioStatus,
} from '@/store/portfolioSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { getErrorMessage } from '@/utils/errors';

const PORTFOLIO_QUERY_KEY = ['portfolio'] as const;

type PortfolioQueryKey = readonly [typeof PORTFOLIO_QUERY_KEY[0], string, ...unknown[]];

function normalizeFilters(filters?: PortfolioFilters | null) {
  if (!filters) {
    return null;
  }

  const entries = Object.entries(filters).filter(([, value]) =>
    value !== undefined && value !== null && value !== '',
  );

  if (entries.length === 0) {
    return null;
  }

  return Object.fromEntries(entries) as PortfolioFilters;
}

export function getPortfolioQueryKey(
  portfolioId: string,
  filters?: PortfolioFilters | null,
): PortfolioQueryKey {
  const normalized = normalizeFilters(filters);
  if (!normalized) {
    return [...PORTFOLIO_QUERY_KEY, portfolioId];
  }

  return [...PORTFOLIO_QUERY_KEY, portfolioId, normalized];
}

export function usePortfolioSnapshotQuery(
  options?: {
    portfolioId?: string;
    filters?: PortfolioFilters;
    enabled?: boolean;
  },
) {
  const dispatch = useAppDispatch();
  const activePortfolioId = useAppSelector(selectActivePortfolioId);
  const portfolioId = options?.portfolioId ?? activePortfolioId;
  const filters = options?.filters;
  const queryKey = getPortfolioQueryKey(portfolioId, filters ?? null);

  useEffect(() => {
    if (options?.portfolioId) {
      dispatch(setActivePortfolioId(options.portfolioId));
      return;
    }

    if (!activePortfolioId && portfolioId) {
      dispatch(setActivePortfolioId(portfolioId));
    }
  }, [dispatch, options?.portfolioId, activePortfolioId, portfolioId]);

  const query = useQuery<PortfolioSnapshot, unknown, PortfolioSnapshot, PortfolioQueryKey>({
    queryKey,
    enabled: (options?.enabled ?? true) && Boolean(portfolioId),
    queryFn: async (): Promise<PortfolioSnapshot> => {
      dispatch(setPortfolioStatus({ portfolioId, status: 'loading' }));
      const result = await fetchPortfolioSnapshot({
        portfolioId,
        ...filters,
      });
      assertPortfolioSuccess(result);
      return result.data;
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!query.isSuccess || !query.data) {
      return;
    }

    dispatch(setPortfolioSnapshot({ portfolioId, snapshot: query.data }));
    dispatch(setPortfolioStatus({ portfolioId, status: 'succeeded' }));
    dispatch(setPortfolioError({ portfolioId, error: null }));
  }, [dispatch, portfolioId, query.data, query.isSuccess]);

  useEffect(() => {
    if (!query.isError) {
      return;
    }

    dispatch(setPortfolioStatus({ portfolioId, status: 'failed' }));
    dispatch(
      setPortfolioError({
        portfolioId,
        error: getErrorMessage(
          query.error,
          'Não foi possível carregar os dados do portfólio.',
        ),
      }),
    );
  }, [dispatch, portfolioId, query.error, query.isError]);

  return query;
}

export function useInvalidatePortfolioSnapshot() {
  const queryClient = useQueryClient();
  return (portfolioId?: string) => {
    const partialKey: QueryKey = portfolioId
      ? [PORTFOLIO_QUERY_KEY[0], portfolioId]
      : [PORTFOLIO_QUERY_KEY[0]];
    return queryClient.invalidateQueries({ queryKey: partialKey });
  };
}

export { PORTFOLIO_QUERY_KEY };
