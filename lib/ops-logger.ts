import crypto from 'node:crypto';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// ─── In-memory ring buffer ─────────────────────────────────────────────────
// Stores the last MAX_ENTRIES log entries so they can be retrieved via the
// /api/admin/debug-logs endpoint regardless of Railway's stdout visibility.

const MAX_ENTRIES = 200;

export interface LogEntry {
  ts: string;
  level: LogLevel;
  correlationId: string;
  scope: string;
  step: string;
  msg?: string;
  data?: Record<string, unknown>;
}

// global is used so the buffer survives Next.js hot-module reloads in dev.
const g = globalThis as unknown as { __opsLogBuffer?: LogEntry[] };
if (!g.__opsLogBuffer) g.__opsLogBuffer = [];

export function getLogBuffer(): LogEntry[] {
  return g.__opsLogBuffer ?? [];
}

export function clearLogBuffer() {
  g.__opsLogBuffer = [];
}

function pushToBuffer(entry: LogEntry) {
  const buf = (g.__opsLogBuffer ??= []);
  buf.push(entry);
  if (buf.length > MAX_ENTRIES) buf.splice(0, buf.length - MAX_ENTRIES);
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function shouldLogVerbose() {
  return process.env.DEBUG_MARK_RECEIVED === '1' || process.env.PAYMENTS_LOG_VERBOSE === '1';
}

function emit(level: LogLevel, payload: Record<string, unknown>) {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, ...payload });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export function createCorrelationId(explicitId?: string | null) {
  const trimmed = explicitId?.trim();
  if (trimmed) return trimmed;
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

  const entry: LogEntry = {
    ts: new Date().toISOString(),
    level,
    correlationId,
    scope,
    step,
    ...(msg ? { msg } : {}),
    ...(data ? { data } : {}),
  };

  // Always store in buffer (regardless of verbose flag that was already checked).
  pushToBuffer(entry);

  // Also emit to stdout for Railway/local terminal.
  emit(level, { correlationId, scope, step, ...(msg ? { msg } : {}), ...(data ? { data } : {}) });
}

export function withTimer() {
  const start = Date.now();
  return {
    ms() {
      return Date.now() - start;
    },
  };
}
