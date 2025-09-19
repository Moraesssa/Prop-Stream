import { LoaderFunctionArgs } from 'react-router-dom';
import { fetchPortfolioOverview } from '../api';

export async function loader(_args: LoaderFunctionArgs) {
  const assets = await fetchPortfolioOverview();
  return { assets };
}
