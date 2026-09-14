import { useCallback, useEffect, useSyncExternalStore } from 'react'

/** Router mínimo sobre el hash: funciona offline y desde file:// en el APK. */

function currentPath(): string {
  const hash = window.location.hash.replace(/^#/, '')
  return hash || '/'
}

const listeners = new Set<() => void>()

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

window.addEventListener('hashchange', () => listeners.forEach((l) => l()))

export function useRoute(): string {
  return useSyncExternalStore(subscribe, currentPath, () => '/')
}

export function navigate(to: string, replace = false): void {
  const target = `#${to}`
  if (window.location.hash === target) return
  if (replace) window.history.replaceState(null, '', target)
  else window.location.hash = target
  if (replace) listeners.forEach((l) => l())
  window.scrollTo(0, 0)
}

export function back(fallback = '/'): void {
  if (window.history.length > 1) window.history.back()
  else navigate(fallback)
}

export function useBackHandler(handler: () => void): void {
  const stable = useCallback(handler, [handler])
  useEffect(() => {
    window.addEventListener('popstate', stable)
    return () => window.removeEventListener('popstate', stable)
  }, [stable])
}

export function Link(props: {
  to: string
  className?: string
  children: React.ReactNode
  onClick?: () => void
}) {
  return (
    <a
      href={`#${props.to}`}
      className={props.className}
      onClick={() => {
        props.onClick?.()
        window.scrollTo(0, 0)
      }}
    >
      {props.children}
    </a>
  )
}

/** Divide "/historial/ejercicio/Press%20banca" en segmentos decodificados. */
export function segments(path: string): string[] {
  return path.split('/').filter(Boolean).map(decodeURIComponent)
}
