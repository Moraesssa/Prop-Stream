import type { DesignTokens } from '../design-system/theme';

export type VisualizationColorScheme = 'primary' | 'success' | 'warning' | 'danger';

const COLOR_PRIORITY = ['500', '600', '400', '700', '300', '800', '200', '900', '100'];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const extractPalette = (tokenValue: unknown): string[] => {
  if (typeof tokenValue === 'string') {
    return [tokenValue];
  }

  if (!isRecord(tokenValue)) {
    return [];
  }

  const prioritized = COLOR_PRIORITY.map((key) => tokenValue[key]).filter(
    (value): value is string => typeof value === 'string'
  );

  const numericKeys = Object.keys(tokenValue)
    .filter((key) => /^\d+$/.test(key) && !COLOR_PRIORITY.includes(key))
    .sort((a, b) => Number(a) - Number(b))
    .map((key) => tokenValue[key])
    .filter((value): value is string => typeof value === 'string');

  const merged = [...prioritized, ...numericKeys];

  return Array.from(new Set(merged));
};

export const getSchemePalette = (
  tokens: DesignTokens,
  scheme: VisualizationColorScheme,
  fallback: string
): string[] => {
  const rawValue = (tokens.colors as Record<string, unknown>)[scheme];

  const palette = extractPalette(rawValue);

  if (palette.length > 0) {
    return palette;
  }

  return [fallback];
};

export const ensureColorPalette = (colors: string[] | undefined, fallback: string[]): string[] => {
  const filtered = (colors ?? []).filter((value): value is string => Boolean(value));

  if (filtered.length > 0) {
    return filtered;
  }

  return fallback;
};

