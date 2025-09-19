import { LoaderFunctionArgs } from 'react-router-dom';
import { fetchComparativeDashboard } from '../api';

export async function loader(_args: LoaderFunctionArgs) {
  const metrics = await fetchComparativeDashboard();
  return { metrics };
}
