import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import './ToastProvider.css';

export type ToastTone = 'info' | 'success' | 'warning' | 'error';

export interface ToastOptions {
  readonly id?: string;
  readonly title?: string;
  readonly description?: string;
  readonly tone?: ToastTone;
  readonly duration?: number;
}

interface Toast extends Required<Omit<ToastOptions, 'tone' | 'duration'>> {
  readonly tone: ToastTone;
  readonly duration: number | null;
}

interface ToastContextValue {
  showToast(options: ToastOptions): string;
  dismissToast(id: string): void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const DEFAULT_DURATION = 5000;

function generateToastId() {
  return `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismissToast = useCallback((id: string) => {
    setToasts((previous) => previous.filter((toast) => toast.id !== id));
    const timeout = timers.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timers.current.delete(id);
    }
  }, []);

  const scheduleDismiss = useCallback(
    (id: string, duration: number | null) => {
      if (duration === null) {
        return;
      }

      const timeout = setTimeout(() => {
        dismissToast(id);
      }, Math.max(1000, duration));
      timers.current.set(id, timeout);
    },
    [dismissToast],
  );

  const showToast = useCallback(
    (options: ToastOptions) => {
      const id = options.id ?? generateToastId();
      const tone = options.tone ?? 'info';
      const duration = options.duration === 0 ? null : options.duration ?? DEFAULT_DURATION;

      setToasts((previous) => {
        const next: Toast = {
          id,
          title: options.title ?? '',
          description: options.description ?? '',
          tone,
          duration,
        };
        return [...previous.filter((toast) => toast.id !== id), next];
      });

      scheduleDismiss(id, duration);
      return id;
    },
    [scheduleDismiss],
  );

  useEffect(() => {
    return () => {
      timers.current.forEach((timeout) => clearTimeout(timeout));
      timers.current.clear();
    };
  }, []);

  const contextValue = useMemo<ToastContextValue>(
    () => ({
      showToast,
      dismissToast,
    }),
    [dismissToast, showToast],
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="app-toasts" role="region" aria-live="assertive" aria-label="Notificações">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`app-toast app-toast--${toast.tone}`}
            role={toast.tone === 'error' ? 'alert' : 'status'}
          >
            <div className="app-toast__content">
              {toast.title ? (
                <strong className="app-toast__title">{toast.title}</strong>
              ) : null}
              {toast.description ? (
                <p className="app-toast__description">{toast.description}</p>
              ) : null}
            </div>
            <button
              type="button"
              className="app-toast__close"
              aria-label="Dispensar notificação"
              onClick={() => dismissToast(toast.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider.');
  }

  return context;
}

export default ToastProvider;
