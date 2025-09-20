import { useEffect, useRef } from 'react';
import { Navigate, NavLink, Outlet, Route, Routes } from 'react-router-dom';

import { usePortfolioSnapshotQuery } from '@/hooks/usePortfolioQueries';
import DomainState from '@/domains/components/DomainState';
import { useAppSelector } from '@/store/hooks';
import {
  selectActivePortfolioId,
  selectPortfolioError,
  selectPortfolioSnapshot,
  selectPortfolioStatus,
} from '@/store/portfolioSlice';
import { trackEvent } from '@/observability/metrics';

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

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  maximumFractionDigits: 1,
});

function PortfolioLayout() {
  const activePortfolioId = useAppSelector((state) =>
    selectActivePortfolioId(state),
  );
  usePortfolioSnapshotQuery({ portfolioId: activePortfolioId });

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
  const snapshot = useAppSelector((state) => selectPortfolioSnapshot(state));
  const status = useAppSelector((state) => selectPortfolioStatus(state));
  const error = useAppSelector((state) => selectPortfolioError(state));
  const lastUpdateRef = useRef<string | null>(null);

  useEffect(() => {
    if (!snapshot?.updatedAt) {
      return;
    }

    if (snapshot.updatedAt === lastUpdateRef.current) {
      return;
    }

    lastUpdateRef.current = snapshot.updatedAt;
    trackEvent('portfolio.snapshot.updated', {
      portfolioId: snapshot.portfolioId,
      positions: snapshot.positions.length,
    });
  }, [snapshot]);

  return (
    <article className="domain__section">
      <header className="domain__section-header">
        <h2>Visão consolidada</h2>
        <p className="domain__section-caption">
          Patrimônio líquido, fluxo de caixa e rentabilidade acumulada.
        </p>
      </header>

      {status === 'failed' && error ? (
        <DomainState
          variant="error"
          title="Não foi possível carregar o portfólio."
          description={error}
        />
      ) : null}

      {!snapshot && status === 'loading' ? (
        <DomainState
          variant="loading"
          title="Carregando dados do portfólio"
          description="Recuperando informações consolidadas do veículo selecionado."
        />
      ) : null}

      {snapshot ? (
        <dl className="domain__metrics">
          <div className="domain__metric">
            <dt className="domain__metric-title">Valor de mercado</dt>
            <dd className="domain__metric-value">
              {currencyFormatter.format(snapshot.totals.currentValue)}
            </dd>
            <dd className="domain__metric-caption">
              Soma atualizada dos ativos sob gestão
            </dd>
          </div>
          <div className="domain__metric">
            <dt className="domain__metric-title">Capital investido</dt>
            <dd className="domain__metric-value">
              {currencyFormatter.format(snapshot.totals.invested)}
            </dd>
            <dd className="domain__metric-caption">
              Exposição acumulada desde o início do veículo
            </dd>
          </div>
          <div className="domain__metric">
            <dt className="domain__metric-title">Rentabilidade anual</dt>
            <dd className="domain__metric-value">
              {percentFormatter.format(snapshot.totals.irr / 100)}
            </dd>
            <dd className="domain__metric-caption">
              Taxa interna de retorno consolidada
            </dd>
          </div>
          <div className="domain__metric">
            <dt className="domain__metric-title">Ocupação</dt>
            <dd className="domain__metric-value">
              {percentFormatter.format(snapshot.totals.occupancy / 100)}
            </dd>
            <dd className="domain__metric-caption">
              Média ponderada entre os ativos de renda
            </dd>
          </div>
        </dl>
      ) : null}

      {!snapshot && status !== 'loading' && status !== 'failed' ? (
        <DomainState
          variant="empty"
          title="Selecione um portfólio ativo"
          description="Escolha um portfólio para visualizar a visão consolidada."
        />
      ) : null}
    </article>
  );
}

function PortfolioDistribution() {
  const snapshot = useAppSelector((state) => selectPortfolioSnapshot(state));

  return (
    <article className="domain__section">
      <header className="domain__section-header">
        <h2>Distribuição de portfólio</h2>
        <p className="domain__section-caption">
          Acompanhe alocação por ativo e veja desvios em relação à meta.
        </p>
      </header>

      {snapshot ? (
        <div className="domain__table-wrapper">
          <table className="domain__table">
            <thead>
              <tr>
                <th>Ativo</th>
                <th>Alocação</th>
                <th>Valor atual</th>
                <th>Ocupação</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.positions.map((position) => (
                <tr key={position.id}>
                  <td>{position.name}</td>
                  <td>{percentFormatter.format(position.allocation / 100)}</td>
                  <td>{currencyFormatter.format(position.currentValue)}</td>
                  <td>{percentFormatter.format(position.occupancy / 100)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <DomainState
          variant="empty"
          title="Nenhum portfólio selecionado"
          description="Selecione um portfólio ativo para visualizar a distribuição."
        />
      )}
    </article>
  );
}

function PortfolioIndicators() {
  const snapshot = useAppSelector((state) => selectPortfolioSnapshot(state));

  return (
    <article className="domain__section">
      <header className="domain__section-header">
        <h2>Indicadores operacionais</h2>
        <p className="domain__section-caption">
          Eventos futuros e tarefas para manter os ativos saudáveis.
        </p>
      </header>

      {snapshot ? (
        <ul className="domain__list">
          {snapshot.events.length === 0 ? (
            <li>Sem eventos planejados para os próximos dias.</li>
          ) : (
            snapshot.events.map((event) => (
              <li key={event.id} className="domain__list-item">
                <div>
                  <strong>{event.title}</strong>
                  <p className="domain__list-description">{event.description}</p>
                </div>
                <span className="domain__badge domain__badge--neutral">
                  {new Date(event.date).toLocaleDateString('pt-BR')}
                </span>
              </li>
            ))
          )}
        </ul>
      ) : (
        <DomainState
          variant="empty"
          title="Nenhum indicador operacional disponível"
          description="Selecione um portfólio ativo para acompanhar eventos e tarefas."
        />
      )}
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
        <Route path="*" element={<Navigate to="." replace />} />
      </Route>
    </Routes>
  );
}
