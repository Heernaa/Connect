import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { expect, test as base } from '@playwright/test'

/**
 * Recorridos completos contra el backend real (spec 008 · R-001 a R-004).
 *
 * Aquí **no se intercepta ninguna petición**, al contrario que en `e2e/helpers.js`:
 * un recorrido solo vale si vale para la aplicación de verdad, con la puntuación
 * que calcula el servidor y con el progreso que guarda en PostgreSQL (§4.3).
 *
 * Cuatro cosas que hacen estos tests y que conviene saber antes de tocarlos:
 *
 * · **El backend tiene que estar en pie.** La fixture `stack` lo comprueba antes
 *   de cada test y dice qué falta, en vez de dejar un error de red a medias en la
 *   primera pantalla.
 * · **Cada test usa su propia cuenta y la borra al terminar.** La base de datos
 *   es la de desarrollo y la ve también quien esté jugando, así que las cuentas
 *   que se crean se limpian con `DELETE /api/auth/me` y los nombres de usuario
 *   son únicos por construcción: dos ejecuciones de la suite, o tres
 *   dispositivos a la vez, no se pisan.
 * · **El contenido sale del seed, no de aquí.** El servidor nunca devuelve las
 *   soluciones (§2.1.2), así que para comprobar que una palabra se acepta hay que
 *   conocer una palabra válida. Se lee de `data/seed_v0.sql`, el mismo archivo
 *   que carga el contenido del MVP: el día que cambie el contenido, cambian los
 *   recorridos, sin que nadie tenga que acordarse de ir a tocar una palabra
 *   escrita en un test.
 * · **Lo que se comprueba son requisitos, no detalles de la interfaz.** Cada
 *   recorrido cita el requisito que verifica en el nombre del test y en el
 *   comentario de arriba, que es la regla 3 de [`Docs/specs/README.md`](../../../Docs/specs/README.md).
 */

/** Contraseña de las cuentas de prueba: una frase, como la que espera §6.2. */
export const TEST_PASSWORD = 'una frase de paso larga'

export { expect }

/**
 * Playwright con una comprobación previa: el backend contesta.
 *
 * El fixture es `auto`, así que no hay que acordarse de pedirlo: cualquier test
 * que importe de aquí lo tiene.
 */
export const test = base.extend({
  stack: [
    async ({ request }, use) => {
      const health = await request.get('/api/health')

      expect(
        health.ok(),
        'El backend no contesta. Estos recorridos prueban la aplicación real, así ' +
          'que hace falta el stack entero: `docker compose up` antes de la suite (§7.0).',
      ).toBe(true)

      await use(health)
    },
    { auto: true },
  ],
})

/**
 * Un nombre de usuario que no se pueda repetir.
 *
 * La marca de tiempo evita Choques entre ejecuciones separadas y los bytes
 * aleatorios entre las que se solapan (sucesivos `npm run test:e2e`). Va delante
 * de la cuenta porque el nombre es lo único que se ve de la cuenta (§2.2).
 */
export function uniqueUsername(prefix = 'e2e') {
  const stamp = Date.now().toString(36)
  const noise = randomBytes(3).toString('hex')

  return `${prefix}${stamp}${noise}`
}

/**
 * Crea una cuenta de prueba y deja la sesión abierta en el contexto.
 *
 * El registro va por la API y no por el formulario: recorrer el formulario es
 * cosa de `journey.spec.js` (R-001). Aquí lo que hace falta es una cuenta de
 * verdad con la que jugar.
 *
 * De paso se comprueba que el registro **abre sesión** (spec 003 · R-003): si
 * algún día vuelve a no mandar la cookie, estos recorridos fallan todos juntos
 * y se nota enseguida, en lugar de depender de un solo test que lo compruebe.
 */
export async function createAccount(context, { prefix = 'e2e' } = {}) {
  const username = uniqueUsername(prefix)

  const response = await context.request.post('/api/auth/register', {
    data: {
      username,
      password: TEST_PASSWORD,
      password_confirmation: TEST_PASSWORD,
    },
  })

  if (!response.ok()) {
    throw new Error(
      `No se ha podido crear la cuenta «${username}»: ${response.status()} ${await response.text()}`,
    )
  }

  const { alias } = await response.json()

  return { username, password: TEST_PASSWORD, alias }
}

/**
 * El campo del formulario que se llama así.
 *
 * Se busca por **etiqueta visible**, que es lo que lee y oye quien usa la
 * pantalla, y no por `name`: el `name` es un identificador técnico y el recorrido
 * no debe romperse si el campo se renombra por dentro (§3.1).
 *
 * El ancla `^…` no es decoración: las etiquetas llevan detrás un «(obligatorio)» o
 * un «(opcional)» (§4.2), así que sin ella «Contraseña» encontraría también «Repite
 * la contraseña» y el recorrido escribiría la contraseña en el campo equivocado.
 */
export function field(page, label) {
  return page.getByLabel(new RegExp(`^${label}`))
}

/**
 * Borra la cuenta con la que se ha hecho el test.
 *
 * Es limpieza, y por eso **no lanza el error si falla**: el fallo que hay que
 * leer es el del test, no el de esta llamada. Lo que sí conviene es no dejar
 * cuentas tiradas en la base de datos de desarrollo, que también ven las personas
 * jugando.
 */
export async function deleteAccount(context) {
  await context.request.delete('/api/auth/me').catch(() => null)
}

/**
 * Una llamada a la API desde el test, con el error del servidor a la vista.
 *
 * `request.fetch` y no `request.get` porque algunos recorridos necesitan mandar
 * `data`. Cuando la respuesta no es un éxito, el mensaje del servidor se
 * incluye: el cuerpo de los errores de esta API está escrito para que se pueda
 * enseñar a alguien (§4.1) y también sirve para entender un test rojo.
 */
export async function apiJson(request, path, { method = 'GET', data } = {}) {
  const response = await request.fetch(path, {
    method,
    ...(data === undefined ? {} : { data }),
  })

  if (!response.ok()) {
    throw new Error(`${method} ${path} ha respondido ${response.status()}: ${await response.text()}`)
  }

  return response.json()
}

/**
 * Dónde puede estar `data/seed_v0.sql`.
 *
 * Dos entornos y dos rutas: en la máquina del desarrollador el archivo cuelga de
 * la raíz del repositorio, y dentro del contenedor lo monta
 * `docker-compose.yml` en `/data` (el mismo montaje que usa el backend). Con
 * `SEED_PATH` se puede poner donde haga falta, que es lo que hace
 * `backend/tests/conftest.py`.
 */
const SEED_CANDIDATES = [
  process.env.SEED_PATH,
  '/data/seed_v0.sql',
  fileURLToPath(new URL('../../../data/seed_v0.sql', import.meta.url)),
].filter((candidate) => typeof candidate === 'string' && candidate.length > 0)

/**
 * El `INSERT INTO <tabla>` del seed: del `INSERT` hasta el primer punto y coma
 * **fuera de comillas**.
 *
 * Cortar por el primer `;` a secas no serviría: las definiciones de las palabras
 * de Paraulógic llevan punto y coma dentro del texto («con calma; sin prisa»).
 */
function insertBlock(sql, table) {
  const start = sql.indexOf(`INSERT INTO ${table}`)

  if (start === -1) {
    throw new Error(`El seed no tiene ningún «INSERT INTO ${table}».`)
  }

  let insideText = false

  for (let index = start; index < sql.length; index += 1) {
    const character = sql[index]

    if (character === "'") {
      insideText = !insideText
    } else if (character === ';' && !insideText) {
      return sql.slice(start, index)
    }
  }

  throw new Error(`El «INSERT INTO ${table}» del seed no termina en punto y coma.`)
}

/** Lo que se lee del seed una vez y se reutiliza en todos los tests. */
let cachedSeed = null

/**
 * El contenido del MVP leído del seed: las palabras de Paraulógic, la palabra de
 * Wordle y la respuesta del acertijo.
 *
 * Se lee **una vez por ejecución** y se comprueba que sale algo de cada cosa: un
 * seed que cambiara de forma (por ejemplo, una tabla renombrada) tiene que
 * fallar aquí con un mensaje claro, no dejar un recorrido que pasa por jugar con
 * una palabra vacía.
 */
export function seedContent() {
  if (cachedSeed !== null) return cachedSeed

  const path = SEED_CANDIDATES.find((candidate) => existsSync(candidate))

  if (path === undefined) {
    throw new Error(
      'No se encuentra data/seed_v0.sql, que es de donde salen las palabras y la ' +
        'respuesta que usan los recorridos. Se ha buscado en: ' +
        SEED_CANDIDATES.join(', '),
    )
  }

  const sql = readFileSync(path, 'utf-8')

  const paraulogicWords = [
    ...insertBlock(sql, 'paraulogic_words').matchAll(/^\s*\('([A-ZÁÉÍÓÚÜÑ]+)',/gm),
  ].map((match) => match[1])

  const wordleWord = insertBlock(sql, 'wordle_words').match(/'([A-ZÁÉÍÓÚÜÑ]{5})'/)?.[1]

  // La respuesta del acertijo es el segundo literal del `SELECT` del seed: la
  // pregunta, la respuesta y el idioma. La parte del `WHERE NOT EXISTS` se queda
  // fuera porque trae otro literal, el del patrón `LIKE`.
  const riddleLiterals = [
    ...insertBlock(sql, 'riddles').split('WHERE NOT EXISTS')[0].matchAll(/'([^']*)'/g),
  ].map((match) => match[1])

  if (paraulogicWords.length === 0 || wordleWord === undefined || riddleLiterals.length < 2) {
    throw new Error(
      `No se ha podido leer el contenido del seed (${path}): ` +
        `${paraulogicWords.length} palabras de Paraulógic, ` +
        `palabra de Wordle ${wordleWord ?? 'no encontrada'}, ` +
        `${riddleLiterals.length} literales en el acertijo.`,
    )
  }

  cachedSeed = { paraulogicWords, wordleWord, riddleAnswer: riddleLiterals[1] }

  return cachedSeed
}

/**
 * Una palabra válida de Paraulógic: la más corta del conjunto.
 *
 * La más corta porque es la más rápida de teclear, y da igual cuál sea: lo que
 * se comprueba es que **el servidor acepta una palabra que está en el conjunto**,
 * no que el jugador adivine una en concreto. `except` sirve para pedir una
 * segunda palabra distinta, que es lo que necesita quien sigue jugando.
 */
export function sampleParaulogicWord(except = null) {
  const words = [...seedContent().paraulogicWords]
    .filter((word) => word !== except)
    .sort((first, second) => first.length - second.length || first.localeCompare(second))

  if (words.length === 0) {
    throw new Error('El conjunto de Paraulógic no tiene ninguna palabra válida.')
  }

  return words[0]
}

/**
 * Una letra que no está en la palabra, para probar la pista «no está en la
 * palabra» de Wordle (R-002).
 *
 * Se busca en el abecedario en vez de escribir una fija (`X`, `Z`…): la palabra
 * objetivo viene del contenido del MVP y no se puede suponer que no lleve
 * ninguna de ellas.
 */
export function letterNotIn(word) {
  const letters = new Set(word.toUpperCase())

  for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
    if (!letters.has(letter)) return letter
  }

  throw new Error(`No hay ninguna letra fuera de la palabra «${word}».`)
}