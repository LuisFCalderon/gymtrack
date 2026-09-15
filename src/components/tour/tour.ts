import { driver, type Alignment, type Driver, type DriveStep, type Side } from 'driver.js'
import 'driver.js/dist/driver.css'
import './tour.css'
import { navigate } from '../../lib/router'
import { marcarTourVisto } from './index'

/**
 * Guía de la app: una parada por tema, cruzando pantallas.
 *
 * El tour se estrena en una instalación vacía (sin rutina, sin sesiones, sin datos), así que se
 * ancla en elementos que existen siempre: la navegación, las cabeceras y los botones principales.
 * Antes de cada parada se navega a su ruta y se espera al elemento con un `MutationObserver`; si
 * no aparece en `ESPERA_MS` (por ejemplo, las gráficas cuando todavía no hay entrenamientos) el
 * paso se salta y el tour continúa.
 *
 * Ninguna parada entra al entrenamiento en vivo: abrirlo crearía una sesión vacía en la base de
 * datos. Esos tres temas se explican con el popover centrado, sin elemento resaltado.
 */

type PasoTour = {
  /** Ruta a la que hay que navegar antes de resaltar. */
  ruta?: string
  /** Elemento a resaltar. Sin selector, el popover se muestra centrado en la pantalla. */
  selector?: string
  titulo: string
  texto: string
  lado?: Side
  alineacion?: Alignment
  /** Margen de espera propio: corto cuando ya se sabe que el elemento puede no existir. */
  espera?: number
}

const PASOS: PasoTour[] = [
  {
    ruta: '/',
    titulo: 'Bienvenido a Gym Track',
    texto:
      'Tu libreta de entrenamiento: rutina, series, cardio, agua y peso. Todo se guarda en este dispositivo, sin cuentas y sin internet. Te enseño lo básico en un minuto.',
  },
  {
    ruta: '/',
    selector: '[data-tour="nav"]',
    lado: 'top',
    alineacion: 'center',
    titulo: 'Las cinco secciones',
    texto: 'Hoy, Rutina, Historial, Progreso y Ajustes. Desde aquí te mueves por toda la app.',
  },
  {
    ruta: '/',
    selector: '[data-tour="hoy-resumen"]',
    lado: 'bottom',
    titulo: 'Hoy',
    texto:
      'La pantalla de inicio: qué toca entrenar hoy y, justo debajo, el agua, el cardio y el peso del día de un vistazo.',
  },
  {
    ruta: '/rutina',
    selector: '[data-tour="rutina-dias"]',
    lado: 'bottom',
    titulo: 'Tu rutina',
    texto:
      'Los siete días de la semana. Entra en uno y añade los ejercicios que quieras, sin límite: se editan, se borran y se reordenan arrastrándolos.',
  },
  {
    ruta: '/',
    selector: '[data-tour="hoy-iniciar"]',
    lado: 'top',
    titulo: 'Entrenar',
    texto:
      'Aquí empieza la sesión. Registras cada serie con peso, reps y RIR; el botón + repite la serie anterior de un toque y debajo aparece lo que hiciste el día anterior para comparar.',
  },
  {
    ruta: '/',
    titulo: 'Sustituir un ejercicio',
    texto:
      'Con el menú ⋯ de cada ejercicio puedes cambiarlo. "Solo hoy" afecta únicamente a este entrenamiento y tu rutina queda intacta; "Actualizar rutina" lo reemplaza también para los próximos días. El historial siempre guarda lo que hiciste de verdad.',
  },
  {
    ruta: '/',
    titulo: 'Descanso entre series',
    texto:
      'El temporizador arranca solo al registrar una serie y lo ves desde cualquier pantalla. Puedes pausarlo o sumar y quitar 30 s; la duración se elige en Ajustes.',
  },
  {
    ruta: '/historial',
    selector: '[data-tour="historial-buscador"]',
    lado: 'bottom',
    titulo: 'Historial',
    texto:
      'Todas tus sesiones anteriores, de la más reciente a la más antigua. Busca un ejercicio por su nombre para ver su evolución serie a serie.',
  },
  {
    ruta: '/progreso',
    selector: '[data-tour="progreso-semana"]',
    lado: 'bottom',
    titulo: 'Progreso',
    texto:
      'Tu resumen de los últimos siete días. El volumen es la suma de peso × repeticiones de cada serie.',
  },
  {
    ruta: '/progreso',
    selector: '[data-tour="progreso-graficas"]',
    lado: 'bottom',
    // Sin entrenamientos no hay gráfica: se comprueba rápido y, si no está, se salta la parada.
    espera: 600,
    titulo: 'Tus gráficas',
    texto:
      'Volumen o series por semana, para ver si subes o te estancas. Cada ejercicio tiene además su propia gráfica en su historial.',
  },
  {
    ruta: '/progreso',
    selector: '[data-tour="progreso-modulos"]',
    lado: 'top',
    titulo: 'Cardio, agua y peso',
    texto:
      'Se registran cualquier día, entrenes o no: van por su cuenta y no dependen de la sesión de fuerza.',
  },
  {
    ruta: '/ajustes',
    selector: '[data-tour="ajustes-perfil"]',
    lado: 'bottom',
    titulo: 'Tu perfil',
    texto:
      'Tu altura y tu meta de agua: los dos datos que la app usa para calcular el IMC y tu progreso de hidratación. No es una cuenta, viven en este dispositivo como todo lo demás.',
  },
  {
    ruta: '/ajustes',
    selector: '[data-tour="ajustes-apariencia"]',
    lado: 'bottom',
    titulo: 'Ajustes',
    texto: 'Elige el tema claro u oscuro, el que mejor veas en el gimnasio.',
  },
  {
    ruta: '/ajustes',
    selector: '[data-tour="ajustes-descanso"]',
    lado: 'bottom',
    titulo: 'Cuánto descansas',
    texto:
      'Aquí fijas la duración del temporizador y si quieres aviso con pitido y vibración al terminar.',
  },
  {
    ruta: '/ajustes',
    selector: '[data-tour="ajustes-datos"]',
    lado: 'top',
    titulo: 'Tu copia de seguridad',
    texto:
      'No hay nube: los datos viven en este navegador. Si borras sus datos o desinstalas la app, se pierden. Exporta una copia de vez en cuando e impórtala al cambiar de dispositivo.',
  },
  {
    ruta: '/ajustes',
    selector: '[data-tour="ajustes-guia"]',
    lado: 'top',
    titulo: 'Eso es todo',
    texto: 'Puedes volver a ver esta guía cuando quieras desde este botón. A entrenar.',
  },
]

/** Margen para que aparezca el elemento tras cambiar de pantalla. */
const ESPERA_MS = 1500

let conductor: Driver | null = null
let moviendo = false

export async function lanzarTour(): Promise<void> {
  if (conductor) return

  const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  conductor = driver({
    steps: PASOS.map(aPaso),
    animate: !sinMovimiento,
    smoothScroll: !sinMovimiento,
    overlayColor: '#000',
    overlayOpacity: 0.62,
    stagePadding: 6,
    stageRadius: 14,
    popoverClass: 'tour-popover',
    popoverOffset: 12,
    // Resaltar no es tocar: si el usuario pulsa el elemento se iría de pantalla y el tour se rompe.
    disableActiveInteraction: true,
    showProgress: true,
    progressText: '{{current}} de {{total}}',
    nextBtnText: 'Siguiente',
    prevBtnText: 'Anterior',
    doneBtnText: 'Listo',
    onPopoverRender: (popover, { index }) => {
      // driver.js sólo pone una "×": aquí es el botón de salir de la guía.
      const ultimo = index === PASOS.length - 1
      popover.closeButton.textContent = ultimo ? 'Cerrar' : 'Saltar'
      popover.closeButton.setAttribute('aria-label', ultimo ? 'Cerrar la guía' : 'Saltar la guía')
    },
    onNextClick: (_el, _paso, { index }) => void mostrar((index ?? 0) + 1, 1),
    onPrevClick: (_el, _paso, { index }) => void mostrar((index ?? 0) - 1, -1),
    onDestroyed: () => {
      conductor = null
      marcarTourVisto()
    },
  })

  await mostrar(0, 1)
  // Ya se mostró: a partir de aquí no vuelve a salir sola aunque el usuario cierre la pestaña.
  marcarTourVisto()
}

function aPaso(paso: PasoTour): DriveStep {
  return {
    element: paso.selector,
    popover: {
      title: paso.titulo,
      description: paso.texto,
      side: paso.lado ?? 'bottom',
      align: paso.alineacion ?? 'center',
    },
  }
}

/**
 * Navega, espera al elemento y resalta el paso. Si no aparece, sigue buscando en la misma
 * dirección hasta encontrar uno que sí exista; si se acaban los pasos, cierra la guía.
 */
async function mostrar(indice: number, direccion: 1 | -1): Promise<void> {
  if (!conductor || moviendo) return
  moviendo = true
  try {
    let i = indice
    while (i >= 0 && i < PASOS.length) {
      const paso = PASOS[i]
      if (paso.ruta) navigate(paso.ruta)
      if (!paso.selector) break
      if (await esperarElemento(paso.selector, paso.espera)) break
      i += direccion
    }
    if (!conductor) return // se cerró mientras esperábamos
    if (i < 0 || i >= PASOS.length) {
      cerrarTour()
      return
    }
    if (conductor.isActive()) conductor.moveTo(i)
    else conductor.drive(i)
  } finally {
    moviendo = false
  }
}

/** Cierra la guía y la deja marcada como vista. */
function cerrarTour(): void {
  const actual = conductor
  conductor = null
  actual?.destroy()
  marcarTourVisto()
}

/** Un elemento oculto (o con tamaño cero) no se puede resaltar: cuenta como ausente. */
function utilizable(el: Element): boolean {
  const caja = el.getBoundingClientRect()
  return caja.width > 0 && caja.height > 0
}

/** Espera a que el selector exista en el DOM, con límite de tiempo. */
function esperarElemento(selector: string, limite = ESPERA_MS): Promise<Element | null> {
  const inmediato = document.querySelector(selector)
  if (inmediato && utilizable(inmediato)) return Promise.resolve(inmediato)

  return new Promise((resolve) => {
    let resuelto = false
    const observador = new MutationObserver(() => {
      const el = document.querySelector(selector)
      if (el && utilizable(el)) finalizar(el)
    })
    const espera = window.setTimeout(() => finalizar(null), limite)

    function finalizar(el: Element | null): void {
      if (resuelto) return
      resuelto = true
      observador.disconnect()
      window.clearTimeout(espera)
      resolve(el)
    }

    observador.observe(document.body, { childList: true, subtree: true })
  })
}
