export interface AnyAction {
  type: string;
  payload?: unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export type DispatchFunction = (action: AnyAction) => void;

export interface WebSocketEvent<T = unknown> {
  type: string;
  payload: T;
}

export interface WebSocketManagerOptions {
  url: string;
  protocols?: string | string[];
  autoConnect?: boolean;
  reconnect?: boolean;
  minReconnectDelay?: number;
  maxReconnectDelay?: number;
  dispatch?: DispatchFunction;
  tokenProvider?: () => Promise<string | undefined> | string | undefined;
  parser?: (raw: string) => WebSocketEvent;
  webSocketFactory?: (url: string, protocols?: string | string[]) => WebSocket;
  heartbeatInterval?: number;
}

type EventHandler<T = unknown> = (payload: T) => void;
type AnyEventHandler = (event: string, payload: unknown) => void;

const DEFAULT_MIN_DELAY = 1000;
const DEFAULT_MAX_DELAY = 15000;

function getDefaultFactory(): (url: string, protocols?: string | string[]) => WebSocket {
  if (typeof WebSocket === 'undefined') {
    throw new Error('Global WebSocket implementation not found. Provide a factory via options.');
  }
  return (url: string, protocols?: string | string[]) => new WebSocket(url, protocols);
}

function appendToken(url: string, token?: string): string {
  if (!token) return url;
  try {
    const parsed = new URL(url, typeof window !== 'undefined' ? window.location.origin : undefined);
    parsed.searchParams.set('token', token);
    return parsed.toString();
  } catch (error) {
    console.warn('[websocket] failed to append token to url', error);
    return url;
  }
}

export class WebSocketManager {
  private socket: WebSocket | null = null;

  private reconnectAttempts = 0;

  private manualClose = false;

  private listeners = new Map<string, Set<EventHandler>>();

  private anyListeners = new Set<AnyEventHandler>();

  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly options: WebSocketManagerOptions) {
    if (options.autoConnect !== false) {
      void this.connect();
    }
  }

  async connect(): Promise<void> {
    if (this.socket && this.isActive(this.socket)) {
      return;
    }

    const token = await this.resolveToken();
    const factory = this.options.webSocketFactory ?? getDefaultFactory();
    const targetUrl = appendToken(this.options.url, token);

    return new Promise((resolve, reject) => {
      try {
        const socket = factory(targetUrl, this.options.protocols);
        this.socket = socket;
        this.manualClose = false;

        const handleOpen = () => {
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          socket.removeEventListener('open', handleOpen);
          socket.removeEventListener('error', handleError);
          resolve();
        };

        const handleError = (event: Event) => {
          this.stopHeartbeat();
          socket.removeEventListener('open', handleOpen);
          socket.removeEventListener('error', handleError);
          reject(event);
        };

        socket.addEventListener('open', handleOpen);
        socket.addEventListener('message', this.handleMessage);
        socket.addEventListener('close', this.handleClose);
        socket.addEventListener('error', handleError);
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(code?: number, reason?: string): void {
    this.manualClose = true;
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.removeEventListener('message', this.handleMessage);
      this.socket.removeEventListener('close', this.handleClose);
      try {
        this.socket.close(code, reason);
      } catch (error) {
        console.warn('[websocket] failed to close connection', error);
      }
    }
    this.socket = null;
  }

  send(event: string, payload: unknown): void {
    if (!this.socket || !this.isOpen(this.socket)) {
      throw new Error('WebSocket connection is not open');
    }

    const message = JSON.stringify({ event, payload });
    this.socket.send(message);
  }

  on<T = unknown>(event: string, handler: EventHandler<T>): () => void {
    const entry = this.listeners.get(event) ?? new Set<EventHandler>();
    entry.add(handler as EventHandler);
    this.listeners.set(event, entry);
    return () => {
      entry.delete(handler as EventHandler);
      if (entry.size === 0) {
        this.listeners.delete(event);
      }
    };
  }

  onAny(handler: AnyEventHandler): () => void {
    this.anyListeners.add(handler);
    return () => {
      this.anyListeners.delete(handler);
    };
  }

  private handleMessage = (event: MessageEvent) => {
    try {
      const rawData = typeof event.data === 'string' ? event.data : '';
      const parsed = this.parse(rawData);
      this.dispatch(parsed);
    } catch (error) {
      console.error('[websocket] failed to parse event', error);
    }
  };

  private handleClose = (event: CloseEvent) => {
    this.stopHeartbeat();
    this.socket = null;

    if (this.manualClose || this.options.reconnect === false) {
      return;
    }

    this.scheduleReconnect();
  };

  private parse(raw: string): WebSocketEvent {
    if (this.options.parser) {
      return this.options.parser(raw);
    }

    const parsed = JSON.parse(raw) as WebSocketEvent;
    if (!parsed || typeof parsed.type !== 'string') {
      throw new Error('Invalid WebSocket payload');
    }
    return parsed;
  }

  private dispatch<T>(event: WebSocketEvent<T>): void {
    const listeners = this.listeners.get(event.type);
    listeners?.forEach((handler) => {
      try {
        handler(event.payload);
      } catch (error) {
        console.error('[websocket] listener error', error);
      }
    });

    this.anyListeners.forEach((handler) => {
      try {
        handler(event.type, event.payload);
      } catch (error) {
        console.error('[websocket] listener error', error);
      }
    });

    if (this.options.dispatch) {
      this.options.dispatch({ type: event.type, payload: event.payload } as AnyAction);
    }
  }

  private scheduleReconnect(): void {
    const minDelay = this.options.minReconnectDelay ?? DEFAULT_MIN_DELAY;
    const maxDelay = this.options.maxReconnectDelay ?? DEFAULT_MAX_DELAY;
    const attempt = this.reconnectAttempts + 1;
    const delay = Math.min(maxDelay, minDelay * 2 ** attempt);
    this.reconnectAttempts = attempt;

    setTimeout(() => {
      void this.connect().catch((error) => {
        console.warn('[websocket] reconnect attempt failed', error);
        this.scheduleReconnect();
      });
    }, delay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    if (!this.options.heartbeatInterval) {
      return;
    }

    this.heartbeatTimer = setInterval(() => {
      if (!this.socket || !this.isOpen(this.socket)) {
        return;
      }
      try {
        this.socket.send(JSON.stringify({ event: 'ping', timestamp: Date.now() }));
      } catch (error) {
        console.warn('[websocket] failed to send heartbeat', error);
      }
    }, this.options.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    this.heartbeatTimer = null;
  }

  private async resolveToken(): Promise<string | undefined> {
    if (!this.options.tokenProvider) {
      return undefined;
    }

    try {
      return await this.options.tokenProvider();
    } catch (error) {
      console.warn('[websocket] token provider failed', error);
      return undefined;
    }
  }

  private isActive(socket: WebSocket): boolean {
    const openState = this.getOpenState(socket);
    const connectingState = this.getConnectingState(socket);
    return socket.readyState === openState || socket.readyState === connectingState;
  }

  private isOpen(socket: WebSocket): boolean {
    return socket.readyState === this.getOpenState(socket);
  }

  private getOpenState(socket: WebSocket): number {
    if (typeof WebSocket !== 'undefined') {
      return WebSocket.OPEN;
    }
    return socket.OPEN ?? 1;
  }

  private getConnectingState(socket: WebSocket): number {
    if (typeof WebSocket !== 'undefined') {
      return WebSocket.CONNECTING;
    }
    return socket.CONNECTING ?? 0;
  }
}

export default WebSocketManager;
