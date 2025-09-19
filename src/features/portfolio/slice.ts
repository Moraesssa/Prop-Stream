import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../../app/store';
import { adjustAlertThreshold, AlertAdjustmentPayload, AssetSnapshot } from './api';

export interface PortfolioState {
  assets: AssetSnapshot[];
  updatingAlert: boolean;
  optimisticSnapshot?: AssetSnapshot[];
  error?: string;
}

const initialState: PortfolioState = {
  assets: [],
  updatingAlert: false
};

export const adjustAlerts = createAsyncThunk(
  'portfolio/adjustAlerts',
  async (payload: AlertAdjustmentPayload) => {
    const asset = await adjustAlertThreshold(payload);
    return asset;
  }
);

const portfolioSlice = createSlice({
  name: 'portfolio',
  initialState,
  reducers: {
    portfolioLoaded(state, action: PayloadAction<AssetSnapshot[]>) {
      state.assets = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(adjustAlerts.pending, (state, action) => {
        state.updatingAlert = true;
        state.error = undefined;
        state.optimisticSnapshot = state.assets;
        const { assetId, threshold } = action.meta.arg;
        const exists = state.assets.some((asset) => asset.id === assetId);
        if (exists) {
          state.assets = state.assets.map((asset) =>
            asset.id === assetId ? { ...asset, allocation: threshold / 100 } : asset
          );
        } else {
          state.assets = [
            ...state.assets,
            {
              id: assetId,
              name: 'Novo ativo',
              allocation: threshold / 100,
              riskLevel: 'médio'
            }
          ];
        }
      })
      .addCase(adjustAlerts.fulfilled, (state, action) => {
        state.updatingAlert = false;
        state.assets = state.assets.map((asset) =>
          asset.id === action.payload.id ? action.payload : asset
        );
        state.optimisticSnapshot = undefined;
      })
      .addCase(adjustAlerts.rejected, (state, action) => {
        state.updatingAlert = false;
        state.error = action.error.message;
        if (state.optimisticSnapshot) {
          state.assets = state.optimisticSnapshot;
        }
        state.optimisticSnapshot = undefined;
      });
  }
});

export const { portfolioLoaded } = portfolioSlice.actions;
export const portfolioReducer = portfolioSlice.reducer;

export const selectPortfolioAssets = (state: RootState) => state.portfolio.assets;
export const selectUpdatingAlert = (state: RootState) => state.portfolio.updatingAlert;
