export interface AssetSnapshot {
  id: string;
  name: string;
  allocation: number;
  riskLevel: 'baixo' | 'médio' | 'alto';
}

export interface AlertAdjustmentPayload {
  assetId: string;
  threshold: number;
}

const mockPortfolio: AssetSnapshot[] = [
  { id: 'asset-01', name: 'FII Proptech', allocation: 0.32, riskLevel: 'médio' },
  { id: 'asset-02', name: 'Residencial Atlântico', allocation: 0.21, riskLevel: 'baixo' }
];

export async function fetchPortfolioOverview(): Promise<AssetSnapshot[]> {
  await new Promise((resolve) => setTimeout(resolve, 60));
  return mockPortfolio;
}

export async function adjustAlertThreshold(payload: AlertAdjustmentPayload): Promise<AssetSnapshot> {
  await new Promise((resolve) => setTimeout(resolve, 60));
  const target = mockPortfolio.find((asset) => asset.id === payload.assetId);
  return (
    target ?? {
      id: payload.assetId,
      name: 'Novo ativo',
      allocation: payload.threshold / 100,
      riskLevel: 'médio'
    }
  );
}
