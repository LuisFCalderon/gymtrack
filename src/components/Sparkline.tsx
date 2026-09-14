/** Gráfica sencilla de evolución: sin librerías, legible en móvil. */
export default function Sparkline({
  points,
  unit = '',
}: {
  points: { label: string; value: number | null }[]
  unit?: string
}) {
  const values = points.filter((p): p is { label: string; value: number } => p.value != null)
  if (values.length < 2) return null

  const width = 300
  const height = 110
  const padX = 6
  const padY = 14
  const min = Math.min(...values.map((p) => p.value))
  const max = Math.max(...values.map((p) => p.value))
  const span = max - min || 1

  const x = (i: number) => padX + (i * (width - padX * 2)) / (values.length - 1)
  const y = (value: number) => padY + (1 - (value - min) / span) * (height - padY * 2)

  const path = values.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ')
  const last = values[values.length - 1]

  return (
    <svg className="chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img"
      aria-label={`Evolución: de ${values[0].value} a ${last.value} ${unit}`}>
      <line className="grid" x1={padX} y1={y(max)} x2={width - padX} y2={y(max)} />
      <line className="grid" x1={padX} y1={y(min)} x2={width - padX} y2={y(min)} />
      <path className="line" d={path} vectorEffect="non-scaling-stroke" />
      {values.map((p, i) => (
        <circle key={`${p.label}-${i}`} className="dot" cx={x(i)} cy={y(p.value)} r={i === values.length - 1 ? 3.5 : 2} />
      ))}
    </svg>
  )
}
