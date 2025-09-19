import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../../app/store';
import { Opportunity, ProposalPayload, submitProposal } from './api';

export interface OriginationState {
  pipeline: Opportunity[];
  submitting: boolean;
  optimisticSnapshot?: Opportunity[];
  error?: string;
}

const initialState: OriginationState = {
  pipeline: [],
  submitting: false
};

export const sendProposal = createAsyncThunk(
  'origination/sendProposal',
  async (payload: ProposalPayload) => {
    const response = await submitProposal(payload);
    return response;
  }
);

const originationSlice = createSlice({
  name: 'origination',
  initialState,
  reducers: {
    pipelineLoaded(state, action: PayloadAction<Opportunity[]>) {
      state.pipeline = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendProposal.pending, (state, action) => {
        state.submitting = true;
        state.error = undefined;
        state.optimisticSnapshot = state.pipeline;
        state.pipeline = state.pipeline.map((opportunity) =>
          opportunity.id === action.meta.arg.opportunityId
            ? { ...opportunity, stage: 'negotiation' }
            : opportunity
        );
      })
      .addCase(sendProposal.fulfilled, (state, action) => {
        state.submitting = false;
        state.pipeline = state.pipeline.map((opportunity) =>
          opportunity.id === action.payload.id ? action.payload : opportunity
        );
        state.optimisticSnapshot = undefined;
      })
      .addCase(sendProposal.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.error.message;
        if (state.optimisticSnapshot) {
          state.pipeline = state.optimisticSnapshot;
        }
        state.optimisticSnapshot = undefined;
      });
  }
});

export const { pipelineLoaded } = originationSlice.actions;
export const originationReducer = originationSlice.reducer;

export const selectOriginationPipeline = (state: RootState) => state.origination.pipeline;
export const selectOriginationSubmitting = (state: RootState) => state.origination.submitting;
