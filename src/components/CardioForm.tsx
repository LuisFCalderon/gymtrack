import { useState } from 'react'
import { CARDIO_TYPES, type CardioSession } from '../db/types'
import type { CardioInput } from '../db/cardio'
import { formatDuration, parseDuration, todayISO } from '../lib/date'
import { parseInteger, parseNumber } from '../lib/format'

export default function CardioForm({
  session,
  onSubmit,
  submitLabel = 'Guardar',
}: {
  session?: CardioSession
  onSubmit: (input: CardioInput) => void
  submitLabel?: string
}) {
  const [date, setDate] = useState(session?.date ?? todayISO())
  const [type, setType] = useState(session?.type ?? CARDIO_TYPES[0])
  const [duration, setDuration] = useState(
    session?.duration_seconds != null ? formatDuration(session.duration_seconds) : '',
  )
  const [distance, setDistance] = useState(session?.distance_km?.toString().replace('.', ',') ?? '')
  const [steps, setSteps] = useState(session?.steps?.toString() ?? '')
  const [pace, setPace] = useState(session?.pace ?? '')
  const [speed, setSpeed] = useState(session?.speed_kmh?.toString().replace('.', ',') ?? '')
  const [incline, setIncline] = useState(session?.incline_percent?.toString().replace('.', ',') ?? '')
  const [heartRate, setHeartRate] = useState(session?.average_heart_rate?.toString() ?? '')
  const [notes, setNotes] = useState(session?.notes ?? '')

  return (
    <>
      <div className="field-grid">
        <label>
          Tipo
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {CARDIO_TYPES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          Fecha
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>

      <div className="field-grid">
        <label>
          Tiempo (mm:ss)
          <input className="mono" inputMode="numeric" placeholder="25:00" value={duration}
            onChange={(e) => setDuration(e.target.value)} />
        </label>
        <label>
          Distancia (km)
          <input className="mono" inputMode="decimal" placeholder="4,5" value={distance}
            onChange={(e) => setDistance(e.target.value)} />
        </label>
      </div>

      <div className="field-grid three">
        <label>
          Pasos
          <input className="mono" inputMode="numeric" value={steps} onChange={(e) => setSteps(e.target.value)} />
        </label>
        <label>
          Ritmo
          <input className="mono" placeholder="5:30" value={pace} onChange={(e) => setPace(e.target.value)} />
        </label>
        <label>
          Vel. (km/h)
          <input className="mono" inputMode="decimal" value={speed} onChange={(e) => setSpeed(e.target.value)} />
        </label>
      </div>

      <div className="field-grid">
        <label>
          Inclinación (%)
          <input className="mono" inputMode="decimal" value={incline} onChange={(e) => setIncline(e.target.value)} />
        </label>
        <label>
          FC media (ppm)
          <input className="mono" inputMode="numeric" value={heartRate}
            onChange={(e) => setHeartRate(e.target.value)} />
        </label>
      </div>

      <label>
        Notas
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>

      <button
        className="btn-primary btn-block btn-lg"
        onClick={() =>
          onSubmit({
            date,
            type,
            duration_seconds: parseDuration(duration),
            distance_km: parseNumber(distance),
            steps: parseInteger(steps),
            pace: pace.trim() || null,
            speed_kmh: parseNumber(speed),
            incline_percent: parseNumber(incline),
            average_heart_rate: parseInteger(heartRate),
            notes: notes.trim() || null,
          })
        }
      >
        {submitLabel}
      </button>
    </>
  )
}
