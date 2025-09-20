import React from 'react';
import type { ReactNode } from 'react';
import { useDesignSystem } from '../../theme';
import { Spinner } from '../_shared/Spinner';

export type BarChartDatum = {
  label: string;
  value: number;
  color?: string;
  description?: ReactNode;
};

export type BarChartProps = {
  title?: ReactNode;
  description?: ReactNode;
  data: BarChartDatum[];
  valueFormatter?: (value: number) => string;
  isLoading?: boolean;
  error?: ReactNode;
  emptyMessage?: ReactNode;
  disabled?: boolean;
};

const defaultFormatter = (value: number) => Intl.NumberFormat('pt-BR').format(value);

export const BarChart: React.FC<BarChartProps> = ({
  title,
  description,
  data,
  valueFormatter = defaultFormatter,
  isLoading = false,
  error,
  emptyMessage = 'Sem dados para exibir.',
  disabled = false
}) => {
  const { tokens } = useDesignSystem();
  const maxValue = Math.max(...data.map((item) => item.value), 0);
  const palette = tokens.colors.primary;
  const defaultBarColor =
    typeof palette === 'string'
      ? palette
      : (palette as Record<string, string>)['500'] ?? tokens.colors.text;

  const renderState = () => {
    if (isLoading) {
      return (
        <div
          style={{
            display: 'grid',
            gap: tokens.spacing['3'],
            paddingTop: tokens.spacing['4']
          }}
        >
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="ds-skeleton" style={{ height: '28px' }} />
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div
          role="alert"
          className="ds-card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: tokens.spacing['3'],
            textAlign: 'center'
          }}
        >
          <strong style={{ fontWeight: tokens.typography.fontWeight.semibold }}>Erro ao renderizar o gráfico</strong>
          <span className="ds-text-muted" style={{ fontSize: tokens.typography.fontSize.sm }}>
            {error}
          </span>
        </div>
      );
    }

    if (!data.length) {
      return (
        <div
          className="ds-card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: tokens.spacing['2'],
            textAlign: 'center'
          }}
        >
          <strong style={{ fontWeight: tokens.typography.fontWeight.medium }}>Sem dados</strong>
          <span className="ds-text-muted" style={{ fontSize: tokens.typography.fontSize.sm }}>
            {emptyMessage}
          </span>
        </div>
      );
    }

    return (
      <div
        role="img"
        aria-label={typeof title === 'string' ? title : 'Gráfico de barras'}
        style={{
          display: 'grid',
          gap: tokens.spacing['3'],
          paddingTop: tokens.spacing['4']
        }}
      >
        {data.map((item) => {
          const percentage = maxValue === 0 ? 0 : Math.round((item.value / maxValue) * 100);
          const barColor = item.color ?? defaultBarColor;
          return (
            <div key={item.label} style={{ display: 'grid', gap: tokens.spacing['1'] }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  fontSize: tokens.typography.fontSize.sm,
                  color: tokens.colors.text
                }}
              >
                <span>{item.label}</span>
                <strong style={{ fontWeight: tokens.typography.fontWeight.semibold }}>
                  {valueFormatter(item.value)}
                </strong>
              </div>
              <div
                aria-hidden
                style={{
                  backgroundColor: tokens.colors.surfaceMuted,
                  borderRadius: tokens.radius.full,
                  height: '12px',
                  overflow: 'hidden',
                  opacity: disabled ? 0.5 : 1
                }}
              >
                <div
                  style={{
                    width: `${percentage}%`,
                    background: `linear-gradient(90deg, ${barColor}, ${barColor})`,
                    borderRadius: tokens.radius.full,
                    height: '100%',
                    transition: 'width 0.4s ease'
                  }}
                />
              </div>
              {item.description ? (
                <span className="ds-text-muted" style={{ fontSize: tokens.typography.fontSize.xs }}>
                  {item.description}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <section
      aria-busy={isLoading}
      aria-disabled={disabled}
      style={{
        display: 'grid',
        gap: tokens.spacing['2'],
        padding: tokens.spacing['5'],
        borderRadius: tokens.radius.lg,
        border: `1px solid ${tokens.colors.border}`,
        boxShadow: tokens.shadow.sm,
        backgroundColor: tokens.colors.surface,
        opacity: disabled ? 0.6 : 1,
        minWidth: 0
      }}
    >
      {title ? (
        <header style={{ display: 'grid', gap: tokens.spacing['1'] }}>
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
          {description ? (
            <p
              style={{
                margin: 0,
                fontSize: tokens.typography.fontSize.sm,
                color: tokens.colors.textMuted
              }}
            >
              {description}
            </p>
          ) : null}
        </header>
      ) : null}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: tokens.spacing['4'] }}>
          <Spinner />
        </div>
      ) : null}
      {renderState()}
    </section>
  );
};
