import { TopBar, Metric, ProgressBar, Empty } from '../components/ui'
import { listCardioByDate } from '../db/cardio'
import { getDayByWeekday, listExercises } from '../db/routine'
import { getSessionByDate, listSessionSets, startSession } from '../db/workouts'
import { getWaterGoal, lastMeasurement, waterTotal } from '../db/wellbeing'
import { WEEKDAY_NAMES } from '../db/types'
import { formatDuration, todayISO, weekdayOf } from '../lib/date'
import { kg, num } from '../lib/format'
import { Link, navigate } from '../lib/router'
import { useQuery } from '../lib/useQuery'

export default function Dashboard() {
  const date = todayISO()
  const weekday = weekdayOf()

  const { data } = useQuery(async () => {
    const day = await getDayByWeekday(weekday)
    const [planned, session, cardio, water, goal, body] = await Promise.all([
      day ? listExercises(day.id) : Promise.resolve([]),
      getSessionByDate(date),
      listCardioByDate(date),
      waterTotal(date),
      getWaterGoal(),
      lastMeasurement(),
    ])
    const sets = session ? await listSessionSets(session.id) : []
    return { day, planned, session, sets, cardio, water, goal, body }
  }, [date, weekday])

  if (!data) return <TopBar title="Hoy" />

  const { day, planned, session, sets, cardio, water, goal, body } = data
  const volume = sets.reduce((total, s) => total + (s.weight_kg ?? 0) * (s.reps ?? 0), 0)
  const exercisesDone = new Set(sets.map((s) => s.session_exercise_id)).size
  const cardioSeconds = cardio.reduce((total, c) => total + (c.duration_seconds ?? 0), 0)
  const isRest = day?.rest_day === 1

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
