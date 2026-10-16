# Checklist manual de accesibilidad — Connect

> **§4.3: la accesibilidad se prueba, no se supone.** Una pantalla no se da por
> válida hasta que ha pasado el checklist de §4.1 y §4.2, y ese paso es de una
> persona.
>
> La auditoría automática (`axe-core`, `npm run test:e2e`) **no sustituye** a este
> checklist: axe mide lo que sabe medir —contraste, nombres, roles, jerarquía— y no
> sabe si un mensaje se entiende, ni si el orden del foco es el que espera
> alguien, ni si el punto de pulsación está donde se espera con las manos
> temblando. Las dos cosas van juntas (spec 008 · R-008).

## Cómo se recorre

- **Dónde:** `docker compose up` y <http://localhost:5173>.
- **Con qué cuentas:** una de prueba para las pantallas con sesión (registro,
  chat, los tres juegos). Se puede borrar al terminar con «Borrar mi cuenta».
- **En qué tamaños:** los tres perfiles del proyecto (§7.1), que son los mismos
  que usa Playwright: ordenador **1280×720**, tablet **810×1080** y móvil
  **360×740**.
- **Con el ratón y solo con el teclado:** cada pantalla se recorre dos veces,
  `Tab` / `Shift+Tab` / `Enter` / `Espacio` / flechas, sin tocar el ratón.
- **Con lector de pantalla:** VoiceOver (macOS o iOS) o NVDA (Windows). Con
  NVDA, en Firefox.
- **Con el texto grande:** el botón de la barra para subir al 200 %, y recargar
  después para ver si se mantiene.

## Global — se comprueba una vez, vale para todas las pantallas

- [ ] El tamaño base del texto es de 16 px o más, y el botón de aumentarlo llega
      al 200 % sin que nada se corte (§4.1).
- [ ] Con el texto al 200 % no se pierde contenido ni aparece scroll horizontal
      (§4.1).
- [ ] La tipografía es sans-serif, de alto contraste y no hay texto sobre
      imágenes (§4.1).
- [ ] Ningún estado depende solo del color: siempre hay texto, icono o forma
      (§4.1).
- [ ] Los objetivos táctiles (botones y enlaces) miden 44×44 px o más y están
      separados (§4.1).
- [ ] Con «reducir movimiento» activado, no hay animaciones ni transiciones que
      muevan la página (§4.2).
- [ ] El documento declara `lang="es"` y en el código no hay ni una etiqueta de
      interfaz escrita a mano: todas salen del diccionario (§4.2).
- [ ] El contraste llega a 4.5:1 en el texto y a 3:1 en bordes y controles,
      medido con una herramienta de contraste, no a ojo (§4.2).
- [ ] El HTML es semántico: `button` para lo que es botón, `label` asociado a
      cada campo, encabezados en orden y `alt` en las imágenes (§4.2).
- [ ] Recorrido completo con teclado: el foco se ve siempre, el orden sigue al
      orden visual y no hay trampas de foco (§4.2, R-007).

## Pantalla por pantalla

### Portada — `/#`

- [ ] El primer elemento que oye el lector de pantalla es el título de la
      página, y es único.
- [ ] Hay una llamada visible a «Crear una cuenta» y otra a «Entrar».
- [ ] Sin scroll horizontal a 360 px.
- [ ] Al navegar con el teclado se recorren en el orden en que se ven.

### Lista de juegos — `/#/games`

- [ ] Cada juego dice **con palabras** si está jugado o sin jugar, no solo con
      color.
- [ ] Con lector de pantalla, cada tarjeta se lee como «nombre, descripción,
      botón», y el botón se anuncia como enlace con su nombre.
- [ ] En 360 px las tres tarjetas se leen sin scroll horizontal.

### Crear una cuenta — `/#/register`

- [ ] Cada campo tiene etiqueta visible y el lector la anuncia junto al campo.
- [ ] El error de un campo aparece **junto a él** y se anuncia; el foco salta al
      primer campo con error.
- [ ] Los mensajes dicen qué ha pasado y qué hacer, sin códigos técnicos: se
      puede entender sin saber nada de informática.
- [ ] Antes de escribir nada se dice que no se pide correo electrónico.
- [ ] Se puede enviar el formulario entero con el teclado.

### Entrar — `/#/login`

- [ ] Mismos puntos que en el alta: etiqueta, error junto al campo, foco en el
      primer error.
- [ ] El mensaje de credenciales incorrectas es idéntico si el nombre no existe y
      si la contraseña falla (§6.2).
- [ ] Al entrar, el titular anuncia el alias y el foco no salta de sitio.

### Clasificación — `/#/leaderboard`

- [ ] Es una tabla de verdad: el lector anuncia «puesto, alias, puntos» como
      celdas con encabezado.
- [ ] La tabla tiene `<caption>` que dice qué clasificación se está viendo.
- [ ] El filtro son radios: se ven las cuatro opciones y las flechas cambian de
      opción.
- [ ] En 360 px la tabla se desplaza **dentro de su propia caja** y la página no.
- [ ] Con el teclado se puede llegar a esa caja y desplazarla con las flechas
      (WCAG 2.1.1).
- [ ] Los puntos se leen como texto («10 puntos»), no como un número suelto.
- [ ] Los puntos de cada persona coinciden con los que enseña el servidor.

### Chat — `/#/chat`

- [ ] La conversación es una región de log: los mensajes nuevos se anuncian
      **sin robar el foco**.
- [ ] Escribir un mensaje no mueve el foco ni desplaza lo que se está escribiendo.
- [ ] El aviso «Hay un mensaje nuevo» no mueve el foco y se puede activar con el
      teclado.
- [ ] El botón de bloquear dice «Bloquear» y su nombre accesible incluye el
      alias de a quién bloquea.
- [ ] El aviso de bloqueo se anuncia y se puede deshacer con el teclado.
- [ ] En 360 px los mensajes se leen sin scroll horizontal.

### Paraulógic — `/#/game/paraulogic`

- [ ] Las letras están en una lista con nombre accesible, no son imágenes sueltas.
- [ ] El mensaje de acierto se anuncia sin mover el foco.
- [ ] La lista de palabras encontradas tiene nombre accesible con el número.
- [ ] El botón de pedir pista dice **que no resta puntos** antes de pulsarlo.
- [ ] El campo no borra lo escrito al fallar, y hay una forma de borrar sin ratón.
- [ ] Con el teclado se puede escribir, comprobar y pedir pista.

### Wordle — `/#/game/wordle`

- [ ] Las tres pistas están **escritas**, no solo dibujadas con color e icono.
- [ ] Cada casilla anuncia su estado con texto («En su sitio», «Está en la
      palabra, en otro orden», «No está en la palabra»).
- [ ] Se puede jugar entero con el teclado en pantalla: letras y borrado, con
      44 px de alto.
- [ ] El contador de intentos se anuncia sin mover el foco.
- [ ] Se dice **antes** de gastar el intento que solo se puede jugar una vez.
- [ ] El botón de salir avisa de que la partida se acaba y no se puede volver
      (§4.2).
- [ ] El resultado se anuncia sin mover el foco.

### Acertijo — `/#/game/riddle`

- [ ] El aviso de que fallar no resta nada está **antes** del campo, no después
      del error.
- [ ] La respuesta se puede leer y corregir; el foco no salta al botón al
      escribir.
- [ ] El contador de respuestas escritas se anuncia sin mover el foco.
- [ ] Al acertar se anuncian el acierto y los puntos.
- [ ] El botón de reportar solo aparece tras un rechazo y explica que no da
      puntos (§4.1).
- [ ] Con el teclado se puede responder entero.

## Cierre

- [ ] Se han recorrido **todas** las pantallas en los **tres** tamaños.
- [ ] Se ha recorrido cada flujo **solo con teclado**, sin tocar el ratón.
- [ ] Se ha recorrido cada pantalla **con lector de pantalla**.
- [ ] Lo que no se haya podido comprobar está escrito más abajo, con el motivo.

**Resultado:** ☐ Sin incidencias ☐ Con incidencias (tabla de abajo)

| QuéScreen                                       | Qué falla | Cómo se reproduce | Dónde |
| ---------------------------------------------- | --------- | ----------------- | ----- |
| | | | |

| | |
| --- | --- |
| Revisado por | |
| Fecha | |
| Commit revisado | |
| Tamaño de texto con el que se ha recorrido | 100 % / 200 % |
| Lector de pantalla | |
| Sistema y navegador | |

> Este checklist lo firma **una persona**. El campo de arriba está vacío a
> propósito: la auditoría automática puede estar en verde y esto no, y al revés
> también. Un documento sin firma no demuestra nada (§4.3).