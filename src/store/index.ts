import { configureStore, type PreloadedState } from '@reduxjs/toolkit';
import alertsReducer from './alertsSlice';
import portfolioReducer from './portfolioSlice';
import preferencesReducer from './preferencesSlice';

const reducer = {
  alerts: alertsReducer,
  portfolio: portfolioReducer,
  preferences: preferencesReducer
};

export const store = configureStore({
  reducer
});

export type AppStore = typeof store;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];

export const createStore = (preloadedState?: PreloadedState<RootState>) =>
  configureStore({
    reducer,
    preloadedState
  });
