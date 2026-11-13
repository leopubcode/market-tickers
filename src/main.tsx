import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { VaultGate } from './features/vault/VaultGate.tsx'
import { AppServicesProvider } from './session/AppServices.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <VaultGate>
      <AppServicesProvider>
        <App />
      </AppServicesProvider>
    </VaultGate>
  </StrictMode>,
)
