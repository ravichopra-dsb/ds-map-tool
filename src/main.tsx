import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PGlite } from '@electric-sql/pglite'
import { live } from '@electric-sql/pglite/live'
import { PGliteProvider } from '@electric-sql/pglite-react'
import './index.css'
import App from './App.tsx'

// Initialize PGlite instance with live extension
const initializeApp = async () => {
  const db = await PGlite.create('idb://ds-map-tool',{
    extensions: { live }
  })

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <PGliteProvider db={db}>
        <App />
      </PGliteProvider>
    </StrictMode>,
  )
}

initializeApp()
