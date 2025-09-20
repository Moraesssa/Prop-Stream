import httpClient, {
  type HttpClientError,
  type HttpRequestConfig,
  type HttpSuccessResponse,
  normalizeHttpError,
  toHttpSuccessResponse,
} from './httpClient';

export type DashboardTimeframe = '7d' | '30d' | '90d' | '180d';

export interface DashboardMetric {
  id: string;
  label: string;
  value: number;
  unit?: string;
  change?: number;
  trend?: 'up' | 'down' | 'steady';
  description?: string;
}

export interface DashboardBreakdownItem {
  id: string;
  label: string;
  value: number;
  percentage?: number;
}

export interface DashboardHighlight {
  id: string;
  title: string;
  description: string;
  impact?: number;
  probability?: number;
}

export interface DashboardSummary {
  scope: string;
  timeframe?: DashboardTimeframe;
  updatedAt: string;
  metrics: DashboardMetric[];
  breakdowns: DashboardBreakdownItem[];
  highlights: DashboardHighlight[];
}

export interface DashboardFilters {
  scope?: string;
  timeframe?: DashboardTimeframe;
  portfolioId?: string;
  [key: string]: unknown;
}

export interface DashboardServiceSuccess<TData>
  extends HttpSuccessResponse<TData> {
  success: true;
}

export interface DashboardServiceError {
  success: false;
  status?: number;
  error: HttpClientError;
}

export type DashboardServiceResult<TData> =
  | DashboardServiceSuccess<TData>
  | DashboardServiceError;

const BASE_PATH = '/dashboards';

function toServiceSuccess<TData>(
  response: HttpSuccessResponse<TData>,
): DashboardServiceSuccess<TData> {
  return {
    success: true,
    ...response,
  };
}

function toServiceError(error: unknown): DashboardServiceError {
  const normalized = normalizeHttpError(error);
  return {
    success: false,
    status: normalized.status,
    error: normalized,
  };
}

function mergeParams(
  base: HttpRequestConfig['params'],
  extras: Record<string, unknown> | undefined,
) {
  if (!extras) {
    return base;
  }

  return {
    ...(typeof base === 'object' && base != null ? base : {}),
    ...extras,
  };
}

function sanitizeFilters(filters?: DashboardFilters) {
  if (!filters) {
    return undefined;
  }

  const entries = Object.entries(filters).filter(([, value]) => {
    return value !== undefined && value !== null && value !== '';
  });

  if (entries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(entries);
}

export async function fetchDashboardSummary(
  filters?: DashboardFilters,
  config?: HttpRequestConfig,
): Promise<DashboardServiceResult<DashboardSummary>> {
  try {
    const requestConfig: HttpRequestConfig = {
      ...config,
      params: mergeParams(config?.params, sanitizeFilters(filters)),
    };

    const response = await httpClient.get<DashboardSummary>(
      `${BASE_PATH}/summary`,
      requestConfig,
    );

    return toServiceSuccess(toHttpSuccessResponse(response));
  } catch (error) {
    return toServiceError(error);
  }
}

export function assertDashboardSuccess<TData>(
  result: DashboardServiceResult<TData>,
): asserts result is DashboardServiceSuccess<TData> {
  if (!result.success) {
    throw result.error;
  }
}
