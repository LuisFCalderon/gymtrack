export type Theme = 'dark' | 'light'

const KEY = 'gymtrack:theme'

export function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    /* almacenamiento bloqueado: se usa el tema por defecto */
  }
  return 'dark'
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#0b0b0d' : '#f6f6f8')
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    /* preferencia sólo para esta sesión */
  }
}
