import { useState } from 'react'
import BarChart from '../components/charts/BarChart'
import Segmented from '../components/charts/Segmented'
import { Empty, Metric, TopBar } from '../components/ui'
import {
  listTrackedExercises,
  personalRecords,
  weeklyTotals,
  weeklyVolumeSeries,
  type WeekVolume,
} from '../db/stats'
import { formatDuration, formatRelativeDate, todayISO } from '../lib/date'
import { num, plural } from '../lib/format'
import { Link } from '../lib/router'
import { useQuery } from '../lib/useQuery'

export default function ProgressScreen() {
  const since = todayISO(new Date(Date.now() - 6 * 86400000))

  const { data } = useQuery(async () => {
    const [week, records, exercises, weeks] = await Promise.all([
      weeklyTotals(since),
      personalRecords(),
      listTrackedExercises(),
      weeklyVolumeSeries(8),
    ])
    return { week, records, exercises, weeks }
  }, [since])

  if (!data) return <TopBar title="Progreso" />
  const { week, records, exercises, weeks } = data

  return (
    <>
      <TopBar title="Progreso" subtitle="Últimos 7 días" />
      <div className="screen">
        <section className="card" data-tour="progreso-semana">
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

        {weeks.some((w) => w.sets > 0) && <WeeklyChart weeks={weeks} />}

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

        <div className="row" style={{ gap: 10 }} data-tour="progreso-modulos">
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

/** Cómo voy en general: volumen (o series) de las últimas ocho semanas. */
function WeeklyChart({ weeks }: { weeks: WeekVolume[] }) {
  const [metric, setMetric] = useState<'volumen' | 'series'>('volumen')

  // La media sólo cuenta las semanas entrenadas: las vacías hundirían el promedio.
  const active = weeks.filter((w) => w.sets > 0)
  const total = active.reduce((acc, w) => acc + (metric === 'volumen' ? w.volume : w.sets), 0)
  const average = active.length > 0 ? total / active.length : 0
  const averageLabel =
    metric === 'volumen' ? `${num(average, 0)} kg` : plural(Math.round(average), 'serie', 'series')

  return (
    <section className="card stack-sm" data-tour="progreso-graficas">
      <div className="row-between wrap">
        <div className="section-title">
          {metric === 'volumen' ? 'Volumen por semana' : 'Series por semana'}
        </div>
        <Segmented
          label="Serie de la gráfica"
          value={metric}
          onChange={setMetric}
          options={[
            { value: 'volumen', label: 'Volumen' },
            { value: 'series', label: 'Series' },
          ]}
        />
      </div>

      {metric === 'volumen' ? (
        <BarChart
          title="Volumen por semana, últimas 8 semanas"
          valueHeader="Volumen"
          formatValue={(value) => `${num(value, 0)} kg`}
          points={weeks.map((w) => ({ date: w.weekStart, value: w.volume }))}
        />
      ) : (
        <BarChart
          title="Series por semana, últimas 8 semanas"
          valueHeader="Series"
          formatValue={(value) => plural(value, 'serie', 'series')}
          formatTick={(value) => num(value, 0)}
          points={weeks.map((w) => ({ date: w.weekStart, value: w.sets }))}
        />
      )}

      <p className="muted tiny">
        Cada barra es una semana de lunes a domingo
        {average > 0 ? ` · media de ${averageLabel} por semana entrenada` : ''}.
      </p>
    </section>
  )
}
