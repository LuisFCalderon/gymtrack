import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
// Se importa por su efecto: engancha `beforeinstallprompt` antes de que React monte nada.
import './lib/install'
import { pedirPersistenciaAlArrancar } from './lib/storage'
import { applyTheme, readTheme } from './lib/theme'
import './styles.css'

applyTheme(readTheme())
registerSW({ immediate: true })
// Protege la libreta del desalojo automático cuando al dispositivo le falta espacio.
pedirPersistenciaAlArrancar()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
