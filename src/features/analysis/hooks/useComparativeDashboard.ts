import { useQuery } from '@tanstack/react-query';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { fetchComparativeDashboard } from '../api';
import { dashboardLoaded, selectAnalysisMetrics, selectRunningSimulation } from '../slice';

export function useComparativeDashboard() {
  const dispatch = useAppDispatch();
  const metrics = useAppSelector(selectAnalysisMetrics);
  const running = useAppSelector(selectRunningSimulation);

  const query = useQuery({
    queryKey: ['analysis', 'comparative-dashboard'],
    queryFn: fetchComparativeDashboard,
    onSuccess: (data) => dispatch(dashboardLoaded(data))
  });

  return { metrics, running, query };
}
