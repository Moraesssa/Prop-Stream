import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { RootState } from './index';

export type AlertSeverity = 'info' | 'success' | 'warning' | 'error';

export interface AlertItem {
  id: string;
  title: string;
  description?: string;
  severity: AlertSeverity;
  source?: string;
  receivedAt: number;
  metadata?: Record<string, unknown>;
}

interface AlertsState {
  items: AlertItem[];
  lastUpdatedAt: number | null;
}

const MAX_ALERTS = 50;

const initialState: AlertsState = {
  items: [],
  lastUpdatedAt: null,
};

function upsertAlertItem(items: AlertItem[], incoming: AlertItem): AlertItem[] {
  const filtered = items.filter((item) => item.id !== incoming.id);
  return [incoming, ...filtered].slice(0, MAX_ALERTS);
}

const alertsSlice = createSlice({
  name: 'alerts',
  initialState,
  reducers: {
    upsertAlert(state, action: PayloadAction<AlertItem>) {
      state.items = upsertAlertItem(state.items, action.payload);
      state.lastUpdatedAt = action.payload.receivedAt;
    },
    upsertManyAlerts(state, action: PayloadAction<AlertItem[]>) {
      const alerts = action.payload;
      if (alerts.length === 0) {
        return;
      }

      const map = new Map<string, AlertItem>();
      [...alerts, ...state.items].forEach((alert) => {
        if (!map.has(alert.id)) {
          map.set(alert.id, alert);
        }
      });

      state.items = Array.from(map.values())
        .sort((a, b) => b.receivedAt - a.receivedAt)
        .slice(0, MAX_ALERTS);
      state.lastUpdatedAt = Date.now();
    },
    removeAlert(state, action: PayloadAction<string>) {
      state.items = state.items.filter((item) => item.id !== action.payload);
      state.lastUpdatedAt = Date.now();
    },
    setAlerts(state, action: PayloadAction<AlertItem[]>) {
      state.items = action.payload.slice(0, MAX_ALERTS);
      state.lastUpdatedAt = Date.now();
    },
    clearAlerts(state) {
      state.items = [];
      state.lastUpdatedAt = Date.now();
    },
  },
});

export const { upsertAlert, upsertManyAlerts, removeAlert, setAlerts, clearAlerts } =
  alertsSlice.actions;

export default alertsSlice.reducer;

export const selectAlerts = (state: RootState): AlertItem[] => state.alerts.items;

export const selectAlertsLastUpdatedAt = (state: RootState): number | null =>
  state.alerts.lastUpdatedAt;
