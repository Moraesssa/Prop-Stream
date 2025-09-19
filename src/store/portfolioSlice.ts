import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface Portfolio {
  id: string;
  name: string;
  segment: 'Residencial' | 'Comercial' | 'Industrial' | 'Misto';
  aum: number;
}

interface PortfolioState {
  portfolios: Portfolio[];
  selectedPortfolioId: string | null;
}

const initialState: PortfolioState = {
  portfolios: [],
  selectedPortfolioId: null
};

const portfolioSlice = createSlice({
  name: 'portfolio',
  initialState,
  reducers: {
    setPortfolios(state, action: PayloadAction<Portfolio[]>) {
      state.portfolios = action.payload;
      if (state.portfolios.length === 0) {
        state.selectedPortfolioId = null;
        return;
      }

      if (!state.selectedPortfolioId || !state.portfolios.some(({ id }) => id === state.selectedPortfolioId)) {
        state.selectedPortfolioId = state.portfolios[0].id;
      }
    },
    selectPortfolio(state, action: PayloadAction<string>) {
      state.selectedPortfolioId = action.payload;
    }
  }
});

export const { setPortfolios, selectPortfolio } = portfolioSlice.actions;
export default portfolioSlice.reducer;
