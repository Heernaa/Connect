import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../App.jsx'
import { es } from '../i18n/es.js'
import { Router } from '../router.jsx'

/**
 * Las cuatro pantallas de la spec, montadas como las monta la aplicación (R-011).
 *
 * Se prueba la pantalla entera y no cada trozo, porque los requisitos de esta
 * spec son de página: el mismo esqueleto en las cuatro, los encabezados
 * jerárquicos, el `main` que recibe el foco y el mensaje cuando la API falla.
 *
 * La API se sustituye por `fetch` simulado: estas pruebas no necesitan un
 * servidor, y dependen de lo que el cliente hace con la respuesta, no de lo que
 * el servidor devuelve.
 */
function renderApp(hash = '') {
  window.location.hash = hash

  return render(
    <Router>
      <App />
    </Router>,
  )
}

/** Respuesta simulada de la API. */
function jsonResponse(body, { status = 200 } = {}) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  })
}

/** API simulada: salud Connected, catálogo con dos juegos, sin sesión. */
function stubApi({ games } = {}) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
    if (url.includes('/health')) {
      return jsonResponse({ status: 'ok', database: 'connected' })
    }

    if (url.includes('/auth/me')) {
      return jsonResponse({ message: es.errors.formUnexpected }, { status: 401 })
    }

    if (url.includes('/games')) {
      return jsonResponse(
        games ?? [
          {
            game_id: 'wordle',
            name: 'Wordle',
            description: 'Adivina la palabra de cinco letras.',
            played: false,
            score: 0,
          },
          {
            game_id: 'paraulogic',
            name: 'Paraulógic',
            description: 'Encuentra todas las palabras.',
            played: false,
            score: 0,
          },
        ],
      )
    }

    return jsonResponse({}, { status: 404 })
  })
}

describe('pantallas base (R-011)', () => {
  beforeEach(() => {
    window.location.hash = ''
    stubApi()
  })

  it.each([
    ['portada', '', es.home.heading],
    ['lista de juegos', '#/games', es.games.heading],
    ['registro', '#/register', es.register.heading],
    ['login', '#/login', es.login.heading],
  ])('la pantalla «%s» tiene el mismo esqueleto', async (_label, hash, heading) => {
    renderApp(hash)

    // El mismo esqueleto en las cuatro: un `main`, un `h1` y un pie. Es lo que
    // hace que la segunda pantalla se sienta conocida (R-011).
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(heading)
  })

  it('la portada ofrece el registro, el login y la clasificación', async () => {
    renderApp('')

    expect(screen.getByRole('link', { name: es.home.ctaRegister })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: es.home.ctaLogin })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: es.home.ctaLeaderboard })).toBeInTheDocument()
  })

  it('el enlace de salto es el primer elemento enfocable', async () => {
    renderApp('')

    // Va el primero del DOM: si estuviera al final, habría que recorrer la
    // cabecera entera en cada página para llegar al contenido (R-005).
    const skipLink = screen.getByRole('link', { name: es.accessibility.skipToContent })
    const links = screen.getAllByRole('link')

    expect(links[0]).toBe(skipLink)
    expect(skipLink).toHaveAttribute('href', '#main-content')
  })

  it('marca la página en la que se está', async () => {
    renderApp('#/games')

    // `aria-current="page"` es lo que anuncia el lector de pantalla. El fondo
    // cian solo lo refuerza: el color nunca es el único canal (R-004).
    expect(screen.getByRole('link', { name: es.nav.games })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: es.nav.home })).not.toHaveAttribute('aria-current')
  })

  it('lleva el foco al contenido al cambiar de pantalla', async () => {
    const user = userEvent.setup()

    renderApp('')

    await user.click(screen.getByRole('link', { name: es.nav.games }))

    // Sin esto, quien navega con teclado se queda con el foco en el enlace de
    // arriba y no sabe que el contenido se ha sustituido debajo (R-005).
    expect(await screen.findByRole('heading', { level: 1, name: es.games.heading })).toBeInTheDocument()

    // El foco se mueve en el siguiente fotograma, a propósito: hay que esperar
    // a que pase, y comprobarlo de golpe daría un falso negativo.
    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByRole('main'))
    })
  })

  it('el título del documento sigue a la pantalla', async () => {
    renderApp('#/login')

    expect(document.title).toContain(es.app.name)
  })

  it('un enlace desconocido lleva a la portada, no a un error', async () => {
    // El producto no puede tener callejones sin salida (§2.1.6). Quien llega a
    // un enlace mal escrito debe acabar en un sitio donde puede seguir.
    renderApp('#/no-existe')

    expect(screen.getByRole('heading', { level: 1, name: es.home.heading })).toBeInTheDocument()
  })
})

describe('lista de juegos (R-011, R-013)', () => {
  it.each([
    ['wordle', 'Wordle', 'Adivina la palabra de cinco letras.'],
    ['paraulogic', 'Paraulógic', 'Encuentra todas las palabras.'],
  ])('enseña %s con su descripción, que viene de la API', async (_id, name, description) => {
    stubApi()
    renderApp('#/games')

    expect(await screen.findByRole('heading', { name })).toBeInTheDocument()
    expect(screen.getByText(description)).toBeInTheDocument()
  })

  it('enseña el estado con texto, no solo con color', async () => {
    // R-011 pide nombre, descripción y estado. Y el estado no puede ser solo
    // una mancha de color: tiene que haber palabras (R-004).
    stubApi()
    renderApp('#/games')

    await screen.findByRole('heading', { name: 'Wordle' })

    expect(screen.getAllByText(new RegExp(es.games.notPlayed)).length).toBeGreaterThan(0)

    // R-014: el botón es un **enlace** y lleva a la pantalla del juego. Antes
    // era un `<button>` que no llevaba a ninguna parte.
    const jugar = screen.getAllByRole('link', { name: es.games_ui.play })

    expect(jugar).toHaveLength(2)
    expect(jugar[0]).toHaveAttribute('href', '#/game/wordle')
  })

  it('avisa con un mensaje claro si la API devuelve algo que no cuadra', async () => {
    // R-013: datos inválidos producen un mensaje, no una pantalla rota.
    stubApi({ games: [{ game_id: 'wordle' }] })
    renderApp('#/games')

    const alert = await screen.findByRole('alert')

    expect(alert).toHaveTextContent(es.errors.contentUnexpected)
    expect(alert).not.toHaveTextContent('undefined')
  })

  it('avisa si el servidor no responde', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      if (url.includes('/games')) return Promise.reject(new TypeError('failed to fetch'))
      if (url.includes('/auth/me')) return jsonResponse({}, { status: 401 })
      return jsonResponse({ status: 'ok', database: 'connected' })
    })

    renderApp('#/games')

    expect(await screen.findByRole('alert')).toHaveTextContent(es.errors.network)
  })

  it('dice que no hay juegos en vez de mostrar una lista vacía', async () => {
    stubApi({ games: [] })
    renderApp('#/games')

    expect(await screen.findByText(es.games.empty)).toBeInTheDocument()
  })
})

describe('registro (R-011, R-009)', () => {
  it('explica qué falta antes de enviar nada', async () => {
    const user = userEvent.setup()

    renderApp('#/register')

    await user.click(screen.getByRole('button', { name: es.register.submit }))

    expect(await screen.findByText(es.errors.usernameRequired)).toBeInTheDocument()
    expect(screen.getByText(es.errors.passwordRequired)).toBeInTheDocument()
    expect(screen.getByText(es.errors.passwordConfirmationRequired)).toBeInTheDocument()
  })

  it('avisa de que las dos contraseñas no coinciden', async () => {
    const user = userEvent.setup()

    renderApp('#/register')

    await user.type(screen.getByLabelText(new RegExp(es.register.usernameLabel)), 'ana')
    await user.type(screen.getByLabelText(new RegExp(es.register.passwordLabel)), 'una frase')
    await user.type(screen.getByLabelText(new RegExp(es.register.passwordConfirmLabel)), 'otra')
    await user.click(screen.getByRole('button', { name: es.register.submit }))

    expect(await screen.findByText(es.errors.passwordConfirmationMismatch)).toBeInTheDocument()
  })

  it('enseña el alias que genera el servidor, sin inventar nada', async () => {
    const user = userEvent.setup()

    globalThis.fetch.mockImplementation((url) => {
      if (url.includes('/auth/register')) {
        return jsonResponse({ username: 'ana', alias: 'LoboTranquilo' }, { status: 201 })
      }
      return stubApiDefault(url)
    })

    renderApp('#/register')

    await user.type(screen.getByLabelText(new RegExp(es.register.usernameLabel)), 'ana')
    await user.type(screen.getByLabelText(new RegExp(es.register.passwordLabel)), 'una frase')
    await user.type(screen.getByLabelText(new RegExp(es.register.passwordConfirmLabel)), 'una frase')
    await user.click(screen.getByRole('button', { name: es.register.submit }))

    // El alias viene del servidor: aquí no hay ni una palabra escrita a mano
    // (§2.1.2), y el texto de la pantalla lo pone el diccionario.
    //
    // Aparece dos veces y está bien: una en la confirmación y otra en la
    // cabecera, que ya dice con quién se ha entrado.
    const withAlias = await screen.findAllByText(/LoboTranquilo/)

    expect(withAlias.length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: es.register.successAction })).toBeInTheDocument()
  })
})

describe('login (R-011, R-009)', () => {
  it('no pide una contraseña de ocho caracteres para entrar', async () => {
    // Si alguien que ya tiene cuenta se equivoca al teclear, el mensaje que
    // necesita es «falta la contraseña», no «necesita al menos 8 caracteres».
    // Un mensaje distinto según el fallo es lo que permite anotar qué cuentas
    // existen (§6.3).
    const user = userEvent.setup()

    renderApp('#/login')

    await user.type(screen.getByLabelText(new RegExp(es.login.usernameLabel)), 'ana')
    await user.click(screen.getByRole('button', { name: es.login.submit }))

    expect(await screen.findByText(es.errors.passwordRequired)).toBeInTheDocument()
    expect(screen.queryByText(es.errors.passwordTooShort)).not.toBeInTheDocument()
  })

  it('enseña el mensaje del servidor tal cual', async () => {
    const user = userEvent.setup()
    const serverMessage = 'El usuario o la contraseña no son correctos.'

    globalThis.fetch.mockImplementation((url) => {
      if (url.includes('/auth/login')) return jsonResponse({ message: serverMessage }, { status: 401 })
      return stubApiDefault(url)
    })

    renderApp('#/login')

    await user.type(screen.getByLabelText(new RegExp(es.login.usernameLabel)), 'ana')
    await user.type(screen.getByLabelText(new RegExp(es.login.passwordLabel)), 'una frase')
    await user.click(screen.getByRole('button', { name: es.login.submit }))

    expect(await screen.findByRole('alert')).toHaveTextContent(serverMessage)
  })
})

/** API simulada mínima para las peticiones que no son el objeto del test. */
function stubApiDefault(url) {
  if (url.includes('/health')) return jsonResponse({ status: 'ok', database: 'connected' })
  if (url.includes('/auth/me')) return jsonResponse({}, { status: 401 })
  if (url.includes('/games')) return jsonResponse([])

  return jsonResponse({}, { status: 404 })
}
