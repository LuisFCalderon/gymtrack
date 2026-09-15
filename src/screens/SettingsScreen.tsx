import { useRef, useState } from 'react'
import { abrirTour } from '../components/tour'
import { Confirm, Sheet, TopBar } from '../components/ui'
import { getDatabaseFile, getDatabaseInfo, overwriteDatabaseFile } from '../db/client'
import {
  SETTINGS,
  getRestAlert,
  getRestSeconds,
  getSetting,
  getWaterGoal,
  lastMeasurement,
  setSetting,
} from '../db/wellbeing'
import { todayISO } from '../lib/date'
import { bmi, bmiLabel, num, parseNumber } from '../lib/format'
import { appInstalada, instalarApp, useInstalacionDisponible } from '../lib/install'
import { formatoDescanso, invalidarAjustesDescanso } from '../lib/restTimer'
import { applyTheme, readTheme, type Theme } from '../lib/theme'
import { estadoAlmacenamiento, pedirPersistencia } from '../lib/storage'
import { mutate, useQuery } from '../lib/useQuery'

/** Duraciones de descanso ofrecidas, en segundos. */
const REST_OPTIONS = [45, 60, 90, 120, 180]

export default function SettingsScreen() {
  const [theme, setTheme] = useState<Theme>(readTheme())
  const [importing, setImporting] = useState<File | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [installed, setInstalled] = useState(appInstalada())
  const [installMessage, setInstallMessage] = useState<string | null>(null)
  const canInstall = useInstalacionDisponible()
  const fileInput = useRef<HTMLInputElement>(null)
  const [editando, setEditando] = useState<'altura' | 'agua' | null>(null)

  const { data, reload } = useQuery(async () => {
    const [info, goal, restSeconds, restAlert, almacenamiento, alturaRaw, ultimaMedida] =
      await Promise.all([
        getDatabaseInfo(),
        getWaterGoal(),
        getRestSeconds(),
        getRestAlert(),
        estadoAlmacenamiento(),
        getSetting(SETTINGS.heightCm),
        lastMeasurement(),
      ])
    const altura = alturaRaw ? Number(alturaRaw) : (ultimaMedida?.height_cm ?? null)
    return { info, goal, restSeconds, restAlert, almacenamiento, altura, ultimaMedida }
  }, [])

  const saveRest = async (key: string, value: string) => {
    await mutate(() => setSetting(key, value))
    invalidarAjustesDescanso()
  }

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

  const install = async () => {
    const result = await instalarApp()
    if (result === 'aceptada') setInstalled(true)
    else if (result === 'rechazada') setInstallMessage('Instalación cancelada.')
    else setInstallMessage('Este navegador no ofreció instalarla; hazlo desde su menú.')
  }

  const sizeMb = data?.info.databaseSizeBytes ? data.info.databaseSizeBytes / (1024 * 1024) : 0
  // Se recalcula con la altura actual: la del historial refleja la que había ese día.
  const peso = data?.ultimaMedida?.weight_kg ?? null
  const imcActual = peso != null && data?.altura ? bmi(peso, data.altura) : null

  return (
    <>
      <TopBar title="Ajustes" />
      <div className="screen">
        <section className="card stack-sm" data-tour="ajustes-perfil">
          <div className="section-title">Perfil</div>
          <p className="muted tiny">
            Los dos datos personales que la app usa para calcular. No son una cuenta: viven en este
            dispositivo como el resto.
          </p>
          <button className="row-between btn-ghost" style={{ padding: '6px 0' }} onClick={() => setEditando('altura')}>
            <span className="muted small">Altura</span>
            <span className="row" style={{ gap: 6 }}>
              <span className="mono">{data?.altura ? `${num(data.altura, 0)} cm` : 'Sin definir'}</span>
              <span className="arrow">›</span>
            </span>
          </button>
          <button className="row-between btn-ghost" style={{ padding: '6px 0' }} onClick={() => setEditando('agua')}>
            <span className="muted small">Meta de agua</span>
            <span className="row" style={{ gap: 6 }}>
              <span className="mono">{num(data?.goal ?? 0, 2)} L</span>
              <span className="arrow">›</span>
            </span>
          </button>
          <div className="row-between small">
            <span className="muted">IMC actual</span>
            <span className="mono">{imcActual != null ? `${num(imcActual, 1)} · ${bmiLabel(imcActual)}` : '—'}</span>
          </div>
          {imcActual == null && (
            <p className="muted tiny">
              Registra tu altura y tu peso para verlo. Es sólo una referencia general, no un
              diagnóstico.
            </p>
          )}
        </section>

        <section className="card stack-sm" data-tour="ajustes-apariencia">
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

        <section className="card stack-sm" data-tour="ajustes-descanso">
          <div className="section-title">Descanso entre series</div>
          <p className="muted small">
            El temporizador arranca solo al registrar una serie y se queda encima de la navegación.
          </p>
          <div className="row wrap">
            {REST_OPTIONS.map((seconds) => (
              <button
                key={seconds}
                className={`grow mono ${data?.restSeconds === seconds ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => saveRest(SETTINGS.restSeconds, String(seconds))}
              >
                {formatoDescanso(seconds)}
              </button>
            ))}
          </div>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={data?.restAlert ?? true}
              onChange={(e) => saveRest(SETTINGS.restAlert, e.target.checked ? '1' : '0')}
            />
            Avisar al terminar (pitido y vibración)
          </label>
        </section>

        <section className="card stack-sm" data-tour="ajustes-datos">
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
          {data?.almacenamiento.soportado && (
            <>
              <div className="row-between small">
                <span className="muted">Protección frente a borrado</span>
                <span className={`chip${data.almacenamiento.protegido ? ' ok' : ''}`}>
                  {data.almacenamiento.protegido ? 'Protegidos' : 'Sin proteger'}
                </span>
              </div>
              {!data.almacenamiento.protegido && (
                <>
                  <p className="muted tiny">
                    El navegador puede borrar estos datos si al dispositivo le falta espacio. Instalar
                    la app en la pantalla de inicio suele bastar para que los proteja.
                  </p>
                  <button
                    className="btn-outline btn-block btn-sm"
                    onClick={async () => {
                      const concedido = await pedirPersistencia()
                      setMessage(
                        concedido
                          ? 'Listo: tus datos quedaron protegidos.'
                          : 'El navegador no lo concedió todavía. Suele concederlo al instalar la app o tras usarla unos días.',
                      )
                      reload()
                    }}
                  >
                    Proteger mis datos
                  </button>
                </>
              )}
            </>
          )}
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

        {!installed && (
          <section className="card stack-sm">
            <div className="section-title">Instalar</div>
            {canInstall ? (
              <>
                <p className="muted small">
                  Queda en la pantalla de inicio, se abre a pantalla completa y funciona sin conexión.
                </p>
                <button className="btn-primary btn-block" onClick={install}>
                  Instalar app
                </button>
              </>
            ) : (
              <p className="muted small">
                Tu navegador no ofrece el botón, pero puedes instalarla a mano: en Android, menú de
                Chrome → "Añadir a pantalla de inicio"; en escritorio, el icono de instalar de la
                barra de direcciones.
              </p>
            )}
            {installMessage && <p className="small">{installMessage}</p>}
          </section>
        )}

        <section className="card stack-sm">
          <div className="section-title">Guía</div>
          <p className="muted small">Un repaso rápido por cada sección de la app.</p>
          <button className="btn-outline btn-block" data-tour="ajustes-guia" onClick={() => void abrirTour()}>
            Ver la guía otra vez
          </button>
        </section>

        <section className="card stack-sm">
          <div className="section-title">Acerca de</div>
          <p className="muted small">
            Gym Track V2 — libreta digital personal de entrenamiento. Funciona sin conexión y sin cuenta.
          </p>
        </section>
      </div>

      {editando && (
        <CampoSheet
          campo={editando}
          valor={editando === 'altura' ? (data?.altura ?? null) : (data?.goal ?? null)}
          onClose={() => setEditando(null)}
        />
      )}

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

/** Edita una de las dos constantes del perfil. Un solo campo por hoja: teclado grande y al grano. */
function CampoSheet({
  campo,
  valor,
  onClose,
}: {
  campo: 'altura' | 'agua'
  valor: number | null
  onClose: () => void
}) {
  const esAltura = campo === 'altura'
  const [texto, setTexto] = useState(valor != null ? num(valor, esAltura ? 0 : 2) : '')
  const parsed = parseNumber(texto)

  return (
    <Sheet title={esAltura ? 'Altura' : 'Meta de agua'} onClose={onClose}>
      <label>
        {esAltura ? 'Centímetros' : 'Litros por día'}
        <input
          className="mono"
          autoFocus
          inputMode="decimal"
          placeholder={esAltura ? '175' : '2,5'}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
      </label>
      <p className="muted tiny">
        {esAltura
          ? 'Se usa para calcular el IMC. Cambiarla no reescribe el IMC ya guardado en el historial.'
          : 'Es el objetivo diario que verás en Hoy y en la pantalla de Agua.'}
      </p>
      <button
        className="btn-primary btn-block btn-lg"
        disabled={parsed == null || parsed <= 0}
        onClick={async () => {
          if (parsed == null || parsed <= 0) return
          await mutate(() =>
            setSetting(esAltura ? SETTINGS.heightCm : SETTINGS.waterGoal, String(parsed)),
          )
          onClose()
        }}
      >
        Guardar
      </button>
    </Sheet>
  )
}
