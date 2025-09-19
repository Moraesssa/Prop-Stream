import { PropsWithChildren, useId, useState } from 'react';
import './AppShell.css';

export type AppShellProps = PropsWithChildren;

export function AppShell({ children }: AppShellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const alertsTitleId = useId();

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div className="app-shell__brand">Prop-Stream</div>
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
