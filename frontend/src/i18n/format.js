/**
 * Relleno de textos del diccionario (R-007, §4.2).
 *
 * Los textos con huecos se escriben en el diccionario con `{nombre}`, no
 * concatenando fragmentos sueltos. Concatenar rompe en cuanto haya otro idioma:
 * el orden de las palabras cambia y el texto deja de ser una frase. Aquí se
 * sustituye el hueco por su valor y se conserva la frase entera.
 */
export function format(template, values) {
  return Object.entries(values ?? {}).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template,
  )
}

export default format