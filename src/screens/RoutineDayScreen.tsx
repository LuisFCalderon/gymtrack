import { useEffect, useState } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import ExerciseNameField from '../components/ExerciseNameField'
import { Confirm, Empty, Sheet, TopBar } from '../components/ui'
import {
  addExercise,
  deleteExercise,
  getDayByWeekday,
  listExercises,
  reorderExercises,
  updateDay,
  updateExercise,
  type ExerciseInput,
} from '../db/routine'
import { WEEKDAY_NAMES, type RoutineExercise } from '../db/types'
import { parseInteger } from '../lib/format'
import { mutate, useQuery } from '../lib/useQuery'

export default function RoutineDayScreen({ weekday }: { weekday: number }) {
  const { data } = useQuery(async () => {
    const day = await getDayByWeekday(weekday)
    const exercises = day ? await listExercises(day.id) : []
    return { day, exercises }
  }, [weekday])

  const [order, setOrder] = useState<RoutineExercise[]>([])
  const [editing, setEditing] = useState<RoutineExercise | 'new' | null>(null)
  const [name, setName] = useState('')
  const [rest, setRest] = useState(false)

  useEffect(() => {
    if (data) {
      setOrder(data.exercises)
      setName(data.day?.name ?? '')
      setRest(data.day?.rest_day === 1)
    }
  }, [data])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  if (!data?.day) return <TopBar title="Rutina" onBack />
  const day = data.day

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const from = order.findIndex((e) => e.id === active.id)
    const to = order.findIndex((e) => e.id === over.id)
    const next = arrayMove(order, from, to)
    setOrder(next)
    mutate(() => reorderExercises(next.map((e) => e.id)))
  }

  const saveDay = (nextName: string, nextRest: boolean) =>
    mutate(() => updateDay(day.id, { name: nextName, rest_day: nextRest }))

  return (
    <>
      <TopBar title={WEEKDAY_NAMES[weekday]} subtitle="Configuración del día" onBack />
      <div className="screen">
        <section className="card stack-sm">
          <label>
            Nombre del día
            <input
              value={name}
              placeholder="Pecho + Espalda"
              onChange={(e) => setName(e.target.value)}
              onBlur={() => saveDay(name, rest)}
            />
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={rest}
              onChange={(e) => {
                setRest(e.target.checked)
                saveDay(name, e.target.checked)
              }}
            />
            Día de descanso
          </label>
        </section>

        <div className="row-between">
          <div className="section-title">
            Ejercicios {order.length > 0 && <span className="muted">({order.length})</span>}
          </div>
          {order.length > 1 && <span className="tiny muted">Mantén pulsado para reordenar</span>}
        </div>

        {order.length === 0 ? (
          <Empty>Sin ejercicios. Agrega el primero abajo.</Empty>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            onDragEnd={onDragEnd}
          >
            <SortableContext items={order.map((e) => e.id)} strategy={verticalListSortingStrategy}>
              <div className="list">
                {order.map((exercise) => (
                  <SortableExercise
                    key={exercise.id}
                    exercise={exercise}
                    onEdit={() => setEditing(exercise)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        <button className="btn-primary btn-block" onClick={() => setEditing('new')}>
          + Agregar ejercicio
        </button>
      </div>

      {editing && (
        <ExerciseSheet
          exercise={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={async (input) => {
            if (editing === 'new') await mutate(() => addExercise(day.id, input))
            else await mutate(() => updateExercise(editing.id, input))
            setEditing(null)
          }}
          onDelete={
            editing === 'new'
              ? undefined
              : async () => {
                  await mutate(() => deleteExercise(editing.id))
                  setEditing(null)
                }
          }
        />
      )}
    </>
  )
}

function SortableExercise({ exercise, onEdit }: { exercise: RoutineExercise; onEdit: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: exercise.id,
  })

  const target = [
    exercise.target_sets ? `${exercise.target_sets} series` : null,
    exercise.target_reps ? `${exercise.target_reps} reps` : null,
  ]
    .filter(Boolean)
    .join(' × ')

  return (
    <div
      ref={setNodeRef}
      className={`sortable-item row${isDragging ? ' dragging' : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition, padding: '11px 12px' }}
    >
      <span className="drag-handle" {...attributes} {...listeners} aria-label="Reordenar">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="6" r="1.6" />
          <circle cx="15" cy="6" r="1.6" />
          <circle cx="9" cy="12" r="1.6" />
          <circle cx="15" cy="12" r="1.6" />
          <circle cx="9" cy="18" r="1.6" />
          <circle cx="15" cy="18" r="1.6" />
        </svg>
      </span>
      <button className="grow btn-ghost" style={{ textAlign: 'left', color: 'inherit' }} onClick={onEdit}>
        <div>{exercise.name}</div>
        {(target || exercise.notes) && (
          <div className="muted tiny" style={{ fontWeight: 500 }}>
            {target}
            {target && exercise.notes ? ' · ' : ''}
            {exercise.notes}
          </div>
        )}
      </button>
    </div>
  )
}

function ExerciseSheet(props: {
  exercise: RoutineExercise | null
  onClose: () => void
  onSave: (input: ExerciseInput) => void
  onDelete?: () => void
}) {
  const [name, setName] = useState(props.exercise?.name ?? '')
  const [sets, setSets] = useState(props.exercise?.target_sets?.toString() ?? '')
  const [reps, setReps] = useState(props.exercise?.target_reps ?? '')
  const [notes, setNotes] = useState(props.exercise?.notes ?? '')
  const [confirming, setConfirming] = useState(false)

  if (confirming && props.onDelete) {
    return (
      <Confirm
        title="¿Eliminar ejercicio?"
        message={`"${props.exercise?.name}" se quitará de la rutina. El historial ya registrado se conserva.`}
        onCancel={() => setConfirming(false)}
        onConfirm={props.onDelete}
      />
    )
  }

  return (
    <Sheet title={props.exercise ? 'Editar ejercicio' : 'Nuevo ejercicio'} onClose={props.onClose}>
      <ExerciseNameField value={name} onChange={setName} autoFocus={!props.exercise} />
      <div className="field-grid">
        <label>
          Series objetivo
          <input inputMode="numeric" value={sets} placeholder="4" onChange={(e) => setSets(e.target.value)} />
        </label>
        <label>
          Reps objetivo
          <input value={reps} placeholder="8-10" onChange={(e) => setReps(e.target.value)} />
        </label>
      </div>
      <label>
        Notas
        <textarea
          value={notes}
          placeholder="Banco inclinado 30°, agarre medio…"
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>
      <button
        className="btn-primary btn-block btn-lg"
        disabled={!name.trim()}
        onClick={() =>
          props.onSave({
            name: name.trim(),
            target_sets: parseInteger(sets),
            target_reps: reps.trim() || null,
            notes: notes.trim() || null,
          })
        }
      >
        Guardar
      </button>
      {props.onDelete && (
        <button className="btn-danger btn-block" onClick={() => setConfirming(true)}>
          Eliminar ejercicio
        </button>
      )}
    </Sheet>
  )
}
