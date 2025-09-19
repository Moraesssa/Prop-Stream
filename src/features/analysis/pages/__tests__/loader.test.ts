import { loader } from '../loader';
import * as api from '../../api';

vi.mock('../../api');

describe('analysis loader', () => {
  it('retorna métricas do dashboard', async () => {
    const metrics = [{ metric: 'Cap Rate', subject: 0.1, benchmark: 0.08 }];
    vi.mocked(api.fetchComparativeDashboard).mockResolvedValueOnce(metrics);

    const result = await loader({} as any);

    expect(api.fetchComparativeDashboard).toHaveBeenCalled();
    expect(result).toEqual({ metrics });
  });
});
