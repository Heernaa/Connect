/**
 * Botón base (R-006, R-002).
 *
 * Existe para que el objetivo táctil de 44×44px no dependa de que cada
 * pantalla se acuerde de escribirlo. Aquí está en `.ui-button`, en el CSS, y
 * todas las variantes salen de ella.
 *
 * Reglas que este componente hace cumplir:
 *
 * · `<button type="button">` por defecto. Un `<button>` sin `type` dentro de un
 *   formulario envía el formulario al pulsarlo, y en un formulario de registro
 *   eso sería un error silencioso con consecuencias reales.
 * · Si el botón es solo un icono, hay que pasarle `ariaLabel` (§4.2: los
 *   botones de solo icono llevan `aria-label`, en español).
 * · `disabled` de verdad, no `aria-disabled`: un botón deshabilitado de verdad
 *   no recibe foco, que es justo lo que se quiere.
 * · Si va a navegar, se usa un enlace (`NavLink`), no un botón con `onClick`:
 *   los enlaces se pueden abrir en otra pestaña y los lectores de pantalla los
 *   anuncian como enlaces.
 */
export function Button({
  children,
  variant = 'primary',
  type = 'button',
  disabled = false,
  ariaLabel,
  className = '',
  ...rest
}) {
  const variantClass = variant === 'secondary' ? 'ui-button--secondary' : 'ui-button--primary'

  return (
    <button
      type={type}
      className={`ui-button ${variantClass} ${className}`.trim()}
      disabled={disabled}
      aria-label={ariaLabel}
      {...rest}
    >
      {children}
    </button>
  )
}

export default Button
