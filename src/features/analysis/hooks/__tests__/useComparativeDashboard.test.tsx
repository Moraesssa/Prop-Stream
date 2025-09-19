import { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import * as api from '../../api';
import { useComparativeDashboard } from '../useComparativeDashboard';
import { analysisReducer } from '../../slice';
import { originationReducer } from '../../../origination/slice';
import { portfolioReducer } from '../../../portfolio/slice';

vi.mock('../../api');

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, cacheTime: 0 } } });
  const store = configureStore({
    reducer: {
      analysis: analysisReducer,
      origination: originationReducer,
      portfolio: portfolioReducer
    }
  });

  return ({ children }: PropsWithChildren) => (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </Provider>
  );
}

describe('useComparativeDashboard', () => {
  it('sincroniza dados carregados do dashboard', async () => {
    const metrics = [{ metric: 'Cap Rate', subject: 0.1, benchmark: 0.08 }];
    vi.mocked(api.fetchComparativeDashboard).mockResolvedValue(metrics);

    const { result } = renderHook(() => useComparativeDashboard(), {
      wrapper: createWrapper()
    });

    await waitFor(() => expect(result.current.metrics).toEqual(metrics));
    expect(result.current.query.data).toEqual(metrics);
  });
});
