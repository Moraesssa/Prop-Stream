import { configureStore } from '@reduxjs/toolkit';
import { originationReducer } from '../features/origination/slice';
import { analysisReducer } from '../features/analysis/slice';
import { portfolioReducer } from '../features/portfolio/slice';

export const store = configureStore({
  reducer: {
    origination: originationReducer,
    analysis: analysisReducer,
    portfolio: portfolioReducer
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
