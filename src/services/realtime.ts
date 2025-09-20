export type MaybeAsync<T> = T | Promise<T>;

export type TokenProvider = string | (() => MaybeAsync<string | null>);

export interface RealtimeOptions {
  url?: string;
  token?: TokenProvider;
  protocols?: string | string[];
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectBackoff?: {
    initialDelay?: number;
    maxDelay?: number;
    multiplier?: number;
  };
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
}

export interface RealtimeMessage<TPayload = unknown> {
  channel: string;
  event: string;
  data: TPayload;
  raw: MessageEvent;
}

export interface RealtimeAction<TPayload = unknown> {
  type: string;
  payload: RealtimeMessage<TPayload>;
  meta?: Record<string, unknown>;
}

export type RealtimeDispatch = (action: RealtimeAction) => void;

export type ChannelCallback<TPayload = unknown> = (
  message: RealtimeMessage<TPayload>,
) => void;

interface Subscription {
  callback: ChannelCallback;
  events?: Set<string>;
}

interface InternalRealtimeOptions {
  url?: string;
  token?: TokenProvider;
  protocols?: string | string[];
  autoReconnect: boolean;
  maxReconnectAttempts?: number;
  reconnectBackoff: {
    initialDelay: number;
    maxDelay: number;
    multiplier: number;
  };
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
}

const DEFAULT_BACKOFF = {
  initialDelay: 1000,
  maxDelay: 15000,
  multiplier: 1.8,
};

const GLOBAL_CHANNEL = '*';

const subscriptions = new Map<string, Set<Subscription>>();

let activeSocket: WebSocket | null = null;
let activeCleanup: (() => void) | null = null;
let storedOptions: InternalRealtimeOptions | null = null;
let originalOptions: RealtimeOptions | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
let manualDisconnect = false;
let connectionPromise: Promise<WebSocket> | null = null;
let realtimeDispatch: RealtimeDispatch | null = null;

function getChannelKey(channel: string) {
  return channel.toLowerCase();
}

function applyDefaults(options: RealtimeOptions): InternalRealtimeOptions {
  return {
    url: options.url,
    token: options.token,
    protocols: options.protocols,
    autoReconnect: options.autoReconnect ?? true,
    maxReconnectAttempts: options.maxReconnectAttempts,
    reconnectBackoff: {
      initialDelay:
        options.reconnectBackoff?.initialDelay ?? DEFAULT_BACKOFF.initialDelay,
      maxDelay: options.reconnectBackoff?.maxDelay ?? DEFAULT_BACKOFF.maxDelay,
      multiplier:
        options.reconnectBackoff?.multiplier ?? DEFAULT_BACKOFF.multiplier,
    },
    onOpen: options.onOpen,
    onClose: options.onClose,
    onError: options.onError,
  };
}

function resolveRealtimeUrl(customUrl?: string): string {
  if (customUrl) {
    return customUrl;
  }

  const envUrl = import.meta.env?.VITE_REALTIME_URL;
  if (envUrl) {
    return envUrl;
  }

  if (typeof window !== 'undefined' && window.location) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/realtime`;
  }

  return 'ws://localhost:3001/realtime';
}

async function resolveToken(token?: TokenProvider): Promise<string | null> {
  if (!token) {
    return null;
  }

  if (typeof token === 'function') {
    return token();
  }

  return token;
}

function appendTokenToUrl(url: string, token: string | null): string {
  if (!token) {
    return url;
  }

  try {
    const base =
      typeof window !== 'undefined' && window.location
        ? window.location.href
        : undefined;
    const parsed = new URL(url, base);
    parsed.searchParams.set('token', token);
    return parsed.toString();
  } catch (error) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}token=${encodeURIComponent(token)}`;
  }
}

function notifySubscribers(message: RealtimeMessage) {
  const channelKey = getChannelKey(message.channel);
  const eventKey = message.event.toLowerCase();

  const deliver = (key: string) => {
    const bucket = subscriptions.get(key);
    if (!bucket) {
      return;
    }

    bucket.forEach((subscription) => {
      if (!subscription.events || subscription.events.has(eventKey)) {
        subscription.callback(message);
      }
    });
  };

  deliver(channelKey);
  deliver(GLOBAL_CHANNEL);
}

function dispatchRealtime(message: RealtimeMessage) {
  notifySubscribers(message);
  realtimeDispatch?.({
    type: 'realtime/message',
    payload: message,
    meta: {
      channel: message.channel,
      event: message.event,
      receivedAt: Date.now(),
    },
  });
}

function parseRealtimeMessage(event: MessageEvent): RealtimeMessage {
  const fallbackChannel = 'global';
  const fallbackEvent = 'message';

  let channel = fallbackChannel;
  let eventName = fallbackEvent;
  let data: unknown = event.data;

  const assignFromRecord = (record: Record<string, unknown>) => {
    if (typeof record.channel === 'string' && record.channel.trim()) {
      channel = record.channel;
    }

    if (typeof record.event === 'string' && record.event.trim()) {
      eventName = record.event;
    } else if (typeof record.type === 'string' && record.type.trim()) {
      eventName = record.type;
    }

    if ('payload' in record) {
      data = record.payload;
      return;
    }

    if ('data' in record) {
      data = record.data;
      return;
    }

    data = record;
  };

  if (typeof event.data === 'string') {
    try {
      const parsed = JSON.parse(event.data);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        assignFromRecord(parsed as Record<string, unknown>);
      } else if (Array.isArray(parsed)) {
        data = parsed;
      } else {
        data = parsed;
      }
    } catch (error) {
      data = event.data;
    }
  } else if (
    event.data &&
    typeof event.data === 'object' &&
    !Array.isArray(event.data)
  ) {
    assignFromRecord(event.data as Record<string, unknown>);
  }

  return {
    channel,
    event: eventName,
    data,
    raw: event,
  };
}

function clearReconnectTimer() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function scheduleReconnect() {
  if (!storedOptions || manualDisconnect) {
    return;
  }

  const { maxReconnectAttempts, reconnectBackoff } = storedOptions;
  if (
    typeof maxReconnectAttempts === 'number' &&
    reconnectAttempts >= maxReconnectAttempts
  ) {
    return;
  }

  const attempt = reconnectAttempts + 1;
  const delay = Math.min(
    reconnectBackoff.initialDelay *
      Math.pow(reconnectBackoff.multiplier, attempt - 1),
    reconnectBackoff.maxDelay,
  );

  reconnectTimer = setTimeout(() => {
    connectRealtime(originalOptions ?? {}).catch(() => {
      scheduleReconnect();
    });
  }, delay);

  reconnectAttempts = attempt;
}

async function createSocket(
  options: InternalRealtimeOptions,
): Promise<WebSocket> {
  return new Promise(async (resolve, reject) => {
    try {
      const token = await resolveToken(options.token);
      const targetUrl = appendTokenToUrl(
        resolveRealtimeUrl(options.url),
        token,
      );
      const socket = new WebSocket(targetUrl, options.protocols);

      if (activeCleanup) {
        activeCleanup();
        activeCleanup = null;
      }

      activeSocket = socket;

      let settled = false;

      const handleOpen = (event: Event) => {
        reconnectAttempts = 0;
        settled = true;
        options.onOpen?.(event);
        resolve(socket);
      };

      const handleMessage = (event: MessageEvent) => {
        if (socket !== activeSocket) {
          return;
        }

        dispatchRealtime(parseRealtimeMessage(event));
      };

      const handleClose = (event: CloseEvent) => {
        if (socket === activeSocket) {
          activeSocket = null;
        }

        options.onClose?.(event);

        if (!settled) {
          settled = true;
          reject(
            new Error(`Realtime connection closed before opening (code ${event.code})`),
          );
        }

        cleanup();

        if (!manualDisconnect && options.autoReconnect) {
          scheduleReconnect();
        }
      };

      const handleError = (event: Event) => {
        options.onError?.(event);

        if (!settled && socket.readyState !== WebSocket.OPEN) {
          settled = true;
          cleanup();
          reject(new Error('Realtime connection error'));
        }
      };

      const cleanup = () => {
        socket.removeEventListener('open', handleOpen);
        socket.removeEventListener('message', handleMessage);
        socket.removeEventListener('close', handleClose);
        socket.removeEventListener('error', handleError);

        if (activeCleanup === cleanup) {
          activeCleanup = null;
        }
      };

      socket.addEventListener('open', handleOpen);
      socket.addEventListener('message', handleMessage);
      socket.addEventListener('close', handleClose);
      socket.addEventListener('error', handleError);

      activeCleanup = cleanup;
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

export async function connectRealtime(
  options: RealtimeOptions = {},
): Promise<WebSocket> {
  manualDisconnect = false;
  clearReconnectTimer();

  if (
    activeSocket &&
    (activeSocket.readyState === WebSocket.OPEN ||
      activeSocket.readyState === WebSocket.CONNECTING)
  ) {
    return activeSocket;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  originalOptions = options;
  storedOptions = applyDefaults(options);

  connectionPromise = createSocket(storedOptions);

  try {
    return await connectionPromise;
  } finally {
    connectionPromise = null;
  }
}

export function disconnectRealtime(code?: number, reason?: string) {
  manualDisconnect = true;
  clearReconnectTimer();
  connectionPromise = null;

  if (activeCleanup) {
    activeCleanup();
    activeCleanup = null;
  }

  const socket = activeSocket;
  activeSocket = null;

  if (!socket) {
    return;
  }

  if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
    socket.close(code ?? 1000, reason);
  }
}

export function isRealtimeConnected() {
  return activeSocket?.readyState === WebSocket.OPEN;
}

export function sendRealtimeMessage<TPayload>(
  message: {
    channel: string;
    event?: string;
    data?: TPayload;
  },
): boolean {
  if (!activeSocket || activeSocket.readyState !== WebSocket.OPEN) {
    return false;
  }

  const payload = {
    channel: message.channel,
    event: message.event ?? 'message',
    data: message.data,
  };

  activeSocket.send(JSON.stringify(payload));
  return true;
}

function registerSubscription(
  channel: string,
  subscription: Subscription,
): () => void {
  const key = getChannelKey(channel);
  let bucket = subscriptions.get(key);

  if (!bucket) {
    bucket = new Set();
    subscriptions.set(key, bucket);
  }

  bucket.add(subscription);

  return () => {
    bucket?.delete(subscription);
    if (bucket && bucket.size === 0) {
      subscriptions.delete(key);
    }
  };
}

function normalizeEventsFilter(events?: string | string[]) {
  if (!events) {
    return undefined;
  }

  const list = Array.isArray(events) ? events : [events];
  return new Set(list.map((event) => event.toLowerCase()));
}

export function subscribeToChannel<TPayload>(
  channel: string,
  callback: ChannelCallback<TPayload>,
  events?: string | string[],
): () => void {
  const subscription: Subscription = {
    callback: callback as ChannelCallback,
    events: normalizeEventsFilter(events),
  };

  return registerSubscription(channel, subscription);
}

export function subscribeToAlerts<TPayload>(
  callback: ChannelCallback<TPayload>,
  events?: string | string[],
): () => void {
  return subscribeToChannel('alerts', callback, events);
}

export function subscribeToEvents<TPayload>(
  callback: ChannelCallback<TPayload>,
  events?: string | string[],
): () => void {
  return subscribeToChannel('events', callback, events);
}

export function subscribeToAll<TPayload>(
  callback: ChannelCallback<TPayload>,
  events?: string | string[],
): () => void {
  return registerSubscription(GLOBAL_CHANNEL, {
    callback: callback as ChannelCallback,
    events: normalizeEventsFilter(events),
  });
}

export function setRealtimeDispatch(dispatch: RealtimeDispatch | null) {
  realtimeDispatch = dispatch;
}

export function getRealtimeSocket() {
  return activeSocket;
}

export function getActiveSubscriptions() {
  return Array.from(subscriptions.keys());
}
