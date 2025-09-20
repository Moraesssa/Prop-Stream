import React from 'react';
import type { ReactNode } from 'react';
import { lightTokens, darkTokens, DesignTokens } from '../theme';

type TokenGridProps = {
  title: string;
  tokens: Record<string, string | number>;
  renderPreview?: (value: string | number, name: string) => ReactNode;
};

const normalizeEntries = (tokens: Record<string, string | number>) =>
  Object.entries(tokens).map(([name, value]) => ({ name, value }));

export const TokenGrid: React.FC<TokenGridProps> = ({ title, tokens, renderPreview }) => (
  <div style={{ marginBlock: 'var(--ds-spacing-6)' }}>
    <h3
      style={{
        marginBottom: 'var(--ds-spacing-3)',
        fontSize: 'var(--ds-typography-font-size-lg)',
        fontWeight: 600
      }}
    >
      {title}
    </h3>
    <div
      style={{
        display: 'grid',
        gap: 'var(--ds-spacing-3)',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))'
      }}
    >
      {normalizeEntries(tokens).map(({ name, value }) => (
        <div
          key={name}
          className="ds-card"
          style={{
            display: 'grid',
            gap: 'var(--ds-spacing-2)' 
          }}
        >
          {renderPreview ? (
            <div>{renderPreview(value, name)}</div>
          ) : null}
          <div>
            <strong style={{ display: 'block', marginBottom: 'var(--ds-spacing-1)' }}>{name}</strong>
            <code
              style={{
                fontFamily: 'var(--ds-typography-font-family-mono)',
                fontSize: 'var(--ds-typography-font-size-xs)'
              }}
            >
              {String(value)}
            </code>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const ColorsTokenGrid: React.FC<{ theme?: 'light' | 'dark' }> = ({ theme = 'light' }) => {
  const palette = theme === 'dark' ? darkTokens.colors : lightTokens.colors;
  const swatches = Object.entries(palette).filter(([, value]) => typeof value !== 'string');

  return (
    <div style={{ display: 'grid', gap: 'var(--ds-spacing-6)' }}>
      {swatches.map(([name, value]) => (
        <TokenGrid
          key={name}
          title={name}
          tokens={value as Record<string, string>}
          renderPreview={(tokenValue) => (
            <div
              style={{
                height: '48px',
                borderRadius: 'var(--ds-radius-md)',
                background: String(tokenValue),
                border: '1px solid rgba(15,23,42,0.12)'
              }}
            />
          )}
        />
      ))}
    </div>
  );
};

export const TypographyTokenGrid: React.FC<{ tokens?: DesignTokens }> = ({ tokens = lightTokens }) => (
  <div style={{ display: 'grid', gap: 'var(--ds-spacing-3)' }}>
    <TokenGrid title="Fontes" tokens={tokens.typography.fontFamily} />
    <TokenGrid
      title="Tamanhos"
      tokens={tokens.typography.fontSize}
      renderPreview={(value) => (
        <span style={{ fontSize: String(value), display: 'block' }}>Ag 18 {value}</span>
      )}
    />
    <TokenGrid title="Alturas de linha" tokens={tokens.typography.lineHeight} />
    <TokenGrid title="Pesos" tokens={tokens.typography.fontWeight} />
  </div>
);

export const SpacingTokenGrid: React.FC<{ tokens?: DesignTokens }> = ({ tokens = lightTokens }) => (
  <TokenGrid
    title="Escala de espaçamento"
    tokens={tokens.spacing}
    renderPreview={(value) => (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--ds-spacing-2)'
        }}
      >
        <span
          style={{
            display: 'inline-block',
            height: '16px',
            width: String(value),
            minWidth: '8px',
            backgroundColor: 'var(--ds-colors-primary-200)',
            borderRadius: 'var(--ds-radius-full)'
          }}
        />
        <span>{String(value)}</span>
      </div>
    )}
  />
);
