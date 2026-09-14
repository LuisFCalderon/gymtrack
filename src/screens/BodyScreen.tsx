import { useState } from 'react'
import LineChart from '../components/charts/LineChart'
import { Confirm, Empty, Metric, Sheet, TopBar } from '../components/ui'
import {
  SETTINGS,
  addMeasurement,
  deleteMeasurement,
  getSetting,
  lastMeasurement,
  listMeasurements,
  setSetting,
} from '../db/wellbeing'
import type { BodyMeasurement } from '../db/types'
import { formatRelativeDate, todayISO } from '../lib/date'
import { bmi, bmiLabel, kg, num, parseNumber } from '../lib/format'
import { mutate, useQuery } from '../lib/useQuery'

export default function BodyScreen() {
  const [adding, setAdding] = useState(false)
  const [deleting, setDeleting] = useState<BodyMeasurement | null>(null)

  const { data } = useQuery(async () => {
    const [measurements, last, height] = await Promise.all([
      listMeasurements(),
      lastMeasurement(),
      getSetting(SETTINGS.heightCm),
    ])
    return { measurements, last, height: height ? Number(height) : null }
  }, [])

  if (!data) return <TopBar title="Peso corporal" onBack />
  const { measurements, last, height } = data
  const series = [...measurements].reverse().map((m) => ({ date: m.date, value: m.weight_kg }))

  return (
    <>
      <TopBar
        title="Peso corporal"
        onBack
        action={
          <button className="btn-sm btn-primary" onClick={() => setAdding(true)}>
            + Registrar
          </button>
        }
      />
      <div className="screen">
        {last ? (
          <section className="card stack-sm">
            <div className="metrics">
              <Metric value={last.weight_kg != null ? `${num(last.weight_kg)} kg` : '—'} label="Último peso" />
              <Metric value={last.bmi != null ? num(last.bmi, 1) : '—'} label="IMC" />
              <Metric
                value={last.bmi != null ? bmiLabel(last.bmi) : '—'}
                label="Referencia"
              />
            </div>
            <p className="muted tiny">
              Registrado el {formatRelativeDate(last.date).toLowerCase()}. El IMC es sólo una referencia
              general, no un diagnóstico.
            </p>
          </section>
        ) : (
          <Empty>Registra tu peso para ver la evolución.</Empty>
        )}

        {series.filter((s) => s.value != null).length > 1 && (
          <section className="card stack-sm">
            <div className="section-title">Evolución del peso</div>
            <LineChart
              title="Evolución del peso corporal"
              valueHeader="Peso"
              formatValue={(value) => kg(value)}
              points={series}
            />
          </section>
        )}

        {measurements.length > 0 && (
          <>
            <div className="section-title">Historial</div>
            <div className="list">
              {measurements.map((measurement) => (
                <div key={measurement.id} className="list-item">
                  <div className="grow">
                    <div className="mono">{measurement.weight_kg != null ? `${num(measurement.weight_kg)} kg` : '—'}</div>
                    <div className="muted tiny">
                      {formatRelativeDate(measurement.date)}
                      {measurement.bmi != null ? ` · IMC ${num(measurement.bmi, 1)}` : ''}
                      {measurement.notes ? ` · ${measurement.notes}` : ''}
                    </div>
                  </div>
                  <button className="btn-icon" aria-label="Eliminar" onClick={() => setDeleting(measurement)}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {adding && (
        <MeasurementSheet
          defaultHeight={height ?? last?.height_cm ?? null}
          onClose={() => setAdding(false)}
        />
      )}

      {deleting && (
        <Confirm
          title="¿Eliminar el registro?"
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            await mutate(() => deleteMeasurement(deleting.id))
            setDeleting(null)
          }}
        />
      )}
    </>
  )
}

function MeasurementSheet({
  defaultHeight,
  onClose,
}: {
  defaultHeight: number | null
  onClose: () => void
}) {
  const [date, setDate] = useState(todayISO())
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState(defaultHeight ? num(defaultHeight, 0) : '')
  const [notes, setNotes] = useState('')

  const weightValue = parseNumber(weight)
  const heightValue = parseNumber(height)
  const preview = weightValue && heightValue ? bmi(weightValue, heightValue) : null

  return (
    <Sheet title="Registrar peso" onClose={onClose}>
      <div className="field-grid">
        <label>
          Peso (kg)
          <input className="mono" autoFocus inputMode="decimal" placeholder="78,4" value={weight}
            onChange={(e) => setWeight(e.target.value)} />
        </label>
        <label>
          Altura (cm)
          <input className="mono" inputMode="decimal" placeholder="175" value={height}
            onChange={(e) => setHeight(e.target.value)} />
        </label>
      </div>
      <label>
        Fecha
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <label>
        Notas
        <input value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      {preview != null && (
        <p className="muted small">
          IMC estimado: <strong className="mono">{num(preview, 1)}</strong> · {bmiLabel(preview)}
        </p>
      )}
      <button
        className="btn-primary btn-block btn-lg"
        disabled={weightValue == null}
        onClick={async () => {
          await mutate(async () => {
            await addMeasurement({
              date,
              weight_kg: weightValue,
              height_cm: heightValue,
              notes: notes.trim() || null,
            })
            if (heightValue) await setSetting(SETTINGS.heightCm, String(heightValue))
          })
          onClose()
        }}
      >
        Guardar
      </button>
    </Sheet>
  )
}
