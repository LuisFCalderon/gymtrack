import { useEffect, useId, useState } from 'react'
import { suggestExerciseNames } from '../db/routine'

/** Campo de nombre con sugerencias de lo ya usado en la rutina o el historial. */
export default function ExerciseNameField(props: {
  value: string
  onChange: (value: string) => void
  label?: string
  autoFocus?: boolean
  placeholder?: string
}) {
  const listId = useId()
  const [options, setOptions] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(() => {
      suggestExerciseNames(props.value).then((names) => {
        if (!cancelled) setOptions(names)
      })
    }, 120)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [props.value])

  return (
    <label>
      {props.label ?? 'Ejercicio'}
      <input
        list={listId}
        value={props.value}
        autoFocus={props.autoFocus}
        placeholder={props.placeholder ?? 'Press banca'}
        autoCapitalize="sentences"
        onChange={(e) => props.onChange(e.target.value)}
      />
      <datalist id={listId}>
        {options.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </label>
  )
}
