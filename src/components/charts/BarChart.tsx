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
  roundedTopRect,
  type ChartPoint,
} from './utils'
import './charts.css'

/** Barras desde la línea base: volumen por sesión, por semana o litros por día. */
export default function BarChart({
  points,
  title,
  valueHeader,
  height = 168,
  formatValue = (value) => num(value, 0),
  formatTick = compactNum,
  reference,
}: {
  points: ChartPoint[]
  title: string
  valueHeader?: string
  height?: number
  formatValue?: (value: number) => string
  formatTick?: (value: number) => string
  /** Línea de referencia horizontal (por ejemplo, la meta de agua). */
  reference?: { value: number; label: string }
}) {
  const [ref, width] = useChartWidth()
  const [active, setActive] = useState<number | null>(null)

  if (points.length === 0) return null

  const values = points.map((p) => p.value ?? 0)
  const top = Math.max(...values, reference?.value ?? 0)
  const scale = niceScale(0, top || 1, 3)
  const tickLabels = scale.values.map(formatTick)

  const padTop = 18
  const padBottom = 22
  const padRight = reference ? 34 : 12
  const padLeft = axisWidth(tickLabels)
  const plotW = Math.max(10, width - padLeft - padRight)
  const plotH = Math.max(10, height - padTop - padBottom)
  const span = scale.max - scale.min || 1

  const band = plotW / points.length
  const barW = Math.max(3, Math.min(24, band - 2))
  const y = (value: number) => padTop + (1 - (value - scale.min) / span) * plotH
  const barX = (i: number) => padLeft + i * band + (band - barW) / 2
  const baseline = y(scale.min)

  const labelIndices = pickLabelIndices(points.length, plotW)
  const activePoint = active != null ? points[active] : null
  const lastIndex = points.length - 1
  const lastValue = points[lastIndex].value

  const indexAt = (clientX: number, rect: DOMRect) =>
    Math.max(0, Math.min(points.length - 1, Math.floor((clientX - rect.left - padLeft) / band)))

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

        {points.map((point, i) => {
          const value = point.value ?? 0
          const h = Math.max(0, baseline - y(value))
          if (h < 1) {
            // Día sin registro: una ranura tenue mantiene visible el hueco.
            return (
              <rect
                key={`${point.date}-${i}`}
                className="gt-bar-empty"
                x={barX(i)}
                y={baseline - 2}
                width={barW}
                height={2}
                rx={1}
              />
            )
          }
          return (
            <path
              key={`${point.date}-${i}`}
              className={`gt-bar${point.ok ? ' is-ok' : ''}${i === active ? ' is-active' : ''}`}
              d={roundedTopRect(barX(i), y(value), barW, h)}
            />
          )
        })}

        {reference && (
          <g>
            <line
              className="gt-ref"
              x1={padLeft}
              y1={y(reference.value)}
              x2={padLeft + plotW + 4}
              y2={y(reference.value)}
            />
            <text
              className="gt-ref-text"
              x={padLeft + plotW + 7}
              y={y(reference.value)}
              dy="0.32em"
            >
              {reference.label}
            </text>
          </g>
        )}

        <line className="gt-baseline" x1={padLeft} y1={baseline} x2={padLeft + plotW} y2={baseline} />

        {lastValue != null && lastValue > 0 && active == null && (
          <text
            className="gt-value"
            x={barX(lastIndex) + barW / 2}
            y={Math.max(12, y(lastValue) - 7)}
            textAnchor="middle"
          >
            {formatValue(lastValue)}
          </text>
        )}

        {labelIndices.map((i) => (
          <text
            key={`label-${i}`}
            className="gt-axis-text"
            x={barX(i) + barW / 2}
            y={height - 6}
            textAnchor="middle"
          >
            {formatShortDate(points[i].date)}
          </text>
        ))}
      </svg>

      {activePoint && (
        <ChartTooltip
          x={barX(active as number) + barW / 2}
          width={width}
          label={formatShortDate(activePoint.date)}
          value={formatValue(activePoint.value ?? 0)}
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
