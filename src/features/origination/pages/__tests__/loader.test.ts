import { loader } from '../loader';
import * as api from '../../api';

vi.mock('../../api');

describe('origination loader', () => {
  it('retorna o pipeline da API', async () => {
    const mockedPipeline = [
      { id: '1', propertyName: 'Teste', stage: 'analysis', expectedReturn: 0.1 }
    ];
    vi.mocked(api.fetchPipeline).mockResolvedValueOnce(mockedPipeline);

    const result = await loader({} as any);

    expect(api.fetchPipeline).toHaveBeenCalled();
    expect(result).toEqual({ pipeline: mockedPipeline });
  });
});
