import { useTheme } from 'next-themes'
import { useEffect } from 'react'

import { onMonacoLoaded } from '@/lib/configure-monaco-loader'

export const getTheme = (theme: string) => {
  const isDarkMode = theme.includes('dark')
  // [TODO] Probably need better theming for light mode
  return {
    base: isDarkMode ? ('vs-dark' as const) : ('vs' as const), // can also be vs-dark or hc-black
    inherit: true, // can also be false to completely replace the builtin rules
    rules: [
      { token: '', background: isDarkMode ? '1f1f1f' : 'f0f0f0' },
      {
        token: '',
        background: isDarkMode ? '1f1f1f' : 'f0f0f0',
        foreground: isDarkMode ? 'd4d4d4' : '444444',
      },
      { token: 'string.sql', foreground: '24b47e' },
      { token: 'comment', foreground: '666666' },
      { token: 'predefined.sql', foreground: isDarkMode ? 'D4D4D4' : '444444' },
    ],
    colors: { 'editor.background': isDarkMode ? '#1f1f1f' : '#f0f0f0' },
  }
}

/**
 * Defines the `supabase` Monaco theme as soon as Monaco loads (and re-defines
 * it when the app theme changes).
 *
 * Deliberately does NOT use `useMonaco()`: that hook eagerly downloads the
 * full Monaco bundle on every page. Instead we subscribe via
 * `onMonacoLoaded`, which only fires when a page actually loads an editor —
 * the theme is defined during `loader.init()` resolution, before any editor
 * mounts.
 */
export const MonacoThemeProvider = () => {
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    if (!resolvedTheme) return
    return onMonacoLoaded((monaco) => {
      monaco.editor.defineTheme('supabase', getTheme(resolvedTheme))
    })
  }, [resolvedTheme])

  return null
}
