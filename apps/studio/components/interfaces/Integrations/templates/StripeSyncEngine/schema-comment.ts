import type { SchemaInstallationStatus, StripeSchemaComment } from '@stripe/sync-engine/supabase'

export type { SchemaInstallationStatus, StripeSchemaComment }

/**
 * Client-safe mirror of the schema-comment helpers from
 * `@stripe/sync-engine/supabase`.
 *
 * The package's `/supabase` entry point re-exports its installer alongside
 * these helpers, and the installer embeds several MB of SQL migrations and
 * edge-function sources. Importing anything from it at runtime drags all of
 * that into the client bundle (it ends up in the shared chunk of every page
 * via the command menu). Only the server-side API route should import the
 * real package; client code imports this module instead.
 *
 * `schema-comment.test.ts` asserts that the version constant and parser stay
 * in sync with the installed package.
 */

/** Mirrors `getCurrentVersion()` from `@stripe/sync-engine` (checked by test). */
export const STRIPE_SYNC_ENGINE_VERSION = '1.0.32'

const STRIPE_SCHEMA_COMMENT_PREFIX = 'stripe-sync'
const INSTALLATION_STARTED_SUFFIX = 'installation:started'
const INSTALLATION_ERROR_SUFFIX = 'installation:error'
const INSTALLATION_INSTALLED_SUFFIX = 'installed'
const UNINSTALLATION_STARTED_SUFFIX = 'uninstallation:started'
const UNINSTALLATION_ERROR_SUFFIX = 'uninstallation:error'

/** Mirrors `parseSchemaComment()` from `@stripe/sync-engine/supabase` (checked by test). */
export function parseSchemaComment(comment: string | undefined | null): StripeSchemaComment {
  if (!comment) return { status: 'uninstalled' }

  try {
    const parsed = JSON.parse(comment)
    if (parsed.status) {
      return parsed
    }
  } catch {
    // Not JSON — fall through to the legacy text format
  }

  if (!comment.includes(STRIPE_SCHEMA_COMMENT_PREFIX)) {
    return { status: 'uninstalled' }
  }

  const versionMatch = comment.match(/stripe-sync\s+v?([0-9]+\.[0-9]+\.[0-9]+)/)
  const version = versionMatch?.[1]

  let status: SchemaInstallationStatus
  let errorMessage: string | undefined

  if (comment.includes(UNINSTALLATION_ERROR_SUFFIX)) {
    status = 'uninstall error'
    const errorMatch = comment.match(/uninstallation:error\s*-\s*(.+)$/)
    errorMessage = errorMatch?.[1]
  } else if (comment.includes(UNINSTALLATION_STARTED_SUFFIX)) {
    status = 'uninstalling'
  } else if (comment.includes(INSTALLATION_ERROR_SUFFIX)) {
    status = 'install error'
    const errorMatch = comment.match(/installation:error\s*-\s*(.+)$/)
    errorMessage = errorMatch?.[1]
  } else if (comment.includes(INSTALLATION_STARTED_SUFFIX)) {
    status = 'installing'
  } else if (comment.includes(INSTALLATION_INSTALLED_SUFFIX)) {
    status = 'installed'
  } else {
    return { status: 'uninstalled' }
  }

  return { status, oldVersion: undefined, newVersion: version, errorMessage }
}
