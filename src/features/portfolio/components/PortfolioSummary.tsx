import { AssetSnapshot } from '../api';

interface PortfolioSummaryProps {
  assets: AssetSnapshot[];
}

export function PortfolioSummary({ assets }: PortfolioSummaryProps) {
  if (!assets.length) {
    return <p>Carteira ainda não possui ativos monitorados.</p>;
  }

  const totalAllocation = assets.reduce((sum, asset) => sum + asset.allocation, 0);

  return (
    <div className="portfolio-summary">
      <h3>Alocação Consolidada</h3>
      <p>Total alocado: {(totalAllocation * 100).toFixed(1)}%</p>
      <ul>
        {assets.map((asset) => (
          <li key={asset.id}>
            <strong>{asset.name}</strong> — {(asset.allocation * 100).toFixed(1)}% • risco {asset.riskLevel}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default PortfolioSummary;
