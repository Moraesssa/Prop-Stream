import { useQuery } from '@tanstack/react-query';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { fetchPortfolioOverview } from '../api';
import { portfolioLoaded, selectPortfolioAssets, selectUpdatingAlert } from '../slice';

export function usePortfolioOverview() {
  const dispatch = useAppDispatch();
  const assets = useAppSelector(selectPortfolioAssets);
  const updatingAlert = useAppSelector(selectUpdatingAlert);

  const query = useQuery({
    queryKey: ['portfolio', 'overview'],
    queryFn: fetchPortfolioOverview,
    onSuccess: (data) => dispatch(portfolioLoaded(data))
  });

  return { assets, updatingAlert, query };
}
