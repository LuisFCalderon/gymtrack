import { useRef, useState } from 'react'
import { Confirm } from './ui'
import { importarRutina, type ResumenRutina } from '../lib/routineFile'
import { invalidate } from '../lib/useQuery'

/**
 * Botón "Importar rutina" con su selector de archivo, la confirmación y el resultado.
 *
 * A diferencia de importar una copia, esto sólo cambia la rutina (no el historial) y no hace falta
 * recargar: basta invalidar las consultas para que la pantalla se refresque.
 */
export default function ImportRoutine(props: { label?: string; className?: string }) {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [importando, setImportando] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const importar = async (file: File) => {
    setArchivo(null)
    setImportando(true)
    setMensaje('Importando…')
    try {
      const resumen = await importarRutina(file)
      invalidate()
      setMensaje(describir(resumen))
    } catch (err) {
      setMensaje(`No se pudo importar: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setImportando(false)
    }
  }

  return (
    <>
      <button
        className={props.className ?? 'btn-outline btn-block'}
        disabled={importando}
        onClick={() => input.current?.click()}
      >
        {props.label ?? 'Importar rutina (.json)'}
      </button>
      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            setMensaje(null)
            setArchivo(file)
          }
          e.target.value = ''
        }}
      />
      {mensaje && <p className="small">{mensaje}</p>}

      {archivo && (
        <Confirm
          title="¿Importar esta rutina?"
          message={`Los días que incluya "${archivo.name}" reemplazarán su plan actual. Tu historial de entrenamientos no se toca.`}
          confirmLabel="Importar"
          onCancel={() => setArchivo(null)}
          onConfirm={() => void importar(archivo)}
        />
      )}
    </>
  )
}

function describir(r: ResumenRutina): string {
  const dias = `${r.dias} ${r.dias === 1 ? 'día' : 'días'}`
  const ejercicios = `${r.ejercicios} ${r.ejercicios === 1 ? 'ejercicio' : 'ejercicios'}`
  return `Rutina importada: ${dias}, ${ejercicios}.`
}
