import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { createStore } from '../../store';
import { routes } from '../router';

async function renderWithRouter(initialEntries: string[] = ['/']) {
  const store = createStore();
  const router = createMemoryRouter(routes, { initialEntries });
  render(
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  );

  await screen.findByTestId('app-shell');
}

describe('AppShell integration', () => {
  it('renderiza cabeçalho, seletor de portfólio e painel de alertas', async () => {
    await renderWithRouter();

    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();

    const portfolioSelect = within(header).getByLabelText(/selecionar portfólio/i);
    expect(portfolioSelect).toBeEnabled();

    await waitFor(() => expect(screen.getByRole('heading', { name: /pipeline de originação/i })).toBeVisible());
  });

  it('permite navegação entre domínios', async () => {
    const user = userEvent.setup();
    await renderWithRouter(['/analysis']);

    await waitFor(() => expect(screen.getByRole('heading', { name: /análise e valuation/i })).toBeVisible());

    await user.click(screen.getByRole('link', { name: /portfólio/i }));
    await waitFor(() => expect(screen.getByRole('heading', { name: /gestão de portfólio/i })).toBeVisible());
  });
});
