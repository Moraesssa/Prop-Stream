import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { store } from '@/store';

import App from './App';

describe('App', () => {
  it('renderiza o título principal', () => {
    const queryClient = new QueryClient();
    render(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <App />
          </MemoryRouter>
        </QueryClientProvider>
      </Provider>,
    );
    expect(screen.getByRole('heading', { name: /prop-stream/i })).toBeInTheDocument();
    queryClient.clear();
  });
});
