import { useState } from 'react'
import BarChart from '../components/charts/BarChart'
import LineChart from '../components/charts/LineChart'
import Segmented from '../components/charts/Segmented'
import { Empty, Metric, TopBar } from '../components/ui'
import { exerciseHistory, exerciseProgress, exerciseStats } from '../db/stats'
import { formatRelativeDate, formatShortDate } from '../lib/date'
import { kg, num, plural } from '../lib/format'
import { Link } from '../lib/router'
import { useQuery } from '../lib/useQuery'

export default function ExerciseHistoryScreen({ name }: { name: string }) {
  const { data } = useQuery(async () => {
    const [history, stats, progress] = await Promise.all([
      exerciseHistory(name),
      exerciseStats(name),
      exerciseProgress(name),
    ])
    return { history, stats, progress }
  }, [name])

  if (!data) return <TopBar title={name} onBack />
  const { history, stats, progress } = data

  return (
    <>
      <TopBar title={name} subtitle={`${plural(stats.totalSessions, 'sesión', 'sesiones')} · ${plural(stats.totalSets, 'serie', 'series')}`} onBack />
      <div className="screen">
        {history.length === 0 ? (
          <Empty>Todavía no hay series registradas de este ejercicio.</Empty>
        ) : (
          <>
            <section className="card">
              <div className="metrics">
                <Metric value={stats.bestWeight != null ? `${num(stats.bestWeight)} kg` : '—'} label="Mejor peso" />
                <Metric value={`${num(stats.lastVolume ?? 0, 0)} kg`} label="Último volumen" />
                <Metric value={`${num(stats.bestVolumeDay ?? 0, 0)} kg`} label="Mejor volumen" />
              </div>
            </section>

            {progress.length > 1 && <ProgressChart name={name} progress={progress} />}

            {history.map((day) => (
              <section key={day.session_id} className="card stack-sm">
                <div className="row-between">
                  <Link to={`/historial/sesion/${day.session_id}`}>
                    <strong>{formatRelativeDate(day.date)}</strong>
                  </Link>
                  <span className="muted tiny mono">{num(day.volume, 0)} kg de volumen</span>
                </div>
                <div className="stack-sm">
                  {day.sets.map((set) => (
                    <div key={set.id} className="row mono small">
                      <span className="set-number">{set.set_number}</span>
                      <span>
                        {set.weight_kg != null ? `${num(set.weight_kg)} kg` : '—'} × {set.reps ?? '—'}
                      </span>
                      {set.rir != null && <span className="muted tiny">RIR {set.rir}</span>}
                      {set.notes && <span className="muted tiny">{set.notes}</span>}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </>
        )}
      </div>
    </>
  )
}

/** Peso o volumen por sesión: una gráfica a la vez para no saturar la pantalla. */
function ProgressChart({
  name,
  progress,
}: {
  name: string
  progress: { date: string; bestWeight: number | null; volume: number }[]
}) {
  const [metric, setMetric] = useState<'peso' | 'volumen'>('peso')
  const volume = (value: number) => `${num(value, 0)} kg`

  return (
    <section className="card stack-sm">
      <div className="row-between wrap">
        <div className="section-title">
          {metric === 'peso' ? 'Mejor peso por sesión' : 'Volumen por sesión'}
        </div>
        <Segmented
          label="Serie de la gráfica"
          value={metric}
          onChange={setMetric}
          options={[
            { value: 'peso', label: 'Peso' },
            { value: 'volumen', label: 'Volumen' },
          ]}
        />
      </div>

      {metric === 'peso' ? (
        <LineChart
          title={`${name}: mejor peso por sesión`}
          valueHeader="Mejor peso"
          formatValue={(value) => kg(value)}
          points={progress.map((p) => ({ date: p.date, value: p.bestWeight }))}
        />
      ) : (
        <BarChart
          title={`${name}: volumen por sesión`}
          valueHeader="Volumen"
          formatValue={volume}
          points={progress.map((p) => ({ date: p.date, value: p.volume }))}
        />
      )}

      <p className="muted tiny">
        {formatShortDate(progress[0].date)} → {formatShortDate(progress[progress.length - 1].date)} ·
        {metric === 'peso' ? ' peso más alto de cada sesión' : ' suma de peso × repeticiones'}
      </p>
    </section>
  )
}
