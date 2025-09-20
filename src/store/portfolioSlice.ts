import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { RootState } from './index';
import type {
  PortfolioFilters,
  PortfolioSnapshot,
} from '@/services/portfolioService';
import {
  assertPortfolioSuccess,
  fetchPortfolioSnapshot,
} from '@/services/portfolioService';
import type { RequestStatus } from './pipelineSlice';

interface PortfolioState {
  activePortfolioId: string;
  snapshots: Record<string, PortfolioSnapshot | null>;
  statusByPortfolio: Record<string, RequestStatus>;
  errorByPortfolio: Record<string, string | null>;
  lastFetchedAt: Record<string, number | null>;
}

const DEFAULT_PORTFOLIO_ID = 'all';

const initialState: PortfolioState = {
  activePortfolioId: DEFAULT_PORTFOLIO_ID,
  snapshots: {},
  statusByPortfolio: {},
  errorByPortfolio: {},
  lastFetchedAt: {},
};

function resolvePortfolioStatus(state: PortfolioState, portfolioId: string) {
  if (!state.statusByPortfolio[portfolioId]) {
    state.statusByPortfolio[portfolioId] = 'idle';
  }
}

function resolvePortfolioError(state: PortfolioState, portfolioId: string) {
  if (!(portfolioId in state.errorByPortfolio)) {
    state.errorByPortfolio[portfolioId] = null;
  }
}

function resolvePortfolioTimestamp(state: PortfolioState, portfolioId: string) {
  if (!(portfolioId in state.lastFetchedAt)) {
    state.lastFetchedAt[portfolioId] = null;
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

  return 'Não foi possível carregar os dados do portfólio.';
}

export const fetchPortfolio = createAsyncThunk<
  { portfolioId: string; snapshot: PortfolioSnapshot; receivedAt: number },
  { portfolioId: string; filters?: PortfolioFilters },
  { rejectValue: { portfolioId: string; error: string } }
>('portfolio/fetchSnapshot', async ({ portfolioId, filters }, { rejectWithValue }) => {
  try {
    const result = await fetchPortfolioSnapshot({
      portfolioId,
      ...filters,
    });
    assertPortfolioSuccess(result);
    return {
      portfolioId,
      snapshot: result.data,
      receivedAt: Date.now(),
    };
  } catch (error) {
    return rejectWithValue({
      portfolioId,
      error: resolveErrorMessage(error),
    });
  }
});

const portfolioSlice = createSlice({
  name: 'portfolio',
  initialState,
  reducers: {
    setActivePortfolioId(state, action: PayloadAction<string>) {
      state.activePortfolioId = action.payload;
    },
    setPortfolioSnapshot(
      state,
      action: PayloadAction<{ portfolioId: string; snapshot: PortfolioSnapshot }>,
    ) {
      const { portfolioId, snapshot } = action.payload;
      state.snapshots[portfolioId] = snapshot;
      resolvePortfolioTimestamp(state, portfolioId);
      state.lastFetchedAt[portfolioId] = Date.now();
    },
    setPortfolioStatus(
      state,
      action: PayloadAction<{ portfolioId: string; status: RequestStatus }>,
    ) {
      const { portfolioId, status } = action.payload;
      resolvePortfolioStatus(state, portfolioId);
      state.statusByPortfolio[portfolioId] = status;
      if (status !== 'failed') {
        resolvePortfolioError(state, portfolioId);
        state.errorByPortfolio[portfolioId] = null;
      }
    },
    setPortfolioError(
      state,
      action: PayloadAction<{ portfolioId: string; error: string | null }>,
    ) {
      const { portfolioId, error } = action.payload;
      resolvePortfolioError(state, portfolioId);
      state.errorByPortfolio[portfolioId] = error;
      if (error) {
        resolvePortfolioStatus(state, portfolioId);
        state.statusByPortfolio[portfolioId] = 'failed';
      }
    },
    resetPortfolioState(state, action: PayloadAction<string | undefined>) {
      const portfolioId = action.payload;
      if (!portfolioId) {
        state.snapshots = {};
        state.statusByPortfolio = {};
        state.errorByPortfolio = {};
        state.lastFetchedAt = {};
        return;
      }

      delete state.snapshots[portfolioId];
      delete state.statusByPortfolio[portfolioId];
      delete state.errorByPortfolio[portfolioId];
      delete state.lastFetchedAt[portfolioId];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPortfolio.pending, (state, action) => {
        const { portfolioId } = action.meta.arg;
        resolvePortfolioStatus(state, portfolioId);
        resolvePortfolioError(state, portfolioId);
        resolvePortfolioTimestamp(state, portfolioId);
        state.statusByPortfolio[portfolioId] = 'loading';
        state.errorByPortfolio[portfolioId] = null;
      })
      .addCase(fetchPortfolio.fulfilled, (state, action) => {
        const { portfolioId, snapshot, receivedAt } = action.payload;
        state.snapshots[portfolioId] = snapshot;
        resolvePortfolioStatus(state, portfolioId);
        resolvePortfolioError(state, portfolioId);
        state.statusByPortfolio[portfolioId] = 'succeeded';
        state.errorByPortfolio[portfolioId] = null;
        resolvePortfolioTimestamp(state, portfolioId);
        state.lastFetchedAt[portfolioId] = receivedAt;
      })
      .addCase(fetchPortfolio.rejected, (state, action) => {
        if (!action.payload) {
          return;
        }

        const { portfolioId, error } = action.payload;
        resolvePortfolioStatus(state, portfolioId);
        resolvePortfolioError(state, portfolioId);
        state.statusByPortfolio[portfolioId] = 'failed';
        state.errorByPortfolio[portfolioId] = error;
      });
  },
});

export const {
  setActivePortfolioId,
  setPortfolioSnapshot,
  setPortfolioStatus,
  setPortfolioError,
  resetPortfolioState,
} = portfolioSlice.actions;

export default portfolioSlice.reducer;

export const selectActivePortfolioId = (state: RootState): string =>
  state.portfolio.activePortfolioId ?? DEFAULT_PORTFOLIO_ID;

export const selectPortfolioSnapshot = (
  state: RootState,
  portfolioId?: string,
): PortfolioSnapshot | null => {
  const effectiveId = portfolioId ?? selectActivePortfolioId(state);
  return state.portfolio.snapshots[effectiveId] ?? null;
};

export const selectPortfolioStatus = (
  state: RootState,
  portfolioId?: string,
): RequestStatus => {
  const effectiveId = portfolioId ?? selectActivePortfolioId(state);
  return state.portfolio.statusByPortfolio[effectiveId] ?? 'idle';
};

export const selectPortfolioError = (
  state: RootState,
  portfolioId?: string,
): string | null => {
  const effectiveId = portfolioId ?? selectActivePortfolioId(state);
  return state.portfolio.errorByPortfolio[effectiveId] ?? null;
};

export const selectPortfolioLastFetchedAt = (
  state: RootState,
  portfolioId?: string,
): number | null => {
  const effectiveId = portfolioId ?? selectActivePortfolioId(state);
  return state.portfolio.lastFetchedAt[effectiveId] ?? null;
};
