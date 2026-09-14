import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { formatShortDate } from '../../lib/date'
import type { ChartPoint } from './utils'

/** Ancho real del contenedor: el SVG se dibuja en píxeles, así el texto no se deforma. */
export function useChartWidth(fallback = 300): [RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(fallback)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.round(entry.contentRect.width)
      if (next > 0) setWidth(next)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return [ref, width]
}

/** Contenedor con posición relativa para el tooltip flotante. */
export function ChartWrap(props: {
  innerRef: RefObject<HTMLDivElement | null>
  children: ReactNode
}) {
  return (
    <div className="gt-chart-wrap" ref={props.innerRef}>
      {props.children}
    </div>
  )
}

/** Tooltip visual: el dato también vive en la tabla equivalente, nunca sólo aquí. */
export function ChartTooltip(props: { x: number; width: number; label: string; value: string }) {
  const left = Math.min(Math.max(props.x, 52), Math.max(52, props.width - 52))
  return (
    <div className="gt-tooltip" style={{ left }} aria-hidden="true">
      <div className="gt-tip-value mono">{props.value}</div>
      <div className="gt-tip-label">{props.label}</div>
    </div>
  )
}

/** Tabla equivalente, oculta visualmente: cada valor sigue siendo accesible sin tooltip. */
export function ChartTable(props: {
  caption: string
  valueHeader: string
  points: ChartPoint[]
  formatValue: (value: number) => string
}) {
  return (
    <table className="gt-sr-only">
      <caption>{props.caption}</caption>
      <thead>
        <tr>
          <th scope="col">Fecha</th>
          <th scope="col">{props.valueHeader}</th>
        </tr>
      </thead>
      <tbody>
        {props.points.map((point, i) => (
          <tr key={`${point.date}-${i}`}>
            <th scope="row">{formatShortDate(point.date)}</th>
            <td>{point.value == null ? '—' : props.formatValue(point.value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Teclas de flecha para recorrer la serie sin ratón. */
export function moveActive(
  key: string,
  active: number | null,
  count: number,
): number | null | undefined {
  if (key === 'ArrowRight' || key === 'ArrowUp') return Math.min(count - 1, (active ?? -1) + 1)
  if (key === 'ArrowLeft' || key === 'ArrowDown') return Math.max(0, (active ?? count) - 1)
  if (key === 'Home') return 0
  if (key === 'End') return count - 1
  if (key === 'Escape') return null
  return undefined
}
