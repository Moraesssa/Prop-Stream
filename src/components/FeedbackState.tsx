import type { ReactNode } from 'react';

interface FeedbackStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

const baseStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem',
  padding: '2rem',
  textAlign: 'center'
};

export function FeedbackState({ title, description, icon, action }: FeedbackStateProps) {
  return (
    <section style={baseStyle} aria-live="polite">
      {icon}
      <h2 style={{ margin: 0 }}>{title}</h2>
      {description ? <p style={{ margin: 0, maxWidth: '32rem' }}>{description}</p> : null}
      {action}
    </section>
  );
}

export function LoadingState({ message = 'Carregando...' }: { message?: string }) {
  return <FeedbackState title={message} description="Estamos preparando os dados mais recentes." />;
}

export function ErrorState({ message }: { message: string }) {
  return (
    <FeedbackState
      title="Algo inesperado aconteceu"
      description={message}
      action={<small role="alert">Tente novamente ou contate o suporte.</small>}
    />
  );
}

export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <FeedbackState
      title="Nada por aqui ainda"
      description={message}
      action={action ?? <small>Cadastre um portfólio para começar a monitorar seus ativos.</small>}
    />
  );
}
