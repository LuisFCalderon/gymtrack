import { useState } from 'react'
import CardioForm from '../components/CardioForm'
import { Empty, Sheet, TopBar } from '../components/ui'
import { createCardio, listCardio } from '../db/cardio'
import { formatDuration, formatRelativeDate } from '../lib/date'
import { num } from '../lib/format'
import { Link } from '../lib/router'
import { mutate, useQuery } from '../lib/useQuery'

export default function CardioScreen() {
  const [adding, setAdding] = useState(false)
  const { data } = useQuery(() => listCardio(), [])

  return (
    <>
      <TopBar
        title="Cardio"
        onBack
        action={
          <button className="btn-sm btn-primary" onClick={() => setAdding(true)}>
            + Nuevo
          </button>
        }
      />
      <div className="screen">
        {data?.length === 0 && <Empty>Sin sesiones de cardio registradas.</Empty>}
        <div className="list">
          {data?.map((session) => (
            <Link key={session.id} to={`/cardio/${session.id}`} className="list-item">
              <div className="grow">
                <div className="row" style={{ gap: 8 }}>
                  <strong>{session.type}</strong>
                  <span className="muted small">{formatRelativeDate(session.date)}</span>
                </div>
                <div className="muted tiny mono">
                  {[
                    session.duration_seconds != null ? formatDuration(session.duration_seconds) : null,
                    session.distance_km != null ? `${num(session.distance_km, 2)} km` : null,
                    session.pace ? `${session.pace} /km` : null,
                    session.average_heart_rate != null ? `${session.average_heart_rate} ppm` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'Sin métricas'}
                </div>
              </div>
              <span className="arrow">›</span>
            </Link>
          ))}
        </div>
      </div>

      {adding && (
        <Sheet title="Nuevo cardio" onClose={() => setAdding(false)}>
          <CardioForm
            onSubmit={async (input) => {
              await mutate(() => createCardio(input))
              setAdding(false)
            }}
          />
        </Sheet>
      )}
    </>
  )
}
