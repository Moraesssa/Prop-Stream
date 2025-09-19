import { FormEvent, useState } from 'react';
import { useAppDispatch } from '../../../app/hooks';
import ComparativeTable from '../components/ComparativeTable';
import { executeSimulation } from '../slice';
import { useComparativeDashboard } from '../hooks/useComparativeDashboard';

export function AnalysisRoot() {
  const dispatch = useAppDispatch();
  const [capital, setCapital] = useState(1_000_000);
  const {
    metrics,
    running,
    query: { isLoading, error }
  } = useComparativeDashboard();

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    dispatch(
      executeSimulation({
        scenario: 'custom',
        capital
      })
    );
  };

  return (
    <section>
      <header>
        <h2>Dashboards Comparativos</h2>
        <p>
          Explore métricas-chave da carteira frente aos benchmarks de mercado e projete cenários para orientar
          decisões estratégicas.
        </p>
      </header>

      {isLoading && <p>Carregando métricas...</p>}
      {error && <p data-testid="analysis-error">Erro ao carregar dashboard.</p>}

      <ComparativeTable metrics={metrics} />

      <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem' }}>
        <label>
          Capital projetado (R$)
          <input
            type="number"
            min="100000"
            step="50000"
            value={capital}
            onChange={(event) => setCapital(Number(event.target.value))}
          />
        </label>
        <button type="submit" disabled={running}>
          {running ? 'Rodando simulação...' : 'Rodar simulação'}
        </button>
      </form>
    </section>
  );
}

export default AnalysisRoot;
