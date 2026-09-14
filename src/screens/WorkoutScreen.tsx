import { useEffect, useState } from 'react'
import ExerciseNameField from '../components/ExerciseNameField'
import { Confirm, Empty, Sheet, TopBar } from '../components/ui'
import {
  addSessionExercise,
  addSet,
  deleteSet,
  finishSession,
  getSession,
  lastPerformance,
  listSessionExercises,
  listSessionSets,
  removeSessionExercise,
  setSessionNotes,
  startSession,
  substituteExercise,
  updateSet,
  type SubstitutionScope,
} from '../db/workouts'
import { getDayByWeekday } from '../db/routine'
import type { SessionExercise, WorkoutSet } from '../db/types'
import { formatRelativeDate, todayISO, weekdayOf } from '../lib/date'
import { num, parseInteger, parseNumber, plural } from '../lib/format'
import { iniciarDescanso, saltarDescanso } from '../lib/restTimer'
import { Link, navigate } from '../lib/router'
import { mutate, useQuery } from '../lib/useQuery'

export default function WorkoutScreen({ sessionId }: { sessionId: number | null }) {
  useEffect(() => {
    if (sessionId == null) startSession().then((id) => navigate(`/entrenar/${id}`, true))
  }, [sessionId])

  const { data } = useQuery(async () => {
    if (sessionId == null) return null
    const session = await getSession(sessionId)
    if (!session) return null
    const [exercises, sets, day] = await Promise.all([
      listSessionExercises(sessionId),
      listSessionSets(sessionId),
      session.day_id != null ? getDayByWeekday(weekdayOf(new Date(`${session.date}T12:00:00`))) : null,
    ])
    return { session, exercises, sets, day }
  }, [sessionId])

  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [notesOpen, setNotesOpen] = useState(false)
  const [notes, setNotes] = useState('')
  const [finishing, setFinishing] = useState(false)

  useEffect(() => {
    if (data?.session) setNotes(data.session.notes ?? '')
  }, [data?.session])

  if (!data) return <TopBar title="Entrenamiento" onBack />
  const { session, exercises, sets, day } = data
  const setsByExercise = new Map<number, WorkoutSet[]>()
  for (const set of sets) {
    if (set.session_exercise_id == null) continue
    const list = setsByExercise.get(set.session_exercise_id) ?? []
    list.push(set)
    setsByExercise.set(set.session_exercise_id, list)
  }

  const totalVolume = sets.reduce((total, s) => total + (s.weight_kg ?? 0) * (s.reps ?? 0), 0)
  const isToday = session.date === todayISO()

  return (
    <>
      <TopBar
        title={day?.name?.trim() || 'Entrenamiento'}
        subtitle={`${formatRelativeDate(session.date)} · ${plural(sets.length, 'serie', 'series')} · ${num(totalVolume, 0)} kg`}
        onBack
        action={
          <button className="btn-sm" onClick={() => setNotesOpen(true)}>
            Notas
          </button>
        }
      />
      <div className="screen">
        {!isToday && (
          <div className="chip" style={{ alignSelf: 'flex-start' }}>
            Editando una sesión anterior
          </div>
        )}

        {exercises.length === 0 && <Empty>Este día no tiene ejercicios. Agrega uno abajo.</Empty>}

        {exercises.map((exercise) => (
          <ExerciseCard
            key={exercise.id}
            sessionId={session.id}
            exercise={exercise}
            sets={setsByExercise.get(exercise.id) ?? []}
            descansa={isToday}
          />
        ))}

        <button className="btn-outline btn-block" onClick={() => setAdding(true)}>
          + Agregar ejercicio a esta sesión
        </button>

        {sets.length > 0 && (
          <button className="btn-primary btn-block btn-lg" onClick={() => setFinishing(true)}>
            {session.ended_at ? 'Entrenamiento guardado' : 'Terminar entrenamiento'}
          </button>
        )}
      </div>

      {adding && (
        <Sheet title="Agregar ejercicio" onClose={() => setAdding(false)}>
          <p className="muted small">Se agrega sólo a esta sesión; la rutina no cambia.</p>
          <ExerciseNameField value={newName} onChange={setNewName} autoFocus />
          <button
            className="btn-primary btn-block btn-lg"
            disabled={!newName.trim()}
            onClick={async () => {
              await mutate(() => addSessionExercise(session.id, newName.trim()))
              setNewName('')
              setAdding(false)
            }}
          >
            Agregar
          </button>
        </Sheet>
      )}

      {notesOpen && (
        <Sheet title="Notas de la sesión" onClose={() => setNotesOpen(false)}>
          <textarea
            autoFocus
            value={notes}
            placeholder="Buen día, sin molestias en el hombro…"
            onChange={(e) => setNotes(e.target.value)}
          />
          <button
            className="btn-primary btn-block"
            onClick={async () => {
              await mutate(() => setSessionNotes(session.id, notes.trim()))
              setNotesOpen(false)
            }}
          >
            Guardar
          </button>
        </Sheet>
      )}

      {finishing && (
        <Confirm
          title="¿Terminar entrenamiento?"
          message="Podrás seguir editándolo desde el historial."
          confirmLabel="Terminar"
          onCancel={() => setFinishing(false)}
          onConfirm={async () => {
            await mutate(() => finishSession(session.id))
            saltarDescanso()
            setFinishing(false)
            navigate('/')
          }}
        />
      )}
    </>
  )
}

function ExerciseCard({
  sessionId,
  exercise,
  sets,
  descansa,
}: {
  sessionId: number
  exercise: SessionExercise
  sets: WorkoutSet[]
  /** Sólo se cronometra el descanso cuando se entrena hoy, no al editar una sesión pasada. */
  descansa: boolean
}) {
  const { data: previous } = useQuery(
    () => lastPerformance(exercise.name, sessionId),
    [exercise.name, sessionId],
  )

  const [menuOpen, setMenuOpen] = useState(false)
  const [substituting, setSubstituting] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [editingSet, setEditingSet] = useState<WorkoutSet | null>(null)

  const lastSet = sets[sets.length - 1]
  const previousSet = previous?.sets[sets.length] ?? previous?.sets[previous.sets.length - 1]
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [rir, setRir] = useState('')

  const suggestedWeight = lastSet?.weight_kg ?? previousSet?.weight_kg ?? null
  const suggestedReps = lastSet?.reps ?? previousSet?.reps ?? null

  const target = [
    exercise.target_sets ? `${exercise.target_sets} series` : null,
    exercise.target_reps ? `${exercise.target_reps} reps` : null,
  ]
    .filter(Boolean)
    .join(' × ')

  const submit = async () => {
    const weightValue = parseNumber(weight) ?? suggestedWeight
    const repsValue = parseInteger(reps) ?? suggestedReps
    if (weightValue == null && repsValue == null) return
    await mutate(() =>
      addSet(sessionId, exercise, {
        weight_kg: weightValue,
        reps: repsValue,
        rir: parseInteger(rir),
        notes: null,
      }),
    )
    setWeight('')
    setReps('')
    setRir('')
    // La serie queda registrada: aquí empieza el descanso de verdad.
    if (descansa) void iniciarDescanso()
  }

  return (
    <section className="card stack-sm">
      <div className="row-between">
        <div className="grow">
          <div className="row" style={{ gap: 8 }}>
            <h2 style={{ fontSize: '1rem' }}>{exercise.name}</h2>
            {exercise.substituted_from && <span className="chip accent">Sustituido</span>}
          </div>
          <div className="muted tiny">
            {exercise.substituted_from ? `En lugar de ${exercise.substituted_from}` : target}
          </div>
        </div>
        <button className="btn-icon" onClick={() => setMenuOpen(true)} aria-label="Opciones">
          ⋯
        </button>
      </div>

      {sets.length > 0 && (
        <table className="sets-table">
          <thead>
            <tr>
              <th>Serie</th>
              <th>Peso</th>
              <th>Reps</th>
              <th>RIR</th>
            </tr>
          </thead>
          <tbody>
            {sets.map((set) => (
              <tr key={set.id} onClick={() => setEditingSet(set)} style={{ cursor: 'pointer' }}>
                <td>
                  <span className="set-number">{set.set_number}</span>
                </td>
                <td>{set.weight_kg != null ? `${num(set.weight_kg)} kg` : '—'}</td>
                <td>{set.reps ?? '—'}</td>
                <td className="muted">{set.rir ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="row" style={{ gap: 8 }}>
        <input
          className="mono"
          inputMode="decimal"
          placeholder={suggestedWeight != null ? num(suggestedWeight) : 'Peso'}
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          aria-label="Peso"
        />
        <input
          className="mono"
          inputMode="numeric"
          placeholder={suggestedReps != null ? String(suggestedReps) : 'Reps'}
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          aria-label="Repeticiones"
        />
        <input
          className="mono"
          inputMode="numeric"
          placeholder="RIR"
          value={rir}
          style={{ maxWidth: 74 }}
          onChange={(e) => setRir(e.target.value)}
          aria-label="RIR"
        />
        <button className="btn-primary" onClick={submit} aria-label="Agregar serie">
          +
        </button>
      </div>

      {previous && (
        <Link to={`/ejercicio/${encodeURIComponent(exercise.name)}`} className="muted tiny">
          {formatRelativeDate(previous.date)}:{' '}
          {previous.sets
            .map((s) => `${s.weight_kg != null ? num(s.weight_kg) : '—'} × ${s.reps ?? '—'}`)
            .join(' · ')}
        </Link>
      )}

      {menuOpen && (
        <Sheet title={exercise.name} onClose={() => setMenuOpen(false)}>
          <button
            className="btn-block"
            onClick={() => {
              setMenuOpen(false)
              setSubstituting(true)
            }}
          >
            Sustituir ejercicio
          </button>
          <Link to={`/ejercicio/${encodeURIComponent(exercise.name)}`} className="btn-block">
            <button className="btn-block btn-outline">Ver historial</button>
          </Link>
          <button
            className="btn-danger btn-block"
            onClick={() => {
              setMenuOpen(false)
              setRemoving(true)
            }}
          >
            Quitar de esta sesión
          </button>
        </Sheet>
      )}

      {substituting && (
        <SubstituteSheet
          exercise={exercise}
          hasRoutineLink={exercise.routine_exercise_id != null}
          onClose={() => setSubstituting(false)}
        />
      )}

      {removing && (
        <Confirm
          title="¿Quitar de la sesión?"
          message={
            sets.length > 0
              ? `Se borrarán las ${sets.length} series registradas de ${exercise.name} en esta sesión.`
              : 'La rutina no se modifica.'
          }
          confirmLabel="Quitar"
          onCancel={() => setRemoving(false)}
          onConfirm={async () => {
            await mutate(() => removeSessionExercise(exercise.id))
            setRemoving(false)
          }}
        />
      )}

      {editingSet && (
        <SetSheet set={editingSet} onClose={() => setEditingSet(null)} />
      )}
    </section>
  )
}

function SubstituteSheet(props: {
  exercise: SessionExercise
  hasRoutineLink: boolean
  onClose: () => void
}) {
  const [name, setName] = useState('')

  const apply = async (scope: SubstitutionScope) => {
    await mutate(() => substituteExercise(props.exercise, name.trim(), scope))
    props.onClose()
  }

  return (
    <Sheet title={`Sustituir ${props.exercise.name}`} onClose={props.onClose}>
      <ExerciseNameField
        value={name}
        onChange={setName}
        label="Nuevo ejercicio"
        placeholder="Hack Squat"
        autoFocus
      />
      <div className="stack-sm">
        <button className="btn-primary btn-block btn-lg" disabled={!name.trim()} onClick={() => apply('today')}>
          Solo hoy
        </button>
        <p className="muted tiny">
          El cambio se aplica a este entrenamiento. La rutina se mantiene como está.
        </p>
      </div>
      {props.hasRoutineLink && (
        <div className="stack-sm">
          <button className="btn-outline btn-block btn-lg" disabled={!name.trim()} onClick={() => apply('routine')}>
            Actualizar rutina
          </button>
          <p className="muted tiny">
            {props.exercise.name} se reemplaza también en la rutina habitual de este día.
          </p>
        </div>
      )}
    </Sheet>
  )
}

function SetSheet({ set, onClose }: { set: WorkoutSet; onClose: () => void }) {
  const [weight, setWeight] = useState(set.weight_kg?.toString().replace('.', ',') ?? '')
  const [reps, setReps] = useState(set.reps?.toString() ?? '')
  const [rir, setRir] = useState(set.rir?.toString() ?? '')
  const [notes, setNotes] = useState(set.notes ?? '')
  const [confirming, setConfirming] = useState(false)

  if (confirming) {
    return (
      <Confirm
        title={`¿Eliminar serie ${set.set_number}?`}
        onCancel={() => setConfirming(false)}
        onConfirm={async () => {
          await mutate(() => deleteSet(set))
          onClose()
        }}
      />
    )
  }

  return (
    <Sheet title={`Serie ${set.set_number} · ${set.exercise_name}`} onClose={onClose}>
      <div className="field-grid three">
        <label>
          Peso (kg)
          <input className="mono" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
        </label>
        <label>
          Reps
          <input className="mono" inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} />
        </label>
        <label>
          RIR
          <input className="mono" inputMode="numeric" value={rir} onChange={(e) => setRir(e.target.value)} />
        </label>
      </div>
      <label>
        Nota
        <input value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <button
        className="btn-primary btn-block btn-lg"
        onClick={async () => {
          await mutate(() =>
            updateSet(set.id, {
              weight_kg: parseNumber(weight),
              reps: parseInteger(reps),
              rir: parseInteger(rir),
              notes: notes.trim() || null,
            }),
          )
          onClose()
        }}
      >
        Guardar
      </button>
      <button className="btn-danger btn-block" onClick={() => setConfirming(true)}>
        Eliminar serie
      </button>
    </Sheet>
  )
}
