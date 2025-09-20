import { configureStore } from '@reduxjs/toolkit';

import dashboardsReducer from './dashboardsSlice';
import pipelineReducer from './pipelineSlice';
import portfolioReducer from './portfolioSlice';

export const store = configureStore({
  reducer: {
    pipeline: pipelineReducer,
    dashboards: dashboardsReducer,
    portfolio: portfolioReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
