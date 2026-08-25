import { loader, type Monaco } from '@monaco-editor/react'

import { BASE_PATH, IS_PLATFORM } from '@/lib/constants'

type MonacoListener = (monaco: Monaco) => void

const monacoListeners = new Set<MonacoListener>()
let loadedMonaco: Monaco | null = null

/**
 * Subscribe to the Monaco instance without forcing it to download.
 *
 * `useMonaco()` from `@monaco-editor/react` eagerly calls `loader.init()`,
 * which pulls in the full Monaco bundle (~1MB) even on pages that never
 * render an editor. Listeners registered here are only invoked once
 * something that actually needs Monaco (an editor component) initiates the
 * load. If Monaco is already loaded, the listener fires immediately.
 *
 * Returns an unsubscribe function.
 */
export function onMonacoLoaded(listener: MonacoListener): () => void {
  monacoListeners.add(listener)
  if (loadedMonaco) listener(loadedMonaco)
  return () => monacoListeners.delete(listener)
}

// [Ivan] Serve the Monaco assets locally from the public folder for self-hosted deployments, but use the CDN for
// the platform deployment to reduce bundle size and improve caching.
//
// Shared by both runtime entry points — `pages/_app.tsx` (Next) and
// `routes/__root.tsx` (TanStack) — so the asset path can't drift between them.
export function configureMonacoLoader() {
  if (typeof window !== 'undefined') {
    loader.config({
      paths: {
        vs: IS_PLATFORM
          ? 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs'
          : `${BASE_PATH}/monaco-editor/vs`,
      },
    })

    // Wrap `loader.init` so subscribers (e.g. theme definition) run as soon
    // as any editor component starts loading Monaco — without this file (or
    // any listener) triggering the download itself.
    const originalInit = loader.init.bind(loader)
    loader.init = () => {
      const cancelable = originalInit()
      cancelable.then((monaco: Monaco) => {
        loadedMonaco = monaco
        monacoListeners.forEach((listener) => listener(monaco))
      })
      return cancelable
    }
  }
}
