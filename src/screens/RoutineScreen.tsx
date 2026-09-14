import { TopBar } from '../components/ui'
import { countExercisesByDay, listDays } from '../db/routine'
import { WEEKDAY_NAMES } from '../db/types'
import { weekdayOf } from '../lib/date'
import { Link } from '../lib/router'
import { useQuery } from '../lib/useQuery'

export default function RoutineScreen() {
  const today = weekdayOf()
  const { data } = useQuery(async () => {
    const [days, counts] = await Promise.all([listDays(), countExercisesByDay()])
    return { days, counts }
  }, [])

  return (
    <>
      <TopBar title="Rutina" subtitle="Siete días configurables" />
      <div className="screen">
        <div className="list">
          {data?.days.map((day) => {
            const count = data.counts[day.id] ?? 0
            return (
              <Link key={day.id} to={`/rutina/${day.weekday}`} className="list-item">
                <div className="grow">
                  <div className="row" style={{ gap: 8 }}>
                    <strong>{WEEKDAY_NAMES[day.weekday]}</strong>
                    {day.weekday === today && <span className="chip accent">Hoy</span>}
                    {day.rest_day === 1 && <span className="chip">Descanso</span>}
                  </div>
                  <div className="muted small">
                    {day.name?.trim() ? `${day.name} · ` : ''}
                    {count === 0 ? 'Sin ejercicios' : `${count} ${count === 1 ? 'ejercicio' : 'ejercicios'}`}
                  </div>
                </div>
                <span className="arrow">›</span>
              </Link>
            )
          })}
        </div>
      </div>
    </>
  )
}
