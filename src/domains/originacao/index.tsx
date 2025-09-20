import { NavLink, Outlet, Route, Routes } from 'react-router-dom';

type NavigationLink = {
  readonly label: string;
  readonly to: string;
  readonly end?: boolean;
};

const LINKS: NavigationLink[] = [
  { label: 'Visão geral', to: '.', end: true },
  { label: 'Pipeline de negócios', to: 'pipeline' },
  { label: 'Relatórios e indicadores', to: 'relatorios' },
];

function OriginationLayout() {
  return (
    <section className="domain domain--origination">
      <header className="domain__header">
        <h1>Originação de Negócios</h1>
        <p>
          Gerencie o funil de prospecção, organize oportunidades e acompanhe a
          performance das equipes comerciais em tempo real.
        </p>
      </header>

      <nav className="domain__nav" aria-label="Sessões de originação">
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

function OriginationOverview() {
  return (
    <article className="domain__section">
      <h2>Resumo das captações</h2>
      <p>
        Visualize os indicadores críticos da originação, como volume captado
        por região, taxa de conversão por etapa e oportunidades com prioridade
        máxima.
      </p>
    </article>
  );
}

function OriginationPipeline() {
  return (
    <article className="domain__section">
      <h2>Pipeline de negócios</h2>
      <p>
        Consolide oportunidades por estágio, identifique gargalos e acompanhe
        responsáveis com atraso para garantir a fluidez do funil.
      </p>
    </article>
  );
}

function OriginationReports() {
  return (
    <article className="domain__section">
      <h2>Relatórios e indicadores</h2>
      <p>
        Gere relatórios personalizáveis com métricas de originação, taxas de
        sucesso e performance comparativa entre períodos.
      </p>
    </article>
  );
}

export default function OriginationDomain() {
  return (
    <Routes>
      <Route element={<OriginationLayout />}>
        <Route index element={<OriginationOverview />} />
        <Route path="pipeline" element={<OriginationPipeline />} />
        <Route path="relatorios" element={<OriginationReports />} />
      </Route>
    </Routes>
  );
}
