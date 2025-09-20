import { PropsWithChildren, useEffect, useId, useState } from 'react';
import './AppShell.css';

export type AppShellProps = PropsWithChildren;

const DOMAINS = [
  { label: 'Originação de Negócios', path: '/originacao' },
  { label: 'Análise e Valuation', path: '/analise' },
  { label: 'Gestão de Portfólio', path: '/gestao' },
] as const;

const PORTFOLIO_OPTIONS = [
  { label: 'Todos os Portfólios', value: 'all' },
  { label: 'Fundo Tático FIIs', value: 'fiis-tatico' },
  { label: 'Residencial Premium', value: 'residencial-premium' },
  { label: 'Logística Norte', value: 'logistica-norte' },
] as const;

const PORTFOLIO_STORAGE_KEY = 'prop-stream:selected-portfolio';

export function AppShell({ children }: AppShellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const alertsTitleId = useId();
  const portfolioLabelId = useId();
  const [selectedPortfolio, setSelectedPortfolio] = useState(() => {
    if (typeof window === 'undefined') {
      return PORTFOLIO_OPTIONS[0]?.value ?? '';
    }

    return (
      window.localStorage.getItem(PORTFOLIO_STORAGE_KEY) ??
      (PORTFOLIO_OPTIONS[0]?.value ?? '')
    );
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !selectedPortfolio) {
      return;
    }

    window.localStorage.setItem(
      PORTFOLIO_STORAGE_KEY,
      selectedPortfolio
    );
  }, [selectedPortfolio]);

  const currentPath =
    typeof window !== 'undefined' ? window.location.pathname : '/';

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div className="app-shell__brand">Prop-Stream</div>
        <nav className="app-shell__nav" aria-label="Navegação principal">
          <ul
            className="app-shell__nav-list"
            role="menubar"
            aria-orientation="horizontal"
          >
            {DOMAINS.map((domain) => {
              const isActive =
                currentPath === domain.path ||
                currentPath.startsWith(`${domain.path}/`);

              return (
                <li
                  key={domain.path}
                  role="none"
                  className="app-shell__nav-item"
                >
                  <a
                    href={domain.path}
                    role="menuitem"
                    className={`app-shell__nav-link${
                      isActive ? ' app-shell__nav-link--active' : ''
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {domain.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="app-shell__controls">
          <div className="app-shell__portfolio">
            <label
              htmlFor={portfolioLabelId}
              className="app-shell__portfolio-label"
            >
              Portfólio ativo
            </label>
            <select
              id={portfolioLabelId}
              className="app-shell__portfolio-select"
              value={selectedPortfolio}
              onChange={(event) => setSelectedPortfolio(event.target.value)}
            >
              {PORTFOLIO_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="app-shell__alerts-toggle"
            aria-pressed={isOpen}
            aria-expanded={isOpen}
            aria-controls="app-shell-alerts"
            onClick={() => setIsOpen((previous) => !previous)}
          >
            {isOpen ? 'Fechar alertas' : 'Abrir alertas'}
          </button>
        </div>
      </header>

      <div
        className={`app-shell__layout${
          isOpen ? ' app-shell__layout--alerts-open' : ''
        }`}
      >
        <main className="app-shell__main" role="main">
          {children}
        </main>

        <aside
          id="app-shell-alerts"
          role="complementary"
          aria-labelledby={alertsTitleId}
          aria-hidden={!isOpen}
          className={`app-shell__alerts${isOpen ? ' app-shell__alerts--open' : ''}`}
        >
          <div className="app-shell__alerts-header">
            <h2 id={alertsTitleId}>Alertas</h2>
            <button type="button" onClick={() => setIsOpen(false)}>
              Fechar
            </button>
          </div>
          <ul className="app-shell__alerts-list">
            <li>Nenhum alerta no momento.</li>
          </ul>
        </aside>
      </div>

      <button
        type="button"
        className={`app-shell__backdrop${isOpen ? ' app-shell__backdrop--visible' : ''}`}
        aria-hidden={!isOpen}
        tabIndex={isOpen ? 0 : -1}
        onClick={() => setIsOpen(false)}
      >
        <span className="sr-only">Fechar painel de alertas</span>
      </button>
    </div>
  );
}

export default AppShell;
