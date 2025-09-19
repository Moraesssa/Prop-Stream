import { portfolioReducer, portfolioLoaded, adjustAlerts } from '../slice';
import { AssetSnapshot } from '../api';

describe('portfolio reducer', () => {
  it('carrega ativos consolidados', () => {
    const assets: AssetSnapshot[] = [
      { id: '1', name: 'Ativo', allocation: 0.2, riskLevel: 'baixo' }
    ];

    const state = portfolioReducer(undefined, portfolioLoaded(assets));

    expect(state.assets).toEqual(assets);
  });

  it('realiza atualização otimista ao ajustar alertas', () => {
    const baseState = portfolioReducer(
      undefined,
      portfolioLoaded([{ id: '1', name: 'Ativo', allocation: 0.2, riskLevel: 'baixo' }])
    );

    const pending = portfolioReducer(
      baseState,
      adjustAlerts.pending('alert-1', { assetId: '1', threshold: 45 })
    );

    expect(pending.assets[0].allocation).toBeCloseTo(0.45);

    const fulfilled = portfolioReducer(
      pending,
      adjustAlerts.fulfilled(
        { id: '1', name: 'Ativo', allocation: 0.5, riskLevel: 'alto' },
        'alert-1',
        { assetId: '1', threshold: 45 }
      )
    );

    expect(fulfilled.assets[0].allocation).toBe(0.5);
    expect(fulfilled.optimisticSnapshot).toBeUndefined();
  });
});
