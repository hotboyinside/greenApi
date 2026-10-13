import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { MockApp } from './dev/MockApp'
import { ToastProvider } from './components/Toast'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      {import.meta.env.DEV && import.meta.env.MODE === 'mock' ? (
        <MockApp />
      ) : (
        <App />
      )}
    </ToastProvider>
  </StrictMode>,
)
