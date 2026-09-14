import { Link } from '../lib/router'

const ITEMS = [
  { to: '/', label: 'Hoy', icon: HomeIcon },
  { to: '/rutina', label: 'Rutina', icon: ListIcon },
  { to: '/historial', label: 'Historial', icon: ClockIcon },
  { to: '/progreso', label: 'Progreso', icon: ChartIcon },
  { to: '/ajustes', label: 'Ajustes', icon: GearIcon },
]

export default function BottomNav({ route }: { route: string }) {
  return (
    <nav className="nav">
      {ITEMS.map(({ to, label, icon: Icon }) => {
        const active = to === '/' ? route === '/' : route.startsWith(to)
        return (
          <Link key={to} to={to} className={active ? 'active' : undefined}>
            <Icon />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" {...stroke}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20h14V9.5" />
    </svg>
  )
}
function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" {...stroke}>
      <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
    </svg>
  )
}
function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" {...stroke}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.2 2" />
    </svg>
  )
}
function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" {...stroke}>
      <path d="M3 20h18" />
      <path d="M6 20v-6M11 20V7M16 20v-9M21 20v-4" />
    </svg>
  )
}
function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" {...stroke}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 14a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.2a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.8-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.5 13H3.3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 10 3.5V3.3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.2a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.3.9Z" />
    </svg>
  )
}
