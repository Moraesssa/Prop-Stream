import { loader } from '../loader';
import * as api from '../../api';

vi.mock('../../api');

describe('portfolio loader', () => {
  it('retorna visão consolidada', async () => {
    const assets = [{ id: '1', name: 'Ativo', allocation: 0.2, riskLevel: 'baixo' as const }];
    vi.mocked(api.fetchPortfolioOverview).mockResolvedValueOnce(assets);

    const result = await loader({} as any);

    expect(api.fetchPortfolioOverview).toHaveBeenCalled();
    expect(result).toEqual({ assets });
  });
});
