/**
 * Tour guiado: aquí sólo viven la marca de "ya visto" y el lanzador.
 *
 * driver.js y sus estilos se cargan bajo demanda (`import()`), así que no pesan en el arranque.
 * El chunk queda dentro del bundle y lo precarga el Service Worker: el tour también abre sin
 * conexión, nunca se descarga de un CDN.
 */

const KEY = 'gymtrack:tour-visto'

/** Respaldo cuando el almacenamiento está bloqueado: al menos no se repite en esta sesión. */
let vistoEnMemoria = false

export function tourVisto(): boolean {
  if (vistoEnMemoria) return true
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    /* almacenamiento bloqueado: se muestra una vez por sesión */
    return false
  }
}

export function marcarTourVisto(): void {
  vistoEnMemoria = true
  try {
    localStorage.setItem(KEY, '1')
  } catch {
    /* marca sólo para esta sesión */
  }
}

/**
 * Abre la guía. La marca de "ya vista" la pone el propio tour cuando consigue mostrarse
 * (y al cerrarse o saltarse): si el chunk no llega a cargar, la guía se vuelve a ofrecer
 * en el siguiente arranque en vez de perderse en silencio.
 */
export async function abrirTour(): Promise<void> {
  try {
    const { lanzarTour } = await import('./tour')
    await lanzarTour()
  } catch {
    /* si el chunk no carga, la app sigue funcionando igual */
  }
}
