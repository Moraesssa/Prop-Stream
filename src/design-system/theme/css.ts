import type { DesignTokens, NestedTokenRecord } from './tokens';

const formatTokenName = (segment: string) =>
  segment
    .replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)
    .replace(/\./g, '-')
    .toLowerCase();

const walkTokens = (
  tokens: NestedTokenRecord,
  path: string[],
  target: Record<string, string>
) => {
  Object.entries(tokens).forEach(([key, value]) => {
    const nextPath = [...path, formatTokenName(key)];
    if (typeof value === 'string' || typeof value === 'number') {
      const cssVariableName = `--${nextPath.join('-')}`;
      target[cssVariableName] = `${value}`;
    } else if (typeof value === 'object' && value !== null) {
      walkTokens(value, nextPath, target);
    }
  });
};

export const tokensToCssVariables = (tokens: DesignTokens): Record<string, string> => {
  const cssVariableMap: Record<string, string> = {};
  walkTokens(tokens as NestedTokenRecord, ['ds'], cssVariableMap);
  return cssVariableMap;
};

