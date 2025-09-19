import { PropsWithChildren } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import './layout.css';

export function AppLayout({ children }: PropsWithChildren) {
  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <h1>Prop-Stream Cockpit</h1>
        <nav>
          <NavLink to="/origination">Originação</NavLink>
          <NavLink to="/analysis">Análise</NavLink>
          <NavLink to="/portfolio">Portfólio</NavLink>
        </nav>
      </header>
      <main className="app-shell__main">{children ?? <Outlet />}</main>
    </div>
  );
}

export default AppLayout;
