import { ComparativeMetric } from '../api';

interface ComparativeTableProps {
  metrics: ComparativeMetric[];
}

export function ComparativeTable({ metrics }: ComparativeTableProps) {
  if (!metrics.length) {
    return <p>Nenhum dado comparativo disponível.</p>;
  }

  return (
    <table className="comparative-table">
      <thead>
        <tr>
          <th>Métrica</th>
          <th>Carteira</th>
          <th>Benchmark</th>
        </tr>
      </thead>
      <tbody>
        {metrics.map((metric) => (
          <tr key={metric.metric}>
            <td>{metric.metric}</td>
            <td>{(metric.subject * 100).toFixed(1)}%</td>
            <td>{(metric.benchmark * 100).toFixed(1)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default ComparativeTable;
