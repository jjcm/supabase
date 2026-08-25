import dynamic from 'next/dynamic'
import { useState } from 'react'

import { useFeaturePreviewModal } from './FeaturePreviewContext'

const FeaturePreviewModalInner = dynamic(() =>
  import('./FeaturePreviewModal').then((m) => m.FeaturePreviewModal)
)

/**
 * Defers mounting the feature preview modal — and downloading its chunk (all
 * preview panels, markdown renderer, …) — until it is first opened. Stays
 * mounted afterwards so the close animation still plays.
 */
export const FeaturePreviewModalLazy = () => {
  const { showFeaturePreviewModal } = useFeaturePreviewModal()
  const [hasOpened, setHasOpened] = useState(false)

  if (showFeaturePreviewModal && !hasOpened) setHasOpened(true)
  if (!hasOpened) return null

  return <FeaturePreviewModalInner />
}
