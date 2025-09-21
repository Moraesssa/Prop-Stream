import { configureStore } from '@reduxjs/toolkit';

import dashboardsReducer from './dashboardsSlice';
import alertsReducer from './alertsSlice';
import pipelineReducer from './pipelineSlice';
import portfolioReducer from './portfolioSlice';
import userReducer from './user';

export const store = configureStore({
  reducer: {
    pipeline: pipelineReducer,
    dashboards: dashboardsReducer,
    portfolio: portfolioReducer,
    user: userReducer,
    alerts: alertsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
