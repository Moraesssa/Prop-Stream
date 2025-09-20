import {
  createAsyncThunk,
  createEntityAdapter,
  createSelector,
  createSlice,
  type EntityState,
  type PayloadAction,
} from '@reduxjs/toolkit';

import type {
  CreateOpportunityPayload,
  Opportunity,
  OpportunityFilters,
  UpdateOpportunityPayload,
} from '@/services/opportunitiesService';
import {
  assertSuccess,
  createOpportunity,
  deleteOpportunity,
  listOpportunities,
  updateOpportunity,
} from '@/services/opportunitiesService';

import type { RootState } from './index';

export type RequestStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

type PipelineEntityState = EntityState<Opportunity>;

export interface PipelineState extends PipelineEntityState {
  status: RequestStatus;
  error: string | null;
  filters: OpportunityFilters | null;
  lastUpdatedAt: number | null;
  optimisticIds: string[];
}

const pipelineAdapter = createEntityAdapter<Opportunity>({
  selectId: (opportunity) => opportunity.id,
  sortComparer: (a, b) =>
    new Date(b.updatedAt ?? b.createdAt).getTime() -
    new Date(a.updatedAt ?? a.createdAt).getTime(),
});

const initialState: PipelineState = pipelineAdapter.getInitialState({
  status: 'idle',
  error: null,
  filters: null,
  lastUpdatedAt: null,
  optimisticIds: [],
});

function resolveErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const value = (error as { message?: unknown }).message;
    if (typeof value === 'string') {
      return value;
    }
  }

  return 'Não foi possível concluir a operação.';
}

export const fetchPipeline = createAsyncThunk<
  { opportunities: Opportunity[]; receivedAt: number; filters?: OpportunityFilters },
  OpportunityFilters | undefined,
  { rejectValue: string }
>('pipeline/fetchPipeline', async (filters, { rejectWithValue }) => {
  try {
    const result = await listOpportunities(filters);
    assertSuccess(result);
    return {
      opportunities: result.data,
      receivedAt: Date.now(),
      filters,
    };
  } catch (error) {
    return rejectWithValue(resolveErrorMessage(error));
  }
});

export const createPipelineOpportunity = createAsyncThunk<
  Opportunity,
  CreateOpportunityPayload,
  { rejectValue: string }
>('pipeline/createOpportunity', async (payload, { rejectWithValue }) => {
  try {
    const result = await createOpportunity(payload);
    assertSuccess(result);
    return result.data;
  } catch (error) {
    return rejectWithValue(resolveErrorMessage(error));
  }
});

export const updatePipelineOpportunity = createAsyncThunk<
  Opportunity,
  { id: string; payload: UpdateOpportunityPayload },
  { rejectValue: string }
>('pipeline/updateOpportunity', async ({ id, payload }, { rejectWithValue }) => {
  try {
    const result = await updateOpportunity(id, payload);
    assertSuccess(result);
    return result.data;
  } catch (error) {
    return rejectWithValue(resolveErrorMessage(error));
  }
});

export const deletePipelineOpportunity = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>('pipeline/deleteOpportunity', async (id, { rejectWithValue }) => {
  try {
    const result = await deleteOpportunity(id);
    assertSuccess(result);
    return id;
  } catch (error) {
    return rejectWithValue(resolveErrorMessage(error));
  }
});

const pipelineSlice = createSlice({
  name: 'pipeline',
  initialState,
  reducers: {
    setFilters(state, action: PayloadAction<OpportunityFilters | null | undefined>) {
      state.filters = action.payload ?? null;
    },
    setStatus(state, action: PayloadAction<RequestStatus>) {
      state.status = action.payload;
      if (action.payload !== 'failed') {
        state.error = null;
      }
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      if (action.payload) {
        state.status = 'failed';
      }
    },
    setLastUpdatedAt(state, action: PayloadAction<number | null>) {
      state.lastUpdatedAt = action.payload ?? null;
    },
    upsertOpportunity: pipelineAdapter.upsertOne,
    upsertMany: pipelineAdapter.upsertMany,
    removeOpportunity: pipelineAdapter.removeOne,
    setAll: pipelineAdapter.setAll,
    markOptimistic(state, action: PayloadAction<string>) {
      if (!state.optimisticIds.includes(action.payload)) {
        state.optimisticIds.push(action.payload);
      }
    },
    clearOptimistic(state, action: PayloadAction<string>) {
      state.optimisticIds = state.optimisticIds.filter(
        (id) => id !== action.payload,
      );
    },
    resetOptimistic(state) {
      state.optimisticIds = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPipeline.pending, (state, action) => {
        state.status = 'loading';
        state.error = null;
        if (action.meta.arg !== undefined) {
          state.filters = action.meta.arg ?? null;
        }
      })
      .addCase(fetchPipeline.fulfilled, (state, action) => {
        pipelineAdapter.setAll(state, action.payload.opportunities);
        state.status = 'succeeded';
        state.error = null;
        state.lastUpdatedAt = action.payload.receivedAt;
        state.filters = action.payload.filters ?? null;
      })
      .addCase(fetchPipeline.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? 'Não foi possível carregar o pipeline.';
      })
      .addCase(createPipelineOpportunity.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(createPipelineOpportunity.fulfilled, (state, action) => {
        pipelineAdapter.upsertOne(state, action.payload);
        state.status = 'succeeded';
        state.error = null;
        state.lastUpdatedAt = Date.now();
      })
      .addCase(createPipelineOpportunity.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? 'Não foi possível criar a oportunidade.';
      })
      .addCase(updatePipelineOpportunity.pending, (state, action) => {
        state.status = 'loading';
        state.error = null;
        state.optimisticIds = Array.from(
          new Set([...state.optimisticIds, action.meta.arg.id]),
        );
      })
      .addCase(updatePipelineOpportunity.fulfilled, (state, action) => {
        pipelineAdapter.upsertOne(state, action.payload);
        state.status = 'succeeded';
        state.error = null;
        state.lastUpdatedAt = Date.now();
        state.optimisticIds = state.optimisticIds.filter(
          (id) => id !== action.payload.id,
        );
      })
      .addCase(updatePipelineOpportunity.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? 'Não foi possível atualizar a oportunidade.';
      })
      .addCase(deletePipelineOpportunity.pending, (state, action) => {
        state.status = 'loading';
        state.error = null;
        state.optimisticIds = Array.from(
          new Set([...state.optimisticIds, action.meta.arg]),
        );
      })
      .addCase(deletePipelineOpportunity.fulfilled, (state, action) => {
        pipelineAdapter.removeOne(state, action.payload);
        state.status = 'succeeded';
        state.error = null;
        state.lastUpdatedAt = Date.now();
        state.optimisticIds = state.optimisticIds.filter(
          (id) => id !== action.payload,
        );
      })
      .addCase(deletePipelineOpportunity.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? 'Não foi possível remover a oportunidade.';
      });
  },
});

export const {
  setFilters: setPipelineFilters,
  setStatus: setPipelineStatus,
  setError: setPipelineError,
  setLastUpdatedAt: setPipelineLastUpdatedAt,
  upsertOpportunity: upsertPipelineOpportunity,
  upsertMany: upsertManyPipelineOpportunities,
  removeOpportunity: removePipelineOpportunity,
  setAll: replacePipeline,
  markOptimistic: markPipelineOptimistic,
  clearOptimistic: clearPipelineOptimistic,
  resetOptimistic: resetPipelineOptimistic,
} = pipelineSlice.actions;

export default pipelineSlice.reducer;

const selectPipelineState = (state: RootState) => state.pipeline;

const adapterSelectors = pipelineAdapter.getSelectors<RootState>(
  (state) => state.pipeline,
);

export const selectAllPipelineOpportunities = adapterSelectors.selectAll;
export const selectPipelineEntities = adapterSelectors.selectEntities;

export const selectPipelineStatus = (state: RootState): RequestStatus =>
  selectPipelineState(state).status;

export const selectPipelineError = (state: RootState): string | null =>
  selectPipelineState(state).error;

export const selectPipelineFilters = (
  state: RootState,
): OpportunityFilters | null => selectPipelineState(state).filters;

export const selectPipelineLastUpdatedAt = (state: RootState): number | null =>
  selectPipelineState(state).lastUpdatedAt;

export const selectPipelineOptimisticIds = (state: RootState): string[] =>
  selectPipelineState(state).optimisticIds;

export const selectPipelineByStage = createSelector(
  [
    selectAllPipelineOpportunities,
    (_: RootState, stage?: string | null) => stage,
  ],
  (opportunities, stage) => {
    if (!stage) {
      return opportunities;
    }

    return opportunities.filter((opportunity) => opportunity.stage === stage);
  },
);

export const selectPipelineTotals = createSelector(
  [selectAllPipelineOpportunities],
  (opportunities) => {
    const totalValuation = opportunities.reduce((accumulator, opportunity) => {
      const value = typeof opportunity.valuation === 'number'
        ? opportunity.valuation
        : Number(opportunity.valuation ?? 0);
      return accumulator + (Number.isFinite(value) ? value : 0);
    }, 0);

    const averageProbability =
      opportunities.length === 0
        ? 0
        :
            opportunities.reduce((accumulator, opportunity) => {
              const probability = Number(opportunity.probability ?? 0);
              return accumulator + (Number.isFinite(probability) ? probability : 0);
            }, 0) / opportunities.length;

    return {
      totalValuation,
      averageProbability,
      totalCount: opportunities.length,
    };
  },
);

export const selectIsOpportunityOptimistic = createSelector(
  [
    selectPipelineOptimisticIds,
    (_: RootState, id: string | undefined) => id,
  ],
  (optimisticIds, id) => (id ? optimisticIds.includes(id) : false),
);

export type { Opportunity };
