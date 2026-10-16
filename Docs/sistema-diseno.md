# Sistema de diseño — Connect

Tokens, reglas y comprobaciones de la interfaz. Todo lo que hay aquí lo heredan
las pantallas de los tres juegos y las de la clasificación y el chat.

La fuente de verdad de los valores es
[`frontend/src/index.css`](../frontend/src/index.css), en el bloque `@theme`.
Este documento explica **por qué** son esos valores y qué comprobación los
sostiene. Si un valor cambia, cambian los dos sitios: el token y la tabla de
pares de contraste.

**Origen:** el diseño de Connect en Figma («Abuelos»), adaptado a WCAG 2.2 AA.
Lo que se conserva y lo que se cambia está en §3, con el ratio de cada
sustitución.

---

## 1. Tipografía

| Token | Valor | Para qué |
|---|---|---|
| `--font-sans` | Inter Variable | Lectura clara, autoalojada |
| `--text-base` | `1rem` (16px) | Cuerpo. El mínimo de la constitución |
| `--text-lg` | `1.125rem` (18px) | Botones y campos |
| `--text-xl` | `1.25rem` (20px) | Enlaces de navegación |
| `--text-2xl` | `1.5rem` (24px) | Encabezados de sección |
| `--text-3xl` | `1.875rem` (30px) | Título de tarjeta |
| `--text-body` | `1.5rem` (24px) | Descripción. El de Figma |
| `--text-display` | `2.5rem` (40px) | Título de pantalla |
| `--text-nav` | `3rem` (48px) | La navegación de Figma |

**Todo usa `rem`**, y el tamaño elegido por la persona se aplica como
multiplicador del `100%` del navegador en `<html>` (`--font-scale`). Por eso, al
subir la fuente al 200%, escalan también los espacios: es lo que evita que un
título se salga de su caja y el contenido se solape (R-010).

### El título de tarjeta baja de 64px a 40px

Figma usa 64px para el nombre del juego y se ha mantenido 40px. Es una decisión,
no un descuido: 64px es el tamaño de una portada, no el de un nombre de juego, y
con la fuente al 200% un `4rem` se convierte en 128px, que empuja el botón fuera
de la tarjeta.

La navegación de 48px y la descripción de 24px sí coinciden con Figma.

### Cómo se cambia el tamaño

El control `FontSizeControl` ofrece los pasos **100, 112, 125, 150, 175 y 200**.
El último es exactamente el 200% que pide R-001; un «casi 200%» redondeado deja
fuera a quien lo necesita.

El valor se guarda en `localStorage` y **se aplica antes de montar React**
(`restoreTextScale()` en `main.jsx`). Si se aplicara después, la página se
pintaría con el tamaño por defecto y luego saltaría, que es justo el parpadeo que
el requisito viene a evitar.

**Comprobación:** `src/lib/textScale.test.js` y `e2e/reflow.spec.js`, que sube al
200% con los botones, recarga y comprueba que el tamaño sigue ahí.

---

## 2. Objetivos táctiles

Todos los controles pasan por `.ui-button`, `.ui-navlink`, `.ui-link` o
`.ui-field__input`, y los cuatro tienen `min-height: var(--spacing-target)`
(`2.75rem` = 44px). En `rem`, así que el objetivo crece con la fuente.

Ningún componente escribe su propio `min-height`: si lo hiciera, el mínimo se
podría olvidar en una pantalla nueva.

**Comprobación:** `e2e/keyboard.spec.js` mide cada control en el navegador real y
falla si alguno baja de 44px en alguna dimensión.

---

## 3. Color

Umbrales de WCAG 2.2: **4.5:1** para texto normal, **3:1** para texto grande,
bordes de control y anillo de foco.

No se usa el 3:1 de texto grande para el texto de la interfaz: con la fuente al
200% un texto de 18px se ve a 36px, y con la fuente al 100%, a 18px. Depender de
quién lo esté mirando haría que el mismo texto unas veces cumpliese y otras no.
Aquí se mira el peor caso y se exige 4.5:1 siempre.

### Los colores

| Token | Valor | Ratio clave |
|---|---|---|
| `--color-page` | `#F7F9FA` | Texto encima: 16.98:1 |
| `--color-surface` | `#FFFFFF` | — |
| `--color-ink` | `#11181C` | Sobre la página: 16.98:1 |
| `--color-ink-muted` | `#4A5560` | Sobre la página: 7.21:1 |
| `--color-band` | `#AAFFFF` | Casi negro encima: 15.76:1 |
| `--color-brand` | `#00626B` | Blanco encima: 7.10:1 |
| `--color-brand-strong` | `#00505A` | Blanco encima: 9.15:1 |
| `--color-success` | `#166534` | Blanco encima: 7.13:1 |
| `--color-danger` | `#B3261E` | Blanco encima: 6.54:1 |
| `--color-warning` | `#8A5300` | Blanco encima: 6.33:1 |
| `--color-accent-1` | `#15803D` | Blanco encima: 5.02:1 |
| `--color-accent-2` | `#0F6E75` | Blanco encima: 5.99:1 |
| `--color-accent-3` | `#00626B` | Blanco encima: 7.10:1 |
| `--color-border` | `#6B7680` | Sobre blanco: 4.64:1 |
| `--color-focus-ring` | `#0B5FFF` | Sobre la página: 4.86:1 |

Los fondos blandos son `--color-brand-soft`, `--color-warning-soft`,
`--color-accent-1-soft` y `--color-accent-2-soft`.

### Qué se mantiene de Figma y qué cambia

**Se mantiene:** la banda cian `#AAFFFF`, la tipografía Inter y su generosidad,
los radios grandes y el aire entre bloques.

**Cambia, con su ratio:**

| En Figma | Contexto | Ratio | Aquí | Ratio |
|---|---|---|---|---|
| `#00C000` + texto blanco | Tarjeta de juego | **2.46:1** ✗ | `#15803D` | 5.02:1 ✓ |
| `#00BDC0` + texto blanco | Hover de la tarjeta | **2.32:1** ✗ | `#0F6E75` | 5.99:1 ✓ |
| `#AAFFFF` + texto blanco | Cabecera | **1.14:1** ✗ | Casi negro encima | 15.76:1 ✓ |

Figma acierta con la cabecera, que ya usa texto negro sobre el cian. Falla en las
tarjetas.

### Y el motivo que no es de color

**El anillo de foco azul sobre una tarjeta de color profundo desaparece:**

| Fondo | Ratio del anillo `#0B5FFF` |
|---|---|
| Verde `#15803D` | **1.02:1** ✗ |
| Teal `#0F6E75` | **1.17:1** ✗ |

Por eso **la tarjeta es clara y el color va en una banda de acento**. Así el
anillo de foco siempre cae sobre blanco y llega al 5.13:1. Una tarjeta de color
saturado obligaría a invertir el anillo en cada tono oscuro, y un inventario es
justo lo que se desactualiza.

### Los pares y su comprobación

La tabla está en
[`frontend/src/design/contrastPairs.js`](../frontend/src/design/contrastPairs.js),
con el motivo de cada par. `contrast.test.js` lee los valores reales de
`index.css` y falla si algún par baja del umbral.

**Ningún ratio se ha estimado a ojo** (R-003). Si se toca un color, el test lo
detecta en la siguiente ejecución. Y `contrastPairs.js` va **antes** que el CSS:
si se cambia un color sin actualizar la tabla, el test falla, que es lo que se
quiere.

### Los dos casos que no son obvios

**El halo del foco.** El anillo es de dos tonos: un halo claro pegado al elemento
y un anillo oscuro por fuera. Cada uno hace un trabajo distinto y por eso se
comprueban contra superficies distintas:

- El **anillo oscuro** marca el límite exterior, así que tiene que verse contra el
  fondo sea del color que sea. De eso se ocupa la tabla de bordes.
- El **halo claro** separa el anillo del elemento, y solo hay problema cuando el
  elemento es oscuro. Contra la página daría 1.02:1 y contra el cian 1.14:1: ahí
  se junta a propósito, porque el límite exterior lo pone el anillo.

**`--color-border-soft` está por debajo de 3:1 a propósito.** Es un separador
entre tarjetas y no delimita nada pulsable. Está excluido de la comprobación con
un motivo escrito en `DECORATIVE_ONLY`. Si algún día delimita un control, hay que
moverlo a la tabla de pares.

### Un nombre de token que costó un bug

`--color-band` se llama así, y no `--color-nav`, porque con `--text-nav` y
`--color-nav` a la vez, Tailwind v4 resuelve `text-nav` de forma ambigua y
`sm:text-nav` compilaba a `color: var(--color-nav)`. El logotipo quedó cian sobre
cian, invisible, durante dos specs seguidas.

Dos namespaces de `@theme` no pueden llamarse igual. Lo comprueba
`src/design/tokens.test.js`.

---

## 4. Radios

Todos vienen de Figma, y el proyecto antes era más recto que el diseño.

| Token | Valor | Dónde |
|---|---|---|
| `--radius-card` | `1.5rem` (24px) | Tarjetas |
| `--radius-band` | `1rem` (16px) | Banda de cabecera |
| `--radius-control` | `0.75rem` (12px) | Botones y campos |
| `--radius-media` | `0.75rem` (12px) | Banda de acento de la tarjeta |
| `--radius-inner` | `0.75rem` (12px) | Lo que va dentro de una tarjeta |

La tarjeta de 24px con 24px de contenido y 12px de padding respeta «radio
exterior = radio interior + padding»: 12 + 12 = 24. Si se mete algo con radio
16px dentro de una tarjeta de 24px, la regla se incumple y hay que revisarlo.

---

## 5. Foco y teclado

```css
:focus-visible {
  outline: 3px solid var(--color-focus-halo);
  outline-offset: 2px;
  box-shadow: 0 0 0 5px var(--color-focus-ring);
}
```

El halo claro va pegado al elemento y el anillo oscuro por fuera: se ve tanto
sobre fondos claros como oscuros, cosa que un único color no consigue.

### `main` tiene su propio indicador

`main` no es interactivo, pero recibe el foco por script al cambiar de pantalla,
así que hereda el anillo general: un recuadro de dos tonos alrededor de **todo**
el contenido, de casi mil píxeles.

**`focus:outline-none` no lo arregla**, porque apaga el `outline` y deja vivo el
`box-shadow`. La anulación está en el CSS:

```css
main:focus-visible {
  outline: none;
  box-shadow: inset 0 4px 0 0 var(--color-focus-ring);
}
```

Una **barra en el borde superior**: se ve dónde ha entrado el foco y no encierra
el texto en una caja azul que parece un error. Al ser `inset`, no desplaza nada.

En `forced-colors` el navegador borra los `box-shadow`, así que ahí el indicador
cae al `outline` hacia dentro (`outline-offset: -3px`).

Tras un clic de ratón no se muestra nada, y es lo correcto: el navegador no aplica
`:focus-visible` y un recuadro en cada clic sería ruido.

**Comprobación:** `e2e/focus-main.spec.js`, con seis casos: teclado con barra,
teclado sin recuadro exterior, enlace de salto, clic de ratón, modo sin color y
desplazamiento nulo.

### Reglas de navegación

1. **El orden del DOM es el orden del foco y el de lectura.** No hay `order`, ni
   `grid-area`, ni `flex-direction: row-reverse` que los separen.
2. **El enlace de salto es lo primero del documento**, no lo primero de la
   cabecera, y va a `#main-content`.
3. **El foco se lleva a `main` al cambiar de pantalla, pero no en la primera
   carga.** Si se moviera al entrar, el enlace de salto sería inalcanzable con el
   teclado justo en la primera visita.
4. **El título del documento sigue a la ruta** y sale del diccionario.
5. **Cada cambio de vista se anuncia** con `RouteAnnouncer` (`aria-live="polite"`).
6. **La navegación crece con el ancho y con la fuente** mediante
   `clamp(1.125rem, 0.5rem + 2.2vw, 3rem)`. Es el único punto del proyecto con
   una fórmula: solo `rem` desbordaría en móvil, y solo `vw` no crecería con el
   texto.

---

## 6. No depender solo del color — R-004

> Toda información que se transmite por color va **también** por texto, icono o
> forma.

Es obligatorio en Wordle (§2.1.4): la pista de cada letra no puede ser solo el
color. Por eso la regla está resuelta en la base, no en cada juego.

### Cómo se aplica

Un estado se pinta de **tres** maneras a la vez:

| Canal | Qué es | Quién lo necesita |
|---|---|---|
| Color | El tono que le toca | Quien ve bien y distingue |
| Forma | El icono, con su borde | Quien no distingue rojo de verde |
| Texto | La frase, sin ambigüedad | Lector de pantalla, escala de grises |

El componente que lo garantiza es
[`StatusIndicator`](../frontend/src/components/ui/StatusIndicator.jsx), y **exige
los tres**: no acepta un estado al que no se le pase texto e icono. Quien añada
un estado nuevo tiene que escribir la frase, y esa es exactamente la parte que se
queda fuera si solo se pintara el color.

Los iconos se eligen **por lo que significan**, no por lo que se ven: `✓` un
acierto, `✕` un fallo, `!` un aviso, `?` una duda, `i` una información. Los tres
últimos se distinguen entre sí por la forma, no solo por el color.

El icono lleva `aria-hidden="true"`: es una señal redundante para quien ve, y si el
lector de pantalla lo leyera anunciaría «¡!» antes de la frase, que no aporta nada
y confunde.

**El acento de las tarjetas es decorativo**: no dice si el juego está jugado ni
si es fácil o difícil. Por eso no lleva etiqueta ni leyenda, y por eso un juego
nuevo que no esté en la lista de acentos cae en el primero sin romperse. El
acento se asigna **por `gameId`**, no por posición: si fuera por posición,
reordenar la API cambiaría el color de un juego sin que nadie lo hubiera decidido.

**Comprobación:** `e2e/rules.spec.js` exige texto e icono en cada indicador, y
vuelve a mirarlos con `forced-colors: active` para confirmar que siguen leyéndose
sin color.

---

## 7. Movimiento

`prefers-reduced-motion: reduce` pone a cero animaciones y transiciones. Lo que
queda es un cambio de opacidad, que no provoca vértigo.

La animación de entrada (`.ui-enter`) **solo existe** dentro de
`@media (prefers-reduced-motion: no-preference)`. No se quita con un `!important`
sobre una animación existente: si existiera, con movimiento reducido se vería el
elemento saltar de sitio antes de aparecer.

El scroll suave (`scroll-behavior: smooth`) va en la misma media query.

El proyecto **no tiene sonido, ni temporizadores, ni parpadeos**. La interfaz base
no arranca ningún `setInterval`, y hay un test que lo comprueba: ninguna pantalla
puede expirar contenido sin avisar antes (§4.1).

**Comprobación:** `e2e/rules.spec.js` mide la duración real de las animaciones
con y sin la preferencia.

---

## 8. Reflow — R-010

Sin scroll horizontal a 360px, ni en tablet, ni en escritorio, ni con el texto al
200%.

Dos decisiones que lo hacen posible:

- **`overflow-x: hidden` está expresamente prohibido.** Oculta el desbordamiento
  en lugar de arreglarlo, y deja el contenido recortado sin poder leerlo. El
  reflow se resuelve con anchos fluidos y `overflow-wrap: break-word`.
- **Los elementos flexibles llevan `min-width: 0`** cuando contienen texto, como
  `.ui-status__text`. Sin eso, un elemento flexible no baja de su tamaño de
  contenido y el texto largo se sale en vez de partirse. Este detalle ya costó un
  fallo real de scroll horizontal a 360px con el texto al 200%.

**Comprobación:** `e2e/reflow.spec.js` mide `scrollWidth` contra `clientWidth` en
las cuatro pantallas y en los tres anchos, y comprueba además que dos secciones no
se solapen al llegar al 200%.

---

## 9. Textos

Todas las cadenas visibles están en
[`frontend/src/i18n/es.js`](../frontend/src/i18n/es.js). Ninguna se escribe en un
componente.

Reglas de redacción, para quien escriba en el diccionario:

- En segunda persona («Escribe», «Pulsa»), nunca en tercera impersonal.
- Cada error dice **qué pasó y qué hacer**. Si no hay nada que hacer, no es un
  mensaje de error.
- Sin tecnicismos: nada de «timeout», «endpoint», «token» ni «código de error».
- Nunca se enseña un código técnico a quien usa el producto.

**Los identificadores van en inglés y los rótulos en español** (§3.1). Una ruta
(`#/games`) es un identificador; el rótulo que se ve sale del diccionario.

**Comprobación:** `src/i18n/dictionary.test.js` recorre el código buscando
cadenas y texto de JSX en español fuera del diccionario. Distingue palabras
«fuertes» (`contraseña`, `página`) de funcionales (`de`, `que`): una sola palabra
débil no señala nada, hacen falta dos. Sin eso, el detector dispararía con
`aria-label="what-you-can-do"` y nadie lo leería dos veces.

---

## 10. Cómo se ejecuta todo

```bash
cd frontend
npm run lint        # oxlint
npm test            # Vitest: contraste, tokens, diccionario, validadores, componentes
npm run test:e2e    # Playwright: axe, teclado, 44px, reflow, foco de main, R-004, R-008
                    # + recorridos con el backend real (e2e/journeys/, spec 008)
npm run build       # compilación de producción
npm run test:all    # todo lo anterior, en orden
```

---

## 11. Lo que esto **no** cubre

axe-core mide lo que sabe medir. **No sabe si un mensaje se entiende, ni si un
botón está donde alguien lo esperaría, ni si el orden visual coincide con el del
teclado**, ni si un texto en lenguaje llano es de verdad llano.

La revisión manual del checklist de §4.1 y §4.2 sigue siendo **obligatoria**
(§4.3), y se recorre con
[`checklist-accesibilidad.md`](./checklist-accesibilidad.md). La auditoría
automática no la sustituye: es el suelo, no el techo.
