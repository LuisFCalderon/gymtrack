import { useState } from 'react'
import CardioForm from '../components/CardioForm'
import { Confirm, Empty, Sheet, TopBar } from '../components/ui'
import {
  addInterval,
  deleteCardio,
  deleteInterval,
  getCardio,
  listIntervals,
  updateCardio,
} from '../db/cardio'
import type { CardioInterval } from '../db/types'
import { formatDuration, formatRelativeDate, parseDuration } from '../lib/date'
import { num, parseNumber } from '../lib/format'
import { navigate } from '../lib/router'
import { mutate, useQuery } from '../lib/useQuery'

export default function CardioDetailScreen({ cardioId }: { cardioId: number }) {
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [addingInterval, setAddingInterval] = useState(false)

  const { data } = useQuery(async () => {
    const session = await getCardio(cardioId)
    if (!session) return null
    return { session, intervals: await listIntervals(cardioId) }
  }, [cardioId])

  if (!data) return <TopBar title="Cardio" onBack />
  const { session, intervals } = data

  const intervalDistance = intervals.reduce((total, i) => total + (i.distance_km ?? 0), 0)
  const intervalSeconds = intervals.reduce((total, i) => total + (i.duration_seconds ?? 0), 0)

  return (
    <>
      <TopBar
        title={session.type}
        subtitle={formatRelativeDate(session.date)}
        onBack
        action={
          <button className="btn-sm" onClick={() => setEditing(true)}>
            Editar
          </button>
        }
      />
      <div className="screen">
        <section className="card stack-sm">
          <Detail label="Tiempo" value={formatDuration(session.duration_seconds)} />
          <Detail label="Distancia" value={session.distance_km != null ? `${num(session.distance_km, 2)} km` : '—'} />
          <Detail label="Pasos" value={session.steps != null ? num(session.steps, 0) : '—'} />
          <Detail label="Ritmo" value={session.pace ? `${session.pace} /km` : '—'} />
          <Detail label="Velocidad" value={session.speed_kmh != null ? `${num(session.speed_kmh)} km/h` : '—'} />
          <Detail
            label="Inclinación"
            value={session.incline_percent != null ? `${num(session.incline_percent)} %` : '—'}
          />
          <Detail
            label="FC media"
            value={session.average_heart_rate != null ? `${session.average_heart_rate} ppm` : '—'}
          />
          {session.notes && <p className="muted small">{session.notes}</p>}
        </section>

        <div className="row-between">
          <div className="section-title">Intervalos</div>
          <button className="btn-sm" onClick={() => setAddingInterval(true)}>
            + Intervalo
          </button>
        </div>

        {intervals.length === 0 ? (
          <Empty>Sin intervalos. Útil para series de 400 m, por ejemplo.</Empty>
        ) : (
          <section className="card stack-sm">
            <table className="sets-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Tiempo</th>
                  <th>Dist.</th>
                  <th>Ritmo</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {intervals.map((interval) => (
                  <IntervalRow key={interval.id} interval={interval} />
                ))}
              </tbody>
            </table>
            <div className="row-between muted tiny mono">
              <span>Total {intervals.length} intervalos</span>
              <span>
                {formatDuration(intervalSeconds)} · {num(intervalDistance, 2)} km
              </span>
            </div>
          </section>
        )}

        <button className="btn-danger btn-block" onClick={() => setDeleting(true)}>
          Eliminar sesión de cardio
        </button>
      </div>

      {editing && (
        <Sheet title="Editar cardio" onClose={() => setEditing(false)}>
          <CardioForm
            session={session}
            onSubmit={async (input) => {
              await mutate(() => updateCardio(session.id, input))
              setEditing(false)
            }}
          />
        </Sheet>
      )}

      {addingInterval && (
        <IntervalSheet cardioId={session.id} onClose={() => setAddingInterval(false)} />
      )}

      {deleting && (
        <Confirm
          title="¿Eliminar esta sesión de cardio?"
          message="También se eliminarán sus intervalos."
          onCancel={() => setDeleting(false)}
          onConfirm={async () => {
            await mutate(() => deleteCardio(session.id))
            navigate('/cardio')
          }}
        />
      )}
    </>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="row-between">
      <span className="muted small">{label}</span>
      <span className="mono">{value}</span>
    </div>
  )
}

function IntervalRow({ interval }: { interval: CardioInterval }) {
  const [confirming, setConfirming] = useState(false)
  return (
    <>
      <tr>
        <td>
          <span className="set-number">{interval.interval_number}</span>
        </td>
        <td>{formatDuration(interval.duration_seconds)}</td>
        <td>{interval.distance_km != null ? `${num(interval.distance_km, 2)} km` : '—'}</td>
        <td className="muted">{interval.pace ?? '—'}</td>
        <td>
          <button className="btn-icon" onClick={() => setConfirming(true)} aria-label="Eliminar intervalo">
            ✕
          </button>
        </td>
      </tr>
      {confirming && (
        <tr>
          <td colSpan={5} style={{ padding: 0 }}>
            <Confirm
              title={`¿Eliminar el intervalo ${interval.interval_number}?`}
              onCancel={() => setConfirming(false)}
              onConfirm={async () => {
                await mutate(() => deleteInterval(interval.id))
                setConfirming(false)
              }}
            />
          </td>
        </tr>
      )}
    </>
  )
}

function IntervalSheet({ cardioId, onClose }: { cardioId: number; onClose: () => void }) {
  const [duration, setDuration] = useState('')
  const [distance, setDistance] = useState('')
  const [pace, setPace] = useState('')
  const [speed, setSpeed] = useState('')
  const [incline, setIncline] = useState('')
  const [notes, setNotes] = useState('')
  const [keepOpen, setKeepOpen] = useState(true)

  const save = async () => {
    await mutate(() =>
      addInterval(cardioId, {
        duration_seconds: parseDuration(duration),
        distance_km: parseNumber(distance),
        pace: pace.trim() || null,
        speed_kmh: parseNumber(speed),
        incline_percent: parseNumber(incline),
        notes: notes.trim() || null,
      }),
    )
    if (keepOpen) {
      setNotes('')
    } else {
      onClose()
    }
  }

  return (
    <Sheet title="Nuevo intervalo" onClose={onClose}>
      <div className="field-grid">
        <label>
          Tiempo (mm:ss)
          <input className="mono" autoFocus placeholder="1:45" value={duration}
            onChange={(e) => setDuration(e.target.value)} />
        </label>
        <label>
          Distancia (km)
          <input className="mono" inputMode="decimal" placeholder="0,4" value={distance}
            onChange={(e) => setDistance(e.target.value)} />
        </label>
      </div>
      <div className="field-grid three">
        <label>
          Ritmo
          <input className="mono" value={pace} onChange={(e) => setPace(e.target.value)} />
        </label>
        <label>
          Vel. (km/h)
          <input className="mono" inputMode="decimal" value={speed} onChange={(e) => setSpeed(e.target.value)} />
        </label>
        <label>
          Incl. (%)
          <input className="mono" inputMode="decimal" value={incline} onChange={(e) => setIncline(e.target.value)} />
        </label>
      </div>
      <label>
        Nota
        <input value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <label className="checkbox">
        <input type="checkbox" checked={keepOpen} onChange={(e) => setKeepOpen(e.target.checked)} />
        Seguir agregando intervalos
      </label>
      <button className="btn-primary btn-block btn-lg" onClick={save}>
        Agregar intervalo
      </button>
    </Sheet>
  )
}
