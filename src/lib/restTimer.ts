import { useSyncExternalStore } from 'react'
import { getRestAlert, getRestSeconds } from '../db/wellbeing'

/**
 * Temporizador de descanso entre series.
 *
 * La cuenta atrás se calcula siempre contra una marca absoluta (`Date.now()`), nunca acumulando
 * ticks: si el navegador ralentiza los temporizadores en segundo plano o la pantalla se apaga, al
 * volver se muestra el tiempo real o el descanso ya ha terminado.
 */

export type RestState = {
  activo: boolean
  /** Segundos que faltan (redondeados hacia arriba). */
  restante: number
  /** Duración de referencia para la barra de progreso. */
  total: number
  enPausa: boolean
}

const INACTIVO: RestState = { activo: false, restante: 0, total: 0, enPausa: false }

/** Mínimo al restar tiempo: nunca disparamos el aviso por pulsar −30 s. */
const MINIMO_S = 5
const TICK_MS = 250

let estado: RestState = INACTIVO
let finAt = 0
let pausaRestanteMs: number | null = null
let intervalo: ReturnType<typeof setInterval> | null = null
let ajustes: { segundos: number; aviso: boolean } | null = null
const suscriptores = new Set<() => void>()

function publicar(next: RestState): void {
  estado = next
  suscriptores.forEach((fn) => fn())
}

function restanteMs(): number {
  if (pausaRestanteMs != null) return pausaRestanteMs
  return Math.max(0, finAt - Date.now())
}

function tick(): void {
  const ms = restanteMs()
  if (ms <= 0) {
    terminar()
    return
  }
  const restante = Math.ceil(ms / 1000)
  const enPausa = pausaRestanteMs != null
  if (restante !== estado.restante || enPausa !== estado.enPausa) {
    publicar({ activo: true, restante, total: estado.total, enPausa })
  }
}

function arrancarReloj(): void {
  if (intervalo != null) return
  intervalo = setInterval(tick, TICK_MS)
  document.addEventListener('visibilitychange', tick)
}

function pararReloj(): void {
  if (intervalo != null) clearInterval(intervalo)
  intervalo = null
  document.removeEventListener('visibilitychange', tick)
}

function terminar(): void {
  pararReloj()
  pausaRestanteMs = null
  // Si el pitido quedó programado ya ha sonado a su hora: no hay que repetirlo ni cancelarlo.
  const yaSono = pitidos.length > 0
  pitidos = []
  publicar(INACTIVO)
  if (ajustes?.aviso !== false) {
    vibrar()
    if (!yaSono) programarPitido(0)
  }
}

/** Arranca el descanso con la duración configurada. Reinicia el que estuviera corriendo. */
export async function iniciarDescanso(): Promise<void> {
  if (!ajustes) {
    const [segundos, aviso] = await Promise.all([getRestSeconds(), getRestAlert()])
    ajustes = { segundos, aviso }
  }
  pausaRestanteMs = null
  finAt = Date.now() + ajustes.segundos * 1000
  programarPitido(ajustes.segundos)
  publicar({ activo: true, restante: ajustes.segundos, total: ajustes.segundos, enPausa: false })
  arrancarReloj()
}

/** Cierra el descanso sin avisar (saltar). */
export function saltarDescanso(): void {
  pararReloj()
  pausaRestanteMs = null
  cancelarPitido()
  publicar(INACTIVO)
}

/** Suma o resta segundos al descanso en curso. */
export function ajustarDescanso(delta: number): void {
  if (!estado.activo) return
  const ms = Math.max(MINIMO_S * 1000, restanteMs() + delta * 1000)
  if (pausaRestanteMs != null) pausaRestanteMs = ms
  else finAt = Date.now() + ms
  if (pausaRestanteMs == null) programarPitido(ms / 1000)
  const restante = Math.ceil(ms / 1000)
  publicar({ ...estado, restante, total: Math.max(estado.total, restante) })
}

export function alternarPausa(): void {
  if (!estado.activo) return
  if (pausaRestanteMs != null) {
    finAt = Date.now() + pausaRestanteMs
    programarPitido(pausaRestanteMs / 1000)
    pausaRestanteMs = null
  } else {
    pausaRestanteMs = restanteMs()
    cancelarPitido()
  }
  publicar({ ...estado, enPausa: pausaRestanteMs != null })
}

/** Olvida la duración y el aviso cacheados tras cambiarlos en Ajustes. */
export function invalidarAjustesDescanso(): void {
  ajustes = null
}

export function useRestTimer(): RestState {
  return useSyncExternalStore(
    (fn) => {
      suscriptores.add(fn)
      return () => suscriptores.delete(fn)
    },
    () => estado,
    () => INACTIVO,
  )
}

/** m:ss */
export function formatoDescanso(segundos: number): string {
  const total = Math.max(0, Math.round(segundos))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

/* ---------- Aviso: vibración + pitido (sin archivos de audio) ---------- */

let audio: AudioContext | null = null
/** Osciladores ya programados para sonar al final del descanso. */
let pitidos: OscillatorNode[] = []

/** Se llama al registrar la serie, que es un gesto del usuario: así el audio queda desbloqueado. */
function prepararAudio(): void {
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return
    audio ??= new Ctor()
    if (audio.state === 'suspended') void audio.resume()
  } catch {
    audio = null
  }
}

function vibrar(): void {
  try {
    navigator.vibrate?.([160, 90, 160])
  } catch {
    /* el navegador puede no permitirlo */
  }
}

/**
 * Deja el pitido programado en el reloj del `AudioContext`, que sigue corriendo aunque el
 * navegador estrangule los temporizadores de JS con la pantalla apagada. Así suena a su hora
 * sin depender de que un tick llegue a tiempo. Con `segundos = 0` suena de inmediato.
 */
function programarPitido(segundos: number): void {
  cancelarPitido()
  if (ajustes?.aviso === false) return
  try {
    prepararAudio()
    if (!audio) return
    const base = audio.currentTime + Math.max(0, segundos)
    for (const offset of [0, 0.24]) {
      const osc = audio.createOscillator()
      const gain = audio.createGain()
      osc.type = 'sine'
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.0001, base + offset)
      gain.gain.exponentialRampToValueAtTime(0.3, base + offset + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, base + offset + 0.18)
      osc.connect(gain)
      gain.connect(audio.destination)
      osc.start(base + offset)
      osc.stop(base + offset + 0.2)
      pitidos.push(osc)
    }
  } catch {
    /* audio bloqueado: el descanso termina en silencio */
    cancelarPitido()
  }
}

/** Anula el pitido pendiente (saltar, pausar, ajustar o reiniciar el descanso). */
function cancelarPitido(): void {
  for (const osc of pitidos) {
    try {
      osc.stop()
      osc.disconnect()
    } catch {
      /* parar un oscilador que ya terminó puede lanzar: da igual */
    }
  }
  pitidos = []
}
