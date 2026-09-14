/** Números con coma decimal y sin ceros sobrantes: 62.5 → "62,5" */
export function num(value: number | null | undefined, decimals = 1): string {
  if (value == null || Number.isNaN(value)) return '—'
  const rounded = Number(value.toFixed(decimals))
  return rounded.toLocaleString('es-ES', { maximumFractionDigits: decimals })
}

export function kg(value: number | null | undefined): string {
  return value == null ? '—' : `${num(value)} kg`
}

export function liters(value: number | null | undefined): string {
  return value == null ? '—' : `${num(value, 2)} L`
}

/** Acepta "62,5" y "62.5". */
export function parseNumber(input: string): number | null {
  const normalized = input.trim().replace(',', '.')
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

export function parseInteger(input: string): number | null {
  const parsed = parseNumber(input)
  return parsed == null ? null : Math.round(parsed)
}

export function bmi(weightKg: number, heightCm: number): number | null {
  if (!weightKg || !heightCm) return null
  const heightM = heightCm / 100
  return weightKg / (heightM * heightM)
}

export function bmiLabel(value: number): string {
  if (value < 18.5) return 'Bajo peso'
  if (value < 25) return 'Normal'
  if (value < 30) return 'Sobrepeso'
  return 'Obesidad'
}

/** "1 sesión" / "2 sesiones" */
export function plural(count: number, singular: string, many: string): string {
  return `${count} ${count === 1 ? singular : many}`
}
