// This file configures the initialization of Sentry on the client for the
// NEXT build — Next auto-loads it whenever a user loads a page in their
// browser. The TanStack Start (Vite) build never loads Next convention files;
// it initializes Sentry with the same shared options in
// sentry.tanstack.ts instead.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
//
// The SDK is loaded via dynamic import so it stays out of the critical-path
// bundle, and only when a DSN is configured (the env guard below is inlined
// at build time, so self-hosted builds without a DSN ship no Sentry code at
// all). App code reports through the queueing facade in `lib/sentry.ts`,
// which `connectSentry` wires up once the SDK is ready.

import { connectSentry } from '@/lib/sentry'

type RouterTransitionStart = typeof import('@sentry/nextjs').captureRouterTransitionStart

let routerTransitionStart: RouterTransitionStart | null = null

// This export will instrument router navigations, and is only relevant if you
// enable tracing. Next reads it at module load, so it must exist synchronously
// and forward to the SDK once it has loaded.
export const onRouterTransitionStart: RouterTransitionStart = (...args) => {
  routerTransitionStart?.(...args)
}

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  void Promise.all([import('@sentry/nextjs'), import('@/lib/sentry-client-options')]).then(
    ([Sentry, { buildSentryClientOptions }]) => {
      Sentry.init(
        buildSentryClientOptions({
          // next.config.ts (withSentryConfig) annotates the bundles with the
          // 'supabase-studio' applicationKey, so third-party frame tagging works
          // on this build.
          includeThirdPartyErrorFilter: true,
        })
      )
      routerTransitionStart = Sentry.captureRouterTransitionStart
      connectSentry(Sentry)
    }
  )
}
