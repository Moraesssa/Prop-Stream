import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useAppDispatch } from '@/store/hooks';
import {
  connectRealtime,
  disconnectRealtime,
  setRealtimeDispatch,
  subscribeToAlerts,
  subscribeToEvents,
  type RealtimeMessage,
} from '@/services/realtime';
import {
  clearAlerts,
  removeAlert,
  setAlerts,
  upsertAlert,
  upsertManyAlerts,
  type AlertItem,
  type AlertSeverity,
} from '@/store/alertsSlice';
import {
  clearPipelineOptimistic,
  removePipelineOpportunity,
  replacePipeline,
  resetPipelineOptimistic,
  setPipelineLastUpdatedAt,
  setPipelineError,
  setPipelineStatus,
  upsertManyPipelineOpportunities,
  upsertPipelineOpportunity,
} from '@/store/pipelineSlice';
import {
  resetDashboardState,
  setDashboardError,
  setDashboardStatus,
  setDashboardSummary,
} from '@/store/dashboardsSlice';
import type { Opportunity } from '@/services/opportunitiesService';
import type {
  DashboardSummary,
  DashboardTimeframe,
} from '@/services/dashboardService';
import { getStoredTokens, subscribeToAuthTokens } from '@/services/auth';
import { PIPELINE_QUERY_KEY } from '@/hooks/useOpportunityQueries';
import { DASHBOARD_QUERY_KEY } from '@/hooks/useDashboardQueries';
import { PORTFOLIO_QUERY_KEY } from '@/hooks/usePortfolioQueries';
import { useToast } from './ToastProvider';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extractString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  return null;
}

function extractId(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  if (!isRecord(value)) {
    return null;
  }

  const candidates = [
    value.id,
    value.opportunityId,
    value.alertId,
    value.key,
    value.uid,
    value.identifier,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate;
    }
  }

  return null;
}

function parseTimestamp(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return null;
}

function mapSeverity(value: unknown): AlertSeverity {
  if (typeof value === 'string') {
    const normalized = value.toLowerCase();
    if (['success', 'ok', 'positive', 'resolved'].includes(normalized)) {
      return 'success';
    }
    if (['warning', 'warn', 'caution'].includes(normalized)) {
      return 'warning';
    }
    if (['error', 'danger', 'critical', 'high'].includes(normalized)) {
      return 'error';
    }
    if (['info', 'informational', 'notice'].includes(normalized)) {
      return 'info';
    }
  }

  if (typeof value === 'number') {
    if (value >= 90) {
      return 'error';
    }
    if (value >= 60) {
      return 'warning';
    }
    if (value >= 30) {
      return 'success';
    }
  }

  return 'info';
}

function generateAlertId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `alert-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toAlertItem(
  message: RealtimeMessage,
  value: unknown,
): AlertItem | null {
  if (!isRecord(value)) {
    return null;
  }

  if ('alert' in value) {
    return toAlertItem(message, (value as { alert: unknown }).alert);
  }

  const id = extractId(value) ?? generateAlertId();
  const title =
    extractString(value.title) ??
    extractString(value.message) ??
    extractString(value.headline) ??
    'Alerta em tempo real';
  const description =
    extractString(value.description) ??
    extractString(value.details) ??
    extractString(value.summary) ??
    undefined;
  const severity = mapSeverity(
    value.severity ?? value.level ?? value.priority ?? value.tone,
  );
  const source = extractString(value.source) ?? extractString(value.category);
  const timestamp =
    parseTimestamp(value.timestamp ?? value.sentAt ?? value.createdAt) ??
    message.raw?.timeStamp ??
    Date.now();

  const metadata = isRecord(value.metadata)
    ? (value.metadata as Record<string, unknown>)
    : undefined;

  return {
    id,
    title,
    description,
    severity,
    source: source ?? undefined,
    receivedAt:
      typeof timestamp === 'number' && Number.isFinite(timestamp)
        ? Math.round(timestamp)
        : Date.now(),
    metadata,
  };
}

function toOpportunity(value: unknown): Opportunity | null {
  if (isRecord(value) && 'opportunity' in value) {
    return toOpportunity((value as { opportunity: unknown }).opportunity);
  }

  if (!isRecord(value)) {
    return null;
  }

  const id = extractId(value);
  if (!id) {
    return null;
  }

  const name = extractString(value.name) ?? extractString(value.title) ?? id;
  const stage =
    extractString(value.stage) ??
    extractString(value.status) ??
    extractString(value.phase) ??
    'Sem estágio';
  const createdAt =
    extractString(value.createdAt) ??
    extractString(value.timestamp) ??
    new Date().toISOString();
  const updatedAt = extractString(value.updatedAt) ?? undefined;
  const valuation =
    typeof value.valuation === 'number'
      ? value.valuation
      : typeof value.valuation === 'string'
        ? Number(value.valuation)
        : undefined;
  const probability =
    typeof value.probability === 'number'
      ? value.probability
      : typeof value.probability === 'string'
        ? Number(value.probability)
        : undefined;
  const region = extractString(value.region) ?? undefined;
  const metadata = isRecord(value.metadata)
    ? (value.metadata as Record<string, unknown>)
    : undefined;

  const record = value as Record<string, unknown>;
  return {
    ...record,
    id,
    name,
    stage,
    createdAt,
    updatedAt,
    valuation,
    probability,
    region,
    metadata,
  } as Opportunity;
}

function normalizeOpportunityList(value: unknown): Opportunity[] {
  if (isRecord(value)) {
    if (Array.isArray(value.opportunities)) {
      return normalizeOpportunityList(value.opportunities);
    }

    if (Array.isArray(value.items)) {
      return normalizeOpportunityList(value.items);
    }
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => toOpportunity(item))
    .filter((item): item is Opportunity => Boolean(item));
}

function isDashboardTimeframe(value: unknown): value is DashboardTimeframe {
  return value === '7d' || value === '30d' || value === '90d' || value === '180d';
}

function extractScope(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  if (!isRecord(value)) {
    return null;
  }

  const candidates = [value.scope, value.id, value.key, value.portfolioId];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate;
    }
  }

  return null;
}

function toDashboardSummary(value: unknown): DashboardSummary | null {
  if (isRecord(value) && 'summary' in value) {
    return toDashboardSummary((value as { summary: unknown }).summary);
  }

  if (!isRecord(value)) {
    return null;
  }

  const scope = extractScope(value);
  if (!scope) {
    return null;
  }

  const updatedAt =
    extractString(value.updatedAt) ??
    extractString(value.refreshedAt) ??
    new Date().toISOString();

  const timeframeRaw = value.timeframe;
  const timeframe = isDashboardTimeframe(timeframeRaw)
    ? timeframeRaw
    : undefined;

  return {
    ...(value as Record<string, unknown>),
    scope,
    updatedAt,
    timeframe,
    metrics: Array.isArray(value.metrics) ? value.metrics : [],
    breakdowns: Array.isArray(value.breakdowns) ? value.breakdowns : [],
    highlights: Array.isArray(value.highlights) ? value.highlights : [],
  } as DashboardSummary;
}

type PipelineRealtimeAction =
  | { kind: 'upsert'; opportunity: Opportunity }
  | { kind: 'upsertMany'; opportunities: Opportunity[] }
  | { kind: 'replace'; opportunities: Opportunity[] }
  | { kind: 'remove'; id: string }
  | null;

type DashboardRealtimeAction =
  | { kind: 'set'; summary: DashboardSummary }
  | { kind: 'setMany'; summaries: DashboardSummary[] }
  | { kind: 'clear'; scope?: string }
  | null;

type AlertRealtimeAction =
  | { kind: 'upsert'; alert: AlertItem }
  | { kind: 'upsertMany'; alerts: AlertItem[] }
  | { kind: 'set'; alerts: AlertItem[] }
  | { kind: 'remove'; id: string }
  | { kind: 'clear' }
  | null;

function interpretPipelineMessage(
  message: RealtimeMessage,
): PipelineRealtimeAction {
  const event = message.event.toLowerCase();
  const data = message.data;

  if (Array.isArray(data) || (isRecord(data) && (data.items || data.opportunities))) {
    const opportunities = normalizeOpportunityList(data);
    if (opportunities.length === 0) {
      return null;
    }

    if (/(snapshot|replace|reset|set)/.test(event)) {
      return { kind: 'replace', opportunities };
    }

    return { kind: 'upsertMany', opportunities };
  }

  if (/(delete|remove|close|archive)/.test(event)) {
    const id = extractId(data);
    if (id) {
      return { kind: 'remove', id };
    }
    return null;
  }

  const opportunity = toOpportunity(data);
  if (!opportunity) {
    return null;
  }

  return { kind: 'upsert', opportunity };
}

function interpretDashboardMessage(
  message: RealtimeMessage,
): DashboardRealtimeAction {
  const event = message.event.toLowerCase();
  const data = message.data;

  if (Array.isArray(data) || (isRecord(data) && data.items)) {
    const summaries = (Array.isArray(data) ? data : data.items)
      .map((item) => toDashboardSummary(item))
      .filter((item): item is DashboardSummary => Boolean(item));

    if (summaries.length === 0) {
      return null;
    }

    return { kind: 'setMany', summaries };
  }

  if (/(clear|reset|remove)/.test(event)) {
    const scope = extractScope(data ?? message);
    return { kind: 'clear', scope: scope ?? undefined };
  }

  const summary = toDashboardSummary(data);
  if (!summary) {
    return null;
  }

  return { kind: 'set', summary };
}

function interpretAlertMessage(message: RealtimeMessage): AlertRealtimeAction {
  const event = message.event.toLowerCase();
  const data = message.data;

  if (Array.isArray(data) || (isRecord(data) && (data.items || data.alerts))) {
    const list = (Array.isArray(data) ? data : data.items ?? data.alerts) as unknown[];
    const alerts = list
      .map((item) => toAlertItem(message, item))
      .filter((item): item is AlertItem => Boolean(item));

    if (alerts.length === 0) {
      return null;
    }

    if (/(snapshot|set|replace)/.test(event)) {
      return { kind: 'set', alerts };
    }

    return { kind: 'upsertMany', alerts };
  }

  if (/(clear|reset)/.test(event)) {
    return { kind: 'clear' };
  }

  if (/(resolve|dismiss|delete|remove|acknowledge)/.test(event)) {
    const id = extractId(data);
    if (id) {
      return { kind: 'remove', id };
    }
    return null;
  }

  const alert = toAlertItem(message, data);
  if (!alert) {
    return null;
  }

  return { kind: 'upsert', alert };
}

function RealtimeManager() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const seenAlertsRef = useRef(new Set<string>());
  const reconnectingRef = useRef(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    setRealtimeDispatch((action) => {
      const message = action.payload;
      const channel = message.channel.toLowerCase();

      if (channel === 'pipeline') {
        const pipelineAction = interpretPipelineMessage(message);
        if (!pipelineAction) {
          return;
        }

        const now = Date.now();
        switch (pipelineAction.kind) {
          case 'replace':
            dispatch(replacePipeline(pipelineAction.opportunities));
            dispatch(setPipelineStatus('succeeded'));
            dispatch(setPipelineError(null));
            dispatch(setPipelineLastUpdatedAt(now));
            dispatch(resetPipelineOptimistic());
            break;
          case 'upsertMany':
            dispatch(upsertManyPipelineOpportunities(pipelineAction.opportunities));
            dispatch(setPipelineStatus('succeeded'));
            dispatch(setPipelineError(null));
            dispatch(setPipelineLastUpdatedAt(now));
            pipelineAction.opportunities.forEach((opportunity) => {
              dispatch(clearPipelineOptimistic(opportunity.id));
            });
            break;
          case 'upsert':
            dispatch(upsertPipelineOpportunity(pipelineAction.opportunity));
            dispatch(setPipelineStatus('succeeded'));
            dispatch(setPipelineError(null));
            dispatch(setPipelineLastUpdatedAt(now));
            dispatch(clearPipelineOptimistic(pipelineAction.opportunity.id));
            break;
          case 'remove':
            dispatch(removePipelineOpportunity(pipelineAction.id));
            dispatch(setPipelineStatus('succeeded'));
            dispatch(setPipelineError(null));
            dispatch(setPipelineLastUpdatedAt(now));
            dispatch(clearPipelineOptimistic(pipelineAction.id));
            break;
        }
        return;
      }

      if (channel === 'dashboards') {
        const dashboardAction = interpretDashboardMessage(message);
        if (!dashboardAction) {
          return;
        }

        switch (dashboardAction.kind) {
          case 'set':
            dispatch(setDashboardSummary({
              scope: dashboardAction.summary.scope,
              summary: dashboardAction.summary,
            }));
            dispatch(
              setDashboardStatus({
                scope: dashboardAction.summary.scope,
                status: 'succeeded',
              }),
            );
            dispatch(
              setDashboardError({
                scope: dashboardAction.summary.scope,
                error: null,
              }),
            );
            break;
          case 'setMany':
            dashboardAction.summaries.forEach((summary) => {
              dispatch(setDashboardSummary({ scope: summary.scope, summary }));
              dispatch(setDashboardStatus({ scope: summary.scope, status: 'succeeded' }));
              dispatch(setDashboardError({ scope: summary.scope, error: null }));
            });
            break;
          case 'clear':
            dispatch(resetDashboardState(dashboardAction.scope));
            break;
        }
        return;
      }

      if (channel === 'alerts') {
        const alertAction = interpretAlertMessage(message);
        if (!alertAction) {
          return;
        }

        switch (alertAction.kind) {
          case 'set':
            dispatch(setAlerts(alertAction.alerts));
            break;
          case 'upsertMany':
            dispatch(upsertManyAlerts(alertAction.alerts));
            break;
          case 'upsert':
            dispatch(upsertAlert(alertAction.alert));
            break;
          case 'remove':
            dispatch(removeAlert(alertAction.id));
            break;
          case 'clear':
            dispatch(clearAlerts());
            break;
        }
      }
    });

    return () => {
      setRealtimeDispatch(null);
    };
  }, [dispatch]);

  useEffect(() => {
    let isUnmounting = false;
    const unsubscribeAlerts = subscribeToAlerts((message) => {
      const alertAction = interpretAlertMessage(message);
      if (!alertAction) {
        return;
      }

      if (alertAction.kind === 'clear') {
        seenAlertsRef.current.clear();
        return;
      }

      if (alertAction.kind === 'set') {
        alertAction.alerts.forEach((alert) => {
          seenAlertsRef.current.add(alert.id);
        });
        return;
      }

      if (alertAction.kind === 'remove') {
        seenAlertsRef.current.delete(alertAction.id);
        return;
      }

      const alerts =
        alertAction.kind === 'upsertMany'
          ? alertAction.alerts
          : [alertAction.alert];

      alerts.forEach((alert) => {
        if (seenAlertsRef.current.has(alert.id)) {
          return;
        }

        seenAlertsRef.current.add(alert.id);
        showToast({
          id: alert.id,
          title: alert.title,
          description: alert.description,
          tone: alert.severity,
        });
      });
    });

    const unsubscribeEvents = subscribeToEvents((message) => {
      const event = message.event.toLowerCase();
      const scope = extractScope(message.data);

      if (event.includes('pipeline')) {
        queryClient.invalidateQueries({ queryKey: PIPELINE_QUERY_KEY });
        return;
      }

      if (event.includes('dashboard')) {
        if (scope) {
          queryClient.invalidateQueries({ queryKey: [DASHBOARD_QUERY_KEY[0], scope] });
        } else {
          queryClient.invalidateQueries({ queryKey: [DASHBOARD_QUERY_KEY[0]] });
        }
        return;
      }

      if (event.includes('portfolio')) {
        queryClient.invalidateQueries({ queryKey: PORTFOLIO_QUERY_KEY });
      }
    });

    const connect = async () => {
      try {
        await connectRealtime({
          url: import.meta.env?.VITE_REALTIME_URL,
          token: async () => {
            const tokens = await getStoredTokens();
            return tokens?.accessToken ?? null;
          },
          autoReconnect: true,
          reconnectBackoff: {
            initialDelay: 1000,
            maxDelay: 15000,
            multiplier: 1.8,
          },
          onOpen: () => {
            if (reconnectingRef.current) {
              showToast({
                id: 'realtime-reconnected',
                title: 'Conexão restabelecida',
                description: 'Eventos em tempo real novamente disponíveis.',
                tone: 'success',
              });
            }
            reconnectingRef.current = false;
            initializedRef.current = true;
          },
          onClose: () => {
            if (isUnmounting) {
              return;
            }
            if (!initializedRef.current) {
              return;
            }
            reconnectingRef.current = true;
            showToast({
              id: 'realtime-disconnected',
              title: 'Conexão em tempo real perdida',
              description: 'Tentando reconectar automaticamente...',
              tone: 'warning',
            });
          },
          onError: (error) => {
            console.error('realtime: connection error', error);
            if (!initializedRef.current) {
              showToast({
                id: 'realtime-error',
                title: 'Falha ao conectar ao realtime',
                description: 'Verifique sua conexão de rede e tente novamente.',
                tone: 'error',
              });
            }
          },
        });
      } catch (error) {
        console.error('realtime: unable to establish connection', error);
      }
    };

    const unsubscribeTokens = subscribeToAuthTokens((tokens) => {
      if (!tokens) {
        seenAlertsRef.current.clear();
        reconnectingRef.current = false;
        initializedRef.current = false;
        dispatch(clearAlerts());
        disconnectRealtime(1000, 'auth-logout');
        return;
      }

      void connect();
    });

    void connect();

    return () => {
      isUnmounting = true;
      unsubscribeAlerts();
      unsubscribeEvents();
      unsubscribeTokens();
      disconnectRealtime(1000, 'app-unmount');
    };
  }, [dispatch, queryClient, showToast]);

  return null;
}

export default RealtimeManager;
