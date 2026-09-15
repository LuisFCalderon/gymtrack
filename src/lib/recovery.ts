/**
 * Auto-reparación cuando el Service Worker sirve una caché envenenada.
 *
 * Al activar el aislamiento cross-origin, las respuestas que el Service Worker había guardado
 * **antes** del cambio dejan de servir para crear workers: el proxy asíncrono de OPFS no llega a
 * cargar y la apertura de la base se queda esperando para siempre. El usuario ve "Abriendo tu
 * libreta…" indefinidamente y no puede hacer nada.
 *
 * Como esa caché es reconstruible y los datos viven en OPFS (que aquí no se toca), la salida
 * segura es tirar el Service Worker y sus cachés y recargar una sola vez.
 */

const CLAVE = 'gymtrack:auto-reparado'

function yaSeIntento(): boolean {
  try {
    return sessionStorage.getItem(CLAVE) === '1'
  } catch {
    return false
  }
}

function marcarIntento(): void {
  try {
    sessionStorage.setItem(CLAVE, '1')
  } catch {
    /* sin sessionStorage no hay protección contra bucle: se intenta igualmente una vez */
  }
}

/** Borra Service Workers y cachés (nunca OPFS) y recarga. Como mucho una vez por pestaña. */
export async function repararCachesYRecargar(): Promise<boolean> {
  if (yaSeIntento()) return false
  marcarIntento()
  try {
    const registros = (await navigator.serviceWorker?.getRegistrations()) ?? []
    await Promise.all(registros.map((r) => r.unregister()))
    const nombres = await caches.keys()
    await Promise.all(nombres.map((n) => caches.delete(n)))
  } catch {
    /* si no se puede limpiar, la recarga al menos vuelve a intentarlo */
  }
  window.location.reload()
  return true
}
