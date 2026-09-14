import { useState } from 'react'
import { Confirm, Empty, Metric, TopBar } from '../components/ui'
import { deleteSession, getSession, listSessionExercises, listSessionSets } from '../db/workouts'
import { listCardioByDate } from '../db/cardio'
import { formatDuration, formatRelativeDate } from '../lib/date'
import { num } from '../lib/format'
import { Link, navigate } from '../lib/router'
import { mutate, useQuery } from '../lib/useQuery'

export default function SessionDetailScreen({ sessionId }: { sessionId: number }) {
  const [deleting, setDeleting] = useState(false)
  const { data } = useQuery(async () => {
    const session = await getSession(sessionId)
    if (!session) return null
    const [exercises, sets, cardio] = await Promise.all([
      listSessionExercises(sessionId),
      listSessionSets(sessionId),
      listCardioByDate(session.date),
    ])
    return { session, exercises, sets, cardio }
  }, [sessionId])

  if (!data) return <TopBar title="Sesión" onBack />
  const { session, exercises, sets, cardio } = data
  const volume = sets.reduce((total, s) => total + (s.weight_kg ?? 0) * (s.reps ?? 0), 0)

  return (
    <>
      <TopBar
        title={formatRelativeDate(session.date)}
        subtitle={session.date.split('-').reverse().join('/')}
        onBack
        action={
          <button className="btn-sm" onClick={() => navigate(`/entrenar/${session.id}`)}>
            Editar
          </button>
        }
      />
      <div className="screen">
        <section className="card">
          <div className="metrics">
            <Metric value={new Set(sets.map((s) => s.session_exercise_id)).size} label="Ejercicios" />
            <Metric value={sets.length} label="Series" />
            <Metric value={`${num(volume, 0)} kg`} label="Volumen" />
          </div>
          {session.notes && <p className="muted small" style={{ marginTop: 12 }}>{session.notes}</p>}
        </section>

        {sets.length === 0 && <Empty>Esta sesión no tiene series registradas.</Empty>}

        {exercises.map((exercise) => {
          const rows = sets.filter((s) => s.session_exercise_id === exercise.id)
          if (rows.length === 0) return null
          return (
            <section key={exercise.id} className="card stack-sm">
              <div className="row-between">
                <Link to={`/ejercicio/${encodeURIComponent(exercise.name)}`} className="grow">
                  <h2 style={{ fontSize: '1rem' }}>{exercise.name}</h2>
                </Link>
                {exercise.substituted_from && (
                  <span className="chip accent">en lugar de {exercise.substituted_from}</span>
                )}
              </div>
              <table className="sets-table">
                <tbody>
                  {rows.map((set) => (
                    <tr key={set.id}>
                      <td>
                        <span className="set-number">{set.set_number}</span>
                      </td>
                      <td>{set.weight_kg != null ? `${num(set.weight_kg)} kg` : '—'}</td>
                      <td>{set.reps ?? '—'} reps</td>
                      <td className="muted">{set.rir != null ? `RIR ${set.rir}` : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )
        })}

        {cardio.length > 0 && (
          <section className="card stack-sm">
            <div className="section-title">Cardio del día</div>
            {cardio.map((c) => (
              <Link key={c.id} to={`/cardio/${c.id}`} className="row-between">
                <span>{c.type}</span>
                <span className="muted small mono">
                  {formatDuration(c.duration_seconds)}
                  {c.distance_km ? ` · ${num(c.distance_km, 2)} km` : ''}
                </span>
              </Link>
            ))}
          </section>
        )}

        <button className="btn-danger btn-block" onClick={() => setDeleting(true)}>
          Eliminar sesión
        </button>
      </div>

      {deleting && (
        <Confirm
          title="¿Eliminar la sesión?"
          message="Se borrarán todas las series registradas ese día. No se puede deshacer."
          onCancel={() => setDeleting(false)}
          onConfirm={async () => {
            await mutate(() => deleteSession(sessionId))
            navigate('/historial')
          }}
        />
      )}
    </>
  )
}
