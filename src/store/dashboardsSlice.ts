import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { RootState } from './index';
import type {
  DashboardFilters,
  DashboardSummary,
  DashboardTimeframe,
} from '@/services/dashboardService';
import {
  assertDashboardSuccess,
  fetchDashboardSummary,
} from '@/services/dashboardService';
import type { RequestStatus } from './pipelineSlice';

interface DashboardState {
  summaries: Record<string, DashboardSummary | null>;
  statusByScope: Record<string, RequestStatus>;
  errorByScope: Record<string, string | null>;
  timeframeByScope: Record<string, DashboardTimeframe>;
  lastFetchedAt: Record<string, number | null>;
}

const DEFAULT_TIMEFRAME: DashboardTimeframe = '30d';

const initialState: DashboardState = {
  summaries: {},
  statusByScope: {},
  errorByScope: {},
  timeframeByScope: {},
  lastFetchedAt: {},
};

function resolveScopeStatus(state: DashboardState, scope: string) {
  if (!state.statusByScope[scope]) {
    state.statusByScope[scope] = 'idle';
  }
}

function resolveScopeError(state: DashboardState, scope: string) {
  if (!(scope in state.errorByScope)) {
    state.errorByScope[scope] = null;
  }
}

function resolveScopeTimeframe(state: DashboardState, scope: string) {
  if (!state.timeframeByScope[scope]) {
    state.timeframeByScope[scope] = DEFAULT_TIMEFRAME;
  }
}

function resolveScopeTimestamp(state: DashboardState, scope: string) {
  if (!(scope in state.lastFetchedAt)) {
    state.lastFetchedAt[scope] = null;
  }
}

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

  return 'Não foi possível carregar os indicadores.';
}

export const fetchDashboards = createAsyncThunk<
  { scope: string; summary: DashboardSummary; receivedAt: number },
  { scope: string; filters?: DashboardFilters },
  { rejectValue: { scope: string; error: string } }
>('dashboards/fetchSummary', async ({ scope, filters }, { rejectWithValue }) => {
  try {
    const result = await fetchDashboardSummary({ scope, ...filters });
    assertDashboardSuccess(result);
    return {
      scope,
      summary: result.data,
      receivedAt: Date.now(),
    };
  } catch (error) {
    return rejectWithValue({
      scope,
      error: resolveErrorMessage(error),
    });
  }
});

const dashboardsSlice = createSlice({
  name: 'dashboards',
  initialState,
  reducers: {
    setDashboardSummary(
      state,
      action: PayloadAction<{ scope: string; summary: DashboardSummary }>,
    ) {
      const { scope, summary } = action.payload;
      state.summaries[scope] = summary;
      resolveScopeTimestamp(state, scope);
      state.lastFetchedAt[scope] = Date.now();
    },
    setDashboardStatus(
      state,
      action: PayloadAction<{ scope: string; status: RequestStatus }>,
    ) {
      const { scope, status } = action.payload;
      resolveScopeStatus(state, scope);
      state.statusByScope[scope] = status;
      if (status !== 'failed') {
        resolveScopeError(state, scope);
        state.errorByScope[scope] = null;
      }
    },
    setDashboardError(
      state,
      action: PayloadAction<{ scope: string; error: string | null }>,
    ) {
      const { scope, error } = action.payload;
      resolveScopeError(state, scope);
      state.errorByScope[scope] = error;
      if (error) {
        resolveScopeStatus(state, scope);
        state.statusByScope[scope] = 'failed';
      }
    },
    setDashboardTimeframe(
      state,
      action: PayloadAction<{ scope: string; timeframe: DashboardTimeframe }>,
    ) {
      const { scope, timeframe } = action.payload;
      state.timeframeByScope[scope] = timeframe;
    },
    resetDashboardState(state, action: PayloadAction<string | undefined>) {
      const scope = action.payload;
      if (!scope) {
        state.summaries = {};
        state.statusByScope = {};
        state.errorByScope = {};
        state.timeframeByScope = {};
        state.lastFetchedAt = {};
        return;
      }

      delete state.summaries[scope];
      delete state.statusByScope[scope];
      delete state.errorByScope[scope];
      delete state.timeframeByScope[scope];
      delete state.lastFetchedAt[scope];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboards.pending, (state, action) => {
        const { scope } = action.meta.arg;
        resolveScopeStatus(state, scope);
        resolveScopeError(state, scope);
        resolveScopeTimeframe(state, scope);
        resolveScopeTimestamp(state, scope);
        state.statusByScope[scope] = 'loading';
        state.errorByScope[scope] = null;
      })
      .addCase(fetchDashboards.fulfilled, (state, action) => {
        const { scope, summary, receivedAt } = action.payload;
        state.summaries[scope] = summary;
        resolveScopeStatus(state, scope);
        resolveScopeError(state, scope);
        state.statusByScope[scope] = 'succeeded';
        state.errorByScope[scope] = null;
        resolveScopeTimestamp(state, scope);
        state.lastFetchedAt[scope] = receivedAt;
        resolveScopeTimeframe(state, scope);
        state.timeframeByScope[scope] = summary.timeframe ?? state.timeframeByScope[scope];
      })
      .addCase(fetchDashboards.rejected, (state, action) => {
        if (!action.payload) {
          return;
        }

        const { scope, error } = action.payload;
        resolveScopeStatus(state, scope);
        resolveScopeError(state, scope);
        state.statusByScope[scope] = 'failed';
        state.errorByScope[scope] = error;
      });
  },
});

export const {
  setDashboardSummary,
  setDashboardStatus,
  setDashboardError,
  setDashboardTimeframe,
  resetDashboardState,
} = dashboardsSlice.actions;

export default dashboardsSlice.reducer;

export const selectDashboardSummary = (
  state: RootState,
  scope: string,
): DashboardSummary | null => state.dashboards.summaries[scope] ?? null;

export const selectDashboardStatus = (
  state: RootState,
  scope: string,
): RequestStatus => state.dashboards.statusByScope[scope] ?? 'idle';

export const selectDashboardError = (
  state: RootState,
  scope: string,
): string | null => state.dashboards.errorByScope[scope] ?? null;

export const selectDashboardTimeframe = (
  state: RootState,
  scope: string,
): DashboardTimeframe =>
  state.dashboards.timeframeByScope[scope] ?? DEFAULT_TIMEFRAME;

export const selectDashboardLastFetchedAt = (
  state: RootState,
  scope: string,
): number | null => state.dashboards.lastFetchedAt[scope] ?? null;
