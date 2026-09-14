import { formatShortDate } from '../../lib/date'
import { num } from '../../lib/format'

/** Un punto de cualquiera de las gráficas: fecha ISO + valor (null = sin dato). */
export type ChartPoint = {
  date: string
  value: number | null
  /** Marca el punto como "meta cumplida": cambia el color de la barra. */
  ok?: boolean
}

/** Escala redondeada a números limpios (0 · 2.000 · 4.000) para el eje vertical. */
export function niceScale(
  min: number,
  max: number,
  ticks = 3,
): { min: number; max: number; values: number[] } {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1, values: [0, 1] }
  if (max === min) {
    const pad = Math.abs(max) > 0 ? Math.abs(max) * 0.1 : 1
    min -= pad
    max += pad
  }
  const rawStep = (max - min) / Math.max(1, ticks)
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const normalized = rawStep / magnitude
  const factor =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 4 ? 4 : normalized <= 5 ? 5 : 10
  const step = factor * magnitude
  const niceMin = Math.floor(min / step) * step
  const niceMax = Math.ceil(max / step) * step
  const values: number[] = []
  // El redondeo binario deja restos (0,30000000000000004): se limpian al generar.
  for (let v = niceMin; v <= niceMax + step / 2; v += step) values.push(Number(v.toFixed(6)))
  return { min: niceMin, max: niceMax, values }
}

/** Miles abreviados para el eje: 12.400 → "12,4k". */
export function compactNum(value: number): string {
  if (Math.abs(value) >= 1000) return `${num(value / 1000, 1)}k`
  return num(value, Number.isInteger(value) ? 0 : 1)
}

/** Índices de las etiquetas del eje horizontal que caben sin solaparse. */
export function pickLabelIndices(count: number, plotWidth: number, labelWidth = 46): number[] {
  if (count <= 0) return []
  const fit = Math.max(1, Math.floor(plotWidth / labelWidth))
  const step = Math.max(1, Math.ceil(count / fit))
  const indices: number[] = []
  for (let i = count - 1; i >= 0; i -= step) indices.push(i)
  return indices.reverse()
}

/** Ancho aproximado del eje vertical según la etiqueta más larga. */
export function axisWidth(labels: string[]): number {
  const longest = labels.reduce((acc, label) => Math.max(acc, label.length), 1)
  return Math.min(56, Math.max(26, longest * 6 + 10))
}

/** Barra con las esquinas superiores redondeadas y la base recta sobre el eje. */
export function roundedTopRect(x: number, y: number, w: number, h: number, r = 4): string {
  const radius = Math.max(0, Math.min(r, w / 2, h))
  return [
    `M${x} ${y + h}`,
    `L${x} ${y + radius}`,
    `Q${x} ${y} ${x + radius} ${y}`,
    `L${x + w - radius} ${y}`,
    `Q${x + w} ${y} ${x + w} ${y + radius}`,
    `L${x + w} ${y + h}`,
    'Z',
  ].join(' ')
}

/** Resumen en texto de la serie: es el aria-label de la gráfica. */
export function describeSeries(
  title: string,
  points: ChartPoint[],
  formatValue: (value: number) => string,
): string {
  const known = points.filter((p): p is ChartPoint & { value: number } => p.value != null)
  if (known.length === 0) return `${title}: sin datos.`
  const first = known[0]
  const last = known[known.length - 1]
  const values = known.map((p) => p.value)
  const max = Math.max(...values)
  const min = Math.min(...values)
  const trend =
    known.length < 2 || last.value === first.value
      ? 'sin cambios'
      : last.value > first.value
        ? 'tendencia al alza'
        : 'tendencia a la baja'
  return (
    `${title}: ${known.length} registros del ${formatShortDate(first.date)} al ${formatShortDate(last.date)}. ` +
    `De ${formatValue(first.value)} a ${formatValue(last.value)}, ${trend}. ` +
    `Mínimo ${formatValue(min)}, máximo ${formatValue(max)}.`
  )
}
