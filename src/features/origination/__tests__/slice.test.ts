import { originationReducer, pipelineLoaded, sendProposal } from '../slice';
import { Opportunity } from '../api';

describe('origination reducer', () => {
  it('atualiza o pipeline quando carregado', () => {
    const opportunities: Opportunity[] = [
      { id: '1', propertyName: 'Imóvel', stage: 'prospect', expectedReturn: 0.12 }
    ];
    const state = originationReducer(undefined, pipelineLoaded(opportunities));

    expect(state.pipeline).toEqual(opportunities);
  });

  it('aplica atualização otimista e consolida no sucesso', () => {
    const baseState = originationReducer(
      undefined,
      pipelineLoaded([{ id: '1', propertyName: 'Imóvel', stage: 'analysis', expectedReturn: 0.12 }])
    );

    const pendingState = originationReducer(
      baseState,
      sendProposal.pending('request-1', { opportunityId: '1', offerValue: 1000 })
    );

    expect(pendingState.pipeline[0].stage).toBe('negotiation');

    const fulfilledState = originationReducer(
      pendingState,
      sendProposal.fulfilled(
        { id: '1', propertyName: 'Imóvel', stage: 'negotiation', expectedReturn: 0.15 },
        'request-1',
        { opportunityId: '1', offerValue: 1000 }
      )
    );

    expect(fulfilledState.pipeline[0].expectedReturn).toBe(0.15);
    expect(fulfilledState.optimisticSnapshot).toBeUndefined();
  });
});
