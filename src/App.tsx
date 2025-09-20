import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import './App.css';
import AppShell from './app/AppShell';

const OriginationDomain = lazy(() => import('./domains/originacao'));
const AnalysisDomain = lazy(() => import('./domains/analise'));
const PortfolioDomain = lazy(() => import('./domains/gestao'));

function HomePage() {
  return (
    <section className="app">
      <h1>Prop-Stream</h1>
      <p>Seu cockpit inteligente para investimentos imobiliários.</p>
    </section>
  );
}

function App() {
  return (
    <Suspense fallback={<div className="app-loading">Carregando módulo...</div>}>
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
