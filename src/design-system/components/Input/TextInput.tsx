import React, { useId, useState } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { useDesignSystem } from '../../theme';
import { Spinner } from '../_shared/Spinner';

type TextInputState = 'default' | 'error' | 'success';

export type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  hint?: ReactNode;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  loading?: boolean;
  state?: TextInputState;
};

const stateColorKey: Record<TextInputState, keyof ReturnType<typeof useDesignSystem>['tokens']['colors']> = {
  default: 'border',
  error: 'danger',
  success: 'success'
};

export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  (
    {
      label,
      description,
      error,
      hint,
      leadingIcon,
      trailingIcon,
      loading = false,
      disabled,
      state = 'default',
      style,
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const descriptionId = description ? `${inputId}-description` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;

    const { tokens } = useDesignSystem();
    const paletteKey = stateColorKey[state];
    const palette = tokens.colors[paletteKey];
    const focusPaletteKey = state === 'default' ? 'primary' : paletteKey;
    const focusPalette = tokens.colors[focusPaletteKey];

    const getPaletteShade = (value: unknown, shade: string, fallback: string) => {
      if (typeof value === 'string') {
        return value;
      }
      if (value && typeof value === 'object' && shade in (value as Record<string, string>)) {
        return (value as Record<string, string>)[shade];
      }
      return fallback;
    };

    const focusColor = getPaletteShade(focusPalette, '500', tokens.colors.border);
    const baseBorderColor =
      state === 'default'
        ? tokens.colors.border
        : getPaletteShade(palette, '400', tokens.colors.border);
    const focusRingColor =
      state === 'error'
        ? 'rgba(244,63,94,0.25)'
        : state === 'success'
          ? 'rgba(16,185,129,0.25)'
          : 'rgba(59,130,246,0.18)';

    const [isFocused, setIsFocused] = useState(false);

    const containerStyle: React.CSSProperties = {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      borderRadius: tokens.radius.md,
      border: `1px solid ${isFocused ? focusColor : baseBorderColor}`,
      backgroundColor: disabled ? tokens.colors.surfaceMuted : tokens.colors.surface,
      transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
      boxShadow: isFocused ? `0 0 0 4px ${focusRingColor}` : 'none'
    };

    return (
      <div
        style={{
          display: 'grid',
          gap: tokens.spacing['2'],
          width: '100%',
          ...style
        }}
      >
        {label ? (
          <label
            htmlFor={inputId}
            style={{
              fontSize: tokens.typography.fontSize.sm,
              fontWeight: tokens.typography.fontWeight.medium,
              color: tokens.colors.text
            }}
          >
            {label}
          </label>
        ) : null}

        {description ? (
          <span
            id={descriptionId}
            style={{
              fontSize: tokens.typography.fontSize.sm,
              color: tokens.colors.textMuted
            }}
          >
            {description}
          </span>
        ) : null}

        <div style={containerStyle} data-disabled={disabled || loading}>
          {leadingIcon ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                paddingInline: tokens.spacing['3'],
                color: tokens.colors.textMuted
              }}
            >
              {leadingIcon}
            </span>
          ) : null}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled || loading}
            aria-describedby={[descriptionId, errorId].filter(Boolean).join(' ') || undefined}
            aria-invalid={state === 'error'}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              paddingBlock: tokens.spacing['2.5'],
              paddingInlineStart: leadingIcon ? tokens.spacing['2'] : tokens.spacing['3'],
              paddingInlineEnd: trailingIcon ? tokens.spacing['2'] : tokens.spacing['3'],
              fontSize: tokens.typography.fontSize.base,
              color: tokens.colors.text,
              caretColor: focusColor
            }}
            {...props}
          />

          {loading ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                paddingInline: tokens.spacing['3'],
                color: tokens.colors.textMuted
              }}
            >
              <Spinner size={16} />
            </span>
          ) : null}

          {trailingIcon && !loading ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                paddingInline: tokens.spacing['3'],
                color: tokens.colors.textMuted
              }}
            >
              {trailingIcon}
            </span>
          ) : null}
        </div>

        {hint && state !== 'error' ? (
          <span
            style={{
              fontSize: tokens.typography.fontSize.xs,
              color: tokens.colors.textMuted
            }}
          >
            {hint}
          </span>
        ) : null}

        {error && state === 'error' ? (
          <span
            id={errorId}
            role="alert"
            style={{
              fontSize: tokens.typography.fontSize.sm,
              color:
                typeof tokens.colors.danger === 'string'
                  ? tokens.colors.danger
                  : (tokens.colors.danger as Record<string, string>)['500']
            }}
          >
            {error}
          </span>
        ) : null}
      </div>
    );
  }
);

TextInput.displayName = 'TextInput';
