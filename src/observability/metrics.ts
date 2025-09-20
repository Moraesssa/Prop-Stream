export type TelemetryLevel = 'info' | 'warn' | 'error';

export type TelemetryAttributes = Record<string, unknown>;

type TelemetryEventType = 'event' | 'performance';

interface TelemetryBaseEvent {
  readonly type: TelemetryEventType;
  readonly name: string;
  readonly timestamp: number;
  readonly attributes?: TelemetryAttributes;
  readonly level: TelemetryLevel;
}

export interface TelemetryEvent extends TelemetryBaseEvent {
  readonly type: 'event';
}

export interface TelemetryPerformanceEvent extends TelemetryBaseEvent {
  readonly type: 'performance';
  readonly duration: number;
}

export type AnyTelemetryEvent = TelemetryEvent | TelemetryPerformanceEvent;

export type TelemetryListener = (event: AnyTelemetryEvent) => void;

export interface TelemetrySpan {
  readonly id: string;
  readonly name: string;
  readonly attributes: TelemetryAttributes;
  end(additionalAttributes?: TelemetryAttributes): number;
}

const MAX_BUFFERED_EVENTS = 200;

function now(): number {
  if (
    typeof performance !== 'undefined' &&
    typeof performance.now === 'function'
  ) {
    return performance.now();
  }

  return Date.now();
}

function createSpanId() {
  return `span-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeErrorAttributes(error: unknown): TelemetryAttributes {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  if (typeof error === 'object' && error !== null) {
    return {
      message: JSON.stringify(error),
    };
  }

  return { message: String(error) };
}

class TelemetryClient {
  private readonly listeners = new Set<TelemetryListener>();

  private readonly buffer: AnyTelemetryEvent[] = [];

  on(listener: TelemetryListener) {
    this.listeners.add(listener);
    return () => this.off(listener);
  }

  off(listener: TelemetryListener) {
    this.listeners.delete(listener);
  }

  getEvents() {
    return [...this.buffer];
  }

  recordEvent(
    name: string,
    attributes?: TelemetryAttributes,
    level: TelemetryLevel = 'info',
  ) {
    const event: TelemetryEvent = {
      type: 'event',
      name,
      timestamp: Date.now(),
      attributes,
      level,
    };

    this.emit(event);
  }

  recordPerformance(
    name: string,
    duration: number,
    attributes?: TelemetryAttributes,
    level: TelemetryLevel = 'info',
  ) {
    const event: TelemetryPerformanceEvent = {
      type: 'performance',
      name,
      timestamp: Date.now(),
      duration,
      attributes,
      level,
    };

    this.emit(event);
  }

  recordError(
    name: string,
    error: unknown,
    attributes?: TelemetryAttributes,
  ) {
    const errorAttributes = {
      ...attributes,
      ...normalizeErrorAttributes(error),
    };

    this.recordEvent(name, errorAttributes, 'error');
  }

  startSpan(
    name: string,
    attributes?: TelemetryAttributes,
  ): TelemetrySpan {
    const spanId = createSpanId();
    const startedAt = now();
    const baseAttributes: TelemetryAttributes = {
      spanId,
      ...attributes,
    };

    return {
      id: spanId,
      name,
      attributes: baseAttributes,
      end: (additionalAttributes?: TelemetryAttributes) => {
        const duration = Math.max(0, now() - startedAt);
        this.recordPerformance(name, duration, {
          ...baseAttributes,
          ...additionalAttributes,
        });
        return duration;
      },
    };
  }

  async withTiming<TResult>(
    name: string,
    callback: () => Promise<TResult> | TResult,
    attributes?: TelemetryAttributes,
  ): Promise<TResult> {
    const span = this.startSpan(name, attributes);

    try {
      const result = await callback();
      span.end({ outcome: 'success' });
      return result;
    } catch (error) {
      span.end({ outcome: 'error' });
      this.recordError(`${name}.error`, error, attributes);
      throw error;
    }
  }

  private emit(event: AnyTelemetryEvent) {
    this.buffer.push(event);
    if (this.buffer.length > MAX_BUFFERED_EVENTS) {
      this.buffer.shift();
    }

    if (import.meta.env?.DEV) {
      console.debug('[telemetry]', event.name, event);
    }

    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('[telemetry] listener failed', error);
      }
    });
  }
}

export const telemetry = new TelemetryClient();

export function trackEvent(
  name: string,
  attributes?: TelemetryAttributes,
  level: TelemetryLevel = 'info',
) {
  telemetry.recordEvent(name, attributes, level);
}

export function trackPerformance(
  name: string,
  duration: number,
  attributes?: TelemetryAttributes,
) {
  telemetry.recordPerformance(name, duration, attributes);
}

export function trackError(
  name: string,
  error: unknown,
  attributes?: TelemetryAttributes,
) {
  telemetry.recordError(name, error, attributes);
}

export function startSpan(
  name: string,
  attributes?: TelemetryAttributes,
): TelemetrySpan {
  return telemetry.startSpan(name, attributes);
}

export async function withTiming<TResult>(
  name: string,
  callback: () => Promise<TResult> | TResult,
  attributes?: TelemetryAttributes,
): Promise<TResult> {
  return telemetry.withTiming(name, callback, attributes);
}

