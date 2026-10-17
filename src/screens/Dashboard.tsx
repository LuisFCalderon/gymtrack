import ImportBackup from '../components/ImportBackup'
import { TopBar, Metric, ProgressBar, Empty } from '../components/ui'
import { listCardioByDate } from '../db/cardio'
import { getDayByWeekday, listExercises } from '../db/routine'
import { getSessionByDate, listSessionSets, startSession } from '../db/workouts'
import { getWaterGoal, lastMeasurement, waterTotal } from '../db/wellbeing'
import { WEEKDAY_NAMES } from '../db/types'
import {
  compartirCopia,
  copiaPendiente,
  exportarCopia,
  libretaVacia,
  omitirCopiaHoy,
  puedeCompartir,
} from '../lib/backup'
import { formatDuration, todayISO, weekdayOf } from '../lib/date'
import { kg, num } from '../lib/format'
import { Link, navigate } from '../lib/router'
import { mutate, useQuery } from '../lib/useQuery'

export default function Dashboard() {
  const date = todayISO()
  const weekday = weekdayOf()

  const { data } = useQuery(async () => {
    const day = await getDayByWeekday(weekday)
    const [planned, session, cardio, water, goal, body, vacia, pendiente] = await Promise.all([
      day ? listExercises(day.id) : Promise.resolve([]),
      getSessionByDate(date),
      listCardioByDate(date),
      waterTotal(date),
      getWaterGoal(),
      lastMeasurement(),
      libretaVacia(),
      copiaPendiente(),
    ])
    const sets = session ? await listSessionSets(session.id) : []
    return { day, planned, session, sets, cardio, water, goal, body, vacia, pendiente }
  }, [date, weekday])

  if (!data) return <TopBar title="Hoy" />

  const { day, planned, session, sets, cardio, water, goal, body, vacia, pendiente } = data
  const volume = sets.reduce((total, s) => total + (s.weight_kg ?? 0) * (s.reps ?? 0), 0)
  const exercisesDone = new Set(sets.map((s) => s.session_exercise_id)).size
  const cardioSeconds = cardio.reduce((total, c) => total + (c.duration_seconds ?? 0), 0)
  const isRest = day?.rest_day === 1
  const compartible = puedeCompartir()

  const open = async () => {
    const id = await startSession(date)
    navigate(`/entrenar/${id}`)
  }

  return (
    <>
      <TopBar
        title="Hoy"
        subtitle={`${WEEKDAY_NAMES[weekday]} · ${date.split('-').reverse().join('/')}`}
      />
      <div className="screen">
        {/* Instalación vacía: quien reinstala la app tiene a mano cómo recuperar su libreta. */}
        {vacia && (
          <section className="card stack-sm">
            <div className="section-title">¿Ya usabas Gym Track?</div>
            <p className="muted small">
              Si exportaste una copia antes de desinstalar la app o cambiar de teléfono, impórtala
              aquí y recuperarás tu rutina y tu historial.
            </p>
            <ImportBackup label="Restaurar copia" className="btn-primary btn-block" libretaVacia />
          </section>
        )}

        {/* Copia del día: sólo si hay datos nuevos desde la última, y como mucho una vez al día. */}
        {pendiente && (
          <section className="card stack-sm">
            <div className="section-title">Copia de seguridad</div>
            <p className="muted small">
              Tienes datos nuevos sin copiar. Descarga la copia de hoy para no perderlos si
              desinstalas la app o cambias de teléfono.
            </p>
            {compartible ? (
              <>
                <button className="btn-primary btn-block" onClick={() => void mutate(compartirCopia)}>
                  Guardar en Drive, WhatsApp…
                </button>
                <div className="row">
                  <button className="grow btn-outline" onClick={() => void mutate(exportarCopia)}>
                    Descargar
                  </button>
                  <button className="grow btn-ghost" onClick={() => void mutate(omitirCopiaHoy)}>
                    Hoy no
                  </button>
                </div>
              </>
            ) : (
              <div className="row">
                <button className="grow btn-outline" onClick={() => void mutate(omitirCopiaHoy)}>
                  Hoy no
                </button>
                <button className="grow btn-primary" onClick={() => void mutate(exportarCopia)}>
                  Descargar copia
                </button>
              </div>
            )}
          </section>
        )}

        <section className="card" data-tour="hoy-resumen">
          <div className="row-between">
            <div className="grow">
              <div className="section-title">Entrenamiento</div>
              <h2 style={{ marginTop: 2 }}>
                {isRest ? 'Día de descanso' : day?.name?.trim() || WEEKDAY_NAMES[weekday]}
              </h2>
            </div>
            <Link to={`/rutina/${weekday}`} className="chip">
              Editar rutina
            </Link>
          </div>

          {sets.length > 0 ? (
            <div className="metrics" style={{ marginTop: 14 }}>
              <Metric value={exercisesDone} label="Ejercicios" />
              <Metric value={sets.length} label="Series" />
              <Metric value={`${num(volume, 0)} kg`} label="Volumen" />
            </div>
          ) : (
            <p className="muted small" style={{ marginTop: 10 }}>
              {planned.length > 0
                ? `${planned.length} ${planned.length === 1 ? 'ejercicio planificado' : 'ejercicios planificados'}`
                : isRest
                  ? 'Sin ejercicios: hoy toca descansar.'
                  : 'Aún no hay ejercicios configurados para hoy.'}
            </p>
          )}

          <button
            className="btn-primary btn-block btn-lg"
            style={{ marginTop: 14 }}
            onClick={open}
            data-tour="hoy-iniciar"
          >
            {sets.length > 0 || session ? 'Continuar entrenamiento' : 'Iniciar entrenamiento'}
          </button>
        </section>

        <section className="card">
          <div className="row-between">
            <div className="section-title">Agua</div>
            <Link to="/agua" className="chip">
              Registrar
            </Link>
          </div>
          <div className="row-between" style={{ margin: '8px 0 8px' }}>
            <div className="metric">
              <div className="value">
                {num(water, 2)} <span className="muted small">/ {num(goal, 2)} L</span>
              </div>
            </div>
            <div className="chip accent mono">{Math.round(goal > 0 ? (water / goal) * 100 : 0)} %</div>
          </div>
          <ProgressBar value={water} max={goal} />
        </section>

        <section className="card">
          <div className="row-between">
            <div className="section-title">Cardio</div>
            <Link to="/cardio" className="chip">
              Registrar
            </Link>
          </div>
          {cardio.length === 0 ? (
            <p className="muted small" style={{ marginTop: 8 }}>
              Sin cardio registrado hoy.
            </p>
          ) : (
            <div className="stack-sm" style={{ marginTop: 10 }}>
              <div className="row wrap">
                <span className="metric">
                  <span className="value">{formatDuration(cardioSeconds)}</span>
                </span>
                {cardio.map((c) => (
                  <span key={c.id} className="chip">
                    {c.type}
                    {c.distance_km ? ` · ${num(c.distance_km, 2)} km` : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="card">
          <div className="row-between">
            <div className="section-title">Peso corporal</div>
            <Link to="/peso" className="chip">
              Registrar
            </Link>
          </div>
          {body ? (
            <div className="row-between" style={{ marginTop: 8 }}>
              <div className="metric">
                <div className="value">{kg(body.weight_kg)}</div>
                <div className="label">{body.date.split('-').reverse().join('/')}</div>
              </div>
              {body.bmi != null && <span className="chip mono">IMC {num(body.bmi, 1)}</span>}
            </div>
          ) : (
            <p className="muted small" style={{ marginTop: 8 }}>
              Aún no has registrado tu peso.
            </p>
          )}
        </section>

        {planned.length === 0 && !isRest && (
          <Empty>
            Configura los ejercicios de {WEEKDAY_NAMES[weekday].toLowerCase()} en{' '}
            <Link to={`/rutina/${weekday}`}>tu rutina</Link>.
          </Empty>
        )}
      </div>
    </>
  )
}
