import { Component, ErrorInfo, ReactNode, useCallback } from 'react';

import { trackError } from '@/observability/metrics';

import { useToast } from './ToastProvider';
import './AppErrorBoundary.css';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryInnerProps {
  readonly children: ReactNode;
  readonly onError?: (error: Error, info: ErrorInfo) => void;
}

class AppErrorBoundaryInner extends Component<ErrorBoundaryInnerProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    trackError('app.render.error', error, {
      componentStack: info.componentStack,
    });
    this.props.onError?.(error, info);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (!this.state.hasError || !this.state.error) {
      return this.props.children;
    }

    return (
      <div className="app-error-boundary" role="alert">
        <div className="app-error-boundary__card">
          <h1>Algo inesperado aconteceu</h1>
          <p>
            Pedimos desculpas pelo transtorno. Os detalhes já foram registrados e
            estamos analisando o problema.
          </p>
          <pre className="app-error-boundary__message">{this.state.error.message}</pre>
          <div className="app-error-boundary__actions">
            <button type="button" onClick={this.handleReset}>
              Tentar novamente
            </button>
            <button type="button" onClick={() => window.location.reload()}>
              Recarregar página
            </button>
          </div>
        </div>
      </div>
    );
  }
}

interface AppErrorBoundaryProps {
  readonly children: ReactNode;
}

export default function AppErrorBoundary({ children }: AppErrorBoundaryProps) {
  const { showToast } = useToast();

  const handleError = useCallback(
    (error: Error) => {
      showToast({
        tone: 'error',
        title: 'Ops! Algo deu errado',
        description: error.message,
      });
    },
    [showToast],
  );

  return <AppErrorBoundaryInner onError={handleError}>{children}</AppErrorBoundaryInner>;
}
