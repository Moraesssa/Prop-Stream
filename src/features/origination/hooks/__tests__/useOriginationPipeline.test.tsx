import { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import * as api from '../../api';
import { useOriginationPipeline } from '../useOriginationPipeline';
import { originationReducer } from '../../slice';
import { analysisReducer } from '../../../analysis/slice';
import { portfolioReducer } from '../../../portfolio/slice';

vi.mock('../../api');

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, cacheTime: 0 } }
  });
  const store = configureStore({
    reducer: {
      origination: originationReducer,
      analysis: analysisReducer,
      portfolio: portfolioReducer
    }
  });

  return ({ children }: PropsWithChildren) => (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </Provider>
  );
}

describe('useOriginationPipeline', () => {
  it('carrega e expõe o pipeline sincronizado com o Redux', async () => {
    const mockedPipeline = [
      { id: '1', propertyName: 'Imóvel', stage: 'analysis', expectedReturn: 0.1 }
    ];
    vi.mocked(api.fetchPipeline).mockResolvedValue(mockedPipeline);

    const { result } = renderHook(() => useOriginationPipeline(), {
      wrapper: createWrapper()
    });

    await waitFor(() => expect(result.current.pipeline).toEqual(mockedPipeline));
    expect(result.current.query.data).toEqual(mockedPipeline);
  });
});
