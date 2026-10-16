/**
 * Pares de color que la interfaz usa de verdad, con el contraste que exige
 * WCAG 2.2 y el motivo por el que ese par existe (R-003, §4.2).
 *
 * La autoridad es la tabla de aquí; el test `contrast.test.js` la comprueba
 * contra los valores reales de `index.css`. Si alguien cambia un color, o cambia
 * un par por otro, el test dice exactamente qué relación se ha roto.
 *
 * **Este archivo va antes que el CSS, siempre.** Si se cambia un color en
 * `index.css` sin actualizar la tabla, el test falla: eso es lo que se quiere,
 * porque la tabla es la que obliga a pensar el contraste en vez de estimarlo.
 *
 * ## De dónde sale la paleta
 *
 * Viene del diseño de Connect en Figma («Abuelos»), adaptado a WCAG 2.2 AA. Lo
 * que se mantiene: la banda cian `#AAFFFF`, la tipografía Inter, los radios
 * grandes y la tipografía generosa. Lo que cambia son los valores que en Figma
 * fallaban el contraste. Cada sustitución está anotada abajo con su ratio.
 *
 * ## Dos umbrales, y no uno
 *
 * · **4.5:1** para texto normal (WCAG 1.4.3).
 * · **3:1** para texto grande (≥ 24px, o ≥ 18.66px en negrita), para bordes de
 *   controles y para el anillo de foco (WCAG 1.4.11).
 *
 * No se usa el 3:1 de texto grande para el texto de la interfaz: nuestro texto
 * normal ya es de 18px, pero quien tiene la fuente al 200% lo verá a 36px y
 * quien la tiene al 100% lo verá a 18px. Subir el texto a 3:1 dependería de
 * quién lo esté mirando y quién no. Aquí se mira el peor caso: 4.5:1 siempre.
 */

/** Umbral de contraste para texto normal. */
export const TEXT_CONTRAST = 4.5

/** Umbral de contraste para texto grande, bordes de control y foco. */
export const LARGE_OR_BORDER_CONTRAST = 3

/**
 * Pares de texto normal: [token de primer plano, token de fondo, por qué].
 */
export const TEXT_PAIRS = [
  ['ink', 'page', 'Cuerpo de texto sobre el fondo de la página.'],
  ['ink', 'surface', 'Cuerpo de texto sobre una tarjeta.'],
  ['ink', 'band', 'La banda de cabecera es el cian de Figma y lleva texto casi negro.'],
  ['ink', 'brand-soft', 'Texto de los paneles informativos.'],
  ['ink', 'warning-soft', 'Texto del panel de pistas y avisos suaves.'],
  ['ink', 'accent-1-soft', 'Texto sobre el panel verde suave.'],
  ['ink', 'accent-2-soft', 'Texto sobre el panel teal suave.'],

  ['ink-muted', 'page', 'Texto secundario: el más claro de la interfaz.'],
  ['ink-muted', 'surface', 'Texto secundario dentro de una tarjeta.'],
  ['ink-muted', 'brand-soft', 'Texto secundario dentro de un panel informativo.'],

  ['surface', 'brand', 'Etiqueta del botón principal.'],
  ['surface', 'brand-strong', 'Etiqueta del botón principal al pasar el ratón.'],
  ['surface', 'success', 'Etiqueta de un estado correcto.'],
  ['surface', 'danger', 'Etiqueta de un estado de error.'],
  ['surface', 'warning', 'Etiqueta de un estado de aviso.'],

  // Espec 007. Los mensajes del sistema del chat van sobre `brand-soft`, que es
  // el mismo panel que usan los avisos de las pantallas: si se distinguieran con
  // un color distinto habría que comprobar dos paletas para lo mismo.
  ['surface', 'danger-strong', 'Etiqueta del botón de borrar la cuenta.'],

  // Los tres acentos de tarjeta. En Figma el relleno era `#00C000`, verde
  // neón, y con texto blanco daba 2.46:1: ilegible. Aquí es el mismo verde
  // profundizado hasta que el blanco encima llega a 5.02:1. El color se
  // mantiene como acento de la tarjeta, nunca como fondo de un párrafo.
  ['surface', 'accent-1', 'Glifo blanco sobre la banda verde de la tarjeta.'],
  ['surface', 'accent-2', 'Glifo blanco sobre la banda teal de la tarjeta.'],
  ['surface', 'accent-3', 'Glifo blanco sobre la banda azul de la tarjeta.'],

  ['brand', 'surface', 'Enlaces dentro de tarjetas.'],
  ['brand', 'page', 'Enlaces sobre el fondo de la página.'],
  ['brand', 'brand-soft', 'Enlace dentro de un panel informativo.'],
  ['brand', 'band', 'Enlace o botón dentro de la banda de cabecera.'],

  ['brand-strong', 'surface', 'Enlace ya visitado o al pasar el ratón.'],

  ['success', 'surface', 'Texto de estado correcto sin fondo de color.'],
  ['success', 'page', 'Texto de estado correcto sobre la página.'],
  ['danger', 'surface', 'Texto de error sin fondo de color.'],
  ['danger', 'page', 'Texto de error sobre el fondo de la página.'],
  ['warning', 'warning-soft', 'Texto de aviso sobre su panel.'],
  ['warning', 'surface', 'Texto de aviso sin fondo de color.'],
  ['warning', 'page', 'Texto de aviso sobre el fondo de la página.'],

  ['accent-1', 'accent-1-soft', 'Texto de acento sobre su panel suave.'],
  ['accent-2', 'accent-2-soft', 'Texto de acento sobre su panel suave.'],
]

/**
 * Pares de los tres juegos (spec 006 · R-016).
 *
 * Van aparte de `TEXT_PAIRS` y de `BORDER_PAIRS` porque su motivo es distinto:
 * en un juego, un color **es** información —«en su sitio» frente a «no está»— y
 * por eso cada estado tiene que leerse sin depender del color (§2.1.4). Aquí se
 * comprueba el par de cada uno, y el glifo que lleva dentro es lo que cubre el
 * caso de quien no distingue colores (R-004).
 */
export const GAME_PAIRS = [
  // Wordle · estado «en su sitio»
  ['surface', 'success', 'Letra correcta de Wordle sobre su casilla verde.'],
  ['surface', 'success', 'Glifo de la leyenda del estado «en su sitio».'],
  ['surface', 'warning', 'Letra presente pero en otro sitio, sobre su casilla.'],
  ['surface', 'warning', 'Glifo de la leyenda del estado «está en la palabra».'],
  ['ink-muted', 'surface-sunken', 'Letra ausente: gris sobre la casilla hundida.'],
  ['ink', 'surface-sunken', 'Glifo «✗» de la casilla «no está».'],

  // Paraulógic · las casillas de letras y las palabras ya encontradas
  ['ink', 'surface', 'Cada letra del conjunto, en su casilla.'],
  ['ink', 'surface-sunken', 'Tecla del teclado virtual que está pulsada.'],
  ['brand', 'brand-soft', 'Borde de una tecla del teclado al pasar el ratón.'],
  ['ink', 'accent-1-soft', 'Palabra ya encontrada, sobre su panel verde.'],
  ['accent-1', 'accent-1-soft', 'Borde de la palabra ya encontrada.'],
]

/** Contrastes que los juegos necesitan y que no salen de la paleta base. */
export const GAME_BORDER_PAIRS = [
  // El borde de las casillas de Wordle. Es lo que dibuja la rejilla cuando
  // `forced-colors` apaga los fondos, y sin él la rejilla desaparece entera.
  ['border', 'surface-sunken', 'Borde de una casilla de Wordle sobre la superficie hundida.'],
  ['success', 'surface-sunken', 'Borde de la casilla «en su sitio».'],
  ['warning', 'surface-sunken', 'Borde de la casilla «está en la palabra».'],
  ['border', 'surface', 'Borde de una casilla y de una tecla del teclado, sobre la tarjeta.'],
]

/**
 * Colores que **sí** aparecen en los juegos pero que no se comprueban como par.
 *
 * `surface-sunken` sobre `surface` da 1.15:1, muy por debajo de 3:1, y es
 * deliberado: el relleno hundido de la casilla «no está» **no es lo que dibuja
 * la casilla**, lo es su borde, que sí llega a 3:1 contra la tarjeta (WCAG 1.4.11
 * habla del límite que identifica el control, no del color de su interior).
 *
 * Poner el relleno a un gris lo bastante oscuro para llegar a 3:1 convertiría
 * el estado «no está» en el más oscuro de los tres, cuando es el que menos
 *destaca: quien lee la rejilla espera que lo más oscuro sea lo que está mal.
 *
 * Lo que sí se comprueba es el texto sobre el relleno (`ink-muted` sobre
 * `surface-sunken`, 7.21:1) y el glifo, que es lo que distingue el estado sin
 * depender del color (R-004).
 */

/**
 * Pares que delimitan un control o dibujan el foco: 3:1 (WCAG 1.4.11).
 */
export const BORDER_PAIRS = [
  ['border', 'surface', 'Borde de un campo de formulario y botón secundario.'],
  ['border', 'page', 'Borde de un control sobre el fondo de la página.'],
  ['border', 'band', 'Borde de un control sobre la banda de cabecera.'],
  ['brand', 'surface', 'Borde del botón principal.'],
  ['brand', 'page', 'Borde de una acción sobre el fondo de la página.'],

  // El borde de acento que aparece al pasar el ratón por una tarjeta. Es lo que
  // sustituye al cambio de color de Figma, que pasaba de verde a teal y obligaba
  // a comprobar el contraste de dos estados distintos.
  ['accent-1', 'surface', 'Borde de acento sobre una tarjeta blanca.'],
  ['accent-1', 'page', 'Borde de acento sobre el fondo de la página.'],
  ['accent-2', 'surface', 'Borde de acento sobre una tarjeta blanca.'],
  ['accent-2', 'page', 'Borde de acento sobre el fondo de la página.'],
  ['accent-3', 'surface', 'Borde de acento sobre una tarjeta blanca.'],

  ['focus-ring', 'surface', 'El anillo de foco sobre una tarjeta.'],
  ['focus-ring', 'page', 'El anillo de foco sobre el fondo de la página.'],
  ['focus-ring', 'band', 'El anillo de foco sobre el cian de la cabecera.'],
  ['focus-ring', 'brand-soft', 'El anillo de foco sobre un panel informativo.'],
  ['focus-ring', 'warning-soft', 'El anillo de foco sobre un panel de aviso.'],
  ['focus-ring', 'accent-1-soft', 'El anillo de foco sobre un panel verde suave.'],
  ['focus-ring', 'accent-2-soft', 'El anillo de foco sobre un panel teal suave.'],

  ['danger', 'surface', 'El borde rojo de un campo con error.'],
  ['success', 'surface', 'El borde verde de un campo correcto.'],
  ['warning', 'surface', 'El borde de un campo con aviso.'],

  // Espec 007. El borde del mensaje del sistema del chat se comprueba contra el
  // panel donde va, no contra el blanco de la tarjeta: es `ink-muted` sobre
  // `brand-soft`, y comprobarlo contra `surface` daría un ratio que no es el de
  // ningún estado real.
  ['ink-muted', 'brand-soft', 'Borde del mensaje del sistema en el chat.'],

  // El borde de la tabla de la clasificación y el de cada mensaje. Con
  // `forced-colors` desaparecen los colores y solo quedan los bordes, así que
  // tienen que verse por sí solos (R-004).
  ['border', 'page', 'Separador de fila en la clasificación, sobre la página.'],
]

/**
 * Pares del halo del anillo de foco.
 *
 * El foco es un anillo de dos tonos: un halo claro pegado al elemento y el
 * anillo oscuro por fuera. Cada uno hace un trabajo distinto, y por eso se
 * comprueban contra superficies distintas:
 *
 * · El **anillo oscuro** marca el límite exterior: tiene que verse contra el
 *   fondo, sea del color que sea. De eso se ocupa `BORDER_PAIRS`.
 * · El **halo claro** separa el anillo del elemento. Solo hay problema cuando el
 *   elemento es oscuro (un botón azul, un botón rojo, una banda de acento): contra
 *   un fondo claro se junta a propósito, porque el límite exterior lo pone el
 *   anillo.
 *
 * Comprobar halo contra página daría 1.02:1 y no significa nada: el halo no
 * tiene que verse sobre la página, tiene que verse sobre el elemento oscuro.
 */
export const HALO_PAIRS = [
  ['focus-halo', 'brand', 'Halo del foco sobre el botón principal.'],
  ['focus-halo', 'brand-strong', 'Halo del foco sobre el botón al pasar el ratón.'],
  ['focus-halo', 'danger', 'Halo del foco sobre un botón de error.'],
  ['focus-halo', 'success', 'Halo del foco sobre un botón de estado correcto.'],
  ['focus-halo', 'warning', 'Halo del foco sobre un botón de aviso.'],
  ['focus-halo', 'accent-1', 'Halo del foco sobre la banda verde de una tarjeta.'],
  ['focus-halo', 'accent-2', 'Halo del foco sobre la banda teal de una tarjeta.'],
  ['focus-halo', 'accent-3', 'Halo del foco sobre la banda azul de una tarjeta.'],
]

/**
 * Colores excluidos del umbral de 3:1, con el motivo escrito.
 *
 * No es una lista de excepciones para que el test pase: es una decisión
 * documentada sobre para qué sirve cada color. Si uno de estos pasara a
 * delimitar un control, habría que moverlo a `BORDER_PAIRS`.
 */
export const DECORATIVE_ONLY = {
  'border-soft':
    'Separador entre tarjetas. No delimita nada pulsable: si lo hiciera, un ' +
    'campo de formulario podría perderse en un fondo casi igual.',
}
