import { v4 as uuid } from 'uuid';

export type NotificationChannel = 'toast' | 'alert' | 'in-app';

export type NotificationLevel = 'info' | 'success' | 'warning' | 'error';

export interface NotificationPayload<T = unknown> {
  id: string;
  channel: NotificationChannel;
  level: NotificationLevel;
  message: string;
  title?: string;
  data?: T;
  createdAt: number;
  timeout?: number;
  persistent?: boolean;
}

export interface NotificationOptions<T = unknown> {
  title?: string;
  message: string;
  level?: NotificationLevel;
  timeout?: number;
  persistent?: boolean;
  data?: T;
}

type Listener<T = unknown> = (notification: NotificationPayload<T>) => void;

type Registry = Map<string, NotificationPayload<unknown>>;

const DEFAULT_TIMEOUT = 5000;

function resolveLevel(level?: NotificationLevel): NotificationLevel {
  return level ?? 'info';
}

export class NotificationService {
  private listeners = new Map<NotificationChannel | 'any', Set<Listener>>();

  private registry: Registry = new Map();

  pushToast<T = unknown>(options: NotificationOptions<T>): NotificationPayload<T> {
    const payload = this.createPayload('toast', options);
    this.emit(payload);
    if (!payload.persistent) {
      this.scheduleRemoval(payload);
    }
    return payload;
  }

  pushAlert<T = unknown>(options: NotificationOptions<T>): NotificationPayload<T> {
    const payload = this.createPayload('alert', options);
    this.emit(payload);
    return payload;
  }

  pushInApp<T = unknown>(options: NotificationOptions<T>): NotificationPayload<T> {
    const payload = this.createPayload('in-app', options);
    this.emit(payload);
    return payload;
  }

  dismiss(id: string): void {
    const payload = this.registry.get(id);
    if (!payload) return;

    this.registry.delete(id);
    this.emit({ ...payload, timeout: 0, persistent: false });
  }

  subscribe(handler: Listener): () => void;
  subscribe(channel: NotificationChannel | 'any', handler: Listener): () => void;
  subscribe(channelOrHandler: NotificationChannel | 'any' | Listener, handler?: Listener): () => void {
    const channel: NotificationChannel | 'any' = typeof channelOrHandler === 'function' ? 'any' : channelOrHandler;
    const resolvedHandler: Listener = typeof channelOrHandler === 'function' ? channelOrHandler : handler!;
    const bucket = this.listeners.get(channel) ?? new Set<Listener>();
    bucket.add(resolvedHandler);
    this.listeners.set(channel, bucket);
    return () => {
      bucket.delete(resolvedHandler);
      if (bucket.size === 0) {
        this.listeners.delete(channel);
      }
    };
  }

  getActive(channel?: NotificationChannel): NotificationPayload[] {
    const values = Array.from(this.registry.values());
    if (!channel) return values;
    return values.filter((item) => item.channel === channel);
  }

  private createPayload<T>(channel: NotificationChannel, options: NotificationOptions<T>): NotificationPayload<T> {
    const payload: NotificationPayload<T> = {
      id: uuid(),
      channel,
      level: resolveLevel(options.level),
      message: options.message,
      title: options.title,
      data: options.data,
      createdAt: Date.now(),
      timeout: options.timeout ?? DEFAULT_TIMEOUT,
      persistent: options.persistent ?? channel === 'in-app'
    };
    this.registry.set(payload.id, payload);
    return payload;
  }

  private emit(notification: NotificationPayload): void {
    const specific = this.listeners.get(notification.channel);
    specific?.forEach((listener) => {
      try {
        listener(notification);
      } catch (error) {
        console.error('[notifications] listener error', error);
      }
    });

    const anyBucket = this.listeners.get('any');
    anyBucket?.forEach((listener) => {
      try {
        listener(notification);
      } catch (error) {
        console.error('[notifications] listener error', error);
      }
    });
  }

  private scheduleRemoval(notification: NotificationPayload): void {
    if (!notification.timeout || notification.timeout <= 0) {
      return;
    }

    setTimeout(() => {
      if (!this.registry.has(notification.id)) {
        return;
      }
      this.registry.delete(notification.id);
      this.emit({ ...notification, persistent: false });
    }, notification.timeout);
  }
}

export const notifications = new NotificationService();

export default notifications;
