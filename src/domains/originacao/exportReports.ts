import type {
  DashboardBreakdownItem,
  DashboardHighlight,
  DashboardMetric,
} from '@/services/dashboardService';

const CSV_DELIMITER = ';';
const LINE_BREAK = '\r\n';
const FALLBACK_VALUE = '—';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const percentFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  maximumFractionDigits: 2,
});

const decimalFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function escapeCsvValue(value: string): string {
  const shouldEscape = value.includes('"') || value.includes(CSV_DELIMITER) || /[\n\r]/u.test(value);
  if (!shouldEscape) {
    return value;
  }

  return `"${value.replace(/"/gu, '""')}"`;
}

function formatMetricValue(metric: DashboardMetric): string {
  if (metric.unit === 'percent') {
    return percentFormatter.format(metric.value / 100);
  }

  if (metric.unit === 'currency') {
    return currencyFormatter.format(metric.value);
  }

  return decimalFormatter.format(metric.value);
}

function formatMetricChange(metric: DashboardMetric): string {
  if (metric.change == null) {
    return FALLBACK_VALUE;
  }

  return percentFormatter.format(metric.change / 100);
}

function translateTrend(trend?: DashboardMetric['trend']): string {
  switch (trend) {
    case 'up':
      return 'Alta';
    case 'down':
      return 'Queda';
    case 'steady':
      return 'Estável';
    default:
      return FALLBACK_VALUE;
  }
}

function formatPercentage(value?: number): string {
  if (value == null) {
    return FALLBACK_VALUE;
  }

  return percentFormatter.format(value / 100);
}

function formatDecimal(value?: number): string {
  if (value == null) {
    return FALLBACK_VALUE;
  }

  return decimalFormatter.format(value);
}

function formatHighlightMetric(value?: number): string {
  if (value == null) {
    return FALLBACK_VALUE;
  }

  return percentFormatter.format(value / 100);
}

function buildCsvContent(rows: readonly string[][]): string {
  return rows
    .map((row) => row.map((cell) => escapeCsvValue(cell)).join(CSV_DELIMITER))
    .join(LINE_BREAK);
}

export interface OriginationReportExportOptions {
  readonly metrics: readonly DashboardMetric[];
  readonly breakdowns: readonly DashboardBreakdownItem[];
  readonly highlights: readonly DashboardHighlight[];
  readonly updatedAt?: string;
}

export function exportOriginationReports({
  metrics,
  breakdowns,
  highlights,
  updatedAt,
}: OriginationReportExportOptions): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('A exportação não é suportada neste ambiente.');
  }

  const rows: string[][] = [];
  const now = new Date();

  rows.push(['Relatórios e indicadores de originação']);
  rows.push(['Gerado em', dateFormatter.format(now)]);

  if (updatedAt) {
    rows.push(['Dados atualizados em', dateFormatter.format(new Date(updatedAt))]);
  }

  rows.push([]);
  rows.push(['Métricas principais']);
  rows.push(['Indicador', 'Valor', 'Variação', 'Tendência', 'Descrição']);

  metrics.forEach((metric) => {
    rows.push([
      metric.label,
      formatMetricValue(metric),
      formatMetricChange(metric),
      translateTrend(metric.trend),
      metric.description ?? '',
    ]);
  });

  rows.push([]);
  rows.push(['Distribuição por região']);
  rows.push(['Categoria', 'Valor', 'Participação']);

  breakdowns.forEach((item) => {
    rows.push([
      item.label,
      formatDecimal(item.value),
      formatPercentage(item.percentage),
    ]);
  });

  rows.push([]);
  rows.push(['Alertas de análise']);
  rows.push(['Alerta', 'Descrição', 'Impacto', 'Probabilidade']);

  highlights.forEach((highlight) => {
    rows.push([
      highlight.title,
      highlight.description,
      formatHighlightMetric(highlight.impact),
      formatHighlightMetric(highlight.probability),
    ]);
  });

  const csvContent = buildCsvContent(rows);
  const blob = new Blob([`\uFEFF${csvContent}`], {
    type: 'text/csv;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const dateSuffix = now.toISOString().slice(0, 10);
  anchor.href = url;
  anchor.download = `origination-relatorios-${dateSuffix}.csv`;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';

  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}
