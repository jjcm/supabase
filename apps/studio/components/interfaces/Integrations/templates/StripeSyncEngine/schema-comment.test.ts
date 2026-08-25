import {
  getCurrentVersion,
  parseSchemaComment as parseSchemaCommentUpstream,
} from '@stripe/sync-engine/supabase'
import { describe, expect, it } from 'vitest'

import { parseSchemaComment, STRIPE_SYNC_ENGINE_VERSION } from './schema-comment'

describe('schema-comment mirror of @stripe/sync-engine/supabase', () => {
  it('version constant matches the installed package', () => {
    expect(STRIPE_SYNC_ENGINE_VERSION).toBe(getCurrentVersion())
  })

  it.each([
    undefined,
    null,
    '',
    'some unrelated comment',
    '{"status":"installed","newVersion":"1.0.32"}',
    '{malformed json',
    'stripe-sync v1.0.32 installation:started',
    'stripe-sync v1.0.32 installation:error - boom',
    'stripe-sync v1.0.32 installed',
    'stripe-sync v1.0.32 uninstallation:started',
    'stripe-sync v1.0.32 uninstallation:error - kaboom',
    'stripe-sync v1.0.32',
  ])('parseSchemaComment(%j) matches the upstream implementation', (comment) => {
    expect(parseSchemaComment(comment)).toEqual(parseSchemaCommentUpstream(comment ?? undefined))
  })
})
