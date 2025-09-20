import { ReactNode } from 'react';

import './DomainState.css';

type DomainStateVariant = 'loading' | 'empty' | 'error';

type DomainStateLayout = 'block' | 'inline';

interface DomainStateProps {
  readonly variant: DomainStateVariant;
  readonly title: string;
  readonly description?: string;
  readonly action?: ReactNode;
  readonly icon?: ReactNode;
  readonly layout?: DomainStateLayout;
}

const DEFAULT_ICONS: Record<DomainStateVariant, string> = {
  loading: '⏳',
  empty: '📭',
  error: '⚠️',
};

export function DomainState({
  variant,
  title,
  description,
  action,
  icon,
  layout = 'block',
}: DomainStateProps) {
  const role = variant === 'error' ? 'alert' : 'status';
  const resolvedIcon = icon ?? DEFAULT_ICONS[variant];
  const className = `domain-state domain-state--${variant} domain-state--${layout}`;

  return (
    <div className={className} role={role} aria-live={variant === 'loading' ? 'polite' : undefined}>
      {layout === 'block' ? (
        <div className="domain-state__icon" aria-hidden="true">
          {resolvedIcon}
        </div>
      ) : null}
      <div className="domain-state__body">
        <strong className="domain-state__title">{title}</strong>
        {description ? <p className="domain-state__description">{description}</p> : null}
        {action ? <div className="domain-state__action">{action}</div> : null}
      </div>
      {layout === 'inline' ? (
        <span className="domain-state__inline-icon" aria-hidden="true">
          {resolvedIcon}
        </span>
      ) : null}
    </div>
  );
}

export default DomainState;
