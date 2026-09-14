import { useEffect, useRef, type ReactNode } from 'react'
import { back } from '../lib/router'

export function TopBar(props: { title: string; subtitle?: string; onBack?: boolean; action?: ReactNode }) {
  return (
    <header className="topbar">
      {props.onBack && (
        <button className="btn-icon" onClick={() => back()} aria-label="Volver">
          <BackIcon />
        </button>
      )}
      <div className="grow">
        <h1>{props.title}</h1>
        {props.subtitle && <div className="sub">{props.subtitle}</div>}
      </div>
      {props.action}
    </header>
  )
}

export function Sheet(props: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') props.onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [props])

  return (
    <div
      className="sheet-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) props.onClose()
      }}
    >
      <div className="sheet" ref={ref} role="dialog" aria-modal="true" aria-label={props.title}>
        <div className="sheet-handle" />
        <div className="row-between">
          <h2>{props.title}</h2>
          <button className="btn-icon" onClick={props.onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>
        {props.children}
      </div>
    </div>
  )
}

export function Confirm(props: {
  title: string
  message?: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Sheet title={props.title} onClose={props.onCancel}>
      {props.message && <p className="muted small">{props.message}</p>}
      <div className="row">
        <button className="grow btn-outline" onClick={props.onCancel}>
          Cancelar
        </button>
        <button className="grow btn-primary" onClick={props.onConfirm}>
          {props.confirmLabel ?? 'Eliminar'}
        </button>
      </div>
    </Sheet>
  )
}

export function Empty(props: { children: ReactNode }) {
  return <div className="empty">{props.children}</div>
}

export function Metric(props: { value: ReactNode; label: string }) {
  return (
    <div className="metric">
      <div className="value">{props.value}</div>
      <div className="label">{props.label}</div>
    </div>
  )
}

export function ProgressBar(props: { value: number; max: number }) {
  const pct = props.max > 0 ? Math.min(100, (props.value / props.max) * 100) : 0
  return (
    <div className={`bar${pct >= 100 ? ' ok' : ''}`}>
      <div style={{ width: `${pct}%` }} />
    </div>
  )
}

function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}
