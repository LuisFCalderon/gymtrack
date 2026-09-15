import { useEffect, useState } from 'react'
import BottomNav from './components/BottomNav'
import RestTimer from './components/RestTimer'
import { abrirTour, tourVisto } from './components/tour'
import { almacenamientoEfimero, initDatabase } from './db/schema'
import { repararCachesYRecargar } from './lib/recovery'
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
  const [efimero, setEfimero] = useState(false)

  useEffect(() => {
    let resuelto = false

    // Si abrir la base no responde, casi siempre es una caché vieja del Service Worker que ya no
    // sirve para crear workers. Se limpia y se recarga una vez; los datos de OPFS no se tocan.
    const rescate = setTimeout(() => {
      if (!resuelto) void repararCachesYRecargar()
    }, 12000)

    initDatabase()
      .then(async () => {
        resuelto = true
        clearTimeout(rescate)
        if (await almacenamientoEfimero()) {
          // Puede que el servidor sí mande las cabeceras y lo que falle sea una caché vieja del
          // Service Worker sirviendo un documento de antes del cambio. Se limpia y se recarga una
          // vez; si tras eso sigue en memoria, el problema es real y se avisa.
          if (await repararCachesYRecargar()) return
          setEfimero(true)
        }
        setReady(true)
      })
      .catch(async (err: unknown) => {
        resuelto = true
        clearTimeout(rescate)
        if (await repararCachesYRecargar()) return
        setError(err instanceof Error ? err.message : String(err))
      })

    return () => clearTimeout(rescate)
  }, [])

  // La primera vez que se abre la app, la guía sale sola.
  useEffect(() => {
    if (ready && !efimero && !tourVisto()) void abrirTour()
  }, [ready, efimero])

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

  if (efimero) {
    return (
      <div className="screen" style={{ paddingTop: '12vh' }}>
        <h1>Tus datos no se están guardando</h1>
        <p className="muted small">
          El navegador no puede usar el almacenamiento permanente en este servidor, así que la
          libreta funcionaría sólo hasta que cierres o recargues la página. Todo lo que registres se
          perdería.
        </p>
        <p className="muted small">
          Falta que el servidor envíe las cabeceras <code>Cross-Origin-Opener-Policy: same-origin</code>{' '}
          y <code>Cross-Origin-Embedder-Policy: require-corp</code>. El archivo{' '}
          <code>public/_headers</code> del proyecto ya las incluye: comprueba que el despliegue las
          esté aplicando.
        </p>
        <p className="muted small">
          Preferimos detener la app aquí antes que dejarte anotar un entrenamiento que va a
          desaparecer.
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
      <RestTimer />
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
