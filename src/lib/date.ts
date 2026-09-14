/** Fecha local en formato ISO corto (YYYY-MM-DD), sin saltos de zona horaria. */
export function todayISO(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** 1 = lunes … 7 = domingo (getDay() devuelve 0 para domingo). */
export function weekdayOf(d: Date = new Date()): number {
  return d.getDay() === 0 ? 7 : d.getDay()
}

export function nowISO(): string {
  return new Date().toISOString()
}

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

/** "2026-09-14" → "14 Sep" */
export function formatShortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  const thisYear = new Date().getFullYear()
  const suffix = y === thisYear ? '' : ` ${y}`
  return `${String(d).padStart(2, '0')} ${MONTHS[m - 1]}${suffix}`
}

export function formatRelativeDate(iso: string): string {
  const today = todayISO()
  if (iso === today) return 'Hoy'
  const yesterday = todayISO(new Date(Date.now() - 86400000))
  if (iso === yesterday) return 'Ayer'
  return formatShortDate(iso)
}

/** Segundos → "45:30" o "1:05:30" */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

/** "45:30" o "45" (minutos) → segundos */
export function parseDuration(input: string): number | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  const parts = trimmed.split(':').map((p) => Number(p))
  if (parts.some((p) => Number.isNaN(p))) return null
  if (parts.length === 1) return Math.round(parts[0] * 60)
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return null
}
