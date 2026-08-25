import { Manrope } from 'next/font/google'
import localFont from 'next/font/local'

export const manrope = Manrope({
  variable: '--font-manrope',
  display: 'swap',
  subsets: ['latin'],
})

export const inter = localFont({
  variable: '--font-inter',
  display: 'swap',
  // ~100KB of font data (normal + italic) would otherwise be preloaded at
  // high priority, competing with critical-path JS. `display: swap` plus the
  // size-adjusted fallback below already handle the font arriving late.
  preload: false,
  fallback: ['system-ui', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
  src: [
    {
      path: './inter/InterVariable.woff2',
      weight: '100 900',
      style: 'normal',
    },
    {
      path: './inter/InterVariable-Italic.woff2',
      weight: '100 900',
      style: 'italic',
    },
  ],
})

export const sourceCodePro = localFont({
  variable: '--font-source-code-pro',
  display: 'swap',
  // The code font is only visible inside editors and code blocks — never on
  // first paint — so it doesn't need to be preloaded on every page.
  preload: false,
  fallback: ['Source Code Pro', 'Office Code Pro', 'Menlo', 'monospace'],
  src: [
    {
      path: './source-code-pro/SourceCodePro-Variable.woff2',
      weight: '200 900',
      style: 'normal',
    },
    {
      path: './source-code-pro/SourceCodePro-Variable-Italic.woff2',
      weight: '200 900',
      style: 'italic',
    },
  ],
})
