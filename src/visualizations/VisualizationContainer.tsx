import React from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useDesignSystem } from '../design-system/theme';
import { Spinner } from '../design-system/components/_shared/Spinner';

export type VisualizationBaseProps = {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  isLoading?: boolean;
  error?: ReactNode;
  emptyMessage?: ReactNode;
  height?: number | string;
  className?: string;
  style?: CSSProperties;
};

export type VisualizationContainerProps = VisualizationBaseProps & {
  children: ReactNode;
  isEmpty?: boolean;
};

const resolveHeight = (height?: number | string): string | undefined => {
  if (typeof height === 'number') {
    return `${height}px`;
  }

  return height;
};

export const VisualizationContainer: React.FC<VisualizationContainerProps> = ({
  title,
  description,
  actions,
  isLoading = false,
  error,
  emptyMessage = 'Sem dados para exibir.',
  isEmpty = false,
  height = 320,
  className,
  style,
  children
}) => {
  const { tokens } = useDesignSystem();
  const resolvedHeight = resolveHeight(height) ?? '320px';

  const renderState = () => {
    if (error) {
      return (
        <div
          role="alert"
          className="ds-card"
          style={{
            padding: tokens.spacing['4'],
            borderRadius: tokens.radius.md,
            backgroundColor: tokens.colors.surfaceMuted,
            border: `1px dashed ${tokens.colors.border}`,
            textAlign: 'center'
          }}
        >
          <strong style={{ display: 'block', marginBottom: tokens.spacing['2'] }}>Não foi possível carregar os dados.</strong>
          <span className="ds-text-muted" style={{ fontSize: tokens.typography.fontSize.sm }}>
            {error}
          </span>
        </div>
      );
    }

    if (isEmpty) {
      return (
        <div
          style={{
            padding: tokens.spacing['4'],
            borderRadius: tokens.radius.md,
            backgroundColor: tokens.colors.surfaceMuted,
            border: `1px dashed ${tokens.colors.border}`,
            textAlign: 'center'
          }}
        >
          <strong style={{ display: 'block', marginBottom: tokens.spacing['2'] }}>Nada por aqui ainda</strong>
          <span className="ds-text-muted" style={{ fontSize: tokens.typography.fontSize.sm }}>
            {emptyMessage}
          </span>
        </div>
      );
    }

    return children;
  };

  return (
    <section
      aria-busy={isLoading}
      className={className}
      style={{
        display: 'grid',
        gap: tokens.spacing['4'],
        padding: tokens.spacing['5'],
        borderRadius: tokens.radius.lg,
        border: `1px solid ${tokens.colors.border}`,
        backgroundColor: tokens.colors.surface,
        boxShadow: tokens.shadow.sm,
        minWidth: 0,
        ...(style ?? {})
      }}
    >
      {(title || description || actions) && (
        <header
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: actions ? 'center' : 'flex-start',
            gap: tokens.spacing['3'],
            justifyContent: actions ? 'space-between' : 'flex-start'
          }}
        >
          <div style={{ display: 'grid', gap: tokens.spacing['1'], minWidth: 0 }}>
            {title ? (
              <h3
                style={{
                  margin: 0,
                  fontSize: tokens.typography.fontSize.lg,
                  fontWeight: tokens.typography.fontWeight.semibold,
                  color: tokens.colors.text
                }}
              >
                {title}
              </h3>
            ) : null}
            {description ? (
              <p
                style={{
                  margin: 0,
                  color: tokens.colors.textMuted,
                  fontSize: tokens.typography.fontSize.sm
                }}
              >
                {description}
              </p>
            ) : null}
          </div>
          {actions ? <div style={{ marginLeft: 'auto' }}>{actions}</div> : null}
        </header>
      )}
      <div
        style={{
          position: 'relative',
          minHeight: resolvedHeight,
          width: '100%'
        }}
      >
        {isLoading ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `color-mix(in srgb, ${tokens.colors.surface} 85%, transparent)`,
              backdropFilter: 'blur(2px)',
              zIndex: 2
            }}
          >
            <Spinner />
          </div>
        ) : null}
        <div
          style={{
            height: resolvedHeight,
            width: '100%',
            position: 'relative',
            zIndex: 1,
            opacity: isLoading ? 0.4 : 1,
            transition: 'opacity 0.3s ease'
          }}
        >
          {renderState()}
        </div>
      </div>
    </section>
  );
};

