import { useEffect, useMemo } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from './hooks';
import { selectPortfolio, setPortfolios, type Portfolio } from '../store/portfolioSlice';
import { toggleTheme } from '../store/preferencesSlice';
import { dismissAlert, togglePanel } from '../store/alertsSlice';
import './AppShell.css';
import { EmptyState } from '../components/FeedbackState';

interface AppShellProps {
  portfolios: Portfolio[];
}

export function AppShell({ portfolios }: AppShellProps) {
  const dispatch = useAppDispatch();
  const { selectedPortfolioId, portfolios: statePortfolios } = useAppSelector((state) => state.portfolio);
  const { theme } = useAppSelector((state) => state.preferences);
  const { isOpen, items } = useAppSelector((state) => state.alerts);

  useEffect(() => {
    dispatch(setPortfolios(portfolios));
  }, [dispatch, portfolios]);

  useEffect(() => {
    if (portfolios.length > 0 && !selectedPortfolioId) {
      dispatch(selectPortfolio(portfolios[0].id));
    }
  }, [dispatch, portfolios, selectedPortfolioId]);

  const resolvedPortfolios = statePortfolios.length > 0 ? statePortfolios : portfolios;
  const selectValue = selectedPortfolioId ?? resolvedPortfolios[0]?.id ?? '';

  const activePortfolio = useMemo(
    () => resolvedPortfolios.find((portfolio) => portfolio.id === selectValue) ?? null,
    [resolvedPortfolios, selectValue]
  );

  return (
    <div className={`app-shell app-shell--${theme}`} data-testid="app-shell">
      <header className="app-shell__header" role="banner">
        <div className="app-shell__brand">
          <span className="app-shell__logo" aria-hidden>
            ⛰
          </span>
          <div>
            <h1>Prop-Stream</h1>
            <p className="app-shell__subtitle">Inteligência para investimentos imobiliários</p>
          </div>
        </div>
        <nav aria-label="Domínios do produto" className="app-shell__nav">
          <NavLink to="/origination">Originação</NavLink>
          <NavLink to="/analysis">Análise</NavLink>
          <NavLink to="/portfolio">Portfólio</NavLink>
        </nav>
        <div className="app-shell__actions">
          <label className="app-shell__portfolio">
            <span>Portfólio</span>
            <select
              disabled={resolvedPortfolios.length === 0}
              value={selectValue}
              onChange={(event) => dispatch(selectPortfolio(event.target.value))}
              aria-label="Selecionar portfólio"
            >
              {resolvedPortfolios.map((portfolio) => (
                <option key={portfolio.id} value={portfolio.id}>
                  {portfolio.name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => dispatch(toggleTheme())} className="app-shell__button">
            Alternar tema
          </button>
          <button
            type="button"
            onClick={() => dispatch(togglePanel())}
            className="app-shell__button"
            aria-expanded={isOpen}
            aria-controls="alert-panel"
          >
            Alertas ({items.length})
          </button>
        </div>
      </header>
      <div className="app-shell__layout">
        <main className="app-shell__main" role="main">
          {resolvedPortfolios.length === 0 ? (
            <EmptyState message="Cadastre um portfólio para desbloquear os painéis de performance." />
          ) : (
            <>
              {activePortfolio ? (
                <header className="app-shell__context">
                  <h2>{activePortfolio.name}</h2>
                  <p>
                    Segmento: {activePortfolio.segment} · Patrimônio sob gestão:{' '}
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(activePortfolio.aum)}
                  </p>
                </header>
              ) : null}
              <Outlet />
            </>
          )}
        </main>
        <aside
          id="alert-panel"
          className={`app-shell__alerts ${isOpen ? 'app-shell__alerts--open' : ''}`}
          aria-live="polite"
          aria-hidden={!isOpen}
        >
          <header className="app-shell__alerts-header">
            <h2>Alertas</h2>
            <button type="button" onClick={() => dispatch(togglePanel())} className="app-shell__button">
              Fechar
            </button>
          </header>
          <ul className="app-shell__alerts-list">
            {items.length === 0 ? (
              <li className="app-shell__alerts-empty">Nenhum alerta ativo.</li>
            ) : (
              items.map((alert) => (
                <li key={alert.id} className={`app-shell__alert app-shell__alert--${alert.severity}`}>
                  <div>
                    <p className="app-shell__alert-message">{alert.message}</p>
                    <time dateTime={alert.timestamp}>
                      {new Date(alert.timestamp).toLocaleString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: 'short'
                      })}
                    </time>
                  </div>
                  <button type="button" onClick={() => dispatch(dismissAlert(alert.id))} className="app-shell__button">
                    Arquivar
                  </button>
                </li>
              ))
            )}
          </ul>
        </aside>
      </div>
    </div>
  );
}
