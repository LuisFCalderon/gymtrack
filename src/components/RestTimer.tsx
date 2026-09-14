import { useEffect } from 'react'
import {
  ajustarDescanso,
  alternarPausa,
  formatoDescanso,
  saltarDescanso,
  useRestTimer,
} from '../lib/restTimer'
import './RestTimer.css'

/** Barra flotante con la cuenta atrás del descanso. Se muestra sólo mientras corre. */
export default function RestTimer() {
  const { activo, restante, total, enPausa } = useRestTimer()

  // Mientras la barra está visible el contenido necesita más espacio abajo.
  useEffect(() => {
    if (!activo) return
    document.body.classList.add('rest-activo')
    return () => document.body.classList.remove('rest-activo')
  }, [activo])

  if (!activo) return null

  const porcentaje = total > 0 ? Math.min(100, (restante / total) * 100) : 0

  return (
    <div className="rest-bar">
      <div className={`rest-panel${enPausa ? ' pausa' : ''}`} role="timer">
        <div className="rest-progress">
          <div style={{ width: `${porcentaje}%` }} />
        </div>
        <div className="rest-row">
          <div className="rest-time">
            <span className="value">{formatoDescanso(restante)}</span>
            <span className="label">{enPausa ? 'En pausa' : 'Descanso'}</span>
          </div>
          <div className="rest-spacer" />
          <button className="btn-outline" onClick={() => ajustarDescanso(-30)} aria-label="Quitar 30 segundos">
            −30
          </button>
          <button className="btn-outline" onClick={() => ajustarDescanso(30)} aria-label="Sumar 30 segundos">
            +30
          </button>
          <button
            className="btn-outline"
            onClick={alternarPausa}
            aria-label={enPausa ? 'Reanudar descanso' : 'Pausar descanso'}
          >
            {enPausa ? '▶' : '❚❚'}
          </button>
          <button className="btn-ghost rest-close" onClick={saltarDescanso} aria-label="Saltar descanso">
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}
