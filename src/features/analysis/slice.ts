import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../../app/store';
import { ComparativeMetric, SimulationPayload, runScenario } from './api';

export interface AnalysisState {
  metrics: ComparativeMetric[];
  runningSimulation: boolean;
  optimisticSnapshot?: ComparativeMetric[];
  error?: string;
}

const initialState: AnalysisState = {
  metrics: [],
  runningSimulation: false
};

export const executeSimulation = createAsyncThunk(
  'analysis/executeSimulation',
  async (payload: SimulationPayload) => {
    const metrics = await runScenario(payload);
    return { metrics };
  }
);

const analysisSlice = createSlice({
  name: 'analysis',
  initialState,
  reducers: {
    dashboardLoaded(state, action: PayloadAction<ComparativeMetric[]>) {
      state.metrics = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(executeSimulation.pending, (state, action) => {
        state.runningSimulation = true;
        state.error = undefined;
        state.optimisticSnapshot = state.metrics;
        state.metrics = state.metrics.map((metric) => ({
          ...metric,
          subject: metric.subject * (action.meta.arg.capital / 1_000_000)
        }));
      })
      .addCase(executeSimulation.fulfilled, (state, action) => {
        state.runningSimulation = false;
        state.metrics = action.payload.metrics;
        state.optimisticSnapshot = undefined;
      })
      .addCase(executeSimulation.rejected, (state, action) => {
        state.runningSimulation = false;
        state.error = action.error.message;
        if (state.optimisticSnapshot) {
          state.metrics = state.optimisticSnapshot;
        }
        state.optimisticSnapshot = undefined;
      });
  }
});

export const { dashboardLoaded } = analysisSlice.actions;
export const analysisReducer = analysisSlice.reducer;

export const selectAnalysisMetrics = (state: RootState) => state.analysis.metrics;
export const selectRunningSimulation = (state: RootState) => state.analysis.runningSimulation;
