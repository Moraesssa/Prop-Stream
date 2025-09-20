export type ThemeName = 'light' | 'dark';

type TokenLeaf = string | number;

export type NestedTokenRecord = {
  [key: string]: TokenLeaf | NestedTokenRecord;
};

export type DesignTokens = {
  colors: NestedTokenRecord & {
    background: string;
    surface: string;
    surfaceMuted: string;
    border: string;
    text: string;
    textMuted: string;
    primary: NestedTokenRecord & {
      foreground: string;
    };
    success: NestedTokenRecord & {
      foreground: string;
    };
    warning: NestedTokenRecord & {
      foreground: string;
    };
    danger: NestedTokenRecord & {
      foreground: string;
    };
  };
  spacing: Record<string, string>;
  typography: {
    fontFamily: {
      sans: string;
      mono: string;
    };
    fontSize: Record<string, string>;
    lineHeight: Record<string, string>;
    fontWeight: Record<string, number>;
  };
  radius: Record<string, string>;
  shadow: Record<string, string>;
};

const spacingScale: Record<string, string> = {
  px: '1px',
  '0': '0rem',
  '0.5': '0.125rem',
  '1': '0.25rem',
  '1.5': '0.375rem',
  '2': '0.5rem',
  '2.5': '0.625rem',
  '3': '0.75rem',
  '3.5': '0.875rem',
  '4': '1rem',
  '5': '1.25rem',
  '6': '1.5rem',
  '8': '2rem',
  '10': '2.5rem',
  '12': '3rem'
};

const typography = {
  fontFamily: {
    sans: "'Inter', 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    mono: "'IBM Plex Mono', 'SFMono-Regular', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem'
  },
  lineHeight: {
    tight: '1.2',
    snug: '1.35',
    normal: '1.5',
    relaxed: '1.7'
  },
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700
  }
};

const radius = {
  none: '0px',
  sm: '0.25rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  full: '9999px'
};

const shadow = {
  sm: '0 1px 2px 0 rgba(15, 23, 42, 0.07)',
  md: '0 4px 12px rgba(15, 23, 42, 0.12)',
  lg: '0 20px 45px rgba(15, 23, 42, 0.18)'
};

const tailwindPalette = {
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5f5',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a'
  },
  blue: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a'
  },
  emerald: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b'
  },
  amber: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f'
  },
  rose: {
    50: '#fff1f2',
    100: '#ffe4e6',
    200: '#fecdd3',
    300: '#fda4af',
    400: '#fb7185',
    500: '#f43f5e',
    600: '#e11d48',
    700: '#be123c',
    800: '#9f1239',
    900: '#881337'
  }
};

export const lightTokens: DesignTokens = {
  colors: {
    background: tailwindPalette.slate[50],
    surface: '#ffffff',
    surfaceMuted: tailwindPalette.slate[100],
    border: tailwindPalette.slate[200],
    text: tailwindPalette.slate[900],
    textMuted: tailwindPalette.slate[500],
    primary: {
      ...tailwindPalette.blue,
      foreground: '#ffffff'
    },
    success: {
      ...tailwindPalette.emerald,
      foreground: '#ffffff'
    },
    warning: {
      ...tailwindPalette.amber,
      foreground: tailwindPalette.slate[900]
    },
    danger: {
      ...tailwindPalette.rose,
      foreground: '#ffffff'
    }
  },
  spacing: spacingScale,
  typography,
  radius,
  shadow
};

export const darkTokens: DesignTokens = {
  colors: {
    background: tailwindPalette.slate[900],
    surface: tailwindPalette.slate[800],
    surfaceMuted: tailwindPalette.slate[700],
    border: 'rgba(148, 163, 184, 0.25)',
    text: '#f8fafc',
    textMuted: tailwindPalette.slate[300],
    primary: {
      ...tailwindPalette.blue,
      foreground: '#f8fafc'
    },
    success: {
      ...tailwindPalette.emerald,
      foreground: '#f8fafc'
    },
    warning: {
      ...tailwindPalette.amber,
      foreground: tailwindPalette.slate[900]
    },
    danger: {
      ...tailwindPalette.rose,
      foreground: '#f8fafc'
    }
  },
  spacing: spacingScale,
  typography,
  radius,
  shadow
};

export const tokensByTheme: Record<ThemeName, DesignTokens> = {
  light: lightTokens,
  dark: darkTokens
};

