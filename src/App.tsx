import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import './App.css';
import AppShell from './app/AppShell';
import HttpEventsListener from './app/HttpEventsListener';
import UserPreferencesLoader from './app/UserPreferencesLoader';
import HomePage from './home/HomePage';

const OriginationDomain = lazy(() => import('./domains/originacao'));
const AnalysisDomain = lazy(() => import('./domains/analise'));
const PortfolioDomain = lazy(() => import('./domains/gestao'));

function App() {
  return (
    <Suspense fallback={<div className="app-loading">Carregando módulo...</div>}>
      <HttpEventsListener />
      <UserPreferencesLoader />
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="origination/*" element={<OriginationDomain />} />
          <Route path="analysis/*" element={<AnalysisDomain />} />
          <Route path="portfolio/*" element={<PortfolioDomain />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default App;
