import type { CSSProperties } from 'react'
import type { Theme } from './db/schema'
import { themeTint } from './theme-colors'

// Same reasoning as Reader.tsx: text-foreground/text-muted-foreground/
// hover:bg-muted read CSS variables, so overriding them makes the library and
// the settings follow the same theme as the reader instead of always showing
// the app's default light look. --primary/--primary-foreground cover the
// buttons — there's no separate accent color in Theme yet, so they use the
// theme's colors inverted (text color as fill, background as its label)
// instead of the app's default black/white button. --border: the app's fixed
// light gray read as a bright line on dark palettes.
export function pageThemeVars(theme: Theme): CSSProperties {
  return {
    background: theme.background,
    color: theme.textColor,
    '--foreground': theme.textColor,
    '--muted-foreground': theme.textColor,
    '--muted': `${theme.textColor}1a`,
    '--primary': theme.textColor,
    '--primary-foreground': theme.background,
    '--border': themeTint(theme, 15),
    // The menus and the notifications (Toaster, rendered in place).
    '--popover': themeTint(theme, 5),
    '--popover-foreground': theme.textColor,
  } as CSSProperties
}

// Menus and dialogs render through portals, outside the themed subtree, so
// they get the palette again. --input and --ring: the fields' border and focus
// ring, the app's fixed light grays otherwise — a bright outline on a dark palette.
export function portalThemeVars(theme: Theme): CSSProperties {
  return {
    ...pageThemeVars(theme),
    background: undefined,
    '--background': theme.background,
    '--accent': `${theme.textColor}1a`,
    '--accent-foreground': theme.textColor,
    '--input': themeTint(theme, 20),
    '--ring': themeTint(theme, 65),
  } as CSSProperties
}
