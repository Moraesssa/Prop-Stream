import { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import * as api from '../../api';
import { usePortfolioOverview } from '../usePortfolioOverview';
import { portfolioReducer } from '../../slice';
import { analysisReducer } from '../../../analysis/slice';
import { originationReducer } from '../../../origination/slice';

vi.mock('../../api');

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, cacheTime: 0 } } });
  const store = configureStore({
    reducer: {
      portfolio: portfolioReducer,
      analysis: analysisReducer,
      origination: originationReducer
    }
  });

  return ({ children }: PropsWithChildren) => (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </Provider>
  );
}

describe('usePortfolioOverview', () => {
  it('retorna carteira consolidada via React Query', async () => {
    const assets = [{ id: '1', name: 'Ativo', allocation: 0.4, riskLevel: 'baixo' as const }];
    vi.mocked(api.fetchPortfolioOverview).mockResolvedValue(assets);

    const { result } = renderHook(() => usePortfolioOverview(), {
      wrapper: createWrapper()
    });

    await waitFor(() => expect(result.current.assets).toEqual(assets));
    expect(result.current.query.data).toEqual(assets);
  });
});
