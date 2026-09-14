import { useState } from 'react'
import BarChart from '../components/charts/BarChart'
import { Empty, Metric, ProgressBar, Sheet, TopBar } from '../components/ui'
import { SETTINGS, addWater, deleteWater, getWaterGoal, listWaterByDate, setSetting, waterDailySeries, waterTotal } from '../db/wellbeing'
import { todayISO } from '../lib/date'
import { liters, num, parseNumber } from '../lib/format'
import { mutate, useQuery } from '../lib/useQuery'

const QUICK_AMOUNTS = [0.25, 0.5, 0.75, 1]

export default function WaterScreen() {
  const date = todayISO()
  const [goalOpen, setGoalOpen] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)

  const { data } = useQuery(async () => {
    const [total, goal, records, history] = await Promise.all([
      waterTotal(date),
      getWaterGoal(),
      listWaterByDate(date),
      waterDailySeries(14),
    ])
    return { total, goal, records, history }
  }, [date])

  if (!data) return <TopBar title="Agua" onBack />
  const { total, goal, records, history } = data
  const percent = goal > 0 ? Math.round((total / goal) * 100) : 0

  return (
    <>
      <TopBar
        title="Agua"
        subtitle="Hoy"
        onBack
        action={
          <button className="btn-sm" onClick={() => setGoalOpen(true)}>
            Meta
          </button>
        }
      />
      <div className="screen">
        <section className="card stack-sm">
          <div className="row-between">
            <Metric value={`${num(total, 2)} L`} label={`Meta ${num(goal, 2)} L`} />
            <span className={`chip mono${percent >= 100 ? ' ok' : ' accent'}`}>{percent} %</span>
          </div>
          <ProgressBar value={total} max={goal} />
        </section>

        <div className="row wrap">
          {QUICK_AMOUNTS.map((amount) => (
            <button key={amount} className="grow" onClick={() => mutate(() => addWater(date, amount))}>
              +{num(amount, 2)} L
            </button>
          ))}
          <button className="btn-outline" onClick={() => setCustomOpen(true)}>
            Otra
          </button>
        </div>

        <div className="section-title">Registros de hoy</div>
        {records.length === 0 ? (
          <Empty>Sin registros todavía.</Empty>
        ) : (
          <div className="list">
            {records.map((record) => (
              <div key={record.id} className="list-item">
                <span className="grow mono">{num(record.liters, 2)} L</span>
                <span className="muted tiny">
                  {new Date(record.timestamp).toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <button
                  className="btn-icon"
                  aria-label="Eliminar registro"
                  onClick={() => mutate(() => deleteWater(record.id))}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {history.some((day) => day.total > 0) && (
          <>
            <div className="section-title">Últimos 14 días</div>
            <section className="card stack-sm">
              <BarChart
                title="Litros de agua por día, últimos 14 días"
                valueHeader="Litros"
                height={150}
                formatValue={(value) => liters(value)}
                formatTick={(value) => num(value, 1)}
                reference={{ value: goal, label: 'Meta' }}
                points={history.map((day) => ({
                  date: day.date,
                  value: day.total,
                  ok: day.total >= goal,
                }))}
              />
              <p className="muted tiny">
                La línea marca la meta de {num(goal, 2)} L; en verde, los días que la alcanzaron.
              </p>
            </section>
          </>
        )}
      </div>

      {goalOpen && <GoalSheet goal={goal} onClose={() => setGoalOpen(false)} />}
      {customOpen && <CustomSheet date={date} onClose={() => setCustomOpen(false)} />}
    </>
  )
}

function GoalSheet({ goal, onClose }: { goal: number; onClose: () => void }) {
  const [value, setValue] = useState(num(goal, 2))
  return (
    <Sheet title="Meta diaria" onClose={onClose}>
      <label>
        Litros por día
        <input className="mono" autoFocus inputMode="decimal" value={value}
          onChange={(e) => setValue(e.target.value)} />
      </label>
      <button
        className="btn-primary btn-block btn-lg"
        onClick={async () => {
          const parsed = parseNumber(value)
          if (parsed && parsed > 0) await mutate(() => setSetting(SETTINGS.waterGoal, String(parsed)))
          onClose()
        }}
      >
        Guardar
      </button>
    </Sheet>
  )
}

function CustomSheet({ date, onClose }: { date: string; onClose: () => void }) {
  const [value, setValue] = useState('')
  return (
    <Sheet title="Registrar agua" onClose={onClose}>
      <label>
        Litros
        <input className="mono" autoFocus inputMode="decimal" placeholder="0,33" value={value}
          onChange={(e) => setValue(e.target.value)} />
      </label>
      <button
        className="btn-primary btn-block btn-lg"
        disabled={!parseNumber(value)}
        onClick={async () => {
          const parsed = parseNumber(value)
          if (parsed) await mutate(() => addWater(date, parsed))
          onClose()
        }}
      >
        Agregar
      </button>
    </Sheet>
  )
}
