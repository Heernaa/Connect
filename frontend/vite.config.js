import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // El host se abre para que se pueda alcanzar desde el exterior del
    // contenedor, no solo desde dentro de él.
    host: true,
    port: 5173,
    proxy: {
      // El frontend habla con la API por su propia ruta `/api` y Vite reenvía
      // la petición al backend. Así el código no necesita saber en qué host
      // está la API, y en desarrollo no hay CORS ni doble configuración (§2.5).
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})