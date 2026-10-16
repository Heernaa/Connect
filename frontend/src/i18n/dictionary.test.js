// @vitest-environment node

/**
 * Ninguna cadena de texto de la interfaz se escribe dentro de un componente
 * (R-007, §4.2, tarea 6.13 del plan).
 *
 * La constitución lo pide expresamente: «toda cadena de texto visible en la UI va
 * al diccionario, nunca hardcodeada en un componente». Este test lo comprueba
 * sobre el código real, para que la regla no dependa de que alguien se acuerde
 * al añadir una pantalla.
 *
 * Cómo funciona, y por qué así:
 *
 * · Se recorre todo `src` menos el propio test, el diccionario y los archivos de
 *   diseño. El diccionario **es** el sitio donde el texto vive; `design/` es
 *   documentación con motivos escritos en español que no se pinta en ninguna
 *   parte.
 * · Antes de mirar nada se quitan los comentarios y los `className`. Este
 *   proyecto comenta en español y casi todo el texto está ahí: sin quitarlos,
 *   el test daría cientos de falsos positivos y nadie lo miraría dos veces.
 * · Se buscan dos formas de escribir texto: una cadena entre comillas con
 *   palabras españolas, y texto suelto entre etiquetas de JSX.
 * · No se comprueba que el texto *esté* en el diccionario. Se comprueba que no
 *   haya texto **escrito a mano** en un componente, que es lo que la spec
 *   prohíbe, y eso se puede comprobar leyendo el código.
 *
 * Sobre los falsos positivos: se distinguen dos tipos de palabra. Una palabra
 * «fuerte» (`contraseña`, `página`, `juego`) casi nunca aparece en código. Una
 * «débil» (`de`, `que`, `una`) aparece en identificadores y en atributos como
 * `aria-label="que-puedes-hacer"`, así que por sí sola no señala nada: hacen
 * falta dos. Un detector que avisa de todo no lo lee nadie.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { es } from './es.js'

const SRC_ROOT = fileURLToPath(new URL('..', import.meta.url))

/** Extensiones que contienen interfaz. */
const SOURCE_EXTENSIONS = new Set(['.js', '.jsx'])

/** Carpetas que no contienen componentes de interfaz. */
const SKIPPED_DIRECTORIES = new Set([
  'test',
  'node_modules',
  // `design/` documenta en español el motivo de cada par de colores. No pinta
  // nada en pantalla: es documentación de código, no texto de interfaz.
  'design',
])

/** Palabras que casi nunca aparecen fuera de una frase en español. */
const STRONG_WORDS = new Set([
  'hogar', 'juego', 'juegos', 'cuenta', 'contraseña', 'contraseñas', 'usuario',
  'palabra', 'palabras', 'letra', 'letras', 'pista', 'pistas', 'error', 'errores',
  'página', 'páginas', 'pantalla', 'texto', 'tamaño', 'entrar', 'entra', 'salir',
  'volver', 'crear', 'borrar', 'cambiar', 'guardar', 'comprobar', 'espera',
  'vuelve', 'vuelve a', 'clasificación', 'registro', 'acceder', 'nombre',
])

/** Palabras funcionales: dos o más ya delatan una frase. */
const WEAK_WORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
  'de', 'del', 'con', 'para', 'por', 'que', 'se', 'su', 'sus', 'es', 'son',
  'y', 'o', 'a', 'al', 'tu', 'tus', 'te', 'no', 'si', 'más', 'muy', 'todo',
  'esta', 'este', 'esto', 'aún', 'ya', 'le', 'lo', 'ni', 'ha', 'hay', 'como',
  'pero', 'muy', 'sin', 'donde', 'cuando',
])

/**
 * Quita comentarios y `className`, que es donde se cuelan falsos positivos.
 *
 * Es un borrado simple, no un analizador de JavaScript: basta con que las
 * palabras de los comentarios y de las clases CSS desaparezcan. Los huecos se
 * rellenan con espacios para no juntar dos palabras que en el código estaban
 * separadas.
 */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (block) => ' '.repeat(block.length))
    .replace(/(^|[^:])\/\/[^\n]*/g, (line) => ' '.repeat(line.length))
}

function stripClassNames(source) {
  return source.replace(
    /className\s*=\s*(?:"[^"]*"|\{`[^`]*`\}|\{[^}]*\})/g,
    (match) => ' '.repeat(match.length),
  )
}

/** Archivos de `src` que se revisan. */
function sourceFiles(directory = SRC_ROOT) {
  const found = []

  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry)

    if (statSync(fullPath).isDirectory()) {
      if (SKIPPED_DIRECTORIES.has(entry)) continue

      found.push(...sourceFiles(fullPath))
      continue
    }

    if (!SOURCE_EXTENSIONS.has(extname(entry))) continue
    if (entry.endsWith('.test.js') || entry.endsWith('.test.jsx')) continue
    // El diccionario es el sitio donde el texto vive: aquí sí tiene que estar.
    if (relative(SRC_ROOT, fullPath).startsWith(`i18n${sep}`)) continue

    found.push(fullPath)
  }

  return found
}

/**
 * Cadenas entre comillas simples, dobles o plantillas.
 *
 * Se descartan las que no parecen texto: una ruta de importación, un nombre de
 * evento, un identificador de test. Solo se queda lo que tiene letras y espacios
 * como una frase.
 */
function quotedStringCandidates(source) {
  const candidates = []
  const pattern = /'([^'\n]*)'|"([^"\n]*)"|`([^`]*)`/g
  let match = pattern.exec(source)

  while (match !== null) {
    const value = (match[1] ?? match[2] ?? match[3] ?? '').trim()

    if (looksLikeSentence(value)) candidates.push({ text: value, index: match.index })

    match = pattern.exec(source)
  }

  return candidates
}

/**
 * Texto suelto dentro de JSX: `>Hola</p>` o `> Hola <`.
 *
 * Solo se miran los trozos de texto que están **entre etiquetas**, que es donde
 * un texto hardcodeado se cuela. Además el trozo tiene que estar en una sola
 * línea y no parecerse a una expresión de JavaScript: el patrón `>([^<>{}]*)<`
 * también capturaría cosas como `=> onChange(...)`, y un detector que se
 * dispara con su propia sintaxis no sirve de nada.
 */
function jsxTextCandidates(source) {
  const candidates = []
  const pattern = />([^<>{}]*[^\s<>{}])<(?![a-zA-Z/!])/g
  let match = pattern.exec(source)

  while (match !== null) {
    const value = match[1].trim()

    if (looksLikeSentence(value)) candidates.push({ text: value, index: match.index })

    match = pattern.exec(source)
  }

  return candidates
}

/** ¿El trozo parece una frase y no un identificador? */
function looksLikeSentence(value) {
  if (value.length < 6 || value.length > 200) return false
  // Sin saltos de línea: una frase de interfaz cabe en una.
  if (value.includes('\n')) return false
  // Sin sintaxis de código.
  if (/[=(){};\\/<>|&*#@$[\]]/.test(value)) return false

  return /[a-záéíóúñü]{2,}/i.test(value)
}

/**
 * Cuenta las palabras españolas de un trozo.
 *
 * @returns {{ strong: string[], weak: string[] }}
 */
function spanishWordsIn(text) {
  const words = (text.toLowerCase().match(/[a-záéíóúñü]+/g) ?? []).filter((word) => word.length > 1)

  return {
    strong: words.filter((word) => STRONG_WORDS.has(word)),
    weak: words.filter((word) => WEAK_WORDS.has(word)),
  }
}

/** ¿El trozo es una frase en español y no un identificador? */
function isSpanishPhrase(text) {
  const { strong, weak } = spanishWordsIn(text)

  return strong.length > 0 || weak.length >= 2
}

describe('diccionario de textos (R-007)', () => {
  const files = sourceFiles()

  it('ha encontrado archivos que revisar', () => {
    // Si el recorrido fallara y no encontrara nada, el resto de tests pasarían
    // en verde sin haber comprobado nada. Esta aserción es la que lo evita.
    expect(files.length).toBeGreaterThan(10)
  })

  it.each(files.map((file) => [relative(SRC_ROOT, file), file]))(
    '%s no tiene texto de interfaz escrito a mano',
    (_label, file) => {
      const source = stripClassNames(stripComments(readFileSync(file, 'utf8')))
      const offenders = []

      for (const { text, index } of [...quotedStringCandidates(source), ...jsxTextCandidates(source)]) {
        if (!isSpanishPhrase(text)) continue

        const line = source.slice(0, index).split('\n').length

        offenders.push(`  línea ${line}: «${text}»`)
      }

      expect(
        offenders,
        offenders.length === 0
          ? ''
          : `Texto de interfaz fuera del diccionario en ${relative(SRC_ROOT, file)}:\n` +
              offenders.join('\n') +
              '\n\nLas cadenas visibles van en src/i18n/es.js (R-007, §4.2).',
      ).toHaveLength(0)
    },
  )

  it('el diccionario tiene todas las secciones que usan las pantallas', () => {
    const sections = [
      'app', 'common', 'accessibility', 'nav', 'home',
      'games', 'register', 'login', 'service', 'errors', 'upcoming', 'footer',
    ]

    for (const section of sections) {
      expect(es[section], `Falta la sección «${section}» del diccionario`).toBeTypeOf('object')
    }
  })

  it('ningún texto del diccionario está vacío', () => {
    const empty = []

    for (const [section, entries] of Object.entries(es)) {
      for (const [key, value] of Object.entries(entries)) {
        if (typeof value === 'string' && value.trim() === '') empty.push(`${section}.${key}`)
      }
    }

    expect(empty, `Textos vacíos: ${empty.join(', ')}`).toHaveLength(0)
  })
})
