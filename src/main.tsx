import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import App from '@/App';
import AppErrorBoundary from '@/app/AppErrorBoundary';
import ToastProvider from '@/app/ToastProvider';
import RealtimeManager from '@/app/RealtimeManager';
import { store } from '@/store';
import { initializeAuthService } from '@/services/auth';
import { resetUserState } from '@/store/user';
import '@/index.css';

const queryClient = new QueryClient();

initializeAuthService({
  onUnauthorized: () => {
    store.dispatch(resetUserState());
  },
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ToastProvider>
            <RealtimeManager />
            <AppErrorBoundary>
              <App />
            </AppErrorBoundary>
          </ToastProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  </React.StrictMode>,
);
