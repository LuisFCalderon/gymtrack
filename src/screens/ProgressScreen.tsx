import { Empty, Metric, TopBar } from '../components/ui'
import { listTrackedExercises, personalRecords, weeklyTotals } from '../db/stats'
import { formatDuration, formatRelativeDate, todayISO } from '../lib/date'
import { num, plural } from '../lib/format'
import { Link } from '../lib/router'
import { useQuery } from '../lib/useQuery'

export default function ProgressScreen() {
  const since = todayISO(new Date(Date.now() - 6 * 86400000))

  const { data } = useQuery(async () => {
    const [week, records, exercises] = await Promise.all([
      weeklyTotals(since),
      personalRecords(),
      listTrackedExercises(),
    ])
    return { week, records, exercises }
  }, [since])

  if (!data) return <TopBar title="Progreso" />
  const { week, records, exercises } = data

  return (
    <>
      <TopBar title="Progreso" subtitle="Últimos 7 días" />
      <div className="screen">
        <section className="card">
          <div className="metrics">
            <Metric value={week.sessions} label="Sesiones" />
            <Metric value={week.sets} label="Series" />
            <Metric value={`${num(week.volume, 0)} kg`} label="Volumen" />
            <Metric value={formatDuration(week.cardioSeconds)} label="Cardio" />
          </div>
          <p className="muted tiny" style={{ marginTop: 10 }}>
            Volumen = suma de peso × repeticiones de cada serie.
          </p>
        </section>

        {records.length > 0 && (
          <>
            <div className="section-title">Mejores pesos</div>
            <section className="card stack-sm">
              {records.map((record) => (
                <Link
                  key={record.name}
                  to={`/ejercicio/${encodeURIComponent(record.name)}`}
                  className="row-between"
                >
                  <span className="grow">{record.name}</span>
                  <span className="mono">
                    {num(record.weight)} kg{record.reps ? ` × ${record.reps}` : ''}
                  </span>
                  <span className="muted tiny">{formatRelativeDate(record.date)}</span>
                </Link>
              ))}
            </section>
          </>
        )}

        <div className="section-title">Ejercicios registrados</div>
        {exercises.length === 0 ? (
          <Empty>Registra tu primer entrenamiento para ver tu progreso aquí.</Empty>
        ) : (
          <div className="list">
            {exercises.map((exercise) => (
              <Link
                key={exercise.name}
                to={`/ejercicio/${encodeURIComponent(exercise.name)}`}
                className="list-item"
              >
                <div className="grow">
                  <div>{exercise.name}</div>
                  <div className="muted tiny">
                    {plural(exercise.sessions, 'sesión', 'sesiones')} · última{' '}
                    {formatRelativeDate(exercise.last_date)}
                  </div>
                </div>
                <span className="arrow">›</span>
              </Link>
            ))}
          </div>
        )}

        <div className="row" style={{ gap: 10 }}>
          <Link to="/cardio" className="grow">
            <button className="btn-outline btn-block">Cardio</button>
          </Link>
          <Link to="/agua" className="grow">
            <button className="btn-outline btn-block">Agua</button>
          </Link>
          <Link to="/peso" className="grow">
            <button className="btn-outline btn-block">Peso</button>
          </Link>
        </div>
      </div>
    </>
  )
}
