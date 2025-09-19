import type { Portfolio } from '../store/portfolioSlice';

const SAMPLE_PORTFOLIOS: Portfolio[] = [
  {
    id: 'res-001',
    name: 'Residencial Alfa',
    segment: 'Residencial',
    aum: 450_000_000
  },
  {
    id: 'com-002',
    name: 'Towers Comerciais',
    segment: 'Comercial',
    aum: 730_000_000
  },
  {
    id: 'mix-003',
    name: 'Smart Mix Urbano',
    segment: 'Misto',
    aum: 615_000_000
  }
];

export async function fetchPortfolios(): Promise<Portfolio[]> {
  await new Promise((resolve) => setTimeout(resolve, 120));
  return SAMPLE_PORTFOLIOS;
}
