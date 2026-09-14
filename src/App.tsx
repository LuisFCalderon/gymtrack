import { useEffect, useState } from 'react'
import BottomNav from './components/BottomNav'
import { initDatabase } from './db/schema'
import { segments, useRoute } from './lib/router'
import Dashboard from './screens/Dashboard'
import RoutineScreen from './screens/RoutineScreen'
import RoutineDayScreen from './screens/RoutineDayScreen'
import WorkoutScreen from './screens/WorkoutScreen'
import HistoryScreen from './screens/HistoryScreen'
import SessionDetailScreen from './screens/SessionDetailScreen'
import ExerciseHistoryScreen from './screens/ExerciseHistoryScreen'
import CardioScreen from './screens/CardioScreen'
import CardioDetailScreen from './screens/CardioDetailScreen'
import WaterScreen from './screens/WaterScreen'
import BodyScreen from './screens/BodyScreen'
import ProgressScreen from './screens/ProgressScreen'
import SettingsScreen from './screens/SettingsScreen'

export default function App() {
  const route = useRoute()
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    initDatabase()
      .then(() => setReady(true))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
  }, [])

  if (error) {
    return (
      <div className="screen">
        <h1>No se pudo abrir la base de datos</h1>
        <p className="muted small">{error}</p>
        <p className="muted small">
          Gym Track guarda los datos en el almacenamiento privado del navegador (OPFS). Comprueba que
          no estés en una ventana privada y que el navegador esté actualizado.
        </p>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="screen center" style={{ paddingTop: '30vh' }}>
        <p className="muted small">Abriendo tu libreta…</p>
      </div>
    )
  }

  return (
    <div className="app">
      {renderRoute(route)}
      <BottomNav route={route} />
    </div>
  )
}

function renderRoute(route: string) {
  const [first, second, third] = segments(route)

  switch (first) {
    case undefined:
      return <Dashboard />
    case 'rutina':
      return second ? <RoutineDayScreen weekday={Number(second)} /> : <RoutineScreen />
    case 'entrenar':
      return <WorkoutScreen sessionId={second ? Number(second) : null} />
    case 'historial':
      if (second === 'sesion' && third) return <SessionDetailScreen sessionId={Number(third)} />
      return <HistoryScreen />
    case 'ejercicio':
      return second ? <ExerciseHistoryScreen name={second} /> : <HistoryScreen />
    case 'cardio':
      return second ? <CardioDetailScreen cardioId={Number(second)} /> : <CardioScreen />
    case 'agua':
      return <WaterScreen />
    case 'peso':
      return <BodyScreen />
    case 'progreso':
      return <ProgressScreen />
    case 'ajustes':
      return <SettingsScreen />
    default:
      return <Dashboard />
  }
}
