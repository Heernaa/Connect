import { useEffect, useRef } from 'react'

import { Layout } from './components/Layout.jsx'
import { GamesPage } from './pages/GamesPage.jsx'
import { HomePage } from './pages/HomePage.jsx'
import { LoginPage } from './pages/LoginPage.jsx'
import { RegisterPage } from './pages/RegisterPage.jsx'
import { UpcomingPage } from './pages/UpcomingPage.jsx'
import { useSession } from './hooks/useSession.js'
import { es } from './i18n/es.js'
import { useRouter } from './lib/navigation.js'

/**
 * Raíz de la aplicación: elige la pantalla y mantiene el esqueleto común (R-011).
 *
 * Las cuatro pantallas de la spec —portada, lista de juegos, registro y login—
 * comparten `Layout`, así que todas tienen el mismo esqueleto: enlace de salto,
 * cabecera, navegación, `main` y pie (R-011).
 *
 * **Un hash desconocido lleva a la portada, no a una pantalla de error.** Es
 * una decisión, no un descuido: el producto no puede tener callejones sin salida
 * (§2.1.6), y quien llega a un enlace mal escrito debe acabar en un sitio donde
 * puede volver a empezar, no leyendo un «esta página no existe» que no le lleva
 * a ninguna parte.
 */
export default function App() {
  const { route } = useRouter()
  const session = useSession()
  const mainRef = useRef(null)

  // Al cambiar de vista, el foco va a `main` (R-005).
  //
  // Sin esto, quien navega con teclado se queda con el foco en el enlace que
  // pulsó, arriba: el contenido nuevo se sustituye debajo y no hay ninguna
  // manera de saber que ha cambiado de sitio. Con lector de pantalla es peor:
  // se oye la página nueva sin ninguna pista de dónde se está.
  //
  // **Solo al cambiar de pantalla, nunca en la primera carga.** Al abrir la
  // página el foco se queda donde el navegador lo puso, al principio del
  // documento, para que el primer tabulador llegue al enlace de salto. Si se
  // moviera a `main` al entrar, ese enlace sería inalcanzable con el teclado
  // justo en la primera visita, que es cuando más falta hace.
  //
  // Se compara con la ruta anterior en vez de con un «¿es el primer render?»:
  // en desarrollo, `StrictMode` monta, desmonta y vuelve a montar los efectos,
  // así que una bandera de primera vez se gastaría en el primer montaje y el
  // segundo ya movería el foco. Comparar rutas no depende de cuántas veces se
  // ejecute el efecto.
  const previousPath = useRef(route.path)

  useEffect(() => {
    if (previousPath.current === route.path) return undefined

    previousPath.current = route.path

    // Se espera un frame a propósito: en el mismo instante del cambio de ruta,
    // `main` todavía es el de la pantalla anterior, y el foco se perdería en un
    // elemento que ya no existe.
    const frame = requestAnimationFrame(() => {
      mainRef.current?.focus()
    })

    return () => cancelAnimationFrame(frame)
  }, [route.path])

  // El título del documento sigue a la ruta: la pestaña del navegador dice
  // dónde está la persona, y quien cambia de pestaña no aterriza en «Documento
  // sin título» (R-005). El texto sale del diccionario (§4.2).
  useEffect(() => {
    document.title = route.title
  }, [route.title])

  return (
    <Layout route={route} session={session} mainRef={mainRef}>
      {route.kind === 'home' && <HomePage />}
      {route.kind === 'games' && <GamesPage />}
      {route.kind === 'register' && <RegisterPage onRegistered={session.setUser} />}
      {route.kind === 'login' && <LoginPage onSignedIn={session.setUser} />}
      {route.kind === 'leaderboard' && (
        <UpcomingPage heading={es.upcoming.leaderboard.heading} intro={es.upcoming.leaderboard.intro} />
      )}
    </Layout>
  )
}
