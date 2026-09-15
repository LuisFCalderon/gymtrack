/**
 * Persistencia del almacenamiento local.
 *
 * Los datos de Gym Track viven sólo en este dispositivo. Un navegador puede **desalojar** el
 * almacenamiento de un sitio cuando al teléfono le falta espacio, y con él se iría la libreta
 * entera. `navigator.storage.persist()` pide que no lo haga.
 *
 * El navegador decide: suele conceder la protección si la app está instalada en la pantalla de
 * inicio o si se usa a menudo, y puede denegarla sin explicación. Por eso el estado se muestra
 * en Ajustes en vez de darlo por hecho.
 */

export type EstadoAlmacenamiento = {
  /** El navegador expone la API. */
  soportado: boolean
  /** Los datos están a salvo del desalojo automático. */
  protegido: boolean
  /** Bytes ocupados por el origen, si el navegador los estima. */
  usadoBytes: number | null
}

export async function estadoAlmacenamiento(): Promise<EstadoAlmacenamiento> {
  if (!navigator.storage?.persisted) {
    return { soportado: false, protegido: false, usadoBytes: null }
  }
  try {
    const protegido = await navigator.storage.persisted()
    let usadoBytes: number | null = null
    if (navigator.storage.estimate) {
      const { usage } = await navigator.storage.estimate()
      usadoBytes = usage ?? null
    }
    return { soportado: true, protegido, usadoBytes }
  } catch {
    return { soportado: false, protegido: false, usadoBytes: null }
  }
}

/** Pide la protección. Devuelve si quedó concedida (el navegador puede negarse). */
export async function pedirPersistencia(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  try {
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

/**
 * Se pide una vez al arrancar, sin molestar al usuario: en Chrome no hay diálogo, el navegador
 * concede o deniega según cómo se use la app. Si deniega, Ajustes ofrece reintentarlo.
 */
export function pedirPersistenciaAlArrancar(): void {
  void pedirPersistencia()
}
