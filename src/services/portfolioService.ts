import httpClient, {
  type HttpClientError,
  type HttpRequestConfig,
  type HttpSuccessResponse,
  normalizeHttpError,
  toHttpSuccessResponse,
} from './httpClient';

export interface PortfolioTotals {
  invested: number;
  currentValue: number;
  netIncome: number;
  occupancy: number;
  irr: number;
}

export interface PortfolioPosition {
  id: string;
  name: string;
  allocation: number;
  invested: number;
  currentValue: number;
  irr: number;
  occupancy: number;
  status: 'up' | 'down' | 'steady';
}

export interface PortfolioEvent {
  id: string;
  title: string;
  date: string;
  type: string;
  description?: string;
}

export interface PortfolioSnapshot {
  portfolioId: string;
  updatedAt: string;
  totals: PortfolioTotals;
  positions: PortfolioPosition[];
  events: PortfolioEvent[];
}

export interface PortfolioFilters {
  portfolioId?: string;
  asOf?: string;
  includeEvents?: boolean;
  [key: string]: unknown;
}

export interface PortfolioServiceSuccess<TData>
  extends HttpSuccessResponse<TData> {
  success: true;
}

export interface PortfolioServiceError {
  success: false;
  status?: number;
  error: HttpClientError;
}

export type PortfolioServiceResult<TData> =
  | PortfolioServiceSuccess<TData>
  | PortfolioServiceError;

const BASE_PATH = '/portfolio';

function toServiceSuccess<TData>(
  response: HttpSuccessResponse<TData>,
): PortfolioServiceSuccess<TData> {
  return {
    success: true,
    ...response,
  };
}

function toServiceError(error: unknown): PortfolioServiceError {
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

function sanitizeFilters(filters?: PortfolioFilters) {
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

export async function fetchPortfolioSnapshot(
  filters?: PortfolioFilters,
  config?: HttpRequestConfig,
): Promise<PortfolioServiceResult<PortfolioSnapshot>> {
  try {
    const requestConfig: HttpRequestConfig = {
      ...config,
      params: mergeParams(config?.params, sanitizeFilters(filters)),
    };

    const response = await httpClient.get<PortfolioSnapshot>(
      `${BASE_PATH}/snapshot`,
      requestConfig,
    );

    return toServiceSuccess(toHttpSuccessResponse(response));
  } catch (error) {
    return toServiceError(error);
  }
}

export function assertPortfolioSuccess<TData>(
  result: PortfolioServiceResult<TData>,
): asserts result is PortfolioServiceSuccess<TData> {
  if (!result.success) {
    throw result.error;
  }
}
