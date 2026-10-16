import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App.jsx'
import { Router } from './router.jsx'
import { restoreTextScale } from './lib/textScale.js'
import './index.css'

// El tamaño de texto elegido se recupera **antes** de montar React, no después.
//
// Si se hiciera en un `useEffect`, la página se pintaría primero con el tamaño
// por defecto y luego saltaría al guardado. Con alguien que necesita el 200%,
// ese salto es justo el parpadeo que R-001 viene a evitar: parte de un 16px que
// no puede leer y termina en un 32px que sí.
restoreTextScale()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router>
      <App />
    </Router>
  </StrictMode>,
)
