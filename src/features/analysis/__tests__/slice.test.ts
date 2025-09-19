import { analysisReducer, dashboardLoaded, executeSimulation } from '../slice';
import { ComparativeMetric } from '../api';

describe('analysis reducer', () => {
  it('carrega métricas do dashboard', () => {
    const metrics: ComparativeMetric[] = [
      { metric: 'Cap Rate', subject: 0.1, benchmark: 0.08 }
    ];

    const state = analysisReducer(undefined, dashboardLoaded(metrics));

    expect(state.metrics).toEqual(metrics);
  });

  it('mantém atualização otimista durante simulação', () => {
    const baseState = analysisReducer(
      undefined,
      dashboardLoaded([{ metric: 'Cap Rate', subject: 0.1, benchmark: 0.08 }])
    );

    const pending = analysisReducer(
      baseState,
      executeSimulation.pending('sim-1', { scenario: 'custom', capital: 1_500_000 })
    );

    expect(pending.metrics[0].subject).not.toBe(0.1);

    const fulfilled = analysisReducer(
      pending,
      executeSimulation.fulfilled(
        { metrics: [{ metric: 'Cap Rate', subject: 0.2, benchmark: 0.08 }] },
        'sim-1',
        { scenario: 'custom', capital: 1_500_000 }
      )
    );

    expect(fulfilled.metrics[0].subject).toBe(0.2);
    expect(fulfilled.optimisticSnapshot).toBeUndefined();
  });
});
