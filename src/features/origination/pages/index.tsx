import { useAppDispatch } from '../../../app/hooks';
import PipelineBoard from '../components/PipelineBoard';
import { sendProposal } from '../slice';
import { useOriginationPipeline } from '../hooks/useOriginationPipeline';

export function OriginationRoot() {
  const dispatch = useAppDispatch();
  const {
    pipeline,
    submitting,
    query: { isLoading, error }
  } = useOriginationPipeline();

  const handleSendProposal = () => {
    const target = pipeline[0];
    if (!target) return;
    dispatch(
      sendProposal({
        opportunityId: target.id,
        offerValue: target.expectedReturn * 1000000
      })
    );
  };

  return (
    <section>
      <header>
        <h2>Pipeline de Originação</h2>
        <p>
          Monitore oportunidades em andamento, acompanhe o funil de negociação e acelere o envio de propostas
          para imóveis prioritários.
        </p>
      </header>

      {isLoading && <p>Carregando oportunidades...</p>}
      {error && <p data-testid="origination-error">Falha ao carregar pipeline.</p>}

      <PipelineBoard opportunities={pipeline} />

      <button type="button" onClick={handleSendProposal} disabled={!pipeline.length || submitting}>
        {submitting ? 'Enviando proposta...' : 'Enviar proposta para destaque'}
      </button>
    </section>
  );
}

export default OriginationRoot;
