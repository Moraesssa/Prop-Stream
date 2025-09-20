import { useEffect } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query';

import {
  assertSuccess,
  createOpportunity,
  deleteOpportunity,
  listOpportunities,
  type CreateOpportunityPayload,
  type Opportunity,
  type OpportunityFilters,
  type UpdateOpportunityPayload,
  updateOpportunity,
} from '@/services/opportunitiesService';
import {
  clearPipelineOptimistic,
  markPipelineOptimistic,
  removePipelineOpportunity,
  replacePipeline,
  selectPipelineFilters,
  setPipelineError,
  setPipelineFilters,
  setPipelineLastUpdatedAt,
  setPipelineStatus,
  upsertPipelineOpportunity,
} from '@/store/pipelineSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { getErrorMessage } from '@/utils/errors';

const PIPELINE_QUERY_KEY = ['pipeline'] as const;

type PipelineQueryKey = readonly [typeof PIPELINE_QUERY_KEY[0], ...unknown[]];

type PipelineQueryContext = {
  previousQueries: Array<[QueryKey, Opportunity[] | undefined]>;
  optimisticOpportunity?: Opportunity;
};

function getGlobalCrypto(): Crypto | undefined {
  if (typeof globalThis === 'undefined') {
    return undefined;
  }

  return globalThis.crypto as Crypto | undefined;
}

function generateOptimisticId() {
  const cryptoInstance = getGlobalCrypto();
  if (cryptoInstance && typeof cryptoInstance.randomUUID === 'function') {
    return cryptoInstance.randomUUID();
  }

  return `optimistic-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeFilters(filters?: OpportunityFilters | null) {
  if (!filters) {
    return null;
  }

  const entries = Object.entries(filters).filter(([, value]) =>
    value !== undefined && value !== null && value !== '',
  );

  if (entries.length === 0) {
    return null;
  }

  return Object.fromEntries(entries) as OpportunityFilters;
}

export function getPipelineQueryKey(
  filters?: OpportunityFilters | null,
): PipelineQueryKey {
  const normalized = normalizeFilters(filters);
  if (!normalized) {
    return [...PIPELINE_QUERY_KEY, 'all'];
  }

  return [...PIPELINE_QUERY_KEY, normalized];
}

function applyToAllPipelineQueries(
  queryClient: QueryClient,
  updater: (data: Opportunity[] | undefined) => Opportunity[] | undefined,
) {
  const queries = queryClient.getQueriesData<Opportunity[]>({
    queryKey: PIPELINE_QUERY_KEY,
  });

  queries.forEach(([key]) => {
    queryClient.setQueryData<Opportunity[]>(key, (old) => {
      const snapshot = Array.isArray(old) ? [...old] : old;
      return updater(snapshot);
    });
  });
}

function getExistingOpportunity(
  queries: Array<[QueryKey, Opportunity[] | undefined]>,
  id: string,
): Opportunity | undefined {
  for (const [, data] of queries) {
    const match = data?.find((item) => item.id === id);
    if (match) {
      return match;
    }
  }

  return undefined;
}

export function usePipelineQuery(filters?: OpportunityFilters) {
  const dispatch = useAppDispatch();
  const storedFilters = useAppSelector((state) => selectPipelineFilters(state));
  const activeFilters = filters ?? storedFilters ?? null;
  const queryKey = getPipelineQueryKey(activeFilters);

  useEffect(() => {
    if (filters !== undefined) {
      dispatch(setPipelineFilters(filters));
    }
  }, [dispatch, filters]);

  const query = useQuery<Opportunity[], unknown, Opportunity[], PipelineQueryKey>({
    queryKey,
    queryFn: async (): Promise<Opportunity[]> => {
      dispatch(setPipelineStatus('loading'));
      const result = await listOpportunities(activeFilters ?? undefined);
      assertSuccess(result);
      return result.data;
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!query.isSuccess || !query.data) {
      return;
    }

    dispatch(replacePipeline(query.data));
    dispatch(setPipelineStatus('succeeded'));
    dispatch(setPipelineError(null));
    dispatch(setPipelineLastUpdatedAt(Date.now()));
    if (filters === undefined) {
      dispatch(setPipelineFilters(activeFilters));
    }
  }, [
    activeFilters,
    dispatch,
    filters,
    query.data,
    query.isSuccess,
  ]);

  useEffect(() => {
    if (!query.isError) {
      return;
    }

    dispatch(setPipelineStatus('failed'));
    dispatch(
      setPipelineError(
        getErrorMessage(query.error, 'Não foi possível carregar o pipeline.'),
      ),
    );
  }, [dispatch, query.error, query.isError]);

  return query;
}

export function useCreateOpportunityMutation() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  return useMutation<Opportunity, unknown, CreateOpportunityPayload, PipelineQueryContext>({
    mutationFn: async (payload) => {
      const result = await createOpportunity(payload);
      assertSuccess(result);
      return result.data;
    },
    onMutate: async (payload) => {
      dispatch(setPipelineStatus('loading'));
      await queryClient.cancelQueries({ queryKey: PIPELINE_QUERY_KEY });

      const previousQueries = queryClient.getQueriesData<Opportunity[]>({
        queryKey: PIPELINE_QUERY_KEY,
      });

      const optimisticOpportunity: Opportunity = {
        id: generateOptimisticId(),
        name: payload.name,
        stage: payload.stage,
        region: payload.region,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        valuation: payload.valuation,
        probability: payload.probability ?? 0,
        metadata: payload.metadata,
      };

      applyToAllPipelineQueries(queryClient, (data) => [
        optimisticOpportunity,
        ...(data ?? []),
      ]);

      dispatch(upsertPipelineOpportunity(optimisticOpportunity));
      dispatch(markPipelineOptimistic(optimisticOpportunity.id));

      return { previousQueries, optimisticOpportunity };
    },
    onError: (error, _payload, context) => {
      context?.previousQueries.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });

      if (context?.optimisticOpportunity) {
        dispatch(removePipelineOpportunity(context.optimisticOpportunity.id));
        dispatch(clearPipelineOptimistic(context.optimisticOpportunity.id));
      }

      dispatch(
        setPipelineError(
          getErrorMessage(error, 'Não foi possível criar a oportunidade.'),
        ),
      );
      dispatch(setPipelineStatus('failed'));
    },
    onSuccess: (opportunity, _payload, context) => {
      if (context?.optimisticOpportunity) {
        dispatch(clearPipelineOptimistic(context.optimisticOpportunity.id));
        dispatch(removePipelineOpportunity(context.optimisticOpportunity.id));
      }

      dispatch(upsertPipelineOpportunity(opportunity));
      applyToAllPipelineQueries(queryClient, (data) => {
        const withoutOptimistic = (data ?? []).filter(
          (item) => item.id !== context?.optimisticOpportunity?.id,
        );
        return [opportunity, ...withoutOptimistic];
      });

      dispatch(setPipelineStatus('succeeded'));
      dispatch(setPipelineError(null));
      dispatch(setPipelineLastUpdatedAt(Date.now()));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PIPELINE_QUERY_KEY });
    },
  });
}

export function useUpdateOpportunityMutation() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  return useMutation<
    Opportunity,
    unknown,
    { id: string; payload: UpdateOpportunityPayload },
    PipelineQueryContext & { baseline?: Opportunity }
  >({
    mutationFn: async ({ id, payload }) => {
      const result = await updateOpportunity(id, payload);
      assertSuccess(result);
      return result.data;
    },
    onMutate: async ({ id, payload }) => {
      dispatch(setPipelineStatus('loading'));
      await queryClient.cancelQueries({ queryKey: PIPELINE_QUERY_KEY });

      const previousQueries = queryClient.getQueriesData<Opportunity[]>({
        queryKey: PIPELINE_QUERY_KEY,
      });

      const baseline = getExistingOpportunity(previousQueries, id);
      const optimisticOpportunity: Opportunity = {
        ...(baseline ?? {
          id,
          name: payload.name ?? 'Oportunidade',
          stage: payload.stage ?? 'lead',
          createdAt: new Date().toISOString(),
        }),
        ...payload,
        updatedAt: new Date().toISOString(),
      };

      applyToAllPipelineQueries(queryClient, (data) => {
        if (!data) {
          return [optimisticOpportunity];
        }

        return data.map((item) => (item.id === id ? optimisticOpportunity : item));
      });

      dispatch(upsertPipelineOpportunity(optimisticOpportunity));
      dispatch(markPipelineOptimistic(id));

      return { previousQueries, optimisticOpportunity, baseline };
    },
    onError: (error, variables, context) => {
      context?.previousQueries.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });

      if (context?.baseline) {
        dispatch(upsertPipelineOpportunity(context.baseline));
      }

      dispatch(clearPipelineOptimistic(variables.id));
      dispatch(
        setPipelineError(
          getErrorMessage(error, 'Não foi possível atualizar a oportunidade.'),
        ),
      );
      dispatch(setPipelineStatus('failed'));
    },
    onSuccess: (opportunity) => {
      dispatch(clearPipelineOptimistic(opportunity.id));
      dispatch(upsertPipelineOpportunity(opportunity));
      applyToAllPipelineQueries(queryClient, (data) => {
        if (!data) {
          return [opportunity];
        }

        return data.map((item) => (item.id === opportunity.id ? opportunity : item));
      });
      dispatch(setPipelineStatus('succeeded'));
      dispatch(setPipelineError(null));
      dispatch(setPipelineLastUpdatedAt(Date.now()));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PIPELINE_QUERY_KEY });
    },
  });
}

export function useDeleteOpportunityMutation() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  return useMutation<string, unknown, string, PipelineQueryContext & { baseline?: Opportunity }>(
    {
      mutationFn: async (id) => {
        const result = await deleteOpportunity(id);
        assertSuccess(result);
        return id;
      },
      onMutate: async (id) => {
        dispatch(setPipelineStatus('loading'));
        await queryClient.cancelQueries({ queryKey: PIPELINE_QUERY_KEY });

        const previousQueries = queryClient.getQueriesData<Opportunity[]>({
          queryKey: PIPELINE_QUERY_KEY,
        });

        const baseline = getExistingOpportunity(previousQueries, id);

        applyToAllPipelineQueries(queryClient, (data) =>
          (data ?? []).filter((item) => item.id !== id),
        );

        if (baseline) {
          dispatch(removePipelineOpportunity(id));
        }

        dispatch(markPipelineOptimistic(id));

        return { previousQueries, baseline };
      },
      onError: (error, id, context) => {
        context?.previousQueries.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });

        if (context?.baseline) {
          dispatch(upsertPipelineOpportunity(context.baseline));
        }

        dispatch(clearPipelineOptimistic(id));
        dispatch(
          setPipelineError(
            getErrorMessage(error, 'Não foi possível remover a oportunidade.'),
          ),
        );
        dispatch(setPipelineStatus('failed'));
      },
      onSuccess: (id) => {
        dispatch(removePipelineOpportunity(id));
        dispatch(clearPipelineOptimistic(id));
        applyToAllPipelineQueries(queryClient, (data) =>
          (data ?? []).filter((item) => item.id !== id),
        );
        dispatch(setPipelineStatus('succeeded'));
        dispatch(setPipelineError(null));
        dispatch(setPipelineLastUpdatedAt(Date.now()));
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: PIPELINE_QUERY_KEY });
      },
    },
  );
}

export { PIPELINE_QUERY_KEY };
