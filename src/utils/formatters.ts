export interface CurrencyFormatOptions {
  locale?: string;
  currency?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  currencyDisplay?: 'symbol' | 'code' | 'name' | 'narrowSymbol';
  fallback?: string;
}

export interface DateFormatOptions {
  locale?: string;
  format?: Intl.DateTimeFormatOptions;
  relative?: boolean;
  fallback?: string;
}

export interface PercentageFormatOptions {
  locale?: string;
  fractionDigits?: number;
  normalized?: boolean;
  signDisplay?: 'auto' | 'never' | 'always' | 'exceptZero';
}

export interface DeltaIndicatorOptions extends PercentageFormatOptions {
  unit?: string;
  positiveSymbol?: string;
  negativeSymbol?: string;
  neutralSymbol?: string;
  showSign?: boolean;
}

export interface DeltaIndicatorResult {
  text: string;
  trend: 'positive' | 'negative' | 'neutral';
  value: number;
}

const DEFAULT_LOCALE = 'pt-BR';
const DEFAULT_CURRENCY = 'BRL';

export function formatCurrency(
  value: number | string,
  options: CurrencyFormatOptions = {}
): string {
  const numeric = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(numeric)) {
    return options.fallback ?? '';
  }

  const {
    locale = DEFAULT_LOCALE,
    currency = DEFAULT_CURRENCY,
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    currencyDisplay = 'symbol'
  } = options;

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay,
    minimumFractionDigits,
    maximumFractionDigits
  }).format(numeric);
}

export function formatDate(value: Date | string | number, options: DateFormatOptions = {}): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return options.fallback ?? '';
  }

  const locale = options.locale ?? DEFAULT_LOCALE;
  if (options.relative) {
    return formatRelativeTime(date, locale);
  }

  const format = options.format ?? {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  };
  return new Intl.DateTimeFormat(locale, format).format(date);
}

export function formatPercentage(value: number, options: PercentageFormatOptions = {}): string {
  const { locale = DEFAULT_LOCALE, fractionDigits = 2, normalized = false, signDisplay = 'auto' } = options;
  const base = normalized ? value : value / 100;

  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
    signDisplay
  }).format(base);
}

export function formatDeltaIndicator(value: number, options: DeltaIndicatorOptions = {}): DeltaIndicatorResult {
  const trend: DeltaIndicatorResult['trend'] = value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral';
  const symbolMap = {
    positive: options.positiveSymbol ?? '▲',
    negative: options.negativeSymbol ?? '▼',
    neutral: options.neutralSymbol ?? '—'
  } as const;

  const magnitude = Math.abs(value);
  const locale = options.locale ?? DEFAULT_LOCALE;
  const fractionDigits = options.fractionDigits ?? 2;
  const normalized = options.normalized ?? false;

  let formattedMagnitude: string;
  if (!options.unit || options.unit === '%') {
    formattedMagnitude = formatPercentage(magnitude, {
      locale,
      fractionDigits,
      normalized,
      signDisplay: 'never'
    });
  } else {
    formattedMagnitude = new Intl.NumberFormat(locale, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
      signDisplay: 'never'
    }).format(magnitude);
  }

  const sign = options.showSign && trend !== 'neutral' ? (trend === 'positive' ? '+' : '-') : '';
  const unitSuffix = options.unit && options.unit !== '%' ? ` ${options.unit}` : '';
  const text = trend === 'neutral'
    ? `${symbolMap[trend]} ${formattedMagnitude}${unitSuffix}`
    : `${symbolMap[trend]} ${sign}${formattedMagnitude}${unitSuffix}`;

  return {
    text,
    trend,
    value
  };
}

function formatRelativeTime(date: Date, locale: string): string {
  const diffMs = date.getTime() - Date.now();
  const diffSeconds = Math.round(diffMs / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  const thresholds: Array<{ limit: number; divisor: number; unit: Intl.RelativeTimeFormatUnit }> = [
    { limit: 60, divisor: 1, unit: 'second' },
    { limit: 3600, divisor: 60, unit: 'minute' },
    { limit: 86400, divisor: 3600, unit: 'hour' },
    { limit: 604800, divisor: 86400, unit: 'day' },
    { limit: 2629800, divisor: 604800, unit: 'week' },
    { limit: 31557600, divisor: 2629800, unit: 'month' }
  ];

  const absSeconds = Math.abs(diffSeconds);
  for (const threshold of thresholds) {
    if (absSeconds < threshold.limit) {
      const value = Math.round(diffSeconds / threshold.divisor);
      return rtf.format(value, threshold.unit);
    }
  }

  const years = Math.round(diffSeconds / 31557600);
  return rtf.format(years, 'year');
}
