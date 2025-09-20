import { createContext, useContext } from 'react';
import type { DesignTokens, ThemeName } from './tokens';

type DesignSystemContextValue = {
  theme: ThemeName;
  tokens: DesignTokens;
  setTheme: (theme: ThemeName) => void;
  toggleTheme: () => void;
};

export const DesignSystemContext = createContext<DesignSystemContextValue | undefined>(undefined);

export const useDesignSystem = (): DesignSystemContextValue => {
  const context = useContext(DesignSystemContext);
  if (!context) {
    throw new Error('useDesignSystem must be used inside a DesignSystemProvider');
  }

  return context;
};

export type { DesignSystemContextValue };
