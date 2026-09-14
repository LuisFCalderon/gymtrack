import { useRef, useState } from 'react'
import { Confirm, TopBar } from '../components/ui'
import { getDatabaseFile, getDatabaseInfo, overwriteDatabaseFile } from '../db/client'
import { getWaterGoal } from '../db/wellbeing'
import { todayISO } from '../lib/date'
import { num } from '../lib/format'
import { applyTheme, readTheme, type Theme } from '../lib/theme'
import { useQuery } from '../lib/useQuery'

export default function SettingsScreen() {
  const [theme, setTheme] = useState<Theme>(readTheme())
  const [importing, setImporting] = useState<File | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const { data } = useQuery(async () => {
    const [info, goal] = await Promise.all([getDatabaseInfo(), getWaterGoal()])
    return { info, goal }
  }, [])

  const changeTheme = (next: Theme) => {
    setTheme(next)
    applyTheme(next)
  }

  const exportDatabase = async () => {
    const file = await getDatabaseFile()
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = `gymtrack-${todayISO()}.sqlite3`
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const sizeMb = data?.info.databaseSizeBytes ? data.info.databaseSizeBytes / (1024 * 1024) : 0

  return (
    <>
      <TopBar title="Ajustes" />
      <div className="screen">
        <section className="card stack-sm">
          <div className="section-title">Apariencia</div>
          <div className="row">
            <button
              className={`grow ${theme === 'dark' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => changeTheme('dark')}
            >
              Oscuro
            </button>
            <button
              className={`grow ${theme === 'light' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => changeTheme('light')}
            >
              Claro
            </button>
          </div>
        </section>

        <section className="card stack-sm">
          <div className="section-title">Tus datos</div>
          <p className="muted small">
            Todo se guarda en este dispositivo, dentro del almacenamiento privado del navegador. No hay
            cuentas, servidor ni sincronización: si desinstalas la app o borras los datos del navegador,
            se pierden. Exporta de vez en cuando.
          </p>
          <div className="row-between small">
            <span className="muted">Tamaño de la base</span>
            <span className="mono">{sizeMb > 0 ? `${num(sizeMb, 2)} MB` : '—'}</span>
          </div>
          <div className="row-between small">
            <span className="muted">Meta de agua</span>
            <span className="mono">{num(data?.goal ?? 0, 2)} L</span>
          </div>
          <button className="btn-outline btn-block" onClick={exportDatabase}>
            Exportar copia (.sqlite3)
          </button>
          <button className="btn-outline btn-block" onClick={() => fileInput.current?.click()}>
            Importar copia
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".sqlite3,.sqlite,.db"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) setImporting(file)
              e.target.value = ''
            }}
          />
          {message && <p className="small">{message}</p>}
        </section>

        <section className="card stack-sm">
          <div className="section-title">Acerca de</div>
          <p className="muted small">
            Gym Track V2 — libreta digital personal de entrenamiento. Funciona sin conexión y sin cuenta.
            Puedes instalarla desde el menú del navegador ("Agregar a pantalla de inicio").
          </p>
        </section>
      </div>

      {importing && (
        <Confirm
          title="¿Importar esta copia?"
          message={`Se reemplazarán todos los datos actuales por los de "${importing.name}". Esta acción no se puede deshacer.`}
          confirmLabel="Importar"
          onCancel={() => setImporting(null)}
          onConfirm={async () => {
            const file = importing
            setImporting(null)
            try {
              await overwriteDatabaseFile(file)
              setMessage('Copia importada. Recargando…')
              setTimeout(() => window.location.reload(), 600)
            } catch (err) {
              setMessage(`No se pudo importar: ${err instanceof Error ? err.message : String(err)}`)
            }
          }}
        />
      )}
    </>
  )
}
