import { LoaderFunctionArgs } from 'react-router-dom';
import { fetchPipeline } from '../api';

export async function loader(_args: LoaderFunctionArgs) {
  const pipeline = await fetchPipeline();
  return { pipeline };
}
