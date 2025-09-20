import { NavLink, Outlet, Route, Routes } from 'react-router-dom';

type NavigationLink = {
  readonly label: string;
  readonly to: string;
  readonly end?: boolean;
};

const LINKS: NavigationLink[] = [
  { label: 'Visão geral', to: '.', end: true },
  { label: 'Modelagem de valuation', to: 'modelagem' },
  { label: 'Cenários e sensibilidade', to: 'cenarios' },
];

function AnalysisLayout() {
  return (
    <section className="domain domain--analysis">
      <header className="domain__header">
        <h1>Análise e Valuation</h1>
        <p>
          Construa modelos financeiros avançados, compare hipóteses e valide o
          retorno esperado antes de cada investimento.
        </p>
      </header>

      <nav className="domain__nav" aria-label="Sessões de análise">
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

function AnalysisOverview() {
  return (
    <article className="domain__section">
      <h2>Indicadores de análise</h2>
      <p>
        Consulte rapidamente fluxo de caixa descontado, cap rates e métricas de
        risco para cada ativo em avaliação.
      </p>
    </article>
  );
}

function AnalysisValuation() {
  return (
    <article className="domain__section">
      <h2>Modelagem de valuation</h2>
      <p>
        Configure parâmetros, taxas e premissas de saída para projetar cenários
        otimizados de retorno financeiro e validar o preço-alvo de aquisição.
      </p>
    </article>
  );
}

function AnalysisScenarios() {
  return (
    <article className="domain__section">
      <h2>Cenários e sensibilidade</h2>
      <p>
        Simule choques de mercado, alterações de vacância e custos operacionais
        para entender o impacto nas métricas principais de desempenho.
      </p>
    </article>
  );
}

export default function AnalysisDomain() {
  return (
    <Routes>
      <Route element={<AnalysisLayout />}>
        <Route index element={<AnalysisOverview />} />
        <Route path="modelagem" element={<AnalysisValuation />} />
        <Route path="cenarios" element={<AnalysisScenarios />} />
      </Route>
    </Routes>
  );
}
