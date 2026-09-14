import { useState } from 'react'
import { formatShortDate } from '../../lib/date'
import { num } from '../../lib/format'
import { ChartTable, ChartTooltip, ChartWrap, moveActive, useChartWidth } from './ChartFrame'
import {
  axisWidth,
  compactNum,
  describeSeries,
  niceScale,
  pickLabelIndices,
  type ChartPoint,
} from './utils'
import './charts.css'

/** Línea de evolución: una serie, ejes con etiquetas y lectura por toque. */
export default function LineChart({
  points,
  title,
  valueHeader,
  height = 168,
  formatValue = (value) => num(value),
  formatTick = compactNum,
}: {
  points: ChartPoint[]
  title: string
  valueHeader?: string
  height?: number
  formatValue?: (value: number) => string
  formatTick?: (value: number) => string
}) {
  const [ref, width] = useChartWidth()
  const [active, setActive] = useState<number | null>(null)

  const known = points.filter((p): p is ChartPoint & { value: number } => p.value != null)
  if (known.length === 0) return null

  const values = known.map((p) => p.value)
  const scale = niceScale(Math.min(...values), Math.max(...values), 3)
  const tickLabels = scale.values.map(formatTick)

  const padTop = 18
  const padBottom = 22
  const padRight = 12
  const padLeft = axisWidth(tickLabels)
  const plotW = Math.max(10, width - padLeft - padRight)
  const plotH = Math.max(10, height - padTop - padBottom)
  const span = scale.max - scale.min || 1

  const x = (i: number) =>
    padLeft + (points.length <= 1 ? plotW / 2 : (i * plotW) / (points.length - 1))
  const y = (value: number) => padTop + (1 - (value - scale.min) / span) * plotH

  // Los huecos (sesiones sin peso) cortan la línea en vez de inventar un tramo recto.
  let pen = 'M'
  const path = points
    .map((point, i) => {
      if (point.value == null) {
        pen = 'M'
        return ''
      }
      const segment = `${pen}${x(i).toFixed(1)} ${y(point.value).toFixed(1)}`
      pen = 'L'
      return segment
    })
    .filter(Boolean)
    .join(' ')

  const lastIndex = points.reduce((acc, p, i) => (p.value != null ? i : acc), 0)
  const last = points[lastIndex]
  const labelIndices = pickLabelIndices(points.length, plotW)
  const activePoint = active != null ? points[active] : null

  const indexAt = (clientX: number, rect: DOMRect) => {
    const local = clientX - rect.left
    const step = points.length > 1 ? plotW / (points.length - 1) : plotW
    return Math.max(0, Math.min(points.length - 1, Math.round((local - padLeft) / step)))
  }

  return (
    <ChartWrap innerRef={ref}>
      <svg
        className="gt-chart"
        width={width}
        height={height}
        role="img"
        tabIndex={0}
        aria-label={describeSeries(title, points, formatValue)}
        onPointerDown={(e) => setActive(indexAt(e.clientX, e.currentTarget.getBoundingClientRect()))}
        onPointerMove={(e) => {
          if (e.pointerType === 'mouse' || e.buttons > 0) {
            setActive(indexAt(e.clientX, e.currentTarget.getBoundingClientRect()))
          }
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === 'mouse') setActive(null)
        }}
        onBlur={() => setActive(null)}
        onKeyDown={(e) => {
          const next = moveActive(e.key, active, points.length)
          if (next !== undefined) {
            e.preventDefault()
            setActive(next)
          }
        }}
      >
        {scale.values.map((value, i) => (
          <g key={value}>
            <line className="gt-grid" x1={padLeft} y1={y(value)} x2={padLeft + plotW} y2={y(value)} />
            <text className="gt-axis-text" x={padLeft - 6} y={y(value)} textAnchor="end" dy="0.32em">
              {tickLabels[i]}
            </text>
          </g>
        ))}

        {activePoint?.value != null && (
          <line
            className="gt-crosshair"
            x1={x(active as number)}
            y1={padTop - 4}
            x2={x(active as number)}
            y2={padTop + plotH}
          />
        )}

        <path className="gt-line" d={path} />

        {points.map((point, i) =>
          point.value == null ? null : (
            <circle
              key={`${point.date}-${i}`}
              className={`gt-dot${i === active ? ' is-active' : ''}`}
              cx={x(i)}
              cy={y(point.value)}
              r={i === lastIndex || i === active ? 4.5 : 3}
            />
          ),
        )}

        {last?.value != null && active == null && (
          <text
            className="gt-value"
            x={Math.min(x(lastIndex) + 6, padLeft + plotW)}
            y={Math.max(12, y(last.value) - 10)}
            textAnchor={x(lastIndex) > padLeft + plotW / 2 ? 'end' : 'start'}
          >
            {formatValue(last.value)}
          </text>
        )}

        {labelIndices.map((i) => (
          <text
            key={`label-${i}`}
            className="gt-axis-text"
            x={x(i)}
            y={height - 6}
            textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}
          >
            {formatShortDate(points[i].date)}
          </text>
        ))}
      </svg>

      {activePoint?.value != null && (
        <ChartTooltip
          x={x(active as number)}
          width={width}
          label={formatShortDate(activePoint.date)}
          value={formatValue(activePoint.value)}
        />
      )}

      <ChartTable
        caption={title}
        valueHeader={valueHeader ?? 'Valor'}
        points={points}
        formatValue={formatValue}
      />
    </ChartWrap>
  )
}
