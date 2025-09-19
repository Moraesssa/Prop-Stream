import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface AlertItem {
  id: string;
  severity: AlertSeverity;
  message: string;
  timestamp: string;
}

interface AlertsState {
  isOpen: boolean;
  items: AlertItem[];
}

const initialState: AlertsState = {
  isOpen: false,
  items: [
    {
      id: nanoid(),
      severity: 'warning',
      message: 'Vacância do portfólio comercial acima do limite projetado.',
      timestamp: new Date().toISOString()
    },
    {
      id: nanoid(),
      severity: 'critical',
      message: 'Oferta vencedora pendente de assinatura expira em 2 horas.',
      timestamp: new Date().toISOString()
    }
  ]
};

const alertsSlice = createSlice({
  name: 'alerts',
  initialState,
  reducers: {
    togglePanel(state) {
      state.isOpen = !state.isOpen;
    },
    closePanel(state) {
      state.isOpen = false;
    },
    addAlert: {
      reducer(state, action: PayloadAction<AlertItem>) {
        state.items.unshift(action.payload);
      },
      prepare(message: string, severity: AlertSeverity = 'info') {
        return {
          payload: {
            id: nanoid(),
            message,
            severity,
            timestamp: new Date().toISOString()
          }
        };
      }
    },
    dismissAlert(state, action: PayloadAction<string>) {
      state.items = state.items.filter((item) => item.id !== action.payload);
    }
  }
});

export const { togglePanel, closePanel, addAlert, dismissAlert } = alertsSlice.actions;
export default alertsSlice.reducer;
