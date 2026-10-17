import { useRef, useState } from 'react'
import { marcarTourVisto } from './tour'
import { Confirm } from './ui'
import { importarCopia, type ResumenCopia } from '../lib/backup'

/**
 * Botón "Importar copia" con su selector de archivo, la confirmación y el resultado.
 *
 * El `<input>` no lleva `accept`: Android no reconoce el tipo de un `.sqlite3` y deja el archivo
 * en gris en el selector. La validación real la hace `importarCopia` leyendo el contenido.
 */
export default function ImportBackup(props: {
  label?: string
  className?: string
  /** No hay nada que perder: la confirmación no habla de reemplazar datos. */
  libretaVacia?: boolean
}) {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [importando, setImportando] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const importar = async (file: File) => {
    setArchivo(null)
    setImportando(true)
    setMensaje('Importando…')
    try {
      const resumen = await importarCopia(file)
      // Al reinstalar se pierde también la marca del tour: quien restaura ya conoce la app.
      marcarTourVisto()
      setMensaje(`${describir(resumen)} Recargando…`)
      setTimeout(() => window.location.reload(), 1500)
    } catch (err) {
      setImportando(false)
      setMensaje(`No se pudo importar: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return (
    <>
      <button
        className={props.className ?? 'btn-outline btn-block'}
        disabled={importando}
        onClick={() => input.current?.click()}
      >
        {props.label ?? 'Importar copia'}
      </button>
      <input
        ref={input}
        type="file"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) setArchivo(file)
          e.target.value = ''
        }}
      />
      {mensaje && <p className="small">{mensaje}</p>}

      {archivo && (
        <Confirm
          title="¿Importar esta copia?"
          message={
            props.libretaVacia
              ? `Se restaurarán los datos de "${archivo.name}".`
              : `Se reemplazarán todos los datos actuales por los de "${archivo.name}". Esta acción no se puede deshacer.`
          }
          confirmLabel="Importar"
          onCancel={() => setArchivo(null)}
          onConfirm={() => void importar(archivo)}
        />
      )}
    </>
  )
}

function describir(r: ResumenCopia): string {
  const fecha = (iso: string) => iso.split('-').reverse().join('/')
  const partes = [
    `${r.entrenamientos} ${r.entrenamientos === 1 ? 'entrenamiento' : 'entrenamientos'}`,
    `${r.series} ${r.series === 1 ? 'serie' : 'series'}`,
  ]
  if (r.cardio > 0) partes.push(`${r.cardio} de cardio`)
  const rango = r.desde && r.hasta ? ` (del ${fecha(r.desde)} al ${fecha(r.hasta)})` : ''
  return `Copia restaurada: ${partes.join(', ')}${rango}.`
}
