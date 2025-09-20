import { NavLink, Outlet, Route, Routes } from 'react-router-dom';

type NavigationLink = {
  readonly label: string;
  readonly to: string;
  readonly end?: boolean;
};

const LINKS: NavigationLink[] = [
  { label: 'Visão geral', to: '.', end: true },
  { label: 'Distribuição de portfólio', to: 'distribuicao' },
  { label: 'Indicadores operacionais', to: 'indicadores' },
];

function PortfolioLayout() {
  return (
    <section className="domain domain--portfolio">
      <header className="domain__header">
        <h1>Gestão de Portfólio</h1>
        <p>
          Acompanhe KPIs operacionais, desempenho financeiro e metas de cada
          veículo de investimento imobiliário.
        </p>
      </header>

      <nav className="domain__nav" aria-label="Sessões de gestão de portfólio">
        <ul className="domain__nav-list">
          {LINKS.map((link) => (
            <li key={link.to} className="domain__nav-item">
              <NavLink
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `domain__nav-link${
                    isActive ? ' domain__nav-link--active' : ''
                  }`
                }
              >
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="domain__content">
        <Outlet />
      </div>
    </section>
  );
}

function PortfolioOverview() {
  return (
    <article className="domain__section">
      <h2>Visão consolidada</h2>
      <p>
        Monitore patrimônio líquido, distribuição geográfica e principais
        eventos de cada portfólio sob gestão.
      </p>
    </article>
  );
}

function PortfolioDistribution() {
  return (
    <article className="domain__section">
      <h2>Distribuição de portfólio</h2>
      <p>
        Analise a composição dos ativos por classe, estágio de desenvolvimento e
        alocação prevista versus realizada.
      </p>
    </article>
  );
}

function PortfolioIndicators() {
  return (
    <article className="domain__section">
      <h2>Indicadores operacionais</h2>
      <p>
        Acompanhe ocupação, inadimplência e despesas recorrentes para agir
        rapidamente sobre ativos fora da meta.
      </p>
    </article>
  );
}

export default function PortfolioDomain() {
  return (
    <Routes>
      <Route element={<PortfolioLayout />}>
        <Route index element={<PortfolioOverview />} />
        <Route path="distribuicao" element={<PortfolioDistribution />} />
        <Route path="indicadores" element={<PortfolioIndicators />} />
      </Route>
    </Routes>
  );
}
