import { ChangeEvent } from 'react';
import { Navigate, NavLink, Outlet, Route, Routes } from 'react-router-dom';

import {
  useDashboardSummaryQuery,
  useInvalidateDashboardSummary,
} from '@/hooks/useDashboardQueries';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  selectDashboardError,
  selectDashboardStatus,
  selectDashboardSummary,
  selectDashboardTimeframe,
  setDashboardTimeframe,
} from '@/store/dashboardsSlice';
import type { DashboardTimeframe } from '@/services/dashboardService';

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

const percentFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  maximumFractionDigits: 1,
});

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

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
  const dispatch = useAppDispatch();
  const timeframe = useAppSelector((state) =>
    selectDashboardTimeframe(state, 'analysis'),
  );
  const summary = useAppSelector((state) =>
    selectDashboardSummary(state, 'analysis'),
  );
  const status = useAppSelector((state) =>
    selectDashboardStatus(state, 'analysis'),
  );
  const error = useAppSelector((state) =>
    selectDashboardError(state, 'analysis'),
  );
  const invalidate = useInvalidateDashboardSummary('analysis');
  const query = useDashboardSummaryQuery('analysis', { timeframe });
  const metrics = summary?.metrics ?? [];

  const handleTimeframeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value as DashboardTimeframe;
    dispatch(setDashboardTimeframe({ scope: 'analysis', timeframe: value }));
    invalidate(value);
  };

  return (
    <article className="domain__section">
      <header className="domain__section-header domain__section-header--with-controls">
        <div>
          <h2>Indicadores de análise</h2>
          <p className="domain__section-caption">
            Fluxo de caixa descontado, cap rates e métricas de risco atuais.
          </p>
        </div>
        <label className="domain__toolbar-label" htmlFor="analysis-timeframe">
          Janela de tempo
          <select
            id="analysis-timeframe"
            className="domain__toolbar-select"
            value={timeframe}
            onChange={handleTimeframeChange}
          >
            <option value="7d">7 dias</option>
            <option value="30d">30 dias</option>
            <option value="90d">90 dias</option>
            <option value="180d">180 dias</option>
          </select>
        </label>
      </header>

      {status === 'failed' && error ? (
        <div className="domain__alert domain__alert--error" role="alert">
          {error}
        </div>
      ) : null}

      {query.isFetching ? (
        <p className="domain__status">Recalculando métricas…</p>
      ) : null}

      {summary ? (
        <div className="domain__metrics">
          {metrics.map((metric) => (
            <div key={metric.id} className="domain__metric">
              <dt className="domain__metric-title">{metric.label}</dt>
              <dd className="domain__metric-value">
                {metric.unit === 'percent'
                  ? percentFormatter.format(metric.value / 100)
                  : currencyFormatter.format(metric.value)}
              </dd>
              {metric.description ? (
                <dd className="domain__metric-caption">{metric.description}</dd>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p>Nenhum indicador disponível para o período selecionado.</p>
      )}
    </article>
  );
}

function AnalysisValuation() {
  const summary = useAppSelector((state) =>
    selectDashboardSummary(state, 'analysis'),
  );
  const breakdowns = summary?.breakdowns ?? [];

  return (
    <article className="domain__section">
      <header className="domain__section-header">
        <h2>Modelagem de valuation</h2>
        <p className="domain__section-caption">
          Ajuste premissas de retorno e compare ativos lado a lado.
        </p>
      </header>

      {summary ? (
        <div className="domain__table-wrapper">
          <table className="domain__table">
            <thead>
              <tr>
                <th>Ativo</th>
                <th>Cap rate</th>
                <th>Valuation base</th>
                <th>Sensibilidade</th>
              </tr>
            </thead>
            <tbody>
              {breakdowns.map((item) => (
                <tr key={item.id}>
                  <td>{item.label}</td>
                  <td>{percentFormatter.format((item.percentage ?? 0) / 100)}</td>
                  <td>{currencyFormatter.format(item.value)}</td>
                  <td>
                    {item.percentage != null
                      ? percentFormatter.format(item.percentage / 100)
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>Selecione um período na visão geral para carregar os dados.</p>
      )}
    </article>
  );
}

function AnalysisScenarios() {
  const summary = useAppSelector((state) =>
    selectDashboardSummary(state, 'analysis'),
  );
  const highlights = summary?.highlights ?? [];

  return (
    <article className="domain__section">
      <header className="domain__section-header">
        <h2>Cenários e sensibilidade</h2>
        <p className="domain__section-caption">
          Avalie impactos de choques macroeconômicos e revise hipóteses.
        </p>
      </header>

      {summary ? (
        <ul className="domain__list">
          {highlights.length === 0 ? (
            <li>Nenhum cenário crítico identificado.</li>
          ) : (
            highlights.map((highlight) => (
              <li key={highlight.id} className="domain__list-item">
                <div>
                  <strong>{highlight.title}</strong>
                  <p className="domain__list-description">
                    {highlight.description}
                  </p>
                </div>
                {highlight.probability != null ? (
                  <span className="domain__badge domain__badge--neutral">
                    Probabilidade:{' '}
                    {percentFormatter.format(highlight.probability / 100)}
                  </span>
                ) : null}
              </li>
            ))
          )}
        </ul>
      ) : (
        <p>Não há simulações registradas para o período selecionado.</p>
      )}
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
        <Route path="*" element={<Navigate to=".." replace />} />
      </Route>
    </Routes>
  );
}
