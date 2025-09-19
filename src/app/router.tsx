import { Suspense, lazy } from 'react';
import {
  Await,
  Navigate,
  createBrowserRouter,
  type RouteObject,
  useAsyncError,
  useLoaderData,
  useRouteError
} from 'react-router-dom';
import { AppShell } from './AppShell';
import { ErrorState, LoadingState } from '../components/FeedbackState';
import { fetchPortfolios } from '../services/portfolios';
import type { Portfolio } from '../store/portfolioSlice';

const OriginationDashboard = lazy(() => import('../domains/origination/OriginationDashboard'));
const AnalysisDashboard = lazy(() => import('../domains/analysis/AnalysisDashboard'));
const PortfolioOverview = lazy(() => import('../domains/portfolio/PortfolioOverview'));
const NotFoundPage = lazy(() => import('../domains/not-found/NotFoundPage'));

interface RootLoaderData {
  portfolios: Promise<Portfolio[]>;
}

export async function rootLoader(): Promise<{ portfolios: Promise<Portfolio[]> }> {
  return {
    portfolios: fetchPortfolios()
  };
}

function RootLayout() {
  const data = useLoaderData() as RootLoaderData;

  return (
    <Suspense fallback={<LoadingState message="Montando cockpit principal..." />}>
      <Await resolve={data.portfolios} errorElement={<RootAwaitError />}>
        {(portfolios) => <AppShell portfolios={portfolios} />}
      </Await>
    </Suspense>
  );
}

function RootAwaitError() {
  const error = useAsyncError() as Error | undefined;
  return <ErrorState message={error?.message ?? 'Não foi possível carregar os portfólios.'} />;
}

function RootErrorBoundary() {
  const error = useRouteError() as Error | undefined;
  return <ErrorState message={error?.message ?? 'Falha ao carregar a aplicação.'} />;
}

const routeChildren: RouteObject[] = [
  {
    index: true,
    element: <Navigate to="/origination" replace />
  },
  {
    path: 'origination',
    element: (
      <Suspense fallback={<LoadingState message="Carregando originação..." />}>
        <OriginationDashboard />
      </Suspense>
    )
  },
  {
    path: 'analysis',
    element: (
      <Suspense fallback={<LoadingState message="Carregando análise..." />}>
        <AnalysisDashboard />
      </Suspense>
    )
  },
  {
    path: 'portfolio',
    element: (
      <Suspense fallback={<LoadingState message="Carregando visão de portfólio..." />}>
        <PortfolioOverview />
      </Suspense>
    )
  },
  {
    path: '*',
    element: (
      <Suspense fallback={<LoadingState message="Buscando rota..." />}>
        <NotFoundPage />
      </Suspense>
    )
  }
];

export const routes: RouteObject[] = [
  {
    id: 'root',
    path: '/',
    loader: rootLoader,
    element: <RootLayout />, 
    errorElement: <RootErrorBoundary />, 
    children: routeChildren
  }
];

export const router = createBrowserRouter(routes);
