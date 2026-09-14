import { useState } from 'react'
import { Empty, TopBar } from '../components/ui'
import { listSessionSummaries } from '../db/workouts'
import { listTrackedExercises } from '../db/stats'
import { formatRelativeDate } from '../lib/date'
import { num, plural } from '../lib/format'
import { Link } from '../lib/router'
import { useQuery } from '../lib/useQuery'

export default function HistoryScreen() {
  const [query, setQuery] = useState('')
  const { data: sessions } = useQuery(() => listSessionSummaries(), [])
  const { data: exercises } = useQuery(() => listTrackedExercises(query), [query])

  return (
    <>
      <TopBar title="Historial" subtitle="Qué hiciste y cuándo" />
      <div className="screen">
        <input
          value={query}
          placeholder="Buscar ejercicio…"
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar ejercicio"
        />

        {query.trim() !== '' && (
          <div className="list">
            {exercises?.length === 0 && <Empty>Sin resultados para “{query}”.</Empty>}
            {exercises?.map((exercise) => (
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
                    {exercise.best_weight != null ? ` · mejor ${num(exercise.best_weight)} kg` : ''}
                  </div>
                </div>
                <span className="arrow">›</span>
              </Link>
            ))}
          </div>
        )}

        {query.trim() === '' && (
          <>
            <div className="section-title">Sesiones</div>
            {sessions?.length === 0 && (
              <Empty>Todavía no hay entrenamientos registrados.</Empty>
            )}
            <div className="list">
              {sessions?.map((session) => (
                <Link key={session.id} to={`/historial/sesion/${session.id}`} className="list-item">
                  <div className="grow">
                    <div className="row" style={{ gap: 8 }}>
                      <strong>{formatRelativeDate(session.date)}</strong>
                      {session.day_name?.trim() && <span className="muted small">{session.day_name}</span>}
                      {!session.ended_at && session.sets > 0 && <span className="chip accent">En curso</span>}
                    </div>
                    <div className="muted tiny">
                      {session.sets === 0
                        ? 'Sin series registradas'
                        : `${plural(session.exercises, 'ejercicio', 'ejercicios')} · ${plural(session.sets, 'serie', 'series')} · ${num(session.volume ?? 0, 0)} kg`}
                    </div>
                  </div>
                  <span className="arrow">›</span>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  )
}
