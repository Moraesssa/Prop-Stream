import { Suspense, lazy, LazyExoticComponent, ComponentType } from 'react';
import { Navigate, createBrowserRouter } from 'react-router-dom';
import AppLayout from './layout';
import { loader as originationLoader } from '../features/origination/pages/loader';
import { loader as analysisLoader } from '../features/analysis/pages/loader';
import { loader as portfolioLoader } from '../features/portfolio/pages/loader';

function withSuspense<T extends ComponentType>(Component: LazyExoticComponent<T>) {
  return (
    <Suspense fallback={<div>Carregando módulo...</div>}>
      <Component />
    </Suspense>
  );
}

const OriginationPage = lazy(() => import('../features/origination/pages'));
const AnalysisPage = lazy(() => import('../features/analysis/pages'));
const PortfolioPage = lazy(() => import('../features/portfolio/pages'));

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />, // AppLayout already renders Outlet
    children: [
      {
        index: true,
        element: <Navigate to="/origination" replace />
      },
      {
        path: 'origination',
        element: withSuspense(OriginationPage),
        loader: originationLoader
      },
      {
        path: 'analysis',
        element: withSuspense(AnalysisPage),
        loader: analysisLoader
      },
      {
        path: 'portfolio',
        element: withSuspense(PortfolioPage),
        loader: portfolioLoader
      }
    ]
  }
]);
