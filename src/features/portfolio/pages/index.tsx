import { FormEvent, useState } from 'react';
import { useAppDispatch } from '../../../app/hooks';
import PortfolioSummary from '../components/PortfolioSummary';
import { adjustAlerts } from '../slice';
import { usePortfolioOverview } from '../hooks/usePortfolioOverview';

export function PortfolioRoot() {
  const dispatch = useAppDispatch();
  const [assetId, setAssetId] = useState('asset-01');
  const [threshold, setThreshold] = useState(30);
  const {
    assets,
    updatingAlert,
    query: { isLoading, error }
  } = usePortfolioOverview();

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    dispatch(
      adjustAlerts({
        assetId,
        threshold
      })
    );
  };

  return (
    <section>
      <header>
        <h2>Visão Consolidada da Carteira</h2>
        <p>
          Acompanhe a alocação, sensibilidade de risco e configure alertas para proteger a performance da sua
          carteira imobiliária.
        </p>
      </header>

      {isLoading && <p>Carregando carteira...</p>}
      {error && <p data-testid="portfolio-error">Não foi possível carregar a carteira.</p>}

      <PortfolioSummary assets={assets} />

      <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem' }}>
        <label>
          Ativo monitorado
          <input value={assetId} onChange={(event) => setAssetId(event.target.value)} />
        </label>
        <label>
          Limite de alerta (%)
          <input
            type="number"
            min="10"
            max="100"
            value={threshold}
            onChange={(event) => setThreshold(Number(event.target.value))}
          />
        </label>
        <button type="submit" disabled={updatingAlert}>
          {updatingAlert ? 'Atualizando alertas...' : 'Ajustar alertas'}
        </button>
      </form>
    </section>
  );
}

export default PortfolioRoot;
