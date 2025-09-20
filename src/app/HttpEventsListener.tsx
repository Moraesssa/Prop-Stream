import { useEffect } from 'react';

import { trackEvent } from '@/observability/metrics';
import { type HttpClientError, setHttpErrorHandler } from '@/services/httpClient';

import { useToast } from './ToastProvider';

function resolveErrorMessage(error: HttpClientError): { title: string; description: string } {
  if (error.status === 401) {
    return {
      title: 'Sessão expirada',
      description: 'Faça login novamente para continuar utilizando a plataforma.',
    };
  }

  if (error.isNetworkError || error.isTimeout) {
    return {
      title: 'Conexão instável',
      description: 'Verifique sua conexão com a internet e tente novamente.',
    };
  }

  return {
    title: 'Falha na requisição',
    description: error.message,
  };
}

export default function HttpEventsListener() {
  const { showToast } = useToast();

  useEffect(() => {
    const handler = (error: HttpClientError) => {
      const { title, description } = resolveErrorMessage(error);
      showToast({
        tone: 'error',
        title,
        description,
      });
      trackEvent('app.http.error.notified', {
        status: error.status,
        code: error.code,
      });
    };

    setHttpErrorHandler(handler);
    return () => {
      setHttpErrorHandler(null);
    };
  }, [showToast]);

  return null;
}
