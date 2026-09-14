import { useSyncExternalStore } from 'react'

/**
 * Instalación de la PWA.
 *
 * El navegador dispara `beforeinstallprompt` una sola vez y muy pronto, así que este módulo se
 * importa desde `main.tsx`: si se escuchara al montar Ajustes, el evento ya habría pasado. Hay
 * que llamar a `preventDefault()` para quedarse con él y poder lanzarlo después.
 */

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt(): Promise<void>
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent
  }
}

export type ResultadoInstalacion = 'aceptada' | 'rechazada' | 'no-disponible'

let guardado: BeforeInstallPromptEvent | null = null
const suscriptores = new Set<() => void>()

function avisar(): void {
  suscriptores.forEach((fn) => fn())
}

try {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    guardado = event
    avisar()
  })
  window.addEventListener('appinstalled', () => {
    guardado = null
    avisar()
  })
} catch {
  /* si el navegador no permite escuchar, simplemente no se ofrece el botón */
}

/** La app ya corre instalada (pantalla de inicio en Android o iOS). */
export function appInstalada(): boolean {
  try {
    if (window.matchMedia('(display-mode: standalone)').matches) return true
    return (navigator as Navigator & { standalone?: boolean }).standalone === true
  } catch {
    return false
  }
}

/** `true` cuando el navegador nos dejó guardar su invitación a instalar. */
export function useInstalacionDisponible(): boolean {
  return useSyncExternalStore(
    (fn) => {
      suscriptores.add(fn)
      return () => suscriptores.delete(fn)
    },
    () => guardado != null,
    () => false,
  )
}

/** Lanza el diálogo nativo. El evento sólo sirve una vez. */
export async function instalarApp(): Promise<ResultadoInstalacion> {
  const evento = guardado
  if (!evento) return 'no-disponible'
  try {
    await evento.prompt()
    const { outcome } = await evento.userChoice
    guardado = null
    avisar()
    return outcome === 'accepted' ? 'aceptada' : 'rechazada'
  } catch {
    guardado = null
    avisar()
    return 'no-disponible'
  }
}
