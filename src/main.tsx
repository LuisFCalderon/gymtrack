import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
// Se importa por su efecto: engancha `beforeinstallprompt` antes de que React monte nada.
import './lib/install'
import { applyTheme, readTheme } from './lib/theme'
import './styles.css'

applyTheme(readTheme())
registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
