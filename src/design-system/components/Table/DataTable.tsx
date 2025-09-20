import React from 'react';
import type { ReactNode } from 'react';
import { useDesignSystem } from '../../theme';

export type DataTableColumn = {
  key: string;
  header: ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
};

export type DataTableRow = Record<string, ReactNode> & {
  id?: string | number;
};

export type DataTableProps = {
  columns: DataTableColumn[];
  rows: DataTableRow[];
  isLoading?: boolean;
  error?: ReactNode;
  emptyMessage?: ReactNode;
  onRowClick?: (row: DataTableRow) => void;
  caption?: ReactNode;
  disabled?: boolean;
};

const alignToJustify: Record<'left' | 'center' | 'right', string> = {
  left: 'flex-start',
  center: 'center',
  right: 'flex-end'
};

const SkeletonRow: React.FC<{ columns: DataTableColumn[] }> = ({ columns }) => (
  <tr>
    {columns.map((column) => (
      <td key={column.key} style={{ padding: 'var(--ds-spacing-3) var(--ds-spacing-4)' }}>
        <div className="ds-skeleton" style={{ height: '12px', width: '70%' }} />
      </td>
    ))}
  </tr>
);

export const DataTable: React.FC<DataTableProps> = ({
  columns,
  rows,
  isLoading = false,
  error,
  emptyMessage = 'Nenhum dado disponível no momento.',
  onRowClick,
  caption,
  disabled = false
}) => {
  const { tokens } = useDesignSystem();

  const renderContent = () => {
    if (isLoading) {
      return (
        <tbody>
          {Array.from({ length: 3 }).map((_, index) => (
            <SkeletonRow key={`skeleton-${index}`} columns={columns} />
          ))}
        </tbody>
      );
    }

    if (error) {
      return (
        <tbody>
          <tr>
            <td colSpan={columns.length} style={{ padding: tokens.spacing['6'] }}>
              <div
                role="alert"
                className="ds-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: tokens.spacing['3']
                }}
              >
                <strong style={{ fontWeight: tokens.typography.fontWeight.semibold }}>Erro ao carregar dados</strong>
                <span className="ds-text-muted" style={{ fontSize: tokens.typography.fontSize.sm }}>
                  {error}
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      );
    }

    if (!rows.length) {
      return (
        <tbody>
          <tr>
            <td colSpan={columns.length} style={{ padding: tokens.spacing['6'] }}>
              <div
                className="ds-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: tokens.spacing['3']
                }}
              >
                <strong style={{ fontWeight: tokens.typography.fontWeight.medium }}>Nenhum registro encontrado</strong>
                <span className="ds-text-muted" style={{ fontSize: tokens.typography.fontSize.sm }}>
                  {emptyMessage}
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      );
    }

    return (
      <tbody>
        {rows.map((row, index) => {
          const rowKey = row.id ?? `row-${index}`;
          const isClickable = Boolean(onRowClick) && !disabled;
          return (
            <tr
              key={rowKey}
              onClick={() => {
                if (!onRowClick || disabled) return;
                onRowClick(row);
              }}
              style={{
                cursor: isClickable ? 'pointer' : 'default',
                opacity: disabled ? 0.6 : 1,
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(event) => {
                if (!isClickable) return;
                event.currentTarget.style.backgroundColor = tokens.colors.surfaceMuted;
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  style={{
                    padding: `${tokens.spacing['3']} ${tokens.spacing['4']}`,
                    borderTop: `1px solid ${tokens.colors.border}`,
                    fontSize: tokens.typography.fontSize.sm,
                    color: tokens.colors.text,
                    opacity: disabled ? 0.75 : 1
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: alignToJustify[column.align ?? 'left'],
                      width: '100%'
                    }}
                  >
                    {row[column.key] ?? '—'}
                  </div>
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    );
  };

  return (
    <div
      style={{
        width: '100%',
        overflowX: 'auto',
        borderRadius: tokens.radius.lg,
        border: `1px solid ${tokens.colors.border}`,
        boxShadow: tokens.shadow.sm,
        backgroundColor: tokens.colors.surface,
        opacity: disabled ? 0.7 : 1
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
        {caption ? (
          <caption
            style={{
              textAlign: 'left',
              padding: `${tokens.spacing['3']} ${tokens.spacing['4']}`,
              fontSize: tokens.typography.fontSize.sm,
              color: tokens.colors.textMuted
            }}
          >
            {caption}
          </caption>
        ) : null}
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                style={{
                  textAlign: column.align ?? 'left',
                  fontSize: tokens.typography.fontSize.xs,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  fontWeight: tokens.typography.fontWeight.semibold,
                  color: tokens.colors.textMuted,
                  padding: `${tokens.spacing['3']} ${tokens.spacing['4']}`,
                  backgroundColor: tokens.colors.surfaceMuted,
                  borderBottom: `1px solid ${tokens.colors.border}`,
                  width: column.width
                }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        {renderContent()}
      </table>
    </div>
  );
};
