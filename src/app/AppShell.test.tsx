import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import AppShell from './AppShell';
import portfolioReducer from '@/store/portfolioSlice';
import pipelineReducer from '@/store/pipelineSlice';
import dashboardsReducer from '@/store/dashboardsSlice';
import userReducer from '@/store/user';

const PORTFOLIO_STORAGE_KEY = 'prop-stream:selected-portfolio';

function createTestStore() {
  return configureStore({
    reducer: {
      pipeline: pipelineReducer,
      dashboards: dashboardsReducer,
      portfolio: portfolioReducer,
      user: userReducer,
    },
  });
}

describe('AppShell', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('restaura o portfólio padrão quando encontra um ID obsoleto no armazenamento', async () => {
    window.localStorage.setItem(PORTFOLIO_STORAGE_KEY, 'obsoleto');
    const store = createTestStore();

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<AppShell />}>
              <Route index element={<div>Início</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </Provider>,
    );

    const portfolioSelect = await screen.findByLabelText(/portfólio ativo/i);

    await waitFor(() => {
      expect(portfolioSelect).toHaveValue('all');
      expect(window.localStorage.getItem(PORTFOLIO_STORAGE_KEY)).toBe('all');
    });
  });
});
