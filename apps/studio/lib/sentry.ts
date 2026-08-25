import type { Scope, Span, StartSpanOptions } from '@sentry/nextjs'

export type { Breadcrumb, Event } from '@sentry/nextjs'

/**
 * Lazy facade over the Sentry SDK.
 *
 * The real SDK is ~46KB gzip and was statically imported by ~20 client
 * modules, putting it in the critical-path bundle of every page — even on
 * self-hosted builds where no DSN is configured and every event is dropped.
 *
 * Client code imports the capture helpers from this module instead. The SDK
 * is loaded and initialized by `instrumentation-client.ts` (Next build) or
 * `sentry.tanstack.ts` (TanStack build), which call `connectSentry` once
 * ready; calls made before that are queued (bounded) and flushed on connect.
 * When Sentry is not configured, the SDK never loads and every call is a
 * cheap no-op.
 */
type CaptureExceptionHint = Parameters<typeof import('@sentry/nextjs').captureException>[1]
type CaptureMessageContext = Parameters<typeof import('@sentry/nextjs').captureMessage>[1]

interface SentryClient {
  captureException: (exception: unknown, hint?: CaptureExceptionHint) => string
  captureMessage: (message: string, context?: CaptureMessageContext) => string
  withScope: <T>(callback: (scope: Scope) => T) => T
  setTag: (key: string, value: string | number | boolean | null | undefined) => void
  setUser: (user: { id: string } | null) => void
  startSpan: <T>(options: StartSpanOptions, callback: (span: Span) => T) => T
}

let sentryClient: SentryClient | null = null

// Bounded so a build that never connects (e.g. self-hosted) cannot grow the
// queue indefinitely.
const MAX_PENDING_CALLS = 50
const pendingCalls: Array<(sentry: SentryClient) => void> = []

function runWhenConnected(call: (sentry: SentryClient) => void) {
  if (sentryClient) {
    call(sentryClient)
  } else if (pendingCalls.length < MAX_PENDING_CALLS) {
    pendingCalls.push(call)
  }
}

/**
 * Wires the facade to a loaded-and-initialized Sentry SDK and flushes any
 * queued calls. Called by the build-specific init modules only.
 */
export function connectSentry(sentry: SentryClient) {
  sentryClient = sentry
  pendingCalls.splice(0).forEach((call) => call(sentry))
}

export function captureException(exception: unknown, hint?: CaptureExceptionHint): string {
  if (sentryClient) return sentryClient.captureException(exception, hint)
  runWhenConnected((sentry) => sentry.captureException(exception, hint))
  // The event id is only known once the SDK has loaded
  return ''
}

export function captureMessage(message: string, context?: CaptureMessageContext): string {
  if (sentryClient) return sentryClient.captureMessage(message, context)
  runWhenConnected((sentry) => sentry.captureMessage(message, context))
  return ''
}

export function withScope<T>(callback: (scope: Scope) => T): T | undefined {
  if (sentryClient) return sentryClient.withScope(callback)
  runWhenConnected((sentry) => void sentry.withScope(callback))
  return undefined
}

export function setTag(key: string, value: string | number | boolean | null | undefined): void {
  runWhenConnected((sentry) => sentry.setTag(key, value))
}

export function setUser(user: { id: string } | null): void {
  runWhenConnected((sentry) => sentry.setUser(user))
}

// Spans run against a no-op recorder until the SDK is connected: the callback
// must still run (it contains the actual work), we just don't record timing.
const NOOP_SPAN = new Proxy({}, { get: () => () => NOOP_SPAN }) as Span

export function startSpan<T>(options: StartSpanOptions, callback: (span: Span) => T): T {
  if (sentryClient) return sentryClient.startSpan(options, callback)
  return callback(NOOP_SPAN)
}
