import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { VisualizationContainer } from './VisualizationContainer';
import type { VisualizationBaseProps } from './VisualizationContainer';
import { ensureColorPalette, getSchemePalette, type VisualizationColorScheme } from './color-utils';
import { useDesignSystem } from '../design-system/theme';

type EChartsInstance = {
  setOption: (option: Record<string, unknown>, notMerge?: boolean) => void;
  dispose: () => void;
  resize: () => void;
};

type EChartsModule = {
  init: (
    element: HTMLDivElement,
    theme?: unknown,
    options?: { renderer?: 'canvas' | 'svg' }
  ) => EChartsInstance;
  default?: EChartsModule;
};

type ChartSeriesType = 'bar' | 'line';

export type ComparativeSeries = {
  name: string;
  type?: ChartSeriesType;
  values: Array<number | null>;
  stack?: string;
  area?: boolean;
};

export type ComparativeChartData = {
  categories: string[];
  series: ComparativeSeries[];
};

export type EChartsVisualizationProps = VisualizationBaseProps & {
  data: ComparativeChartData;
  valueFormatter?: (value: number) => string;
  colorScheme?: VisualizationColorScheme;
  colors?: string[];
  optionOverrides?: Record<string, unknown>;
  onChartReady?: (instance: EChartsInstance) => void;
};

const defaultFormatter = (value: number) =>
  Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const mergeDeep = <T extends Record<string, unknown>>(
  target: T,
  source?: Record<string, unknown>
): T => {
  if (!source) {
    return target;
  }

  const output: Record<string, unknown> = { ...target };

  Object.entries(source).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    if (isPlainObject(value) && isPlainObject(output[key] as unknown)) {
      output[key] = mergeDeep(output[key] as Record<string, unknown>, value);
      return;
    }

    output[key] = value;
  });

  return output as T;
};

const hasSeriesData = (series: ComparativeSeries[]): boolean =>
  series.some((serie) => serie.values.some((value) => value !== null && value !== undefined));

export const EChartsVisualization: React.FC<EChartsVisualizationProps> = ({
  title,
  description,
  actions,
  data,
  valueFormatter = defaultFormatter,
  colorScheme = 'primary',
  colors,
  optionOverrides,
  onChartReady,
  isLoading,
  error,
  emptyMessage = 'Inclua filtros ou ajuste o período para visualizar os resultados.',
  height = 360,
  className,
  style
}) => {
  const { tokens } = useDesignSystem();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<EChartsInstance | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [loadError, setLoadError] = useState<ReactNode | null>(null);

  const palette = useMemo(() => {
    const fallback = getSchemePalette(tokens, colorScheme, tokens.colors.text);
    return ensureColorPalette(colors, fallback);
  }, [tokens, colorScheme, colors]);

  useEffect(() => {
    if (!containerRef.current || typeof window === 'undefined') {
      return;
    }

    let isMounted = true;

    const setup = async () => {
      try {
        const module = (await import(/* @vite-ignore */ 'echarts')) as EChartsModule;
        const echarts = module.default ?? module;

        if (!isMounted || !containerRef.current) {
          return;
        }

        const instance = echarts.init(containerRef.current, undefined, { renderer: 'canvas' });
        chartRef.current = instance;
        onChartReady?.(instance);

        const resizeObserver = new ResizeObserver(() => {
          instance.resize();
        });
        resizeObserver.observe(containerRef.current);
        resizeObserverRef.current = resizeObserver;
        setLoadError(null);
      } catch (err) {
        console.error('ECharts not available', err);
        if (isMounted) {
          setLoadError('Não foi possível carregar a biblioteca de gráficos.');
        }
      }
    };

    setup();

    return () => {
      isMounted = false;
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, [onChartReady]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !hasSeriesData(data.series)) {
      return;
    }

    const categoryLabels = data.categories;

    const axisTextColor = tokens.colors.textMuted;
    const gridColor = tokens.colors.surfaceMuted;

    const baseOption: Record<string, unknown> = {
      color: palette,
      backgroundColor: 'transparent',
      textStyle: {
        color: tokens.colors.text,
        fontFamily: tokens.typography.fontFamily.sans
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: tokens.colors.surface,
        borderColor: tokens.colors.border,
        textStyle: {
          color: tokens.colors.text,
          fontSize: tokens.typography.fontSize.sm
        },
        valueFormatter: (value: number) => valueFormatter(Number(value))
      },
      legend: {
        top: 0,
        textStyle: {
          color: axisTextColor,
          fontSize: tokens.typography.fontSize.sm
        },
        itemHeight: 10
      },
      grid: {
        top: 56,
        left: 56,
        right: 32,
        bottom: 40
      },
      xAxis: {
        type: 'category',
        data: categoryLabels,
        axisLine: {
          lineStyle: { color: tokens.colors.border }
        },
        axisTick: { show: false },
        axisLabel: {
          color: axisTextColor,
          fontSize: tokens.typography.fontSize.sm
        }
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: {
          show: true,
          lineStyle: { color: gridColor }
        },
        axisLabel: {
          color: axisTextColor,
          fontSize: tokens.typography.fontSize.sm,
          formatter: (value: number) => valueFormatter(Number(value))
        }
      },
      series: data.series.map((serie, index) => {
        const paletteColor = palette[index % palette.length];
        const type = serie.type ?? 'bar';
        return {
          name: serie.name,
          type,
          data: serie.values,
          stack: serie.stack,
          smooth: type === 'line',
          showSymbol: type === 'line',
          symbol: 'circle',
          symbolSize: 10,
          itemStyle: {
            color: paletteColor
          },
          lineStyle: {
            color: paletteColor,
            width: 3
          },
          areaStyle:
            type === 'line' && serie.area
              ? {
                  color: paletteColor,
                  opacity: 0.16
                }
              : undefined,
          emphasis: {
            focus: 'series'
          }
        };
      })
    };

    const finalOption = mergeDeep(baseOption, optionOverrides);

    chart.setOption(finalOption, true);
  }, [data, palette, tokens, valueFormatter, optionOverrides]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) {
      return;
    }

    if (!hasSeriesData(data.series)) {
      chart.setOption({ series: [] }, true);
    }
  }, [data]);

  const combinedError = error ?? loadError;
  const isEmpty = !hasSeriesData(data.series) || data.categories.length === 0;

  return (
    <VisualizationContainer
      title={title}
      description={description}
      actions={actions}
      isLoading={isLoading}
      error={combinedError}
      emptyMessage={emptyMessage}
      isEmpty={isEmpty && !combinedError && !isLoading}
      height={height}
      className={className}
      style={style}
    >
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%'
        }}
      />
    </VisualizationContainer>
  );
};

