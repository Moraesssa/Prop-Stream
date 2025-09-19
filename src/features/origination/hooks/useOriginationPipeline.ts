import { useQuery } from '@tanstack/react-query';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { fetchPipeline } from '../api';
import { pipelineLoaded, selectOriginationPipeline, selectOriginationSubmitting } from '../slice';

export function useOriginationPipeline() {
  const dispatch = useAppDispatch();
  const pipeline = useAppSelector(selectOriginationPipeline);
  const submitting = useAppSelector(selectOriginationSubmitting);

  const query = useQuery({
    queryKey: ['origination', 'pipeline'],
    queryFn: fetchPipeline,
    onSuccess: (data) => dispatch(pipelineLoaded(data))
  });

  return {
    pipeline,
    submitting,
    query
  };
}
