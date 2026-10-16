import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { es } from '../../i18n/es.js'
import { TextField } from './TextField.jsx'
import { StatusIndicator } from './StatusIndicator.jsx'
import { ErrorMessage } from './ErrorMessage.jsx'

/**
 * Los componentes base y lo que la spec exige de ellos (R-004, R-006, R-009).
 *
 * Estos son los componentes de los que heredarán los tres juegos, así que aquí
 * se comprueba lo que la spec pide de forma expresa, no lo que el componente
 * resulta que hace.
 */

describe('TextField (R-006, R-009)', () => {
  it('asocia la etiqueta al campo', () => {
    // Un campo sin etiqueta asociada se anuncia como «campo de texto, en
    // blanco»: no sirve para nada.
    render(<TextField label={es.login.usernameLabel} value="" onChange={() => {}} />)

    const field = screen.getByLabelText(new RegExp(es.login.usernameLabel))

    expect(field).toBeInTheDocument()
    expect(field).toHaveAttribute('aria-required', 'true')
  })

  it('conecta la pista de ayuda con aria-describedby', () => {
    // La ayuda explica cómo escribir la contraseña. Si no está conectada, al
    // enfocar el campo no se oye: quien está tecleando necesita oírla *antes*
    // de equivocarse.
    render(
      <TextField
        label={es.register.passwordLabel}
        hint={es.register.passwordHint}
        value=""
        onChange={() => {}}
      />,
    )

    const hint = screen.getByText(es.register.passwordHint)
    const field = screen.getByLabelText(new RegExp(es.register.passwordLabel))

    expect(field).toHaveAttribute('aria-describedby', hint.id)
  })

  it('marca el campo como inválido y anuncia el error', () => {
    // El color del borde avisa a quien ve; `aria-invalid` avisa a quien no ve.
    // Sin los dos, el estado depende de la vista (R-004, R-009).
    render(
      <TextField
        label={es.login.passwordLabel}
        error={es.errors.passwordRequired}
        value=""
        onChange={() => {}}
      />,
    )

    const field = screen.getByLabelText(new RegExp(es.login.passwordLabel))
    const error = screen.getByRole('alert')

    expect(field).toHaveAttribute('aria-invalid', 'true')
    expect(error).toHaveTextContent(es.errors.passwordRequired)
    expect(field).toHaveAttribute('aria-describedby', error.id)
  })

  it('no marca el campo como inválido cuando no hay error', () => {
    render(<TextField label={es.login.usernameLabel} value="" onChange={() => {}} />)

    const field = screen.getByLabelText(new RegExp(es.login.usernameLabel))

    expect(field).not.toHaveAttribute('aria-invalid')
  })

  it('no usa el atributo required de HTML', () => {
    // El navegador pinta su propio mensaje de error, en el idioma del navegador
    // y sin control. Aquí los mensajes son del diccionario (R-009).
    render(<TextField label={es.login.usernameLabel} value="" onChange={() => {}} />)

    // Se mira el atributo directamente: el matcher `toBeRequired` de jest-dom
    // también considera `aria-required`, que aquí sí está a propósito.
    expect(screen.getByLabelText(new RegExp(es.login.usernameLabel))).not.toHaveAttribute('required')
  })

  it('escribe lo que se teclea', async () => {
    const user = userEvent.setup()
    const written = []

    render(
      <TextField
        label={es.login.usernameLabel}
        value=""
        onChange={(event) => written.push(event.target.value)}
      />,
    )

    await user.type(screen.getByLabelText(new RegExp(es.login.usernameLabel)), 'ana')

    expect(written.join('')).toBe('ana')
  })

  it('da un id distinto a cada campo montado a la vez', () => {
    // Si el id fuera fijo, dos campos en la misma pantalla apuntarían al mismo
    // `for` y el segundo se anunciaría con la etiqueta del primero.
    render(
      <>
        <TextField label={es.login.usernameLabel} value="" onChange={() => {}} />
        <TextField label={es.login.passwordLabel} value="" onChange={() => {}} />
      </>,
    )

    const username = screen.getByLabelText(new RegExp(es.login.usernameLabel))
    const password = screen.getByLabelText(new RegExp(es.login.passwordLabel))

    expect(username.id).not.toBe(password.id)
  })
})

describe('StatusIndicator (R-004)', () => {
  it('pinta el texto, el icono y el color a la vez', () => {
    // Tres canales a la vez (R-004): si se quita el color —impresión en blanco y
    // negro, daltonismo— el icono y la frase siguen distinguiendo el estado.
    const { container } = render(<StatusIndicator tone="success">{es.games.played}</StatusIndicator>)

    expect(screen.getByText(es.games.played)).toBeVisible()
    expect(container.querySelector('.ui-status__icon')).toHaveTextContent('✓')
  })

  it('el icono que acompaña a la frase está oculto al lector de pantalla', () => {
    const { container } = render(<StatusIndicator tone="danger">{es.errors.title}</StatusIndicator>)
    const icon = container.querySelector('.ui-status__icon')

    expect(icon).toHaveAttribute('aria-hidden', 'true')
  })

  it('sigue entendiéndose sin color', () => {
    // El texto es el canal que no falla: con daltonismo, en una pantalla en
    // blanco y negro o sin CSS, el estado sigue siendo legible.
    render(<StatusIndicator tone="warning">{es.service.databaseUnreachable}</StatusIndicator>)

    expect(screen.getByText(es.service.databaseUnreachable)).toBeVisible()
  })

  it.each(['success', 'danger', 'warning', 'brand', 'neutral'])(
    'no rompe con el tono «%s»',
    (tone) => {
      render(<StatusIndicator tone={tone}>{es.common.yes}</StatusIndicator>)

      expect(screen.getByText(es.common.yes)).toBeInTheDocument()
    },
  )
})

describe('ErrorMessage (R-009)', () => {
  it('se anuncia en cuanto aparece', () => {
    // `role="alert"` hace que un lector de pantalla lo lea sin que quien esté
    // usando la pantalla tenga que ir a buscarlo.
    render(<ErrorMessage>{es.errors.network}</ErrorMessage>)

    expect(screen.getByRole('alert')).toHaveTextContent(es.errors.network)
  })

  it('enseña el mensaje del servidor tal cual, sin añadirle nada', () => {
    const serverMessage = 'Ese nombre de usuario ya está en uso. Prueba con otro.'

    render(<ErrorMessage>{serverMessage}</ErrorMessage>)

    expect(screen.getByRole('alert')).toHaveTextContent(serverMessage)
  })

  it('ofrece reintentar solo cuando hay algo que reintentar', async () => {
    const user = userEvent.setup()
    let attempts = 0

    const { rerender } = render(<ErrorMessage>{es.errors.network}</ErrorMessage>)

    expect(screen.queryByRole('button', { name: es.common.retry })).not.toBeInTheDocument()

    rerender(
      <ErrorMessage retryLabel={es.common.retry} onRetry={() => { attempts += 1 }}>
        {es.errors.contentUnexpected}
      </ErrorMessage>,
    )

    await user.click(screen.getByRole('button', { name: es.common.retry }))

    expect(attempts).toBe(1)
  })
})
