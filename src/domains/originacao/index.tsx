import { FormEvent, useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, Route, Routes } from 'react-router-dom';

import {
  useCreateOpportunityMutation,
  useDeleteOpportunityMutation,
  usePipelineQuery,
  useUpdateOpportunityMutation,
} from '@/hooks/useOpportunityQueries';
import { useDashboardSummaryQuery } from '@/hooks/useDashboardQueries';
import { useAppSelector } from '@/store/hooks';
import {
  selectAllPipelineOpportunities,
  selectPipelineByStage,
  selectPipelineError,
  selectPipelineLastUpdatedAt,
  selectPipelineOptimisticIds,
  selectPipelineStatus,
  selectPipelineTotals,
} from '@/store/pipelineSlice';
import {
  selectDashboardError,
  selectDashboardStatus,
  selectDashboardSummary,
} from '@/store/dashboardsSlice';
import { selectActivePortfolioId } from '@/store/portfolioSlice';

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

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat('pt-BR');

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
  const query = usePipelineQuery();
  const status = useAppSelector(selectPipelineStatus);
  const error = useAppSelector(selectPipelineError);
  const totals = useAppSelector(selectPipelineTotals);
  const opportunities = useAppSelector(selectAllPipelineOpportunities);
  const lastUpdatedAt = useAppSelector(selectPipelineLastUpdatedAt);

  const stageDistribution = useMemo(() => {
    const distribution = new Map<string, number>();
    opportunities.forEach((opportunity) => {
      const stage = opportunity.stage ?? 'Sem estágio';
      distribution.set(stage, (distribution.get(stage) ?? 0) + 1);
    });

    return Array.from(distribution.entries()).sort((a, b) => b[1] - a[1]);
  }, [opportunities]);

  return (
    <article className="domain__section">
      <header className="domain__section-header">
        <h2>Resumo das captações</h2>
        {lastUpdatedAt ? (
          <span className="domain__section-caption">
            Atualizado em {dateFormatter.format(lastUpdatedAt)}
          </span>
        ) : null}
      </header>

      {status === 'failed' && error ? (
        <div className="domain__alert domain__alert--error" role="alert">
          {error}
        </div>
      ) : null}

      <div className="domain__metrics" aria-live="polite">
        <div className="domain__metric">
          <dt className="domain__metric-title">Volume em análise</dt>
          <dd className="domain__metric-value">
            {currencyFormatter.format(totals.totalValuation ?? 0)}
          </dd>
          <dd className="domain__metric-caption">
            Soma do valuation das oportunidades no funil
          </dd>
        </div>
        <div className="domain__metric">
          <dt className="domain__metric-title">Oportunidades</dt>
          <dd className="domain__metric-value">{totals.totalCount}</dd>
          <dd className="domain__metric-caption">
            Itens ativos em prospecção e negociação
          </dd>
        </div>
        <div className="domain__metric">
          <dt className="domain__metric-title">Probabilidade média</dt>
          <dd className="domain__metric-value">
            {percentFormatter.format((totals.averageProbability ?? 0) / 100)}
          </dd>
          <dd className="domain__metric-caption">
            Probabilidade ponderada das oportunidades em carteira
          </dd>
        </div>
      </div>

      <section className="domain__panel">
        <header className="domain__panel-header">
          <h3>Distribuição por estágio</h3>
          {query.isFetching ? (
            <span className="domain__panel-status" aria-live="polite">
              Atualizando…
            </span>
          ) : null}
        </header>
        <ul className="domain__list domain__list--columns">
          {stageDistribution.length === 0 ? (
            <li>Nenhuma oportunidade cadastrada até o momento.</li>
          ) : (
            stageDistribution.map(([stage, count]) => (
              <li key={stage} className="domain__list-item">
                <span className="domain__list-label">{stage}</span>
                <span className="domain__list-value">{count}</span>
              </li>
            ))
          )}
        </ul>
      </section>
    </article>
  );
}

function OriginationPipeline() {
  const [stageFilter, setStageFilter] = useState<string>('');
  const [name, setName] = useState('');
  const [stage, setStage] = useState('Lead');
  const [valuation, setValuation] = useState('');
  const [probability, setProbability] = useState('40');
  const createOpportunity = useCreateOpportunityMutation();
  const updateOpportunity = useUpdateOpportunityMutation();
  const deleteOpportunity = useDeleteOpportunityMutation();
  const filters = stageFilter ? { stage: stageFilter } : undefined;
  const query = usePipelineQuery(filters);
  const opportunities = useAppSelector((state) =>
    selectPipelineByStage(state, stageFilter || null),
  );
  const allOpportunities = useAppSelector(selectAllPipelineOpportunities);
  const optimisticIds = useAppSelector(selectPipelineOptimisticIds);
  const error = useAppSelector(selectPipelineError);
  const status = useAppSelector(selectPipelineStatus);

  const stageOptions = useMemo(() => {
    const stages = new Set<string>();
    allOpportunities.forEach((opportunity) => {
      if (opportunity.stage) {
        stages.add(opportunity.stage);
      }
    });

    return Array.from(stages.values()).sort((a, b) => a.localeCompare(b));
  }, [allOpportunities]);

  useEffect(() => {
    if (stageOptions.length === 0) {
      setStage('Lead');
      return;
    }

    if (!stageOptions.includes(stage)) {
      setStage(stageOptions[0]);
    }
  }, [stage, stageOptions]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      return;
    }

    const payload = {
      name: name.trim(),
      stage: stage || stageOptions[0] ?? 'Lead',
      valuation: valuation ? Number(valuation) : undefined,
      probability: probability ? Number(probability) : undefined,
    };

    createOpportunity.mutate(payload, {
      onSuccess: () => {
        setName('');
        setStage(stageOptions[0] ?? '');
        setValuation('');
        setProbability('40');
      },
    });
  };

  const handleIncreaseProbability = (id: string, current: number | undefined) => {
    const next = Math.min(100, (current ?? 0) + 10);
    updateOpportunity.mutate({ id, payload: { probability: next } });
  };

  const handleDelete = (id: string) => {
    deleteOpportunity.mutate(id);
  };

  return (
    <article className="domain__section">
      <header className="domain__section-header">
        <h2>Pipeline de negócios</h2>
        <div className="domain__toolbar">
          <label htmlFor="stage-filter" className="domain__toolbar-label">
            Estágio
          </label>
          <select
            id="stage-filter"
            className="domain__toolbar-select"
            value={stageFilter}
            onChange={(event) => setStageFilter(event.target.value)}
          >
            <option value="">Todos</option>
            {stageOptions.map((stage) => (
              <option key={stage} value={stage}>
                {stage}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="domain__toolbar-action"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
          >
            {query.isFetching ? 'Atualizando…' : 'Recarregar'}
          </button>
        </div>
      </header>

      {error && status === 'failed' ? (
        <div className="domain__alert domain__alert--error" role="alert">
          {error}
        </div>
      ) : null}

      <form className="domain__form" onSubmit={handleSubmit}>
        <fieldset className="domain__form-fieldset">
          <legend className="domain__form-legend">
            Nova oportunidade
          </legend>
          <div className="domain__form-grid">
            <label className="domain__form-label">
              Nome
              <input
                className="domain__form-input"
                name="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex.: Torre Atlântica"
                required
              />
            </label>
            <label className="domain__form-label">
              Estágio
              <select
                className="domain__form-input"
                name="stage"
                value={stage}
                onChange={(event) => setStage(event.target.value)}
              >
                {stageOptions.length === 0 ? (
                  <option value="Lead">Lead</option>
                ) : (
                  stageOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))
                )}
              </select>
            </label>
            <label className="domain__form-label">
              Valuation (R$)
              <input
                className="domain__form-input"
                name="valuation"
                type="number"
                min="0"
                step="10000"
                value={valuation}
                onChange={(event) => setValuation(event.target.value)}
              />
            </label>
            <label className="domain__form-label">
              Probabilidade (%)
              <input
                className="domain__form-input"
                name="probability"
                type="number"
                min="0"
                max="100"
                step="5"
                value={probability}
                onChange={(event) => setProbability(event.target.value)}
              />
            </label>
          </div>
          <div className="domain__form-actions">
            <button
              type="submit"
              className="domain__button"
              disabled={createOpportunity.isPending}
            >
              {createOpportunity.isPending
                ? 'Salvando…'
                : 'Adicionar oportunidade'}
            </button>
          </div>
        </fieldset>
      </form>

      <div className="domain__table-wrapper">
        <table className="domain__table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Estágio</th>
              <th>Valuation</th>
              <th>Probabilidade</th>
              <th>Atualização</th>
              <th aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {query.isLoading && opportunities.length === 0 ? (
              <tr>
                <td colSpan={6}>Carregando pipeline…</td>
              </tr>
            ) : null}
            {opportunities.length === 0 && !query.isLoading ? (
              <tr>
                <td colSpan={6}>Nenhuma oportunidade encontrada.</td>
              </tr>
            ) : null}
            {opportunities.map((opportunity) => {
              const isOptimistic = optimisticIds.includes(opportunity.id);
              return (
                <tr
                  key={opportunity.id}
                  data-optimistic={isOptimistic ? 'true' : undefined}
                  className={
                    isOptimistic ? 'domain__table-row domain__table-row--optimistic' : 'domain__table-row'
                  }
                >
                  <td>{opportunity.name}</td>
                  <td>{opportunity.stage ?? 'Sem estágio'}</td>
                  <td>
                    {opportunity.valuation != null
                      ? currencyFormatter.format(Number(opportunity.valuation))
                      : '—'}
                  </td>
                  <td>
                    {opportunity.probability != null
                      ? percentFormatter.format(Number(opportunity.probability) / 100)
                      : '—'}
                  </td>
                  <td>
                    {opportunity.updatedAt
                      ? dateFormatter.format(new Date(opportunity.updatedAt))
                      : dateFormatter.format(new Date(opportunity.createdAt))}
                  </td>
                  <td className="domain__table-actions">
                    <button
                      type="button"
                      className="domain__button domain__button--secondary"
                      onClick={() =>
                        handleIncreaseProbability(
                          opportunity.id,
                          opportunity.probability,
                        )
                      }
                      disabled={updateOpportunity.isPending}
                    >
                      Aumentar chance
                    </button>
                    <button
                      type="button"
                      className="domain__button domain__button--danger"
                      onClick={() => handleDelete(opportunity.id)}
                      disabled={deleteOpportunity.isPending}
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function OriginationReports() {
  const activePortfolioId = useAppSelector(selectActivePortfolioId);
  const query = useDashboardSummaryQuery('origination', {
    filters: activePortfolioId ? { portfolioId: activePortfolioId } : undefined,
  });
  const summary = useAppSelector((state) =>
    selectDashboardSummary(state, 'origination'),
  );
  const status = useAppSelector((state) =>
    selectDashboardStatus(state, 'origination'),
  );
  const error = useAppSelector((state) =>
    selectDashboardError(state, 'origination'),
  );
  const metrics = summary?.metrics ?? [];
  const breakdowns = summary?.breakdowns ?? [];
  const highlights = summary?.highlights ?? [];

  return (
    <article className="domain__section">
      <header className="domain__section-header">
        <h2>Relatórios e indicadores</h2>
        {summary?.updatedAt ? (
          <span className="domain__section-caption">
            Atualizado em {dateFormatter.format(new Date(summary.updatedAt))}
          </span>
        ) : null}
      </header>

      {status === 'failed' && error ? (
        <div className="domain__alert domain__alert--error" role="alert">
          {error}
        </div>
      ) : null}

      {query.isFetching ? (
        <p className="domain__status">Sincronizando indicadores…</p>
      ) : null}

      {summary ? (
        <div className="domain__panels">
          <section className="domain__panel">
            <h3>Métricas principais</h3>
            <ul className="domain__list">
              {metrics.map((metric) => (
                <li key={metric.id} className="domain__list-item">
                  <span className="domain__list-label">{metric.label}</span>
                  <span className="domain__list-value">
                    {metric.unit === 'percent'
                      ? percentFormatter.format(metric.value / 100)
                      : currencyFormatter.format(metric.value)}
                  </span>
                  {metric.change != null ? (
                    <span
                      className={
                        metric.change >= 0
                          ? 'domain__badge domain__badge--positive'
                          : 'domain__badge domain__badge--negative'
                      }
                    >
                      {metric.change >= 0 ? '+' : ''}
                      {percentFormatter.format(metric.change / 100)}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>

          <section className="domain__panel">
            <h3>Distribuição por região</h3>
            <ul className="domain__list domain__list--columns">
              {breakdowns.map((item) => (
                <li key={item.id} className="domain__list-item">
                  <span className="domain__list-label">{item.label}</span>
                  <span className="domain__list-value">
                    {percentFormatter.format((item.percentage ?? 0) / 100)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="domain__panel">
            <h3>Alertas de análise</h3>
            <ul className="domain__list">
              {highlights.length === 0 ? (
                <li>Nenhum alerta no momento.</li>
              ) : (
                highlights.map((highlight) => (
                  <li key={highlight.id} className="domain__list-item">
                    <div>
                      <strong>{highlight.title}</strong>
                      <p className="domain__list-description">
                        {highlight.description}
                      </p>
                    </div>
                    {highlight.impact != null ? (
                      <span className="domain__badge">
                        Impacto:{' '}
                        {percentFormatter.format(highlight.impact / 100)}
                      </span>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>
      ) : (
        <p>Nenhum relatório disponível até o momento.</p>
      )}
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
