import httpClient, {
  HttpClientError,
  HttpRequestConfig,
  HttpSuccessResponse,
  normalizeHttpError,
  toHttpSuccessResponse,
} from './httpClient';

export interface Opportunity {
  id: string;
  name: string;
  stage: string;
  region?: string;
  createdAt: string;
  updatedAt?: string;
  valuation?: number;
  probability?: number;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface OpportunityFilters {
  search?: string;
  stage?: string;
  region?: string;
  ownerId?: string;
  minValuation?: number;
  maxValuation?: number;
  limit?: number;
  offset?: number;
}

export interface CreateOpportunityPayload {
  name: string;
  stage: string;
  region?: string;
  valuation?: number;
  probability?: number;
  metadata?: Record<string, unknown>;
}

export type UpdateOpportunityPayload = Partial<CreateOpportunityPayload> & {
  status?: string;
  expectedCloseDate?: string;
};

export interface ServiceSuccess<TData> extends HttpSuccessResponse<TData> {
  success: true;
}

export interface ServiceError {
  success: false;
  status?: number;
  error: HttpClientError;
}

export type ServiceResult<TData> = ServiceSuccess<TData> | ServiceError;

const BASE_PATH = '/opportunities';

function toServiceSuccess<TData>(
  response: HttpSuccessResponse<TData>,
): ServiceSuccess<TData> {
  return {
    success: true,
    ...response,
  };
}

function toServiceError(error: unknown): ServiceError {
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

function toQueryFilters(filters?: OpportunityFilters) {
  if (!filters) {
    return undefined;
  }

  const entries = Object.entries(filters).filter(([, value]) => {
    return value !== undefined && value !== null;
  });

  if (entries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(entries);
}

export async function listOpportunities(
  filters?: OpportunityFilters,
  config?: HttpRequestConfig,
): Promise<ServiceResult<Opportunity[]>> {
  try {
    const requestConfig: HttpRequestConfig = {
      ...config,
      params: mergeParams(config?.params, toQueryFilters(filters)),
    };

    const response = await httpClient.get<Opportunity[]>(
      BASE_PATH,
      requestConfig,
    );

    return toServiceSuccess(toHttpSuccessResponse(response));
  } catch (error) {
    return toServiceError(error);
  }
}

export async function getOpportunity(
  id: string,
  config?: HttpRequestConfig,
): Promise<ServiceResult<Opportunity>> {
  try {
    const response = await httpClient.get<Opportunity>(
      `${BASE_PATH}/${id}`,
      config,
    );

    return toServiceSuccess(toHttpSuccessResponse(response));
  } catch (error) {
    return toServiceError(error);
  }
}

export async function createOpportunity(
  payload: CreateOpportunityPayload,
  config?: HttpRequestConfig<CreateOpportunityPayload>,
): Promise<ServiceResult<Opportunity>> {
  try {
    const response = await httpClient.post<Opportunity>(
      BASE_PATH,
      payload,
      config,
    );

    return toServiceSuccess(toHttpSuccessResponse(response));
  } catch (error) {
    return toServiceError(error);
  }
}

export async function updateOpportunity(
  id: string,
  payload: UpdateOpportunityPayload,
  config?: HttpRequestConfig<UpdateOpportunityPayload>,
): Promise<ServiceResult<Opportunity>> {
  try {
    const response = await httpClient.patch<Opportunity>(
      `${BASE_PATH}/${id}`,
      payload,
      config,
    );

    return toServiceSuccess(toHttpSuccessResponse(response));
  } catch (error) {
    return toServiceError(error);
  }
}

export async function deleteOpportunity(
  id: string,
  config?: HttpRequestConfig,
): Promise<ServiceResult<null>> {
  try {
    const response = await httpClient.delete<null>(`${BASE_PATH}/${id}`, config);
    return toServiceSuccess(toHttpSuccessResponse(response));
  } catch (error) {
    return toServiceError(error);
  }
}

export function assertSuccess<TData>(
  result: ServiceResult<TData>,
): asserts result is ServiceSuccess<TData> {
  if (!result.success) {
    throw result.error;
  }
}

export function unwrapResult<TData>(
  result: ServiceResult<TData>,
): TData {
  assertSuccess(result);
  return result.data;
}
