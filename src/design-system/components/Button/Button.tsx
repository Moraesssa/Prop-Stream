import React from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { useDesignSystem } from '../../theme';
import { Spinner } from '../_shared/Spinner';

type ButtonVariant = 'solid' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';
type ButtonTone = 'primary' | 'neutral' | 'danger';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  tone?: ButtonTone;
  size?: ButtonSize;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  loading?: boolean;
};

const sizeTokens: Record<ButtonSize, { paddingX: string; paddingY: string; fontSize: string }> = {
  sm: {
    paddingX: 'var(--ds-spacing-3)',
    paddingY: 'var(--ds-spacing-2)',
    fontSize: 'var(--ds-typography-font-size-sm)'
  },
  md: {
    paddingX: 'var(--ds-spacing-4)',
    paddingY: 'var(--ds-spacing-2.5)',
    fontSize: 'var(--ds-typography-font-size-base)'
  },
  lg: {
    paddingX: 'var(--ds-spacing-5)',
    paddingY: 'var(--ds-spacing-3)',
    fontSize: 'var(--ds-typography-font-size-lg)'
  }
};

const toneToPaletteKey: Record<ButtonTone, string> = {
  primary: 'primary',
  neutral: 'text',
  danger: 'danger'
};

const getPaletteColor = (
  tokens: ReturnType<typeof useDesignSystem>['tokens'],
  tone: ButtonTone,
  shade: string
) => {
  const palette = tokens.colors[toneToPaletteKey[tone]];
  if (typeof palette === 'string') {
    return palette;
  }
  return (palette as Record<string, string>)[shade] ?? (palette as Record<string, string>)['500'];
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'solid',
      tone = 'primary',
      size = 'md',
      leadingIcon,
      trailingIcon,
      loading = false,
      disabled,
      style,
      ...props
    },
    ref
  ) => {
    const { tokens } = useDesignSystem();
    const [isHovered, setIsHovered] = React.useState(false);

    const baseStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: tokens.spacing['2'],
      borderRadius: tokens.radius.md,
      borderWidth: 1,
      borderStyle: 'solid',
      fontWeight: tokens.typography.fontWeight.semibold,
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1,
      transition:
        'transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease, color 0.2s ease',
      textDecoration: 'none',
      outline: 'none'
    };

    const sizeStyles = sizeTokens[size];

    const palette = tokens.colors[toneToPaletteKey[tone]];
    const color500 = getPaletteColor(tokens, tone, '500');
    const color600 = getPaletteColor(tokens, tone, '600');
    const color50 = getPaletteColor(tokens, tone, '50');

    const toneForeground =
      typeof palette === 'string'
        ? tokens.colors.surface
        : (palette as Record<string, string>).foreground ?? tokens.colors.surface;

    const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
      solid: {
        backgroundColor: color500,
        color: tone === 'neutral' ? tokens.colors.surface : toneForeground,
        borderColor: color500
      },
      outline: {
        backgroundColor: 'transparent',
        color: color600,
        borderColor: color500
      },
      ghost: {
        backgroundColor: tone === 'neutral' ? tokens.colors.surfaceMuted : color50,
        color: color600,
        borderColor: 'transparent'
      }
    };

    const hoverStyles: Record<ButtonVariant, React.CSSProperties> = {
      solid: {
        backgroundColor: color600,
        boxShadow: tokens.shadow.sm
      },
      outline: {
        borderColor: color600,
        color: color600,
        backgroundColor: tone === 'neutral' ? 'rgba(15,23,42,0.05)' : `${color50}`
      },
      ghost: {
        backgroundColor: tone === 'neutral' ? 'rgba(15,23,42,0.05)' : `${color50}`,
        color: color600
      }
    };

    const finalStyle: React.CSSProperties = {
      ...baseStyle,
      paddingInline: sizeStyles.paddingX,
      paddingBlock: sizeStyles.paddingY,
      fontSize: sizeStyles.fontSize,
      ...variantStyles[variant],
      ...(isHovered && !disabled && !loading ? hoverStyles[variant] : {}),
      ...style
    };

    return (
      <button
        ref={ref}
        style={finalStyle}
        disabled={disabled || loading}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsHovered(true)}
        onBlur={() => setIsHovered(false)}
        {...props}
      >
        {loading ? (
          <Spinner />
        ) : (
          <>
            {leadingIcon ? <span style={{ display: 'inline-flex' }}>{leadingIcon}</span> : null}
            <span style={{ whiteSpace: 'nowrap' }}>{children}</span>
            {trailingIcon ? <span style={{ display: 'inline-flex' }}>{trailingIcon}</span> : null}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
