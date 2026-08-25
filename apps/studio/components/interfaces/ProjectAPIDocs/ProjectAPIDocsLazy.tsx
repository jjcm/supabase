import dynamic from 'next/dynamic'
import { useState } from 'react'

import { useAppStateSnapshot } from '@/state/app-state'

const ProjectAPIDocsPanel = dynamic(() => import('./ProjectAPIDocs').then((m) => m.ProjectAPIDocs))

/**
 * Defers mounting the API docs side panel — and downloading its chunk (docs
 * content sections, syntax highlighter, …) — until it is first opened. Stays
 * mounted afterwards so the panel's close animation still plays.
 */
export const ProjectAPIDocsLazy = () => {
  const snap = useAppStateSnapshot()
  const [hasOpened, setHasOpened] = useState(false)

  if (snap.showProjectApiDocs && !hasOpened) setHasOpened(true)
  if (!hasOpened) return null

  return <ProjectAPIDocsPanel />
}
