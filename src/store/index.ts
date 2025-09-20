import { configureStore } from '@reduxjs/toolkit';

import dashboardsReducer from './dashboardsSlice';
import pipelineReducer from './pipelineSlice';
import portfolioReducer from './portfolioSlice';
import userReducer from './user';

export const store = configureStore({
  reducer: {
    pipeline: pipelineReducer,
    dashboards: dashboardsReducer,
    portfolio: portfolioReducer,
    user: userReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
