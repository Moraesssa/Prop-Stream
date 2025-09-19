import { Opportunity } from '../api';

interface PipelineBoardProps {
  opportunities: Opportunity[];
}

export function PipelineBoard({ opportunities }: PipelineBoardProps) {
  if (!opportunities.length) {
    return <p>Nenhuma oportunidade cadastrada no momento.</p>;
  }

  return (
    <table className="pipeline-board">
      <thead>
        <tr>
          <th>Imóvel</th>
          <th>Estágio</th>
          <th>Retorno Esperado</th>
        </tr>
      </thead>
      <tbody>
        {opportunities.map((opportunity) => (
          <tr key={opportunity.id}>
            <td>{opportunity.propertyName}</td>
            <td>{opportunity.stage}</td>
            <td>{(opportunity.expectedReturn * 100).toFixed(1)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default PipelineBoard;
