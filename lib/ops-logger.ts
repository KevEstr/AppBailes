import crypto from 'node:crypto';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function shouldLogVerbose() {
  // Verbose logs are opt-in for production debugging
  return process.env.DEBUG_MARK_RECEIVED === '1' || process.env.PAYMENTS_LOG_VERBOSE === '1';
}

function emit(level: LogLevel, payload: Record<string, unknown>) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    ...payload,
  });

  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export function createCorrelationId(explicitId?: string | null) {
  const trimmed = explicitId?.trim();
  if (trimmed) return trimmed;
  // randomUUID is available in recent Node; fallback kept for safety.
  return (crypto as any).randomUUID?.() ?? crypto.randomBytes(16).toString('hex');
}

export function logStep(opts: {
  level?: LogLevel;
  correlationId: string;
  scope: string;
  step: string;
  msg?: string;
  data?: Record<string, unknown>;
  verbose?: boolean;
}) {
  const { level = 'info', correlationId, scope, step, msg, data, verbose } = opts;
  if (verbose && !shouldLogVerbose()) return;
  emit(level, {
    correlationId,
    scope,
    step,
    msg,
    ...(data ? { data } : {}),
  });
}

export function withTimer() {
  const start = Date.now();
  return {
    ms() {
      return Date.now() - start;
    },
  };
}

