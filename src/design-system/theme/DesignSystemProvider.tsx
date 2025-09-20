import React, { useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { ThemeName, tokensByTheme } from './tokens';
import { tokensToCssVariables } from './css';
import '../styles.css';
import { DesignSystemContext, type DesignSystemContextValue } from './context';

export type DesignSystemProviderProps = {
  children: ReactNode;
  theme?: ThemeName;
  initialTheme?: ThemeName;
  style?: CSSProperties;
  className?: string;
  onThemeChange?: (theme: ThemeName) => void;
};

export const DesignSystemProvider: React.FC<DesignSystemProviderProps> = ({
  children,
  theme: themeProp,
  initialTheme = 'light',
  style,
  className,
  onThemeChange
}) => {
  const [uncontrolledTheme, setUncontrolledTheme] = useState<ThemeName>(initialTheme);

  const theme = themeProp ?? uncontrolledTheme;
  const tokens = useMemo(() => tokensByTheme[theme], [theme]);

  const value = useMemo<DesignSystemContextValue>(() => {
    const setTheme = (nextTheme: ThemeName) => {
      if (!themeProp) {
        setUncontrolledTheme(nextTheme);
      }
      onThemeChange?.(nextTheme);
    };

    const toggleTheme = () => {
      setTheme(theme === 'light' ? 'dark' : 'light');
    };

    return {
      theme,
      tokens,
      setTheme,
      toggleTheme
    };
  }, [theme, tokens, themeProp, onThemeChange]);

  const cssVariables = useMemo(() => tokensToCssVariables(tokens), [tokens]);

  const mergedStyle = useMemo<React.CSSProperties>(() => ({
    ...(cssVariables as React.CSSProperties),
    ...style,
    backgroundColor: cssVariables['--ds-colors-background'],
    color: cssVariables['--ds-colors-text'],
    fontFamily: cssVariables['--ds-typography-font-family-sans']
  }), [cssVariables, style]);

  return (
    <DesignSystemContext.Provider value={value}>
      <div data-ds-theme={theme} className={`ds-provider${className ? ` ${className}` : ''}`} style={mergedStyle}>
        {children}
      </div>
    </DesignSystemContext.Provider>
  );
};
